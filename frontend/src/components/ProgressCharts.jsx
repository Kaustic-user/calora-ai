import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart2, Flame, Zap, Award, Target, Loader2, Scale } from 'lucide-react';

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
  const tdeeBaseline = trendsData?.tdee_baseline || 2000;
  const weeklyNetDeficit = trendsData?.weekly_net_deficit || 0;
  const projectedWeightKg = trendsData?.projected_weight_change_kg || 0;
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
              backgroundColor: 'var(--accent-glow)', 
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)' 
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

        {/* 7-Day Net Deficit */}
        <div 
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: weeklyNetDeficit >= 0 ? 'var(--accent-glow)' : 'rgba(245, 158, 11, 0.15)', 
              borderColor: weeklyNetDeficit >= 0 ? 'var(--accent-primary)' : '#F59E0B',
              color: weeklyNetDeficit >= 0 ? 'var(--accent-primary)' : '#F59E0B' 
            }}
          >
            {weeklyNetDeficit >= 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">7-Day Net Deficit</p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {loading ? '...' : (weeklyNetDeficit >= 0 ? `+${weeklyNetDeficit}` : `${weeklyNetDeficit}`)}
              <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
            </h4>
          </div>
        </div>

        {/* Projected Fat Loss */}
        <div 
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div 
            className="p-2.5 rounded-xl border flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: 'var(--accent-glow)', 
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)' 
            }}
          >
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Est. Fat Change</p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {loading ? '...' : (projectedWeightKg > 0 ? `-${projectedWeightKg}` : `+${Math.abs(projectedWeightKg)}`)}
              <span className="text-xs font-normal text-slate-400 ml-1">kg</span>
            </h4>
          </div>
        </div>
      </div>

      {/* 3 Detailed Charts Grid */}
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
                  stroke="var(--accent-primary)" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Target', fill: 'var(--accent-primary)', fontSize: 10, position: 'insideTopRight' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#calColor)" 
                  dot={{ r: 4.5, fill: 'var(--accent-primary)', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: 'var(--accent-primary)', stroke: '#FFFFFF', strokeWidth: 2 }}
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
                <BarChart2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
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
                  cursor={{ fill: 'var(--accent-glow)', rx: 8, ry: 8 }}
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
                  stroke="var(--accent-primary)" 
                  strokeDasharray="4 4" 
                  label={{ value: 'Target', fill: 'var(--accent-primary)', fontSize: 10, position: 'insideTopRight' }} 
                />
                <Bar 
                  dataKey="protein" 
                  fill="var(--accent-primary)" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Calorie Intake vs TDEE Baseline & Deficit Gap Chart */}
        <div 
          className="lg:col-span-2 border rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Calorie Deficit vs TDEE Baseline
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border bg-sky-500/10 border-sky-500/30 text-sky-400">
                  TDEE: {Math.round(tdeeBaseline)} kcal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualizing the gap between your daily intake and your Maintenance TDEE baseline. Dotted lines indicate daily calorie deficit/surplus.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-1 bg-sky-400 rounded-full"></span> TDEE Baseline
              </span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></span> Deficit Gap
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const maxVal = Math.max(
                  tdeeBaseline + 400,
                  ...dailyData.map((d) => Math.max(d.calories || 0, d.total_burn || 0))
                );
                const yMax = Math.ceil(maxVal / 500) * 500;
                const topPad = 30;
                const bottomPad = 40;
                const innerH = 320 - topPad - bottomPad;

                // Function to map a kcal value to SVG Y coordinate
                const getY = (val) => topPad + innerH * (1 - Math.max(0, val) / yMax);
                const yTdee = getY(tdeeBaseline);

                // Custom Dot that renders clean, thin vertical stem without clunky text overlay
                const CustomDeficitDot = (props) => {
                  const { cx, cy, payload } = props;
                  if (!payload || cx === undefined || cy === undefined || payload.calories <= 0) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#64748B"
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />
                    );
                  }

                  const cal = payload.calories;
                  const deficitVal = Math.round(tdeeBaseline - cal);
                  const isDeficit = deficitVal >= 0;
                  const stemColor = isDeficit ? '#10B981' : '#F59E0B';

                  return (
                    <g key={`dot-stem-${payload.day}`}>
                      {/* Clean, Thin Vertical Dotted Connector Line */}
                      <line
                        x1={cx}
                        y1={cy}
                        x2={cx}
                        y2={yTdee}
                        stroke={stemColor}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        opacity={0.8}
                      />

                      {/* TDEE Baseline Anchor Dot */}
                      <circle
                        cx={cx}
                        cy={yTdee}
                        r={3.5}
                        fill={stemColor}
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />

                      {/* Intake Curve Tip Dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="var(--accent-primary)"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                };

                return (
                  <AreaChart
                    data={dailyData}
                    margin={{ top: 25, right: 15, left: -15, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="deficitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-card)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, yMax]}
                    />
                    <Tooltip
                      cursor={{ stroke: 'var(--accent-primary)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const dataPoint = payload[0]?.payload;
                        const cals = dataPoint?.calories || 0;
                        const burned = dataPoint?.burned || 0;
                        const hasLog = cals > 0 || burned > 0;
                        const deficit = Math.round(tdeeBaseline - cals);
                        const isDeficit = deficit >= 0;

                        return (
                          <div 
                            className="p-3.5 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[210px] space-y-2.5 animate-fade-in"
                            style={{ 
                              backgroundColor: 'var(--bg-card)', 
                              borderColor: isDeficit ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)' 
                            }}
                          >
                            <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: 'var(--border-card)' }}>
                              <span className="text-xs font-extrabold text-white">{dataPoint?.day}</span>
                              <span className="text-[10px] text-slate-400">{dataPoint?.date}</span>
                            </div>

                            {hasLog ? (
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-400">Calories Eaten:</span>
                                  <span className="font-bold text-white">{Math.round(cals)} kcal</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sky-400">TDEE Baseline:</span>
                                  <span className="font-bold text-sky-400">{Math.round(tdeeBaseline)} kcal</span>
                                </div>
                                {burned > 0 && (
                                  <div className="flex justify-between items-center text-rose-400">
                                    <span>Workouts Burned:</span>
                                    <span className="font-bold">+{Math.round(burned)} kcal</span>
                                  </div>
                                )}
                                <div className="pt-1.5 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-card)' }}>
                                  <span className="font-bold flex items-center gap-1" style={{ color: isDeficit ? '#10B981' : '#F59E0B' }}>
                                    {isDeficit ? '🔥 Daily Deficit:' : '⚡ Daily Surplus:'}
                                  </span>
                                  <span className={`font-extrabold text-sm px-2 py-0.5 rounded-lg ${isDeficit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                                    {isDeficit ? `-${deficit} kcal` : `+${Math.abs(deficit)} kcal`}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="py-1 text-center">
                                <p className="text-xs text-slate-400 font-medium">No meals or workouts logged</p>
                                <p className="text-[10px] text-sky-400 mt-1">TDEE Baseline: {Math.round(tdeeBaseline)} kcal</p>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {/* Bright, Clean TDEE Baseline Reference Line */}
                    <ReferenceLine
                      y={tdeeBaseline}
                      stroke="#38BDF8"
                      strokeDasharray="4 4"
                      label={{
                        value: `TDEE: ${Math.round(tdeeBaseline)} kcal`,
                        fill: '#38BDF8',
                        fontSize: 11,
                        fontWeight: 'bold',
                        position: 'insideTopLeft'
                      }}
                    />
                    {/* Area Curve with Clean Dotted Stems */}
                    <Area
                      type="monotone"
                      dataKey="calories"
                      stroke="var(--accent-primary)"
                      strokeWidth={2.5}
                      fill="url(#deficitAreaGradient)"
                      dot={<CustomDeficitDot />}
                      activeDot={{ r: 7, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
