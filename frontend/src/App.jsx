import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Settings,
  Sparkles,
  Flame,
  Calendar,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  Palette,
  Compass,
  RotateCcw,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

import DynamicBackground from './components/DynamicBackground';
import VoiceRecorder from './components/VoiceRecorder';
import MacroRings from './components/MacroRings';
import MealTimeline from './components/MealTimeline';
import WorkoutTimeline from './components/WorkoutTimeline';
import MealRecommender from './components/MealRecommender';
import ClarificationBanner from './components/ClarificationBanner';
import ProgressCharts from './components/ProgressCharts';
import UserProfileModal from './components/UserProfileModal';
import ThemeSelectorModal, { THEMES } from './components/ThemeSelectorModal';
import BackgroundSelectorModal, { BACKGROUNDS } from './components/BackgroundSelectorModal';
import DateNavigator from './components/DateNavigator';
import EditLogModal from './components/EditLogModal';

export default function App() {
  const [dailySummary, setDailySummary] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeClarifications, setActiveClarifications] = useState([]);
  const [pendingMeal, setPendingMeal] = useState(null);
  const [pendingWorkout, setPendingWorkout] = useState(null);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [latestInsights, setLatestInsights] = useState([]);
  const [lastLoggedItem, setLastLoggedItem] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);

  const appAbortControllerRef = useRef(null);

  // Date Navigation State (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Edit / Manual Add Modal State
  const [editModalState, setEditModalState] = useState({
    isOpen: false,
    mode: 'meal', // 'meal' or 'workout'
    data: null    // null = create mode, object = edit mode
  });

  // Theme palette and Background canvas selection (persists in localStorage)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('calora_theme') || 'cyber';
  });
  const [activeBg, setActiveBg] = useState(() => {
    return localStorage.getItem('calora_bg') || 'spacetime';
  });
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics'

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('calora_theme', currentTheme);
  }, [currentTheme]);

  // Persist background mode
  useEffect(() => {
    localStorage.setItem('calora_bg', activeBg);
  }, [activeBg]);

  const fetchDailySummary = async (dateToFetch) => {
    const targetDate = dateToFetch || selectedDateRef.current;
    try {
      const url = targetDate ? `/api/logs/daily-summary?target_date=${targetDate}` : '/api/logs/daily-summary';
      const res = await fetch(url);
      const data = await res.json();
      if (data && (!targetDate || targetDate === selectedDateRef.current)) {
        setDailySummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  useEffect(() => {
    fetchDailySummary(selectedDate);
    fetchProfile();
  }, [selectedDate]);

  // Auto-dismiss top notifications after 6 seconds (TTL)
  useEffect(() => {
    if (latestInsights.length > 0) {
      const timer = setTimeout(() => {
        setLatestInsights([]);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [latestInsights]);

  // Auto-dismiss undo notification after 8 seconds (TTL)
  useEffect(() => {
    if (lastLoggedItem) {
      const timer = setTimeout(() => {
        setLastLoggedItem(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [lastLoggedItem]);

  const handleUndoLastLog = async () => {
    if (!lastLoggedItem) return;
    try {
      const endpoint = lastLoggedItem.type === 'workout'
        ? `/api/logs/workouts/${lastLoggedItem.id}`
        : `/api/logs/meals/${lastLoggedItem.id}`;
      await fetch(endpoint, { method: 'DELETE' });
      const targetDate = lastLoggedItem.date || selectedDate;
      await fetchDailySummary(targetDate);
      setLatestInsights([`Cancelled & removed "${lastLoggedItem.title}" from your logs.`]);
      setLastLoggedItem(null);
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  const handleProcessResult = (result) => {
    if (result.status === 'success') {
      if (result.clarifications && result.clarifications.length > 0) {
        setActiveClarifications(result.clarifications);
        setPendingMeal(result.detected_meal);
        setPendingWorkout(result.detected_workout);
        setPendingTranscript(result.transcript);
      } else {
        setActiveClarifications([]);
        setPendingMeal(null);
        setPendingWorkout(null);
        setPendingTranscript('');

        // Celebrate ONLY if a meal was saved immediately (no clarifications) or workout was logged
        if (result.detected_meal || result.detected_workout || result.operation_performed === 'created' || result.operation_performed === 'updated') {
          confetti({
            particleCount: 45,
            spread: 65,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981']
          });
        }

        // Track last saved item for 1-click Undo rollback
        const logDate = result.log_date || (result.has_explicit_date ? result.navigation_date : getTodayStr());
        if (result.saved_meal_id) {
          setLastLoggedItem({
            type: 'meal',
            id: result.saved_meal_id,
            title: result.detected_meal?.meal_title || 'Meal',
            calories: result.detected_meal?.calories || 0,
            date: logDate
          });
        } else if (result.saved_workout_id) {
          setLastLoggedItem({
            type: 'workout',
            id: result.saved_workout_id,
            title: result.detected_workout?.exercise_name || 'Workout',
            calories: result.detected_workout?.calories_burned || 0,
            date: logDate
          });
        }
      }

      if (result.insights && result.insights.length > 0) {
        setLatestInsights(result.insights);
      }

      // Auto-navigate ONLY IF the user explicitly specified a date in their speech/text (e.g. "yesterday I had dosa")
      if (result.has_explicit_date && result.navigation_date) {
        setSelectedDate(result.navigation_date);
        fetchDailySummary(result.navigation_date);
      } else {
        // If it was a default log (logged for today), refresh whatever date the user is actively viewing
        fetchDailySummary(selectedDateRef.current);
      }
    }
  };

  const handleCancelAllProcessing = () => {
    if (appAbortControllerRef.current) {
      appAbortControllerRef.current.abort();
      appAbortControllerRef.current = null;
    }
    setIsProcessing(false);
    setActiveClarifications([]);
    setPendingMeal(null);
    setPendingWorkout(null);
    setPendingTranscript('');
    fetch('/api/voice/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'in_flight_cancelled',
        details: 'User cancelled in-flight clarification or parsing process.'
      })
    }).catch(() => {});
  };

  const handleResolveClarification = async (clarificationId, chosenOption) => {
    const remaining = activeClarifications.filter((c) => c.id !== clarificationId);
    const isFinal = remaining.length === 0;

    // Immediately remove from screen so clarification banner is never stuck/lingering
    setActiveClarifications(remaining);

    let controller = null;
    if (isFinal) {
      setIsProcessing(true);
      controller = new AbortController();
      appAbortControllerRef.current = controller;
    }

    try {
      const targetLogDate = pendingMeal?.log_date || pendingWorkout?.log_date || selectedDate;
      const res = await fetch('/api/voice/resolve-clarification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clarification_id: clarificationId,
          chosen_option: chosenOption,
          raw_transcript: pendingTranscript,
          pending_meal: pendingMeal,
          pending_workout: pendingWorkout,
          log_date: targetLogDate,
          is_final: isFinal
        }),
        signal: controller ? controller.signal : undefined
      });
      const data = await res.json();

      if (data?.status === 'cancelled') {
        return;
      }

      if (isFinal) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#10b981', '#6366f1', '#38bdf8', '#fbbf24']
        });
        setPendingMeal(null);
        setPendingWorkout(null);
        setPendingTranscript('');

        const resolvedDate = data?.navigation_date || data?.log_date || targetLogDate;
        if (resolvedDate && resolvedDate !== selectedDate) {
          setSelectedDate(resolvedDate);
        }
        await fetchDailySummary(resolvedDate || selectedDate);

        // Track last saved clarified item for 1-click Undo rollback
        if (data.meal_id) {
          setLastLoggedItem({
            type: 'meal',
            id: data.meal_id,
            title: data.meal_title || 'Meal',
            calories: data.calories || 0,
            date: resolvedDate || selectedDate
          });
        } else if (data.workout_id) {
          setLastLoggedItem({
            type: 'workout',
            id: data.workout_id,
            title: data.exercise_name || 'Workout',
            calories: data.calories_burned || 0,
            date: resolvedDate || selectedDate
          });
        }
      }

      if (data.message) {
        setLatestInsights([data.message]);
      } else {
        setLatestInsights([`Preference saved: "${chosenOption}".`]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[App] Clarification resolution aborted by user.');
        return;
      }
      console.error('Error saving clarification preference:', err);
    } finally {
      if (isFinal) {
        setIsProcessing(false);
        appAbortControllerRef.current = null;
      }
    }
  };

  const handleResolveClarificationVoice = async (clarificationId, audioBlob) => {
    const remaining = activeClarifications.filter((c) => c.id !== clarificationId);
    const isFinal = remaining.length === 0;

    // Immediately remove from screen so clarification banner is never stuck/lingering
    setActiveClarifications(remaining);

    let controller = null;
    if (isFinal) {
      setIsProcessing(true);
      controller = new AbortController();
      appAbortControllerRef.current = controller;
    }

    try {
      const targetLogDate = pendingMeal?.log_date || pendingWorkout?.log_date || selectedDate;
      const formData = new FormData();
      formData.append('file', audioBlob, 'clarification.webm');
      formData.append('clarification_id', clarificationId);
      formData.append('is_final', isFinal.toString());
      if (targetLogDate) formData.append('log_date', targetLogDate);
      if (pendingTranscript) formData.append('raw_transcript', pendingTranscript);
      if (pendingMeal?.meal_title) formData.append('pending_meal_title', pendingMeal.meal_title);
      if (pendingWorkout?.exercise_name) formData.append('pending_workout_name', pendingWorkout.exercise_name);

      const res = await fetch('/api/voice/resolve-clarification-audio', {
        method: 'POST',
        body: formData,
        signal: controller ? controller.signal : undefined
      });
      const data = await res.json();

      if (data?.status === 'cancelled') {
        return;
      }

      if (isFinal) {
        confetti({
          particleCount: 55,
          spread: 75,
          origin: { y: 0.8 },
          colors: ['#10b981', '#6366f1', '#38bdf8', '#fbbf24']
        });
        setPendingMeal(null);
        setPendingWorkout(null);
        setPendingTranscript('');

        const resolvedDate = data?.navigation_date || data?.log_date || targetLogDate;
        if (resolvedDate && resolvedDate !== selectedDate) {
          setSelectedDate(resolvedDate);
        }
        await fetchDailySummary(resolvedDate || selectedDate);

        // Track last saved clarified item for 1-click Undo rollback
        if (data.meal_id) {
          setLastLoggedItem({
            type: 'meal',
            id: data.meal_id,
            title: data.meal_title || 'Meal',
            calories: data.calories || 0,
            date: resolvedDate || selectedDate
          });
        } else if (data.workout_id) {
          setLastLoggedItem({
            type: 'workout',
            id: data.workout_id,
            title: data.exercise_name || 'Workout',
            calories: data.calories_burned || 0,
            date: resolvedDate || selectedDate
          });
        }
      }

      if (data.message) {
        setLatestInsights([data.message]);
      } else {
        setLatestInsights([`Spoken preference recorded.`]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[App] Voice clarification resolution aborted by user.');
        return;
      }
      console.error('Error processing spoken clarification:', err);
    } finally {
      if (isFinal) {
        setIsProcessing(false);
        appAbortControllerRef.current = null;
      }
    }
  };

  const handleDeleteMeal = async (mealId) => {
    try {
      await fetch(`/api/logs/meals/${mealId}`, { method: 'DELETE' });
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error('Error deleting meal:', err);
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    try {
      await fetch(`/api/logs/workouts/${workoutId}`, { method: 'DELETE' });
      fetchDailySummary(selectedDate);
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  // UI Edit & Add Handlers
  const handleEditMeal = (meal) => {
    setEditModalState({
      isOpen: true,
      mode: 'meal',
      data: meal
    });
  };

  const handleAddMeal = () => {
    setEditModalState({
      isOpen: true,
      mode: 'meal',
      data: null
    });
  };

  const handleEditWorkout = (workout) => {
    setEditModalState({
      isOpen: true,
      mode: 'workout',
      data: workout
    });
  };

  const handleAddWorkout = () => {
    setEditModalState({
      isOpen: true,
      mode: 'workout',
      data: null
    });
  };

  const handleSaveEdit = (dateUpdated) => {
    if (dateUpdated) {
      setSelectedDate(dateUpdated);
      fetchDailySummary(dateUpdated);
    } else {
      fetchDailySummary(selectedDate);
    }
  };

  const handleQuickLogMeal = async (title) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/voice/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `I had ${title} for dinner` }),
      });
      const data = await response.json();
      handleProcessResult(data);
    } catch (err) {
      console.error('Error quick logging meal:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProfile = async (newProfile) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
      const data = await res.json();
      setProfile(data);
      setShowSettings(false);
      fetchDailySummary();
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const currentThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];
  const currentBgObj = BACKGROUNDS.find(b => b.id === activeBg) || BACKGROUNDS[0];

  return (
    <div
      className="min-h-screen pb-16 transition-colors duration-300 relative overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-main)' }}
    >
      {/* 11-Mode Dynamic Interactive Background Canvas */}
      <DynamicBackground bgMode={activeBg} currentTheme={currentTheme} />

      {/* Fixed Top Navigation Bar */}
      <header
        className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all shadow-md"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border-card)'
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white font-extrabold text-xl transition-all"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            ⚡
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>CALORA AI</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Agentic Voice-Driven Nutrition & Fitness</p>
          </div>
        </div>

        {/* Tab switcher & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex p-1 rounded-xl border shadow-sm"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
          >
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === 'dashboard' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'dashboard' ? '#000000' : 'var(--text-muted)'
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === 'analytics' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'analytics' ? '#000000' : 'var(--text-muted)'
              }}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Weekly Trends</span>
            </button>
          </div>

          {/* Background FX Selector Button */}
          <button
            onClick={() => setShowBgModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)'
            }}
            title="Choose Interactive Background Canvas"
          >
            <Compass className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="hidden md:inline">Background</span>
          </button>

          {/* Theme Palette Switcher Button */}
          <button
            onClick={() => setShowThemes(true)}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)'
            }}
            title="Change Theme Palette"
          >
            <Palette className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="hidden md:inline">Theme</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 border rounded-xl transition-colors hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-muted)'
            }}
            title="Configure Daily Goals"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container with top padding for fixed header */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 space-y-6 relative z-10">
        {/* Latest AI Insight Notification if available */}
        {latestInsights.length > 0 && (
          <div
            className="border rounded-2xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-md animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--accent-primary)'
            }}
          >
            <div className="flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--text-main)' }}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <span className="font-medium">{latestInsights[0]}</span>
              </div>
              <button
                onClick={() => setLatestInsights([])}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-subtle)', color: 'var(--text-main)' }}
              >
                Dismiss
              </button>
            </div>
            {/* Animated 6-second TTL countdown bar */}
            <div
              className="absolute bottom-0 left-0 h-1 animate-ttl-progress"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            ></div>
          </div>
        )}

        {/* Clarification / Disambiguation Alert */}
        <ClarificationBanner
          clarifications={activeClarifications}
          pendingMeal={pendingMeal}
          pendingWorkout={pendingWorkout}
          onResolve={handleResolveClarification}
          onResolveVoice={handleResolveClarificationVoice}
          onDismiss={() => {
            const pendingTitle = pendingMeal?.meal_title || pendingWorkout?.exercise_name || 'Pending Item';
            setActiveClarifications([]);
            setPendingMeal(null);
            setPendingWorkout(null);
            setPendingTranscript('');
            fetch('/api/voice/cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                stage: 'clarification_discard',
                details: `User dismissed clarification for "${pendingTitle}".`
              })
            }).catch(() => {});
          }}
        />

        {/* Voice & Text Processing Hub */}
        <VoiceRecorder
          onProcessResult={handleProcessResult}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          onCancelProcessing={handleCancelAllProcessing}
        />

        {activeTab === 'dashboard' ? (
          <>
            {/* Interactive Date Navigation Bar */}
            <DateNavigator
              selectedDate={selectedDate}
              onDateChange={(newD) => {
                setSelectedDate(newD);
                fetchDailySummary(newD);
              }}
            />

            {/* Daily Macro Budget & Rings */}
            <MacroRings summary={dailySummary} />

            {/* Meal & Workout Logs Timelines */}
            <div className="grid grid-cols-1 gap-6">
              <MealTimeline
                meals={dailySummary?.meals || []}
                onDeleteMeal={handleDeleteMeal}
                onEditMeal={handleEditMeal}
                onAddMeal={handleAddMeal}
                isToday={selectedDate === getTodayStr()}
              />
              <WorkoutTimeline
                workouts={dailySummary?.workouts || []}
                onDeleteWorkout={handleDeleteWorkout}
                onEditWorkout={handleEditWorkout}
                onAddWorkout={handleAddWorkout}
                isToday={selectedDate === getTodayStr()}
              />
            </div>

            {/* Proactive Indian Meal Recommender ("Hit Your Macros") */}
            <MealRecommender onQuickLog={handleQuickLogMeal} />
          </>
        ) : (
          /* Weekly Analytics and Trend Charts */
          <ProgressCharts refreshTrigger={`${selectedDate}_${dailySummary?.calories_consumed || 0}_${dailySummary?.calories_burned || 0}_${dailySummary?.meals?.length || 0}_${dailySummary?.workouts?.length || 0}`} />
        )}
      </main>

      {/* Manual / Edit Entry Modal */}
      <EditLogModal
        isOpen={editModalState.isOpen}
        mode={editModalState.mode}
        initialData={editModalState.data}
        selectedDate={selectedDate}
        userWeightKg={profile?.weight_kg || profile?.weight || 70.0}
        onClose={() => setEditModalState(prev => ({ ...prev, isOpen: false }))}
        onSave={handleSaveEdit}
      />

      {/* User Goals & Preference Settings Modal */}
      {showSettings && (
        <UserProfileModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Theme Selector Modal */}
      {showThemes && (
        <ThemeSelectorModal
          currentTheme={currentTheme}
          onSelectTheme={(themeId) => setCurrentTheme(themeId)}
          onClose={() => setShowThemes(false)}
        />
      )}

      {/* Background Selector Modal */}
      {showBgModal && (
        <BackgroundSelectorModal
          currentBg={activeBg}
          onSelectBg={(bgId) => setActiveBg(bgId)}
          onClose={() => setShowBgModal(false)}
        />
      )}

      {/* Floating 8-Second Undo Snackbar */}
      {lastLoggedItem && (
        <aside
          aria-label="Undo notification"
          className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100%-3rem)] sm:w-auto border rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="truncate text-xs">
                <p className="font-bold truncate" style={{ color: 'var(--text-main)' }}>
                  Logged {lastLoggedItem.title}
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  {lastLoggedItem.calories} kcal • {lastLoggedItem.type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleUndoLastLog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF'
                }}
                title="Cancel & remove this logged entry"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button
                onClick={() => setLastLoggedItem(null)}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 8-second animated TTL progress bar */}
          <div
            className="absolute bottom-0 left-0 h-1 animate-undo-progress"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          />
        </aside>
      )}
    </div>
  );
}
