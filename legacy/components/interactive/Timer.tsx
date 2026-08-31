import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Timer as TimerIcon, Play, Pause, RotateCcw, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface TimerProps {
  variant?: 'floating' | 'docked';
}

const Timer: React.FC<TimerProps> = ({ variant = 'floating' }) => {
  const [isOpen, setIsOpen] = useState(variant === 'docked'); // Docked always open initially
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(300);
  const [isFinished, setIsFinished] = useState(false);
  
  // Position State (Only for floating)
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (variant === 'floating') {
      try {
        const saved = localStorage.getItem('wrs_timer_pos');
        if (saved) {
          const parsed = JSON.parse(saved);
          setPos(parsed);
          return;
        }
      } catch(e) {}
      setPos({ x: window.innerWidth - 320, y: 20 });
    }
  }, [variant]);

  const playDing = () => {
    const audio = new Audio('https://raw.githubusercontent.com/freeCodeCamp/cdn/master/build/testable-projects-fcc/audio/BeepBell.wav');
    audio.play().catch(e => console.warn("Audio playback failed:", e));
  };

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      interval = window.setInterval(() => {
        setTime((prev) => {
          if (mode === 'stopwatch') return prev + 1;
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            playDing();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTime(mode === 'stopwatch' ? 0 : countdownDuration);
  };

  const handleModeChange = (newMode: 'stopwatch' | 'countdown') => {
    setMode(newMode);
    setIsRunning(false);
    setIsFinished(false);
    setTime(newMode === 'stopwatch' ? 0 : countdownDuration);
  };

  const adjustCountdown = (amount: number) => {
    const newDuration = Math.max(60, countdownDuration + amount);
    setCountdownDuration(newDuration);
    if (!isRunning && mode === 'countdown') {
      setTime(newDuration);
      setIsFinished(false);
    }
  };

  // Drag Logic (Floating only)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (variant === 'docked') return;
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('wrs_timer_pos', JSON.stringify(pos));
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!mounted) return null;

  // --- RENDER DOCKED VARIANT ---
  if (variant === 'docked') {
    return (
      <div className="bg-stone-900 border-t border-b border-stone-800 p-4">
        <div className="flex items-center justify-between mb-4">
           <div className="flex gap-1 bg-stone-800 p-1 rounded">
              <button 
                 onClick={() => handleModeChange('stopwatch')}
                 className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${mode === 'stopwatch' ? 'bg-stone-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}
              >
                Stopwatch
              </button>
              <button 
                 onClick={() => handleModeChange('countdown')}
                 className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${mode === 'countdown' ? 'bg-stone-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}
              >
                Timer
              </button>
           </div>
           
           {/* Countdown Controls */}
           {mode === 'countdown' && !isRunning && (
             <div className="flex gap-1">
                <button onClick={() => adjustCountdown(-60)} className="text-stone-500 hover:text-white px-1">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button onClick={() => adjustCountdown(60)} className="text-stone-500 hover:text-white px-1">
                  <ChevronUp className="w-4 h-4" />
                </button>
             </div>
           )}
        </div>

        <div className="flex items-center justify-between">
           <div className={`text-4xl font-mono font-bold tracking-tight tabular-nums ${isFinished ? 'text-red-500 animate-pulse' : 'text-[#fdf6e3]'}`}>
              {formatTime(time)}
           </div>
           
           <div className="flex gap-2">
              <button 
                onClick={toggleTimer}
                className={`p-3 rounded-full shadow-lg active:scale-95 transition-all ${isRunning ? 'bg-amber-600 text-white' : 'bg-red-800 text-white hover:bg-red-700'}`}
              >
                {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
              </button>
              <button 
                onClick={resetTimer}
                className="p-3 rounded-full border border-stone-700 text-stone-500 hover:text-white hover:border-stone-500 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDER FLOATING VARIANT (PORTAL) ---
  return createPortal(
    <div 
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 99999, touchAction: 'none' }}
      className="filter drop-shadow-xl"
    >
      {!isOpen ? (
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => { if (!isDragging) setIsOpen(true); }}
          className="bg-white/95 backdrop-blur border-2 border-stone-800 p-2 rounded-full flex items-center gap-3 cursor-move active:scale-95 transition-transform"
        >
           <div className={`p-2 rounded-full ${isRunning ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-stone-100 text-stone-600'}`}>
              <TimerIcon className="w-5 h-5" />
           </div>
           <span className="font-mono font-bold text-lg pr-2 text-stone-800 tabular-nums">
             {formatTime(time)}
           </span>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border-2 border-stone-800 w-72 animate-in fade-in zoom-in-95 duration-200">
           <div 
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             className="bg-stone-900 text-white p-3 flex justify-between items-center cursor-move"
           >
              <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
                <button 
                   onClick={() => handleModeChange('stopwatch')}
                   className={`p-1.5 rounded text-xs font-bold uppercase ${mode === 'stopwatch' ? 'bg-stone-700 text-white' : 'text-stone-500 hover:text-white'}`}
                >Stopwatch</button>
                <button 
                   onClick={() => handleModeChange('countdown')}
                   className={`p-1.5 rounded text-xs font-bold uppercase ${mode === 'countdown' ? 'bg-stone-700 text-white' : 'text-stone-500 hover:text-white'}`}
                >Timer</button>
              </div>
              <div className="flex items-center gap-2">
                 <GripVertical className="w-4 h-4 text-stone-600" />
                 <button 
                   onPointerDown={e => e.stopPropagation()}
                   onClick={() => setIsOpen(false)} 
                   className="text-stone-400 hover:text-white hover:bg-red-900 rounded p-1"
                 ><X className="w-4 h-4" /></button>
              </div>
           </div>
           <div className={`p-6 text-center ${isFinished ? 'bg-red-100' : 'bg-stone-50'}`}>
              <div className={`text-6xl font-mono font-bold tracking-tight mb-2 tabular-nums ${isFinished ? 'text-red-600 animate-pulse' : 'text-stone-800'}`}>
                {formatTime(time)}
              </div>
              {mode === 'countdown' && !isRunning && (
                 <div className="flex justify-center gap-4 text-xs font-bold text-stone-400">
                    <button onClick={() => adjustCountdown(-60)} className="hover:text-stone-900 hover:bg-stone-200 px-2 py-1 rounded">-1m</button>
                    <button onClick={() => adjustCountdown(60)} className="hover:text-stone-900 hover:bg-stone-200 px-2 py-1 rounded">+1m</button>
                 </div>
              )}
           </div>
           <div className="p-4 bg-white border-t border-stone-200 flex justify-center gap-4">
              <button 
                onClick={toggleTimer}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isRunning ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : 'bg-stone-800 text-white border-2 border-stone-800'}`}
              >
                {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
              </button>
              <button onClick={resetTimer} className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
                <RotateCcw className="w-6 h-6" />
              </button>
           </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default Timer;