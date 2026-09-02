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

### Step 1 — Clone the project

    git clone https://github.com/sangrechy/project_netvision.git
    cd project_netvision/V1.1

### Step 2 — Install TShark

For Fedora:

    sudo dnf install wireshark-cli

Check if it installed correctly:

    tshark --version

If packet capture gives permission issues, test with:

    sudo tshark -i wlan0 -c 5

### Step 3 — Enable your hotspot

Example using NetworkManager:

    nmcli device wifi hotspot ifname wlan0 ssid "MyHotspot" password "yourpassword"

Check your hotspot interface:

    ip addr show

NetVision normally uses the hotspot interface and subnet for monitoring.

### Step 4 — Install backend dependencies

    cd backend
    npm install

### Step 5 — Install frontend dependencies

    cd ../frontend
    npm install

### Step 6 — Start NetVision

Go back to the V1.1 folder:

    cd ..

Start the project:

    ./start.sh

Then open:

    http://localhost:5173

---

## 🪟 2. Windows

### Step 1 — Clone the project

    git clone https://github.com/sangrechy/project_netvision.git
    cd project_netvision\V1.1

### Step 2 — Install Wireshark

Download and install Wireshark from the official website:

    https://www.wireshark.org/download.html

During installation, make sure TShark and Npcap are installed.

After installation, open a new PowerShell window and check:

    tshark --version

If `tshark` is not recognized, make sure the Wireshark installation folder is added to your system PATH.

### Step 3 — Install backend dependencies

    cd backend
    npm install

### Step 4 — Install frontend dependencies

    cd ..\frontend
    npm install

### Step 5 — Enable Windows Mobile Hotspot

Turn on:

    Settings → Network & Internet → Mobile hotspot

Connect a device to the hotspot.

### Step 6 — Run NetVision

Go back to the V1.1 folder:

    cd ..

Run:

    .\run_netvision.bat

Then open:

    http://localhost:5173

---

## ⚠️ Note

This project is made for monitoring networks you own or have permission to monitor.

No Wi-Fi cracking, deauth, MITM, packet injection, or HTTPS decryption stuff here.
