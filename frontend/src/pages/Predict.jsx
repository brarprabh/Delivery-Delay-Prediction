import React, { useState } from 'react';
import { 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Sliders, 
  ShieldAlert, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { predictDelivery } from '../services/api';
import { StatusBadge } from '../components/Common';

const DEFAULT_FORM = {
  shipping_mode: 'Standard Class',
  days_scheduled: 4,
  type: 'TRANSFER',
  order_city: 'Bekasi',
  order_state: 'Jawa Barat',
  order_region: 'Southeast Asia',
  market: 'Pacific Asia',
  customer_city: 'Caguas',
  customer_state: 'PR',
  customer_street: '5365 Cll. 19',
  customer_zipcode: 725,
  customer_segment: 'Consumer',
  department_name: 'Fitness',
  weather_condition: 'Overcast',
  latitude: 18.251453,
  longitude: -66.037056,
  order_item_quantity: 1,
  sales: 327.75,
  benefit_per_order: 91.25,
  order_item_discount: 72.25,
  order_item_product_price: 399.98,
  order_date: '2026-06-15 14:30:00'
};

const PRESET_SCENARIOS = [
  {
    name: "Standard Class (Typical On-Time)",
    desc: "4 days scheduled, overcast weather, moderate transit margin",
    data: {
      ...DEFAULT_FORM,
      shipping_mode: 'Standard Class',
      days_scheduled: 4,
      sales: 327.75,
      weather_condition: 'Overcast'
    }
  },
  {
    name: "First Class (Tight Turnaround)",
    desc: "1 day scheduled, First Class, Transfer payment",
    data: {
      ...DEFAULT_FORM,
      shipping_mode: 'First Class',
      days_scheduled: 1,
      sales: 215.00,
      weather_condition: 'Rain: Slight'
    }
  },
  {
    name: "Second Class (Long Haul)",
    desc: "2 days scheduled, Southeast Asia delivery, high quantity",
    data: {
      ...DEFAULT_FORM,
      shipping_mode: 'Second Class',
      days_scheduled: 2,
      order_item_quantity: 4,
      sales: 580.00,
      weather_condition: 'Snow: Moderate'
    }
  },
  {
    name: "Same Day Rush",
    desc: "0 days scheduled, same day carrier dispatch",
    data: {
      ...DEFAULT_FORM,
      shipping_mode: 'Same Day',
      days_scheduled: 0,
      sales: 120.00,
      weather_condition: 'Clear'
    }
  }
];

export default function Predict() {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleScenarioSelect = (scenario) => {
    setFormData(scenario.data);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await predictDelivery(formData);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_FORM);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Preset Quick Loader */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2.5">
          <Sliders className="w-4 h-4 text-[#0F766E]" />
          <span className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
            Quick Scenario Presets
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_SCENARIOS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleScenarioSelect(s)}
              className="text-left p-3 rounded-lg border border-slate-200 hover:border-[#0F766E] hover:bg-slate-50 transition"
            >
              <div className="text-xs font-bold text-[#172033]">{s.name}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Prediction Input Form */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6">
          <div className="border-b border-[#E5E7EB] pb-4 mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">Shipment Feature Specification</h2>
              <p className="text-xs text-[#64748B]">Inputs are processed through the exact multi-tier data pipeline</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[#64748B] hover:text-[#172033] flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section 1: Transit & Tier */}
            <div>
              <span className="text-[11px] font-bold text-[#0F766E] tracking-wider uppercase">
                1. Transit & Carrier Tier
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">
                    Shipping Mode Tier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="shipping_mode"
                    value={formData.shipping_mode}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#0F766E]"
                    required
                  >
                    <option value="Standard Class">Standard Class (LightGBM)</option>
                    <option value="Second Class">Second Class (XGBoost)</option>
                    <option value="First Class">First Class (Logistic Regression)</option>
                    <option value="Same Day">Same Day (Gradient Boosting)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">
                    Days for Shipment (Scheduled) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="days_scheduled"
                    min="0"
                    max="10"
                    value={formData.days_scheduled}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:border-[#0F766E]"
                    required
                  />
                  <span className="text-[10px] text-[#64748B]">Expected carrier commitment window</span>
                </div>
              </div>
            </div>

            {/* Section 2: Destination & Market */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-[#0F766E] tracking-wider uppercase">
                2. Market & Routing
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Market</label>
                  <select
                    name="market"
                    value={formData.market}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="Pacific Asia">Pacific Asia</option>
                    <option value="USCA">USCA</option>
                    <option value="Europe">Europe</option>
                    <option value="LATAM">LATAM</option>
                    <option value="Africa">Africa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Order Region</label>
                  <input
                    type="text"
                    name="order_region"
                    value={formData.order_region}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Order City</label>
                  <input
                    type="text"
                    name="order_city"
                    value={formData.order_city}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Weather & Customer */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-[#0F766E] tracking-wider uppercase">
                3. Ambient Transit Weather & Customer
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Weather Condition</label>
                  <select
                    name="weather_condition"
                    value={formData.weather_condition}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="Overcast">Overcast</option>
                    <option value="Clear">Clear</option>
                    <option value="Rain: Slight">Rain: Slight</option>
                    <option value="Rain: Heavy">Rain: Heavy</option>
                    <option value="Snow: Moderate">Snow: Moderate</option>
                    <option value="Drizzle: Light">Drizzle: Light</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Customer Segment</label>
                  <select
                    name="customer_segment"
                    value={formData.customer_segment}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="Consumer">Consumer</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Home Office">Home Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Department</label>
                  <select
                    name="department_name"
                    value={formData.department_name}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="Fitness">Fitness</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Golf">Golf</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Outdoors">Outdoors</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Order Economics */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-[#0F766E] tracking-wider uppercase">
                4. Order Economics & Quantity
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Item Qty</label>
                  <input
                    type="number"
                    name="order_item_quantity"
                    min="1"
                    max="100"
                    value={formData.order_item_quantity}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Total Sales ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="sales"
                    value={formData.sales}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Profit Benefit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="benefit_per_order"
                    value={formData.benefit_per_order}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#172033] mb-1">Payment Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#0F766E]"
                  >
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="DEBIT">DEBIT</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Running Cascade Inference...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Predict Delivery Risk
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results & Explanation Panel */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Inference Verdict
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">
                  ID: #{result.id}
                </span>
              </div>

              {/* Status Outcome Card */}
              <div className={`p-4 rounded-xl border ${
                result.is_at_risk 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : result.is_late 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                      Prediction Result
                    </div>
                    <div className="text-xl font-bold mt-1">
                      {result.is_late ? "Late Delivery Risk" : "On-Time Expected"}
                    </div>
                  </div>
                  <StatusBadge status={result.late_delivery_risk} isAtRisk={result.is_at_risk} />
                </div>

                <div className="mt-4 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
                  <span>Model Confidence:</span>
                  <span className="font-bold">
                    {result.is_confident ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confident
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> At-Risk Band (±0.10)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Probability & Threshold Meter */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#172033]">Delay Probability Score</span>
                  <span className="font-mono font-bold text-sm text-[#0F766E]">
                    {(result.probability * 100).toFixed(1)}%
                  </span>
                </div>
                {/* Visual bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.probability > result.threshold_used ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, result.probability * 100))}%` }}
                  ></div>
                  {/* Threshold mark */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-black"
                    style={{ left: `${result.threshold_used * 100}%` }}
                    title={`Decision Threshold: ${result.threshold_used}`}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-[#64748B] mt-1">
                  <span>0% (Certain On-Time)</span>
                  <span className="font-medium text-slate-700">
                    Decision Threshold: {(result.threshold_used * 100).toFixed(0)}%
                  </span>
                  <span>100% (Certain Late)</span>
                </div>
              </div>

              {/* Cascade Routing Details */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-[#172033] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Cascade Dispatch Details</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Selected Sub-Model Tier:</span>
                  <span className="font-medium text-slate-900">{result.tier_applied}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Evaluation Band:</span>
                  <span className="font-medium text-slate-900">
                    [{(result.threshold_used - result.margin).toFixed(2)} - {(result.threshold_used + result.margin).toFixed(2)}]
                  </span>
                </div>
              </div>

              {/* Feature Drivers / Explainability */}
              {result.top_factors && result.top_factors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#172033] mb-2.5">Key Predictive Feature Drivers</h4>
                  <div className="space-y-2">
                    {result.top_factors.map((factor, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-mono text-[11px] text-[#172033] truncate max-w-[200px]" title={factor.feature}>
                          {factor.feature}
                        </span>
                        <div className="flex items-center gap-1 font-medium text-[11px]">
                          {factor.direction === 'increases_late_risk' ? (
                            <span className="text-rose-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" /> Increases Risk
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              <TrendingDown className="w-3 h-3" /> Promotes On-Time
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-[#E5E7EB] p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[#64748B] mb-3">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#172033]">Awaiting Prediction Execution</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                Fill the shipment parameters or pick a preset scenario, then click "Predict Delivery Risk" to view confidence analytics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

