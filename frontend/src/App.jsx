import React, { useState, useEffect } from 'react';
import { 
  Flame, Wifi, Battery, RefreshCw, Cpu, Sliders, AlertTriangle, 
  CheckCircle2, ShieldAlert, Sparkles, ChevronRight 
} from 'lucide-react';

import CylinderGauge from './components/CylinderGauge';
import MetricCards from './components/MetricCards';
import ChartsView from './components/ChartsView';
import MLComparisonPanel from './components/MLComparisonPanel';
import AlertsDrawer from './components/AlertsDrawer';
import SimulationControls from './components/SimulationControls';
import HardwareGuideModal from './components/HardwareGuideModal';
import SettingsModal from './components/SettingsModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [status, setStatus] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [isOperating, setIsOperating] = useState(false);

  // Modals
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Fetch all core system data
  const fetchData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [statusRes, predictRes, analyticsRes, alertsRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/status`).then(r => r.json()),
        fetch(`${API_BASE}/api/predict`).then(r => r.json()),
        fetch(`${API_BASE}/api/analytics/consumption`).then(r => r.json()),
        fetch(`${API_BASE}/api/alerts`).then(r => r.json()),
        fetch(`${API_BASE}/api/settings`).then(r => r.json())
      ]);

      setStatus(statusRes);
      setPrediction(predictRes);
      setAnalytics(analyticsRes);
      setAlerts(alertsRes.alerts || []);
      setSettings(settingsRes);
    } catch (err) {
      console.error('Error fetching LPG dashboard data:', err);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Periodic refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleSelectModel = async (modelId) => {
    try {
      const res = await fetch(`${API_BASE}/api/predict?model=${modelId}`).then(r => r.json());
      setPrediction(res);
      // update setting
      if (settings) {
        await fetch(`${API_BASE}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...settings, active_model: modelId })
        });
        setSettings(prev => ({ ...prev, active_model: modelId }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetrainModels = async () => {
    setIsRetraining(true);
    try {
      await fetch(`${API_BASE}/api/train`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetraining(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_acknowledged: 1 } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      }).then(r => r.json());
      setSettings(res.settings);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Simulation actions
  const handleSimulateCook = async (amount, meal) => {
    setIsOperating(true);
    try {
      await fetch(`${API_BASE}/api/simulate/cook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kg: amount, meal_type: meal })
      });
      await fetchData();
    } finally {
      setIsOperating(false);
    }
  };

  const handleSimulateAdvanceDay = async () => {
    setIsOperating(true);
    try {
      await fetch(`${API_BASE}/api/simulate/advance-day`, { method: 'POST' });
      await fetchData();
    } finally {
      setIsOperating(false);
    }
  };

  const handleSimulateRefill = async () => {
    setIsOperating(true);
    try {
      await fetch(`${API_BASE}/api/simulate/refill`, { method: 'POST' });
      await fetchData();
    } finally {
      setIsOperating(false);
    }
  };

  const handleSimulateAnomaly = async () => {
    setIsOperating(true);
    try {
      await fetch(`${API_BASE}/api/simulate/anomaly`, { method: 'POST' });
      await fetchData();
    } finally {
      setIsOperating(false);
    }
  };

  const handleResetSimulation = async () => {
    setIsOperating(true);
    try {
      await fetch(`${API_BASE}/api/simulate/reset`, { method: 'POST' });
      await fetchData();
    } finally {
      setIsOperating(false);
    }
  };

  // Critical alerts filter
  const unackCriticalAlert = alerts.find(a => !a.is_acknowledged && a.severity === 'critical');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Flame className="w-7 h-7 text-amber-500 absolute inset-0 m-auto" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-200">
          Connecting to Smart LPG Load Cell Telemetry & ML Engine...
        </p>
      </div>
    );
  }

  const lpgRemaining = status?.lpg_remaining ?? 7.18;
  const rawWeight = status?.raw_weight ?? 22.48;
  const tareWeight = status?.tare_weight ?? 15.3;
  const fullCapacity = settings?.full_lpg_capacity ?? 14.2;
  const refillStatus = status?.refill_status ?? 'NORMAL';

  const dailyHistory = analytics?.daily || [];
  const todayRecord = dailyHistory.length > 0 ? dailyHistory[dailyHistory.length - 1] : null;
  const dailyUsage = todayRecord ? todayRecord.consumption : 0.42;
  const avg7dUsage = analytics?.stats?.avg_7d ?? 0.42;

  const daysLeft = prediction?.days_left ?? 15.5;
  const emptyDate = prediction?.empty_date ?? '';
  const trajectory = prediction?.trajectory || [];
  const modelMetrics = prediction?.model_metrics || {};
  const comparison = prediction?.comparison || {};
  const activeModel = prediction?.active_model || 'random_forest';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 ring-1 ring-orange-400/40">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Smart LPG AI Monitor</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  IoT + ML
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consumption Forecasting, Empty-Date Prediction & Smart Refill System
              </p>
            </div>
          </div>

          {/* Right Status Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Sensor Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">ESP32: Online</span>
              <span className="text-[10px] text-slate-500">({status?.source})</span>
            </div>

            {/* Battery & RSSI */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-blue-400" />
                <span>{status?.rssi ?? -55} dBm</span>
              </div>
              <div className="flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span>{status?.battery_pct ? `${status.battery_pct.toFixed(0)}%` : '100%'}</span>
              </div>
            </div>

            {/* Hardware Guide Button */}
            <button
              onClick={() => setIsHardwareModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>ESP32 Setup</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Cylinder Profile & Threshold Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Urgent / Anomaly Banner */}
      {unackCriticalAlert && (
        <div className="bg-rose-950/80 border-b border-rose-800 px-4 py-2.5 text-rose-200 text-xs flex items-center justify-between shadow-lg">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span>
                <strong>CRITICAL SAFETY / REFILL ALERT:</strong> {unackCriticalAlert.message}
              </span>
            </div>
            <button
              onClick={() => handleAcknowledgeAlert(unackCriticalAlert.id)}
              className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-[11px] font-semibold shrink-0 transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 w-full">
        {/* Row 1: Key Metric Cards */}
        <MetricCards
          lpgRemaining={lpgRemaining}
          totalCapacity={fullCapacity}
          dailyUsage={dailyUsage}
          avg7dUsage={avg7dUsage}
          daysLeft={daysLeft}
          emptyDate={emptyDate}
          refillStatus={refillStatus}
          activeModel={activeModel}
        />

        {/* Row 2: Visual Cylinder Gauge + Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cylinder SVG Tank Gauge */}
          <div className="lg:col-span-4 h-full">
            <CylinderGauge
              lpgRemaining={lpgRemaining}
              totalCapacity={fullCapacity}
              rawWeight={rawWeight}
              tareWeight={tareWeight}
              refillStatus={refillStatus}
            />
          </div>

          {/* Interactive Recharts */}
          <div className="lg:col-span-8 h-full">
            <ChartsView
              trajectory={trajectory}
              dailyHistory={dailyHistory}
              criticalThresholdKg={settings?.critical_threshold_kg ?? 2.0}
            />
          </div>
        </div>

        {/* Row 3: ML Comparison & Evaluation + Alert Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ML Benchmark & Comparative Models */}
          <div className="lg:col-span-8">
            <MLComparisonPanel
              modelMetrics={modelMetrics}
              comparison={comparison}
              activeModel={activeModel}
              onSelectModel={handleSelectModel}
              onRetrainModels={handleRetrainModels}
              isRetraining={isRetraining}
            />
          </div>

          {/* Alert Center */}
          <div className="lg:col-span-4">
            <AlertsDrawer
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
            />
          </div>
        </div>

        {/* Row 4: Interactive Simulation & IoT Hardware Sandbox */}
        <div>
          <SimulationControls
            onSimulateCook={handleSimulateCook}
            onSimulateAdvanceDay={handleSimulateAdvanceDay}
            onSimulateRefill={handleSimulateRefill}
            onSimulateAnomaly={handleSimulateAnomaly}
            onResetSimulation={handleResetSimulation}
            isOperating={isOperating}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          AI-Based LPG Consumption Forecasting, Empty-Date Prediction and Smart Refill Alert System &bull; ESP32 + HX711 + FastAPI + React
        </p>
      </footer>

      {/* Modals */}
      <HardwareGuideModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
