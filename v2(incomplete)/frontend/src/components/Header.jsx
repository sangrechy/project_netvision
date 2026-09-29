import React, { useState, useEffect } from 'react';
import socket from '../socket';

export default function Header({
  theme,
  setTheme,
  status,
  config,
  interfaces,
  recording,
  onOpenRecordModal
}) {
  const [timeStr, setTimeStr] = useState('');
  const [showIfaceDropdown, setShowIfaceDropdown] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCapturing = status?.running ?? false;
  const isMock = status?.mode === 'mock';

  const handleToggleCapture = () => {
    socket.emit('toggle_capture', { start: !isCapturing });
  };

  const handleToggleMock = () => {
    socket.emit('toggle_mock', { forceMock: !isMock });
  };

  const handleSelectIface = (ifaceName) => {
    socket.emit('change_interface', { iface: ifaceName });
    setShowIfaceDropdown(false);
  };

  return (
    <header className="w-full flex flex-col lg:flex-row items-center justify-between gap-4 py-4 px-6 mb-6 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 transition-all">
      {/* Brand & Status */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-neu-accent-orange text-2xl font-bold">
          ⚡
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              NETVISION <span className="text-neu-accent-orange text-sm font-black px-2 py-0.5 rounded-full bg-neu-accent-orange/10 border border-neu-accent-orange/20">V2</span>
            </h1>
            <span className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Passive Hotspot Traffic Intelligence • {config.platform === 'win32' ? 'Windows' : 'Linux'}
          </p>
        </div>
      </div>

      {/* Center Controls: Interface & Subnet */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Interface Picker */}
        <div className="relative">
          <button
            onClick={() => setShowIfaceDropdown(!showIfaceDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm hover:text-neu-accent-orange active-press border border-white/40 dark:border-white/5"
            title="Select capture interface"
          >
            <span className="text-slate-400">IF:</span>
            <span className="font-mono text-slate-700 dark:text-slate-200">{config.iface || 'Auto'}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {showIfaceDropdown && (
            <div className="absolute top-full left-0 mt-2 w-56 p-2 rounded-2xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-lg dark:shadow-neu-dark-lg border border-white/60 dark:border-white/10 z-50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">
                Network Adapters
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {interfaces.map((iface) => (
                  <button
                    key={iface.name}
                    onClick={() => handleSelectIface(iface.name)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex flex-col transition-all ${
                      config.iface === iface.name
                        ? 'bg-neu-accent-orange text-white font-semibold'
                        : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-medium truncate">{iface.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">{iface.address}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subnet Pill */}
        <div className="px-3.5 py-2 rounded-2xl text-xs font-mono bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm border border-white/40 dark:border-white/5 text-slate-600 dark:text-slate-300">
          <span className="text-slate-400 font-sans text-[11px] mr-1">Subnet:</span>
          {config.subnet}*
        </div>

        {/* Mock Mode Pill Button */}
        <button
          onClick={handleToggleMock}
          className={`px-3 py-2 rounded-2xl text-xs font-bold active-press transition-all border ${
            isMock
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm'
              : 'bg-neu-light-surface dark:bg-neu-dark-surface text-slate-600 dark:text-slate-300 shadow-neu-sm dark:shadow-neu-dark-sm border-white/40 dark:border-white/5'
          }`}
          title="Toggle between live Tshark capture and simulated test stream"
        >
          {isMock ? '✦ Simulated Mock' : '⚡ Tshark Live'}
        </button>

        {/* Recording Trigger */}
        <button
          onClick={onOpenRecordModal}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold active-press transition-all border ${
            recording?.recording
              ? 'bg-rose-500 text-white border-rose-600 shadow-neu-inset-sm animate-pulse'
              : 'bg-neu-light-surface dark:bg-neu-dark-surface text-slate-700 dark:text-slate-300 shadow-neu-sm dark:shadow-neu-dark-sm border-white/40 dark:border-white/5 hover:text-rose-500'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>{recording?.recording ? `REC (${recording.count})` : 'Record'}</span>
        </button>
      </div>

      {/* Right Controls: Tactile Rocker Switch, Theme Toggle & Clock */}
      <div className="flex items-center gap-4">
        {/* Tactile Capture Rocker Switch (Modeled after reference mockup) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {isCapturing ? 'Active' : 'Paused'}
          </span>
          <div
            onClick={handleToggleCapture}
            className="w-16 h-8 rounded-full p-1 cursor-pointer bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset dark:shadow-neu-dark-inset border border-slate-300/40 dark:border-slate-800 flex items-center transition-all select-none"
            title="Toggle Live Capture"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-neu-sm transition-transform duration-300 ${
                isCapturing
                  ? 'translate-x-8 bg-gradient-to-r from-neu-accent-orange to-red-500'
                  : 'translate-x-0 bg-slate-400 dark:bg-slate-600'
              }`}
            >
              {isCapturing ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>

        {/* Theme Toggle Pill (Sun / Moon) */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm active-press border border-white/50 dark:border-white/5 text-slate-700 dark:text-amber-400 hover:scale-105 transition-all"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Clock */}
        <div className="hidden sm:block text-xs font-mono font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm">
          {timeStr}
        </div>
      </div>
    </header>
  );
}
