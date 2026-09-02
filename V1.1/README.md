# 🌐 NetVision V1.1

This is the main working version of NetVision.

NetVision V1.1 is a real-time network traffic monitoring dashboard. It captures traffic from your hotspot/network, detects connected devices, identifies protocols, and shows everything live in the dashboard.

It supports both 🐧 Linux/Fedora and 🪟 Windows.

---

## What's in V1.1

- Real-time traffic monitoring
- Connected device detection
- Protocol detection
- DNS and domain resolution
- TLS SNI detection
- Upload/download traffic tracking
- Live updates using Socket.IO
- React dashboard
- Traffic recording
- Linux/Fedora support
- Windows support

---

# 📥 Installation

## 🐧 1. Linux / Fedora

### Step 1 — Clone the repository

    git clone https://github.com/sangrechy/project_netvision.git
    cd project_netvision/V1.1

### Step 2 — Install TShark

For Fedora:

    sudo dnf install wireshark-cli

Check:

    tshark --version

### Step 3 — Install dependencies

Backend:

    cd backend
    npm install

Frontend:

    cd ../frontend
    npm install

### Step 4 — Run NetVision

From the V1.1 folder:

    ./start.sh

Then open:

    http://localhost:5173

---

## 🪟 2. Windows

### Step 1 — Clone the repository

    git clone https://github.com/sangrechy/project_netvision.git
    cd project_netvision\V1.1

### Step 2 — Install Wireshark

Install Wireshark with **Npcap** and make sure TShark is available.

Check:

    tshark --version

### Step 3 — Install dependencies

Backend:

    cd backend
    npm install

Frontend:

    cd ..\frontend
    npm install

### Step 4 — Run NetVision

Go back to the V1.1 folder:

    cd ..

Then run:

    .\run_netvision.bat

Open:

    http://localhost:5173

---

## ⚠️ Note

This project is made for monitoring networks you own or have permission to monitor.

No Wi-Fi cracking, deauth, MITM, packet injection, or HTTPS decryption stuff here.
