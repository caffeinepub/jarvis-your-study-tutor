import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, X } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';

type TimerPhase = 'work' | 'short_break' | 'long_break';

const PHASE_LABELS: Record<TimerPhase, string> = {
  work: 'Focus Time',
  short_break: 'Short Break',
  long_break: 'Long Break',
};

const PHASE_COLORS: Record<TimerPhase, string> = {
  work: '#3b82f6',
  short_break: '#22c55e',
  long_break: '#8b5cf6',
};

const DEFAULT_DURATIONS: Record<TimerPhase, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

function playBeep(frequency = 800, duration = 0.5) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

interface StudyTimerViewProps {
  mini?: boolean;
  onExpand?: () => void;
}

export default function StudyTimerView({ mini = false, onExpand }: StudyTimerViewProps) {
  const backend = useBackend();
  const [durations, setDurations] = useState<Record<TimerPhase, number>>({ ...DEFAULT_DURATIONS });
  const [phase, setPhase] = useState<TimerPhase>('work');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempDurations, setTempDurations] = useState({ ...DEFAULT_DURATIONS });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime = durations[phase];
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const switchPhase = useCallback((newPhase: TimerPhase) => {
    setPhase(newPhase);
    setTimeLeft(durations[newPhase]);
    setIsRunning(false);
  }, [durations]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          playBeep();
          // Auto advance
          if (phase === 'work') {
            setPomodoroCount((c) => {
              const newCount = c + 1;
              if (newCount % 4 === 0) {
                switchPhase('long_break');
              } else {
                switchPhase('short_break');
              }
              return newCount;
            });
            void backend.recordStudyActivity().catch(() => {});
          } else {
            switchPhase('work');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase, switchPhase, backend]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(durations[phase]);
  };

  const applySettings = () => {
    setDurations({ ...tempDurations });
    setTimeLeft(tempDurations[phase]);
    setShowSettings(false);
    setIsRunning(false);
  };

  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference - (progress / 100) * circumference;
  const phaseColor = PHASE_COLORS[phase];

  if (mini) {
    return (
      <div className="flex items-center gap-3 bg-[#161b22] border border-[#1e2d3d] rounded-xl px-3 py-2">
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 24 24" className="w-8 h-8 -rotate-90" role="img" aria-label="Timer progress">
            <circle cx="12" cy="12" r="10" fill="none" stroke="#1e2d3d" strokeWidth="2" />
            <circle
              cx="12" cy="12" r="10" fill="none"
              stroke={phaseColor} strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 - (progress / 100) * 2 * Math.PI * 10}`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-white font-mono text-sm font-bold">{formatTime(timeLeft)}</span>
        <span className="text-gray-500 text-xs">{PHASE_LABELS[phase]}</span>
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className="text-blue-400 hover:text-blue-300 transition-colors"
          aria-label={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="text-gray-500 hover:text-gray-300 transition-colors ml-auto"
            aria-label="Expand timer"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4 items-center">
      <div className="flex items-center justify-between w-full mb-6">
        <h2 className="text-white font-semibold text-lg">Study Timer</h2>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-[#1e2d3d] text-gray-400 transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Phase Tabs */}
      <div className="flex gap-2 mb-8">
        {(['work', 'short_break', 'long_break'] as TimerPhase[]).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => switchPhase(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              phase === p ? 'bg-blue-600 text-white' : 'bg-[#161b22] text-gray-400 hover:text-white'
            }`}
          >
            {PHASE_LABELS[p].split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Circular Timer */}
      <div className="relative mb-8">
        <svg viewBox="0 0 120 120" className="w-48 h-48 -rotate-90" role="img" aria-label="Pomodoro timer progress ring">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#1e2d3d" strokeWidth="6" />
          <circle
            cx="60" cy="60" r="48" fill="none"
            stroke={phaseColor} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="pomodoro-ring transition-all duration-1000"
            style={{ filter: `drop-shadow(0 0 8px ${phaseColor}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-mono text-4xl font-bold tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className="text-gray-400 text-xs mt-1">{PHASE_LABELS[phase]}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={reset}
          className="w-12 h-12 rounded-full bg-[#161b22] hover:bg-[#1e2d3d] border border-[#2d3f52] text-gray-400 hover:text-white flex items-center justify-center transition-all"
          aria-label="Reset"
        >
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className="w-16 h-16 rounded-full text-white flex items-center justify-center transition-all glow-blue"
          style={{ backgroundColor: phaseColor }}
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#2d3f52] flex flex-col items-center justify-center">
          <span className="text-orange-400 text-sm">🍅</span>
          <span className="text-white text-xs font-bold">{pomodoroCount}</span>
        </div>
      </div>

      {/* Session info */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {([
          { label: 'Focus', value: `${Math.floor(durations.work / 60)}m`, color: 'text-blue-400' },
          { label: 'Break', value: `${Math.floor(durations.short_break / 60)}m`, color: 'text-green-400' },
          { label: 'Tomatoes', value: pomodoroCount.toString(), color: 'text-orange-400' },
        ] as const).map((item) => (
          <div key={item.label} className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            <p className="text-gray-500 text-xs">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#1e2d3d] rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-4">Timer Settings</h3>
            <div className="space-y-4">
              {(['work', 'short_break', 'long_break'] as TimerPhase[]).map((p) => (
                <div key={p} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{PHASE_LABELS[p]}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTempDurations((prev) => ({ ...prev, [p]: Math.max(60, prev[p] - 60) }))}
                      className="w-7 h-7 rounded-full bg-[#1e2d3d] text-white hover:bg-[#2d3f52] transition-colors flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-white text-sm w-8 text-center">{Math.floor(tempDurations[p] / 60)}m</span>
                    <button
                      type="button"
                      onClick={() => setTempDurations((prev) => ({ ...prev, [p]: Math.min(60 * 60, prev[p] + 60) }))}
                      className="w-7 h-7 rounded-full bg-[#1e2d3d] text-white hover:bg-[#2d3f52] transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={applySettings}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 bg-[#1e2d3d] hover:bg-[#2d3f52] text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
