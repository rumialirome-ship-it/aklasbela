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

// Refined timings for cinematic feel
const SHUFFLE_TIME = 15000; // 15 seconds shuffle for better UX while maintaining tension
const DELIVERY_TIME = 8500; // 8.5 seconds for the mechanical journey
const HOLD_TIME = 4500;    // 4.5 seconds hold in display area

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isActuallyWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isActuallyWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  // High-velocity vortex motion
  const motion = useMemo(() => {
    const radius = 70 + Math.random() * 110;
    const speed = 0.3 + Math.random() * 0.4;
    const delay = Math.random() * -15;
    return { radius, speed, delay };
  }, []);

  // During Extraction/Delivery/Hold, only show the special winner ball
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return (
        <div 
          className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
          style={{ '--ball-color': '#f59e0b' } as any}
        >
            <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '18px' : '12px' }}>
                {winningNumber.padStart(2, '0')}
            </span>
        </div>
      );
  }

  // Hide non-winners if we've moved past shuffling to clear the viewport
  if (phase === 'REVEAL' || ((phase === 'DELIVERY' || phase === 'HOLD') && !isActuallyWinner)) return null;
  
  const isMixing = phase === 'SHUFFLE';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-vortex' : ''}`}
        style={{
            '--ball-color': color,
            '--radius': `${motion.radius}px`,
            '--speed': `${motion.speed}s`,
            '--delay': `${motion.delay}s`,
            transform: !isMixing ? `translate(${(id % 15 - 7) * 16}px, ${150 + (Math.floor(id/15) * -16)}px)` : undefined
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
    // Generate an high-end mechanical machine background
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "Cinematic close-up of a futuristic glass lottery machine extraction pipe, dark obsidian background with amber neon glows, hyper-realistic, 8k resolution." }] },
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

    const t1 = setTimeout(() => setPhase('SHUFFLE'), 400);
    const t2 = setTimeout(() => setPhase('DELIVERY'), 400 + SHUFFLE_TIME);
    const t3 = setTimeout(() => setPhase('HOLD'), 400 + SHUFFLE_TIME + DELIVERY_TIME);
    const t4 = setTimeout(() => setPhase('REVEAL'), 400 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);

    return () => {
        clearInterval(tickInterval);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden flex flex-col items-center justify-center font-inter">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-md" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        </div>
      )}

      {/* HEADER INFO */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-12 text-center z-[10010] w-full px-6 animate-fade-in">
            <h2 className="text-white text-4xl sm:text-6xl font-black russo tracking-[0.25em] uppercase mb-3 drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_15px_#10b981]'}`} />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {phase === 'SHUFFLE' ? 'TURBULENT MIXING IN PROGRESS' : 'VERIFICATION STAGE: UNIT IDENTIFIED'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900/80 border border-white/10 px-8 py-2.5 rounded-full shadow-2xl flex items-center gap-5 backdrop-blur-md">
                    <span className="text-amber-500 font-mono font-black text-lg tracking-tighter">EXTRACTION: T-MINUS {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-125 blur-3xl' : 'opacity-100'}`}>
        
        {/* REFINED GLASS PIPELINE (Linear & Helix Zig-Zag) */}
        <div className="absolute inset-0 z-[40] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="pipeGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
                        <stop offset="45%" stopColor="rgba(255,255,255,0.2)" />
                        <stop offset="55%" stopColor="rgba(255,255,255,0.2)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
                    </linearGradient>
                </defs>
                {/* Main Path: Up from Neck -> Zig-Zag -> Right Column Helix -> Down to Box */}
                <path 
                    d="M 200 420 L 200 320 L 120 280 L 280 230 L 120 180 L 280 130 L 340 130 L 340 250 L 280 320 L 340 390 L 280 460 L 340 530 L 280 600 L 340 670 L 340 750 L 200 780"
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="48" 
                    fill="none" 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <path 
                    d="M 200 420 L 200 320 L 120 280 L 280 230 L 120 180 L 280 130 L 340 130 L 340 250 L 280 320 L 340 390 L 280 460 L 340 530 L 280 600 L 340 670 L 340 750 L 200 780"
                    stroke="url(#pipeGlass)" 
                    strokeWidth="42" 
                    fill="none" 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {/* Extraction Neck Rings */}
                <circle cx="200" cy="400" r="28" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="2" />
                <circle cx="200" cy="410" r="28" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="2" />
            </svg>
        </div>

        {/* THE SPHERICAL JAR */}
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

        {/* MECHANICAL COLLECTION TRAY */}
        <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-40 scale-75' : 'opacity-100 translate-y-0 scale-100'}`}>
            <div className="result-display-glass" />
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-slate-900 border border-amber-500/50 px-6 py-1.5 rounded-full shadow-2xl">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] whitespace-nowrap">EXTRACTED UNIT</p>
                </div>
                <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-transparent"></div>
            </div>
            
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber.padStart(2, '0')}</span>
            ) : (
                <div className="flex gap-3">
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce" />
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-100" />
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-200" />
                </div>
            )}
        </div>
      </div>

      {/* FINAL DRAMATIC REVEAL SLAM */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black reveal-slam-bg z-[10020] animate-fade-in p-8">
            <div className="relative text-center space-y-16 max-w-4xl animate-result-slam-3d">
                <div className="space-y-6">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/30 px-6 py-2 rounded-full mb-2">
                        <p className="text-amber-500 font-black text-[11px] uppercase tracking-[0.8em] animate-pulse">OFFICIAL UNIT VERIFICATION</p>
                    </div>
                    <h2 className="text-white text-5xl sm:text-8xl font-black russo tracking-tight uppercase drop-shadow-[0_0_50px_rgba(245,158,11,0.3)]">{gameName}</h2>
                </div>
                
                <div className="relative inline-block px-16 py-12 sm:px-40 sm:py-28 bg-white/[0.02] rounded-[4rem] sm:rounded-[10rem] border-2 border-amber-500/40 shadow-[0_0_150px_rgba(245,158,11,0.25)] backdrop-blur-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/10" />
                    <span className="relative text-[10rem] sm:text-[24rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_30px_80px_rgba(0,0,0,1)]">
                        {winningNumber.padStart(2, '0')}
                    </span>
                </div>

                <div className="pt-12">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-20 py-6 sm:px-32 sm:py-8 rounded-[2.5rem] uppercase tracking-[0.6em] text-[11px] sm:text-sm transition-all transform active:scale-90 shadow-[0_0_60px_rgba(245,158,11,0.4)] border-b-8 border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">ACCEPT CERTIFICATION</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;