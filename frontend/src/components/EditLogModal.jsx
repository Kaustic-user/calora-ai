import React, { useState, useEffect } from 'react';
import { X, Utensils, Dumbbell, Plus, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function EditLogModal({
  isOpen,
  onClose,
  mode, // 'meal' or 'workout'
  initialData, // Object to edit, or null if creating new
  selectedDate,
  onSave
}) {
  const isCreate = !initialData?.id;

  // Meal State
  const [mealTitle, setMealTitle] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState(300);
  const [protein, setProtein] = useState(15);
  const [carbs, setCarbs] = useState(40);
  const [fat, setFat] = useState(8);
  const [fiber, setFiber] = useState(4);
  const [items, setItems] = useState([]);
  const [logDate, setLogDate] = useState(selectedDate || '');

  // Workout State
  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState('strength');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('moderate');
  const [caloriesBurned, setCaloriesBurned] = useState(200);

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
          setCalories(initialData.calories || 0);
          setProtein(initialData.protein_g || 0);
          setCarbs(initialData.carbs_g || 0);
          setFat(initialData.fat_g || 0);
          setFiber(initialData.fiber_g || 0);
          setItems(initialData.items && Array.isArray(initialData.items) ? [...initialData.items] : []);
        } else {
          setMealTitle('');
          setMealType('lunch');
          setCalories(350);
          setProtein(15);
          setCarbs(45);
          setFat(10);
          setFiber(5);
          setItems([{ name: 'Roti with Sabzi', portion: '1 Serving', quantity: 1, unit: 'plate', calories: 350, protein_g: 15, carbs_g: 45, fat_g: 10, fiber_g: 5 }]);
        }
      } else {
        if (initialData) {
          setExerciseName(initialData.exercise_name || '');
          setCategory(initialData.workout_category || 'strength');
          setDuration(initialData.duration_minutes || 30);
          setIntensity(initialData.intensity || 'moderate');
          setCaloriesBurned(initialData.calories_burned || 0);
        } else {
          setExerciseName('Strength Training');
          setCategory('strength');
          setDuration(30);
          setIntensity('moderate');
          setCaloriesBurned(180);
        }
      }
    }
  }, [isOpen, mode, initialData, selectedDate]);

  if (!isOpen) return null;

  // Item list helper
  const handleAddItem = () => {
    setItems([...items, { name: 'Food Item', portion: '1 Serving', quantity: 1, unit: 'serving', calories: 100, protein_g: 5, carbs_g: 15, fat_g: 2, fiber_g: 1 }]);
  };

  const handleUpdateItem = (index, field, value) => {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setItems(nextItems);

    // If calories/macros in items are modified, re-sum
    if (['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'].includes(field)) {
      const sumCals = nextItems.reduce((acc, i) => acc + (parseFloat(i.calories) || 0), 0);
      const sumProt = nextItems.reduce((acc, i) => acc + (parseFloat(i.protein_g) || 0), 0);
      const sumCarbs = nextItems.reduce((acc, i) => acc + (parseFloat(i.carbs_g) || 0), 0);
      const sumFat = nextItems.reduce((acc, i) => acc + (parseFloat(i.fat_g) || 0), 0);
      const sumFiber = nextItems.reduce((acc, i) => acc + (parseFloat(i.fiber_g) || 0), 0);

      setCalories(Math.round(sumCals * 10) / 10);
      setProtein(Math.round(sumProt * 10) / 10);
      setCarbs(Math.round(sumCarbs * 10) / 10);
      setFat(Math.round(sumFat * 10) / 10);
      setFiber(Math.round(sumFiber * 10) / 10);
    }
  };

  const handleRemoveItem = (index) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (mode === 'meal') {
        const payload = {
          meal_title: mealTitle || 'Healthy Meal',
          meal_type: mealType,
          items: items.length > 0 ? items : [{ name: mealTitle || 'Meal', portion: '1 Serving', quantity: 1, unit: 'serving', calories: parseFloat(calories) || 0, protein_g: parseFloat(protein) || 0, carbs_g: parseFloat(carbs) || 0, fat_g: parseFloat(fat) || 0, fiber_g: parseFloat(fiber) || 0 }],
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Ingredient / Dish Items ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-xs">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="flex-1 bg-transparent border-none text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={it.portion}
                        onChange={(e) => handleUpdateItem(idx, 'portion', e.target.value)}
                        placeholder="Portion"
                        className="w-24 bg-slate-800 px-2 py-1 rounded text-slate-300 text-[11px]"
                      />
                      <input
                        type="number"
                        value={it.calories}
                        onChange={(e) => handleUpdateItem(idx, 'calories', e.target.value)}
                        placeholder="kcal"
                        className="w-16 bg-slate-800 px-2 py-1 rounded text-emerald-400 font-bold text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  placeholder="e.g. Outdoor Running, Chest & Triceps"
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
                    onChange={(e) => setCategory(e.target.value)}
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
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="low">Low (Light)</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High / Vigorous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => {
                      const dur = parseInt(e.target.value) || 0;
                      setDuration(dur);
                      // Auto-estimate calories if user modifies duration
                      const baseBurnPerMin = category === 'cardio' ? 10 : (category === 'hiit' ? 11 : 6.5);
                      setCaloriesBurned(Math.round(dur * baseBurnPerMin));
                    }}
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Calories Burned (kcal)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={caloriesBurned}
                    onChange={(e) => setCaloriesBurned(e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-rose-400 font-bold focus:outline-none focus:border-rose-400"
                  />
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
