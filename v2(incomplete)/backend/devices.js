/**
 * devices.js — NetVision V2
 * Advanced Multi-Tier Device & Hostname Discovery for Windows & Linux.
 *
 * Hostname Resolution Tiers:
 *   1. Packet-level DHCP Option 12 & mDNS (.local) query snooping
 *   2. System DHCP leases (/var/lib/NetworkManager/dnsmasq-*.leases)
 *   3. Windows NetBIOS adapter query (nbtstat -A) & ping -a
 *   4. Reverse DNS PTR lookups (Resolve-DnsName / getent hosts / dns.reverse)
 *   5. MAC OUI Vendor signature & private MAC detection
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { isWin, isLinux, isClientIp } = require("./os-adapter");

let OUI_DB = {};
try {
  OUI_DB = require("./oui").OUI_DB || require("./oui");
} catch (_) {
  OUI_DB = {};
}

// Map<ip, Device>
const registry = new Map();

let currentSubnet = "192.168.137.";
let isScanning = false;
let listeners = {
  newDevice: [],
  deviceUpdate: []
};

const TYPE_ICONS = {
  phone: "📱",
  laptop: "💻",
  tablet: "📲",
  router: "📡",
  iot: "🔌",
  pc: "🖥️",
  tv: "📺",
  unknown: "📶"
};

function normalizeMac(mac) {
  if (!mac) return null;
  const clean = mac.replace(/[:-]/g, "").toLowerCase();
  if (clean.length !== 12) return null;
  return clean.match(/.{1,2}/g).join(":");
}

function lookupVendor(mac) {
  if (!mac) return { vendor: "Unknown", type: "unknown" };
  const prefix = mac.substring(0, 8).toLowerCase();
  if (OUI_DB[prefix]) {
    return OUI_DB[prefix];
  }

  // Check locally administered (randomized MAC)
  const firstByte = parseInt(mac.split(":")[0], 16);
  if (!isNaN(firstByte) && (firstByte & 0x02)) {
    return { vendor: "Randomized MAC (Private)", type: "phone" };
  }

  return { vendor: "Unknown Vendor", type: "unknown" };
}

function buildDeviceName(hostname, vendor, type, ip) {
  if (hostname && hostname !== "*" && hostname !== "Unknown" && hostname.length > 1) {
    // Clean up common suffix
    return hostname.replace(/\.local$/i, "").replace(/\.lan$/i, "");
  }
  if (vendor && vendor !== "Unknown Vendor" && !vendor.includes("Randomized")) {
    const label = type === "phone" ? "Smartphone" : type === "laptop" ? "Laptop" : "Device";
    return `${vendor} ${label}`;
  }
  if (vendor && vendor.includes("Randomized")) {
    return `Private Client (${ip.split(".").pop()})`;
  }
  return `Host-${ip.split(".").pop()}`;
}

/**
 * Multi-Tier Hostname Resolver
 */
function resolveAllHostnameWays(ip, currentDevice) {
  if (!ip) return;

  // 1. Windows: Try NetBIOS (nbtstat -A) + Reverse DNS + ping -a
  if (isWin) {
    // NetBIOS query
    exec(`nbtstat -A ${ip}`, { timeout: 1500, windowsHide: true }, (nbErr, nbOut) => {
      if (!nbErr && nbOut) {
        const lines = nbOut.split(/\r?\n/);
        for (const line of lines) {
          const m = line.trim().match(/^([A-Za-z0-9_-]+)\s+<00>\s+UNIQUE/i);
          if (m && m[1] && !m[1].startsWith("__MSBROWSE__")) {
            updateDeviceHostname(ip, m[1].trim(), "NetBIOS");
            return;
          }
        }
      }

      // Fallback: PowerShell Resolve-DnsName PTR or ping -a
      exec(`powershell -NoProfile -NonInteractive -Command "try { (Resolve-DnsName ${ip} -Type PTR -ErrorAction Stop).NameHost } catch { (ping -a -n 1 -w 250 ${ip} | Select-String 'Pinging') -replace '^.*Pinging\\s+','' -replace '\\s+\\[.*$','' }"`, { timeout: 1500, windowsHide: true }, (err, stdout) => {
        if (!err && stdout && stdout.trim() && !stdout.includes("error")) {
          const candidate = stdout.trim();
          if (candidate && candidate !== ip) {
            updateDeviceHostname(ip, candidate, "DNS-PTR");
          }
        }
      });
    });
  }

  // 2. Linux: getent hosts / host command / local dns reverse
  if (isLinux) {
    exec(`getent hosts ${ip} | awk '{print $2}'`, { timeout: 1500 }, (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        updateDeviceHostname(ip, stdout.trim(), "getent");
        return;
      }

      exec(`host ${ip} 10.42.0.1 2>/dev/null | grep "domain name pointer" | awk '{print $NF}' | sed 's/\\.$//'`, { timeout: 1500 }, (hErr, hOut) => {
        if (!hErr && hOut && hOut.trim()) {
          updateDeviceHostname(ip, hOut.trim(), "DNS-Host");
        }
      });
    });
  }

  // 3. Node.js built-in reverse DNS lookup
  dns.reverse(ip, (err, hostnames) => {
    if (!err && hostnames && hostnames.length > 0) {
      updateDeviceHostname(ip, hostnames[0], "Node-DNS");
    }
  });
}

function updateDeviceHostname(ip, newHostname, source = "auto") {
  if (!ip || !newHostname) return;
  const cleanHost = newHostname.replace(/\.local$/i, "").replace(/\.lan$/i, "").trim();
  if (!cleanHost || cleanHost === ip || cleanHost === "*" || cleanHost.length <= 1) return;

  const dev = registry.get(ip);
  if (dev) {
    if (!dev.hostname || dev.hostname.startsWith("Host-") || dev.hostname.startsWith("Private")) {
      dev.hostname = cleanHost;
      dev.name = buildDeviceName(cleanHost, dev.vendor, dev.type, ip);
      dev.hostSource = source;
      notifyListeners("deviceUpdate", dev);
    }
  }
}

/**
 * Scan on Windows using PowerShell Get-NetNeighbor or arp -a
 */
function scanWindows(subnet, cb) {
  const psCmd = `Get-NetNeighbor -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '${subnet}*' -and $_.IPAddress -ne '${subnet}1' -and $_.IPAddress -ne '${subnet}255' } | Select-Object -Property IPAddress, LinkLayerAddress, State | ConvertTo-Json -Compress`;

  exec(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, { timeout: 4000, windowsHide: true }, (err, stdout) => {
    if (!err && stdout && stdout.trim()) {
      try {
        let items = JSON.parse(stdout.trim());
        if (!Array.isArray(items)) items = [items];
        const found = items
          .filter(i => i.IPAddress && i.LinkLayerAddress && i.LinkLayerAddress.length >= 11)
          .map(i => ({
            ip: i.IPAddress,
            mac: normalizeMac(i.LinkLayerAddress),
            state: i.State || "Active"
          }));
        return cb(found);
      } catch (_) {}
    }

    // Fallback to arp -a on Windows
    exec("arp -a", { timeout: 3000, windowsHide: true }, (arpErr, arpOut) => {
      if (arpErr || !arpOut) return cb([]);
      const found = [];
      const lines = arpOut.split(/\r?\n/);
      for (const line of lines) {
        const m = line.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})/i);
        if (m) {
          const ip = m[1];
          const mac = normalizeMac(m[2]);
          if (isClientIp(ip, subnet) && mac) {
            found.push({ ip, mac, state: "Reachable" });
          }
        }
      }
      cb(found);
    });
  });
}

/**
 * Scan on Linux using /proc/net/arp and dnsmasq leases
 */
function scanLinux(subnet, cb) {
  const found = [];
  const hostnames = new Map();

  // Try reading dnsmasq leases (NetworkManager default)
  try {
    const leaseFiles = [
      "/var/lib/misc/dnsmasq.leases",
      "/var/lib/dnsmasq/dnsmasq.leases",
      "/tmp/dhcp.leases"
    ];
    const nmDir = "/var/lib/NetworkManager";
    if (fs.existsSync(nmDir)) {
      const files = fs.readdirSync(nmDir).filter(f => f.startsWith("dnsmasq-") && f.endsWith(".leases"));
      for (const f of files) leaseFiles.push(path.join(nmDir, f));
    }

    for (const lf of leaseFiles) {
      if (fs.existsSync(lf)) {
        const content = fs.readFileSync(lf, "utf8");
        for (const line of content.split("\n")) {
          const parts = line.trim().split(/\s+/);
          // <timestamp> <mac> <ip> <hostname>
          if (parts.length >= 4 && parts[3] !== "*") {
            hostnames.set(parts[2], parts[3]);
          }
        }
      }
    }
  } catch (_) {}

  // Read /proc/net/arp
  fs.readFile("/proc/net/arp", "utf8", (err, data) => {
    if (!err && data) {
      const lines = data.split("\n").slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const ip = parts[0];
          const mac = normalizeMac(parts[3]);
          const flags = parts[2];
          if (flags !== "0x0" && isClientIp(ip, subnet) && mac) {
            found.push({
              ip,
              mac,
              hostname: hostnames.get(ip) || null,
              state: "Reachable"
            });
          }
        }
      }
      return cb(found);
    }

    // Fallback to ip neigh show
    exec("ip neigh show", { timeout: 3000 }, (ipErr, ipOut) => {
      if (ipErr || !ipOut) return cb([]);
      const lines = ipOut.split("\n");
      for (const line of lines) {
        const m = line.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s+dev\s+\S+\s+lladdr\s+([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i);
        if (m) {
          const ip = m[1];
          const mac = normalizeMac(m[2]);
          if (isClientIp(ip, subnet) && mac) {
            found.push({ ip, mac, hostname: hostnames.get(ip) || null, state: "Reachable" });
          }
        }
      }
      cb(found);
    });
  });
}

function scan() {
  if (isScanning) return;
  isScanning = true;

  const scanner = isWin ? scanWindows : scanLinux;

  scanner(currentSubnet, (discovered) => {
    const now = Date.now();

    for (const d of discovered) {
      let existing = registry.get(d.ip);
      if (!existing) {
        const { vendor, type } = lookupVendor(d.mac);
        const device = {
          ip: d.ip,
          mac: d.mac,
          hostname: d.hostname || null,
          vendor,
          type,
          icon: TYPE_ICONS[type] || "📶",
          name: buildDeviceName(d.hostname, vendor, type, d.ip),
          state: d.state || "Active",
          firstSeen: now,
          lastSeen: now,
          online: true,
          uploadBytes: 0,
          downloadBytes: 0,
          uploadPkts: 0,
          downloadPkts: 0,
          rateBps: 0,
          apps: {} // track app breakdown per device
        };

        registry.set(d.ip, device);

        // Run multi-tier hostname resolver
        resolveAllHostnameWays(d.ip, device);

        notifyListeners("newDevice", device);
      } else {
        existing.lastSeen = now;
        existing.online = true;
        if (d.mac && !existing.mac) {
          existing.mac = d.mac;
          const { vendor, type } = lookupVendor(d.mac);
          existing.vendor = vendor;
          existing.type = type;
          existing.icon = TYPE_ICONS[type] || "📶";
          existing.name = buildDeviceName(existing.hostname, vendor, type, existing.ip);
        }
        if (d.hostname && (!existing.hostname || existing.hostname.startsWith("Host-"))) {
          existing.hostname = d.hostname;
          existing.name = buildDeviceName(d.hostname, existing.vendor, existing.type, existing.ip);
        }
      }
    }

    // Check offline status
    for (const [ip, dev] of registry.entries()) {
      if (now - dev.lastSeen > 35_000) {
        dev.online = false;
      }
    }

    isScanning = false;
  });
}

function recordTraffic(ip, bytes, direction, app = null) {
  if (!ip) return;
  let dev = registry.get(ip);
  if (!dev && isClientIp(ip, currentSubnet)) {
    dev = {
      ip,
      mac: "Unknown",
      hostname: null,
      vendor: "Unknown",
      type: "unknown",
      icon: "📶",
      name: `Host-${ip.split(".").pop()}`,
      state: "Active",
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      online: true,
      uploadBytes: 0,
      downloadBytes: 0,
      uploadPkts: 0,
      downloadPkts: 0,
      rateBps: 0,
      apps: {}
    };
    registry.set(ip, dev);
    resolveAllHostnameWays(ip, dev);
    setTimeout(scan, 200);
  }

  if (dev) {
    dev.lastSeen = Date.now();
    dev.online = true;
    if (direction === "upload") {
      dev.uploadBytes += bytes;
      dev.uploadPkts += 1;
    } else {
      dev.downloadBytes += bytes;
      dev.downloadPkts += 1;
    }

    // Track per-app bandwidth for this specific user
    if (app && app.name) {
      if (!dev.apps) dev.apps = {};
      if (!dev.apps[app.name]) {
        dev.apps[app.name] = {
          name: app.name,
          category: app.category,
          icon: app.icon,
          color: app.color,
          bytes: 0,
          packets: 0
        };
      }
      dev.apps[app.name].bytes += bytes;
      dev.apps[app.name].packets += 1;
    }
  }
}

function notifyListeners(event, data) {
  if (listeners[event]) {
    for (const cb of listeners[event]) {
      try { cb(data); } catch (_) {}
    }
  }
}

function init(hotspotConfig) {
  if (hotspotConfig && hotspotConfig.subnet) {
    currentSubnet = hotspotConfig.subnet;
  }
  scan();
  setInterval(scan, 5000);
}

function setSubnet(subnet) {
  if (subnet) currentSubnet = subnet;
}

function getAll() {
  return Array.from(registry.values()).sort((a, b) => {
    // Sort by online, then by usage volume
    if (a.online !== b.online) return a.online ? -1 : 1;
    const aTotal = (a.uploadBytes || 0) + (a.downloadBytes || 0);
    const bTotal = (b.uploadBytes || 0) + (b.downloadBytes || 0);
    return bTotal - aTotal;
  });
}

function on(event, cb) {
  if (listeners[event]) listeners[event].push(cb);
}

module.exports = {
  init,
  setSubnet,
  recordTraffic,
  updateDeviceHostname,
  getAll,
  on,
  scan
};
