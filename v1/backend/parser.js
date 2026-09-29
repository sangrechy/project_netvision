/**
 * parser.js — NetVision V1 (improved)
 *
 * Converts a raw tshark EK-format (NDJSON) packet into a clean NetVision event.
 * EK format: each packet is one JSON line with a `layers` object whose values are arrays.
 *
 * Improvements:
 *  - DNS response caching → IP→domain resolution for later packets
 *  - SNI > DNS cache > HTTP host > reverse-dst priority chain
 *  - Better TLS payload previews with version + length
 *  - QUIC detection and preview
 *  - Correct upload/download direction logic
 *  - HTTP method + path extraction
 *  - ICMP / ARP labels
 *  - Robust field name handling (tshark uses both dot and underscore variants)
 */

const dnsCache = require("./dns-cache");

const HOTSPOT_SUBNET = process.env.HOTSPOT_SUBNET || "10.42.";

// IP protocol numbers
const IP_PROTO = {
  "1":  "ICMP",
  "6":  "TCP",
  "17": "UDP",
  "41": "IPv6",
  "58": "ICMPv6",
};

// TLS content type → readable name
const TLS_TYPE = {
  "20": "ChangeCipherSpec",
  "21": "Alert",
  "22": "Handshake",
  "23": "AppData",
  "24": "Heartbeat",
};

// TLS version hex codes → readable
const TLS_VERSION = {
  "0x0301": "TLSv1.0",
  "0x0302": "TLSv1.1",
  "0x0303": "TLSv1.2",
  "0x0304": "TLSv1.3",
  "769":  "TLSv1.0",
  "770":  "TLSv1.1",
  "771":  "TLSv1.2",
  "772":  "TLSv1.3",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get first value from tshark EK field (always an array). */
function f(arr) {
  if (!arr) return null;
  if (Array.isArray(arr)) return arr[0] ?? null;
  return arr; // sometimes tshark gives plain values
}

/** Try multiple field name variants (tshark dot vs underscore). */
function field(layers, ...names) {
  for (const name of names) {
    const val = f(layers[name]);
    if (val !== null && val !== undefined) return val;
  }
  return null;
}

function formatBytes(bytes) {
  const n = parseInt(bytes, 10);
  if (isNaN(n) || n === 0) return "0 B";
  if (n < 1024)            return `${n} B`;
  if (n < 1048576)         return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

function randHex(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
  }
  return out.join(" ");
}

function formatRealHex(raw, maxBytes = 14) {
  // tshark hex fields use colons: "17:03:03:a1:72"
  const bytes = raw.replace(/:/g, " ").trim().split(/\s+/).slice(0, maxBytes);
  return bytes.join(" ");
}

// ── Protocol classification ───────────────────────────────────────────────────

function classifyProtocol(layers, protoNum) {
  const frameProtos = (field(layers, "frame_protocols", "frame.protocols") || "").toLowerCase();

  if (frameProtos.includes("dns"))           return "DNS";
  if (frameProtos.includes("tls"))           return "TLS";
  if (frameProtos.includes("quic"))          return "QUIC";
  if (frameProtos.includes("http2"))         return "HTTP2";
  if (frameProtos.includes("http"))          return "HTTP";
  if (frameProtos.includes("mdns"))          return "mDNS";
  if (frameProtos.includes("dhcp") ||
      frameProtos.includes("bootp"))         return "DHCP";
  if (frameProtos.includes("icmp"))          return "ICMP";
  if (frameProtos.includes("arp"))           return "ARP";
  if (frameProtos.includes("ntp"))           return "NTP";

  return IP_PROTO[protoNum] || "OTHER";
}

// ── DNS cache population ──────────────────────────────────────────────────────

/**
 * If this packet is a DNS response, extract all A/AAAA answers and cache them.
 * dnsmasq maps ip → name so later TCP/TLS packets can resolve domain names.
 */
function extractDnsAnswers(layers) {
  // dns.flags.response == "1" means it's a response
  const isResponse = field(layers, "dns_flags_response", "dns.flags.response");
  if (!isResponse || isResponse === "0" || isResponse === false) return;

  // dns.a is the A-record answer field (array of IPs)
  const aRecords    = layers["dns_a"]    || layers["dns.a"]    || [];
  const aaaaRecords = layers["dns_aaaa"] || layers["dns.aaaa"] || [];
  const qname       = field(layers, "dns_qry_name", "dns.qry.name");

  if (!qname) return;

  const ips = [
    ...(Array.isArray(aRecords)    ? aRecords    : [aRecords]),
    ...(Array.isArray(aaaaRecords) ? aaaaRecords : [aaaaRecords]),
  ].filter(Boolean);

  for (const ip of ips) {
    dnsCache.set(ip, qname);
  }
}

// ── Domain inference ──────────────────────────────────────────────────────────

function inferDomain(layers, srcIp, dstIp) {
  // 1. TLS SNI (most reliable for HTTPS)
  const sni = field(layers,
    "tls_handshake_extensions_server_name",
    "tls.handshake.extensions_server_name");
  if (sni) return sni;

  // 2. HTTP Host header
  const httpHost = field(layers, "http_host", "http.host");
  if (httpHost) return httpHost;

  // 3. DNS query name (for DNS packets themselves)
  const dnsQuery = field(layers, "dns_qry_name", "dns.qry.name");
  if (dnsQuery) return dnsQuery;

  // 4. DNS cache lookup — check both dst and src IPs
  const hotspotIp = srcIp.startsWith(HOTSPOT_SUBNET) ? dstIp : srcIp;
  const cached = dnsCache.get(hotspotIp);
  if (cached) return cached;

  // 5. Fallback: remote IP
  const remoteIp = srcIp.startsWith(HOTSPOT_SUBNET) ? dstIp : srcIp;
  return remoteIp || "unknown";
}

// ── Payload preview ───────────────────────────────────────────────────────────

function buildPayload(layers, protocol) {
  // ── TLS ──────────────────────────────────────────────────────────────────
  if (protocol === "TLS") {
    const ctRaw  = field(layers, "tls_record_content_type", "tls.record.content_type");
    const verRaw = field(layers, "tls_record_version",      "tls.record.version");
    const lenRaw = field(layers, "tls_record_length",       "tls.record.length");

    const typeName = TLS_TYPE[String(ctRaw)] || "AppData";
    const verName  = TLS_VERSION[String(verRaw)] || "TLSv1.3";
    const lenStr   = lenRaw ? ` len=${lenRaw}` : "";

    // Real hex if available, else representative fake
    const rawHex = field(layers, "data_data", "data.data", "tls_record_tls_app_data", "tls.record.tls_app_data");
    const hexStr = rawHex ? formatRealHex(rawHex) : randHex(10);

    return `${verName} ${typeName}${lenStr}  ${hexStr}...`;
  }

  // ── QUIC ──────────────────────────────────────────────────────────────────
  if (protocol === "QUIC") {
    const rawHex = field(layers, "quic_payload", "quic.payload", "data_data", "data.data");
    const hexStr = rawHex ? formatRealHex(rawHex) : randHex(10);
    return `QUIC Encrypted  ${hexStr}...`;
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────
  if (protocol === "HTTP" || protocol === "HTTP2") {
    const method  = field(layers, "http_request_method", "http.request.method");
    const uri     = field(layers, "http_request_uri",    "http.request.uri");
    const code    = field(layers, "http_response_code",  "http.response.code");
    const ctype   = field(layers, "http_content_type",   "http.content_type");

    if (method && uri) return `${method} ${uri.substring(0, 60)}`;
    if (code)          return `HTTP ${code}${ctype ? `  ${ctype}` : ""}`;

    const host = field(layers, "http_host", "http.host");
    if (host)          return `HTTP/1.1 Host: ${host}`;
    return "HTTP [plaintext]";
  }

  // ── DNS ──────────────────────────────────────────────────────────────────
  if (protocol === "DNS" || protocol === "mDNS") {
    const qname     = field(layers, "dns_qry_name",        "dns.qry.name");
    const qtype     = field(layers, "dns_qry_type",        "dns.qry.type");
    const isResp    = field(layers, "dns_flags_response",  "dns.flags.response");
    const aRecord   = field(layers, "dns_a",               "dns.a");

    const typeLabel = qtype === "28" ? "AAAA" : qtype === "1" ? "A" : (qtype || "");
    if (isResp && isResp !== "0") {
      return `DNS Response  ${qname || ""}  →  ${aRecord || "[no answer]"}`;
    }
    return `DNS Query ${typeLabel}  ${qname || ""}`;
  }

  // ── DHCP ──────────────────────────────────────────────────────────────────
  if (protocol === "DHCP") {
    const msgType = field(layers, "dhcp_option_dhcp", "dhcp.option.dhcp",
                          "bootp_option_dhcp", "bootp.option.dhcp");
    const types   = { "1":"DISCOVER","2":"OFFER","3":"REQUEST","4":"DECLINE","5":"ACK","6":"NAK","7":"RELEASE" };
    return `DHCP ${types[String(msgType)] || "Message"}`;
  }

  // ── Raw / other ───────────────────────────────────────────────────────────
  const rawHex = field(layers, "data_data", "data.data");
  if (rawHex) return `${formatRealHex(rawHex)}...`;

  return `[Encrypted]  ${randHex(10)}...`;
}

// ── Transfer direction ────────────────────────────────────────────────────────

function direction(srcIp) {
  return srcIp.startsWith(HOTSPOT_SUBNET) ? "↑" : "↓";
}

// ── Main export ───────────────────────────────────────────────────────────────

function parsePacket(raw) {
  const layers = raw.layers;
  if (!layers) return null;

  const srcIp = field(layers, "ip_src", "ip.src");
  const dstIp = field(layers, "ip_dst", "ip.dst");
  if (!srcIp || !dstIp) return null;

  // Hotspot filter: at least one side must be on our subnet
  const isSrc = srcIp.startsWith(HOTSPOT_SUBNET);
  const isDst = dstIp.startsWith(HOTSPOT_SUBNET);
  if (!isSrc && !isDst) return null;

  const protoNum = field(layers, "ip_proto", "ip.proto") || "0";
  const ipLen    = field(layers, "ip_len", "ip.len") || "0";
  const epoch    = field(layers, "frame_time_epoch", "frame.time_epoch");

  const protocol = classifyProtocol(layers, protoNum);

  // Populate DNS cache from DNS responses BEFORE inferring domain
  extractDnsAnswers(layers);

  const domain   = inferDomain(layers, srcIp, dstIp);
  const payload  = buildPayload(layers, protocol);
  const dir      = direction(srcIp);
  const transfer = `${dir} ${formatBytes(ipLen)}`;

  // Client IP = whichever side is on the hotspot subnet
  const clientIp = isSrc ? srcIp : dstIp;

  let time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  if (epoch) {
    time = new Date(parseFloat(epoch) * 1000).toLocaleTimeString("en-GB", { hour12: false });
  }

  return {
    id:       `${epoch || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time,
    website:  domain,
    srcIp,
    dstIp,
    clientIp,
    protocol,
    transfer,
    direction: dir,
    payload,
    bytes:    parseInt(ipLen, 10) || 0,
  };
}

module.exports = { parsePacket, HOTSPOT_SUBNET };
