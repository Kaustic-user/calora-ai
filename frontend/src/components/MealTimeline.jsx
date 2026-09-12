import React from 'react';
import { Utensils, Trash2, Edit2, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

export default function MealTimeline({ meals, onDeleteMeal, onEditMeal, onAddMeal, isToday = true }) {
  if (!meals || meals.length === 0) {
    return (
      <div
        className="border rounded-3xl p-8 text-center shadow-xl transition-all"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        <div
          className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3"
          style={{
            backgroundColor: 'var(--accent-glow)',
            borderColor: 'var(--accent-primary)',
            color: 'var(--accent-primary)'
          }}
        >
          <Utensils className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-200">{isToday ? "No Meals Logged Today" : "No Meals Logged for this Date"}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Tap the voice assistant above or use the button below to manually log your meal!
        </p>
        {onAddMeal && (
          <button
            onClick={onAddMeal}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-black inline-flex items-center gap-1.5 shadow-md transition-all hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Meal</span>
          </button>
        )}
      </div>
    );
  }

  const getMealBadgeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'breakfast':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'lunch':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'dinner':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Utensils className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          {isToday ? "Today's Meals" : "Logged Meals"} ({meals.length})
        </h3>

        {onAddMeal && (
          <button
            onClick={onAddMeal}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm hover:scale-102 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)'
            }}
          >
            <Plus className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span>Add Meal</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="border hover:border-slate-600 rounded-2xl p-5 shadow-xl transition-all duration-200 group flex flex-col justify-between"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getMealBadgeColor(
                        meal.meal_type
                      )}`}
                    >
                      {meal.meal_type}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-1 group-hover:text-slate-100 transition-colors">
                    {meal.meal_title}
                  </h4>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {onEditMeal && (
                    <button
                      onClick={() => onEditMeal(meal)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                      title="Edit meal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteMeal(meal.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Delete meal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 mb-4">
                {meal.items &&
                  meal.items.map((item, idx) => {
                    const hasMacros = (item.protein_g > 0 || item.carbs_g > 0 || item.fat_g > 0 || item.fiber_g > 0);

                    return (
                      <div
                        key={idx}
                        className="relative group/item flex justify-between items-center text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:border-slate-600 hover:bg-slate-800/40 cursor-default"
                        style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
                      >
                        <span className="text-slate-300 font-medium truncate mr-2 group-hover/item:text-white transition-colors">
                          {item.portion ? `${item.portion} ` : ''}{item.name}
                        </span>
                        <span className="font-semibold text-slate-200 group-hover/item:text-emerald-400 transition-colors shrink-0">
                          {item.calories} kcal
                        </span>

                        {/* Custom Appealing Floating Tooltip (Macros Only) */}
                        {hasMacros && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-200 transform translate-y-1 group-hover/item:translate-y-0 z-30 shadow-2xl">
                            <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xl whitespace-nowrap">
                              {item.protein_g > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded-md">
                                  <span>🥩</span>
                                  <span>{item.protein_g}g Prot</span>
                                </span>
                              )}
                              {item.carbs_g > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                  <span>🌾</span>
                                  <span>{item.carbs_g}g Carb</span>
                                </span>
                              )}
                              {item.fat_g > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded-md">
                                  <span>🥑</span>
                                  <span>{item.fat_g}g Fat</span>
                                </span>
                              )}
                              {item.fiber_g > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                                  <span>🥗</span>
                                  <span>{item.fiber_g}g Fib</span>
                                </span>
                              )}
                            </div>
                            {/* Downward Pointer Arrow */}
                            <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-700/80 transform rotate-45 mx-auto -mt-1" />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Assumptions Tag if any */}
              {meal.assumptions && meal.assumptions.length > 0 && (
                <div className="mb-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300/90 leading-tight">
                    {meal.assumptions[0]}
                  </p>
                </div>
              )}
            </div>

            {/* Macros Footer */}
            <div
              className="grid grid-cols-4 gap-1.5 pt-3 border-t text-center text-xs"
              style={{ borderColor: 'var(--border-card)' }}
            >
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card-subtle)' }}>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Cals</span>
                <span className="font-bold" style={{ color: 'var(--color-cal)' }}>{meal.calories}</span>
              </div>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card-subtle)' }}>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Prot</span>
                <span className="font-bold" style={{ color: 'var(--color-protein)' }}>{meal.protein_g}g</span>
              </div>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card-subtle)' }}>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Carb</span>
                <span className="font-bold" style={{ color: 'var(--color-carbs)' }}>{meal.carbs_g}g</span>
              </div>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card-subtle)' }}>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Fat</span>
                <span className="font-bold" style={{ color: 'var(--color-fat)' }}>{meal.fat_g}g</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
