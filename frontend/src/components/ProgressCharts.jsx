import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine
} from 'recharts';
import { TrendingUp, BarChart2, Flame, Zap, Award, Target, Loader2 } from 'lucide-react';

export default function ProgressCharts({ refreshTrigger = 0 }) {
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWeeklyTrends = async () => {
    try {
      const res = await fetch('/api/logs/weekly-trends');
      if (res.ok) {
        const data = await res.json();
        setTrendsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch weekly trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyTrends();
  }, [refreshTrigger]);

  const calorieTarget = trendsData?.calorie_target || 2000;
  const proteinTarget = trendsData?.protein_target || 120;
  const dailyData = trendsData?.daily_data || [];

  return (
    <div className="space-y-6">
      {/* 4 Weekly Health Metric Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weekly Avg Intake */}
        <div 
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center"
            style={{ 
              backgroundColor: 'var(--accent-glow)', 
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)' 
            }}
          >
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Daily Intake</p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {loading ? '...' : `${trendsData?.weekly_avg_calories || 0}`}
              <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
            </h4>
          </div>
        </div>

        {/* Weekly Avg Protein */}
        <div 
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgba(56, 189, 248, 0.15)', 
              borderColor: 'var(--color-protein)',
              color: 'var(--color-protein)' 
            }}
          >
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Daily Protein</p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {loading ? '...' : `${trendsData?.weekly_avg_protein || 0}`}
              <span className="text-xs font-normal text-slate-400 ml-1">g</span>
            </h4>
          </div>
        </div>

        {/* Total Weekly Burned */}
        <div 
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgba(234, 179, 8, 0.15)', 
              borderColor: 'var(--color-fat)',
              color: 'var(--color-fat)' 
            }}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">7-Day Burn</p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {loading ? '...' : `${trendsData?.weekly_total_burned || 0}`}
              <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
            </h4>
          </div>
        </div>

        {/* Consistency Score */}
        <div 
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
              borderColor: 'var(--color-carbs)',
              color: 'var(--color-carbs)' 
            }}
          >
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Logged Consistency</p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {loading ? '...' : `${trendsData?.days_logged || 0} / 7`}
              <span className="text-xs font-normal text-slate-400 ml-1">days</span>
            </h4>
          </div>
        </div>
      </div>

      {/* 2 Detailed Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calorie Intake vs Burn Chart */}
        <div 
          className="border rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                Weekly Calorie Trend
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Daily intake vs Target ({calorieTarget} kcal)
              </p>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="calColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                    borderRadius: '16px',
                    color: 'var(--text-main)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  labelStyle={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(val, name) => {
                    if (name === 'calories') return [`${val} kcal`, 'Calories Consumed'];
                    if (name === 'burned') return [`${val} kcal`, 'Calories Burned'];
                    return [val, name];
                  }}
                />
                <ReferenceLine 
                  y={calorieTarget} 
                  stroke="rgba(239, 68, 68, 0.6)" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Target', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#calColor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protein Intake Consistency Chart */}
        <div 
          className="border rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <BarChart2 className="w-5 h-5" style={{ color: 'var(--color-protein)' }} />
                Protein Consistency (g)
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Daily Target: {proteinTarget}g
              </p>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                    borderRadius: '16px',
                    color: 'var(--text-main)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  labelStyle={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(val) => [`${val}g`, 'Protein Consumed']}
                />
                <ReferenceLine 
                  y={proteinTarget} 
                  stroke="rgba(56, 189, 248, 0.6)" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Target', fill: '#38bdf8', fontSize: 10, position: 'insideTopRight' }} 
                />
                <Bar 
                  dataKey="protein" 
                  fill="var(--color-protein)" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
