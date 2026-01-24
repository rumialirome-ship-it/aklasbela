
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'IDLE' | 'SHUFFLE' | 'DELIVERY' | 'HOLD' | 'REVEAL';

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

const SHUFFLE_TIME = 45000; // 45 seconds shuffle
const DELIVERY_TIME = 4500; // 4.5 seconds travel
const HOLD_TIME = 5000;    // 5 seconds hold before final big screen

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    const R = 140; 
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -10,
        duration: 0.25 + Math.random() * 0.25,
        path
    };
  }, []);

  const isActuallyWinner = parseInt(number) === parseInt(winningNumber);

  // The winning ball during extraction and holding
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return (
        <div 
          className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
          style={{ '--ball-color': '#f59e0b' } as any}
        >
            <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '14px' : '11px' }}>
                {winningNumber.padStart(2, '0')}
            </span>
        </div>
      );
  }

  if (phase === 'REVEAL') return null;
  
  // Non-winners stop mixing after SHUFFLE phase
  const isMixing = phase === 'SHUFFLE';
  const hasStopped = phase === 'DELIVERY' || phase === 'HOLD';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-mixing' : ''} ${hasStopped ? 'ball-resting' : ''}`}
        style={{
            '--ball-color': color,
            '--delay': `${motion.delay}s`,
            '--duration': `${motion.duration}s`,
            '--x1': `${motion.path[0].x}px`, '--y1': `${motion.path[0].y}px`,
            '--x2': `${motion.path[1].x}px`, '--y2': `${motion.path[1].y}px`,
            '--x3': `${motion.path[2].x}px`, '--y3': `${motion.path[2].y}px`,
            '--x4': `${motion.path[3].x}px`, '--y4': `${motion.path[3].y}px`,
            // Logic for resting at the bottom of the chamber
            '--rest-x': `${(id % 12 - 6) * 18}px`,
            '--rest-y': `${110 + (Math.floor(id/12) * -14)}px`,
            transform: !isMixing && !hasStopped ? `translate(${(id % 20 - 10) * 14}px, ${140 + (Math.floor(id/20) * -16)}px)` : undefined
        } as any}
    >
        <span className="ball-text-3d">{number}</span>
    </div>
  );
});

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [timeLeft, setTimeLeft] = useState(SHUFFLE_TIME / 1000);
  const [aiBackdrop, setAiBackdrop] = useState<string | null>(null);
  
  const balls = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    number: i.toString().padStart(2, '0')
  })), []);

  useEffect(() => {
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "A futuristic high-stakes lottery hall with neon lighting and glass tubes, luxury tech aesthetic, 8k resolution." }] },
                config: { imageConfig: { aspectRatio: "9:16" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setAiBackdrop(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {
            console.error("AI Error", e);
        }
    };
    gen();

    const startTime = Date.now();
    const tickInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, (SHUFFLE_TIME - elapsed) / 1000);
        setTimeLeft(Math.ceil(remaining));
        if (remaining <= 0) clearInterval(tickInterval);
    }, 1000);

    const t1 = setTimeout(() => setPhase('SHUFFLE'), 500);
    const t2 = setTimeout(() => setPhase('DELIVERY'), 500 + SHUFFLE_TIME);
    const t3 = setTimeout(() => setPhase('HOLD'), 500 + SHUFFLE_TIME + DELIVERY_TIME);
    const t4 = setTimeout(() => setPhase('REVEAL'), 500 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);

    return () => {
        clearInterval(tickInterval);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden flex flex-col items-center justify-center">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-30 blur-sm" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
      )}

      {phase !== 'REVEAL' && (
        <div className="absolute top-8 sm:top-12 text-center z-[10010] w-full px-4 animate-fade-in">
            <h2 className="text-white text-3xl sm:text-5xl font-black russo tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                    <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                        {phase === 'SHUFFLE' ? 'STABILIZING NODES' : phase === 'DELIVERY' ? 'EXTRACTING UNIT' : phase === 'HOLD' ? 'VERIFICATION' : 'PROCESSING'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900/80 border border-white/10 px-4 py-1.5 rounded-full shadow-lg">
                    <span className="text-amber-500 font-mono font-bold text-xs">EXTRACTION: {timeLeft}s</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
        
        {/* THE MECHANICAL PIPE SYSTEM */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-visible">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 800">
                <defs>
                    <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                    </linearGradient>
                </defs>
                {/* The Tube Path */}
                <path 
                    d="M 200 450 L 200 480 Q 200 520, 150 540 L 50 580 Q 20 590, 50 620 L 350 720 Q 380 730, 350 760 L 200 800" 
                    stroke="url(#pipeGrad)" 
                    strokeWidth="35" 
                    fill="none" 
                    strokeLinecap="round"
                    className="opacity-40"
                />
                <path 
                    d="M 200 450 L 200 480 Q 200 520, 150 540 L 50 580 Q 20 590, 50 620 L 350 720 Q 380 730, 350 760 L 200 800" 
                    stroke="rgba(245, 158, 11, 0.1)" 
                    strokeWidth="38" 
                    fill="none" 
                    strokeLinecap="round"
                />
            </svg>
        </div>

        <div className="machine-chamber">
            {balls.map((b) => (
                <Ball 
                    key={b.id} 
                    id={b.id} 
                    number={b.number} 
                    phase={phase} 
                    isWinner={parseInt(b.number) === parseInt(winningNumber)} 
                    winningNumber={winningNumber} 
                />
            ))}
            
            {/* EXTRACTION PORT */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-14 sm:h-20 bg-slate-900 rounded-t-[2rem] border-x-4 border-t-4 border-slate-700 z-30 flex items-center justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
                <div className="w-14 sm:w-20 h-8 sm:h-12 bg-black rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,1)] border border-white/5 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-b from-black via-slate-900/50 to-black"></div>
                </div>
            </div>
        </div>

        <div className="result-display-box">
            {phase === 'HOLD' && (
                <div className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 text-emerald-400 text-[12px] sm:text-[14px] font-black uppercase tracking-[0.5em] animate-pulse whitespace-nowrap bg-black/90 px-6 py-2 rounded-full border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    UNIT AUTHENTICATED
                </div>
            )}
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber.padStart(2, '0')}</span>
            ) : (
                <span className="opacity-10 text-3xl sm:text-5xl font-black text-white">??</span>
            )}
        </div>
      </div>

      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/98 z-[10020] animate-fade-in p-6 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f59e0b15_0%,_transparent_75%)] opacity-60" />
            <div className="relative text-center space-y-8 sm:space-y-12 max-w-2xl animate-result-slam-3d">
                <div className="space-y-3 sm:space-y-5">
                    <p className="text-amber-500 font-black text-[10px] sm:text-sm uppercase tracking-[0.8em] animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">OFFICIAL WINNER</p>
                    <h2 className="text-white text-4xl sm:text-7xl font-black russo tracking-tighter uppercase drop-shadow-2xl">{gameName}</h2>
                </div>
                <div className="relative inline-block px-14 py-10 sm:px-28 sm:py-24 bg-white/[0.02] rounded-[3.5rem] sm:rounded-[7rem] border-2 border-amber-500/50 shadow-[0_0_120px_rgba(245,158,11,0.25)] group backdrop-blur-[60px] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5" />
                    <span className="relative text-[9rem] sm:text-[20rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_20px_50px_rgba(0,0,0,1)]">
                        {winningNumber.padStart(2, '0')}
                    </span>
                </div>
                <div className="pt-8 sm:pt-14">
                    <button 
                        onClick={onClose}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-14 py-4.5 sm:px-20 sm:py-6 rounded-2xl uppercase tracking-[0.4em] text-[10px] sm:text-xs transition-all transform active:scale-95 shadow-[0_0_40px_rgba(245,158,11,0.4)] border-b-4 border-amber-700"
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;
