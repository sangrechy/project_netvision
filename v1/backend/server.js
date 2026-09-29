/**
 * NetVision V1 — Backend Server
 * Passive Hotspot Traffic Intelligence Dashboard
 *
 * Usage:
 *   sudo node server.js
 *   sudo HOTSPOT_IFACE=wlan0 HOTSPOT_SUBNET=10.42. node server.js
 */

const express   = require("express");
const http      = require("http");
const { Server } = require("socket.io");
const cors      = require("cors");
const path      = require("path");
const os        = require("os");

const tshark    = require("./tshark");
const devices   = require("./devices");
const { setupSockets } = require("./sockets");

// ── Config ────────────────────────────────────────────────────────────────────
const PORT           = process.env.PORT           || 3001;
const HOTSPOT_IFACE  = process.env.HOTSPOT_IFACE  || autoDetectInterface();
const HOTSPOT_SUBNET = process.env.HOTSPOT_SUBNET || "10.42.";

console.log(`
╔══════════════════════════════════════════════╗
║         NetVision V1 — Backend               ║
╠══════════════════════════════════════════════╣
║  Port      : ${String(PORT).padEnd(30)}║
║  Interface : ${String(HOTSPOT_IFACE).padEnd(30)}║
║  Subnet    : ${String(HOTSPOT_SUBNET).padEnd(30)}║
╚══════════════════════════════════════════════╝
`);

// ── Express setup ─────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Current devices REST endpoint (for initial load)
app.get("/api/devices", (req, res) => {
  res.json(devices.getDevices());
});

// Available interfaces
app.get("/api/interfaces", (req, res) => {
  const ifaces = os.networkInterfaces();
  const names  = Object.keys(ifaces).filter((name) => {
    // Filter out loopback
    const addrs = ifaces[name];
    return !addrs.every((a) => a.internal);
  });
  res.json({ interfaces: names, recommended: HOTSPOT_IFACE });
});

// ── Socket.IO setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

setupSockets(io, devices, tshark);

// ── Auto-start capture ────────────────────────────────────────────────────────
// Start capture automatically if AUTO_START env is set (or by default)
const AUTO_START = process.env.AUTO_START !== "false";

if (AUTO_START) {
  setTimeout(() => {
    console.log(`[server] auto-starting capture on: ${HOTSPOT_IFACE}`);
    tshark.startCapture(
      HOTSPOT_IFACE,
      (event) => {
        devices.recordPacket(event);

        // We re-use the same logic as sockets — emit to all connected clients
        io.emit("traffic", event);
        io.emit("devices", devices.getDevices());
      },
      (errMsg) => {
        console.error(`[tshark] auto-start error: ${errMsg}`);
        io.emit("captureError", { message: errMsg });
      }
    );
  }, 1000);
}

// ── Start HTTP server ─────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] listening on http://0.0.0.0:${PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("\n[server] shutting down...");
  tshark.stopCapture();
  server.close(() => process.exit(0));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Try to auto-detect the hotspot interface by looking for common names
 * or addresses in the hotspot subnet.
 */
function autoDetectInterface() {
  const candidates = ["wlan0", "wlp2s0", "wlp3s0", "wlan1", "ap0", "hotspot0", "wlp4s0"];

  try {
    const ifaces = os.networkInterfaces();

    // First: check for interfaces that have an IP in 10.42.x.x range
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (addrs.some((a) => a.family === "IPv4" && a.address.startsWith("10.42."))) {
        console.log(`[server] detected hotspot interface by IP: ${name}`);
        return name;
      }
    }

    // Second: return first candidate that exists
    for (const name of candidates) {
      if (ifaces[name]) return name;
    }

    // Fallback: first non-loopback interface
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (!addrs.every((a) => a.internal)) return name;
    }
  } catch (_) {}

  return "wlan0";
}
