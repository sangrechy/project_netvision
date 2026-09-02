import React from "react";

function Stat({ label, value, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
      <span style={{ color:"#1a3828", fontSize:".58rem", letterSpacing:".1em" }}>{label}</span>
      <span style={{ color, fontSize:".7rem", fontWeight:600, minWidth:"30px", textAlign:"right" }}>
        {(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

function Sep() {
  return <span style={{ color:"#0d2218", fontSize:".9rem", userSelect:"none" }}>│</span>;
}

export default function FooterBar({ stats, recording, captureRunning }) {
  const total = Object.values(stats || {}).reduce((a, b) => a + (b || 0), 0);

  return (
    <footer style={{
      background:"#050a0e",
      borderTop:"1px solid #0d2218",
      padding:"4px 14px",
      display:"flex", alignItems:"center", gap:"12px",
      flexShrink:0,
      boxShadow:"0 -1px 20px rgba(0,255,136,0.04)",
    }}>
      <Stat label="TCP"   value={stats?.TCP}   color="#00ff88"/>
      <Sep/>
      <Stat label="UDP"   value={stats?.UDP}   color="#00ddcc"/>
      <Sep/>
      <Stat label="DNS"   value={stats?.DNS}   color="#00e5ff"/>
      <Sep/>
      <Stat label="TLS"   value={stats?.TLS}   color="#ffb300"/>
      <Sep/>
      <Stat label="HTTP"  value={stats?.HTTP}  color="#bb88ff"/>
      <Sep/>
      <Stat label="QUIC"  value={stats?.QUIC}  color="#ff88cc"/>
      <Sep/>
      <Stat label="OTHER" value={stats?.OTHER} color="#ff8844"/>

      <div style={{ flex:1 }}/>

      <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
        <span style={{ color:"#1a3828", fontSize:".58rem" }}>TOTAL</span>
        <span style={{ color:"#3d7a52", fontSize:".7rem", fontWeight:600 }}>
          {total.toLocaleString()}
        </span>
      </div>

      <Sep/>

      {recording && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
            <span style={{
              width:"6px", height:"6px", borderRadius:"50%",
              background:"#ff3b5c", display:"inline-block",
              animation:"blink 1s step-end infinite",
              boxShadow:"0 0 6px #ff3b5c",
            }}/>
            <span style={{ color:"#ff3b5c", fontSize:".58rem", letterSpacing:".08em" }}>REC</span>
          </div>
          <Sep/>
        </>
      )}

      {/* Live/stopped pill */}
      <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
        <span className={`led ${captureRunning ? "led-green" : "led-red"}`}
          style={{ width:"6px", height:"6px" }}/>
        <span style={{
          color: captureRunning ? "#3d7a52" : "#ff3b5c",
          fontSize:".58rem", letterSpacing:".1em",
        }}>
          {captureRunning ? "LIVE" : "STOPPED"}
        </span>
      </div>

      <Sep/>
      <span style={{ color:"#0d2218", fontSize:".52rem", letterSpacing:".05em" }}>
        NETVISION V1 · PASSIVE MONITOR · HOTSPOT ONLY
      </span>
    </footer>
  );
}
