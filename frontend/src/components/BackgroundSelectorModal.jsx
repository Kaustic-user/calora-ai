import React from 'react';
import { X, Check, Compass, Sparkles } from 'lucide-react';

export const BACKGROUNDS = [
  {
    id: 'spacetime',
    name: 'Einstein Spacetime Grid',
    badge: 'General Relativity',
    desc: '2D spacetime mesh that curves and indents inward toward the cursor gravity well.',
    icon: '⚛️'
  },
  {
    id: 'metabolic',
    name: 'Metabolic ATP Lattice',
    badge: 'Cellular Energy',
    desc: 'Hexagonal glucose & ATP bonds that ignite into metabolic energy sparks on hover.',
    icon: '⚡'
  },
  {
    id: 'amino',
    name: 'Amino Acid Peptide Chains',
    badge: 'Macros & Protein',
    desc: 'Protein, Carbs, Fats & Fiber molecular spheres that break and bond in real-time.',
    icon: '🧪'
  },
  {
    id: 'magnetic',
    name: 'Magnetic Monopole Field',
    badge: 'Flux Vectors',
    desc: 'Matrix of microscopic needles that dynamically rotate along magnetic flux lines.',
    icon: '🧲'
  },
  {
    id: 'interstellar',
    name: 'Interstellar Lensing',
    badge: 'Deep Cosmos',
    desc: 'Starfield with relativistic optical gravitational lensing and orbiting satellites.',
    icon: '🪐'
  }
];

export default function BackgroundSelectorModal({ currentBg, onSelectBg, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-xl rounded-3xl p-6 shadow-2xl border relative overflow-hidden transition-all"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-xl text-white shadow-md"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Interactive Backgrounds</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose your favorite interactive canvas effect</p>
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

        {/* List of 5 Curated Backgrounds */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {BACKGROUNDS.map((bg) => {
            const isSelected = currentBg === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => onSelectBg(bg.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group ${
                  isSelected 
                    ? 'ring-2 shadow-lg' 
                    : 'hover:border-slate-500 opacity-85 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: 'var(--bg-card-subtle)', 
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-card)',
                  ringColor: isSelected ? 'var(--accent-primary)' : undefined
                }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl shrink-0 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                    {bg.icon}
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-slate-100">{bg.name}</span>
                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                        style={{ 
                          backgroundColor: 'var(--accent-glow)', 
                          color: 'var(--accent-primary)', 
                          borderColor: 'var(--accent-primary)' 
                        }}
                      >
                        {bg.badge}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bg.desc}</p>
                  </div>
                </div>

                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ml-3 transition-all ${
                    isSelected ? 'text-black' : 'border-slate-700 bg-slate-900'
                  }`}
                  style={{ 
                    backgroundColor: isSelected ? 'var(--accent-primary)' : undefined, 
                    borderColor: isSelected ? 'var(--accent-primary)' : undefined 
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold rounded-xl text-white transition-all shadow-md"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
}
