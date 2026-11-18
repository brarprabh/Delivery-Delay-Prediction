import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { fetchAnalyticsTrends, fetchAnalyticsOverview } from '../services/api';
import { LoadingSpinner, EmptyState } from '../components/Common';
import { TrendingUp, Globe, CloudRain, BarChart3, AlertOctagon } from 'lucide-react';

export default function Analytics() {
  const [trendsData, setTrendsData] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [tRes, oRes] = await Promise.all([
        fetchAnalyticsTrends(),
        fetchAnalyticsOverview()
      ]);
      setTrendsData(tRes);
      setOverviewData(oRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Aggregating multi-dimensional logistics trends..." />;

  const hasData = trendsData?.trends?.length > 0;

  return (
    <div className="space-y-6">
      {/* Trends Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            <Globe className="w-4 h-4 text-[#0F766E]" />
            Active Geographic Markets
          </div>
          <div className="text-2xl font-bold text-[#172033]">
            {trendsData?.market_distribution?.length || 0}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Markets monitored across international supply chains
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            <CloudRain className="w-4 h-4 text-[#0F766E]" />
            Weather Patterns Tracked
          </div>
          <div className="text-2xl font-bold text-[#172033]">
            {trendsData?.weather_impact?.length || 0}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Atmospheric conditions correlated to transit delays
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
            <AlertOctagon className="w-4 h-4 text-amber-600" />
            Decision Uncertainty Band
          </div>
          <div className="text-2xl font-bold text-[#172033]">
            ±10.0%
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Conservative margin isolating high-risk from confident dispatches
          </div>
        </div>
      </div>

      {/* Main Trends Chart */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#172033]">Prediction Volume & Outcome Trend</h3>
          <p className="text-xs text-[#64748B]">Audited dispatches grouped chronologically by date</p>
        </div>

        <div className="h-72 mt-2">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="ontime" name="On Time" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" name="Late Risk" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="at_risk" name="At-Risk Band" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No historical trend data"
              description="Predictions made in the application will automatically populate this chronological analytics feed."
            />
          )}
        </div>
      </div>

      {/* Market Breakdown & Weather Impact Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Delay Rate */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#172033]">Delay Rate by Market</h3>
            <p className="text-xs text-[#64748B]">Percentage of late deliveries per geographic sales territory</p>
          </div>
          <div className="h-64 mt-2">
            {trendsData?.market_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData.market_distribution} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="market" tick={{ fontSize: 11, fill: '#64748B' }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                  <Bar dataKey="late_rate" name="Late Rate (%)" fill="#0F766E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No market distributions available" />
            )}
          </div>
        </div>

        {/* Transit Weather Impact */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#172033]">Weather Condition Impact</h3>
            <p className="text-xs text-[#64748B]">Correlating severe and overcast weather against delivery delay frequency</p>
          </div>
          <div className="h-64 mt-2">
            {trendsData?.weather_impact?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData.weather_impact} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="weather" tick={{ fontSize: 11, fill: '#64748B' }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                  <Bar dataKey="late_rate" name="Late Rate (%)" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No weather condition records available" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

