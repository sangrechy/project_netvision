import React, { useState } from 'react';

const PALETTE = [
  '#ff6a3d', // Top User: Vibrant Coral
  '#06b6d4', // 2nd User: Cyan
  '#8b5cf6', // 3rd User: Purple
  '#10b981', // 4th User: Emerald
  '#f59e0b', // 5th User: Amber
  '#ec4899', // 6th User: Pink
  '#3b82f6', // 7th User: Blue
];

export default function RadialStatsDial({ stats, devices = [], onSelectDevice, selectedDeviceIp }) {
  const [viewMode, setViewMode] = useState('devices'); // 'devices' | 'protocols'
  const [selectedIdx, setSelectedIdx] = useState(0);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Build items based on viewMode
  let items = [];
  let totalVolume = 0;

  if (viewMode === 'devices') {
    // "Who Uses the Network" mode
    items = devices.map((dev, idx) => {
      const vol = (dev.uploadBytes || 0) + (dev.downloadBytes || 0);
      return {
        id: dev.ip,
        name: dev.name || dev.hostname || dev.ip,
        subtext: dev.vendor || dev.ip,
        volume: vol,
        color: PALETTE[idx % PALETTE.length],
        icon: dev.icon || '📱',
        raw: dev
      };
    });

    totalVolume = items.reduce((acc, cur) => acc + cur.volume, 0);

    // If no device volume yet, provide placeholder slices so dial looks beautiful
    if (totalVolume === 0 && items.length > 0) {
      items.forEach((it) => (it.volume = 1));
      totalVolume = items.length;
    }
  } else {
    // Protocol breakdown mode
    const protocols = stats?.protocols || {};
    const protoDefs = [
      { name: 'TLS', count: protocols.TLS || 0, color: '#ff6a3d' },
      { name: 'DNS', count: protocols.DNS || 0, color: '#06b6d4' },
      { name: 'QUIC', count: protocols.QUIC || 0, color: '#8b5cf6' },
      { name: 'HTTP', count: (protocols.HTTP || 0) + (protocols.HTTP2 || 0), color: '#10b981' },
      { name: 'TCP', count: protocols.TCP || 0, color: '#f59e0b' },
      { name: 'UDP', count: protocols.UDP || 0, color: '#ec4899' },
    ];
    items = protoDefs.map((p) => ({
      id: p.name,
      name: `${p.name} Protocol`,
      subtext: `${p.count.toLocaleString()} packets`,
      volume: p.count,
      color: p.color,
      icon: '⚡'
    }));
    totalVolume = Math.max(1, stats?.totalPackets || 0);
  }

  // Sort descending by volume
  items.sort((a, b) => b.volume - a.volume);
  if (items.length === 0) {
    items = [{ id: 'none', name: 'No Active Clients', subtext: 'Connect a device to hotspot', volume: 1, color: '#94a3b8', icon: '📶' }];
    totalVolume = 1;
  }

  const activeItem = items[selectedIdx % items.length] || items[0];
  const activePct = totalVolume > 0 ? Math.round((activeItem.volume / totalVolume) * 100) : 0;

  // Build SVG Donut arc paths
  let cumulativeAngle = 0;
  const radius = 64;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 24;

  const arcs = items.slice(0, 7).map((item) => {
    const fraction = totalVolume > 0 ? (item.volume / totalVolume) : (1 / items.length);
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + Math.max(1.5, angle);
    cumulativeAngle += angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const isSelected = item.id === activeItem.id || (viewMode === 'devices' && selectedDeviceIp === item.id);

    return {
      id: item.id,
      name: item.name,
      color: item.color,
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      isSelected,
      pct: Math.round(fraction * 100),
      item
    };
  });

  const handleDialClick = () => {
    const nextIdx = (selectedIdx + 1) % items.length;
    setSelectedIdx(nextIdx);
    if (viewMode === 'devices' && onSelectDevice) {
      onSelectDevice(items[nextIdx].id === 'none' ? null : items[nextIdx].id);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Header of Dial Panel */}
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>{viewMode === 'devices' ? 'Network Usage Share' : 'Protocol Share'}</span>
        </h2>

        {/* View Mode Switcher Pill */}
        <div className="flex p-0.5 rounded-2xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm border border-slate-300/40 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => { setViewMode('devices'); setSelectedIdx(0); }}
            className={`px-3 py-1 rounded-xl transition-all ${
              viewMode === 'devices'
                ? 'bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-neu-accent-orange'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => { setViewMode('protocols'); setSelectedIdx(0); }}
            className={`px-3 py-1 rounded-xl transition-all ${
              viewMode === 'protocols'
                ? 'bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-neu-accent-orange'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Protocols
          </button>
        </div>
      </div>

      {/* The Tactile Extruded Dial Container */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-dial dark:shadow-neu-dark-dial border border-white/60 dark:border-white/5 my-2">
        {/* Recessed Groove Ring */}
        <div className="absolute inset-4 rounded-full shadow-neu-inset dark:shadow-neu-dark-inset pointer-events-none border border-slate-300/30 dark:border-slate-800" />

        {/* SVG Circular Donut Chart */}
        <svg className="w-48 h-48 sm:w-56 sm:h-56 transform -rotate-90 pointer-events-none" viewBox="0 0 200 200">
          {arcs.map((arc) => (
            <path
              key={arc.id}
              d={arc.path}
              fill="none"
              stroke={arc.isSelected ? arc.color : `${arc.color}55`}
              strokeWidth={arc.isSelected ? strokeWidth + 4 : strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          ))}
        </svg>

        {/* Highlighted Percentage Bubble */}
        <div
          className="absolute -top-1 sm:top-1 right-8 z-10 px-2.5 py-1 rounded-full text-white text-xs font-black shadow-md transition-all"
          style={{ backgroundColor: activeItem.color || '#ff6a3d' }}
        >
          {activePct}%
        </div>

        {/* Concentric Center Extruded Disc Button */}
        <button
          onClick={handleDialClick}
          className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/80 dark:border-white/10 flex flex-col items-center justify-center active-press cursor-pointer z-20 group"
          title="Click to cycle focused user / item"
        >
          {/* Inner Glow Disc */}
          <div
            className="w-10 h-10 rounded-full shadow-md flex items-center justify-center text-white mb-1 group-hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(135deg, ${activeItem.color}, #f43f5e)` }}
          >
            <span className="text-sm font-bold">↗</span>
          </div>

          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 font-mono">
            {stats?.packetsPerSec || 0} <span className="text-[9px] text-slate-400">PKT/S</span>
          </div>
        </button>
      </div>

      {/* Tactile Metric Pill Card */}
      <div
        onClick={handleDialClick}
        className="w-full max-w-[320px] sm:max-w-[340px] mt-3 p-3.5 rounded-2xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm border border-white/60 dark:border-white/5 flex items-center justify-between cursor-pointer active-press hover:scale-[1.01] transition-all"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0"
            style={{ backgroundColor: activeItem.color }}
          >
            {activeItem.icon || '📱'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {activeItem.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {activeItem.subtext}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs font-bold font-mono text-neu-accent-orange">
            {activePct}% Share
          </div>
          <div className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300">
            {viewMode === 'devices' ? formatBytes(activeItem.volume) : `${activeItem.volume.toLocaleString()} pkts`}
          </div>
        </div>
      </div>
    </div>
  );
}
