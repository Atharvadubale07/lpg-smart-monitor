import React, { useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend 
} from 'recharts';
import { TrendingDown, BarChart3, CalendarClock, Layers } from 'lucide-react';

export default function ChartsView({ trajectory, dailyHistory, criticalThresholdKg }) {
  const [activeTab, setActiveTab] = useState('forecast'); // 'forecast' | 'daily' | 'dow'

  // Prepare Daily Consumption data
  const formattedDaily = dailyHistory.slice(-30).map(item => ({
    date: item.date ? item.date.slice(5) : '',
    consumption: item.consumption,
    is_weekend: item.is_weekend === 1,
    fill: item.is_weekend === 1 ? '#f59e0b' : '#38bdf8'
  }));

  // Day of week analysis
  const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowSums = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];

  dailyHistory.forEach(item => {
    if (item.date) {
      const d = new Date(item.date).getDay(); // 0 is Sunday
      const idx = d === 0 ? 6 : d - 1; // Map Sunday to 6, Mon to 0
      dowSums[idx] += item.consumption;
      dowCounts[idx] += 1;
    }
  });

  const dowData = dowNames.map((name, i) => ({
    day: name,
    avg_burn: dowCounts[i] > 0 ? Number((dowSums[i] / dowCounts[i]).toFixed(3)) : 0.4,
    is_weekend: i >= 5
  }));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
      {/* Chart Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {activeTab === 'forecast' ? <CalendarClock className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              {activeTab === 'forecast' && 'AI Depletion Trajectory & Confidence Projection'}
              {activeTab === 'daily' && '30-Day Daily LPG Consumption Trend (kg/day)'}
              {activeTab === 'dow' && 'Household Cooking Patterns by Day of Week'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTab === 'forecast' && 'Dynamic multi-day iterative rollout with tree-variance uncertainty bounds'}
              {activeTab === 'daily' && 'Realized daily burn rates showing weekday habits vs weekend cooking surges'}
              {activeTab === 'dow' && 'Normalized average daily consumption across Monday through Sunday'}
            </p>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'forecast'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Depletion Forecast
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'daily'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Burn
          </button>
          <button
            onClick={() => setActiveTab('dow')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'dow'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Day Analysis
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 mt-4">
        {activeTab === 'forecast' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="lpgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="boundsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                tickFormatter={(val) => val ? val.slice(5) : ''}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="kg" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(val, name) => [`${val} kg`, name === 'lpg_remaining' ? 'Predicted Remaining' : (name === 'upper_bound' ? 'Upper Bound' : 'Lower Bound')]}
                labelFormatter={(lbl) => `Projected Date: ${lbl}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(val) => <span className="text-xs text-slate-300 capitalize">{val.replace('_', ' ')}</span>}
              />
              <ReferenceLine y={criticalThresholdKg} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Refill Threshold', fill: '#f43f5e', fontSize: 10, position: 'insideTopLeft' }} />
              <Area type="monotone" dataKey="upper_bound" stroke="none" fill="url(#boundsGradient)" fillOpacity={1} />
              <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#090d16" fillOpacity={1} />
              <Area type="monotone" dataKey="lpg_remaining" stroke="#14b8a6" strokeWidth={2.5} fill="url(#lpgGradient)" dot={{ r: 2, fill: '#14b8a6' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'daily' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedDaily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="kg" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(val) => [`${val} kg`, 'Daily Burn']}
                labelFormatter={(lbl) => `Date: ${lbl}`}
              />
              <ReferenceLine y={0.42} stroke="#a855f7" strokeDasharray="3 3" label={{ value: 'Avg 0.42 kg/day', fill: '#c084fc', fontSize: 10, position: 'right' }} />
              <Bar dataKey="consumption" radius={[4, 4, 0, 0]} fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'dow' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="kg" domain={[0, 0.8]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(val) => [`${val} kg/day`, 'Average Burn']}
              />
              <ReferenceLine y={0.42} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Weekday Baseline', fill: '#94a3b8', fontSize: 10 }} />
              <Bar 
                dataKey="avg_burn" 
                radius={[6, 6, 0, 0]} 
                fill="#f59e0b"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Insight Footer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Projected Curve
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Weekend Peaks
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical Refill Zone (&le; {criticalThresholdKg} kg)
          </span>
        </div>
        <span className="text-[11px] text-slate-500 italic">
          Calculations recalculate automatically upon new load-cell packet
        </span>
      </div>
    </div>
  );
}
