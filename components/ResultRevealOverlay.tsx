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

// Cinematic timing constants
const SHUFFLE_TIME = 12000; 
const DELIVERY_TIME = 16000; 
const HOLD_TIME = 4500;

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isActuallyWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isActuallyWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    // Randomized vortex parameters
    const radius = 60 + Math.random() * 120;
    const speed = 0.2 + Math.random() * 0.3;
    const delay = Math.random() * -10;
    return { radius, speed, delay };
  }, []);

  // When the winner is being delivered or held in the tray, it is removed from the jar rendering
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL')) {
      return null;
  }

  // REFINEMENT: Balls only "vortex" (mix) during the SHUFFLE phase.
  // In DELIVERY, HOLD, and REVEAL phases, they stop moving and settle at the bottom.
  const isMixing = phase === 'SHUFFLE';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-vortex' : ''}`}
        style={{
            '--ball-color': color,
            '--radius': `${motion.radius}px`,
            '--speed': `${motion.speed}s`,
            '--delay': `${motion.delay}s`,
            // Settled positions: Stacked at the base of the chamber
            transform: !isMixing ? `translate(${(id % 12 - 5.5) * 22}px, ${160 + (Math.floor(id/12) * -16)}px) rotate(${id * 7}deg)` : undefined
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
    number: i.toString() // Use raw string to avoid leading zeros on single digits
  })), []);

  useEffect(() => {
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "Hyper-realistic high-tech glass lottery machine in a dark laboratory, reflections of amber lights, scientific equipment, 8k, cinematic lighting." }] },
                config: { imageConfig: { aspectRatio: "9:16" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setAiBackdrop(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {
            console.error("AI Scene Generation Error", e);
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

  // REFINED PATH: Using Quadratic Bezier (Q) for smoother, natural glass pipe curves
  const pipelinePath = "M 200 420 Q 200 320 120 280 Q 280 230 120 180 Q 280 130 340 130 Q 340 250 280 320 Q 340 390 280 460 Q 340 530 280 600 Q 340 670 340 750 Q 340 780 200 780";

  const formattedWinningNumber = useMemo(() => {
      return parseInt(winningNumber).toString();
  }, [winningNumber]);

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden flex flex-col items-center justify-center font-inter">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-xl" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        </div>
      )}

      {/* MECHANICAL HEADER STATUS */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-[10010] w-full px-8 animate-fade-in">
            <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-5">
                    <div className={`w-3 h-3 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        {phase === 'SHUFFLE' ? 'VORTEX MIXING: ACTIVE' : 'SYSTEM STATUS: SETTLED'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900/60 border border-white/5 px-8 py-2.5 rounded-2xl shadow-xl flex items-center gap-5 backdrop-blur-md">
                    <span className="text-amber-500 font-mono font-black text-lg tracking-widest uppercase">DRAW IN T-MINUS {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'scale-105 brightness-75' : 'opacity-100'}`}>
        
        {/* ENHANCED GLASSY PIPELINE SVG - LAYERED FOR DEPTH AND SMOOTHNESS */}
        <div className="absolute inset-0 z-[40] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="glassCavity" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
                        <stop offset="50%" stopColor="rgba(0,0,0,0.01)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                    </linearGradient>
                    
                    <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.01)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
                    </linearGradient>
                    
                    <linearGradient id="glassSpecular" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="48%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                        <stop offset="52%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                    </linearGradient>
                </defs>
                
                {/* 1. BACKSIDE OF PIPE (Visual depth behind ball) - Highly transparent */}
                <path d={pipelinePath} stroke="url(#glassCavity)" strokeWidth="64" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.3" />

                {/* --- WINNING BALL MOVES BETWEEN THESE SVG LAYERS (z-index 43) --- */}

                {/* 2. FRONTSIDE GLASS (Reflections & Highlights) - Subtle and clear */}
                <path d={pipelinePath} stroke="url(#glassBody)" strokeWidth="60" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.3" />
                <path d={pipelinePath} className="glass-pipe-highlight" stroke="url(#glassSpecular)" strokeWidth="58" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.4" />
                
                {/* MECHANICAL INTERFACE PORT */}
                <g transform="translate(200, 400)">
                    <circle r="50" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <circle r="42" fill="none" stroke="#f59e0b" strokeWidth="6" opacity="0.5" />
                </g>
            </svg>
        </div>

        {/* WINNING BALL EXTRACTION LAYER */}
        {(phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL') && (
            <div 
                className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
                style={{ '--ball-color': '#f59e0b' } as any}
            >
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.2px] rounded-full pointer-events-none" />
                <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' || phase === 'REVEAL' ? '24px' : '14px' }}>
                    {formattedWinningNumber}
                </span>
            </div>
        )}

        {/* CHAMBER (JAR) - 99 balls visible and stacked when settled */}
        <div className="machine-jar">
            <div className="jar-neck-mechanical">
                <div className="jar-neck-glow" />
            </div>
            <div className={`jar-body-sphere ${phase === 'SHUFFLE' ? 'chamber-vortex-glow' : ''}`}>
                {balls.map((b) => (
                    <Ball 
                        key={b.id} 
                        id={b.id} 
                        number={b.number} 
                        phase={phase} 
                        isActuallyWinner={parseInt(b.number) === parseInt(winningNumber)} 
                        winningNumber={winningNumber} 
                    />
                ))}
            </div>
        </div>

        {/* BOARD (COLLECTION TRAY) */}
        <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-32' : 'opacity-100 translate-y-0'}`}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-slate-900 border border-amber-500/40 px-6 py-1.5 rounded-full shadow-lg">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] whitespace-nowrap">BOARD PORT</p>
                </div>
            </div>
            
            {/* The winning number is deliberately NOT shown as digital text here; only the ball displays it */}
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-1 bg-amber-500/20 rounded-full animate-pulse" />
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">UNIT VERIFIED</p>
                </div>
            ) : (
                <div className="flex gap-3">
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce" />
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-150" />
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-300" />
                </div>
            )}
        </div>
      </div>

      {/* FINAL AUTHENTICATION OVERLAY */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[1.5px] z-[10020] p-10">
            <div className="relative text-center space-y-16 max-w-4xl animate-result-slam-3d">
                <div className="space-y-6">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/30 px-6 py-2 rounded-full mb-2">
                        <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.8em] animate-pulse">DRAW AUTHENTICATED</p>
                    </div>
                    <h2 className="text-white text-6xl sm:text-8xl font-black russo tracking-tighter uppercase drop-shadow-[0_0_50px_rgba(245,158,11,0.3)]">{gameName}</h2>
                </div>
                
                {/* Visual anchor for the result - The winner ball in the tray behind this glass panel is the focus */}
                <div className="relative inline-block px-16 py-12 sm:px-40 sm:py-24 bg-white/[0.02] rounded-[4rem] sm:rounded-[10rem] border border-amber-500/30 shadow-[0_0_150px_rgba(245,158,11,0.2)] backdrop-blur-2xl overflow-hidden min-h-[250px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/10" />
                    <div className="flex items-center justify-center h-full">
                        {/* Empty area to allow focus on the physical ball result behind the panel */}
                    </div>
                </div>

                <div className="pt-12">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-20 py-7 sm:px-32 sm:py-8 rounded-[2.5rem] uppercase tracking-[0.6em] text-[11px] sm:text-sm transition-all transform active:scale-95 shadow-[0_0_60px_rgba(245,158,11,0.4)] border-b-4 border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">ACCEPT VALIDATION</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;