/**
 * sockets.js — NetVision V1 (improved)
 *
 * Manages all Socket.IO event handling:
 *   - capture start/stop
 *   - realtime traffic broadcast
 *   - protocol stats (TCP/UDP/DNS/TLS/QUIC/HTTP/OTHER)
 *   - device list sync
 *   - recording (JSON + CSV)
 *   - graceful stat resets
 */

const fs   = require("fs");
const path = require("path");

const RECORDINGS_DIR = path.join(__dirname, "recordings");
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

// ── Global stats ──────────────────────────────────────────────────────────────
const stats = { TCP: 0, UDP: 0, DNS: 0, TLS: 0, HTTP: 0, QUIC: 0, OTHER: 0 };

function bumpStat(protocol) {
  switch (protocol) {
    case "DNS":
    case "mDNS":  stats.DNS++;  break;
    case "TLS":   stats.TLS++;  break;
    case "HTTP":
    case "HTTP2": stats.HTTP++; break;
    case "TCP":   stats.TCP++;  break;
    case "UDP":   stats.UDP++;  break;
    case "QUIC":  stats.QUIC++; break;
    default:      stats.OTHER++; break;
  }
}

// ── Recording state ───────────────────────────────────────────────────────────
let recording       = false;
let recordingStream = null;
let recordingFormat = "json";
let recordingFile   = null;

function startRecording(format) {
  if (recording) return;
  recordingFormat = format || "json";
  recording       = true;

  const ts  = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = recordingFormat === "csv" ? "csv" : "json";
  recordingFile   = path.join(RECORDINGS_DIR, `capture-${ts}.${ext}`);
  recordingStream = fs.createWriteStream(recordingFile, { flags: "a" });

  if (recordingFormat === "csv") {
    recordingStream.write("Time,Website,Protocol,Source IP,Destination IP,Transfer,Payload\n");
  }

  console.log(`[recording] started → ${recordingFile}`);
}

function stopRecording() {
  if (!recording) return;
  recording = false;
  if (recordingStream) {
    recordingStream.end();
    recordingStream = null;
  }
  console.log("[recording] stopped");
}

function writePacket(event) {
  if (!recording || !recordingStream) return;
  if (recordingFormat === "json") {
    recordingStream.write(JSON.stringify(event) + "\n");
  } else {
    const row = [
      event.time, event.website, event.protocol,
      event.srcIp, event.dstIp, event.transfer,
      `"${(event.payload || "").replace(/"/g, "'")}"`,
    ].join(",");
    recordingStream.write(row + "\n");
  }
}

// ── Main setup ────────────────────────────────────────────────────────────────

function setupSockets(io, devices, tshark) {
  // Throttle device list pushes — at most once per second
  let devicePushPending = false;
  function pushDevices() {
    if (devicePushPending) return;
    devicePushPending = true;
    setTimeout(() => {
      io.emit("devices", devices.getDevices());
      devicePushPending = false;
    }, 1000);
  }

  // Stats broadcast — at most once per 500ms
  let statsPushPending = false;
  function pushStats() {
    if (statsPushPending) return;
    statsPushPending = true;
    setTimeout(() => {
      io.emit("stats", { ...stats });
      statsPushPending = false;
    }, 500);
  }

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    // Send current snapshot immediately
    socket.emit("devices",       devices.getDevices());
    socket.emit("stats",         { ...stats });
    socket.emit("captureStatus", { running: tshark.isRunning() });
    socket.emit("recordingStatus", { recording, file: recordingFile });

    // ── Start capture ─────────────────────────────────────────────────────────
    socket.on("startCapture", ({ iface } = {}) => {
      const ifaceName = (iface || process.env.HOTSPOT_IFACE || "wlan0").trim();
      console.log(`[tshark] starting capture on: ${ifaceName}`);

      tshark.stopCapture();
      // Reset stats on new capture session
      Object.keys(stats).forEach((k) => (stats[k] = 0));

      tshark.startCapture(
        ifaceName,
        (event) => {
          // Update device traffic counters
          devices.recordPacket(event);

          // Update protocol stats
          bumpStat(event.protocol);

          // Broadcast packet to all connected clients
          io.emit("traffic", event);

          // Throttled pushes for slower-changing data
          pushStats();
          pushDevices();

          // Recording
          writePacket(event);
        },
        (errMsg) => {
          console.error(`[tshark] error: ${errMsg}`);
          io.emit("captureError", { message: errMsg });
        }
      );

      io.emit("captureStatus", { running: true, iface: ifaceName });
    });

    // ── Stop capture ──────────────────────────────────────────────────────────
    socket.on("stopCapture", () => {
      tshark.stopCapture();
      io.emit("captureStatus", { running: false });
    });

    // ── Recording ─────────────────────────────────────────────────────────────
    socket.on("startRecording", ({ format } = {}) => {
      startRecording(format);
      io.emit("recordingStatus", { recording: true, file: recordingFile });
    });

    socket.on("stopRecording", () => {
      stopRecording();
      io.emit("recordingStatus", { recording: false, file: null });
    });

    // ── Device refresh ────────────────────────────────────────────────────────
    socket.on("refreshDevices", () => {
      devices.refreshDevices();
      socket.emit("devices", devices.getDevices());
    });

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSockets };
