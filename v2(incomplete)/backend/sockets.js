/**
 * sockets.js — NetVision V2
 * WebSocket hub, packet streaming, live stats aggregation, App-grouping, and recording manager.
 */

const fs = require("fs");
const path = require("path");
const parser = require("./parser");
const devices = require("./devices");
const tshark = require("./tshark");
const { getInterfaces } = require("./os-adapter");

let ioInstance = null;
let currentConfig = {
  iface: "auto",
  subnet: "192.168.137.",
  platform: process.platform
};

// Global protocol & app statistics
const stats = {
  totalPackets: 0,
  uploadBytes: 0,
  downloadBytes: 0,
  protocols: {
    DNS: 0,
    TLS: 0,
    QUIC: 0,
    HTTP: 0,
    HTTP2: 0,
    TCP: 0,
    UDP: 0,
    DHCP: 0,
    ICMP: 0,
    OTHER: 0
  },
  packetsPerSec: 0,
  bytesPerSec: 0
};

// Map<appName, { name, category, icon, color, uploadBytes, downloadBytes, totalBytes, packetCount, activeClients, lastSeen }>
const appRegistry = new Map();

// Rate tracking
let ratePktCount = 0;
let rateByteCount = 0;
let packetBatch = [];

// Recording state
let activeRecording = null;
const RECORDINGS_DIR = path.join(__dirname, "recordings");
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

function setupSockets(io, initialConfig) {
  ioInstance = io;
  currentConfig = { ...currentConfig, ...initialConfig };

  // Wire packet parser host discovery into device manager
  parser.setHostDiscoveredCallback((ip, hostname, source) => {
    devices.updateDeviceHostname(ip, hostname, source);
  });

  // Listen to device updates
  devices.on("newDevice", (dev) => {
    io.emit("device_new", dev);
  });
  devices.on("deviceUpdate", (dev) => {
    io.emit("device_update", dev);
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send initial snapshot
    socket.emit("init", {
      config: currentConfig,
      interfaces: getInterfaces(),
      status: tshark.getStatus(),
      stats,
      appStats: getSortedAppStats(),
      devices: devices.getAll()
    });

    socket.on("toggle_capture", (data) => {
      const running = data?.start ?? !tshark.getStatus().running;
      if (running) {
        startCapture(currentConfig.iface, currentConfig.subnet, data?.forceMock || false);
      } else {
        tshark.stop();
        io.emit("status_change", tshark.getStatus());
      }
    });

    socket.on("change_interface", (data) => {
      if (data && data.iface) {
        currentConfig.iface = data.iface;
        console.log(`[Socket] Switching interface to: ${data.iface}`);
        startCapture(currentConfig.iface, currentConfig.subnet);
        io.emit("config_change", currentConfig);
      }
    });

    socket.on("change_subnet", (data) => {
      if (data && data.subnet) {
        currentConfig.subnet = data.subnet;
        parser.setSubnet(data.subnet);
        devices.setSubnet(data.subnet);
        io.emit("config_change", currentConfig);
      }
    });

    socket.on("toggle_mock", (data) => {
      const forceMock = data?.forceMock ?? (tshark.getStatus().mode !== "mock");
      startCapture(currentConfig.iface, currentConfig.subnet, forceMock);
    });

    socket.on("start_recording", (data) => {
      const format = data?.format === "csv" ? "csv" : "json";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `capture_${timestamp}.${format}`;
      const filepath = path.join(RECORDINGS_DIR, filename);

      try {
        const stream = fs.createWriteStream(filepath, { flags: "a" });
        if (format === "csv") {
          stream.write("timestamp,length,srcIp,srcPort,dstIp,dstPort,protocol,app,domain,direction,clientIp,info\n");
        } else {
          stream.write("[\n");
        }

        activeRecording = {
          stream,
          filepath,
          filename,
          format,
          count: 0,
          startTime: Date.now()
        };

        io.emit("recording_status", {
          recording: true,
          filename,
          format,
          count: 0
        });
        console.log(`[Recording] Started: ${filename}`);
      } catch (err) {
        socket.emit("error", { message: `Failed to start recording: ${err.message}` });
      }
    });

    socket.on("stop_recording", () => {
      if (activeRecording) {
        if (activeRecording.format === "json") {
          activeRecording.stream.write("\n]");
        }
        activeRecording.stream.end();
        console.log(`[Recording] Stopped: ${activeRecording.filename} (${activeRecording.count} packets)`);

        io.emit("recording_status", {
          recording: false,
          filename: activeRecording.filename,
          count: activeRecording.count,
          size: fs.existsSync(activeRecording.filepath) ? fs.statSync(activeRecording.filepath).size : 0
        });
        activeRecording = null;
      }
    });

    socket.on("clear_stats", () => {
      stats.totalPackets = 0;
      stats.uploadBytes = 0;
      stats.downloadBytes = 0;
      Object.keys(stats.protocols).forEach(k => stats.protocols[k] = 0);
      appRegistry.clear();
      io.emit("stats", stats);
      io.emit("app_stats", []);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // Smooth packet batch delivery every 80ms
  setInterval(() => {
    if (packetBatch.length > 0 && ioInstance) {
      ioInstance.emit("packets", packetBatch);
      packetBatch = [];
    }
  }, 80);

  // Rate calculation, device updates, and app-group stats broadcast every 1s
  setInterval(() => {
    stats.packetsPerSec = ratePktCount;
    stats.bytesPerSec = rateByteCount;
    ratePktCount = 0;
    rateByteCount = 0;

    if (ioInstance) {
      ioInstance.emit("stats", stats);
      ioInstance.emit("devices", devices.getAll());
      ioInstance.emit("app_stats", getSortedAppStats());
    }
  }, 1000);
}

function handleIncomingPacket(raw, isRawString = true) {
  const pkt = isRawString ? parser.parsePacket(raw) : raw;
  if (!pkt) return;

  stats.totalPackets += 1;
  ratePktCount += 1;
  rateByteCount += pkt.length;

  if (pkt.direction === "upload") {
    stats.uploadBytes += pkt.length;
  } else {
    stats.downloadBytes += pkt.length;
  }

  const protoKey = stats.protocols[pkt.protocol] !== undefined ? pkt.protocol : "OTHER";
  stats.protocols[protoKey] += 1;

  // Track per-device stats (including specific app breakdown)
  if (pkt.clientIp) {
    devices.recordTraffic(pkt.clientIp, pkt.length, pkt.direction, pkt.app);
  }

  // Track global app stats (Instagram, YouTube, etc.)
  if (pkt.app && pkt.app.name) {
    trackAppTraffic(pkt.app, pkt.length, pkt.direction, pkt.clientIp);
  }

  // Record to file if active
  if (activeRecording) {
    writeToRecording(pkt);
  }

  // Queue into batch
  packetBatch.push(pkt);
  if (packetBatch.length > 100) {
    packetBatch.shift();
  }
}

function trackAppTraffic(app, length, direction, clientIp) {
  let entry = appRegistry.get(app.name);
  if (!entry) {
    entry = {
      name: app.name,
      category: app.category,
      icon: app.icon,
      color: app.color,
      uploadBytes: 0,
      downloadBytes: 0,
      totalBytes: 0,
      packetCount: 0,
      clients: new Set(),
      lastSeen: Date.now()
    };
    appRegistry.set(app.name, entry);
  }

  entry.lastSeen = Date.now();
  entry.totalBytes += length;
  entry.packetCount += 1;
  if (direction === "upload") {
    entry.uploadBytes += length;
  } else {
    entry.downloadBytes += length;
  }
  if (clientIp) {
    entry.clients.add(clientIp);
  }
}

function getSortedAppStats() {
  return Array.from(appRegistry.values())
    .map(app => ({
      ...app,
      clientCount: app.clients.size,
      clients: Array.from(app.clients)
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes); // sorted by usage volume descending
}

function writeToRecording(pkt) {
  if (!activeRecording) return;
  activeRecording.count += 1;

  if (activeRecording.format === "csv") {
    const safeDomain = (pkt.domain || "").replace(/,/g, ";");
    const safeApp = (pkt.app?.name || "").replace(/,/g, ";");
    const safeInfo = (pkt.info || "").replace(/,/g, ";");
    const line = `${pkt.timestamp},${pkt.length},${pkt.srcIp},${pkt.srcPort || ""},${pkt.dstIp},${pkt.dstPort || ""},${pkt.protocol},${safeApp},${safeDomain},${pkt.direction},${pkt.clientIp || ""},"${safeInfo}"\n`;
    activeRecording.stream.write(line);
  } else {
    const prefix = activeRecording.count === 1 ? "" : ",\n";
    activeRecording.stream.write(prefix + JSON.stringify(pkt));
  }
}

function startCapture(iface, subnet, forceMock = false) {
  parser.setSubnet(subnet);
  devices.setSubnet(subnet);

  tshark.start({
    iface,
    subnet,
    forceMock,
    onPacket: (raw, isRawString) => {
      handleIncomingPacket(raw, isRawString);
    },
    onDeviceSeed: (dev) => {
      devices.recordTraffic(dev.ip, dev.uploadBytes + dev.downloadBytes, "download");
    }
  });

  if (ioInstance) {
    ioInstance.emit("status_change", tshark.getStatus());
  }
}

module.exports = {
  setupSockets,
  startCapture,
  getStats: () => stats
};
