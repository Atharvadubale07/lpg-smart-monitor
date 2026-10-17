import React from 'react';
import { Flame, Scale, Layers } from 'lucide-react';

export default function CylinderGauge({ lpgRemaining, totalCapacity, rawWeight, tareWeight, refillStatus }) {
  const pct = Math.max(0, Math.min(100, (lpgRemaining / totalCapacity) * 100));
  
  // Theme color based on level
  let themeColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let barGradient = 'from-emerald-500 to-teal-400';
  let glowColor = 'rgba(16, 185, 129, 0.25)';

  if (refillStatus === 'CRITICAL' || pct < 15) {
    themeColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    barGradient = 'from-rose-500 to-red-400';
    glowColor = 'rgba(244, 63, 94, 0.35)';
  } else if (refillStatus === 'WARNING' || pct < 30) {
    themeColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    barGradient = 'from-amber-500 to-orange-400';
    glowColor = 'rgba(245, 158, 11, 0.3)';
  }

  return (
    <div className="relative bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur flex flex-col items-center justify-between h-full">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Cylinder Tank Level</h3>
            <p className="text-xs text-slate-400">Live Load-Cell Telemetry</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${themeColor}`}>
          {pct.toFixed(0)}% Filled
        </span>
      </div>

      {/* SVG Cylinder Graphic */}
      <div className="relative my-2 flex items-center justify-center">
        <div 
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none"
          style={{ background: glowColor }}
        />

        <div className="relative w-44 h-64 flex flex-col items-center">
          {/* Top Valve Guard / Collar */}
          <div className="w-20 h-6 border-2 border-slate-700 rounded-t-lg bg-slate-800/80 flex items-center justify-center relative shadow">
            {/* Center brass valve */}
            <div className="w-6 h-3 bg-amber-600 rounded-sm shadow-inner" />
            <div className="absolute -top-1 w-2 h-1 bg-amber-400 rounded-full" />
          </div>

          {/* Neck */}
          <div className="w-14 h-3 bg-slate-700 border-x border-slate-600" />

          {/* Cylinder Main Body */}
          <div className="relative w-40 h-48 rounded-3xl border-2 border-slate-700 bg-slate-950/90 overflow-hidden shadow-2xl flex flex-col justify-end">
            {/* Liquid Fill Level */}
            <div 
              className={`w-full bg-gradient-to-t ${barGradient} transition-all duration-1000 ease-out relative shadow-lg`}
              style={{ height: `${pct}%` }}
            >
              {/* Surface glow line */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/40 blur-[1px] animate-pulse" />
              
              {/* Subsurface bubbling particle highlights */}
              <div className="absolute inset-0 bg-radial from-white/10 to-transparent opacity-40 pointer-events-none" />
            </div>

            {/* Cylinder Body Shading Overlay (3D cylindrical shine) */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-white/10 to-black/50 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-700/60 pointer-events-none" />

            {/* Central Overlay Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {lpgRemaining.toFixed(2)} <span className="text-sm font-normal text-slate-300">kg</span>
              </span>
              <span className="text-xs uppercase tracking-wider text-slate-200/90 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Net LPG Gas
              </span>
            </div>
          </div>

          {/* Bottom Foot Ring */}
          <div className="w-32 h-4 border-2 border-slate-700 rounded-b-xl bg-slate-800/80 -mt-1 shadow" />
        </div>
      </div>

      {/* Weight Breakdown Formula Table */}
      <div className="w-full mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gross Wt (W_t)</p>
          <p className="text-xs font-semibold text-slate-200 mt-0.5">{rawWeight.toFixed(2)} kg</p>
        </div>
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tare (T)</p>
          <p className="text-xs font-semibold text-slate-200 mt-0.5">{tareWeight.toFixed(1)} kg</p>
        </div>
        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Net LPG (L_t)</p>
          <p className={`text-xs font-bold mt-0.5 ${refillStatus === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}`}>
            {lpgRemaining.toFixed(2)} kg
          </p>
        </div>
      </div>
    </div>
  );
}
