/**
 * server.js — NetVision V2
 * Unified Cross-Platform Server (Windows & Linux)
 * Passive Hotspot Traffic Intelligence Dashboard
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { isWin, isLinux, autoDetectHotspot, getInterfaces } = require("./os-adapter");
const devices = require("./devices");
const tshark = require("./tshark");
const { setupSockets, startCapture } = require("./sockets");

// ── Configuration ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const isMockRequested = process.argv.includes("--mock") || process.env.MOCK === "true";

const detected = autoDetectHotspot();
const HOTSPOT_IFACE = process.env.HOTSPOT_IFACE || detected.iface;
const HOTSPOT_SUBNET = process.env.HOTSPOT_SUBNET || detected.subnet;
const GATEWAY_IP = detected.gatewayIp;

console.log(`
\x1b[36m╔══════════════════════════════════════════════════════════════╗
║                    NetVision V2 Server                       ║
║       Neumorphic Cross-Platform Network Intelligence        ║
╠══════════════════════════════════════════════════════════════╣
║  Platform     : ${(process.platform + (isWin ? " (Windows)" : isLinux ? " (Linux)" : "")).padEnd(44)}║
║  Port         : ${String(PORT).padEnd(44)}║
║  Interface    : ${String(HOTSPOT_IFACE).padEnd(44)}║
║  Subnet       : ${String(HOTSPOT_SUBNET).padEnd(44)}║
║  Gateway IP   : ${String(GATEWAY_IP).padEnd(44)}║
║  Capture Mode : ${(isMockRequested ? "Simulated Mock Mode" : "Native Tshark (Auto-fallback)").padEnd(44)}║
╚══════════════════════════════════════════════════════════════╝\x1b[0m
`);

// ── Express & Socket.IO Setup ─────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Static downloads for capture recordings
const recordingsDir = path.join(__dirname, "recordings");
app.use("/recordings", express.static(recordingsDir));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    platform: process.platform,
    tsharkStatus: tshark.getStatus()
  });
});

app.get("/api/interfaces", (req, res) => {
  res.json({
    currentIface: HOTSPOT_IFACE,
    currentSubnet: HOTSPOT_SUBNET,
    interfaces: getInterfaces()
  });
});

app.get("/api/recordings", (req, res) => {
  try {
    if (!fs.existsSync(recordingsDir)) return res.json([]);
    const files = fs.readdirSync(recordingsDir).map(file => {
      const stats = fs.statSync(path.join(recordingsDir, file));
      return {
        name: file,
        size: stats.size,
        createdAt: stats.birthtime,
        url: `/recordings/${file}`
      };
    });
    res.json(files.sort((a, b) => b.createdAt - a.createdAt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ── Start Subsystems ─────────────────────────────────────────────────────────
const hotspotConfig = {
  iface: HOTSPOT_IFACE,
  subnet: HOTSPOT_SUBNET,
  gatewayIp: GATEWAY_IP,
  platform: process.platform
};

// Initialize device tracker
devices.init(hotspotConfig);

// Setup WebSockets hub
setupSockets(io, hotspotConfig);

// Start packet capture (tshark or mock fallback)
startCapture(HOTSPOT_IFACE, HOTSPOT_SUBNET, isMockRequested);

// ── Server Listen ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\x1b[32m✔ NetVision V2 Backend listening on http://localhost:${PORT}\x1b[0m\n`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down NetVision V2 gracefully...");
  tshark.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  tshark.stop();
  process.exit(0);
});
