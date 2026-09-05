import React, { useState } from 'react';
import { ChefHat, Plus, Check, Clock, Sparkles, Loader2, Zap, Flame, Leaf } from 'lucide-react';

const FILTERS = [
  { id: '', label: 'AI Best Match', icon: Sparkles },
  { id: 'quick', label: 'Under 15 Mins', icon: Zap },
  { id: 'high_protein', label: 'Max Protein', icon: Flame },
  { id: 'light', label: 'Light & Clean', icon: Leaf },
];

export default function MealRecommender({ onQuickLog }) {
  const [activeFilter, setActiveFilter] = useState('');
  const [loggingId, setLoggingId] = useState(null);

  // Tab-isolated state map: each tab has its own items, loading, and hasGenerated status
  const [tabData, setTabData] = useState({
    '': { items: [], loading: false, hasGenerated: false },
    'quick': { items: [], loading: false, hasGenerated: false },
    'high_protein': { items: [], loading: false, hasGenerated: false },
    'light': { items: [], loading: false, hasGenerated: false },
  });

  const currentTab = tabData[activeFilter] || { items: [], loading: false, hasGenerated: false };
  const currentFilterObj = FILTERS.find(f => f.id === activeFilter) || FILTERS[0];

  const fetchRecommendationsForTab = async (filterId) => {
    // Set loading for this specific tab only
    setTabData(prev => ({
      ...prev,
      [filterId]: {
        ...(prev[filterId] || { items: [] }),
        loading: true,
        hasGenerated: true
      }
    }));

    try {
      const url = filterId
        ? `/api/recommendations/dinner?filter=${encodeURIComponent(filterId)}`
        : '/api/recommendations/dinner';
      const res = await fetch(url);
      const data = await res.json();

      setTabData(prev => ({
        ...prev,
        [filterId]: {
          items: Array.isArray(data) ? data : [],
          loading: false,
          hasGenerated: true
        }
      }));
    } catch (err) {
      console.error(`Failed to fetch recommendations for tab ${filterId}:`, err);
      setTabData(prev => ({
        ...prev,
        [filterId]: {
          items: prev[filterId]?.items || [],
          loading: false,
          hasGenerated: true
        }
      }));
    }
  };

  const handleQuickLog = async (title, idx) => {
    setLoggingId(idx);
    try {
      await onQuickLog(title);
    } finally {
      setTimeout(() => setLoggingId(null), 1000);
    }
  };

  return (
    <div
      className="border rounded-3xl p-6 shadow-2xl transition-all relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ChefHat className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            Hit Your Remaining Macros
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            AI-synthesized meals tailored to solve your remaining calorie & protein budget
          </p>
        </div>

        {/* Regenerate Button in header if current tab already generated ideas */}
        {currentTab.hasGenerated && (
          <button
            onClick={() => fetchRecommendationsForTab(activeFilter)}
            disabled={currentTab.loading}
            className="text-xs hover:text-white transition-all flex items-center gap-1.5 font-bold px-3.5 py-1.5 rounded-xl border self-start sm:self-auto shadow-sm hover:scale-102 active:scale-95"
            style={{
              backgroundColor: 'var(--bg-card-subtle)',
              borderColor: 'var(--border-card)',
              color: 'var(--accent-primary)'
            }}
          >
            {currentTab.loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {currentTab.loading ? 'Synthesizing...' : 'Regenerate Ideas'}
          </button>
        )}
      </div>

      {/* Filter Selector Pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.id;
          const isTabLoading = tabData[f.id]?.loading;
          const isTabGenerated = tabData[f.id]?.hasGenerated;

          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 relative"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-card-subtle)',
                borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-card)',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)'
              }}
            >
              {isTabLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              {f.label}
              {/* Subtle green indicator if tab has cached generated results */}
              {!isTabLoading && isTabGenerated && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area for Active Tab */}
      {currentTab.loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center animate-fade-in">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <p className="text-xs font-medium text-slate-400">
            Synthesizing <span className="text-white font-bold">{currentFilterObj.label}</span> recipes for your remaining macros...
          </p>
        </div>
      ) : !currentTab.hasGenerated ? (
        <div
          className="py-10 px-6 text-center rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all animate-fade-in"
          style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-1"
            style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
          >
            <currentFilterObj.icon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            Generate {currentFilterObj.label} Ideas
          </h4>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            Click below to calculate precision recipes matching your dietary preference and remaining calories.
          </p>
          <button
            onClick={() => fetchRecommendationsForTab(activeFilter)}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Sparkles className="w-4 h-4" />
            Generate {currentFilterObj.label} Ideas
          </button>
        </div>
      ) : currentTab.items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No meal suggestions returned for {currentFilterObj.label}. Click Regenerate Ideas to try again!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {currentTab.items.map((rec, idx) => (
            <div
              key={idx}
              className="border hover:border-slate-600 rounded-2xl p-4 flex flex-col justify-between transition-all group hover:shadow-lg"
              style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: 'var(--accent-glow)',
                      color: 'var(--accent-primary)',
                      borderColor: 'var(--accent-primary)'
                    }}
                  >
                    {rec.dietary}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rec.time_to_cook}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-slate-100 transition-colors">
                  {rec.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {rec.description}
                </p>

                {/* Items & Ingredients */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {rec.items.map((item, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md text-slate-300 border"
                      style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-card)' }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div
                  className="grid grid-cols-3 gap-1 py-2 border-t text-center text-xs mb-3"
                  style={{ borderColor: 'var(--border-card)' }}
                >
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Cals</span>
                    <span className="font-bold" style={{ color: 'var(--color-cal)' }}>{rec.calories}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Prot</span>
                    <span className="font-bold" style={{ color: 'var(--color-protein)' }}>{rec.protein_g}g</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Carb</span>
                    <span className="font-bold" style={{ color: 'var(--color-carbs)' }}>{rec.carbs_g}g</span>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickLog(rec.title, idx)}
                  disabled={loggingId === idx}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  {loggingId === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Logged!
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Quick Log This
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
