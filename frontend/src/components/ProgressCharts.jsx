import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart2, Flame, Target, Loader2, Scale, Calendar, CalendarRange, X, Check, Clock, Sparkles
} from 'lucide-react';

const TIMEFRAME_PRESETS = [
  { label: '7D', days: 7, desc: 'Last 7 Days (1 Week)' },
  { label: '14D', days: 14, desc: 'Last 14 Days (2 Weeks)' },
  { label: '30D', days: 30, desc: 'Last 30 Days (1 Month)' },
  { label: '90D', days: 90, desc: 'Last 90 Days (3 Months)' }
];

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysAgoStr = (numDays) => {
  const d = new Date();
  d.setDate(d.getDate() - numDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const getLastMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(firstDay), end: fmt(lastDay) };
};

const getYearToDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
};

// Reusable Date Range Picker Popover Dropdown for each chart header
function ChartDateRangePicker({
  title,
  filter,
  onApply,
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempMode, setTempMode] = useState(filter?.mode || 'days');
  const [tempDays, setTempDays] = useState(filter?.days || 7);
  const [tempStartDate, setTempStartDate] = useState(filter?.startDate || getDaysAgoStr(30));
  const [tempEndDate, setTempEndDate] = useState(filter?.endDate || getTodayStr());
  const [applyToAll, setApplyToAll] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTempMode(filter?.mode || 'days');
      setTempDays(filter?.days || 7);
      setTempStartDate(filter?.startDate || getDaysAgoStr(30));
      setTempEndDate(filter?.endDate || getTodayStr());
    }
  }, [isOpen, filter]);

  // Click outside and Escape key listeners to close popover
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePresetClick = (days) => {
    setTempMode('days');
    setTempDays(days);
    setTempStartDate(getDaysAgoStr(days));
    setTempEndDate(getTodayStr());
  };

  const handleCustomPreset = (type) => {
    setTempMode('custom');
    if (type === 'thisMonth') {
      setTempStartDate(getStartOfMonthStr());
      setTempEndDate(getTodayStr());
    } else if (type === 'lastMonth') {
      const lm = getLastMonthRange();
      setTempStartDate(lm.start);
      setTempEndDate(lm.end);
    } else if (type === 'ytd') {
      setTempStartDate(getYearToDateStr());
      setTempEndDate(getTodayStr());
    }
  };

  const handleApply = () => {
    let finalFilter;
    if (tempMode === 'custom') {
      let s = tempStartDate;
      let e = tempEndDate;
      if (s > e) {
        const t = s; s = e; e = t;
      }
      finalFilter = {
        mode: 'custom',
        days: null,
        startDate: s,
        endDate: e,
        label: `${s.slice(5)} → ${e.slice(5)}`
      };
    } else {
      finalFilter = {
        mode: 'days',
        days: tempDays,
        startDate: getDaysAgoStr(tempDays),
        endDate: getTodayStr(),
        label: `${tempDays}D`
      };
    }
    onApply(finalFilter, applyToAll);
    setIsOpen(false);
  };

  const calculateDaysCount = () => {
    if (tempMode === 'days') return tempDays;
    if (!tempStartDate || !tempEndDate) return 0;
    const s = new Date(tempStartDate + 'T00:00:00');
    const e = new Date(tempEndDate + 'T00:00:00');
    return Math.max(1, Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 cursor-pointer shadow-sm"
        style={{
          backgroundColor: isOpen ? 'var(--accent-glow)' : 'var(--bg-card-subtle)',
          borderColor: isOpen ? 'var(--accent-primary)' : 'var(--border-card)',
          color: isOpen ? 'var(--accent-primary)' : 'var(--text-main)'
        }}
        title={`Change date range for ${title}`}
      >
        <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
        <span>{filter?.label || `${filter?.days || 7}D`}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-80 sm:w-88 rounded-3xl p-5 border shadow-2xl space-y-4 backdrop-blur-2xl animate-fade-in`}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-card)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px var(--accent-glow)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-xs font-bold text-white tracking-tight">{title} Timeframe</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[7, 14, 30, 90].map((d) => {
                const active = tempMode === 'days' && tempDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handlePresetClick(d)}
                    className={`py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      active ? 'shadow-sm' : 'hover:bg-white/5 text-slate-300'
                    }`}
                    style={
                      active
                        ? { backgroundColor: 'var(--accent-primary)', color: '#000000', borderColor: 'var(--accent-primary)' }
                        : { backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }
                    }
                  >
                    {d}D
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => handleCustomPreset('thisMonth')}
                className="py-1 px-2 rounded-xl text-[11px] font-semibold transition-all border text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleCustomPreset('lastMonth')}
                className="py-1 px-2 rounded-xl text-[11px] font-semibold transition-all border text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handleCustomPreset('ytd')}
                className="py-1 px-2 rounded-xl text-[11px] font-semibold transition-all border text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
              >
                YTD
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Custom Calendar Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Start Date</span>
                <input
                  type="date"
                  value={tempStartDate}
                  max={tempEndDate || getTodayStr()}
                  onChange={(e) => {
                    setTempStartDate(e.target.value);
                    setTempMode('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card-subtle)',
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)',
                    colorScheme: 'dark'
                  }}
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">End Date</span>
                <input
                  type="date"
                  value={tempEndDate}
                  min={tempStartDate}
                  max={getTodayStr()}
                  onChange={(e) => {
                    setTempEndDate(e.target.value);
                    setTempMode('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card-subtle)',
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)',
                    colorScheme: 'dark'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Range Preview & Sync Option */}
          <div className="space-y-2 pt-1">
            <div
              className="p-2 rounded-xl border flex items-center justify-between text-xs"
              style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
            >
              <span className="text-slate-400 font-medium">Selected Window:</span>
              <span className="font-extrabold px-2 py-0.5 rounded-md border" style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
                {calculateDaysCount()} Days
              </span>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded accent-[var(--accent-primary)]"
              />
              <span>Apply this timeframe to all graphs</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-card)' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 rounded-xl border text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#000000',
                boxShadow: '0 0 14px var(--accent-glow)'
              }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProgressCharts({ refreshTrigger = 0 }) {
  // Global / Top Badge Summary State
  const [globalFilter, setGlobalFilter] = useState({ mode: 'days', days: 7, label: '7D' });
  const [globalTrends, setGlobalTrends] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  // Individual Chart Filters & Data States
  const [calorieFilter, setCalorieFilter] = useState({ mode: 'days', days: 7, label: '7D' });
  const [calorieTrends, setCalorieTrends] = useState(null);
  const [calorieLoading, setCalorieLoading] = useState(true);

  const [proteinFilter, setProteinFilter] = useState({ mode: 'days', days: 7, label: '7D' });
  const [proteinTrends, setProteinTrends] = useState(null);
  const [proteinLoading, setProteinLoading] = useState(true);

  const [deficitFilter, setDeficitFilter] = useState({ mode: 'days', days: 7, label: '7D' });
  const [deficitTrends, setDeficitTrends] = useState(null);
  const [deficitLoading, setDeficitLoading] = useState(true);

  // Helper fetcher function
  const fetchTrendsForFilter = async (filter) => {
    let url = '/api/logs/weekly-trends';
    if (filter.mode === 'custom' && filter.startDate && filter.endDate) {
      url += `?start_date=${filter.startDate}&end_date=${filter.endDate}`;
    } else {
      url += `?days=${filter.days || 7}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error fetching trends');
    return await res.json();
  };

  // Fetch Global Summary
  useEffect(() => {
    let active = true;
    setGlobalLoading(true);
    fetchTrendsForFilter(globalFilter)
      .then((data) => {
        if (active) setGlobalTrends(data);
      })
      .catch((err) => console.error('Failed to fetch global summary:', err))
      .finally(() => {
        if (active) setGlobalLoading(false);
      });
    return () => { active = false; };
  }, [globalFilter, refreshTrigger]);

  // Fetch Calorie Chart
  useEffect(() => {
    let active = true;
    setCalorieLoading(true);
    fetchTrendsForFilter(calorieFilter)
      .then((data) => {
        if (active) setCalorieTrends(data);
      })
      .catch((err) => console.error('Failed to fetch calorie trends:', err))
      .finally(() => {
        if (active) setCalorieLoading(false);
      });
    return () => { active = false; };
  }, [calorieFilter, refreshTrigger]);

  // Fetch Protein Chart
  useEffect(() => {
    let active = true;
    setProteinLoading(true);
    fetchTrendsForFilter(proteinFilter)
      .then((data) => {
        if (active) setProteinTrends(data);
      })
      .catch((err) => console.error('Failed to fetch protein trends:', err))
      .finally(() => {
        if (active) setProteinLoading(false);
      });
    return () => { active = false; };
  }, [proteinFilter, refreshTrigger]);

  // Fetch Deficit Chart
  useEffect(() => {
    let active = true;
    setDeficitLoading(true);
    fetchTrendsForFilter(deficitFilter)
      .then((data) => {
        if (active) setDeficitTrends(data);
      })
      .catch((err) => console.error('Failed to fetch deficit trends:', err))
      .finally(() => {
        if (active) setDeficitLoading(false);
      });
    return () => { active = false; };
  }, [deficitFilter, refreshTrigger]);

  // Handler for applying filter to Calorie chart
  const handleApplyCalorieFilter = (newFilter, applyToAll) => {
    setCalorieFilter(newFilter);
    if (applyToAll) {
      setGlobalFilter(newFilter);
      setProteinFilter(newFilter);
      setDeficitFilter(newFilter);
    }
  };

  // Handler for applying filter to Protein chart
  const handleApplyProteinFilter = (newFilter, applyToAll) => {
    setProteinFilter(newFilter);
    if (applyToAll) {
      setGlobalFilter(newFilter);
      setCalorieFilter(newFilter);
      setDeficitFilter(newFilter);
    }
  };

  // Handler for applying filter to Deficit chart
  const handleApplyDeficitFilter = (newFilter, applyToAll) => {
    setDeficitFilter(newFilter);
    if (applyToAll) {
      setGlobalFilter(newFilter);
      setCalorieFilter(newFilter);
      setProteinFilter(newFilter);
    }
  };

  // Shared Targets & Values
  const calorieTarget = globalTrends?.calorie_target || calorieTrends?.calorie_target || 2000;
  const proteinTarget = globalTrends?.protein_target || proteinTrends?.protein_target || 120;
  const tdeeBaseline = globalTrends?.tdee_baseline || deficitTrends?.tdee_baseline || 2000;
  const netDeficit = globalTrends?.weekly_net_deficit || 0;
  const projectedWeightKg = globalTrends?.projected_weight_change_kg || 0;
  const globalDaysCount = globalTrends?.daily_data?.length || 7;

  // Dynamic interval calculator for XAxis
  const getXAxisInterval = (data) => {
    const len = data?.length || 0;
    if (len > 70) return 13;
    if (len > 35) return 6;
    if (len > 20) return 3;
    if (len > 10) return 1;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Target className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Progress & Trends
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Use the calendar icon on any graph to customize timeframes, select date ranges, and review historical macros
        </p>
      </div>

      {/* 4 Health Metric Badges (Global Summary) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg Intake */}
        <div
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div
            className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
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
              {globalLoading ? '...' : `${globalTrends?.weekly_avg_calories || 0}`}
              <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
            </h4>
          </div>
        </div>

        {/* Avg Protein */}
        <div
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div
            className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
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
              {globalLoading ? '...' : `${globalTrends?.weekly_avg_protein || 0}`}
              <span className="text-xs font-normal text-slate-400 ml-1">g</span>
            </h4>
          </div>
        </div>

        {/* Dynamic Net Deficit */}
        <div
          className="border rounded-2xl p-4 shadow-lg flex items-center gap-3 transition-all"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div
            className="p-2.5 rounded-xl border flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: netDeficit >= 0 ? 'var(--accent-glow)' : 'rgba(245, 158, 11, 0.15)',
              borderColor: netDeficit >= 0 ? 'var(--accent-primary)' : '#F59E0B',
              color: netDeficit >= 0 ? 'var(--accent-primary)' : '#F59E0B'
            }}
          >
            {netDeficit >= 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {globalDaysCount}-Day Deficit
            </p>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {globalLoading ? '...' : (netDeficit >= 0 ? `+${netDeficit}` : `${netDeficit}`)}
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
            className="p-2.5 rounded-xl border flex items-center justify-center shrink-0 transition-colors"
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
              {globalLoading ? '...' : (projectedWeightKg > 0 ? `-${projectedWeightKg}` : `+${Math.abs(projectedWeightKg)}`)}
              <span className="text-xs font-normal text-slate-400 ml-1">kg</span>
            </h4>
          </div>
        </div>
      </div>

      {/* 3 Detailed Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Calorie Intake vs Burn Chart */}
        <div
          className="border rounded-3xl p-6 shadow-xl transition-all relative"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                Calorie Intake Trend
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {calorieTrends?.timeframe_label || '7 Days'} • Target ({calorieTarget} kcal)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {calorieLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              <ChartDateRangePicker
                title="Calorie Trend"
                filter={calorieFilter}
                onApply={handleApplyCalorieFilter}
              />
            </div>
          </div>

          <div className="h-64 w-full">
            {(() => {
              const data = calorieTrends?.daily_data || [];
              const isDense = data.length > 30;
              const isMedium = data.length > 14;

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="calColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.45}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      interval={getXAxisInterval(data)}
                    />
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
                      strokeWidth={isDense ? 2 : 3}
                      fillOpacity={1}
                      fill="url(#calColor)"
                      dot={isDense ? false : { r: isMedium ? 3 : 4.5, fill: 'var(--accent-primary)', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* 2. Protein Intake Consistency Chart */}
        <div
          className="border rounded-3xl p-6 shadow-xl transition-all relative"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <BarChart2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                Protein Consistency
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {proteinTrends?.timeframe_label || '7 Days'} • Target: {proteinTarget}g
              </p>
            </div>
            <div className="flex items-center gap-2">
              {proteinLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              <ChartDateRangePicker
                title="Protein Consistency"
                filter={proteinFilter}
                onApply={handleApplyProteinFilter}
              />
            </div>
          </div>

          <div className="h-64 w-full">
            {(() => {
              const data = proteinTrends?.daily_data || [];
              const isDense = data.length > 30;
              const isMedium = data.length > 14;

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      interval={getXAxisInterval(data)}
                    />
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
                      radius={[4, 4, 0, 0]}
                      maxBarSize={isDense ? 8 : isMedium ? 14 : 32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* 3. Dynamic Calorie Intake vs TDEE Baseline & Deficit Gap Chart */}
        <div
          className="lg:col-span-2 border rounded-3xl p-6 shadow-xl transition-all relative"
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
                {deficitTrends?.timeframe_label || '7 Days'} • Visualizing the gap between intake and maintenance baseline.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2.5 h-1 bg-sky-400 rounded-full"></span> TDEE
                </span>
                <span className="flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></span> Gap
                </span>
              </div>
              {deficitLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              <ChartDateRangePicker
                title="Deficit & TDEE"
                filter={deficitFilter}
                onApply={handleApplyDeficitFilter}
              />
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const data = deficitTrends?.daily_data || [];
                const isDense = data.length > 30;
                const maxVal = Math.max(
                  tdeeBaseline + 400,
                  ...data.map((d) => Math.max(d.calories || 0, d.total_burn || 0))
                );
                const yMax = Math.ceil(maxVal / 500) * 500;
                const topPad = 30;
                const bottomPad = 40;
                const innerH = 320 - topPad - bottomPad;

                const getY = (val) => topPad + innerH * (1 - Math.max(0, val) / yMax);
                const yTdee = getY(tdeeBaseline);

                // Custom Dot that renders clean vertical stem connector
                const CustomDeficitDot = (props) => {
                  const { cx, cy, payload } = props;
                  if (!payload || cx === undefined || cy === undefined || payload.calories <= 0) {
                    if (isDense) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={2.5}
                        fill="#64748B"
                        stroke="#0F172A"
                        strokeWidth={1}
                      />
                    );
                  }

                  const cal = payload.calories;
                  const deficitVal = Math.round(tdeeBaseline - cal);
                  const isDeficit = deficitVal >= 0;
                  const stemColor = isDeficit ? '#10B981' : '#F59E0B';

                  return (
                    <g key={`dot-stem-${payload.date || payload.day}`}>
                      {/* Clean Vertical Dotted Connector Line */}
                      <line
                        x1={cx}
                        y1={cy}
                        x2={cx}
                        y2={yTdee}
                        stroke={stemColor}
                        strokeWidth={isDense ? 1 : 1.5}
                        strokeDasharray="3 3"
                        opacity={isDense ? 0.6 : 0.85}
                      />

                      {/* TDEE Baseline Anchor Dot */}
                      <circle
                        cx={cx}
                        cy={yTdee}
                        r={isDense ? 2 : 3}
                        fill={stemColor}
                        stroke="#0F172A"
                        strokeWidth={1}
                      />

                      {/* Intake Curve Tip Dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isDense ? 3 : 4.5}
                        fill="var(--accent-primary)"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                };

                return (
                  <AreaChart
                    data={data}
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
                      interval={getXAxisInterval(data)}
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
                      content={({ active, payload }) => {
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
                    {/* TDEE Baseline Reference Line */}
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
                    {/* Area Curve with Deficit Connectors */}
                    <Area
                      type="monotone"
                      dataKey="calories"
                      stroke="var(--accent-primary)"
                      strokeWidth={isDense ? 2 : 2.5}
                      fill="url(#deficitAreaGradient)"
                      dot={<CustomDeficitDot />}
                      activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
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
