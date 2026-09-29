import React, { useState, useEffect } from 'react';
import socket from '../socket';

export default function RecordModal({ isOpen, onClose, recording }) {
  const [format, setFormat] = useState('json');
  const [recordingsList, setRecordingsList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchRecordings();
    }
  }, [isOpen]);

  const fetchRecordings = async () => {
    try {
      const res = await fetch('/api/recordings');
      if (res.ok) {
        const data = await res.json();
        setRecordingsList(data);
      }
    } catch (_) {}
  };

  const handleStartRecording = () => {
    socket.emit('start_recording', { format });
  };

  const handleStopRecording = () => {
    socket.emit('stop_recording');
    setTimeout(fetchRecordings, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-3xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-lg dark:shadow-neu-dark-lg border border-white/60 dark:border-white/10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300/40 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-rose-500 text-lg">●</span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Packet Capture Recording
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm text-slate-400 hover:text-slate-700 active-press"
          >
            ✕
          </button>
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col gap-3">
          {recording?.recording ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  RECORDING IN PROGRESS
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                  {recording.count} packets
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                File: {recording.filename}
              </div>
              <button
                onClick={handleStopRecording}
                className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md active-press"
              >
                Stop & Save Capture
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Format selection */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Export Format:</span>
                <div className="flex gap-2">
                  {['json', 'csv'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`px-3 py-1 rounded-xl uppercase font-bold text-[11px] active-press border ${
                        format === fmt
                          ? 'bg-neu-accent-orange text-white shadow-neu-inset-sm border-neu-accent-orange'
                          : 'bg-neu-light-surface dark:bg-neu-dark-surface text-slate-500 shadow-neu-sm dark:shadow-neu-dark-sm border-white/40 dark:border-white/5'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartRecording}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md active-press flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Start Recording Capture
              </button>
            </div>
          )}
        </div>

        {/* Existing Capture Recordings */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Saved Capture Files
          </span>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {recordingsList.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                No saved recordings yet.
              </div>
            ) : (
              recordingsList.map((file) => (
                <div
                  key={file.name}
                  className="p-2.5 rounded-xl bg-neu-light-surface dark:bg-neu-dark-surface shadow-neu-sm dark:shadow-neu-dark-sm border border-white/40 dark:border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <a
                    href={file.url}
                    download={file.name}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-700 hover:text-neu-accent-orange active-press shrink-0"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
