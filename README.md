# 🌐 NetVision

NetVision is a real-time **network traffic monitoring and intelligence dashboard**.

Basically, it captures traffic from your network or hotspot, checks connected devices, analyzes packets, identifies protocols, and shows everything in a live dashboard.

## What it does

* Live network traffic monitoring
* Detect connected devices
* Identify network protocols
* Try to identify domains using DNS, TLS SNI and HTTP info
* Show upload and download traffic
* Real-time updates using Socket.IO
* Live React dashboard
* Windows and Linux/Fedora support

## How it works

```text
Network Traffic
      ↓
TShark Capture
      ↓
Packet Parser
      ↓
Device + Protocol Analysis
      ↓
Express + Socket.IO
      ↓
Live Dashboard
```

## 🖥️ UI Preview

A quick look at the NetVision dashboard.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/957b03e1-52f2-417e-a76b-7e60e299145f" />


## 🛠️ Tech used

**Backend:** Node.js, Express, Socket.IO, TShark

**Frontend:** React, Vite, Tailwind CSS

**Other:** Python

## Versions

Current working version:

👉 **[NetVision V1.1](./V1.1/)**

The actual source code and version-specific details are inside the `V1.1` folder.

## ⚠️ Note

This project is made for learning and monitoring networks you own or have permission to monitor.

No Wi-Fi cracking, packet injection, deauth, or MITM stuff here.
