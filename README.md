# NetVision V1 — Passive Hotspot Traffic Intelligence Dashboard

Real-time network monitoring dashboard for devices connected to your Linux hotspot.
Passively captures, parses, and visualises traffic — no MITM, no decryption, no packet injection.

---

## ⚡ Quick Start — Mock Mode (no tshark, no sudo)

```bash
# Terminal 1 — Backend (fake data)
cd netvision-v1/backend
npm install
npm run mock          # → node mock-server.js

# Terminal 2 — Frontend
cd netvision-v1/frontend
npm install
npm run dev
```

Open **http://localhost:5173** — live packets flow immediately.

---

## 🔴 Real Capture Mode

### 1. Install tshark

**Fedora / RHEL:**
```bash
sudo dnf install wireshark-cli
```

**Ubuntu / Debian:**
```bash
sudo apt install tshark
# When prompted "Should non-superusers be able to capture packets?" → Yes
```

**Allow tshark without sudo (optional):**
```bash
sudo setcap cap_net_raw,cap_net_admin+eip $(which tshark)
```

### 2. Enable your hotspot

Using NetworkManager (creates 10.42.0.x subnet by default):
```bash
nmcli device wifi hotspot ifname wlan0 ssid "MyHotspot" password "yourpassword"
```

Find your hotspot interface:
```bash
ip addr show | grep "10.42"
# e.g.: inet 10.42.0.1/24 brd 10.42.0.255 scope global wlan0
```

### 3. Start the backend

```bash
cd netvision-v1/backend
npm install

# Auto-detect interface:
sudo node server.js

# Or specify manually:
sudo HOTSPOT_IFACE=wlan0 HOTSPOT_SUBNET=10.42. node server.js
```

**Environment variables:**

| Variable         | Default  | Description                             |
|------------------|----------|-----------------------------------------|
| `PORT`           | `3001`   | WebSocket server port                   |
| `HOTSPOT_IFACE`  | auto     | Interface to capture on                 |
| `HOTSPOT_SUBNET` | `10.42.` | IP prefix of hotspot clients            |
| `AUTO_START`     | `true`   | Auto-start capture on boot              |

### 4. Start the frontend

```bash
cd netvision-v1/frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 📦 Install (full list)

### Backend
```bash
cd backend && npm install
# Packages: express, socket.io, cors, nodemon (dev)
```

### Frontend
```bash
cd frontend && npm install
# Packages: react, react-dom, socket.io-client
# Dev: vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer
```

---

## 🖥 UI Features

| Feature | Detail |
|---------|--------|
| **Device Sidebar** | ARP+DHCP detected devices with name, IP, MAC, vendor, online status, ↑/↓ traffic bars |
| **Domain Resolution** | SNI → DNS cache → HTTP Host → IP fallback priority chain |
| **Live Traffic Table** | Rolling 5-second window, auto-purges old rows |
| **Protocol Badges** | Color-coded: DNS, TLS, QUIC, HTTP, HTTP2, TCP, UDP, DHCP, ICMP |
| **Payload Previews** | TLS AppData hex, QUIC encrypted bytes, HTTP method+path, DNS query/response |
| **Direction** | ↑ Upload / ↓ Download correctly based on hotspot subnet ownership |
| **Footer Stats** | Live counters: TCP / UDP / DNS / TLS / HTTP / QUIC / OTHER |
| **Recording** | JSON or CSV, timestamped files in `backend/recordings/` |
| **Interface Selector** | Switch capture interface from the UI without restart |
| **CRT Aesthetic** | Scanline overlay, glow effects, cyber-terminal monospace design |

---

## 📁 Project Structure

```
netvision-v1/
├── backend/
│   ├── server.js         Main Express + Socket.IO server
│   ├── mock-server.js    Fake-data server for UI testing
│   ├── tshark.js         tshark process manager (EK-format)
│   ├── parser.js         Packet field extraction, DNS cache population
│   ├── dns-cache.js      Short-lived IP→domain cache (5-min TTL)
│   ├── devices.js        ARP + DHCP + OUI device tracking
│   ├── sockets.js        Socket.IO events + stats + recording
│   ├── oui.js            MAC OUI vendor database (~300 entries)
│   ├── package.json
│   └── recordings/       Saved capture files
│
└── frontend/
    ├── src/
    │   ├── App.jsx                Root state + 5-sec rolling buffer
    │   ├── socket.js              Socket.IO singleton
    │   ├── index.css              Cyber-terminal global styles
    │   └── components/
    │       ├── Topbar.jsx         Header, controls, clock
    │       ├── DeviceSidebar.jsx  Device cards with vendor + traffic bars
    │       ├── TrafficTable.jsx   Rolling live packet table
    │       └── FooterBar.jsx      Protocol stat counters
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## ⚙️ Custom Subnet

If your hotspot uses a different subnet:
```bash
sudo HOTSPOT_SUBNET=192.168.43. HOTSPOT_IFACE=wlan0 node server.js
```

---

## 🔒 What This Does NOT Do

- ✗ WiFi cracking or deauthentication
- ✗ Decrypt HTTPS / SSL stripping
- ✗ MITM attacks or ARP spoofing
- ✗ Packet injection or traffic modification
- ✗ Monitor-mode sniffing of nearby networks
- ✓ Passively reads packets flowing through your own hotspot gateway

---

## Troubleshooting

**Permission denied:**
```bash
sudo tshark -i wlan0 -c 5    # test manually
```

**No devices in sidebar:**
```bash
ip neigh show                 # check ARP table
cat /var/lib/NetworkManager/dnsmasq-*.leases  # check DHCP
```

**Wrong interface / no traffic:**
```bash
ip link show                  # list all interfaces
ip addr show                  # find which has 10.42.x.x
```

**Fedora firewall:**
```bash
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```
