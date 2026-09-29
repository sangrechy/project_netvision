import React, { useState } from 'react';

export default function TrafficTable({
  packets,
  selectedDeviceIp,
  onClearDeviceFilter
}) {
  const [selectedProto, setSelectedProto] = useState('ALL');
  const [selectedDirection, setSelectedDirection] = useState('ALL');
  const [search, setSearch] = useState('');
  const [inspectedPacket, setInspectedPacket] = useState(null);

  const protocols = ['ALL', 'TLS', 'DNS', 'QUIC', 'HTTP', 'TCP', 'UDP'];

  const filteredPackets = packets.filter((pkt) => {
    if (selectedProto !== 'ALL' && pkt.protocol !== selectedProto) return false;
    if (selectedDirection !== 'ALL' && pkt.direction !== selectedDirection) return false;
    if (selectedDeviceIp && pkt.clientIp !== selectedDeviceIp) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchDomain = pkt.domain && pkt.domain.toLowerCase().includes(q);
      const matchSrc = pkt.srcIp && pkt.srcIp.includes(q);
      const matchDst = pkt.dstIp && pkt.dstIp.includes(q);
      const matchInfo = pkt.info && pkt.info.toLowerCase().includes(q);
      if (!matchDomain && !matchSrc && !matchDst && !matchInfo) return false;
    }
    return true;
  });

  const getProtoBadge = (proto) => {
    switch (proto) {
      case 'TLS': return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'DNS': return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'QUIC': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'HTTP':
      case 'HTTP2': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'TCP': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'UDP': return 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30';
      default: return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Protocol Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {protocols.map((proto) => (
            <button
              key={proto}
              onClick={() => setSelectedProto(proto)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all active-press border ${
                selectedProto === proto
                  ? 'bg-neu-accent-orange text-white shadow-neu-inset-sm border-neu-accent-orange'
                  : 'bg-neu-light-surface dark:bg-neu-dark-surface text-slate-600 dark:text-slate-300 shadow-neu-sm dark:shadow-neu-dark-sm border-white/40 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>

        {/* Direction & Search */}
        <div className="flex items-center gap-2">
          {/* Direction toggle */}
          <div className="flex p-0.5 rounded-xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-inset-sm dark:shadow-neu-dark-inset-sm border border-slate-300/40 dark:border-slate-800">
            {['ALL', 'upload', 'download'].map((dir) => (
              <button
                key={dir}
                onClick={() => setSelectedDirection(dir)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedDirection === dir
                    ? 'bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-slate-800 dark:text-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {dir === 'ALL' ? 'Both' : dir === 'upload' ? '↑ Up' : '↓ Down'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-48 sm:w-56">
            <input
              type="text"
              placeholder="Search domain / IP..."
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
      </div>

      {/* Active Device Filter Banner */}
      {selectedDeviceIp && (
        <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-neu-accent-orange/10 border border-neu-accent-orange/30 text-xs text-neu-accent-orange font-bold">
          <span>Filtering traffic for device: <span className="font-mono">{selectedDeviceIp}</span></span>
          <button
            onClick={onClearDeviceFilter}
            className="px-2 py-0.5 rounded-lg bg-neu-accent-orange text-white text-[10px] hover:bg-orange-600 active-press"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Traffic Table Container */}
      <div className="w-full rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-flat dark:shadow-neu-dark-flat border border-white/60 dark:border-white/5 overflow-hidden">
        <div className="max-h-[460px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-neu-light-surface dark:bg-neu-dark-surface shadow-sm border-b border-slate-300/40 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-3">Dir</th>
                <th className="py-3 px-3">Proto</th>
                <th className="py-3 px-4">Domain / Destination</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3 text-right">Size</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 font-mono">
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-xs font-sans">
                    Waiting for packet stream or no packets matching filter...
                  </td>
                </tr>
              ) : (
                filteredPackets.map((pkt) => {
                  const date = new Date(pkt.timestamp);
                  const time = date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0');
                  const isUp = pkt.direction === 'upload';

                  return (
                    <tr
                      key={pkt.id}
                      onClick={() => setInspectedPacket(pkt)}
                      className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {/* Time */}
                      <td className="py-2 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {time}
                      </td>

                      {/* Direction */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`font-black text-xs ${
                            isUp ? 'text-neu-accent-orange' : 'text-neu-accent-cyan'
                          }`}
                        >
                          {isUp ? '↑ UP' : '↓ DN'}
                        </span>
                      </td>

                      {/* Protocol Badge */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getProtoBadge(pkt.protocol)}`}>
                          {pkt.protocol}
                        </span>
                      </td>

                      {/* Domain */}
                      <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={pkt.domain}>
                        {pkt.domain || pkt.dstIp}
                      </td>

                      {/* Client */}
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {pkt.clientIp || pkt.srcIp}
                      </td>

                      {/* Size */}
                      <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {pkt.length} B
                      </td>

                      {/* Details / Preview */}
                      <td className="py-2 px-4 font-sans text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[240px]" title={pkt.info}>
                        {pkt.info}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packet Inspector Drawer Modal */}
      {inspectedPacket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-lg dark:shadow-neu-dark-lg border border-white/60 dark:border-white/10 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-300/40 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getProtoBadge(inspectedPacket.protocol)}`}>
                  {inspectedPacket.protocol}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Packet Inspection
                </span>
              </div>
              <button
                onClick={() => setInspectedPacket(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-slate-400 hover:text-slate-700 active-press"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-bold">{new Date(inspectedPacket.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-slate-400">Direction:</span>
                <span className={`font-bold ${inspectedPacket.direction === 'upload' ? 'text-neu-accent-orange' : 'text-neu-accent-cyan'}`}>
                  {inspectedPacket.direction.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-slate-400">Source:</span>
                <span>{inspectedPacket.srcIp}:{inspectedPacket.srcPort || '—'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-slate-400">Destination:</span>
                <span>{inspectedPacket.dstIp}:{inspectedPacket.dstPort || '—'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-slate-400">Resolved Domain:</span>
                <span className="text-neu-accent-orange font-bold">{inspectedPacket.domain || 'None'}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-slate-400">Length:</span>
                <span>{inspectedPacket.length} bytes</span>
              </div>
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col gap-1">
                <span className="text-slate-400">Payload / Summary:</span>
                <span className="font-sans text-slate-800 dark:text-slate-200 break-words">{inspectedPacket.info}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectedPacket(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-neu-accent-orange text-white shadow-md active-press"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
