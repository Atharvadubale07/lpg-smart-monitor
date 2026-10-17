import React, { useState } from 'react';
import { Bell, AlertTriangle, ShieldAlert, Check, Info, CheckCheck } from 'lucide-react';

export default function AlertsDrawer({ alerts, onAcknowledgeAlert }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unack'

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unack') return !a.is_acknowledged;
    return true;
  });

  const unacknowledgedCount = alerts.filter(a => !a.is_acknowledged).length;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 relative">
              <Bell className="w-5 h-5" />
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Smart Refill & Anomaly Alert Center
                {unacknowledgedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                    {unacknowledgedCount} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Automated safety threshold and anomaly monitoring</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('unack')}
              className={`px-2.5 py-1 rounded-md transition ${filter === 'unack' ? 'bg-rose-950 text-rose-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Active ({unacknowledgedCount})
            </button>
          </div>
        </div>

        {/* Alert List */}
        <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredAlerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center">
              <CheckCheck className="w-8 h-8 text-slate-600 mb-2" />
              <span>No alerts found. Gas system operating normally.</span>
            </div>
          ) : (
            filteredAlerts.slice(0, 15).map((a) => {
              const isCrit = a.severity === 'critical';
              const isWarn = a.severity === 'warning';
              const isAck = Boolean(a.is_acknowledged);

              return (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                    isAck
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : isCrit
                        ? 'bg-rose-950/20 border-rose-800/80'
                        : isWarn
                          ? 'bg-amber-950/20 border-amber-800/80'
                          : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {isCrit ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isCrit ? 'text-rose-300' : (isWarn ? 'text-amber-300' : 'text-slate-200')}`}>
                          {a.alert_type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{a.message}</p>
                    </div>
                  </div>

                  {!isAck && (
                    <button
                      onClick={() => onAcknowledgeAlert(a.id)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] shrink-0 font-medium transition flex items-center gap-1"
                      title="Mark as resolved"
                    >
                      <Check className="w-3 h-3 text-emerald-400" /> Dismiss
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Anomaly threshold: &gt; 0.8 kg/hr drop</span>
        <span className="text-slate-500">Refill warning: &le; 3.5 kg</span>
      </div>
    </div>
  );
}
