/**
 * tshark.js — NetVision V2
 * Cross-platform packet capture manager with auto-detection and mock fallback.
 */

const { spawn, execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { isWin, isLinux } = require("./os-adapter");
const mockGenerator = require("./mock-generator");

let tsharkProcess = null;
let currentMode = "idle"; // "tshark" | "mock" | "idle"
let currentIface = null;
let currentSubnet = "192.168.137.";
let onPacketCallback = null;
let onDeviceSeedCallback = null;

function findTsharkPath() {
  if (process.env.TSHARK_PATH && fs.existsSync(process.env.TSHARK_PATH)) {
    return process.env.TSHARK_PATH;
  }

  if (isWin) {
    const candidates = [
      "C:\\Program Files\\Wireshark\\tshark.exe",
      "C:\\Program Files (x86)\\Wireshark\\tshark.exe"
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    try {
      const out = execSync("where.exe tshark", { encoding: "utf8", windowsHide: true });
      const first = out.split(/\r?\n/)[0].trim();
      if (first && fs.existsSync(first)) return first;
    } catch (_) {}
  } else {
    const candidates = ["/usr/bin/tshark", "/usr/local/bin/tshark"];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    try {
      const out = execSync("which tshark", { encoding: "utf8" });
      const first = out.split(/\r?\n/)[0].trim();
      if (first && fs.existsSync(first)) return first;
    } catch (_) {}
  }

  return null;
}

function start({ iface, subnet, onPacket, onDeviceSeed, forceMock = false }) {
  stop();

  currentIface = iface;
  currentSubnet = subnet;
  onPacketCallback = onPacket;
  onDeviceSeedCallback = onDeviceSeed;

  const tsharkBin = findTsharkPath();

  if (forceMock || !tsharkBin) {
    currentMode = "mock";
    console.log(`[Tshark] ${forceMock ? "Mock mode requested" : "tshark binary not found"}. Starting mock packet generator...`);
    mockGenerator.startMockStream(subnet, (pkt) => {
      if (onPacketCallback) onPacketCallback(pkt, false);
    }, onDeviceSeedCallback);
    return { mode: "mock", binary: null, iface };
  }

  console.log(`[Tshark] Found binary at: ${tsharkBin}`);
  console.log(`[Tshark] Capturing on interface: ${iface}`);

  const args = [
    "-i", iface,
    "-l",
    "-n",
    "-T", "ek",
    "-e", "frame.time_epoch",
    "-e", "frame.len",
    "-e", "ip.version",
    "-e", "ip.src",
    "-e", "ip.dst",
    "-e", "ip.proto",
    "-e", "ipv6.src",
    "-e", "ipv6.dst",
    "-e", "tcp.srcport",
    "-e", "tcp.dstport",
    "-e", "udp.srcport",
    "-e", "udp.dstport",
    "-e", "dns.flags",
    "-e", "dns.qry.name",
    "-e", "dns.resp.name",
    "-e", "dns.a",
    "-e", "dns.aaaa",
    "-e", "tls.handshake.extensions_server_name",
    "-e", "tls.record.content_type",
    "-e", "tls.record.version",
    "-e", "quic.handshake.extensions_server_name",
    "-e", "http.host",
    "-e", "http.request.uri",
    "-e", "http.request.method"
  ];

  try {
    tsharkProcess = spawn(tsharkBin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    currentMode = "tshark";

    const rl = readline.createInterface({
      input: tsharkProcess.stdout,
      terminal: false
    });

    rl.on("line", (line) => {
      if (!line || !line.trim()) return;
      if (onPacketCallback) {
        onPacketCallback(line, true);
      }
    });

    tsharkProcess.stderr.on("data", (chunk) => {
      const msg = chunk.toString();
      // tshark prints capture info to stderr, only log unexpected errors
      if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("permission denied")) {
        console.warn(`[Tshark Stderr]: ${msg.trim()}`);
      }
    });

    tsharkProcess.on("error", (err) => {
      console.error(`[Tshark Error]: ${err.message}. Falling back to mock generator.`);
      fallbackToMock();
    });

    tsharkProcess.on("close", (code) => {
      console.log(`[Tshark] Process exited with code ${code}`);
      if (currentMode === "tshark") {
        currentMode = "idle";
      }
    });

    return { mode: "tshark", binary: tsharkBin, iface };
  } catch (err) {
    console.error(`[Tshark Spawn Exception]: ${err.message}. Falling back to mock.`);
    fallbackToMock();
    return { mode: "mock", binary: null, iface };
  }
}

function fallbackToMock() {
  currentMode = "mock";
  mockGenerator.startMockStream(currentSubnet, (pkt) => {
    if (onPacketCallback) onPacketCallback(pkt, false);
  }, onDeviceSeedCallback);
}

function stop() {
  if (tsharkProcess) {
    try {
      tsharkProcess.kill();
    } catch (_) {}
    tsharkProcess = null;
  }
  mockGenerator.stopMockStream();
  currentMode = "idle";
}

function getStatus() {
  return {
    running: currentMode !== "idle",
    mode: currentMode,
    iface: currentIface,
    subnet: currentSubnet,
    hasTsharkBinary: !!findTsharkPath()
  };
}

module.exports = {
  findTsharkPath,
  start,
  stop,
  getStatus
};
