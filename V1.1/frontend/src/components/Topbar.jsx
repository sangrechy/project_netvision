import React, { useState, useEffect } from "react";

export default function Topbar({
  deviceCount, captureRunning, iface, interfaces,
  onStartCapture, onStopCapture,
  recording, onStartRecording, onStopRecording,
  error,
}) {
  const [selIface,   setSelIface]   = useState(iface || "wlan0");
  const [recFormat,  setRecFormat]  = useState("json");
  const [clock,      setClock]      = useState("");

  useEffect(() => {
    setSelIface(iface || "wlan0");
  }, [iface]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 14px", minHeight:"46px", flexShrink:0,
      background:"#050a0e",
      borderBottom:"1px solid #0d2218",
      boxShadow:"0 1px 24px rgba(0,255,136,0.07)",
    }} className="flicker">

      {/* LEFT — logo + status */}
      <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="#00ff88" strokeWidth=".8" opacity=".35"/>
            <circle cx="9" cy="9" r="5" stroke="#00ff88" strokeWidth=".8" opacity=".6"/>
            <circle cx="9" cy="9" r="2.5" stroke="#00ff88" strokeWidth=".8"/>
            <circle cx="9" cy="9" r="1.2" fill="#00ff88"/>
            <line x1="9" y1="1" x2="9" y2="4" stroke="#00ff88" strokeWidth=".8"/>
            <line x1="9" y1="14" x2="9" y2="17" stroke="#00ff88" strokeWidth=".8"/>
            <line x1="1" y1="9" x2="4" y2="9" stroke="#00ff88" strokeWidth=".8"/>
            <line x1="14" y1="9" x2="17" y2="9" stroke="#00ff88" strokeWidth=".8"/>
          </svg>
          <span className="glow-green" style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:"1.05rem",
            letterSpacing:".18em", color:"#00ff88",
          }}>NETVISION</span>
          <span style={{ color:"#1a3828", fontSize:".6rem" }}>V1</span>
        </div>

        <span style={{ color:"#0d2218" }}>│</span>

        {/* Capture status */}
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <span className={`led ${captureRunning ? "led-green" : "led-red"}`}/>
          <span style={{ color: captureRunning ? "#00ff88" : "#ff3b5c", fontSize:".65rem", letterSpacing:".08em" }}>
            {captureRunning ? "LIVE" : "IDLE"}
          </span>
        </div>

        <span style={{ color:"#0d2218" }}>│</span>

        {/* Device count */}
        <span style={{ fontSize:".65rem", color:"#3d7a52", letterSpacing:".05em" }}>
          DEVICES <span style={{ color:"#00ff88", fontWeight:600 }}>{deviceCount}</span>
        </span>

        <span style={{ color:"#0d2218" }}>│</span>

        {/* Interface */}
        <span style={{ fontSize:".65rem", color:"#3d7a52" }}>
          IF <span style={{ color:"#00e5ff" }}>{iface || "—"}</span>
        </span>

        {/* Error */}
        {error && (
          <>
            <span style={{ color:"#0d2218" }}>│</span>
            <span style={{
              color:"#ff3b5c", fontSize:".6rem",
              maxWidth:"280px", overflow:"hidden", textOverflow:"ellipsis",
            }} title={error}>⚠ {error}</span>
          </>
        )}
      </div>

      {/* RIGHT — controls */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        {/* Interface selector */}
        <select value={selIface} onChange={e => setSelIface(e.target.value)} style={{ width:"120px" }}>
          {(interfaces.length > 0 ? interfaces : [selIface]).map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        {!captureRunning
          ? <button className="btn btn-green" onClick={() => onStartCapture(selIface)}>▶ START</button>
          : <button className="btn btn-red"   onClick={onStopCapture}>■ STOP</button>
        }

        <span style={{ color:"#0d2218" }}>│</span>

        <select value={recFormat} onChange={e => setRecFormat(e.target.value)} style={{ width:"62px" }}>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>

        {!recording
          ? <button className="btn btn-amber" onClick={() => onStartRecording(recFormat)}>⏺ REC</button>
          : <button className="btn btn-red"   onClick={onStopRecording}><span className="blink">●</span> STOP</button>
        }

        <span style={{ color:"#0d2218" }}>│</span>

        <span style={{ color:"#1a3828", fontSize:".68rem", letterSpacing:".04em", userSelect:"none" }}>
          {clock}
        </span>
      </div>
    </header>
  );
}
