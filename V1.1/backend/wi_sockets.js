/**
 * wi_sockets.js — NetVision V1 — Windows compatible
 *
 * Socket.IO event handling:
 *   - capture start/stop
 *   - realtime traffic
 *   - protocol statistics
 *   - device synchronization
 *   - recording JSON/CSV
 *
 * Windows/Linux independent.
 */

const fs = require("fs");
const path = require("path");

const RECORDINGS_DIR = path.join(
  __dirname,
  "recordings"
);

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, {
    recursive: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Global statistics
// ─────────────────────────────────────────────────────────────────────────────

const stats = {
  TCP: 0,
  UDP: 0,
  DNS: 0,
  TLS: 0,
  HTTP: 0,
  QUIC: 0,
  OTHER: 0,
};

function bumpStat(protocol) {
  switch (protocol) {
    case "DNS":
    case "mDNS":
      stats.DNS++;
      break;

    case "TLS":
      stats.TLS++;
      break;

    case "HTTP":
    case "HTTP2":
      stats.HTTP++;
      break;

    case "TCP":
      stats.TCP++;
      break;

    case "UDP":
      stats.UDP++;
      break;

    case "QUIC":
      stats.QUIC++;
      break;

    default:
      stats.OTHER++;
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recording
// ─────────────────────────────────────────────────────────────────────────────

let recording = false;
let recordingStream = null;
let recordingFormat = "json";
let recordingFile = null;

function startRecording(format) {
  if (recording) {
    return;
  }

  recordingFormat =
    format === "csv"
      ? "csv"
      : "json";

  recording = true;

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const extension =
    recordingFormat === "csv"
      ? "csv"
      : "json";

  recordingFile = path.join(
    RECORDINGS_DIR,
    `capture-${timestamp}.${extension}`
  );

  recordingStream =
    fs.createWriteStream(
      recordingFile,
      {
        flags: "a",
      }
    );

  if (recordingFormat === "csv") {
    recordingStream.write(
      "Time,Website,Protocol,Source IP,Destination IP,Transfer,Payload\n"
    );
  }

  console.log(
    `[recording] started → ${recordingFile}`
  );
}

function stopRecording() {
  if (!recording) {
    return;
  }

  recording = false;

  if (recordingStream) {
    recordingStream.end();
    recordingStream = null;
  }

  console.log(
    "[recording] stopped"
  );
}

function writePacket(event) {
  if (
    !recording ||
    !recordingStream
  ) {
    return;
  }

  if (recordingFormat === "json") {
    recordingStream.write(
      JSON.stringify(event) + "\n"
    );

    return;
  }

  const payload =
    String(event.payload || "")
      .replace(/"/g, "'")
      .replace(/\r?\n/g, " ");

  const row = [
    event.time,
    event.website,
    event.protocol,
    event.srcIp,
    event.dstIp,
    event.transfer,
    `"${payload}"`,
  ].join(",");

  recordingStream.write(
    row + "\n"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket setup
// ─────────────────────────────────────────────────────────────────────────────

function setupSockets(
  io,
  devices,
  tshark
) {

  // ───────────────────────────────────────────────────────────────────────────
  // Device push throttle
  // ───────────────────────────────────────────────────────────────────────────

  let devicePushPending = false;

  function pushDevices() {
    if (devicePushPending) {
      return;
    }

    devicePushPending = true;

    setTimeout(() => {
      io.emit(
        "devices",
        devices.getDevices()
      );

      devicePushPending = false;
    }, 1000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Stats push throttle
  // ───────────────────────────────────────────────────────────────────────────

  let statsPushPending = false;

  function pushStats() {
    if (statsPushPending) {
      return;
    }

    statsPushPending = true;

    setTimeout(() => {
      io.emit(
        "stats",
        { ...stats }
      );

      statsPushPending = false;
    }, 500);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Socket connection
  // ───────────────────────────────────────────────────────────────────────────

  io.on(
    "connection",
    (socket) => {

      console.log(
        `[socket] client connected: ${socket.id}`
      );

      // Current device snapshot
      socket.emit(
        "devices",
        devices.getDevices()
      );

      // Current statistics
      socket.emit(
        "stats",
        { ...stats }
      );

      // Capture state
      socket.emit(
        "captureStatus",
        {
          running:
            tshark.isRunning(),
        }
      );

      // Recording state
      socket.emit(
        "recordingStatus",
        {
          recording,
          file: recordingFile,
        }
      );

      // ───────────────────────────────────────────────────────────────────────
      // Start capture
      // ───────────────────────────────────────────────────────────────────────

      socket.on(
        "startCapture",
        ({ iface } = {}) => {

          /*
           * The Windows server determines the recommended
           * interface. The frontend can still explicitly
           * provide one.
           */
          const ifaceName =
            (
              iface ||
              process.env.HOTSPOT_IFACE ||
              ""
            ).trim();

          if (!ifaceName) {
            const message =
              "No capture interface specified.";

            console.error(
              `[tshark] ${message}`
            );

            socket.emit(
              "captureError",
              { message }
            );

            return;
          }

          console.log(
            `[tshark] starting capture on: ${ifaceName}`
          );

          // Stop previous capture
          tshark.stopCapture();

          // Reset statistics
          Object.keys(stats).forEach(
            (key) => {
              stats[key] = 0;
            }
          );

          tshark.startCapture(
            ifaceName,

            // ────────────────────────────────────────────────────────────────
            // Packet callback
            // ────────────────────────────────────────────────────────────────

            (event) => {

              // Update device traffic
              devices.recordPacket(event);

              // Update protocol statistics
              bumpStat(
                event.protocol
              );

              // Realtime packet
              io.emit(
                "traffic",
                event
              );

              // Throttled updates
              pushStats();
              pushDevices();

              // Recording
              writePacket(event);
            },

            // ────────────────────────────────────────────────────────────────
            // Error callback
            // ────────────────────────────────────────────────────────────────

            (errMsg) => {

              console.error(
                `[tshark] error: ${errMsg}`
              );

              io.emit(
                "captureError",
                {
                  message: errMsg,
                }
              );

              io.emit(
                "captureStatus",
                {
                  running: false,
                }
              );
            }
          );

          io.emit(
            "captureStatus",
            {
              running: true,
              iface: ifaceName,
            }
          );
        }
      );

      // ───────────────────────────────────────────────────────────────────────
      // Stop capture
      // ───────────────────────────────────────────────────────────────────────

      socket.on(
        "stopCapture",
        () => {

          tshark.stopCapture();

          io.emit(
            "captureStatus",
            {
              running: false,
            }
          );

          console.log(
            "[tshark] capture stopped"
          );
        }
      );

      // ───────────────────────────────────────────────────────────────────────
      // Start recording
      // ───────────────────────────────────────────────────────────────────────

      socket.on(
        "startRecording",
        ({ format } = {}) => {

          startRecording(format);

          io.emit(
            "recordingStatus",
            {
              recording: true,
              file: recordingFile,
            }
          );
        }
      );

      // ───────────────────────────────────────────────────────────────────────
      // Stop recording
      // ───────────────────────────────────────────────────────────────────────

      socket.on(
        "stopRecording",
        () => {

          stopRecording();

          io.emit(
            "recordingStatus",
            {
              recording: false,
              file: null,
            }
          );
        }
      );

      // ───────────────────────────────────────────────────────────────────────
      // Refresh devices
      // ───────────────────────────────────────────────────────────────────────

      socket.on(
        "refreshDevices",
        () => {

          devices.refreshDevices();

          socket.emit(
            "devices",
            devices.getDevices()
          );
        }
      );

      // ───────────────────────────────────────────────────────────────────────
      // Disconnect
      // ───────────────────────────────────────────────────────────────────────

      socket.on(
        "disconnect",
        () => {

          console.log(
            `[socket] client disconnected: ${socket.id}`
          );
        }
      );
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  setupSockets,
};