import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { fetchAnalyticsOverview } from '../services/api';
import { KPICard, StatusBadge, EmptyState, LoadingSpinner } from '../components/Common';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetchAnalyticsOverview();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Calculating logistics metrics..." />;

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
        <p className="font-semibold">Unable to load overview:</p>
        <p className="text-xs mt-1">{error}</p>
        <button 
          onClick={loadOverview}
          className="mt-3 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Outcome Chart Data
  const outcomeData = [
    { name: 'On Time', value: data?.ontime_count || 0, color: '#10B981' },
    { name: 'Late Risk', value: data?.late_count || 0, color: '#EF4444' }
  ];

  // Shipping mode chart data
  const smData = Object.entries(data?.shipping_mode_breakdown || {}).map(([key, val]) => ({
    mode: key,
    count: val
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Action */}
      <div className="bg-gradient-to-r from-[#111827] to-[#1F2937] rounded-xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30">
              Cascade ML Model
            </span>
            <span className="text-xs text-gray-400">Trained on 180,000+ Shipments</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">Intelligent Delivery Risk Scoring</h2>
          <p className="text-xs text-gray-300 mt-1 max-w-xl">
            Predict delivery delays before dispatch using machine learning models specialized for each shipping tier with confidence band detection.
          </p>
        </div>
        <button
          onClick={() => navigate('/predict')}
          className="px-4 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs transition flex items-center gap-2 shadow-sm shrink-0"
        >
          <span>Run New Prediction</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Predictions"
          value={data.total_predictions.toLocaleString()}
          subtitle="Audited in database"
          icon={Package}
        />
        <KPICard
          title="On-Time Delivery Rate"
          value={`${data.on_time_rate}%`}
          subtitle="Of evaluated shipments"
          trend={`${data.ontime_count} on-time`}
          icon={CheckCircle}
        />
        <KPICard
          title="At-Risk (Uncertain)"
          value={data.at_risk_count.toLocaleString()}
          subtitle="Within ±0.10 decision margin"
          alert={`${data.at_risk_count > 0 ? Math.round((data.at_risk_count / data.total_predictions) * 100) : 0}% requiring review`}
          icon={AlertTriangle}
        />
        <KPICard
          title="Avg Delay Probability"
          value={`${(data.average_delay_probability * 100).toFixed(1)}%`}
          subtitle="Across all persisted dispatches"
          icon={TrendingUp}
        />
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outcome Split */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Delivery Outcome Ratio</h3>
          <div className="h-60 mt-2">
            {data.total_predictions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                No predictions recorded yet
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-[#64748B]">On Time ({data.ontime_count})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-[#64748B]">Late Risk ({data.late_count})</span>
            </div>
          </div>
        </div>

        {/* Shipping Mode Distribution */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Shipments by Delivery Tier</h3>
          <div className="h-60 mt-2">
            {smData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={smData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="mode" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                No tier data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Predictions Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#172033]">Recent Audited Predictions</h3>
            <p className="text-xs text-[#64748B]">Latest shipment requests processed through the cascade pipeline</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data.recent_predictions?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#64748B] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Tier / Mode</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Scheduled Days</th>
                  <th className="py-3 px-4">Delay Prob.</th>
                  <th className="py-3 px-4">Prediction</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {data.recent_predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">#{p.id}</td>
                    <td className="py-3 px-4 font-medium text-[#172033]">{p.shipping_mode}</td>
                    <td className="py-3 px-4 text-[#64748B]">{p.order_city || '—'}, {p.order_region}</td>
                    <td className="py-3 px-4 font-mono">{p.days_scheduled}d</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {(p.probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.late_delivery_risk} isAtRisk={p.is_at_risk} />
                    </td>
                    <td className="py-3 px-4">
                      {p.is_confident ? (
                        <span className="text-emerald-700 font-medium">Confident</span>
                      ) : (
                        <span className="text-amber-700 font-medium">At Risk Band</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/history?highlight=${p.id}`)}
                        className="text-xs text-[#0F766E] font-medium hover:underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No predictions on record"
              description="Make your first delivery risk prediction to populate live analytics."
              actionText="Make Prediction"
              onAction={() => navigate('/predict')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

