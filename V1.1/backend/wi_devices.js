/**
 * wi_devices.js — NetVision V1
 *
 * Windows port of the original NetVision devices.js.
 *
 * Original logic preserved:
 *   1. ARP table
 *   2. DHCP hostname information
 *   3. MAC OUI vendor/type lookup
 *   4. Packet traffic statistics
 *
 * Windows replacements:
 *   Linux: ip neigh show
 *   Windows: arp -a
 *
 *   Linux DHCP lease files are not assumed to exist on Windows.
 *   Windows hostname resolution uses `ping -a` as a fallback.
 *
 * Device record:
 *   {
 *     ip,
 *     mac,
 *     name,
 *     vendor,
 *     type,
 *     hostname,
 *     lastSeen,
 *     online,
 *     bytesUp,
 *     bytesDown,
 *     bytes
 *   }
 */

const { execSync } = require("child_process");

const { HOTSPOT_SUBNET } =
  require("./wi_parser");


// ─────────────────────────────────────────────────────────────────────────────
// OUI DATABASE
// ─────────────────────────────────────────────────────────────────────────────

let OUI_DB = {};

try {
  OUI_DB =
    require("./wi_oui").OUI_DB ||
    require("./wi_oui");
} catch (_) {
  /*
   * Keep working even if OUI database
   * is unavailable.
   */
}


// ─────────────────────────────────────────────────────────────────────────────
// DEVICE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

const registry =
  new Map();


const ONLINE_THRESHOLD_MS =
  30_000;


const EXPIRE_THRESHOLD_MS =
  300_000;


// ─────────────────────────────────────────────────────────────────────────────
// OUI LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

function lookupOui(mac) {

  if (
    !mac ||
    mac.startsWith("??")
  ) {

    return {
      vendor: "Unknown",
      type: "unknown",
    };
  }


  const key =
    mac
      .substring(0, 8)
      .toLowerCase();


  if (OUI_DB[key]) {
    return OUI_DB[key];
  }


  /*
   * Locally administered MAC.
   *
   * This is commonly used by phones
   * for randomized Wi-Fi addresses.
   */

  const firstByte =
    parseInt(
      mac.split(":")[0],
      16
    );


  if (
    firstByte & 0x02
  ) {

    return {
      vendor: "Randomised MAC",
      type: "phone",
    };
  }


  return {
    vendor: "Unknown",
    type: "unknown",
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// ICON
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_ICON = {

  phone: "📱",

  laptop: "💻",

  tablet: "📲",

  router: "📡",

  iot: "🔌",

  pc: "🖥",

  tv: "📺",

  unknown: "📡",

};


function iconForType(type) {

  return (
    TYPE_ICON[type] ||
    "📡"
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FRIENDLY DEVICE NAME
// ─────────────────────────────────────────────────────────────────────────────

function buildName(
  mac,
  hostname,
  vendor,
  type
) {

  /*
   * First priority:
   * hostname.
   */

  if (
    hostname &&
    hostname !== "*" &&
    hostname.length > 1
  ) {

    return hostname;
  }


  /*
   * Second priority:
   * vendor + type.
   */

  if (
    vendor &&
    vendor !== "Unknown" &&
    vendor !== "Randomised MAC"
  ) {

    const typeLabel =
      type === "phone"
        ? "Phone"
        : type === "laptop"
          ? "Laptop"
          : type === "tablet"
            ? "Tablet"
            : type === "pc"
              ? "PC"
              : type === "tv"
                ? "TV"
                : "";


    return typeLabel
      ? `${vendor} ${typeLabel}`
      : vendor;
  }


  /*
   * Randomized phone MAC.
   */

  if (
    vendor === "Randomised MAC"
  ) {

    return "Mobile Device";
  }


  /*
   * Last resort:
   * MAC tail.
   */

  if (
    mac &&
    !mac.startsWith("??")
  ) {

    const tail =
      mac
        .replace(/:/g, "")
        .slice(-6)
        .toUpperCase();


    return `Device ${tail}`;
  }


  return "Unknown Device";
}


// ─────────────────────────────────────────────────────────────────────────────
// WINDOWS ARP TABLE
// ─────────────────────────────────────────────────────────────────────────────
//
// Windows:
//
//   arp -a
//
// Example:
//
// Interface: 192.168.137.1 --- 0x12
//   Internet Address      Physical Address      Type
//   192.168.137.63       32-c0-4e-99-91-f4     static
//
// ─────────────────────────────────────────────────────────────────────────────

function readArpTable() {

  const devices = [];


  try {

    const output =
      execSync(
        "arp -a",
        {
          timeout: 3000,
          encoding: "utf-8",
          windowsHide: true,
        }
      );


    let currentInterface =
      null;


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
       * Detect ARP interface.
       *
       * Interface: 192.168.137.1 --- 0x12
       */

      const interfaceMatch =
        text.match(
          /^Interface:\s+(\d+\.\d+\.\d+\.\d+)/
        );


      if (interfaceMatch) {

        currentInterface =
          interfaceMatch[1];

        continue;
      }


      /*
       * Windows ARP entry:
       *
       * 192.168.137.63
       * 32-c0-4e-99-91-f4
       * static
       */

      const match =
        text.match(
          /^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})\s+(\w+)$/i
        );


      if (!match) {
        continue;
      }


      const ip =
        match[1];


      const mac =
        match[2]
          .replace(/-/g, ":")
          .toLowerCase();


      const state =
        match[3];


      /*
       * Same subnet logic as original.
       */

      if (
        ip.startsWith(
          HOTSPOT_SUBNET
        )
      ) {

        devices.push({

          ip,

          mac,

          state:
            state.toUpperCase(),

          interfaceIp:
            currentInterface,

        });
      }
    }

  } catch (err) {

    console.error(
      `[devices] arp -a failed: ${err.message}`
    );
  }


  return devices;
}


// ─────────────────────────────────────────────────────────────────────────────
// WINDOWS HOSTNAME RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
//
// Linux original used DHCP lease files.
//
// Windows Mobile Hotspot does not expose those Linux lease files,
// so use:
//
//     ping -a <IP>
//
// as the Windows equivalent fallback.
//
// ─────────────────────────────────────────────────────────────────────────────

const hostnameCache =
  new Map();


function resolveWindowsHostname(ip) {

  if (
    hostnameCache.has(ip)
  ) {

    return hostnameCache.get(ip);
  }


  try {

    const output =
      execSync(
        `ping -a -n 1 -w 500 "${ip}"`,
        {
          timeout: 1500,
          encoding: "utf-8",
          windowsHide: true,
        }
      );


    /*
     * English Windows:
     *
     * Pinging DEVICE-NAME [192.168.137.63]
     *
     * Also handle localized output by
     * looking for the [IP] pattern.
     */

    const match =
      output.match(
        /Pinging\s+([^\s\[]+)\s+\[/i
      );


    if (
      match &&
      match[1] &&
      match[1] !== ip
    ) {

      const hostname =
        match[1].trim();


      hostnameCache.set(
        ip,
        hostname
      );


      return hostname;
    }

  } catch (_) {

    /*
     * Host may not answer ping.
     */
  }


  hostnameCache.set(
    ip,
    null
  );


  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// REFRESH DEVICE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

function refreshDevices() {

  const arpDevices =
    readArpTable();


  const now =
    Date.now();


  for (
    const {
      ip,
      mac,
      state,
    }
    of arpDevices
  ) {

    const existing =
      registry.get(ip);


    /*
     * Windows hostname.
     *
     * Existing hostname is preferred
     * so we don't repeatedly resolve it.
     */

    const hostname =
      existing?.hostname ||
      resolveWindowsHostname(ip);


    const {
      vendor,
      type,
    } =
      lookupOui(mac);


    const name =
      buildName(
        mac,
        hostname,
        vendor,
        type
      );


    registry.set(
      ip,
      {

        ip,

        mac,

        name,

        hostname:
          hostname ||
          existing?.hostname ||
          null,

        vendor,

        type,

        icon:
          iconForType(type),

        state,

        /*
         * Preserve packet timestamp.
         */

        lastSeen:
          existing?.lastSeen ||
          now,

        online:
          true,

        bytesUp:
          existing?.bytesUp ||
          0,

        bytesDown:
          existing?.bytesDown ||
          0,

        bytes:
          existing?.bytes ||
          0,

      }
    );
  }


  /*
   * Mark offline / expire.
   *
   * Same behavior as original.
   */

  for (
    const [
      ip,
      device
    ]
    of registry.entries()
  ) {

    const age =
      now -
      device.lastSeen;


    if (
      age >
      EXPIRE_THRESHOLD_MS
    ) {

      registry.delete(ip);

      hostnameCache.delete(ip);

    } else {

      device.online =
        age <
        ONLINE_THRESHOLD_MS;
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// RECORD PACKET TRAFFIC
// ─────────────────────────────────────────────────────────────────────────────

function recordPacket(event) {

  if (!event) {
    return;
  }


  const {
    srcIp,
    dstIp,
    bytes,
    direction,
  } =
    event;


  if (
    !srcIp ||
    !dstIp
  ) {

    return;
  }


  const now =
    Date.now();


  /*
   * Same logic as original:
   *
   * If source belongs to hotspot subnet,
   * source is the client.
   *
   * Otherwise destination is the client.
   */

  const clientIp =
    srcIp.startsWith(
      HOTSPOT_SUBNET
    )
      ? srcIp
      : dstIp;


  if (
    !clientIp ||
    !clientIp.startsWith(
      HOTSPOT_SUBNET
    )
  ) {

    return;
  }


  const amount =
    Number(bytes) ||
    0;


  const device =
    registry.get(
      clientIp
    );


  // ───────────────────────────────────────────────────────────────────────────
  // Existing device
  // ───────────────────────────────────────────────────────────────────────────

  if (device) {

    device.lastSeen =
      now;

    device.online =
      true;

    device.bytes +=
      amount;


    if (
      direction === "↑"
    ) {

      device.bytesUp +=
        amount;

    } else {

      device.bytesDown +=
        amount;
    }


    return;
  }


  // ───────────────────────────────────────────────────────────────────────────
  // New device from packet
  // ───────────────────────────────────────────────────────────────────────────

  registry.set(
    clientIp,
    {

      ip:
        clientIp,

      mac:
        "??:??:??:??:??:??",

      name:
        `Device ${clientIp.split(".").pop()}`,

      hostname:
        null,

      vendor:
        "Unknown",

      type:
        "unknown",

      icon:
        "📡",

      state:
        "REACHABLE",

      lastSeen:
        now,

      online:
        true,

      bytesUp:
        direction === "↑"
          ? amount
          : 0,

      bytesDown:
        direction === "↓"
          ? amount
          : 0,

      bytes:
        amount,

    }
  );


  /*
   * Quickly refresh ARP so the
   * placeholder can get its MAC/vendor.
   */

  setTimeout(
    refreshDevices,
    800
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// GET DEVICES
// ─────────────────────────────────────────────────────────────────────────────

function getDevices() {

  return [
    ...registry.values()
  ].sort(
    (a, b) => {

      /*
       * Online first.
       */

      if (
        a.online !==
        b.online
      ) {

        return a.online
          ? -1
          : 1;
      }


      /*
       * Then traffic volume.
       */

      return (
        b.bytes -
        a.bytes
      );
    }
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// PERIODIC REFRESH
// ─────────────────────────────────────────────────────────────────────────────

setInterval(
  refreshDevices,
  15_000
);


// Initial scan
refreshDevices();


// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  getDevices,

  recordPacket,

  refreshDevices,

};