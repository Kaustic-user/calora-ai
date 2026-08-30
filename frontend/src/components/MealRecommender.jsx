import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Check, Clock, Sparkles, Loader2, Zap, Flame, Leaf } from 'lucide-react';

const FILTERS = [
  { id: '', label: 'AI Best Match', icon: Sparkles },
  { id: 'quick', label: 'Under 15 Mins', icon: Zap },
  { id: 'high_protein', label: 'Max Protein', icon: Flame },
  { id: 'light', label: 'Light & Clean', icon: Leaf },
];

export default function MealRecommender({ onQuickLog }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [loggingId, setLoggingId] = useState(null);

  const fetchRecommendations = async (filterVal = activeFilter) => {
    setLoading(true);
    try {
      const url = filterVal 
        ? `/api/recommendations/dinner?filter=${encodeURIComponent(filterVal)}`
        : '/api/recommendations/dinner';
      const res = await fetch(url);
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(activeFilter);
  }, [activeFilter]);

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

        <button
          onClick={() => fetchRecommendations(activeFilter)}
          disabled={loading}
          className="text-xs hover:text-white transition-colors flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-xl border self-start sm:self-auto"
          style={{ 
            backgroundColor: 'var(--bg-card-subtle)',
            borderColor: 'var(--border-card)',
            color: 'var(--accent-primary)' 
          }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {loading ? 'Synthesizing...' : 'Regenerate AI Ideas'}
        </button>
      </div>

      {/* Filter Selector Pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-card-subtle)',
                borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-card)',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)'
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <p className="text-xs font-medium text-slate-400">
            Calculating optimal ingredient portions for your macro budget...
          </p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No meal suggestions available. Tap regenerate to generate new ideas!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
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
