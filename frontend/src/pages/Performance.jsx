import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Award, 
  BarChart2, 
  Sliders, 
  CheckCircle, 
  TrendingUp, 
  GitCompare, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { fetchModelInfo } from '../services/api';
import { LoadingSpinner } from '../components/Common';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function Performance() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      setLoading(true);
      const res = await fetchModelInfo();
      setModelInfo(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Retrieving model validation benchmarks..." />;

  const metrics = modelInfo?.evaluation_metrics || {};

  // Benchmark chart data
  const comparisonData = Object.entries(metrics).map(([name, data]) => ({
    name,
    StandardAccuracy: Number((data.acc_all * 100).toFixed(1)),
    ConfidenceAccuracy: Number((data.acc_conf * 100).toFixed(1)),
    F1Score: Number((data.f1 * 100).toFixed(1)),
    AtRiskPct: Number((data.pct_risk).toFixed(1))
  }));

  const cascadeMetric = metrics['Cascade (Ours)'] || {};
  const cm = cascadeMetric.confusion_matrix || [[0, 0], [0, 0]];

  return (
    <div className="space-y-6">
      {/* Cascade Architecture Highlight */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white border border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Selected Best Architecture
          </span>
          <span className="text-xs text-slate-300">Trained & Validated on Test Split</span>
        </div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {modelInfo?.model_type}
        </h2>
        <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
          Rather than forcing a single global model across drastically different delivery guarantees, 
          DeliverIQ divides orders by shipment class and delegates inference to tier-specialized estimators.
          Standard Class uses an out-of-fold threshold-tuned LightGBM, Second Class runs XGBoost with positive weighting, 
          First Class utilizes regularized Logistic Regression, and Same Day employs Gradient Boosting.
        </p>

        {/* 4 Tiers summary pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-[10px] text-teal-400 font-bold uppercase">Tier 1 • Standard Class</div>
            <div className="text-sm font-bold text-white mt-0.5">LightGBM (OOF Tuned)</div>
            <div className="text-[11px] text-slate-400 mt-1">Threshold: {modelInfo?.cascade_thresholds?.['Standard Class'] || 0.50}</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-[10px] text-teal-400 font-bold uppercase">Tier 2 • Second Class</div>
            <div className="text-sm font-bold text-white mt-0.5">XGBoost (Weighted)</div>
            <div className="text-[11px] text-slate-400 mt-1">Scale pos weight tuned</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-[10px] text-teal-400 font-bold uppercase">Tier 3 • First Class</div>
            <div className="text-sm font-bold text-white mt-0.5">Logistic Regression</div>
            <div className="text-[11px] text-slate-400 mt-1">SAGA solver, L2 penalty</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-[10px] text-teal-400 font-bold uppercase">Tier 4 • Same Day</div>
            <div className="text-sm font-bold text-white mt-0.5">Gradient Boosting</div>
            <div className="text-[11px] text-slate-400 mt-1">Tree depth: 3, 100 estimators</div>
          </div>
        </div>
      </div>

      {/* Model Benchmark Comparison Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E5E7EB]">
          <h3 className="text-sm font-bold text-[#172033]">Evaluated Model Benchmark Comparison</h3>
          <p className="text-xs text-[#64748B]">
            Comparison across all 5 evaluated architectures on the stratified test split (Confidence margin ±0.10)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#64748B] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Architecture</th>
                <th className="py-3 px-4">Standard Accuracy</th>
                <th className="py-3 px-4">Confidence Accuracy</th>
                <th className="py-3 px-4">Confidence Gain</th>
                <th className="py-3 px-4">F1 Score</th>
                <th className="py-3 px-4">ROC AUC</th>
                <th className="py-3 px-4">At-Risk Band (%)</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {Object.entries(metrics).map(([name, data]) => {
                const isWinner = name.includes('Cascade');
                const gain = (data.acc_conf - data.acc_all) * 100;
                return (
                  <tr key={name} className={`hover:bg-slate-50 transition ${isWinner ? 'bg-teal-50/50 font-medium' : ''}`}>
                    <td className="py-3 px-4 flex items-center gap-2">
                      {isWinner && <Award className="w-4 h-4 text-teal-600" />}
                      <span className="font-semibold text-slate-900">{name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{(data.acc_all * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0F766E]">{(data.acc_conf * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">+{gain.toFixed(2)}%</td>
                    <td className="py-3 px-4 font-mono">{(data.f1 * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 font-mono">{data.auc.toFixed(3)}</td>
                    <td className="py-3 px-4 font-mono text-amber-700">{data.pct_risk.toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      {isWinner ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F766E] text-white">
                          Deployed In Production
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Evaluated Baseline</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmark Chart & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comparison Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Accuracy Gain via Confidence Filtering
          </h3>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis domain={[65, 95]} unit="%" tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="StandardAccuracy" name="Standard Accuracy (%)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ConfidenceAccuracy" name="Confidence Accuracy (%)" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix Card */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Cascade Confusion Matrix (Test Split)
            </h3>
            <p className="text-[11px] text-[#64748B] mt-1">
              Evaluated on {cascadeMetric.n_total?.toLocaleString()} test set shipments
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-emerald-800 font-bold uppercase">True Negative (On-Time)</div>
                <div className="text-lg font-bold text-emerald-900 font-mono mt-1">
                  {cm[0]?.[0]?.toLocaleString() || 0}
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div className="text-[10px] text-rose-800 font-bold uppercase">False Positive</div>
                <div className="text-lg font-bold text-rose-900 font-mono mt-1">
                  {cm[0]?.[1]?.toLocaleString() || 0}
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div className="text-[10px] text-rose-800 font-bold uppercase">False Negative</div>
                <div className="text-lg font-bold text-rose-900 font-mono mt-1">
                  {cm[1]?.[0]?.toLocaleString() || 0}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-[10px] text-emerald-800 font-bold uppercase">True Positive (Late)</div>
                <div className="text-lg font-bold text-emerald-900 font-mono mt-1">
                  {cm[1]?.[1]?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E7EB] text-[11px] text-[#64748B] flex justify-between">
            <span>Overall Test Accuracy:</span>
            <span className="font-bold text-slate-800 font-mono">
              {(cascadeMetric.acc_all * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

