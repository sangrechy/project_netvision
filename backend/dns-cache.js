/**
 * dns-cache.js
 * Short-lived in-memory DNS cache that maps IP addresses → domain names.
 *
 * How it works:
 *   1. When the parser sees a DNS *response* containing an A/AAAA record,
 *      it calls dnsCache.set(ip, domain).
 *   2. When later packets arrive with that IP but no SNI/host,
 *      the parser calls dnsCache.get(ip) to resolve the domain.
 *
 * Entries expire after TTL_MS (default 5 minutes) to stay lightweight.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 2000;

// Map<ip → { domain, expires }>
const cache = new Map();

function set(ip, domain) {
  if (!ip || !domain || domain === ip) return;
  // Evict if at capacity
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

function size() { return cache.size; }

// Periodic cleanup — remove expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of cache.entries()) {
    if (now > entry.expires) cache.delete(ip);
  }
}, 60_000);

module.exports = { set, get, size };
