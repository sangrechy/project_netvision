/**
 * app-classifier.js — NetVision V2
 * Identifies high-level applications and services from domains, SNIs, and IP signatures.
 * Groups thousands of fragmented CDN hostnames into recognizable apps.
 */

const APP_RULES = [
  // Social & Media
  {
    name: "Instagram",
    category: "Social Media",
    icon: "📸",
    color: "#E1306C",
    match: [/instagram\.com$/i, /cdninstagram\.com$/i]
  },
  {
    name: "YouTube",
    category: "Streaming Video",
    icon: "▶️",
    color: "#FF0000",
    match: [/youtube\.com$/i, /googlevideo\.com$/i, /ytimg\.com$/i, /youtu\.be$/i]
  },
  {
    name: "TikTok",
    category: "Social Video",
    icon: "🎵",
    color: "#00f2fe",
    match: [/tiktok\.com$/i, /tiktokcdn\.com$/i, /byteoversea\.com$/i, /ibytedtos\.com$/i]
  },
  {
    name: "WhatsApp",
    category: "Messaging",
    icon: "💬",
    color: "#25D366",
    match: [/whatsapp\.com$/i, /whatsapp\.net$/i, /wa\.me$/i]
  },
  {
    name: "Discord",
    category: "Chat & Voice",
    icon: "🎮",
    color: "#5865F2",
    match: [/discord\.gg$/i, /discord\.com$/i, /discordapp\.com$/i, /discordapp\.net$/i]
  },
  {
    name: "Spotify",
    category: "Audio Streaming",
    icon: "🎧",
    color: "#1DB954",
    match: [/spotify\.com$/i, /scdn\.co$/i, /spotifycdn\.com$/i]
  },
  {
    name: "Netflix",
    category: "Streaming Video",
    icon: "🍿",
    color: "#E50914",
    match: [/netflix\.com$/i, /nflxvideo\.net$/i, /nflxext\.com$/i, /nflximg\.net$/i]
  },
  {
    name: "Telegram",
    category: "Messaging",
    icon: "✈️",
    color: "#229ED9",
    match: [/telegram\.org$/i, /t\.me$/i, /telesco\.pe$/i]
  },
  {
    name: "Twitter / X",
    category: "Social Media",
    icon: "🐦",
    color: "#1DA1F2",
    match: [/twitter\.com$/i, /x\.com$/i, /twimg\.com$/i]
  },
  {
    name: "Facebook",
    category: "Social Media",
    icon: "👥",
    color: "#1877F2",
    match: [/facebook\.com$/i, /fbcdn\.net$/i, /meta\.com$/i]
  },

  // Developer & Productivity
  {
    name: "GitHub",
    category: "Developer",
    icon: "🐙",
    color: "#8957e5",
    match: [/github\.com$/i, /githubusercontent\.com$/i, /githubassets\.com$/i]
  },
  {
    name: "ChatGPT / OpenAI",
    category: "AI & Productivity",
    icon: "🤖",
    color: "#10a37f",
    match: [/openai\.com$/i, /chatgpt\.com$/i, /oaistatic\.com$/i]
  },

  // Big Tech Platforms & CDNs
  {
    name: "Apple Services",
    category: "Cloud & OS",
    icon: "🍎",
    color: "#999999",
    match: [/apple\.com$/i, /icloud\.com$/i, /aaplimg\.com$/i, /mzstatic\.com$/i, /apple-dns\.net$/i]
  },
  {
    name: "Google Services",
    category: "Cloud & Search",
    icon: "🔍",
    color: "#4285F4",
    match: [/google\.com$/i, /gstatic\.com$/i, /googleapis\.com$/i, /googleusercontent\.com$/i, /1e100\.net$/i]
  },
  {
    name: "Microsoft / Windows",
    category: "Cloud & OS",
    icon: "🪟",
    color: "#00A4EF",
    match: [/microsoft\.com$/i, /live\.com$/i, /windowsupdate\.com$/i, /office\.com$/i, /msftconnecttest\.com$/i]
  },
  {
    name: "Amazon / AWS",
    category: "Cloud & Shopping",
    icon: "📦",
    color: "#FF9900",
    match: [/amazon\.com$/i, /amazonaws\.com$/i, /cloudfront\.net$/i]
  },
  {
    name: "Cloudflare",
    category: "CDN & Security",
    icon: "☁️",
    color: "#F38020",
    match: [/cloudflare\.com$/i, /cloudflare-dns\.com$/i]
  }
];

/**
 * Classifies a domain or SNI into an app
 */
function classifyApp(domain, remoteIp) {
  if (!domain || domain === "Unknown") {
    return {
      name: remoteIp ? `IP: ${remoteIp}` : "General Web",
      category: "Network Traffic",
      icon: "🌐",
      color: "#64748b"
    };
  }

  const cleanDomain = domain.toLowerCase().trim();

  for (const rule of APP_RULES) {
    for (const pattern of rule.match) {
      if (pattern.test(cleanDomain)) {
        return {
          name: rule.name,
          category: rule.category,
          icon: rule.icon,
          color: rule.color
        };
      }
    }
  }

  // Fallback: extract root domain name (e.g. reddit.com, twitch.tv)
  const parts = cleanDomain.split(".");
  let root = cleanDomain;
  if (parts.length >= 2) {
    root = parts.slice(-2).join(".");
  }

  // Format capitalized root
  const appTitle = root.split(".")[0].charAt(0).toUpperCase() + root.split(".")[0].slice(1);

  return {
    name: appTitle,
    category: "Web Service",
    icon: "🌐",
    color: "#3b82f6"
  };
}

module.exports = {
  classifyApp,
  APP_RULES
};
