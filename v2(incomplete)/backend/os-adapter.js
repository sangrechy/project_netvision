/**
 * os-adapter.js — NetVision V2
 * Cross-platform network adapter and hotspot auto-detection for Windows & Linux.
 */

const os = require("os");

const isWin = process.platform === "win32";
const isLinux = process.platform === "linux";

/**
 * Returns all active IPv4 interfaces
 */
function getInterfaces() {
  const ifaces = os.networkInterfaces();
  const list = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs) {
      if (a.family === "IPv4" && !a.internal) {
        const isWindowsHotspot = isWin && (a.address.startsWith("192.168.137.") || name.toLowerCase().includes("local area connection*"));
        const isLinuxHotspot = isLinux && (a.address.startsWith("10.42.") || name.startsWith("wlan") || name.startsWith("ap"));
        
        list.push({
          name,
          address: a.address,
          mac: a.mac,
          netmask: a.netmask,
          isHotspotCandidate: isWindowsHotspot || isLinuxHotspot
        });
      }
    }
  }

  return list;
}

/**
 * Auto-detects the hotspot interface name and subnet
 */
function autoDetectHotspot() {
  const envIface = process.env.HOTSPOT_IFACE;
  const envSubnet = process.env.HOTSPOT_SUBNET;
  const ifaces = getInterfaces();

  // 1. If explicitly defined in environment
  if (envIface && envSubnet) {
    const match = ifaces.find(i => i.name.toLowerCase() === envIface.toLowerCase());
    return {
      platform: process.platform,
      iface: envIface,
      subnet: envSubnet,
      gatewayIp: match ? match.address : `${envSubnet}1`
    };
  }

  // 2. Windows specific auto-detection
  if (isWin) {
    // Check 192.168.137.x interface (Standard Windows Mobile Hotspot)
    const winHotspot = ifaces.find(i => i.address.startsWith("192.168.137."));
    if (winHotspot) {
      return {
        platform: "win32",
        iface: winHotspot.name,
        subnet: "192.168.137.",
        gatewayIp: winHotspot.address
      };
    }

    // Check Local Area Connection*
    const lac = ifaces.find(i => i.name.toLowerCase().startsWith("local area connection*"));
    if (lac) {
      const subnetParts = lac.address.split(".").slice(0, 3).join(".") + ".";
      return {
        platform: "win32",
        iface: lac.name,
        subnet: subnetParts,
        gatewayIp: lac.address
      };
    }
  }

  // 3. Linux specific auto-detection
  if (isLinux) {
    // Check 10.42.x.x interface (Standard NetworkManager Hotspot)
    const nmHotspot = ifaces.find(i => i.address.startsWith("10.42."));
    if (nmHotspot) {
      return {
        platform: "linux",
        iface: nmHotspot.name,
        subnet: "10.42.",
        gatewayIp: nmHotspot.address
      };
    }

    // Check wlan* interface
    const wlan = ifaces.find(i => i.name.startsWith("wlan") || i.name.startsWith("ap"));
    if (wlan) {
      const subnetParts = wlan.address.split(".").slice(0, 3).join(".") + ".";
      return {
        platform: "linux",
        iface: wlan.name,
        subnet: subnetParts,
        gatewayIp: wlan.address
      };
    }
  }

  // 4. Fallback: First candidate or primary non-loopback
  const candidate = ifaces.find(i => i.isHotspotCandidate) || ifaces[0];
  if (candidate) {
    const parts = candidate.address.split(".").slice(0, 3).join(".") + ".";
    return {
      platform: process.platform,
      iface: candidate.name,
      subnet: parts,
      gatewayIp: candidate.address
    };
  }

  // 5. Default safe fallback
  return {
    platform: process.platform,
    iface: isWin ? "Wi-Fi" : "wlan0",
    subnet: isWin ? "192.168.137." : "10.42.0.",
    gatewayIp: isWin ? "192.168.137.1" : "10.42.0.1"
  };
}

function isClientIp(ip, subnet) {
  if (!ip || !ip.startsWith(subnet)) return false;
  // Exclude gateway (.1) and broadcast (.255)
  const lastOctet = ip.slice(subnet.length);
  return lastOctet !== "1" && lastOctet !== "255";
}

module.exports = {
  isWin,
  isLinux,
  getInterfaces,
  autoDetectHotspot,
  isClientIp
};
