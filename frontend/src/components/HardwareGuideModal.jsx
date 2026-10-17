import React, { useState } from 'react';
import { X, Copy, Check, Cpu, Wifi, Radio, ShieldCheck } from 'lucide-react';

export default function HardwareGuideModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const curlExample = `curl -X POST http://127.0.0.1:8000/api/readings/record \\
  -H "Content-Type: application/json" \\
  -d '{"raw_weight": 22.45, "tare_weight": 15.3, "battery_pct": 98.0, "rssi": -58, "source": "esp32"}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">ESP32 & Load Cell Hardware Setup</h2>
            <p className="text-xs text-slate-400">Physical wiring schematic, calibration formula & HTTP endpoint</p>
          </div>
        </div>

        {/* Pinout Table */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" /> Wiring Connection Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Component</th>
                  <th className="p-2.5">Pin / Wire</th>
                  <th className="p-2.5">ESP32 DevKit Pin</th>
                  <th className="p-2.5">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-2.5 font-medium">HX711 Module</td>
                  <td className="p-2.5">VCC</td>
                  <td className="p-2.5 text-amber-400 font-mono">VIN (5V)</td>
                  <td className="p-2.5">Excitation Power</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">HX711 Module</td>
                  <td className="p-2.5">GND</td>
                  <td className="p-2.5 text-amber-400 font-mono">GND</td>
                  <td className="p-2.5">System Ground</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">HX711 Module</td>
                  <td className="p-2.5">DT (Data)</td>
                  <td className="p-2.5 text-indigo-400 font-mono">GPIO 21</td>
                  <td className="p-2.5">24-bit Serial ADC Data</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">HX711 Module</td>
                  <td className="p-2.5">SCK (Clock)</td>
                  <td className="p-2.5 text-indigo-400 font-mono">GPIO 22</td>
                  <td className="p-2.5">Serial Clock Pulse</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Load Cell (4-wire)</td>
                  <td className="p-2.5">Red / Black / White / Green</td>
                  <td className="p-2.5 text-emerald-400 font-mono">E+, E-, A-, A+</td>
                  <td className="p-2.5">Wheatstone Bridge inputs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Calibration Formula */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <h4 className="text-xs font-semibold text-slate-200">Load Cell Calibration Equation</h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Place a certified 5.0 kg test weight on the platform after zeroing:
          </p>
          <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300">
            calibration_factor = (raw_adc_reading - tare_offset) / 5.0
          </div>
        </div>

        {/* API Endpoint & Curl */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-400" /> HTTP Ingestion Endpoint
            </span>
            <button
              onClick={copyCurl}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy cURL'}
            </button>
          </div>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono overflow-x-auto">
            {curlExample}
          </pre>
        </div>

        {/* Academic Safety Notice */}
        <div className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <span>
            <strong>Safety Compliance:</strong> For college laboratory demonstration and viva testing, initial load cell validation can be performed using an inert water canister matching cylinder dimensions before live LPG cylinder deployment. Never drill, modify, or tamper with any LPG cylinder valve.
          </span>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
