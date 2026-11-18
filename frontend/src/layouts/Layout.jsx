import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { fetchHealth } from '../services/api';
import { Activity, Bell, RefreshCw, Layers } from 'lucide-react';

const routeTitles = {
  '/': { title: 'Logistics Overview', subtitle: 'Live key performance indicators, on-time rates & dispatch health' },
  '/predict': { title: 'Predict Delivery Risk', subtitle: 'Real-time multi-tier inference with confidence scoring & explainability' },
  '/history': { title: 'Prediction History', subtitle: 'Audited log of past inference requests, filters & feature details' },
  '/analytics': { title: 'Logistics Analytics', subtitle: 'Outcome distributions, transit trends, market rates & weather impacts' },
  '/performance': { title: 'Model Performance & Validation', subtitle: 'Trained model metrics, confidence gain & multi-model benchmark' },
  '/settings': { title: 'System Settings', subtitle: 'Service health, configuration status & pipeline parameters' },
};

export default function Layout() {
  const location = useLocation();
  const [healthy, setHealthy] = useState(true);
  const [lastChecked, setLastChecked] = useState(new Date().toLocaleTimeString());

  const currentInfo = routeTitles[location.pathname] || {
    title: 'DeliverIQ Dashboard',
    subtitle: 'Logistics Analytics Platform'
  };

  const checkStatus = async () => {
    try {
      await fetchHealth();
      setHealthy(true);
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealthy(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-[#172033]">
      {/* Sidebar */}
      <Sidebar backendConnected={healthy} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-8 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-lg font-bold text-[#172033] tracking-tight">
              {currentInfo.title}
            </h1>
            <p className="text-xs text-[#64748B]">
              {currentInfo.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${healthy ? 'bg-teal-600' : 'bg-red-500'}`}></span>
              <span className="font-medium text-[#172033]">
                {healthy ? 'FastAPI Connected' : 'API Disconnected'}
              </span>
              <span className="text-[#64748B] text-[11px] ml-1">
                ({lastChecked})
              </span>
            </div>

            <button 
              onClick={checkStatus}
              title="Refresh connection status"
              className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#64748B] hover:text-[#172033] hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

