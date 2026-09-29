/**
 * dns-cache.js — NetVision V2
 * Short-lived in-memory DNS cache mapping IP addresses → domain names.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 5000;

// Map<ip, { domain, expires }>
const cache = new Map();

function set(ip, domain) {
  if (!ip || !domain || domain === ip) return;
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(ip, { domain, expires: Date.now() + TTL_MS });
}

function get(ip) {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(ip);
    return null;
  }
  return entry.domain;
}

function size() {
  return cache.size;
}

// Periodic cleanup every 60s
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of cache.entries()) {
    if (now > entry.expires) cache.delete(ip);
  }
}, 60_000);

module.exports = { set, get, size };
