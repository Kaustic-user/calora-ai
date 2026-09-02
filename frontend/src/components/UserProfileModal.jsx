import React, { useState, useEffect } from 'react';
import { X, Save, Target, Brain, Trash2, CheckCircle2, Flame } from 'lucide-react';

export default function UserProfileModal({ profile, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'memory'
  const [calorieTarget, setCalorieTarget] = useState(profile?.calorie_target || profile?.daily_calorie_target || 2000);
  const [proteinTarget, setProteinTarget] = useState(profile?.protein_target || profile?.daily_protein_target || 120);
  const [carbsTarget, setCarbsTarget] = useState(profile?.carbs_target || profile?.daily_carbs_target || 225);
  const [fatTarget, setFatTarget] = useState(profile?.fat_target || profile?.daily_fat_target || 65);
  const [weightKg, setWeightKg] = useState(profile?.weight_kg || 70.0);
  const [heightCm, setHeightCm] = useState(profile?.height_cm || 175.0);
  const [age, setAge] = useState(profile?.age || 25);
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level || 'sedentary');
  const [targetDeficit, setTargetDeficit] = useState(profile?.target_deficit_kcal || 500);
  const [dietaryPref, setDietaryPref] = useState(profile?.dietary_preference || 'vegetarian');
  
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Live BMR & TDEE calculation
  const calculateBmrAndTdee = (w, h, a, g, act) => {
    const wt = parseFloat(w) || 70;
    const ht = parseFloat(h) || 175;
    const ag = parseInt(a) || 25;
    const bmrVal = (g === 'female')
      ? (10 * wt) + (6.25 * ht) - (5 * ag) - 161
      : (10 * wt) + (6.25 * ht) - (5 * ag) + 5;
    
    const mults = {
      sedentary: 1.200,
      lightly_active: 1.375,
      moderately_active: 1.550,
      very_active: 1.725,
      extra_active: 1.900,
    };
    const tdeeVal = bmrVal * (mults[act] || 1.200);
    return { bmr: Math.round(bmrVal), tdee: Math.round(tdeeVal) };
  };

  const { bmr: liveBmr, tdee: liveTdee } = calculateBmrAndTdee(weightKg, heightCm, age, gender, activityLevel);

  const fetchMemories = async () => {
    setLoadingMemories(true);
    try {
      const res = await fetch('/api/profile/memories');
      const data = await res.json();
      setMemories(data);
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'memory') {
      fetchMemories();
    }
  }, [activeTab]);

  const handleDeleteMemory = async (memoryId) => {
    try {
      await fetch(`/api/profile/memories/${memoryId}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      calorie_target: parseInt(calorieTarget),
      protein_target: parseFloat(proteinTarget),
      carbs_target: parseFloat(carbsTarget),
      fat_target: parseFloat(fatTarget),
      weight_kg: parseFloat(weightKg) || 70.0,
      height_cm: parseFloat(heightCm) || 175.0,
      age: parseInt(age) || 25,
      gender: gender,
      activity_level: activityLevel,
      target_deficit_kcal: parseInt(targetDeficit) || 500,
      dietary_preference: dietaryPref,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-xl rounded-3xl p-6 shadow-2xl border relative overflow-hidden transition-all my-8"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-xl text-white shadow-md"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {activeTab === 'goals' ? <Target className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                {activeTab === 'goals' ? 'TDEE & Nutrition Goals' : 'AI Learned Memory & Habits'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {activeTab === 'goals' ? 'Physical metrics, metabolic baseline, and daily targets' : 'Preferences saved from your clarification choices'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800/20 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div 
          className="flex p-1 rounded-xl border mb-5 text-xs font-semibold"
          style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
        >
          <button
            onClick={() => setActiveTab('goals')}
            className="flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: activeTab === 'goals' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'goals' ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            <Target className="w-4 h-4" />
            TDEE & Goals
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className="flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: activeTab === 'memory' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'memory' ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            <Brain className="w-4 h-4" />
            Learned Habits ({memories.length})
          </button>
        </div>

        {activeTab === 'goals' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live TDEE & BMR Calculation Overview */}
            <div 
              className="border p-4 rounded-2xl flex flex-col gap-3 shadow-md transition-all"
              style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                  Calculated Energy Expenditure
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div 
                  className="p-3 rounded-xl border transition-all" 
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
                >
                  <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    BMR (At Rest)
                  </p>
                  <p className="text-base font-extrabold mt-0.5" style={{ color: 'var(--text-main)' }}>
                    {liveBmr} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>kcal/day</span>
                  </p>
                </div>
                <div 
                  className="p-3 rounded-xl border transition-all" 
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
                >
                  <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Maintenance TDEE
                  </p>
                  <p className="text-base font-extrabold mt-0.5" style={{ color: 'var(--text-main)' }}>
                    {liveTdee} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>kcal/day</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Physical Attributes Grid */}
            <div 
              className="border p-4 rounded-2xl space-y-3 transition-all" 
              style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Body & Lifestyle Metrics (For TDEE)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Gender */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Biological Sex
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                    placeholder="25"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                    placeholder="175"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full border rounded-xl p-2 text-xs focus:outline-none focus:ring-2 transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                    placeholder="70.0"
                  />
                </div>
              </div>

              {/* Activity Level Dropdown */}
              <div>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Lifestyle / Physical Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition-all"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                >
                  <option value="sedentary">Sedentary (Desk job, minimal movement × 1.20)</option>
                  <option value="lightly_active">Lightly Active (Walking, light exercise 1-3 days × 1.38)</option>
                  <option value="moderately_active">Moderately Active (8k-10k steps, moderate gym 3-5 days × 1.55)</option>
                  <option value="very_active">Very Active (Heavy manual work or training 6-7 days × 1.73)</option>
                  <option value="extra_active">Athlete / Extreme Training (2x/day or physical labor × 1.90)</option>
                </select>
              </div>
            </div>

            {/* Dietary Preference & Targets */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                Dietary Preference
              </label>
              <select
                value={dietaryPref}
                onChange={(e) => setDietaryPref(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-card-subtle)', 
                  borderColor: 'var(--border-card)',
                  color: 'var(--text-main)' 
                }}
              >
                <option value="vegetarian">Vegetarian (Indian / Global)</option>
                <option value="eggetarian">Eggetarian (Vegetarian + Eggs)</option>
                <option value="non-vegetarian">Non-Vegetarian (Chicken, Fish, Meat)</option>
                <option value="vegan">Vegan (100% Plant-Based)</option>
                <option value="jain">Jain (No onion, garlic, or root vegetables)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Daily Calorie Goal (kcal)
                </label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--bg-card-subtle)', 
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)' 
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Protein Target (g)
                </label>
                <input
                  type="number"
                  value={proteinTarget}
                  onChange={(e) => setProteinTarget(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--bg-card-subtle)', 
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)' 
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Carbs Target (g)
                </label>
                <input
                  type="number"
                  value={carbsTarget}
                  onChange={(e) => setCarbsTarget(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--bg-card-subtle)', 
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)' 
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Fats Target (g)
                </label>
                <input
                  type="number"
                  value={fatTarget}
                  onChange={(e) => setFatTarget(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--bg-card-subtle)', 
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)' 
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4" style={{ borderColor: 'var(--border-card)' }}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-black rounded-xl shadow-lg transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#000000' }}
              >
                <Save className="w-4 h-4" />
                Save TDEE & Goals
              </button>
            </div>
          </form>
        ) : (
          /* Memory & Habits Tab */
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              When you resolve clarification questions (e.g. choosing <i>"Black Coffee"</i> or <i>"No Ghee"</i>), Calora stores them here so it never asks again.
            </p>

            {loadingMemories ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading learned habits...</p>
            ) : memories.length === 0 ? (
              <div className="text-center py-8 border rounded-2xl p-4" style={{ borderColor: 'var(--border-card)' }}>
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>No saved habits yet</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Log a meal with options (like coffee or tea) and choose a preference to see it recorded here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-center justify-between p-3 rounded-2xl border transition-all"
                    style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{mem.key}</span>
                        <span 
                          className="text-[10px] px-1.5 py-0.2 rounded border uppercase font-bold"
                          style={{ 
                            backgroundColor: 'var(--accent-glow)', 
                            color: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)' 
                          }}
                        >
                          {mem.category}
                        </span>
                      </div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        {mem.value}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Forget this habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t mt-4" style={{ borderColor: 'var(--border-card)' }}>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
