import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  BarChart3, 
  Cpu, 
  Settings,
  Truck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Predict Delivery', path: '/predict', icon: Send },
  { name: 'Prediction History', path: '/history', icon: History },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Model Performance', path: '/performance', icon: Cpu },
  { name: 'Settings', path: '/settings', icon: Settings }
];

export default function Sidebar({ backendConnected = true }) {
  return (
    <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 min-h-screen border-r border-gray-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800/80 gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-sm">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            DeliverIQ
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#14B8A6]/20 text-[#14B8A6] font-semibold border border-[#14B8A6]/30 uppercase">
              ML 1.0
            </span>
          </div>
          <div className="text-xs text-gray-400">Logistics AI Platform</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-gray-900 border border-gray-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 font-medium">Inference Engine</span>
          {backendConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Operational
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Offline
            </span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-400">
          Cascade Model (4 Tiers Active)
        </div>
      </div>
    </aside>
  );
}

