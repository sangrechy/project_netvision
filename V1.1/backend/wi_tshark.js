/**
 * wi_tshark.js — NetVision V1
 *
 * Windows version.
 *
 * Windows adapter name:
 *   Local Area Connection* 2
 *
 * tshark/Npcap interface:
 *   6. \Device\NPF_{...} (Local Area Connection* 2)
 *
 * This file automatically maps the Windows adapter name
 * to the tshark interface number.
 */

const { spawn, execFileSync } = require("child_process");

const { parsePacket } =
  require("./wi_parser");

let tsharkProc = null;


// ─────────────────────────────────────────────────────────────────────────────
// tshark executable
// ─────────────────────────────────────────────────────────────────────────────

function getTsharkExecutable() {

  if (process.env.TSHARK_PATH) {
    return process.env.TSHARK_PATH;
  }


  if (process.platform === "win32") {

    const paths = [
      "C:\\Program Files\\Wireshark\\tshark.exe",
      "C:\\Program Files (x86)\\Wireshark\\tshark.exe",
    ];


    for (const file of paths) {

      try {

        execFileSync(
          file,
          ["--version"],
          {
            stdio: "ignore",
            windowsHide: true,
          }
        );

        return file;

      } catch (_) {}
    }


    return "tshark.exe";
  }


  return "tshark";
}


// ─────────────────────────────────────────────────────────────────────────────
// List tshark interfaces
// ─────────────────────────────────────────────────────────────────────────────

function listInterfaces() {

  const executable =
    getTsharkExecutable();


  try {

    const output =
      execFileSync(
        executable,
        ["-D"],
        {
          encoding: "utf8",
          windowsHide: true,
          timeout: 10000,
        }
      );


    const result = [];


    for (
      const line
      of output.split(/\r?\n/)
    ) {

      const text =
        line.trim();


      if (!text) {
        continue;
      }


      /*
       * Example:
       *
       * 6. \Device\NPF\_{...} (Local Area Connection* 2)
       */

      const match =
        text.match(
          /^(\d+)\.\s+(.+)$/
        );


      if (!match) {
        continue;
      }


      result.push({

        id:
          match[1],

        name:
          match[2],

        raw:
          text,

      });
    }


    return result;

  } catch (err) {

    console.error(
      `[tshark] unable to list interfaces: ${err.message}`
    );

    return [];
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Convert Windows adapter name → tshark interface number
// ─────────────────────────────────────────────────────────────────────────────

function resolveInterface(iface) {

  /*
   * If the caller already supplied a number,
   * don't change it.
   */

  if (
    /^\d+$/.test(
      String(iface)
    )
  ) {
    return String(iface);
  }


  const interfaces =
    listInterfaces();


  if (!interfaces.length) {

    throw new Error(
      "No tshark interfaces found."
    );
  }


  const target =
    String(iface || "")
      .trim()
      .toLowerCase();


  /*
   * Match:
   *
   * Local Area Connection* 2
   *
   * against:
   *
   * \Device\NPF_{...} (Local Area Connection* 2)
   */

  let match =
    interfaces.find(
      (item) => {

        const name =
          String(
            item.name || ""
          ).toLowerCase();


        return (
          name.endsWith(
            `(${target})`
          ) ||
          name.includes(
            `(${target})`
          )
        );
      }
    );


  /*
   * Fallback: contains match.
   */

  if (!match) {

    match =
      interfaces.find(
        (item) => {

          const name =
            String(
              item.name || ""
            ).toLowerCase();


          return (
            target &&
            name.includes(target)
          );
        }
      );
  }


  if (!match) {

    throw new Error(
      `Could not map Windows interface "${iface}" to a tshark interface.`
    );
  }


  console.log(
    `[tshark] Windows interface mapped: ${iface} -> ${match.id}`
  );


  return match.id;
}


// ─────────────────────────────────────────────────────────────────────────────
// tshark fields
// ─────────────────────────────────────────────────────────────────────────────

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


  // Raw data

  "data.data",
];


// ─────────────────────────────────────────────────────────────────────────────
// Build tshark command
// ─────────────────────────────────────────────────────────────────────────────

function buildArgs(iface) {

  const args = [

    "-i",
    String(iface),

    "-T",
    "ek",

    "-l",

    "-n",

    "--no-promiscuous-mode",

  ];


  for (
    const field
    of TSHARK_FIELDS
  ) {

    args.push(
      "-e",
      field
    );
  }


  return args;
}


// ─────────────────────────────────────────────────────────────────────────────
// Start capture
// ─────────────────────────────────────────────────────────────────────────────

function startCapture(
  iface,
  onPacket,
  onError
) {

  /*
   * Stop existing tshark.
   */

  if (tsharkProc) {
    stopCapture();
  }


  const executable =
    getTsharkExecutable();


  let captureInterface =
    iface;


  // ───────────────────────────────────────────────────────────────────────────
  // WINDOWS
  // ───────────────────────────────────────────────────────────────────────────

  if (
    process.platform === "win32"
  ) {

    try {

      captureInterface =
        resolveInterface(
          iface
        );

    } catch (err) {

      onError(
        err.message
      );

      return;
    }
  }


  const args =
    buildArgs(
      captureInterface
    );


  console.log(
    `[tshark] executable: ${executable}`
  );


  console.log(
    `[tshark] spawn: tshark ${args.join(" ")}`
  );


  try {

    tsharkProc =
      spawn(
        executable,
        args,
        {
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],

          windowsHide: true,
        }
      );

  } catch (err) {

    tsharkProc = null;

    onError(
      `Failed to start tshark: ${err.message}`
    );

    return;
  }


  // ───────────────────────────────────────────────────────────────────────────
  // stdout
  // ───────────────────────────────────────────────────────────────────────────

  let buffer = "";


  tsharkProc.stdout.on(
    "data",
    (chunk) => {

      buffer +=
        chunk.toString();


      const lines =
        buffer.split("\n");


      buffer =
        lines.pop();


      for (
        const line
        of lines
      ) {

        const text =
          line.trim();


        if (!text) {
          continue;
        }


        if (
          !text.startsWith("{")
        ) {
          continue;
        }


        try {

          const raw =
            JSON.parse(text);


          const event =
            parsePacket(raw);


          if (event) {

            onPacket(
              event
            );
          }

        } catch (_) {

          /*
           * Ignore malformed
           * packet lines.
           */

        }
      }
    }
  );


  // ───────────────────────────────────────────────────────────────────────────
  // stderr
  // ───────────────────────────────────────────────────────────────────────────

  tsharkProc.stderr.on(
    "data",
    (chunk) => {

      const message =
        chunk
          .toString()
          .trim();


      if (!message) {
        return;
      }


      /*
       * tshark may print normal information
       * here, so only report actual errors.
       */

      if (
        /error|permission|denied|failed|cannot|unable/i
          .test(message)
      ) {

        console.error(
          `[tshark] ${message}`
        );

        onError(
          message
        );
      }
    }
  );


  // ───────────────────────────────────────────────────────────────────────────
  // Process error
  // ───────────────────────────────────────────────────────────────────────────

  tsharkProc.on(
    "error",
    (err) => {

      tsharkProc = null;

      onError(
        `tshark process error: ${err.message}`
      );
    }
  );


  // ───────────────────────────────────────────────────────────────────────────
  // Process close
  // ───────────────────────────────────────────────────────────────────────────

  tsharkProc.on(
    "close",
    (code) => {

      tsharkProc = null;


      if (
        code !== 0 &&
        code !== null
      ) {

        onError(
          `tshark exited with code ${code}`
        );
      }
    }
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Stop capture
// ─────────────────────────────────────────────────────────────────────────────

function stopCapture() {

  if (!tsharkProc) {
    return;
  }


  try {

    if (
      process.platform === "win32"
    ) {

      execFileSync(
        "taskkill",
        [
          "/PID",
          String(
            tsharkProc.pid
          ),
          "/T",
          "/F",
        ],
        {
          stdio: "ignore",
          windowsHide: true,
        }
      );

    } else {

      tsharkProc.kill(
        "SIGTERM"
      );
    }

  } catch (_) {

    /*
     * Process may already
     * have exited.
     */

  }


  tsharkProc =
    null;
}


// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

function isRunning() {
  return tsharkProc !== null;
}


// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  startCapture,

  stopCapture,

  isRunning,

  listInterfaces,

  getTsharkExecutable,

};