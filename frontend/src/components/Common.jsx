import React from 'react';

export function KPICard({ title, value, subtitle, icon: Icon, trend, alert }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[#0F766E]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-[#172033]">{value}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-[#64748B] flex items-center gap-1.5">
            {trend && <span className="font-medium text-emerald-600">{trend}</span>}
            {alert && <span className="font-medium text-amber-600">{alert}</span>}
            <span>{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status, isLate, isAtRisk }) {
  if (isAtRisk) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
        At-Risk / Uncertain
      </span>
    );
  }
  if (isLate || status === 1) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
        Late Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
      On Time
    </span>
  );
}

export function EmptyState({ title = "No records found", description = "Try adjusting your search filters or generate a new prediction.", actionText, onAction }) {
  return (
    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#E5E7EB] bg-white">
      <h3 className="text-sm font-semibold text-[#172033]">{title}</h3>
      <p className="mt-1 text-xs text-[#64748B] max-w-sm mx-auto">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#0d655e] transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function LoadingSpinner({ message = "Loading DeliverIQ intelligence..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0F766E] animate-spin"></div>
      <p className="text-xs font-medium text-[#64748B]">{message}</p>
    </div>
  );
}

