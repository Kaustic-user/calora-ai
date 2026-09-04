import React from 'react';
import { Flame, Activity, Zap, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

export default function MacroRings({ summary }) {
  if (!summary) return null;

  const {
    calorie_target = 2000,
    calories_consumed = 0,
    calories_burned = 0,
    net_calories = 0,
    protein_target = 120,
    protein_consumed = 0,
    carbs_target = 225,
    carbs_consumed = 0,
    fat_target = 65,
    fat_consumed = 0,
    fiber_target = 30,
    fiber_consumed = 0,
    tdee = 2000,
    bmr = 1600,
    total_burn = 2000,
    calorie_deficit = 0,
    is_in_deficit = false,
    target_deficit = 500,
  } = summary;

  const effectiveNetCalories = Math.max(0, net_calories);
  const remainingCalories = Math.max(0, Math.round(calorie_target - net_calories));
  const calPercent = Math.min(100, Math.max(0, Math.round((effectiveNetCalories / calorie_target) * 100))) || 0;
  const proteinPercent = Math.min(100, Math.round((protein_consumed / protein_target) * 100)) || 0;
  const carbsPercent = Math.min(100, Math.round((carbs_consumed / carbs_target) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((fat_consumed / fat_target) * 100)) || 0;
  const fiberPercent = Math.min(100, Math.round((fiber_consumed / fiber_target) * 100)) || 0;

  // SVG Circular Ring calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Calorie Ring Card */}
      <div 
        className="lg:col-span-5 border rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-card)' 
        }}
      >
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Flame className="w-5 h-5" style={{ color: 'var(--color-cal)' }} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Calorie Budget</span>
        </div>

        {/* Circular Progress Meter */}
        <div className="relative flex items-center justify-center my-4">
          <svg className="w-44 h-44 transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-800/60"
              fill="transparent"
            />
            {/* Progress Stroke */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="var(--color-cal)"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              fill="transparent"
            />
          </svg>

          {/* Central Calorie Metric */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold text-white tracking-tight">{remainingCalories}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">kcal left</span>
            <span className="text-[10px] mt-0.5 font-bold" style={{ color: 'var(--color-cal)' }}>{calPercent}% net of target</span>
          </div>
        </div>

        {/* Calorie Stats Footer */}
        <div 
          className="grid grid-cols-3 w-full gap-2 pt-2 border-t text-center"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-medium">Eaten</p>
            <p className="text-sm font-bold text-slate-200">{Math.round(calories_consumed)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-medium">Burned</p>
            <p className="text-sm font-bold text-rose-400 flex items-center justify-center gap-0.5">
              <Activity className="w-3.5 h-3.5" />
              {Math.round(calories_burned)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-medium">Target</p>
            <p className="text-sm font-bold text-slate-200">{Math.round(calorie_target)}</p>
          </div>
        </div>
      </div>

      {/* Macronutrient Bars */}
      <div 
        className="lg:col-span-7 border rounded-3xl p-6 shadow-2xl flex flex-col justify-between transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-card)' 
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            Macronutrient Breakdown
          </h3>
          <span className="text-xs text-slate-500 font-medium">Target Composition</span>
        </div>

        <div className="space-y-4">
          {/* Protein */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-protein)' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-protein)' }}></span>
                Protein ({Math.round(protein_consumed)}g / {Math.round(protein_target)}g)
              </span>
              <span className="text-slate-400">{proteinPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${proteinPercent}%`, backgroundColor: 'var(--color-protein)' }}
              ></div>
            </div>
          </div>

          {/* Carbs */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-carbs)' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-carbs)' }}></span>
                Carbohydrates ({Math.round(carbs_consumed)}g / {Math.round(carbs_target)}g)
              </span>
              <span className="text-slate-400">{carbsPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${carbsPercent}%`, backgroundColor: 'var(--color-carbs)' }}
              ></div>
            </div>
          </div>

          {/* Fats */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-fat)' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-fat)' }}></span>
                Fats ({Math.round(fat_consumed)}g / {Math.round(fat_target)}g)
              </span>
              <span className="text-slate-400">{fatPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${fatPercent}%`, backgroundColor: 'var(--color-fat)' }}
              ></div>
            </div>
          </div>

          {/* Dietary Fiber */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-fiber)' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-fiber)' }}></span>
                Dietary Fiber ({Math.round(fiber_consumed)}g / {Math.round(fiber_target)}g)
              </span>
              <span className="text-slate-400">{fiberPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${fiberPercent}%`, backgroundColor: 'var(--color-fiber)' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Calorie Deficit / Surplus Energy Balance Card */}
      <div 
        className="lg:col-span-12 border rounded-3xl p-5 shadow-xl transition-all relative overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-card)' 
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-2xl border transition-colors"
              style={{ 
                backgroundColor: is_in_deficit ? 'var(--accent-glow)' : 'rgba(245, 158, 11, 0.15)', 
                borderColor: is_in_deficit ? 'var(--accent-primary)' : '#F59E0B',
                color: is_in_deficit ? 'var(--accent-primary)' : '#F59E0B' 
              }}
            >
              {is_in_deficit ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Daily Energy Balance & Deficit
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Maintenance TDEE (<strong className="text-slate-200">{Math.round(total_burn)} kcal</strong>) − Eaten (<strong className="text-slate-200">{Math.round(calories_consumed)} kcal</strong>) = <strong style={{ color: is_in_deficit ? 'var(--accent-primary)' : '#F59E0B' }}>{is_in_deficit ? `+${Math.round(calorie_deficit)} kcal Deficit` : `${Math.round(calorie_deficit)} kcal Surplus`}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/40 px-3.5 py-2 rounded-2xl border" style={{ borderColor: 'var(--border-card)' }}>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Goal Deficit</p>
              <p className="text-sm font-extrabold" style={{ color: 'var(--accent-primary)' }}>+{target_deficit || 500} kcal</p>
            </div>
            <div className="h-7 w-px bg-slate-800"></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
              <p className="text-sm font-extrabold text-white">
                {is_in_deficit ? 'Deficit (Fat Loss)' : 'Surplus'}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Deficit Progress Gauge Bar */}
        <div className="w-full bg-slate-800/80 h-3.5 rounded-full overflow-hidden relative border border-slate-700/50">
          <div 
            className="h-full rounded-full transition-all duration-700"
            style={{ 
              width: `${Math.min(100, Math.max(3, (Math.max(0, calorie_deficit) / (target_deficit || 500)) * 100))}%`,
              backgroundColor: is_in_deficit ? 'var(--accent-primary)' : '#F59E0B'
            }}
          ></div>
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-2">
          <span>0 kcal (Maintenance Baseline)</span>
          <span className="text-slate-300 font-semibold">Goal: +{target_deficit || 500} kcal</span>
          <span className="font-bold" style={{ color: is_in_deficit ? 'var(--accent-primary)' : '#F59E0B' }}>
            {Math.round(calorie_deficit)} / {target_deficit || 500} kcal ({Math.round((calorie_deficit / (target_deficit || 500)) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  </div>
  );
}
