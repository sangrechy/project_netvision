# NetVision V2 — Neumorphic Hotspot Traffic Intelligence

A high-fidelity, real-time network intelligence dashboard designed for monitoring devices connected to your mobile hotspot (Windows or Linux).
Features a state-of-the-art **Neumorphic / Soft UI** design with seamless **Dark and Light Mode**, tactile controls, and a unified cross-platform backend.

Passively captures, parses, and visualizes network packets — no MITM, no decryption, no packet injection.

---

## ✨ What's New in V2

1. **Neumorphic / Soft UI Aesthetics**:
   - Calibrated convex elevations (`shadow-neu-flat`) and debossed wells (`shadow-neu-inset`).
   - **Tactile Floating Gateway Card**: Displays Gateway IPv4, interface, client count, and iridescent holographic accents.
   - **Concentric Radial Statistics Dial**: Interactive segmented donut gauge visualizing real-time protocol breakdown with an extruded central velocity indicator.
   - **Tactile Rocker Switches**: Physical-style toggle switch for live packet capture pause/resume.
   - **Recessed Progress Sliders**: Smooth progress tracks for bandwidth utilization and device throughput.

2. **First-Class Dark & Light Mode**:
   - Deep slate obsidian neumorphism in Dark Mode.
   - Crisp, soft-pearl neumorphism in Light Mode.
   - One-click tactile sun/moon toggle switch with automatic local storage persistence.

3. **Unified Cross-Platform Core (Windows & Linux)**:
   - Single backend codebase that auto-detects operating system:
     - **Windows**: Supports Windows Mobile Hotspot (`192.168.137.x`), PowerShell `Get-NetNeighbor`, Netsh, and reverse DNS PTR resolution.
     - **Linux**: Supports NetworkManager Hotspot (`10.42.0.x`), `/proc/net/arp`, and dnsmasq DHCP leases.
   - Dynamic interface switching from the UI without restarting the server.

4. **Zero-Config Resilient Capture Engine**:
   - Auto-locates `tshark` on Windows (`C:\Program Files\Wireshark\tshark.exe` / `PATH`) and Linux (`/usr/bin/tshark`).
   - **High-Fidelity Simulated Mock Fallback**: If Wireshark/tshark is not installed or when running in demo/offline mode, it automatically produces realistic simulated hotspot traffic.

---

## ⚡ Quick Start

### Windows (1-Click)
Simply double-click or run:
```cmd
run_netvision.bat
```
*(or run `powershell -ExecutionPolicy Bypass -File run_netvision.ps1`)*

### Linux (1-Click)
```bash
chmod +x start.sh
./start.sh
```

Open your browser at: **`http://localhost:5173`**

---

## 🛠 Manual Execution

### Backend
```bash
cd v2/backend
npm install

# Start with auto-detection (tshark with mock fallback):
npm start

# Force simulated mock mode:
npm run mock
```

### Frontend
```bash
cd v2/frontend
npm install
npm run dev
```

---

## 📁 V2 Architecture & File Map

```text
v2/
├── backend/
│   ├── server.js              # Unified Express + Socket.IO server entrypoint
│   ├── os-adapter.js          # Cross-platform network interface & hotspot auto-detection
│   ├── devices.js             # Device scanner (Windows PowerShell & Linux ARP/leases)
│   ├── tshark.js              # Cross-platform tshark manager with mock fallback
│   ├── mock-generator.js      # High-fidelity realistic packet generator
│   ├── parser.js              # Packet field extractor, protocol classifier, SNI/DNS
│   ├── dns-cache.js           # In-memory IP → domain cache with 5-min TTL
│   ├── oui.js                 # MAC vendor lookup database (~300 vendors)
│   ├── sockets.js             # WebSocket hub, stats aggregator & file recorder
│   ├── recordings/            # Directory for exported JSON / CSV captures
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React root
│   │   ├── App.jsx            # Main dashboard shell & rolling 5s packet buffer
│   │   ├── socket.js          # Socket.IO client singleton
│   │   ├── index.css          # Neumorphic lighting variables & custom styles
│   │   └── components/
│   │       ├── Header.jsx           # Tactile topbar with rocker switch & theme toggle
│   │       ├── GatewayCard.jsx      # Tactile holographic card (Gateway Node & throughput)
│   │       ├── RadialStatsDial.jsx  # Concentric extruded dial with protocol breakdown
│   │       ├── MetricsPanel.jsx     # Protocol counters & throughput stats
│   │       ├── DeviceList.jsx       # Connected devices with vendor tags & activity bars
│   │       ├── TrafficTable.jsx     # Live rolling packet stream with packet inspector
│   │       └── RecordModal.jsx      # Dialog to export captures to JSON/CSV
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js     # Neumorphic dual-shadows and color tokens
│   ├── postcss.config.js
│   └── package.json
│
├── run_netvision.bat          # Windows 1-click launcher
├── run_netvision.ps1          # Windows PowerShell launcher
├── start.sh                   # Linux 1-click launcher
└── README.md
```

---

## 🔒 Security & Privacy Notice
- NetVision V2 does **NOT** perform ARP spoofing, MITM, or SSL decryption.
- Passively monitors metadata (DNS queries, TLS SNI headers, QUIC handshakes, IP headers) routed through your own computer's hotspot adapter.
