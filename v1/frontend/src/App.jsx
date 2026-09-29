import React, { useState, useEffect, useCallback, useRef } from "react";
import socket        from "./socket.js";
import Topbar        from "./components/Topbar.jsx";
import DeviceSidebar from "./components/DeviceSidebar.jsx";
import TrafficTable  from "./components/TrafficTable.jsx";
import FooterBar     from "./components/FooterBar.jsx";

// Rolling window — keep packets from last N seconds
const WINDOW_SECS = 5;
const MAX_PACKETS = 300; // hard cap for DOM safety

export default function App() {
  const [connected,      setConnected]      = useState(false);
  const [captureRunning, setCaptureRunning] = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [devices,        setDevices]        = useState([]);
  const [traffic,        setTraffic]        = useState([]);
  const [stats,          setStats]          = useState({ TCP:0,UDP:0,DNS:0,TLS:0,HTTP:0,QUIC:0,OTHER:0 });
  const [selectedIp,     setSelectedIp]     = useState(null);
  const [interfaces,     setInterfaces]     = useState([]);
  const [currentIface,   setCurrentIface]   = useState("wlan0");
  const [error,          setError]          = useState(null);

  // Keep a ref for the rolling packet buffer (avoids stale closure in socket handler)
  const bufRef = useRef([]);

  // ── Rolling window pruner (every 1s) ──────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - WINDOW_SECS * 1000;
      const pruned = bufRef.current.filter(p => p._ts > cutoff);
      bufRef.current = pruned;
      setTraffic([...pruned]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Socket.IO wiring ───────────────────────────────────────────────────────
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onTraffic = (pkt) => {
      const stamped = { ...pkt, _ts: Date.now() };
      // Append + cap
      const next = [...bufRef.current, stamped];
      bufRef.current = next.length > MAX_PACKETS ? next.slice(-MAX_PACKETS) : next;
      setTraffic([...bufRef.current]);
    };

    const onDevices       = list  => setDevices(list || []);
    const onStats         = s     => setStats(prev => ({ ...prev, ...s }));
    const onCaptureStatus = ({ running, iface }) => {
      setCaptureRunning(running);
      if (iface) setCurrentIface(iface);
      if (running) setError(null);
    };
    const onCaptureError  = ({ message }) => {
      setError(message);
      setCaptureRunning(false);
    };
    const onRecordingStatus = ({ recording: r }) => setRecording(r);

    socket.on("connect",         onConnect);
    socket.on("disconnect",      onDisconnect);
    socket.on("traffic",         onTraffic);
    socket.on("devices",         onDevices);
    socket.on("stats",           onStats);
    socket.on("captureStatus",   onCaptureStatus);
    socket.on("captureError",    onCaptureError);
    socket.on("recordingStatus", onRecordingStatus);

    return () => {
      socket.off("connect",         onConnect);
      socket.off("disconnect",      onDisconnect);
      socket.off("traffic",         onTraffic);
      socket.off("devices",         onDevices);
      socket.off("stats",           onStats);
      socket.off("captureStatus",   onCaptureStatus);
      socket.off("captureError",    onCaptureError);
      socket.off("recordingStatus", onRecordingStatus);
    };
  }, []);

  // ── Fetch available interfaces on mount ───────────────────────────────────
  useEffect(() => {
    fetch("/api/interfaces")
      .then(r => r.json())
      .then(({ interfaces: ifaces, recommended }) => {
        setInterfaces(ifaces || []);
        if (recommended) setCurrentIface(recommended);
      })
      .catch(() => {});
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStartCapture   = useCallback((iface) => {
    setError(null);
    setCurrentIface(iface);
    // Clear stale traffic
    bufRef.current = [];
    setTraffic([]);
    socket.emit("startCapture", { iface });
  }, []);

  const handleStopCapture    = useCallback(() => socket.emit("stopCapture"),         []);
  const handleStartRecording = useCallback((fmt) => socket.emit("startRecording", { format: fmt }), []);
  const handleStopRecording  = useCallback(() => socket.emit("stopRecording"),       []);
  const handleRefreshDevices = useCallback(() => socket.emit("refreshDevices"),      []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height:"100vh", width:"100vw",
      display:"flex", flexDirection:"column",
      overflow:"hidden", background:"#050a0e",
      position:"relative",
    }}>
      {/* CRT effects */}
      <div className="scanline-overlay"/>
      <div className="scanline-sweep"/>

      {/* Disconnected banner */}
      {!connected && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:200,
          background:"#ff3b5c", color:"#050a0e",
          textAlign:"center", fontSize:".62rem",
          padding:"3px", fontWeight:700, letterSpacing:".1em",
        }}>
          ⚠ BACKEND DISCONNECTED — RECONNECTING…
        </div>
      )}

      <Topbar
        deviceCount      = {devices.length}
        captureRunning   = {captureRunning}
        iface            = {currentIface}
        interfaces       = {interfaces}
        onStartCapture   = {handleStartCapture}
        onStopCapture    = {handleStopCapture}
        recording        = {recording}
        onStartRecording = {handleStartRecording}
        onStopRecording  = {handleStopRecording}
        error            = {error}
      />

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <DeviceSidebar
          devices    = {devices}
          selectedIp = {selectedIp}
          onSelect   = {setSelectedIp}
          onRefresh  = {handleRefreshDevices}
        />
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <TrafficTable traffic={traffic} selectedIp={selectedIp}/>
        </main>
      </div>

      <FooterBar
        stats          = {stats}
        recording      = {recording}
        captureRunning = {captureRunning}
      />
    </div>
  );
}
