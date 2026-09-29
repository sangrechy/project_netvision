/**
 * NetVision V1 — MOCK SERVER (improved)
 *
 * Generates realistic fake traffic for UI testing.
 * No tshark, no sudo required.
 *
 * Usage:  node mock-server.js
 */

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");

const PORT = process.env.PORT || 3001;
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin:"*" } });

app.use(cors());
app.use(express.json());

// ── Mock devices (realistic) ──────────────────────────────────────────────────
const DEVICES = [
  { ip:"10.42.0.5",  mac:"e6:83:4c:f9:c1:11", name:"Redmi Note 10",   vendor:"Xiaomi",   type:"phone",  icon:"📱", online:true, bytesUp:0, bytesDown:0, bytes:0 },
  { ip:"10.42.0.8",  mac:"8a:22:bd:14:c3:aa", name:"iPhone 14 Pro",   vendor:"Apple",    type:"phone",  icon:"📱", online:true, bytesUp:0, bytesDown:0, bytes:0 },
  { ip:"10.42.0.11", mac:"da:4e:77:22:f1:33", name:"Samsung Galaxy",  vendor:"Samsung",  type:"phone",  icon:"📱", online:true, bytesUp:0, bytesDown:0, bytes:0 },
  { ip:"10.42.0.14", mac:"f2:56:cc:09:ab:77", name:"Dell XPS Laptop", vendor:"Dell",     type:"laptop", icon:"💻", online:false,bytesUp:0, bytesDown:0, bytes:0 },
];

const SITES = [
  { host:"youtube.com",          dst:"142.250.67.174", proto:"TLS",  port:443 },
  { host:"googlevideo.com",      dst:"142.250.183.14", proto:"QUIC", port:443 },
  { host:"whatsapp.net",         dst:"157.240.22.52",  proto:"TLS",  port:443 },
  { host:"instagram.com",        dst:"31.13.93.9",     proto:"TLS",  port:443 },
  { host:"api.twitter.com",      dst:"104.244.42.65",  proto:"TLS",  port:443 },
  { host:"dns.google",           dst:"8.8.8.8",        proto:"DNS",  port:53  },
  { host:"one.one.one.one",      dst:"1.1.1.1",        proto:"DNS",  port:53  },
  { host:"reddit.com",           dst:"151.101.1.140",  proto:"TLS",  port:443 },
  { host:"spotify.com",          dst:"35.186.224.53",  proto:"TLS",  port:443 },
  { host:"netflix.com",          dst:"54.217.230.1",   proto:"QUIC", port:443 },
  { host:"api.github.com",       dst:"140.82.121.5",   proto:"TLS",  port:443 },
  { host:"connectivitycheck.gstatic.com", dst:"142.250.67.14", proto:"HTTP", port:80 },
  { host:"pool.ntp.org",         dst:"84.16.73.33",    proto:"UDP",  port:123 },
  { host:"ssl.gstatic.com",      dst:"142.250.77.99",  proto:"TLS",  port:443 },
  { host:"teams.microsoft.com",  dst:"52.114.77.33",   proto:"TLS",  port:443 },
];

const TLS_PAYLOADS = [
  "TLSv1.3 AppData len=1250  17 03 03 a1 72 6c 8f d1 00 2e",
  "TLSv1.3 AppData len=892   af 77 c2 11 3e 9b 44 f0 12 cd",
  "TLSv1.2 AppData len=548   8f d1 00 2e 9b 7a 13 ff 82 01",
  "TLSv1.3 Handshake len=241 16 03 01 00 f1 01 00 00 ed 03",
  "TLSv1.3 AppData len=2048  cc 14 88 3f aa 11 77 bb 99 22",
];
const QUIC_PAYLOADS = [
  "QUIC Encrypted  5b 33 4b 47 55 9c 2e 11 a0 ff",
  "QUIC Encrypted  e3 7a 00 1d 4f 88 c2 39 6b 55",
  "QUIC Initial    c3 00 00 00 01 08 44 9a b6 21",
];
const DNS_PAYLOADS_Q = (h) => `DNS Query A  ${h}`;
const DNS_PAYLOADS_R = (h, ip) => `DNS Response  ${h}  →  ${ip}`;
const HTTP_PAYLOADS  = [
  "GET /generate_204 HTTP/1.1",
  "HTTP 204 No Content",
  "GET /api/v1/status HTTP/1.1",
];
const UDP_PAYLOADS = [
  "NTP request  00 1b 00 00 00 00 00 00",
  "UDP  00 11 22 33 44 55 66 77 88 99",
];

function rand(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b)   { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randHex(n)      { return Array.from({length:n}, () => Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join(" "); }
function fmtBytes(b)     { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(2)} MB`; }

const stats = { TCP:0, UDP:0, DNS:0, TLS:0, HTTP:0, QUIC:0, OTHER:0 };
let pktId = 0;

function generatePacket() {
  const dev  = rand(DEVICES.filter(d => d.online !== false || Math.random() > 0.8));
  const site = rand(SITES);
  const upload = Math.random() < 0.3; // more downloads than uploads
  const bytes  = randInt(64, 48_000);
  const proto  = site.proto;

  // Update device counters
  dev.bytes += bytes;
  if (upload) dev.bytesUp += bytes; else dev.bytesDown += bytes;

  // Build payload
  let payload;
  if (proto === "TLS")       payload = rand(TLS_PAYLOADS);
  else if (proto === "QUIC") payload = rand(QUIC_PAYLOADS);
  else if (proto === "DNS")  payload = Math.random() > 0.5 ? DNS_PAYLOADS_Q(site.host) : DNS_PAYLOADS_R(site.host, site.dst);
  else if (proto === "HTTP") payload = rand(HTTP_PAYLOADS);
  else if (proto === "UDP")  payload = rand(UDP_PAYLOADS);
  else                        payload = `[Encrypted]  ${randHex(10)}...`;

  // Bump stats
  if (proto === "DNS")        stats.DNS++;
  else if (proto === "TLS")   stats.TLS++;
  else if (proto === "QUIC")  stats.QUIC++;
  else if (proto === "HTTP")  stats.HTTP++;
  else if (proto === "UDP")   stats.UDP++;
  else                         stats.TCP++;

  const srcIp = upload ? dev.ip   : site.dst;
  const dstIp = upload ? site.dst : dev.ip;

  return {
    id:       `mock-${++pktId}`,
    time:     new Date().toLocaleTimeString("en-GB", { hour12:false }),
    website:  site.host,
    srcIp,
    dstIp,
    clientIp: dev.ip,
    protocol: proto,
    direction: upload ? "↑" : "↓",
    transfer: `${upload ? "↑" : "↓"} ${fmtBytes(bytes)}`,
    payload,
    bytes,
  };
}

// ── REST ──────────────────────────────────────────────────────────────────────
app.get("/api/health",     (_, res) => res.json({ status:"ok", mock:true }));
app.get("/api/devices",    (_, res) => res.json(DEVICES));
app.get("/api/interfaces", (_, res) => res.json({ interfaces:["wlan0","wlp2s0","eth0"], recommended:"wlan0" }));

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[mock] client connected: ${socket.id}`);

  socket.emit("devices",       DEVICES);
  socket.emit("stats",         { ...stats });
  socket.emit("captureStatus", { running:true, iface:"wlan0 (MOCK)" });
  socket.emit("recordingStatus", { recording:false });

  socket.on("startCapture",   ({ iface }) => socket.emit("captureStatus", { running:true, iface:`${iface} (MOCK)` }));
  socket.on("stopCapture",    () => socket.emit("captureStatus", { running:false }));
  socket.on("refreshDevices", () => socket.emit("devices", DEVICES));
  socket.on("startRecording", () => socket.emit("recordingStatus", { recording:true, file:"/tmp/mock.json" }));
  socket.on("stopRecording",  () => socket.emit("recordingStatus", { recording:false }));
  socket.on("disconnect",     () => console.log(`[mock] disconnected: ${socket.id}`));
});

// ── Packet emission loop ──────────────────────────────────────────────────────
function emitBurst() {
  const count = randInt(1, 4);
  for (let i = 0; i < count; i++) {
    const pkt = generatePacket();
    io.emit("traffic", pkt);
  }
  io.emit("stats",   { ...stats });
  // Emit device updates every ~5 bursts
  if (pktId % 20 < 4) io.emit("devices", DEVICES);

  setTimeout(emitBurst, randInt(300, 700));
}
emitBurst();

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   NetVision V1 — MOCK SERVER             ║
╠══════════════════════════════════════════╣
║  Port : ${String(PORT).padEnd(33)}║
║  Mode : FAKE DATA — no tshark needed     ║
╚══════════════════════════════════════════╝
Open http://localhost:5173
`);
});
