import React from 'react';
import { X, Check, Palette, Sparkles } from 'lucide-react';

export const THEMES = [
  {
    id: 'synthwave',
    name: 'Synthwave Horizon',
    badge: 'Cyberpunk',
    desc: 'Pitch black OLED canvas with glowing neon fuchsia, ultraviolet, and sunset orange.',
    bg: '#05050A',
    card: '#0D0C18',
    primary: '#EC4899',
    swatches: ['#EC4899', '#8B5CF6', '#FB923C', '#06B6D4']
  },
  {
    id: 'cyber',
    name: 'Midnight Cyber',
    badge: 'Linear / Arc Style',
    desc: 'Deep space obsidian with electric indigo and cyan neon glow.',
    bg: '#070A12',
    card: '#0E1424',
    primary: '#6366F1',
    swatches: ['#6366F1', '#818CF8', '#06B6D4', '#F59E0B']
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    badge: 'Classic Health-Tech',
    desc: 'Deep slate dark with electric emerald and radiant teal.',
    bg: '#0B0F17',
    card: '#111827',
    primary: '#10B981',
    swatches: ['#10B981', '#34D399', '#38BDF8', '#F59E0B']
  },
  {
    id: 'stealth',
    name: 'Stealth Performance',
    badge: 'Whoop / Nike Pro',
    desc: 'Matte carbon black with high-voltage neon lime and crimson flame.',
    bg: '#080808',
    card: '#141416',
    primary: '#84CC16',
    swatches: ['#84CC16', '#A3E635', '#EF4444', '#F97316']
  },
  {
    id: 'gold',
    name: 'Obsidian & Gold',
    badge: 'Oura Luxury Wellness',
    desc: 'Dark basalt with molten amber, champagne gold, and ruby accents.',
    bg: '#0A0908',
    card: '#161412',
    primary: '#F59E0B',
    swatches: ['#F59E0B', '#FBBF24', '#2DD4BF', '#E11D48']
  },
  {
    id: 'abyss',
    name: 'Abyss Bioluminescent',
    badge: 'Deep Ocean & Coral',
    desc: 'Mariana trench navy with glowing cyan and coral sunset highlights.',
    bg: '#040711',
    card: '#0A1124',
    primary: '#06B6D4',
    swatches: ['#06B6D4', '#38BDF8', '#FB7185', '#FBBF24']
  }
];

export default function ThemeSelectorModal({ currentTheme, onSelectTheme, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl rounded-3xl p-6 shadow-2xl border relative overflow-hidden transition-all"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-white shadow-md"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Visual Themes (6 Styles)</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose your favorite color palette</p>
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

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group ${
                  isSelected
                    ? 'ring-2 shadow-lg'
                    : 'hover:border-slate-500 opacity-85 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: theme.card,
                  borderColor: isSelected ? theme.primary : '#1E293B',
                  ringColor: theme.primary
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white group-hover:text-slate-100">{theme.name}</span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                      style={{
                        backgroundColor: `${theme.primary}18`,
                        color: theme.primary,
                        borderColor: `${theme.primary}35`
                      }}
                    >
                      {theme.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{theme.desc}</p>

                  {/* Color preview swatches */}
                  <div className="flex items-center gap-1.5 pt-1.5">
                    {theme.swatches.map((color, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                      ></span>
                    ))}
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'text-black'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                  style={{ backgroundColor: isSelected ? theme.primary : undefined, borderColor: isSelected ? theme.primary : undefined }}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold rounded-xl text-white transition-all shadow-md"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
