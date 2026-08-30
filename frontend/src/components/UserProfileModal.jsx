import React, { useState, useEffect } from 'react';
import { X, Save, User, Target, Brain, Trash2, CheckCircle2 } from 'lucide-react';

export default function UserProfileModal({ profile, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'memory'
  const [calorieTarget, setCalorieTarget] = useState(profile?.daily_calorie_target || profile?.calorie_target || 2000);
  const [proteinTarget, setProteinTarget] = useState(profile?.daily_protein_target || profile?.protein_target || 120);
  const [carbsTarget, setCarbsTarget] = useState(profile?.daily_carbs_target || profile?.carbs_target || 225);
  const [fatTarget, setFatTarget] = useState(profile?.daily_fat_target || profile?.fat_target || 65);
  const [weightKg, setWeightKg] = useState(profile?.weight_kg || 70.0);
  const [dietaryPref, setDietaryPref] = useState(profile?.dietary_preference || 'vegetarian');
  
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

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
      dietary_preference: dietaryPref,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border relative overflow-hidden transition-all"
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
                {activeTab === 'goals' ? 'Nutrition Goals & Preferences' : 'AI Learned Memory & Habits'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {activeTab === 'goals' ? 'Configure targets & dietary preferences' : 'Preferences saved from your clarification choices'}
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
            Daily Targets
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
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                Dietary Preference
              </label>
              <select
                value={dietaryPref}
                onChange={(e) => setDietaryPref(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 transition-all"
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
                  Daily Calories (kcal)
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                Body Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-card-subtle)', 
                  borderColor: 'var(--border-card)',
                  color: 'var(--text-main)' 
                }}
                placeholder="e.g. 70.0"
              />
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
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Save className="w-4 h-4" />
                Save Goals
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
