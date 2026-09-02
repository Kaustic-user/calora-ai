import React, { useState, useRef } from 'react';
import { Check, Sparkles, Mic, Square, Loader2, X } from 'lucide-react';

export default function ClarificationBanner({ 
  clarifications, 
  pendingMeal, 
  pendingWorkout,
  onResolve, 
  onResolveVoice,
  onDismiss
}) {
  const [recordingId, setRecordingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  if (!clarifications || clarifications.length === 0) return null;

  const startVoiceClarification = async (clarificationId) => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setRecordingId(null);
        setIsUploading(true);
        try {
          if (onResolveVoice) {
            await onResolveVoice(clarificationId, audioBlob);
          }
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start(250);
      setRecordingId(clarificationId);
    } catch (err) {
      console.error('Mic access error for clarification:', err);
      setRecordingId(null);
    }
  };

  const stopVoiceClarification = () => {
    if (mediaRecorderRef.current && recordingId) {
      if (mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {
          // ignore
        }
        mediaRecorderRef.current.stop();
      }
    }
  };

  return (
    <div 
      className="border rounded-3xl p-5 shadow-2xl backdrop-blur-md animate-fade-in transition-all"
      style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderColor: 'var(--accent-primary)',
        boxShadow: '0 8px 30px var(--accent-glow)' 
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-xl border flex items-center justify-center"
            style={{ 
              backgroundColor: 'var(--accent-glow)', 
              borderColor: 'var(--accent-primary)', 
              color: 'var(--accent-primary)' 
            }}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-white">
              Confirm Details to Record Entry
            </h4>
            {(pendingMeal || pendingWorkout) && (
              <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                Pending: {pendingMeal?.meal_title || pendingWorkout?.exercise_name || 'Pending Entry'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border"
            style={{ 
              backgroundColor: 'var(--accent-glow)', 
              color: 'var(--accent-primary)', 
              borderColor: 'var(--accent-primary)' 
            }}
          >
            1-Tap or Speak
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Dismiss and keep default"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {clarifications.map((item) => {
          const isThisRecording = recordingId === item.id;
          return (
            <div 
              key={item.id} 
              className="border p-4 rounded-2xl transition-colors"
              style={{ backgroundColor: 'var(--bg-card-subtle)', borderColor: 'var(--border-card)' }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                {item.question}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Default assumption was: <strong className="text-amber-400">{item.assumed_value}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1-Tap Option Buttons */}
                {item.options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={isThisRecording || isUploading}
                    onClick={() => onResolve && onResolve(item.id, opt)}
                    className="px-3.5 py-2 border text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:scale-105 active:scale-95 text-white disabled:opacity-50"
                    style={{ 
                      backgroundColor: idx === 0 ? 'var(--accent-primary)' : 'var(--bg-card)', 
                      borderColor: idx === 0 ? 'var(--accent-primary)' : 'var(--border-card)',
                      color: idx === 0 ? '#000000' : 'inherit'
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{opt}</span>
                  </button>
                ))}

                {/* Voice Clarification Microphone Button */}
                <button
                  type="button"
                  disabled={isUploading || (recordingId && !isThisRecording)}
                  onClick={() => {
                    if (isThisRecording) {
                      stopVoiceClarification();
                    } else {
                      startVoiceClarification(item.id);
                    }
                  }}
                  className={`px-3 py-2 border text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50 ${
                    isThisRecording 
                      ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400'
                  }`}
                  title="Or speak your custom preparation details"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isThisRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Listening... Tap to send</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Speak Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
