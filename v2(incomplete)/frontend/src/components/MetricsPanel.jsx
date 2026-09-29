import React from 'react';

export default function MetricsPanel({ stats, onClearStats }) {
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const protocols = stats?.protocols || {};
  const total = Math.max(1, stats?.totalPackets || 0);

  const statItems = [
    { label: 'Total Packets', value: (stats?.totalPackets || 0).toLocaleString(), icon: '📦', color: 'text-neu-accent-orange' },
    { label: 'Throughput', value: `${formatBytes(stats?.bytesPerSec || 0)}/s`, icon: '⚡', color: 'text-amber-500' },
    { label: 'Upload', value: formatBytes(stats?.uploadBytes || 0), icon: '↑', color: 'text-neu-accent-orange' },
    { label: 'Download', value: formatBytes(stats?.downloadBytes || 0), icon: '↓', color: 'text-neu-accent-cyan' },
  ];

  const protoBadges = [
    { name: 'TLS', count: protocols.TLS || 0, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
    { name: 'DNS', count: protocols.DNS || 0, bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
    { name: 'QUIC', count: protocols.QUIC || 0, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    { name: 'HTTP', count: (protocols.HTTP || 0) + (protocols.HTTP2 || 0), bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { name: 'TCP', count: protocols.TCP || 0, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { name: 'UDP', count: protocols.UDP || 0, bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30' },
    { name: 'ICMP', count: protocols.ICMP || 0, bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    { name: 'DHCP', count: protocols.DHCP || 0, bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statItems.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm border border-white/60 dark:border-white/5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{item.label}</span>
              <span className={`text-base font-bold ${item.color}`}>{item.icon}</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-800 dark:text-slate-100 truncate">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Protocol Badge Strip */}
      <div className="p-4 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Protocol Breakdown
          </span>
          <button
            onClick={onClearStats}
            className="text-[11px] font-semibold text-slate-400 hover:text-neu-accent-orange active-press"
          >
            Reset Counters
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {protoBadges.map((proto) => {
            const pct = Math.round((proto.count / total) * 100);
            return (
              <div
                key={proto.name}
                className="p-2.5 rounded-xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm border border-white/40 dark:border-white/5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${proto.bg}`}>
                    {proto.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{pct}%</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                  {proto.count.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
