import React, { useRef, useEffect } from "react";

// Protocol → badge class
function badgeClass(proto) {
  const p = (proto || "").toUpperCase();
  const map = {
    DNS:"b-DNS", TLS:"b-TLS", HTTP:"b-HTTP", HTTP2:"b-HTTP2",
    TCP:"b-TCP", UDP:"b-UDP", QUIC:"b-QUIC", MDNS:"b-mDNS",
    ICMP:"b-ICMP", DHCP:"b-DHCP",
  };
  return map[p] || "b-OTHER";
}

function ProtoBadge({ proto }) {
  return (
    <span className={`badge ${badgeClass(proto)}`}>
      {proto || "?"}
    </span>
  );
}

function TransferCell({ transfer }) {
  if (!transfer) return <span style={{ color:"#1a3828" }}>—</span>;
  const isUp = transfer.startsWith("↑");
  return (
    <span style={{ color: isUp ? "#ffb300" : "#00e5ff", letterSpacing:".03em" }}>
      {transfer}
    </span>
  );
}

function DomainCell({ website }) {
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(website);
  return (
    <span style={{
      color: isIp ? "#3d7a52" : "#a0ffb8",
      fontStyle: isIp ? "italic" : "normal",
    }} title={website}>
      {website || "—"}
    </span>
  );
}

function PayloadCell({ payload, protocol }) {
  if (!payload) return <span style={{ color:"#1a3828" }}>—</span>;

  // Color-code by content type
  let color = "#2a5035";
  if (payload.includes("TLS"))      color = "#664400";
  if (payload.includes("QUIC"))     color = "#550033";
  if (payload.includes("HTTP"))     color = "#440055";
  if (payload.includes("DNS"))      color = "#003355";
  if (payload.includes("DHCP"))     color = "#224400";

  return (
    <span style={{
      color: "#3d7a52",
      fontFamily:"'JetBrains Mono',monospace",
      fontSize:".62rem",
      display:"inline-block",
      maxWidth:"100%",
      overflow:"hidden",
      textOverflow:"ellipsis",
    }} title={payload}>
      <span style={{ color, marginRight:"4px" }}>▸</span>
      {payload}
    </span>
  );
}

function EmptyState({ selectedIp }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      height:"100%", gap:"10px",
    }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" opacity=".25">
        <circle cx="22" cy="22" r="20" stroke="#00ff88" strokeWidth="1" strokeDasharray="5 4"/>
        <circle cx="22" cy="22" r="12" stroke="#00ff88" strokeWidth="1" strokeDasharray="4 3"/>
        <circle cx="22" cy="22" r="5"  stroke="#00ff88" strokeWidth="1"/>
        <circle cx="22" cy="22" r="2"  fill="#00ff88"/>
      </svg>
      <div style={{ color:"#1a3828", fontSize:".7rem", letterSpacing:".1em" }}>
        {selectedIp ? `NO PACKETS FROM ${selectedIp}` : "AWAITING PACKETS…"}
      </div>
      <div style={{ color:"#0d2218", fontSize:".58rem" }}>
        Connect devices to your hotspot and start capture
      </div>
    </div>
  );
}

export default function TrafficTable({ traffic, selectedIp }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when new rows arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior:"instant" });
    }
  }, [traffic.length]);

  const rows = selectedIp
    ? traffic.filter(p => p.srcIp === selectedIp || p.dstIp === selectedIp || p.clientIp === selectedIp)
    : traffic;

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      overflow:"hidden", background:"var(--bg)",
    }}>
      {/* Sub-header */}
      <div style={{
        padding:"5px 12px",
        borderBottom:"1px solid #0d2218",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexShrink:0,
      }}>
        <span style={{ color:"#3d7a52", fontSize:".58rem", letterSpacing:".16em" }}>
          ◈ LIVE TRAFFIC
          {selectedIp && (
            <span style={{ color:"#00ff88", marginLeft:"8px", fontWeight:600 }}>
              → {selectedIp}
            </span>
          )}
        </span>
        <span style={{ color:"#1a3828", fontSize:".58rem" }}>
          {rows.length} packets · rolling 5 s
        </span>
      </div>

      {/* Scrollable area */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"auto" }}>
        {rows.length === 0 ? (
          <EmptyState selectedIp={selectedIp}/>
        ) : (
          <table className="t-table" style={{ tableLayout:"fixed" }}>
            <colgroup>
              <col style={{ width:"70px"  }}/>  {/* Time */}
              <col style={{ width:"170px" }}/>  {/* Website */}
              <col style={{ width:"60px"  }}/>  {/* Proto */}
              <col style={{ width:"110px" }}/>  {/* Src IP */}
              <col style={{ width:"110px" }}/>  {/* Dst IP */}
              <col style={{ width:"88px"  }}/>  {/* Transfer */}
              <col style={{ minWidth:"240px"}}/>  {/* Payload */}
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign:"left" }}>TIME</th>
                <th style={{ textAlign:"left" }}>DOMAIN</th>
                <th style={{ textAlign:"left" }}>PROTO</th>
                <th style={{ textAlign:"left" }}>SRC IP</th>
                <th style={{ textAlign:"left" }}>DST IP</th>
                <th style={{ textAlign:"left" }}>TRANSFER</th>
                <th style={{ textAlign:"left" }}>PAYLOAD PREVIEW</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id || i}>
                  <td style={{ color:"#3d7a52", fontVariantNumeric:"tabular-nums" }}>
                    {row.time}
                  </td>
                  <td><DomainCell website={row.website}/></td>
                  <td><ProtoBadge proto={row.protocol}/></td>
                  <td style={{ color:"#3d7a52", fontFamily:"monospace", fontSize:".65rem" }}>
                    {row.srcIp}
                  </td>
                  <td style={{ color:"#1a3828", fontFamily:"monospace", fontSize:".65rem" }}>
                    {row.dstIp}
                  </td>
                  <td><TransferCell transfer={row.transfer}/></td>
                  <td><PayloadCell payload={row.payload} protocol={row.protocol}/></td>
                </tr>
              ))}
              <tr ref={bottomRef}/>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
