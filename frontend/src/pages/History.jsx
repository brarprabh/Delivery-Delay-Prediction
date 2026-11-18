import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  RotateCcw, 
  Calendar, 
  FileText, 
  X,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { fetchPredictions, fetchPredictionDetail } from '../services/api';
import { StatusBadge, EmptyState, LoadingSpinner } from '../components/Common';

export default function History() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [shippingMode, setShippingMode] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [market, setMarket] = useState('');

  useEffect(() => {
    loadRecords();
  }, [shippingMode, riskLevel, market]);

  useEffect(() => {
    if (highlightId) {
      loadDetail(highlightId);
    }
  }, [highlightId]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = {};
      if (shippingMode) params.shipping_mode = shippingMode;
      if (riskLevel) params.risk_level = riskLevel;
      if (market) params.market = market;
      if (search) params.search = search;
      
      const res = await fetchPredictions(params);
      setRecords(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRecords();
  };

  const loadDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetchPredictionDetail(id);
      setSelectedRecord(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setShippingMode('');
    setRiskLevel('');
    setMarket('');
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search city, region, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          {/* Shipping Mode */}
          <div>
            <select
              value={shippingMode}
              onChange={(e) => setShippingMode(e.target.value)}
              className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Shipping Modes</option>
              <option value="Standard Class">Standard Class</option>
              <option value="Second Class">Second Class</option>
              <option value="First Class">First Class</option>
              <option value="Same Day">Same Day</option>
            </select>
          </div>

          {/* Risk Level */}
          <div>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Risk Levels</option>
              <option value="High Risk (Late Likely)">High Risk</option>
              <option value="Low Risk (On-Time Likely)">Low Risk</option>
              <option value="At-Risk / Uncertain">At-Risk Band (Uncertain)</option>
            </select>
          </div>

          {/* Market */}
          <div>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full text-xs py-2.5 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">All Markets</option>
              <option value="Pacific Asia">Pacific Asia</option>
              <option value="USCA">USCA</option>
              <option value="Europe">Europe</option>
              <option value="LATAM">LATAM</option>
              <option value="Africa">Africa</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 text-xs py-2.5 px-4 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d655e] transition"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-[#64748B]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Records Table */}
        <div className={`${selectedRecord ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden transition-all`}>
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Audited Inferences ({records.length})
            </div>
            <span className="text-[11px] text-[#64748B]">Persisted in SQLite database</span>
          </div>

          {loading ? (
            <LoadingSpinner message="Querying database..." />
          ) : records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#64748B] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Market / City</th>
                    <th className="py-3 px-3">Days</th>
                    <th className="py-3 px-3">Probability</th>
                    <th className="py-3 px-3">Outcome</th>
                    <th className="py-3 px-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {records.map((r) => {
                    const isSelected = selectedRecord?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => loadDetail(r.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-teal-50/70 border-l-4 border-l-[#0F766E]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">#{r.id}</td>
                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#172033]">{r.shipping_mode}</td>
                        <td className="py-3 px-3 text-[#64748B] truncate max-w-[140px]" title={`${r.order_city}, ${r.market}`}>
                          {r.order_city || '—'}, {r.market}
                        </td>
                        <td className="py-3 px-3 font-mono">{r.days_scheduled}d</td>
                        <td className="py-3 px-3 font-mono font-semibold">
                          {(r.probability * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={r.late_delivery_risk} isAtRisk={r.is_at_risk} />
                        </td>
                        <td className="py-3 px-3 text-right text-[#0F766E]">
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState
                title="No prediction history matches criteria"
                description="Adjust or reset your filters above to see more audited prediction records."
                actionText="Reset Filters"
                onAction={handleResetFilters}
              />
            </div>
          )}
        </div>

        {/* Selected Record Detail Panel */}
        {selectedRecord && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Prediction Record #{selectedRecord.id}
                </h3>
                <span className="text-[11px] text-[#64748B]">
                  Logged on {new Date(selectedRecord.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verdict Box */}
            <div className={`p-4 rounded-xl border ${
              selectedRecord.is_at_risk
                ? 'bg-amber-50 border-amber-200'
                : selectedRecord.is_late
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Model Verdict
                  </div>
                  <div className="text-base font-bold text-[#172033] mt-0.5">
                    {selectedRecord.is_late ? 'Late Delivery Risk' : 'On-Time Guaranteed'}
                  </div>
                </div>
                <StatusBadge status={selectedRecord.late_delivery_risk} isAtRisk={selectedRecord.is_at_risk} />
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Delay Probability:</span>{' '}
                  <span className="font-mono font-bold">{(selectedRecord.probability * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-slate-500">Decision Threshold:</span>{' '}
                  <span className="font-mono font-bold">{(selectedRecord.threshold_used * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Route & Operational Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Order & Dispatch Specification
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">Tier:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedRecord.shipping_mode}</span>
                </div>
                <div>
                  <span className="text-slate-500">Days Scheduled:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedRecord.days_scheduled} days</span>
                </div>
                <div>
                  <span className="text-slate-500">Market:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedRecord.market}</span>
                </div>
                <div>
                  <span className="text-slate-500">Region:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedRecord.order_region}</span>
                </div>
                <div>
                  <span className="text-slate-500">Destination:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedRecord.order_city}</span>
                </div>
                <div>
                  <span className="text-slate-500">Transit Weather:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedRecord.weather_condition}</span>
                </div>
                <div>
                  <span className="text-slate-500">Sales Amount:</span>{' '}
                  <span className="font-medium text-slate-800">${selectedRecord.sales}</span>
                </div>
                <div>
                  <span className="text-slate-500">Profit Margin:</span>{' '}
                  <span className="font-medium text-slate-800">${selectedRecord.benefit_per_order}</span>
                </div>
              </div>
            </div>

            {/* Feature Explainability Factors */}
            {selectedRecord.top_factors && selectedRecord.top_factors.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Key Influencing Features
                </h4>
                <div className="space-y-1.5">
                  {selectedRecord.top_factors.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="font-mono text-[11px] text-slate-800">{f.feature}</span>
                      <span className={`text-[10px] font-semibold ${
                        f.direction === 'increases_late_risk' ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {f.direction === 'increases_late_risk' ? '+ Risk' : '- Risk'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

