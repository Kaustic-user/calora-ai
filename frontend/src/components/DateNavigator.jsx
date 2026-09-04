import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DateNavigator({ selectedDate, onDateChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const calendarRef = useRef(null);

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

  // Viewing month & year for the custom calendar
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

  // Sync viewing month when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [selectedDate]);

  // Close calendar popover on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formatDisplayDate = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    if (isToday) {
      return `Today (${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
    }
    if (isYesterday) {
      return `Yesterday (${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
    }
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Build calendar matrix (Days grid)
  const buildCalendarGrid = () => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon
    const mondayOffset = (firstDayIndex + 6) % 7; // 0 for Mon, 6 for Sun
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPreviousMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // Previous month filler days
    for (let i = mondayOffset - 1; i >= 0; i--) {
      const prevDayNum = daysInPreviousMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`;
      cells.push({
        dayNum: prevDayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete grid (up to 35 or 42 cells)
    const remainingCells = 42 - cells.length;
    if (remainingCells < 7) {
      for (let d = 1; d <= remainingCells; d++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
          dayNum: d,
          dateStr,
          isCurrentMonth: false,
        });
      }
    } else if (cells.length <= 35) {
      const fillTo35 = 35 - cells.length;
      for (let d = 1; d <= fillTo35; d++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
          dayNum: d,
          dateStr,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  };

  const calendarGrid = buildCalendarGrid();

  const handleSelectCalendarDate = (dateStr) => {
    onDateChange(dateStr);
    // Keep calendar open for fluid date browsing; closes only when clicking X, outside, or hitting Escape
  };

  return (
    <div 
      className={`border rounded-2xl p-3 sm:p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 transition-all duration-300 backdrop-blur-md relative ${isOpen ? 'z-30' : 'z-10'}`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
    >
      {/* Left: Quick Date Shortcuts */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onDateChange(todayStr)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isToday 
              ? 'text-white shadow-md' 
              : 'text-slate-400 hover:text-white border hover:bg-slate-800/50'
          }`}
          style={isToday ? { backgroundColor: 'var(--accent-primary)', color: '#000000' } : { borderColor: 'var(--border-card)', backgroundColor: 'var(--bg-card-subtle)' }}
        >
          Today
        </button>
        <button
          onClick={() => onDateChange(yesterdayStr)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isYesterday 
              ? 'text-white shadow-md' 
              : 'text-slate-400 hover:text-white border hover:bg-slate-800/50'
          }`}
          style={isYesterday ? { backgroundColor: 'var(--accent-primary)', color: '#000000' } : { borderColor: 'var(--border-card)', backgroundColor: 'var(--bg-card-subtle)' }}
        >
          Yesterday
        </button>
      </div>

      {/* Center: Custom Interactive Calendar Trigger & Day Switcher */}
      <div 
        ref={calendarRef}
        className="relative z-30 flex items-center gap-1 sm:gap-2 border px-2 py-1 rounded-xl shadow-inner transition-all"
        style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
      >
        <button
          onClick={handlePrevDay}
          title="Previous Day"
          className="p-1.5 rounded-lg transition-colors hover:scale-105"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Date Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all hover:bg-white/5 active:scale-98"
          style={{ color: 'var(--text-main)' }}
        >
          <CalendarIcon className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          <span>{formatDisplayDate()}</span>
        </button>

        <button
          onClick={handleNextDay}
          title="Next Day"
          className="p-1.5 rounded-lg transition-colors hover:scale-105"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* --- Custom Futuristic Glassmorphic Calendar Popover --- */}
        {isOpen && (
          <div 
            className="absolute top-full right-0 mt-2 z-50 w-80 sm:w-88 rounded-3xl p-5 shadow-2xl border backdrop-blur-2xl animate-fade-in transition-all"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-card)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px var(--accent-glow)'
            }}
          >
            {/* Calendar Header: Month/Year navigation */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-card)' }}>
              <div>
                <h4 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>{MONTHS[viewMonth]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg border font-bold" style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)', color: 'var(--accent-primary)' }}>
                    {viewYear}
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border hover:bg-white/10 transition-all text-slate-300"
                  style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border hover:bg-white/10 transition-all text-slate-300"
                  style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl border hover:bg-white/10 transition-all text-slate-400 ml-1"
                  style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
                  title="Close Calendar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday Labels Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {WEEKDAYS.map((wd, i) => (
                <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">
                  {wd}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {calendarGrid.map((cell, idx) => {
                const isCellSelected = cell.dateStr === selectedDate;
                const isCellToday = cell.dateStr === todayStr;

                return (
                  <button
                    key={`cal-cell-${idx}`}
                    type="button"
                    onClick={() => handleSelectCalendarDate(cell.dateStr)}
                    className={`h-9 w-full rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                      isCellSelected
                        ? 'shadow-lg scale-105 z-10'
                        : cell.isCurrentMonth
                          ? 'hover:bg-white/10 hover:scale-105 text-white'
                          : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                    }`}
                    style={
                      isCellSelected
                        ? { 
                            backgroundColor: 'var(--accent-primary)', 
                            color: '#000000',
                            boxShadow: '0 0 12px var(--accent-glow)' 
                          }
                        : isCellToday
                          ? { 
                              border: '1px solid var(--accent-primary)',
                              backgroundColor: 'var(--accent-glow)' 
                            }
                          : {}
                    }
                  >
                    <span>{cell.dayNum}</span>
                    {isCellToday && !isCellSelected && (
                      <span 
                        className="w-1 h-1 rounded-full absolute bottom-1"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Navigation Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t mt-4" style={{ borderColor: 'var(--border-card)' }}>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                  onDateChange(todayStr);
                }}
                className="flex-1 py-1.5 rounded-xl border text-xs font-bold text-slate-300 hover:text-white transition-all text-center flex items-center justify-center gap-1"
                style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
              >
                <Sparkles className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
                Jump to Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
