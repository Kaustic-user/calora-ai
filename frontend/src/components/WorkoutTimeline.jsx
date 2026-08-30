import React from 'react';
import { Dumbbell, Trash2, Clock, Flame, Zap } from 'lucide-react';

export default function WorkoutTimeline({ workouts, onDeleteWorkout }) {
  if (!workouts || workouts.length === 0) {
    return (
      <div 
        className="border rounded-3xl p-8 text-center shadow-xl transition-all"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        <div 
          className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3"
          style={{ 
            backgroundColor: 'rgba(244, 63, 94, 0.1)', 
            borderColor: 'rgba(244, 63, 94, 0.2)',
            color: '#F43F5E' 
          }}
        >
          <Dumbbell className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>No Workouts Logged Today</h4>
        <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          Record your exercise (e.g. <i>"45 min chest workout"</i> or <i>"Ran 5km"</i>) to automatically track calories burned!
        </p>
      </div>
    );
  }

  const getIntensityBadge = (intensity) => {
    switch (intensity?.toLowerCase()) {
      case 'vigorous':
      case 'high':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'moderate':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Dumbbell className="w-5 h-5 text-rose-400" />
          Today's Workouts ({workouts.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className="border hover:border-slate-500 rounded-2xl p-5 shadow-xl transition-all duration-200 group flex flex-col justify-between"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getIntensityBadge(
                        workout.intensity
                      )}`}
                    >
                      {workout.intensity || 'Moderate'} Intensity
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" />
                      {new Date(workout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-base font-bold mt-1 group-hover:text-rose-400 transition-colors" style={{ color: 'var(--text-main)' }}>
                    {workout.exercise_name}
                  </h4>
                </div>

                <button
                  onClick={() => onDeleteWorkout(workout.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Delete workout"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Muscle Groups */}
              {(() => {
                const muscleList = Array.isArray(workout.muscle_groups)
                  ? workout.muscle_groups
                  : (typeof workout.muscle_groups === 'string'
                      ? workout.muscle_groups.split(',').map(s => s.trim()).filter(Boolean)
                      : []);
                
                if (muscleList.length === 0) return null;

                return (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {muscleList.map((m, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                        style={{ 
                          backgroundColor: 'var(--bg-card-subtle)', 
                          borderColor: 'var(--border-card)',
                          color: 'var(--text-muted)' 
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Stats Footer */}
            <div 
              className="grid grid-cols-2 gap-2 pt-3 border-t text-center text-xs"
              style={{ borderColor: 'var(--border-card)' }}
            >
              <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card-subtle)' }}>
                <span className="text-[10px] uppercase block font-medium" style={{ color: 'var(--text-muted)' }}>Duration</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{workout.duration_minutes} mins</span>
              </div>
              <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card-subtle)' }}>
                <span className="text-[10px] uppercase block font-medium" style={{ color: 'var(--text-muted)' }}>Burned</span>
                <span className="font-bold text-sm text-rose-500 flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {workout.calories_burned} kcal
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
