import React, { useState } from 'react';

export default function DeviceList({ devices, selectedDeviceIp, onSelectDevice }) {
  const [search, setSearch] = useState('');

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Selected device object
  const focusedDevice = devices.find((d) => d.ip === selectedDeviceIp);

  // Filter devices
  const filtered = devices
    .filter((d) => {
      const q = search.toLowerCase();
      return (
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.hostname && d.hostname.toLowerCase().includes(q)) ||
        (d.ip && d.ip.includes(q)) ||
        (d.mac && d.mac.toLowerCase().includes(q)) ||
        (d.vendor && d.vendor.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aTotal = (a.uploadBytes || 0) + (a.downloadBytes || 0);
      const bTotal = (b.uploadBytes || 0) + (b.downloadBytes || 0);
      return bTotal - aTotal; // Sorted by usage volume
    });

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Prominent User-First Profile Banner when a device is selected */}
      {focusedDevice && (
        <div className="p-5 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border-2 border-neu-accent-orange/40 flex flex-col gap-4 animate-scale-in">
          {/* Top User Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300/40 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm border border-white/60 dark:border-white/5">
                {focusedDevice.icon || '📱'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {focusedDevice.name || focusedDevice.hostname || focusedDevice.ip}
                  </h3>
                  <span className={`w-2 h-2 rounded-full ${focusedDevice.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{focusedDevice.vendor || 'Unknown Vendor'}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">{focusedDevice.ip}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">{focusedDevice.mac || 'No MAC'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-400">Total Consumed</div>
                <div className="text-base font-mono font-black text-neu-accent-orange">
                  {formatBytes((focusedDevice.uploadBytes || 0) + (focusedDevice.downloadBytes || 0))}
                </div>
              </div>
              <button
                onClick={() => onSelectDevice(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-slate-500 hover:text-slate-900 dark:hover:text-white active-press"
              >
                Clear Focus ✕
              </button>
            </div>
          </div>

          {/* User's Specific App Activity */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Apps Used by this Device
            </div>

            {focusedDevice.apps && Object.keys(focusedDevice.apps).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.values(focusedDevice.apps)
                  .sort((a, b) => b.bytes - a.bytes)
                  .map((userApp) => (
                    <div
                      key={userApp.name}
                      className="p-2.5 rounded-xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm border border-white/40 dark:border-white/5 flex items-center gap-2.5"
                    >
                      <span className="text-lg">{userApp.icon || '🌐'}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {userApp.name}
                        </div>
                        <div className="text-[10px] font-mono text-neu-accent-orange font-semibold">
                          {formatBytes(userApp.bytes)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Active connections are being monitored and categorized into apps...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Device List Header & Search */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Connected Devices & Users</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-neu-accent-orange/15 text-neu-accent-orange border border-neu-accent-orange/30">
              Ranked by Usage
            </span>
          </h3>
          <span className="text-xs font-bold text-slate-400">
            ({devices.length})
          </span>
        </div>

        {/* Recessed Search Input */}
        <div className="relative w-44 sm:w-56">
          <input
            type="text"
            placeholder="Search device name, IP, MAC..."
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

      {/* Device Grid */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 text-center text-slate-400 text-xs">
          No connected devices found matching filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((dev, idx) => {
            const isSelected = selectedDeviceIp === dev.ip;
            const totalDevBytes = (dev.uploadBytes || 0) + (dev.downloadBytes || 0);

            return (
              <div
                key={dev.ip}
                onClick={() => onSelectDevice(isSelected ? null : dev.ip)}
                className={`p-4 rounded-2xl cursor-pointer transition-all active-press border ${
                  isSelected
                    ? 'bg-neu-light-hover dark:bg-neu-dark-hover shadow-neu-inset dark:shadow-neu-dark-inset border-neu-accent-orange'
                    : 'bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border-white/60 dark:border-white/5 hover:scale-[1.01]'
                }`}
              >
                {/* Top Row: Rank, Icon, Name & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-black font-mono w-5 h-5 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 text-slate-400 shrink-0">
                      #{idx + 1}
                    </span>

                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm border border-white/60 dark:border-white/5 shrink-0">
                      {dev.icon || '📱'}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {dev.name || dev.hostname || dev.ip}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {dev.vendor || 'Unknown Vendor'}
                      </div>
                    </div>
                  </div>

                  {/* Online Badge */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${dev.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {dev.online ? 'Online' : 'Idle'}
                    </span>
                  </div>
                </div>

                {/* Middle: IP & MAC */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg my-2">
                  <span>{dev.ip}</span>
                  <span className="text-[10px]">{dev.mac || 'No MAC'}</span>
                </div>

                {/* Bottom Traffic Stats & Recessed Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Total Usage</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {formatBytes(totalDevBytes)}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm overflow-hidden flex">
                    <div
                      className="h-full bg-neu-accent-orange"
                      style={{ width: `${totalDevBytes > 0 ? ((dev.uploadBytes || 0) / totalDevBytes) * 100 : 50}%` }}
                      title={`Upload: ${formatBytes(dev.uploadBytes || 0)}`}
                    />
                    <div
                      className="h-full bg-neu-accent-cyan"
                      style={{ width: `${totalDevBytes > 0 ? ((dev.downloadBytes || 0) / totalDevBytes) * 100 : 50}%` }}
                      title={`Download: ${formatBytes(dev.downloadBytes || 0)}`}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                    <span className="text-neu-accent-orange">↑ {formatBytes(dev.uploadBytes || 0)}</span>
                    <span className="text-neu-accent-cyan">↓ {formatBytes(dev.downloadBytes || 0)}</span>
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
