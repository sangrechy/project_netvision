import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import Header from './components/Header';
import GatewayCard from './components/GatewayCard';
import RadialStatsDial from './components/RadialStatsDial';
import MetricsPanel from './components/MetricsPanel';
import DeviceList from './components/DeviceList';
import AppGroups from './components/AppGroups';
import TrafficTable from './components/TrafficTable';
import RecordModal from './components/RecordModal';

const ROLLING_WINDOW_MS = 5000;
const MAX_PACKETS = 300;

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('netvision_theme') || 'light';
  });

  const [config, setConfig] = useState({
    iface: 'Wi-Fi',
    subnet: '192.168.137.',
    gatewayIp: '192.168.137.1',
    platform: 'win32'
  });
  const [status, setStatus] = useState({ running: true, mode: 'mock', hasTsharkBinary: false });
  const [interfaces, setInterfaces] = useState([]);
  const [devices, setDevices] = useState([]);
  const [appStats, setAppStats] = useState([]);
  const [stats, setStats] = useState({
    totalPackets: 0,
    uploadBytes: 0,
    downloadBytes: 0,
    packetsPerSec: 0,
    bytesPerSec: 0,
    protocols: {}
  });
  const [recording, setRecording] = useState(null);

  // Active UI filters & navigation
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'apps' | 'traffic'
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Rolling Packet Buffer
  const [packets, setPackets] = useState([]);
  const packetsRef = useRef([]);
  packetsRef.current = packets;

  // Apply Theme class
  useEffect(() => {
    localStorage.setItem('netvision_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Socket.IO event listeners
  useEffect(() => {
    socket.on('init', (data) => {
      if (data.config) setConfig(data.config);
      if (data.status) setStatus(data.status);
      if (data.interfaces) setInterfaces(data.interfaces);
      if (data.devices) setDevices(data.devices);
      if (data.stats) setStats(data.stats);
      if (data.appStats) setAppStats(data.appStats);
    });

    socket.on('status_change', (st) => setStatus(st));
    socket.on('config_change', (cfg) => setConfig(cfg));
    socket.on('stats', (st) => setStats(st));
    socket.on('devices', (devs) => setDevices(devs));
    socket.on('app_stats', (apps) => setAppStats(apps));

    socket.on('device_new', (dev) => {
      setDevices((prev) => {
        if (prev.some((d) => d.ip === dev.ip)) return prev;
        return [dev, ...prev];
      });
    });

    socket.on('device_update', (dev) => {
      setDevices((prev) => prev.map((d) => (d.ip === dev.ip ? dev : d)));
    });

    socket.on('recording_status', (rec) => setRecording(rec));

    // Ingest streaming packets into rolling 5-sec buffer
    socket.on('packets', (newBatch) => {
      const now = Date.now();
      const cutoff = now - ROLLING_WINDOW_MS;
      const combined = [...newBatch, ...packetsRef.current]
        .filter((p) => p.timestamp >= cutoff)
        .slice(0, MAX_PACKETS);
      setPackets(combined);
    });

    const purgeInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - ROLLING_WINDOW_MS;
      setPackets((prev) => prev.filter((p) => p.timestamp >= cutoff));
    }, 1000);

    return () => {
      socket.off('init');
      socket.off('status_change');
      socket.off('config_change');
      socket.off('stats');
      socket.off('devices');
      socket.off('app_stats');
      socket.off('device_new');
      socket.off('device_update');
      socket.off('recording_status');
      socket.off('packets');
      clearInterval(purgeInterval);
    };
  }, []);

  const handleClearStats = () => {
    socket.emit('clear_stats');
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Header */}
      <Header
        theme={theme}
        setTheme={setTheme}
        status={status}
        config={config}
        interfaces={interfaces}
        recording={recording}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
      />

      {/* Hero Showcase Grid: Gateway Card + Concentric Dial ("Who Uses the Network") */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Left: Tactile Node Card & Bandwidth Utilization */}
        <div className="p-6 rounded-4xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 flex flex-col items-center justify-center min-h-[380px]">
          <GatewayCard
            config={config}
            stats={stats}
            devicesCount={devices.filter((d) => d.online).length}
          />
        </div>

        {/* Right: The Concentric Extruded Dial (Showing Device Network Share) */}
        <div className="p-6 rounded-4xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 flex flex-col items-center justify-center min-h-[380px]">
          <RadialStatsDial
            stats={stats}
            devices={devices}
            selectedDeviceIp={selectedDeviceIp}
            onSelectDevice={setSelectedDeviceIp}
          />
        </div>
      </section>

      {/* Metrics Panel */}
      <MetricsPanel stats={stats} onClearStats={handleClearStats} />

      {/* Navigation Dock / View Selector (Inspired by bottom dock in mockup) */}
      <div className="flex items-center justify-center my-1">
        <div className="p-1.5 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all active-press flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-neu-accent-orange text-white shadow-neu-inset-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>⊞</span>
            <span>All-In-One</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all active-press flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-neu-accent-orange text-white shadow-neu-inset-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>👥</span>
            <span>Users & Devices ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('apps')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all active-press flex items-center gap-1.5 ${
              activeTab === 'apps'
                ? 'bg-neu-accent-orange text-white shadow-neu-inset-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>Apps & Services ({appStats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all active-press flex items-center gap-1.5 ${
              activeTab === 'traffic'
                ? 'bg-neu-accent-orange text-white shadow-neu-inset-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>⚡</span>
            <span>Live Stream ({packets.length})</span>
          </button>
        </div>
      </div>

      {/* Dynamic View Sections */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Grouped Applications Ranked by Usage */}
          <AppGroups
            appStats={appStats}
            selectedApp={selectedApp}
            onSelectApp={setSelectedApp}
            selectedDeviceIp={selectedDeviceIp}
          />

          {/* User & Device Cards */}
          <DeviceList
            devices={devices}
            selectedDeviceIp={selectedDeviceIp}
            onSelectDevice={setSelectedDeviceIp}
          />

          {/* Live Packet Table */}
          <TrafficTable
            packets={packets}
            selectedDeviceIp={selectedDeviceIp}
            onClearDeviceFilter={() => setSelectedDeviceIp(null)}
          />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="flex flex-col gap-6">
          <DeviceList
            devices={devices}
            selectedDeviceIp={selectedDeviceIp}
            onSelectDevice={setSelectedDeviceIp}
          />
          <AppGroups
            appStats={appStats}
            selectedApp={selectedApp}
            onSelectApp={setSelectedApp}
            selectedDeviceIp={selectedDeviceIp}
          />
        </div>
      )}

      {activeTab === 'apps' && (
        <AppGroups
          appStats={appStats}
          selectedApp={selectedApp}
          onSelectApp={setSelectedApp}
          selectedDeviceIp={selectedDeviceIp}
        />
      )}

      {activeTab === 'traffic' && (
        <TrafficTable
          packets={packets}
          selectedDeviceIp={selectedDeviceIp}
          onClearDeviceFilter={() => setSelectedDeviceIp(null)}
        />
      )}

      {/* Export Recording Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        recording={recording}
      />

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs font-medium text-slate-400">
        NetVision V2 • Passive Hotspot Traffic Intelligence • Windows & Linux Unified Engine
      </footer>
    </div>
  );
}
