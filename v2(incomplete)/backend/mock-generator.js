/**
 * mock-generator.js — NetVision V2
 * High-fidelity packet stream generator for testing, demo mode, and offline operation without tshark.
 */

const { classifyApp } = require("./app-classifier");

const SAMPLE_DEVICES = [
  {
    ipSuffix: "105",
    mac: "3c:06:30:2a:18:9f",
    hostname: "Sams-iPhone-15",
    vendor: "Apple, Inc.",
    type: "phone",
    icon: "📱"
  },
  {
    ipSuffix: "142",
    mac: "f4:f5:d8:12:4c:81",
    hostname: "MacBook-Pro-M2",
    vendor: "Apple, Inc.",
    type: "laptop",
    icon: "💻"
  },
  {
    ipSuffix: "189",
    mac: "50:8a:06:55:e1:07",
    hostname: "Galaxy-S24-Ultra",
    vendor: "Samsung Electronics",
    type: "phone",
    icon: "📱"
  },
  {
    ipSuffix: "210",
    mac: "00:15:5d:7f:89:12",
    hostname: "ThinkPad-X1-Linux",
    vendor: "Lenovo Mobile",
    type: "laptop",
    icon: "💻"
  }
];

const SAMPLE_DOMAINS = [
  { domain: "gateway.instagram.com", protocol: "TLS", info: "TLSv1.3 AppData (len=1420)", port: 443 },
  { domain: "scontent.cdninstagram.com", protocol: "TLS", info: "TLSv1.3 Handshake (SNI: scontent.cdninstagram.com)", port: 443 },
  { domain: "rr4---sn-4g5ednks.googlevideo.com", protocol: "QUIC", info: "QUIC 1080p Video Stream", port: 443 },
  { domain: "i.ytimg.com", protocol: "QUIC", info: "QUIC Handshake/Stream", port: 443 },
  { domain: "discord.gg", protocol: "QUIC", info: "QUIC Encrypted Voice/Data", port: 443 },
  { domain: "api.github.com", protocol: "TLS", info: "TLSv1.3 Handshake (SNI: api.github.com)", port: 443 },
  { domain: "web.whatsapp.com", protocol: "TLS", info: "TLSv1.3 Encrypted Session", port: 443 },
  { domain: "spclient.wg.spotify.com", protocol: "TLS", info: "TLSv1.3 Audio AppData (len=1350)", port: 443 },
  { domain: "api.openai.com", protocol: "TLS", info: "TLSv1.3 AppData (len=2048)", port: 443 },
  { domain: "v16-webapp-prime.tiktok.com", protocol: "TLS", info: "TLSv1.3 Video Stream Handshake", port: 443 },
  { domain: "dns.google", protocol: "DNS", info: "Query: A www.cloudflare.com", port: 53 },
  { domain: "connectivitycheck.gstatic.com", protocol: "HTTP", info: "GET /generate_204", port: 80 }
];

let isRunning = false;

function startMockStream(subnet, onPacket, onDeviceSeed) {
  if (isRunning) return;
  isRunning = true;

  // Seed devices into backend registry
  if (onDeviceSeed) {
    SAMPLE_DEVICES.forEach(dev => {
      onDeviceSeed({
        ip: `${subnet}${dev.ipSuffix}`,
        mac: dev.mac,
        hostname: dev.hostname,
        vendor: dev.vendor,
        type: dev.type,
        icon: dev.icon,
        name: dev.hostname,
        state: "Active",
        online: true,
        firstSeen: Date.now() - Math.floor(Math.random() * 60000),
        lastSeen: Date.now(),
        uploadBytes: Math.floor(Math.random() * 500000),
        downloadBytes: Math.floor(Math.random() * 2500000),
        uploadPkts: Math.floor(Math.random() * 1200),
        downloadPkts: Math.floor(Math.random() * 4500)
      });
    });
  }

  const emitBurst = () => {
    if (!isRunning) return;

    const count = 1 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const dev = SAMPLE_DEVICES[Math.floor(Math.random() * SAMPLE_DEVICES.length)];
      const target = SAMPLE_DOMAINS[Math.floor(Math.random() * SAMPLE_DOMAINS.length)];
      const isUpload = Math.random() < 0.35;
      const clientIp = `${subnet}${dev.ipSuffix}`;
      const remoteIp = `142.250.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250) + 1}`;
      const length = Math.floor(Math.random() * 1350) + 64;

      const app = classifyApp(target.domain, remoteIp);

      const pkt = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        timestamp: Date.now(),
        length,
        srcIp: isUpload ? clientIp : remoteIp,
        dstIp: isUpload ? remoteIp : clientIp,
        srcPort: isUpload ? (49152 + Math.floor(Math.random() * 10000)) : target.port,
        dstPort: isUpload ? target.port : (49152 + Math.floor(Math.random() * 10000)),
        protocol: target.protocol,
        domain: target.domain,
        app,
        info: target.info,
        direction: isUpload ? "upload" : "download",
        clientIp
      };

      onPacket(pkt);
    }

    const delay = Math.floor(Math.random() * 150) + 80;
    setTimeout(emitBurst, delay);
  };

  emitBurst();
}

function stopMockStream() {
  isRunning = false;
}

module.exports = {
  startMockStream,
  stopMockStream,
  SAMPLE_DEVICES
};
