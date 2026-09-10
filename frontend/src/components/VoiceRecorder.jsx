import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, Send, Volume2, Trash2, XCircle } from 'lucide-react';

export default function VoiceRecorder({ onProcessResult, isProcessing, setIsProcessing, onCancelProcessing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // If recording was cancelled, skip uploading
        if (audioChunksRef.current.length === 0) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      setMode('text');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {
          // ignore
        }
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      audioChunksRef.current = []; // Clear chunks so onstop won't upload
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    }
    setIsRecording(false);
    setRecordDuration(0);

    // Notify backend
    fetch('/api/voice/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'recording_discard',
        details: 'User cancelled voice recording before upload.'
      })
    }).catch(() => {});
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    onCancelProcessing?.();

    // Notify backend
    fetch('/api/voice/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'in_flight_cancelled',
        details: 'User aborted active AI parsing request.'
      })
    }).catch(() => {});
  };

  const handleAudioUpload = async (blob) => {
    setIsProcessing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');

    try {
      const response = await fetch('/api/voice/process-audio', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) {
        const errDetail = data?.detail || 'Audio transcription temporarily unavailable. Please try typing in the Type tab.';
        onProcessResult({
          transcript: 'Voice Audio Note',
          intent: 'unknown',
          insights: [errDetail],
          status: 'error'
        });
        return;
      }
      onProcessResult(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Voice audio processing cancelled by user.');
        return;
      }
      console.error('Error uploading audio:', error);
      onProcessResult({
        transcript: 'Voice Audio Note',
        intent: 'unknown',
        insights: ['Network communication error. Please try again in a few seconds.'],
        status: 'error'
      });
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    setIsProcessing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/voice/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) {
        const errDetail = data?.detail || 'Text processing temporarily unavailable.';
        onProcessResult({
          transcript: textInput,
          intent: 'unknown',
          insights: [errDetail],
          status: 'error'
        });
        return;
      }
      onProcessResult(data);
      setTextInput('');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Text processing cancelled by user.');
        return;
      }
      console.error('Error processing text:', error);
      onProcessResult({
        transcript: textInput,
        intent: 'unknown',
        insights: ['Network communication error. Please try again in a few seconds.'],
        status: 'error'
      });
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div
      className="border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)'
      }}
    >
      {/* Background ambient neon glow */}
      <div
        className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all"
        style={{ backgroundColor: 'var(--accent-glow)' }}
      ></div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-2xl border"
            style={{
              backgroundColor: 'var(--accent-glow)',
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)'
            }}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Voice Assistant</h2>
            <p className="text-xs text-slate-400">Speak naturally in English or Hindi mix (Hinglish)</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div
          className="flex p-1 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-card)' }}
        >
          <button
            onClick={() => { if (!isProcessing && !isRecording) setMode('voice'); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              backgroundColor: mode === 'voice' ? 'var(--accent-primary)' : 'transparent',
              color: mode === 'voice' ? '#FFFFFF' : '#94A3B8'
            }}
          >
            Voice Mic
          </button>
          <button
            onClick={() => { if (!isProcessing && !isRecording) setMode('text'); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              backgroundColor: mode === 'text' ? 'var(--accent-primary)' : 'transparent',
              color: mode === 'text' ? '#FFFFFF' : '#94A3B8'
            }}
          >
            Type
          </button>
        </div>
      </div>

      {mode === 'voice' ? (
        <div className="flex flex-col items-center justify-center py-6 relative">
          {/* Discard / Trash Button during active recording */}
          {isRecording && (
            <button
              type="button"
              onClick={cancelRecording}
              className="absolute left-4 sm:left-8 top-8 flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all shadow-md active:scale-95 animate-fade-in"
              title="Discard recording and do not upload"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[10px]">Discard</span>
            </button>
          )}

          {/* Pulsing Voice Button */}
          <div className="relative mb-6">
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping"></span>
                <span className="absolute -inset-3 rounded-full bg-rose-500/20 animate-pulse"></span>
              </>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 shadow-xl ${
                isRecording
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/40'
                  : 'shadow-lg hover:scale-105'
              }`}
              style={{
                backgroundColor: !isRecording ? 'var(--accent-primary)' : undefined,
                boxShadow: !isRecording ? '0 10px 25px var(--accent-glow)' : undefined
              }}
            >
              {isProcessing ? (
                <Loader2 className="w-9 h-9 text-white animate-spin" />
              ) : isRecording ? (
                <Square className="w-8 h-8 text-white fill-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
          </div>

          {/* Status and Audio Waveform animation */}
          {isRecording ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                Listening... {formatTime(recordDuration)}
              </div>
              <div className="flex items-center gap-1 h-6">
                {[40, 75, 100, 50, 85, 30, 95, 60, 45, 80].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.1}s`,
                      backgroundColor: 'var(--accent-primary)'
                    }}
                  ></span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-slate-400">Tap the red square to finish</p>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Discard Audio
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2 font-medium text-sm" style={{ color: 'var(--accent-primary)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Agentic Orchestrator analyzing food & macros...
              </div>
              <button
                type="button"
                onClick={cancelProcessing}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Process</span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-200">Tap microphone & speak</p>
              <p className="text-xs text-slate-400 mt-1">
                e.g. <i>"I had 2 rotis with ghee, 1 katori dal tadka, and did a 30 min run"</i>
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleTextSubmit} className="space-y-4 py-2">
          <div className="relative">
            <textarea
              rows="3"
              value={textInput}
              onChange={(e) => {
                if (!isProcessing) setTextInput(e.target.value);
              }}
              readOnly={isProcessing}
              placeholder="e.g. For breakfast I had 1 plate poha, 1 boiled egg, and a cup of masala chai with sugar..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none"
              style={{ focusRingColor: 'var(--accent-primary)' }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              {[
                "60g of Yogabar oats",
                "Paneer with 3 roti",
                "45 min chest workout"
              ].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!isProcessing) setTextInput(sample);
                  }}
                  className="hidden md:inline-block px-3 py-1 border rounded-xl text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-card)' }}
                >
                  +{sample}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isProcessing && (
                <button
                  type="button"
                  onClick={cancelProcessing}
                  className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isProcessing || !textInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl text-sm transition-all shadow-lg cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  boxShadow: '0 4px 15px var(--accent-glow)'
                }}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Analyze & Log
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
