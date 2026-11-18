import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  CheckCircle, 
  RefreshCw, 
  Layers, 
  Terminal, 
  ShieldCheck,
  Code
} from 'lucide-react';
import { fetchHealth, fetchModelInfo } from '../services/api';
import { LoadingSpinner } from '../components/Common';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      setRefreshing(true);
      const [h, m] = await Promise.all([
        fetchHealth().catch(e => ({ status: 'error', detail: e.message })),
        fetchModelInfo().catch(() => null)
      ]);
      setHealth(h);
      setModelInfo(m);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner message="Inspecting service environments..." />;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Service Status Overview */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">DeliverIQ Operational Environment</h2>
            <p className="text-xs text-[#64748B]">Service health, database connectivity & active runtime parameters</p>
          </div>
          <button
            onClick={loadSettingsData}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#172033] hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase">
              <Server className="w-4 h-4 text-[#0F766E]" />
              FastAPI Backend
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className="text-sm font-bold text-[#172033]">
                {health?.status === 'healthy' ? 'Online & Healthy' : 'Disconnected'}
              </span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 font-mono">
              Port: 8000 • Env: {health?.environment || 'dev'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase">
              <Cpu className="w-4 h-4 text-[#0F766E]" />
              Inference Service
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${modelInfo?.status ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className="text-sm font-bold text-[#172033]">
                {modelInfo?.status || 'Unavailable'}
              </span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              4 Tiers Loaded in RAM
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase">
              <Database className="w-4 h-4 text-[#0F766E]" />
              Persistence Store
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-[#172033]">
                SQLite (SQLAlchemy)
              </span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 font-mono">
              File: deliveriq.db
            </div>
          </div>
        </div>
      </div>

      {/* Model Configuration & Preprocessing Spec */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs">
        <h3 className="text-sm font-bold text-[#172033] mb-1">Active Pipeline Hyperparameters & Features</h3>
        <p className="text-xs text-[#64748B] mb-4">Features selected through Mutual Information ranking (Top-30)</p>

        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-[#64748B] block mb-2 uppercase tracking-wider">
              Selected 30 Features in Production Pipeline
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 rounded-lg bg-slate-50 border border-slate-200">
              {modelInfo?.selected_features?.map((feat, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded text-[11px] font-mono bg-white border border-slate-200 text-slate-700"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Confidence Margin:</span>{' '}
              <span className="font-mono font-bold text-[#172033]">±{(modelInfo?.confidence_margin * 100).toFixed(0)}%</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Predictions within threshold ± margin are marked as At-Risk Band.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Standard Class Tuned Threshold:</span>{' '}
              <span className="font-mono font-bold text-[#172033]">
                {modelInfo?.cascade_thresholds?.['Standard Class']}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Calibrated via out-of-fold sweep on unbalance LightGBM.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack Credits */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs text-xs text-[#64748B] space-y-2">
        <div className="font-bold text-[#172033] flex items-center gap-1.5">
          <Code className="w-4 h-4 text-[#0F766E]" />
          Platform Architecture
        </div>
        <p>
          <strong>Frontend:</strong> React 19, Vite, Tailwind CSS v4, React Router 7, Recharts, Lucide Icons.
        </p>
        <p>
          <strong>Backend:</strong> Python FastAPI, Pydantic, SQLAlchemy, SQLite, Uvicorn ASGI.
        </p>
        <p>
          <strong>Machine Learning:</strong> Scikit-Learn, LightGBM, XGBoost, Category Encoders, Joblib.
        </p>
      </div>
    </div>
  );
}

