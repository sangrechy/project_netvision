import React from "react";

function fmtBytes(b) {
  if (!b || b === 0) return "0 B";
  if (b < 1024)      return `${b} B`;
  if (b < 1048576)   return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(2)} MB`;
}

function TrafficBar({ bytesUp, bytesDown }) {
  const total = (bytesUp || 0) + (bytesDown || 0);
  const max   = 50 * 1024 * 1024; // 50 MB cap for bar
  const pct   = Math.min(100, (total / max) * 100);
  const color = pct > 70 ? "#ff3b5c" : pct > 40 ? "#ffb300" : "#00ff88";

  return (
    <div style={{ marginTop:"5px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"2px" }}>
        <span style={{ fontSize:".52rem", color:"#1a3828" }}>
          ↑ {fmtBytes(bytesUp)}
        </span>
        <span style={{ fontSize:".52rem", color:"#1a3828" }}>
          ↓ {fmtBytes(bytesDown)}
        </span>
      </div>
      <div className="tbar-bg">
        <div className="tbar-fill" style={{ width:`${pct}%`, background:color }}/>
      </div>
      <div style={{ textAlign:"right", marginTop:"1px" }}>
        <span style={{ fontSize:".52rem", color:"#3d7a52" }}>{fmtBytes(total)}</span>
      </div>
    </div>
  );
}

function DeviceCard({ device, selected, onSelect }) {
  const { name, ip, mac, vendor, icon, online, bytesUp, bytesDown } = device;
  const shortMac = mac && !mac.startsWith("??")
    ? mac.toUpperCase()
    : "??:??:??:??:??:??";

  return (
    <div
      className={`device-card ${selected ? "selected" : ""}`}
      style={{ margin:"3px 0", padding:"9px 10px" }}
      onClick={onSelect}
    >
      <div style={{ display:"flex", alignItems:"flex-start", gap:"8px" }}>
        {/* Online indicator + icon */}
        <div style={{ position:"relative", flexShrink:0, marginTop:"1px" }}>
          <span style={{ fontSize:"1.15rem", lineHeight:1 }}>{icon || "📡"}</span>
          <span
            className={`led ${online ? "led-green" : "led-dim"}`}
            style={{ position:"absolute", bottom:0, right:-1, width:"6px", height:"6px" }}
          />
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {/* Name */}
          <div style={{
            color: selected ? "#00ff88" : "#a0ffb8",
            fontSize:".72rem", fontWeight:600,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            letterSpacing:".02em",
          }} title={name}>
            {name || "Unknown"}
          </div>

          {/* Vendor */}
          {vendor && vendor !== "Unknown" && vendor !== "Randomised MAC" && (
            <div style={{ color:"#3d7a52", fontSize:".55rem", marginTop:"1px" }}>
              {vendor}
            </div>
          )}

          {/* IP */}
          <div style={{ color:"#00e5ff", fontSize:".62rem", marginTop:"2px", opacity:.8 }}>
            {ip}
          </div>

          {/* MAC */}
          <div style={{
            color:"#1a3828", fontSize:".52rem",
            fontFamily:"monospace", marginTop:"1px",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {shortMac}
          </div>

          {/* Traffic bar */}
          <TrafficBar bytesUp={bytesUp} bytesDown={bytesDown} />
        </div>
      </div>
    </div>
  );
}

export default function DeviceSidebar({ devices, selectedIp, onSelect, onRefresh }) {
  return (
    <aside style={{
      width:"215px", minWidth:"215px", flexShrink:0,
      background:"#050a0e",
      borderRight:"1px solid #0d2218",
      display:"flex", flexDirection:"column", overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:"6px 12px",
        borderBottom:"1px solid #0d2218",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{ color:"#3d7a52", fontSize:".58rem", letterSpacing:".16em" }}>
          ◈ DEVICES
        </span>
        <button
          onClick={onRefresh}
          style={{
            background:"none", border:"none", cursor:"pointer",
            color:"#1a3828", fontSize:".62rem", letterSpacing:".05em",
            transition:"color .2s", padding:0,
          }}
          onMouseEnter={e => e.target.style.color="#00ff88"}
          onMouseLeave={e => e.target.style.color="#1a3828"}
          title="Refresh ARP table"
        >
          ⟳ SCAN
        </button>
      </div>

      {/* All traffic option */}
      <div style={{ padding:"6px 8px 2px" }}>
        <div
          className={`device-card ${!selectedIp ? "selected" : ""}`}
          style={{ padding:"7px 10px" }}
          onClick={() => onSelect(null)}
        >
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"1.1rem" }}>🌐</span>
            <div>
              <div style={{ color: !selectedIp ? "#00ff88" : "#a0ffb8", fontSize:".7rem", fontWeight:600 }}>
                All Traffic
              </div>
              <div style={{ color:"#1a3828", fontSize:".55rem" }}>Show all devices</div>
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{ margin:"4px 12px", borderTop:"1px solid #0d2218" }}/>

      {/* Device list */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 8px 8px" }}>
        {devices.length === 0 ? (
          <div style={{
            color:"#1a3828", fontSize:".62rem", textAlign:"center",
            marginTop:"28px", lineHeight:2,
          }}>
            <div style={{ fontSize:"1.6rem", marginBottom:"6px", opacity:.3 }}>📡</div>
            No devices detected.
            <br/>
            <span style={{ color:"#0d2218", fontSize:".55rem" }}>
              Start capture to begin scanning.
            </span>
          </div>
        ) : (
          devices.map(dev => (
            <DeviceCard
              key={dev.ip}
              device={dev}
              selected={selectedIp === dev.ip}
              onSelect={() => onSelect(dev.ip)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
