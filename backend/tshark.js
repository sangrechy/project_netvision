/**
 * tshark.js — NetVision V1 (improved)
 *
 * Spawns and manages the tshark process in EK (Elasticsearch/NDJSON) mode.
 * Each stdout line is one JSON object. We parse lines and forward to the parser.
 *
 * Fields requested cover:
 *   - IP src/dst, length, protocol
 *   - Frame timestamp and protocol stack
 *   - TLS SNI, record type/version/length, app-data hex
 *   - DNS query name, response A/AAAA records, flags
 *   - HTTP method, uri, host, response code, content-type
 *   - QUIC payload
 *   - DHCP message type
 *   - Raw data hex
 */

const { spawn } = require("child_process");
const { parsePacket } = require("./parser");

let tsharkProc = null;

const TSHARK_FIELDS = [
  "frame.time_epoch",
  "frame.protocols",
  "ip.src",
  "ip.dst",
  "ip.proto",
  "ip.len",
  // TLS
  "tls.handshake.extensions_server_name",
  "tls.record.content_type",
  "tls.record.version",
  "tls.record.length",
  // DNS
  "dns.qry.name",
  "dns.qry.type",
  "dns.flags.response",
  "dns.a",
  "dns.aaaa",
  // HTTP
  "http.host",
  "http.request.method",
  "http.request.uri",
  "http.response.code",
  "http.content_type",
  // QUIC
  "quic.payload",
  // DHCP
  "dhcp.option.dhcp",
  // Raw
  "data.data",
];

function buildArgs(iface) {
  const args = [
    "-i", iface,
    "-T", "ek",           // NDJSON, one object per line
    "-l",                 // line-buffer stdout
    "-n",                 // no name resolution (we handle DNS ourselves)
    "--no-promiscuous-mode", // passive — stay in managed mode
  ];
  for (const field of TSHARK_FIELDS) {
    args.push("-e", field);
  }
  return args;
}

function startCapture(iface, onPacket, onError) {
  if (tsharkProc) stopCapture();

  const args = buildArgs(iface);
  console.log(`[tshark] spawn: tshark ${args.join(" ")}`);

  tsharkProc = spawn("tshark", args, { stdio: ["ignore", "pipe", "pipe"] });

  let buf = "";

  tsharkProc.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      const t = line.trim();
      if (!t || !t.startsWith("{")) continue;
      try {
        const raw   = JSON.parse(t);
        const event = parsePacket(raw);
        if (event) onPacket(event);
      } catch (_) {
        // malformed JSON — ignore
      }
    }
  });

  tsharkProc.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    // tshark prints startup info to stderr — only surface errors
    if (/error|permission|denied|failed|cannot/i.test(msg)) {
      onError(msg);
    }
  });

  tsharkProc.on("close", (code) => {
    tsharkProc = null;
    if (code !== 0 && code !== null) {
      onError(`tshark exited with code ${code}`);
    }
  });

  tsharkProc.on("error", (err) => {
    tsharkProc = null;
    onError(`Failed to start tshark: ${err.message}. Is it installed?`);
  });
}

function stopCapture() {
  if (tsharkProc) {
    tsharkProc.kill("SIGTERM");
    tsharkProc = null;
  }
}

function isRunning() {
  return tsharkProc !== null;
}

module.exports = { startCapture, stopCapture, isRunning };
