/**
 * parser.js — NetVision V2
 * Converts raw tshark EK-format (NDJSON) or mock packet data into a structured NetVision event.
 * Enriched with App/Service classification and host discovery hooks.
 */

const dnsCache = require("./dns-cache");
const { classifyApp } = require("./app-classifier");

let currentSubnet = "192.168.137.";
let onHostDiscovered = null;

function setSubnet(subnet) {
  if (subnet) currentSubnet = subnet;
}

function setHostDiscoveredCallback(cb) {
  onHostDiscovered = cb;
}

const IP_PROTO = {
  "1": "ICMP",
  "6": "TCP",
  "17": "UDP",
  "41": "IPv6",
  "58": "ICMPv6"
};

const TLS_TYPE = {
  "20": "ChangeCipherSpec",
  "21": "Alert",
  "22": "Handshake",
  "23": "AppData",
  "24": "Heartbeat"
};

const TLS_VERSION = {
  "0x0301": "TLSv1.0",
  "0x0302": "TLSv1.1",
  "0x0303": "TLSv1.2",
  "0x0304": "TLSv1.3",
  "769": "TLSv1.0",
  "770": "TLSv1.1",
  "771": "TLSv1.2",
  "772": "TLSv1.3"
};

function f(val) {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function fAll(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Parses raw tshark EK line or object
 */
function parsePacket(raw) {
  if (!raw) return null;

  let layers;
  if (typeof raw === "string") {
    try {
      const obj = JSON.parse(raw);
      layers = obj.layers || (obj._source && obj._source.layers);
    } catch (_) {
      return null;
    }
  } else {
    layers = raw.layers || raw;
  }

  if (!layers) return null;

  // Frame metadata
  const frameTime = f(layers["frame_frame_time_epoch"]) || f(layers["frame.time_epoch"]);
  const timestamp = frameTime ? Math.round(parseFloat(frameTime) * 1000) : Date.now();
  const length = parseInt(f(layers["frame_frame_len"]) || f(layers["frame.len"]) || "0", 10);

  // IP Layer
  let srcIp = f(layers["ip_ip_src"]) || f(layers["ip.src"]);
  let dstIp = f(layers["ip_ip_dst"]) || f(layers["ip.dst"]);

  if (!srcIp && layers["ipv6_ipv6_src"]) {
    srcIp = f(layers["ipv6_ipv6_src"]);
    dstIp = f(layers["ipv6_ipv6_dst"]);
  }

  if (!srcIp) return null;

  // Transport Layer
  const tcpSrcPort = f(layers["tcp_tcp_srcport"]) || f(layers["tcp.srcport"]);
  const tcpDstPort = f(layers["tcp_tcp_dstport"]) || f(layers["tcp.dstport"]);
  const udpSrcPort = f(layers["udp_udp_srcport"]) || f(layers["udp.srcport"]);
  const udpDstPort = f(layers["udp_udp_dstport"]) || f(layers["udp.dstport"]);

  const srcPort = tcpSrcPort ? parseInt(tcpSrcPort, 10) : udpSrcPort ? parseInt(udpSrcPort, 10) : null;
  const dstPort = tcpDstPort ? parseInt(tcpDstPort, 10) : udpDstPort ? parseInt(udpDstPort, 10) : null;

  const transportProto = tcpSrcPort ? "TCP" : udpSrcPort ? "UDP" : IP_PROTO[f(layers["ip_ip_proto"])] || "OTHER";

  // Protocol & application layer identification
  let protocol = transportProto;
  let domain = null;
  let info = "";

  // 1. DNS
  const hasDns = !!(layers["dns_dns_flags"] || layers["dns.flags"] || layers["dns"]);
  if (hasDns) {
    protocol = "DNS";
    const qName = f(layers["dns_dns_qry_name"]) || f(layers["dns.qry.name"]);
    const respName = f(layers["dns_dns_resp_name"]) || f(layers["dns.resp.name"]);
    const query = qName || respName;

    // Cache DNS responses mapping IP -> domain
    const dnsIps = [
      ...fAll(layers["dns_dns_a"] || layers["dns.a"]),
      ...fAll(layers["dns_dns_aaaa"] || layers["dns.aaaa"])
    ];

    if (query && dnsIps.length > 0) {
      for (const ip of dnsIps) {
        if (ip) dnsCache.set(ip, query);
      }
    }

    // Check mDNS host discovery (e.g. "my-iphone.local")
    if (query && query.endsWith(".local") && onHostDiscovered && srcIp.startsWith(currentSubnet)) {
      const cleanHost = query.replace(/\.local$/, "");
      onHostDiscovered(srcIp, cleanHost, "mDNS");
    }

    domain = query;
    info = query ? `Query: ${query}` : "DNS packet";
  }

  // 2. TLS / HTTPS
  const tlsSni = f(layers["tls_tls_handshake_extensions_server_name"]) || f(layers["tls.handshake.extensions_server_name"]);
  const hasTls = !!(tlsSni || layers["tls"] || layers["ssl"] || layers["tls_tls_record"]);

  if (hasTls || dstPort === 443 || srcPort === 443) {
    if (!hasDns) {
      protocol = "TLS";
      if (tlsSni) {
        domain = tlsSni;
        info = `SNI: ${tlsSni}`;
      } else {
        const typeNum = f(layers["tls_tls_record_content_type"]);
        const typeName = TLS_TYPE[typeNum] || "AppData";
        const verNum = f(layers["tls_tls_record_version"]);
        const verName = TLS_VERSION[verNum] || "TLS";
        info = `${verName} ${typeName}`;
      }
    }
  }

  // 3. QUIC / HTTP3
  const hasQuic = !!(layers["quic"] || dstPort === 443 && transportProto === "UDP" || srcPort === 443 && transportProto === "UDP");
  if (hasQuic && !hasDns) {
    protocol = "QUIC";
    const quicSni = f(layers["quic_quic_handshake_extensions_server_name"]);
    if (quicSni) {
      domain = quicSni;
      info = `QUIC SNI: ${quicSni}`;
    } else {
      info = "QUIC Encrypted Handshake/Stream";
    }
  }

  // 4. HTTP / HTTP2
  const httpHost = f(layers["http_http_host"]) || f(layers["http.host"]);
  const httpUri = f(layers["http_http_request_uri"]) || f(layers["http.request.uri"]);
  const httpMethod = f(layers["http_http_request_method"]) || f(layers["http.request.method"]);

  if (httpHost || httpMethod || layers["http"]) {
    protocol = "HTTP";
    domain = httpHost || domain;
    info = `${httpMethod || "GET"} ${httpUri || "/"}`;
  } else if (layers["http2"]) {
    protocol = "HTTP2";
    info = "HTTP/2 Multiplexed Stream";
  }

  // 5. DHCP (Host discovery hook)
  if (dstPort === 67 || dstPort === 68 || srcPort === 67 || srcPort === 68) {
    protocol = "DHCP";
    info = "DHCP Configuration";
    const dhcpHost = f(layers["bootp_dhcp_option_hostname"]) || f(layers["dhcp.option.hostname"]);
    if (dhcpHost && onHostDiscovered && srcIp) {
      onHostDiscovered(srcIp, dhcpHost, "DHCP");
    }
  }

  // Direction resolution
  let direction = "other";
  let clientIp = null;
  let remoteIp = null;

  const srcIsClient = srcIp.startsWith(currentSubnet) && !srcIp.endsWith(".1");
  const dstIsClient = dstIp.startsWith(currentSubnet) && !dstIp.endsWith(".1");

  if (srcIsClient) {
    direction = "upload";
    clientIp = srcIp;
    remoteIp = dstIp;
  } else if (dstIsClient) {
    direction = "download";
    clientIp = dstIp;
    remoteIp = srcIp;
  } else {
    direction = srcIp.endsWith(".1") ? "download" : "upload";
    remoteIp = dstIp;
  }

  // Resolve domain fallback from cache
  if (!domain && remoteIp) {
    domain = dnsCache.get(remoteIp) || null;
  }
  if (!domain) {
    domain = remoteIp || "Unknown";
  }

  if (!info) {
    info = `${protocol} ${srcPort || ""} → ${dstPort || ""}`.trim();
  }

  // High-Level App Classification (Instagram, YouTube, etc.)
  const app = classifyApp(domain, remoteIp);

  return {
    id: `${timestamp}-${Math.random().toString(36).substr(2, 7)}`,
    timestamp,
    length,
    srcIp,
    dstIp,
    srcPort,
    dstPort,
    protocol,
    domain,
    app,
    info,
    direction,
    clientIp
  };
}

module.exports = {
  parsePacket,
  setSubnet,
  setHostDiscoveredCallback
};
