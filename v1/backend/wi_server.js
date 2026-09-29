/**
 * wi_server.js — NetVision V1
 *
 * Windows version of the original server.js.
 *
 * Original Linux logic is preserved.
 * Only Linux-specific hotspot/interface detection
 * has been changed for Windows.
 *
 * Windows Mobile Hotspot normally:
 *   Interface : Local Area Connection* X
 *   IP        : 192.168.137.1
 *   Subnet    : 192.168.137.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const os = require("os");


// ─────────────────────────────────────────────────────────────────────────────
// Windows hotspot detection
// ─────────────────────────────────────────────────────────────────────────────

function autoDetectInterface() {

  const ifaces = os.networkInterfaces();

  /*
   * Windows Mobile Hotspot normally creates:
   *
   * Local Area Connection* 2
   *
   * with:
   *
   * 192.168.137.1
   */

  for (
    const [name, addrs]
    of Object.entries(ifaces)
  ) {

    for (const addr of addrs || []) {

      if (
        addr.family === "IPv4" &&
        addr.address.startsWith("192.168.137.")
      ) {

        console.log(
          `[server] Windows hotspot detected: ${name}`
        );

        console.log(
          `[server] hotspot IP: ${addr.address}`
        );

        return name;
      }
    }
  }


  /*
   * If the user manually specifies the interface,
   * respect it.
   */

  if (process.env.HOTSPOT_IFACE) {

    console.log(
      `[server] using HOTSPOT_IFACE: ${process.env.HOTSPOT_IFACE}`
    );

    return process.env.HOTSPOT_IFACE;
  }


  /*
   * No hotspot detected.
   *
   * Keep the server usable so that Windows
   * Mobile Hotspot can be enabled afterward.
   */

  console.warn(
    "[server] Windows Mobile Hotspot interface not detected."
  );

  return "";
}


// ─────────────────────────────────────────────────────────────────────────────
// Detect interface FIRST
// ─────────────────────────────────────────────────────────────────────────────

const HOTSPOT_IFACE =
  process.env.HOTSPOT_IFACE ||
  autoDetectInterface();


// Windows Mobile Hotspot subnet
const HOTSPOT_SUBNET =
  process.env.HOTSPOT_SUBNET ||
  "192.168.137.";


// IMPORTANT:
//
// wi_parser.js reads HOTSPOT_SUBNET when it is loaded.
// Therefore set the environment variable before
// loading wi_tshark / wi_devices.
//

process.env.HOTSPOT_SUBNET =
  HOTSPOT_SUBNET;

if (HOTSPOT_IFACE) {
  process.env.HOTSPOT_IFACE =
    HOTSPOT_IFACE;
}


// ─────────────────────────────────────────────────────────────────────────────
// Windows versions of original modules
// ─────────────────────────────────────────────────────────────────────────────

const tshark =
  require("./wi_tshark");

const devices =
  require("./wi_devices");

const { setupSockets } =
  require("./wi_sockets");


// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const PORT =
  process.env.PORT ||
  3001;


// ─────────────────────────────────────────────────────────────────────────────
// Console
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════╗
║         NetVision V1 — Backend               ║
╠══════════════════════════════════════════════╣
║  Port      : ${String(PORT).padEnd(30)}║
║  Interface : ${String(HOTSPOT_IFACE || "NOT FOUND").padEnd(30)}║
║  Subnet    : ${String(HOTSPOT_SUBNET).padEnd(30)}║
╚══════════════════════════════════════════════╝
`);


// ─────────────────────────────────────────────────────────────────────────────
// Express setup
// ─────────────────────────────────────────────────────────────────────────────

const app =
  express();

const server =
  http.createServer(app);

app.use(cors());

app.use(
  express.json()
);


// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      status: "ok",
      uptime: process.uptime(),
    });

  }
);


// ─────────────────────────────────────────────────────────────────────────────
// Current devices REST endpoint
// ─────────────────────────────────────────────────────────────────────────────

app.get(
  "/api/devices",
  (req, res) => {

    res.json(
      devices.getDevices()
    );

  }
);


// ─────────────────────────────────────────────────────────────────────────────
// Available interfaces
// ─────────────────────────────────────────────────────────────────────────────

app.get(
  "/api/interfaces",
  (req, res) => {

    const ifaces =
      os.networkInterfaces();

    const names =
      Object.keys(ifaces)
        .filter((name) => {

          const addrs =
            ifaces[name];

          return !addrs.every(
            (a) => a.internal
          );

        });


    res.json({
      interfaces: names,
      recommended: HOTSPOT_IFACE,
    });

  }
);


// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO setup
// ─────────────────────────────────────────────────────────────────────────────

const io =
  new Server(
    server,
    {
      cors: {
        origin: "*",
        methods: [
          "GET",
          "POST",
        ],
      },

      transports: [
        "websocket",
        "polling",
      ],
    }
  );


setupSockets(
  io,
  devices,
  tshark
);


// ─────────────────────────────────────────────────────────────────────────────
// Auto-start capture
// ─────────────────────────────────────────────────────────────────────────────

const AUTO_START =
  process.env.AUTO_START !== "false";


if (AUTO_START) {

  setTimeout(
    () => {

      /*
       * Don't start tshark without an interface.
       */

      if (!HOTSPOT_IFACE) {

        console.error(
          "[tshark] Windows hotspot interface not found."
        );

        console.error(
          "[tshark] Enable Windows Mobile Hotspot and restart."
        );

        io.emit(
          "captureError",
          {
            message:
              "Windows Mobile Hotspot interface not found.",
          }
        );

        return;
      }


      console.log(
        `[server] auto-starting capture on: ${HOTSPOT_IFACE}`
      );


      tshark.startCapture(

        HOTSPOT_IFACE,

        // ─────────────────────────────────────────────────────────────────────
        // Packet received
        // ─────────────────────────────────────────────────────────────────────

        (event) => {

          devices.recordPacket(
            event
          );


          /*
           * Same behavior as original server.js.
           */

          io.emit(
            "traffic",
            event
          );

          io.emit(
            "devices",
            devices.getDevices()
          );

        },


        // ─────────────────────────────────────────────────────────────────────
        // tshark error
        // ─────────────────────────────────────────────────────────────────────

        (errMsg) => {

          console.error(
            `[tshark] auto-start error: ${errMsg}`
          );

          io.emit(
            "captureError",
            {
              message: errMsg,
            }
          );

        }

      );

    },

    1000
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Start HTTP server
// ─────────────────────────────────────────────────────────────────────────────

server.listen(
  PORT,
  () => {

    console.log(
      `[server] listening on http://localhost:${PORT}`
    );

  }
);


// ─────────────────────────────────────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);


function shutdown() {

  console.log(
    "\n[server] shutting down..."
  );

  tshark.stopCapture();

  server.close(
    () => process.exit(0)
  );
}