import React, { useState, useEffect } from 'react';
import { X, Utensils, Dumbbell, Plus, Trash2, Check, Sparkles, AlertCircle, Flame, RotateCcw, Zap } from 'lucide-react';

const MET_VALUES = {
  hiit: 10.0,
  cardio: 8.5,
  sports: 7.0,
  strength: 5.0,
  yoga: 3.0
};

const INTENSITY_MULTIPLIERS = {
  low: 0.8,
  moderate: 1.0,
  high: 1.25
};

export const calculateWorkoutCalories = (cat, intens, durMin, weightKg = 70.0) => {
  const baseMet = MET_VALUES[cat] || 5.0;
  const mult = INTENSITY_MULTIPLIERS[intens] || 1.0;
  const effectiveMet = baseMet * mult;
  const dur = parseFloat(durMin) || 0;
  const wt = parseFloat(weightKg) || 70.0;
  const burned = Math.round(effectiveMet * wt * (dur / 60.0) * 10) / 10;
  const burnRatePerMin = Math.round(((effectiveMet * wt) / 60.0) * 10) / 10;
  return { burned, burnRatePerMin, effectiveMet };
};

export default function EditLogModal({
  isOpen,
  onClose,
  mode, // 'meal' or 'workout'
  initialData, // Object to edit, or null if creating new
  selectedDate,
  userWeightKg = 70.0,
  onSave
}) {
  const isCreate = !initialData?.id;

  // Meal State
  const [mealTitle, setMealTitle] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [items, setItems] = useState([]);
  const [logDate, setLogDate] = useState(selectedDate || '');

  // Workout State
  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState('strength');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('moderate');
  const [caloriesBurned, setCaloriesBurned] = useState(175);
  const [isManualCalorieOverride, setIsManualCalorieOverride] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hydrate modal with initial data or defaults
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      const targetDate = initialData?.log_date || selectedDate || new Date().toISOString().split('T')[0];
      setLogDate(targetDate);

      if (mode === 'meal') {
        if (initialData) {
          setMealTitle(initialData.meal_title || '');
          setMealType(initialData.meal_type || 'lunch');
          setCalories(initialData.calories !== undefined ? initialData.calories : 0);
          setProtein(initialData.protein_g !== undefined ? initialData.protein_g : 0);
          setCarbs(initialData.carbs_g !== undefined ? initialData.carbs_g : 0);
          setFat(initialData.fat_g !== undefined ? initialData.fat_g : 0);
          setFiber(initialData.fiber_g !== undefined ? initialData.fiber_g : 0);

          const rawItems = initialData.items && Array.isArray(initialData.items) ? initialData.items : [];
          const normalizedItems = rawItems.map((it) => ({
            name: it.name || '',
            portion: it.portion || '1 Serving',
            quantity: it.quantity !== undefined ? it.quantity : 1,
            unit: it.unit || 'serving',
            calories: it.calories !== undefined ? it.calories : 0,
            protein_g: it.protein_g !== undefined ? it.protein_g : 0,
            carbs_g: it.carbs_g !== undefined ? it.carbs_g : 0,
            fat_g: it.fat_g !== undefined ? it.fat_g : 0,
            fiber_g: it.fiber_g !== undefined ? it.fiber_g : 0,
          }));
          setItems(normalizedItems);
        } else {
          setMealTitle('');
          setMealType('lunch');
          setCalories(0);
          setProtein(0);
          setCarbs(0);
          setFat(0);
          setFiber(0);
          setItems([]);
        }
      } else {
        if (initialData) {
          setExerciseName(initialData.exercise_name || '');
          setCategory(initialData.workout_category || 'strength');
          setDuration(initialData.duration_minutes || 30);
          setIntensity(initialData.intensity || 'moderate');
          setCaloriesBurned(initialData.calories_burned !== undefined ? initialData.calories_burned : 0);
          setIsManualCalorieOverride(true);
        } else {
          setExerciseName('');
          setCategory('strength');
          setIntensity('moderate');
          setDuration(30);
          const { burned } = calculateWorkoutCalories('strength', 'moderate', 30, userWeightKg);
          setCaloriesBurned(burned);
          setIsManualCalorieOverride(false);
        }
      }
    }
  }, [isOpen, mode, initialData, selectedDate, userWeightKg]);

  if (!isOpen) return null;

  // Handle workout parameter changes with auto MET calculation
  const handleWorkoutFieldChange = (field, value) => {
    let nextCat = category;
    let nextIntens = intensity;
    let nextDur = duration;

    if (field === 'category') {
      nextCat = value;
      setCategory(value);
    } else if (field === 'intensity') {
      nextIntens = value;
      setIntensity(value);
    } else if (field === 'duration') {
      nextDur = parseFloat(value) || 0;
      setDuration(value);
    }

    // When modifying parameters, automatically update calories and reset manual override
    const { burned } = calculateWorkoutCalories(nextCat, nextIntens, nextDur, userWeightKg);
    setCaloriesBurned(burned);
    setIsManualCalorieOverride(false);
  };

  const handleManualCalorieChange = (val) => {
    setCaloriesBurned(val);
    setIsManualCalorieOverride(true);
  };

  const handleResetToMet = () => {
    const { burned } = calculateWorkoutCalories(category, intensity, duration, userWeightKg);
    setCaloriesBurned(burned);
    setIsManualCalorieOverride(false);
  };

  const metStats = calculateWorkoutCalories(category, intensity, duration, userWeightKg);

  // Recalculates top-level total macros dynamically from subcomponent items
  const recalculateTotals = (itemsList) => {
    if (!itemsList || itemsList.length === 0) {
      setCalories(0);
      setProtein(0);
      setCarbs(0);
      setFat(0);
      setFiber(0);
      return;
    }
    const sumCals = itemsList.reduce((acc, i) => acc + (parseFloat(i.calories) || 0), 0);
    const sumProt = itemsList.reduce((acc, i) => acc + (parseFloat(i.protein_g) || 0), 0);
    const sumCarbs = itemsList.reduce((acc, i) => acc + (parseFloat(i.carbs_g) || 0), 0);
    const sumFat = itemsList.reduce((acc, i) => acc + (parseFloat(i.fat_g) || 0), 0);
    const sumFiber = itemsList.reduce((acc, i) => acc + (parseFloat(i.fiber_g) || 0), 0);

    setCalories(Math.round(sumCals * 10) / 10);
    setProtein(Math.round(sumProt * 10) / 10);
    setCarbs(Math.round(sumCarbs * 10) / 10);
    setFat(Math.round(sumFat * 10) / 10);
    setFiber(Math.round(sumFiber * 10) / 10);
  };

  // Item list helpers with dynamic re-summing
  const handleAddItem = () => {
    const newItem = {
      name: '',
      portion: '1 Serving',
      quantity: 1,
      unit: 'serving',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0
    };
    const nextItems = [...items, newItem];
    setItems(nextItems);
    recalculateTotals(nextItems);
  };

  const handleUpdateItem = (index, field, value) => {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setItems(nextItems);

    // If any nutritional metric is modified, dynamically re-sum the totals at the top
    if (['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'].includes(field)) {
      recalculateTotals(nextItems);
    }
  };

  const handleRemoveItem = (index) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    recalculateTotals(nextItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (mode === 'meal') {
        const formattedItems = items.map((it) => ({
          name: it.name || mealTitle || 'Food Item',
          portion: it.portion || '1 Serving',
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || 'serving',
          calories: parseFloat(it.calories) || 0,
          protein_g: parseFloat(it.protein_g) || 0,
          carbs_g: parseFloat(it.carbs_g) || 0,
          fat_g: parseFloat(it.fat_g) || 0,
          fiber_g: parseFloat(it.fiber_g) || 0
        }));

        const payload = {
          meal_title: mealTitle || 'Healthy Meal',
          meal_type: mealType,
          items: formattedItems.length > 0 ? formattedItems : [{
            name: mealTitle || 'Meal',
            portion: '1 Serving',
            quantity: 1,
            unit: 'serving',
            calories: parseFloat(calories) || 0,
            protein_g: parseFloat(protein) || 0,
            carbs_g: parseFloat(carbs) || 0,
            fat_g: parseFloat(fat) || 0,
            fiber_g: parseFloat(fiber) || 0
          }],
          calories: parseFloat(calories) || 0,
          protein_g: parseFloat(protein) || 0,
          carbs_g: parseFloat(carbs) || 0,
          fat_g: parseFloat(fat) || 0,
          fiber_g: parseFloat(fiber) || 0,
          log_date: logDate
        };

        const url = isCreate ? '/api/logs/meals' : `/api/logs/meals/${initialData.id}`;
        const method = isCreate ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());
      } else {
        const payload = {
          exercise_name: exerciseName || 'Workout Session',
          workout_category: category,
          duration_minutes: parseInt(duration) || 30,
          intensity: intensity,
          calories_burned: parseFloat(caloriesBurned) || 0,
          muscle_groups: 'Full Body',
          notes: 'Manually edited via dashboard',
          log_date: logDate
        };

        const url = isCreate ? '/api/logs/workouts' : `/api/logs/workouts/${initialData.id}`;
        const method = isCreate ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());
      }

      onSave(logDate);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMsg('Failed to save changes. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg border rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[90vh] transition-all"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: mode === 'meal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: mode === 'meal' ? 'var(--accent-primary)' : '#F43F5E'
              }}
            >
              {mode === 'meal' ? <Utensils className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isCreate ? `Add ${mode === 'meal' ? 'Meal' : 'Workout'}` : `Edit ${mode === 'meal' ? 'Meal' : 'Workout'}`}
              </h3>
              <p className="text-xs text-slate-400">
                {isCreate ? 'Log a manual entry for any date' : 'Modify portions, calories, or target date'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Log Date
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* MEAL FORM */}
          {mode === 'meal' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Meal Title
                  </label>
                  <input
                    type="text"
                    value={mealTitle}
                    onChange={(e) => setMealTitle(e.target.value)}
                    placeholder="e.g. 2 Rotis with Dal Tadka"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Meal Type
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
              </div>

              {/* Total Macros Grid */}
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Nutritional Breakdown</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400">Calories (kcal)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-indigo-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Fat (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-rose-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Fiber (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fiber}
                      onChange={(e) => setFiber(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-cyan-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Ingredient / Dish Subcomponents ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.length === 0 ? (
                  <div
                    onClick={handleAddItem}
                    className="p-4 rounded-2xl border border-dashed border-slate-700/80 hover:border-emerald-500/50 bg-slate-900/30 hover:bg-slate-900/60 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-emerald-500/15 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-slate-300 group-hover:text-white font-medium">
                      No subcomponents added yet
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Click to add individual dishes or ingredients (optional)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl border space-y-2.5 transition-all"
                        style={{
                          backgroundColor: 'var(--bg-card-subtle, rgba(15, 23, 42, 0.6))',
                          borderColor: 'var(--border-card, rgba(51, 65, 85, 0.5))'
                        }}
                      >
                        {/* Top Row: Item Name, Portion, and Delete Action */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              placeholder="Dish / Ingredient (e.g. 2 Rotis)"
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                          <div className="w-28 sm:w-32">
                            <input
                              type="text"
                              value={it.portion}
                              onChange={(e) => handleUpdateItem(idx, 'portion', e.target.value)}
                              placeholder="Portion (e.g. 2 pcs)"
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Bottom Row: Editable Macros Grid (Cal, Prot, Carbs, Fat, Fiber) */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5 text-center">
                              Cal
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={it.calories}
                              onChange={(e) => handleUpdateItem(idx, 'calories', e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-900/80 border border-emerald-500/30 focus:border-emerald-400 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-emerald-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5 text-center">
                              Prot (g)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={it.protein_g}
                              onChange={(e) => handleUpdateItem(idx, 'protein_g', e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-900/80 border border-indigo-500/30 focus:border-indigo-400 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-indigo-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-0.5 text-center">
                              Carb (g)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={it.carbs_g}
                              onChange={(e) => handleUpdateItem(idx, 'carbs_g', e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-900/80 border border-amber-500/30 focus:border-amber-400 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-amber-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-rose-400 mb-0.5 text-center">
                              Fat (g)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={it.fat_g}
                              onChange={(e) => handleUpdateItem(idx, 'fat_g', e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-900/80 border border-rose-500/30 focus:border-rose-400 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-rose-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-cyan-400 mb-0.5 text-center">
                              Fib (g)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={it.fiber_g}
                              onChange={(e) => handleUpdateItem(idx, 'fiber_g', e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-900/80 border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-cyan-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* WORKOUT FORM */
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Exercise / Activity Name
                </label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="e.g. Outdoor Running, Chest & Triceps, HIIT Tabata"
                  required
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleWorkoutFieldChange('category', e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="strength">Strength / Weights</option>
                    <option value="cardio">Cardio / Running</option>
                    <option value="hiit">HIIT Circuit</option>
                    <option value="yoga">Yoga / Mobility</option>
                    <option value="sports">Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Intensity
                  </label>
                  <select
                    value={intensity}
                    onChange={(e) => handleWorkoutFieldChange('intensity', e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="low">Low (Light • 0.8x)</option>
                    <option value="moderate">Moderate (1.0x)</option>
                    <option value="high">High / Vigorous (1.25x)</option>
                  </select>
                </div>
              </div>

              {/* Quick Preset Duration Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Duration Presets
                  </label>
                  <span className="text-[10px] text-slate-400">Click to set duration</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleWorkoutFieldChange('duration', mins)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        parseFloat(duration) === mins
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Calories Burned Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={duration}
                    onChange={(e) => handleWorkoutFieldChange('duration', e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Calories (kcal)
                    </label>
                    {isManualCalorieOverride ? (
                      <button
                        type="button"
                        onClick={handleResetToMet}
                        className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Reset to MET scientific calculation"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset (MET)</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-400 flex items-center gap-0.5">
                        <Zap className="w-3 h-3 text-rose-400" />
                        <span>Auto-MET</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={caloriesBurned}
                    onChange={(e) => handleManualCalorieChange(e.target.value)}
                    required
                    className={`w-full bg-slate-900/80 border rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none transition-all ${
                      isManualCalorieOverride
                        ? 'text-amber-400 border-amber-500/40 focus:border-amber-400'
                        : 'text-rose-400 border-slate-700 focus:border-rose-400'
                    }`}
                  />
                </div>
              </div>

              {/* Dynamic Burn Rate & MET Estimation Info Tag */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px]">
                    Est. Burn Rate: <strong className="text-rose-400">~{metStats.burnRatePerMin} kcal/min</strong>
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  MET {metStats.effectiveMet} • Body Weight: <strong className="text-slate-200">{userWeightKg} kg</strong>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-black flex items-center gap-2 shadow-lg transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#000000' }}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : (isCreate ? 'Add Entry' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
