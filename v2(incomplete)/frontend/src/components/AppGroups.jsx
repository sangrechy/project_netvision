import React, { useState } from 'react';

export default function AppGroups({ appStats, selectedApp, onSelectApp, selectedDeviceIp }) {
  const [search, setSearch] = useState('');

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter and sort apps
  const filteredApps = appStats
    .filter((app) => {
      // If a device is selected, only show apps used by that device
      if (selectedDeviceIp && (!app.clients || !app.clients.includes(selectedDeviceIp))) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          (app.category && app.category.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => b.totalBytes - a.totalBytes); // sorted by usage descending

  const maxBytes = Math.max(1, ...appStats.map((a) => a.totalBytes || 0));

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Grouped Applications</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-neu-accent-orange text-white">
              Sorted by Usage
            </span>
          </h3>
          <span className="text-xs font-bold text-slate-400">
            ({filteredApps.length})
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <input
            type="text"
            placeholder="Search app or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-xs bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm border border-slate-300/40 dark:border-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* App Cards Grid */}
      {filteredApps.length === 0 ? (
        <div className="p-8 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 text-center text-slate-400 text-xs">
          {selectedDeviceIp ? 'No application activity recorded for this device yet.' : 'Waiting for packet traffic to classify applications...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredApps.map((app, index) => {
            const isSelected = selectedApp === app.name;
            const pctOfMax = Math.max(4, Math.round((app.totalBytes / maxBytes) * 100));

            return (
              <div
                key={app.name}
                onClick={() => onSelectApp(isSelected ? null : app.name)}
                className={`p-4 rounded-2xl cursor-pointer transition-all active-press border ${
                  isSelected
                    ? 'bg-neu-light-hover dark:bg-neu-dark-hover shadow-neu-inset dark:shadow-neu-dark-inset border-neu-accent-orange/60'
                    : 'bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border-white/60 dark:border-white/5 hover:scale-[1.01]'
                }`}
              >
                {/* Top Row: Rank, Icon, App Name & Category */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Rank Badge */}
                    <span className="text-[10px] font-black font-mono w-5 h-5 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 text-slate-400 shrink-0">
                      #{index + 1}
                    </span>

                    {/* App Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                      style={{ backgroundColor: `${app.color}20`, border: `1px solid ${app.color}40` }}
                    >
                      {app.icon || '🌐'}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {app.name}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 truncate">
                        {app.category || 'Web Application'}
                      </div>
                    </div>
                  </div>

                  {/* Volume Badge */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                      {formatBytes(app.totalBytes)}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      {app.packetCount.toLocaleString()} pkts
                    </div>
                  </div>
                </div>

                {/* Recessed Progress Usage Bar */}
                <div className="mt-2.5">
                  <div className="w-full h-2 rounded-full bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm overflow-hidden p-0.5 border border-slate-300/30 dark:border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pctOfMax}%`,
                        backgroundColor: app.color || '#ff6a3d'
                      }}
                    />
                  </div>

                  {/* Footer Info: Upload/Download breakdown & client count */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
                    <div className="flex gap-2">
                      <span className="text-neu-accent-orange">↑ {formatBytes(app.uploadBytes)}</span>
                      <span className="text-neu-accent-cyan">↓ {formatBytes(app.downloadBytes)}</span>
                    </div>

                    <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">
                      {app.clientCount || (app.clients ? app.clients.length : 1)} {app.clientCount === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
