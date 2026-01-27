
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
const DELIVERY_TIME = 6000; // 6 seconds travel through complex pipe
const HOLD_TIME = 5000;    // 5 seconds hold in transparent unit

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    const R = 130; 
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -10,
        duration: 0.2 + Math.random() * 0.3,
        path
    };
  }, []);

  const isActuallyWinner = parseInt(number) === parseInt(winningNumber);

  // The winning ball during extraction and holding
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return (
        <div 
          className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
          style={{ '--ball-color': '#f59e0b', zIndex: 1000 } as any}
        >
            <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '15px' : '11px' }}>
                {winningNumber.padStart(2, '0')}
            </span>
        </div>
      );
  }

  if (phase === 'REVEAL') return null;
  
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
            // Rest logic for "settling" at the bottom of the jar
            '--rest-x': `${(id % 10 - 5) * 20}px`,
            '--rest-y': `${100 + (Math.floor(id/10) * -16)}px`,
            transform: !isMixing && !hasStopped ? `translate(${(id % 20 - 10) * 12}px, ${120 + (Math.floor(id/20) * -14)}px)` : undefined
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
                contents: { parts: [{ text: "High-end cinematic 3D lottery studio, dark moody lighting, futuristic neon accents, minimal tech, 8k resolution." }] },
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
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-15 blur-lg" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>
      )}

      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-[10010] w-full px-4 animate-fade-in">
            <h2 className="text-white text-3xl sm:text-5xl font-black russo tracking-[0.2em] uppercase mb-2 drop-shadow-2xl">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {phase === 'SHUFFLE' ? 'ENTROPY STABILIZATION' : 'EXTRACTION COMPLETE'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900/80 border border-white/10 px-6 py-2 rounded-2xl shadow-xl">
                    <span className="text-amber-500 font-mono font-bold text-sm tracking-tighter">BALL EJECTION IN {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
        
        {/* THE ZIG-ZAG PIPE (From Image) */}
        <div className="absolute inset-0 z-[40] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="pipeGloss" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </linearGradient>
                </defs>
                {/* Stepped Zig-Zag Path */}
                <path 
                    d="M 200 250 L 200 200 L 260 200 L 260 160 L 140 160 L 140 210 L 80 210 L 80 350 L 320 350 L 320 480 L 150 480 L 150 620 L 300 620 L 300 780 L 200 800"
                    stroke="rgba(255,255,255,0.12)" 
                    strokeWidth="34" 
                    fill="none" 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <path 
                    d="M 200 250 L 200 200 L 260 200 L 260 160 L 140 160 L 140 210 L 80 210 L 80 350 L 320 350 L 320 480 L 150 480 L 150 620 L 300 620 L 300 780 L 200 800"
                    stroke="url(#pipeGloss)" 
                    strokeWidth="28" 
                    fill="none" 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
        </div>

        {/* THE GLASS JAR (From Image) */}
        <div className="machine-jar">
            <div className="jar-neck" />
            <div className="jar-body">
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
            </div>
            {/* The Port where pipe enters neck */}
            <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 w-20 h-10 bg-slate-800 rounded-t-xl border-t-2 border-white/10 z-50 flex items-center justify-center">
                <div className="w-12 h-6 bg-black rounded-full shadow-inner" />
            </div>
        </div>

        {/* TRANSPARENT RECEIVER BOX */}
        <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
            {phase === 'HOLD' && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 text-emerald-400 text-[11px] font-black uppercase tracking-[0.5em] animate-pulse bg-black/80 px-6 py-2 rounded-full border border-emerald-500/30 shadow-2xl">
                    LOCKED RESULT
                </div>
            )}
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber.padStart(2, '0')}</span>
            ) : (
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse delay-75" />
                    <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse delay-150" />
                </div>
            )}
        </div>
      </div>

      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/98 z-[10020] animate-fade-in p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f59e0b10_0%,_transparent_75%)] opacity-70" />
            <div className="relative text-center space-y-12 max-w-2xl animate-result-slam-3d">
                <div className="space-y-4">
                    <p className="text-amber-500 font-black text-sm uppercase tracking-[0.8em] animate-pulse">OFFICIAL UNIT EXTRACTED</p>
                    <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-tighter uppercase drop-shadow-2xl">{gameName}</h2>
                </div>
                <div className="relative inline-block px-16 py-12 sm:px-32 sm:py-24 bg-white/[0.02] rounded-[4rem] sm:rounded-[8rem] border-2 border-amber-500/50 shadow-[0_0_150px_rgba(245,158,11,0.2)] group backdrop-blur-[60px] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5" />
                    <span className="relative text-[10rem] sm:text-[20rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">
                        {winningNumber.padStart(2, '0')}
                    </span>
                </div>
                <div className="pt-12">
                    <button 
                        onClick={onClose}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-20 py-6 rounded-3xl uppercase tracking-[0.4em] text-xs transition-all transform active:scale-95 shadow-[0_0_50px_rgba(245,158,11,0.5)]"
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
