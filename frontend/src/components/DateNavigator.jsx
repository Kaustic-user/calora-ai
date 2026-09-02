import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, RotateCcw } from 'lucide-react';

export default function DateNavigator({ selectedDate, onDateChange }) {
  const dateInputRef = useRef(null);

  // Helper to format date strings YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === yesterdayStr;

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onDateChange(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onDateChange(`${year}-${month}-${day}`);
  };

  const formatDisplayDate = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    if (isToday) {
      return `Today (${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
    }
    if (isYesterday) {
      return `Yesterday (${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
    }
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div 
      className="border rounded-2xl p-3 sm:p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 transition-all duration-300 backdrop-blur-md"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
    >
      {/* Left: Quick Date Shortcuts */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onDateChange(todayStr)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isToday 
              ? 'text-white shadow-md' 
              : 'text-slate-400 hover:text-white border border-slate-700/50 hover:bg-slate-800/50'
          }`}
          style={isToday ? { backgroundColor: 'var(--accent-primary)', color: '#000' } : {}}
        >
          Today
        </button>
        <button
          onClick={() => onDateChange(yesterdayStr)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isYesterday 
              ? 'text-white shadow-md' 
              : 'text-slate-400 hover:text-white border border-slate-700/50 hover:bg-slate-800/50'
          }`}
          style={isYesterday ? { backgroundColor: 'var(--accent-primary)', color: '#000' } : {}}
        >
          Yesterday
        </button>
      </div>

      {/* Center: Interactive Day Switcher */}
      <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-2 py-1 rounded-xl">
        <button
          onClick={handlePrevDay}
          title="Previous Day"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Date Trigger button connected to hidden date input */}
        <div className="relative">
          <button
            onClick={() => dateInputRef.current && dateInputRef.current.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current.focus()}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span>{formatDisplayDate()}</span>
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
          />
        </div>

        <button
          onClick={handleNextDay}
          title="Next Day"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Reset to today if viewing past date */}
      {!isToday && (
        <button
          onClick={() => onDateChange(todayStr)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Back to Today</span>
        </button>
      )}
    </div>
  );
}
