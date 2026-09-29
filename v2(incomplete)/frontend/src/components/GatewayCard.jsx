import React from 'react';

export default function GatewayCard({ config, stats, devicesCount }) {
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBytes = (stats?.uploadBytes || 0) + (stats?.downloadBytes || 0);
  const upFormatted = formatBytes(stats?.uploadBytes || 0);
  const downFormatted = formatBytes(stats?.downloadBytes || 0);

  // Simulated buffer/bandwidth load (percentage capped at 100)
  const quotaBytes = 1024 * 1024 * 1024; // 1 GB benchmark
  const pct = Math.min(100, Math.round((totalBytes / quotaBytes) * 100));

  return (
    <div className="w-full flex flex-col items-center">
      {/* The Tactile Floating Node Card (Inspired directly by the reference credit card) */}
      <div className="relative w-full max-w-[320px] sm:max-w-[340px] h-[210px] rounded-3xl p-5 overflow-hidden holo-gradient shadow-neu-flat dark:shadow-neu-dark-flat border border-white/80 dark:border-white/10 flex flex-col justify-between select-none transition-all hover:scale-[1.01]">
        {/* Iridescent background mesh overlay */}
        <div className="absolute inset-0 iridescent-overlay pointer-events-none" />

        {/* Abstract wavy lines graphic on bottom corner */}
        <svg
          className="absolute -bottom-6 -left-6 w-44 h-44 opacity-25 dark:opacity-15 pointer-events-none"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-neu-accent-cyan"
            d="M 10,120 Q 50,70 110,100 T 190,80"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-neu-accent-purple"
            d="M 10,140 Q 60,90 120,120 T 190,100"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-neu-accent-orange"
            d="M 10,160 Q 70,110 130,140 T 190,120"
          />
        </svg>

        {/* Card Header: Node ID & Smart Chip */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-widest text-slate-800 dark:text-slate-100">
              NET•NODE
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Gateway Node
            </span>
          </div>

          {/* Microchip Graphic */}
          <div className="w-10 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 dark:from-amber-600/70 dark:to-amber-800/80 shadow-inner flex items-center justify-center p-1 border border-amber-400/50">
            <div className="w-full h-full border border-amber-600/40 rounded flex flex-col justify-between p-0.5">
              <div className="flex justify-between h-1">
                <span className="w-1.5 bg-amber-700/60 rounded-full" />
                <span className="w-1.5 bg-amber-700/60 rounded-full" />
              </div>
              <div className="w-full h-0.5 bg-amber-700/50 rounded" />
              <div className="flex justify-between h-1">
                <span className="w-1.5 bg-amber-700/60 rounded-full" />
                <span className="w-1.5 bg-amber-700/60 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Card Middle: Gateway IPv4 & Interface */}
        <div className="relative z-10 my-auto">
          <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-slate-800 dark:text-slate-100 drop-shadow-sm">
            {config.gatewayIp || '192.168.137.1'}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>IF: {config.iface || 'wlan0'}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {devicesCount} Devices
            </span>
          </div>
        </div>

        {/* Card Footer: Traffic Direction Totals */}
        <div className="relative z-10 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="text-neu-accent-orange font-bold">↑</span>
            <span>{upFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="text-neu-accent-cyan font-bold">↓</span>
            <span>{downFormatted}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            V2.0-STABLE
          </div>
        </div>
      </div>

      {/* Pagination Indicator Dots (Matching mockup) */}
      <div className="flex items-center gap-1.5 my-3">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 transition-all" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

      {/* Balance & Recessed Slider (Matching mockup bottom section) */}
      <div className="w-full max-w-[320px] sm:max-w-[340px] px-2">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Total Throughput
          </span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {formatBytes(totalBytes)}
          </span>
        </div>

        {/* Recessed Slider Progress Track */}
        <div className="w-full h-3 rounded-full bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset dark:shadow-neu-dark-inset p-0.5 border border-slate-300/30 dark:border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neu-accent-orange via-amber-400 to-neu-accent-cyan shadow-sm transition-all duration-500"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-1.5">
          <span>Buffer Utilization</span>
          <span className="font-mono">{pct}% / 1.0 GB</span>
        </div>
      </div>
    </div>
  );
}
