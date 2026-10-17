import React, { useState } from 'react';
import { Play, FastForward, RotateCcw, AlertOctagon, Utensils, Zap, CheckCircle2 } from 'lucide-react';

export default function SimulationControls({ 
  onSimulateCook, 
  onSimulateAdvanceDay, 
  onSimulateRefill, 
  onSimulateAnomaly, 
  onResetSimulation,
  isOperating 
}) {
  const [mealType, setMealType] = useState('Lunch');
  const [cookAmount, setCookAmount] = useState(0.25);
  const [lastAction, setLastAction] = useState(null);

  const handleAction = async (actionFn, actionName) => {
    try {
      const res = await actionFn();
      setLastAction({ name: actionName, time: new Date().toLocaleTimeString(), res });
      setTimeout(() => setLastAction(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Interactive Hardware & IoT Simulation Sandbox
            </h3>
            <p className="text-xs text-slate-400">
              Test real-time load-cell weight triggers, cooking sessions, cylinder refills, and leak alarms
            </p>
          </div>
        </div>

        {lastAction && (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{lastAction.name} executed at {lastAction.time}</span>
          </div>
        )}
      </div>

      {/* Control Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
        {/* 1. Simulate Cooking Meal */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Utensils className="w-4 h-4 text-amber-400" />
              <span>Simulate Cooking Meal</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Burns {cookAmount} kg gas and logs sensor update.</p>
            
            <div className="flex items-center gap-2 mt-3">
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Breakfast">Breakfast (0.15 kg)</option>
                <option value="Lunch">Lunch (0.25 kg)</option>
                <option value="Dinner">Dinner (0.35 kg)</option>
                <option value="Feast">Feast / Party (0.65 kg)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              const amounts = { Breakfast: 0.15, Lunch: 0.25, Dinner: 0.35, Feast: 0.65 };
              handleAction(() => onSimulateCook(amounts[mealType] || 0.25, mealType), `Cooking ${mealType}`);
            }}
            disabled={isOperating}
            className="w-full mt-4 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-white" /> Burn Gas
          </button>
        </div>

        {/* 2. Fast-forward 1 Day */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FastForward className="w-4 h-4 text-blue-400" />
              <span>Advance 1 Day</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Advances timeline by 24h with realistic household consumption (~0.42 kg).
            </p>
          </div>

          <button
            onClick={() => handleAction(onSimulateAdvanceDay, 'Advance 1 Day')}
            disabled={isOperating}
            className="w-full mt-4 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <FastForward className="w-3.5 h-3.5" /> Next Day
          </button>
        </div>

        {/* 3. Refill / Swap Cylinder */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Cylinder Replacement</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Replaces empty cylinder with a fresh 14.2 kg cylinder and begins a new cycle.
            </p>
          </div>

          <button
            onClick={() => handleAction(onSimulateRefill, 'Cylinder Refill')}
            disabled={isOperating}
            className="w-full mt-4 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refill Cylinder
          </button>
        </div>

        {/* 4. Inject Anomaly Drop */}
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Inject Leak / Anomaly</span>
            </div>
            <p className="text-[11px] text-rose-300/80 mt-1">
              Simulates a sudden abnormal 1.35 kg drop to trigger real-time AI anomaly detection!
            </p>
          </div>

          <button
            onClick={() => handleAction(onSimulateAnomaly, 'Anomaly Injection')}
            disabled={isOperating}
            className="w-full mt-4 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <AlertOctagon className="w-3.5 h-3.5" /> Trigger Anomaly
          </button>
        </div>
      </div>

      {/* Dataset Reset Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Need fresh multi-cycle training data?</span>
        <button
          onClick={() => handleAction(onResetSimulation, 'Dataset Reset')}
          disabled={isOperating}
          className="text-slate-400 hover:text-slate-200 underline font-medium"
        >
          Reset to 75-Day Baseline Dataset
        </button>
      </div>
    </div>
  );
}
