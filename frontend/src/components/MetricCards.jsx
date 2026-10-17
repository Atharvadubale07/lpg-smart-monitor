import React from 'react';
import { Flame, Clock, Calendar, AlertCircle, TrendingDown, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function MetricCards({ 
  lpgRemaining, 
  totalCapacity, 
  dailyUsage, 
  avg7dUsage, 
  daysLeft, 
  emptyDate, 
  refillStatus,
  activeModel
}) {
  const isUsageHigh = dailyUsage > (avg7dUsage * 1.15);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. LPG Remaining */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">LPG Remaining</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {lpgRemaining.toFixed(2)}
          </span>
          <span className="text-sm font-medium text-slate-400">kg</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Capacity: {totalCapacity.toFixed(1)} kg</span>
          <span className="font-semibold text-amber-400">
            {((lpgRemaining / totalCapacity) * 100).toFixed(0)}%
          </span>
        </div>
        {/* Subtle progress bar */}
        <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-amber-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, (lpgRemaining / totalCapacity) * 100))}%` }}
          />
        </div>
      </div>

      {/* 2. Daily Usage */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Usage</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {dailyUsage.toFixed(2)}
          </span>
          <span className="text-sm font-medium text-slate-400">kg/day</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">7-day avg: {avg7dUsage.toFixed(2)} kg</span>
          <span className={`font-medium ${isUsageHigh ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isUsageHigh ? '↑ Peak cooking' : '✓ Normal pace'}
          </span>
        </div>
        <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isUsageHigh ? 'bg-amber-400' : 'bg-blue-400'}`}
            style={{ width: `${Math.min(100, (dailyUsage / 1.0) * 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Estimated Days Left */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Days Left</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {daysLeft > 0 ? daysLeft.toFixed(1) : '0.0'}
          </span>
          <span className="text-sm font-medium text-slate-400">days</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Model: <span className="text-slate-200 capitalize">{activeModel.replace('_', ' ')}</span></span>
          <span className={daysLeft <= 5 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-medium'}>
            {daysLeft <= 3 ? 'Urgent depletion' : (daysLeft <= 7 ? 'Low reserves' : 'Sufficient gas')}
          </span>
        </div>
        <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${daysLeft <= 5 ? 'bg-rose-500' : 'bg-emerald-400'}`}
            style={{ width: `${Math.min(100, (daysLeft / 35) * 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Expected Empty Date & Refill Status */}
      <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden transition ${
        refillStatus === 'CRITICAL' 
          ? 'bg-rose-950/20 border-rose-800/80' 
          : refillStatus === 'WARNING' 
            ? 'bg-amber-950/20 border-amber-800/80' 
            : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Empty Date & Status</span>
          <div className={`p-2 rounded-xl ${
            refillStatus === 'CRITICAL' 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
              : refillStatus === 'WARNING'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
          }`}>
            {refillStatus === 'CRITICAL' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : refillStatus === 'WARNING' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Calendar className="w-5 h-5" />
            )}
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white tracking-tight">
            {emptyDate ? new Date(emptyDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Calculating...'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Refill Action:</span>
          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider ${
            refillStatus === 'CRITICAL' 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
              : refillStatus === 'WARNING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            {refillStatus === 'CRITICAL' ? 'Book Refill Now' : (refillStatus === 'WARNING' ? 'Monitor / Plan' : 'Optimal')}
          </span>
        </div>
        <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              refillStatus === 'CRITICAL' ? 'bg-rose-500' : (refillStatus === 'WARNING' ? 'bg-amber-500' : 'bg-indigo-400')
            }`}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
