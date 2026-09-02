/**
 * wi_devices.js — NetVision V1
 *
 * Windows version of the original device tracker.
 *
 * Windows Mobile Hotspot:
 *   Gateway  : 192.168.137.1
 *   Clients  : 192.168.137.x
 */

const { execSync } = require("child_process");

const {
  HOTSPOT_SUBNET,
} = require("./wi_parser");


// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const HOTSPOT_GATEWAY =
  "192.168.137.1";

const HOTSPOT_BROADCAST =
  "192.168.137.255";


// ─────────────────────────────────────────────────────────────────────────────
// OUI database
// ─────────────────────────────────────────────────────────────────────────────

let OUI_DB = {};

try {
  OUI_DB =
    require("./oui").OUI_DB ||
    require("./oui");
} catch (_) {
  OUI_DB = {};
}


// ─────────────────────────────────────────────────────────────────────────────
// Device registry
// ─────────────────────────────────────────────────────────────────────────────

const registry =
  new Map();

const ONLINE_THRESHOLD_MS =
  30_000;

const EXPIRE_THRESHOLD_MS =
  300_000;


// ─────────────────────────────────────────────────────────────────────────────
// MAC normalization
// ─────────────────────────────────────────────────────────────────────────────

function normalizeMac(mac) {

  if (!mac) {
    return null;
  }

  return mac
    .trim()
    .toLowerCase()
    .replace(/-/g, ":");
}


// ─────────────────────────────────────────────────────────────────────────────
// OUI lookup
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
   * Phones frequently use randomized
   * Wi-Fi MAC addresses.
   */

  const firstByte =
    parseInt(
      mac.split(":")[0],
      16
    );


  if (
    !isNaN(firstByte) &&
    (firstByte & 0x02)
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
// Device icon
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
// Device name
// ─────────────────────────────────────────────────────────────────────────────

function buildName(
  mac,
  hostname,
  vendor,
  type
) {

  if (
    hostname &&
    hostname !== "*" &&
    hostname.length > 1
  ) {

    return hostname;
  }


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


  if (
    vendor === "Randomised MAC"
  ) {

    return "Mobile Device";
  }


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
// Hostname
// ─────────────────────────────────────────────────────────────────────────────
//
// Windows version intentionally does not perform nslookup.
// Windows Mobile Hotspot clients generally do not provide useful
// reverse-DNS information.
//
// The original Linux lease-file approach is not applicable here.
// ─────────────────────────────────────────────────────────────────────────────

const hostnameCache =
  new Map();


function getHostname(ip) {
  return null;
}


// ─────────────────────────────────────────────────────────────────────────────
// Check whether an IP is a valid hotspot client
// ─────────────────────────────────────────────────────────────────────────────

function isHotspotClient(ip) {

  if (!ip) {
    return false;
  }


  if (
    !ip.startsWith(
      HOTSPOT_SUBNET
    )
  ) {
    return false;
  }


  /*
   * Do not treat the Windows hotspot
   * gateway as a client.
   */

  if (
    ip === HOTSPOT_GATEWAY
  ) {
    return false;
  }


  /*
   * Do not treat broadcast as a client.
   */

  if (
    ip === HOTSPOT_BROADCAST
  ) {
    return false;
  }


  return true;
}


// ─────────────────────────────────────────────────────────────────────────────
// Read Windows ARP table
// ─────────────────────────────────────────────────────────────────────────────

function readArpTable() {

  const devices = [];


  try {

    const output =
      execSync(
        "arp -a",
        {
          timeout: 5000,
          encoding: "utf8",
          windowsHide: true,
        }
      );


    let currentInterface =
      null;


    for (
      const rawLine
      of output.split(/\r?\n/)
    ) {

      const line =
        rawLine.trim();


      if (!line) {
        continue;
      }


      /*
       * Example:
       *
       * Interface: 192.168.137.1 --- 0x12
       */

      const interfaceMatch =
        line.match(
          /^Interface:\s+(\d+\.\d+\.\d+\.\d+)/
        );


      if (interfaceMatch) {

        currentInterface =
          interfaceMatch[1];

        continue;
      }


      /*
       * Example:
       *
       * 192.168.137.165
       * ca-1b-55-e0-ff-18
       * static
       */

      const match =
        line.match(
          /^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})\s+(\w+)$/i
        );


      if (!match) {
        continue;
      }


      const ip =
        match[1];


      const mac =
        normalizeMac(
          match[2]
        );


      const state =
        match[3].toUpperCase();


      /*
       * Only Windows Mobile Hotspot
       * clients.
       */

      if (
        !isHotspotClient(ip)
      ) {
        continue;
      }


      if (!mac) {
        continue;
      }


      /*
       * Ignore invalid ARP entries.
       */

      if (
        state === "INVALID"
      ) {
        continue;
      }


      devices.push({

        ip,

        mac,

        state,

        interfaceIp:
          currentInterface,

      });
    }


  } catch (err) {

    console.error(
      `[devices] Windows ARP error: ${err.message}`
    );
  }


  return devices;
}


// ─────────────────────────────────────────────────────────────────────────────
// Refresh device registry
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

    /*
     * Extra safety check.
     */

    if (
      !isHotspotClient(ip)
    ) {
      continue;
    }


    const existing =
      registry.get(ip);


    const hostname =
      existing?.hostname ||
      getHostname(ip);


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

        lastSeen:
          existing?.lastSeen ||
          now,

        online: true,

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


  // ───────────────────────────────────────────────────────────────────────────
  // Offline / expired devices
  // ───────────────────────────────────────────────────────────────────────────

  for (
    const [ip, device]
    of registry.entries()
  ) {

    /*
     * Remove anything that isn't a valid
     * Windows hotspot client.
     */

    if (
      !isHotspotClient(ip)
    ) {

      registry.delete(ip);

      hostnameCache.delete(ip);

      continue;
    }


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
// Record packet
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
  } = event;


  if (
    !srcIp ||
    !dstIp
  ) {
    return;
  }


  const now =
    Date.now();


  /*
   * Determine which IP belongs
   * to the hotspot client.
   */

  const clientIp =
    isHotspotClient(srcIp)
      ? srcIp
      : isHotspotClient(dstIp)
        ? dstIp
        : null;


  /*
   * Packet is not associated with
   * a real hotspot client.
   */

  if (!clientIp) {
    return;
  }


  const amount =
    parseInt(
      bytes,
      10
    ) || 0;


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
  // New device discovered from packet
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
   * ARP refresh will populate
   * MAC/vendor information.
   */

  setTimeout(
    refreshDevices,
    500
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Get devices
// ─────────────────────────────────────────────────────────────────────────────

function getDevices() {

  return [
    ...registry.values()
  ].sort(
    (a, b) => {

      /*
       * Online devices first.
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
       * Highest traffic first.
       */

      return (
        b.bytes -
        a.bytes
      );
    }
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Periodic ARP refresh
// ─────────────────────────────────────────────────────────────────────────────

setInterval(
  refreshDevices,
  15_000
);


// Initial scan
refreshDevices();


// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

  getDevices,

  recordPacket,

  refreshDevices,

};