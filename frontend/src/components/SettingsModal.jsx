import React, { useState, useEffect } from 'react';
import { X, Save, Sliders, Check } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [formData, setFormData] = useState({
    cylinder_name: 'Domestic 14.2 kg Cylinder',
    tare_weight: 15.3,
    full_lpg_capacity: 14.2,
    refill_threshold_days: 7,
    critical_threshold_kg: 2.0,
    warning_threshold_kg: 3.5,
    active_model: 'random_forest'
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  if (!isOpen) return null;

  // Preset quick selector
  const applyPreset = (preset) => {
    if (preset === '14.2kg') {
      setFormData(prev => ({
        ...prev,
        cylinder_name: 'Domestic 14.2 kg Cylinder',
        tare_weight: 15.3,
        full_lpg_capacity: 14.2,
        critical_threshold_kg: 2.0,
        warning_threshold_kg: 3.5
      }));
    } else if (preset === '5kg') {
      setFormData(prev => ({
        ...prev,
        cylinder_name: 'Composite / Mini 5 kg Cylinder',
        tare_weight: 5.0,
        full_lpg_capacity: 5.0,
        critical_threshold_kg: 0.8,
        warning_threshold_kg: 1.5
      }));
    } else if (preset === '19kg') {
      setFormData(prev => ({
        ...prev,
        cylinder_name: 'Commercial 19 kg Cylinder',
        tare_weight: 18.5,
        full_lpg_capacity: 19.0,
        critical_threshold_kg: 3.0,
        warning_threshold_kg: 5.0
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Cylinder & Threshold Configuration</h2>
            <p className="text-xs text-slate-400">Configure cylinder tare weight, full capacity & alert parameters</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <span className="text-xs text-slate-400">Cylinder Presets:</span>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => applyPreset('14.2kg')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-medium"
            >
              14.2 kg Domestic
            </button>
            <button
              type="button"
              onClick={() => applyPreset('5kg')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-medium"
            >
              5 kg Mini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('19kg')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-medium"
            >
              19 kg Commercial
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300">Cylinder Profile Name</label>
            <input
              type="text"
              value={formData.cylinder_name}
              onChange={(e) => setFormData({ ...formData, cylinder_name: e.target.value })}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">Tare Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.tare_weight}
                onChange={(e) => setFormData({ ...formData, tare_weight: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Full LPG Gas Capacity (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.full_lpg_capacity}
                onChange={(e) => setFormData({ ...formData, full_lpg_capacity: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">Warning Threshold (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.warning_threshold_kg}
                onChange={(e) => setFormData({ ...formData, warning_threshold_kg: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300">Critical Threshold (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.critical_threshold_kg}
                onChange={(e) => setFormData({ ...formData, critical_threshold_kg: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Refill Reminder Lead Time (Days)</label>
            <input
              type="number"
              value={formData.refill_threshold_days}
              onChange={(e) => setFormData({ ...formData, refill_threshold_days: parseInt(e.target.value) || 7 })}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Saved!' : 'Save Parameters'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
