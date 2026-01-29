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

// Timings for cinematic feel
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
    const radius = 80 + Math.random() * 120;
    const speed = 0.15 + Math.random() * 0.35;
    const delay = Math.random() * -10;
    return { radius, speed, delay };
  }, []);

  // The winning ball is handled separately when it leaves the jar
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL')) {
      return null;
  }

  // The other 99 balls stay in the jar through all active phases
  const isMixing = phase === 'SHUFFLE' || phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-vortex' : ''}`}
        style={{
            '--ball-color': color,
            '--radius': `${motion.radius}px`,
            '--speed': `${motion.speed}s`,
            '--delay': `${motion.delay}s`,
            transform: !isMixing ? `translate(${(id % 12 - 5.5) * 24}px, ${150 + (Math.floor(id/12) * -20)}px)` : undefined
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
                contents: { parts: [{ text: "High-tech futuristic lottery control room, dark glass, amber lighting, laboratory aesthetic, cinematic blur, 8k." }] },
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

  const pipelinePath = "M 200 420 L 200 320 L 120 280 L 280 230 L 120 180 L 280 130 L 340 130 L 340 250 L 280 320 L 340 390 L 280 460 L 340 530 L 280 600 L 340 670 L 340 750 L 200 780";

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden flex flex-col items-center justify-center font-inter">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-30 blur-2xl scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/98 to-transparent" />
        </div>
      )}

      {/* MECHANICAL HEADER STATUS */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-[10100] w-full px-8 animate-fade-in">
            <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_60px_rgba(245,158,11,0.7)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                    <div className={`w-5 h-5 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse shadow-[0_0_20px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_30px_#10b981]'}`} />
                    <p className="text-[13px] font-black text-slate-100 uppercase tracking-[0.5em]">
                        {phase === 'SHUFFLE' ? 'TURBULENCE: ACTIVE' : 'VALIDATION: SUCCESS'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900 border border-white/25 px-12 py-4 rounded-3xl shadow-3xl flex items-center gap-8 backdrop-blur-2xl">
                    <span className="text-amber-500 font-mono font-black text-2xl tracking-tighter uppercase">SYSTEM DRAW T-MINUS {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      {/* Main Machine Container */}
      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'scale-110 brightness-50' : 'opacity-100'}`}>
        
        {/* PIPELINE SVG LAYERS */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
                <linearGradient id="pipeBackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(10,20,30,1)" />
                    <stop offset="25%" stopColor="rgba(40,70,100,0.8)" />
                    <stop offset="50%" stopColor="rgba(60,90,120,0.5)" />
                    <stop offset="75%" stopColor="rgba(40,70,100,0.8)" />
                    <stop offset="100%" stopColor="rgba(10,20,30,1)" />
                </linearGradient>
                <linearGradient id="pipeGlassVolume" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(200,245,255,0.8)" />
                    <stop offset="15%" stopColor="rgba(200,245,255,0.2)" />
                    <stop offset="85%" stopColor="rgba(200,245,255,0.2)" />
                    <stop offset="100%" stopColor="rgba(200,245,255,0.8)" />
                </linearGradient>
                <linearGradient id="pipeSpecularRim" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="3%" stopColor="white" stopOpacity="0.3" />
                    <stop offset="97%" stopColor="white" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="white" stopOpacity="1" />
                </linearGradient>
            </defs>
        </svg>

        {/* 1. PIPELINE BACK */}
        <div className="absolute inset-0 glass-back-wall pipeline-container">
            <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="pipeline-svg">
                <path d={pipelinePath} stroke="rgba(0,0,0,1)" strokeWidth="76" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <path d={pipelinePath} stroke="url(#pipeBackGradient)" strokeWidth="70" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
        </div>

        {/* 2. PIPELINE FRONT */}
        <div className="absolute inset-0 glass-front-highlights pipeline-container">
            <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="pipeline-svg">
                <path d={pipelinePath} stroke="url(#pipeGlassVolume)" strokeWidth="64" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
                <path d={pipelinePath} stroke="url(#pipeSpecularRim)" strokeWidth="68" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <g opacity="1">
                    <circle cx="200" cy="400" r="54" fill="rgba(10,20,35,0.95)" stroke="white" strokeWidth="2" />
                    <circle cx="200" cy="400" r="46" fill="none" stroke="#f59e0b" strokeWidth="10" />
                </g>
            </svg>
        </div>

        {/* 3. WINNING BALL (ONLY VISIBLE ON THE BALL) */}
        {(phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL') && (
            <div 
                className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
                style={{ '--ball-color': '#f59e0b' } as any}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/5 to-transparent blur-[1px] rounded-full pointer-events-none" />
                <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' || phase === 'REVEAL' ? '30px' : '20px' }}>
                    {winningNumber.padStart(2, '0')}
                </span>
            </div>
        )}

        {/* THE SPHERICAL MIXING JAR (PORT) - 99 balls visible here */}
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

        {/* MECHANICAL COLLECTION TRAY (BOARD) */}
        <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-48 scale-90' : 'opacity-100 translate-y-0 scale-100'}`}>
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-slate-950 border-2 border-amber-500 px-14 py-4 rounded-full shadow-3xl">
                    <p className="text-[14px] font-black text-amber-500 uppercase tracking-[0.9em] whitespace-nowrap">BOARD COLLECTION PORT</p>
                </div>
                <div className="w-2 h-16 bg-gradient-to-b from-amber-500 to-transparent"></div>
            </div>
            
            {/* The winning number text is intentionally hidden here - only the ball shows the number */}
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <div className="flex flex-col items-center gap-3 animate-pulse">
                    <div className="w-16 h-2 bg-amber-500/40 rounded-full" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">AUTHENTICATED</p>
                </div>
            ) : (
                <div className="flex gap-8">
                    <div className="w-8 h-8 rounded-full bg-slate-900 animate-bounce shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
                    <div className="w-8 h-8 rounded-full bg-slate-900 animate-bounce delay-150" />
                    <div className="w-8 h-8 rounded-full bg-slate-900 animate-bounce delay-300" />
                </div>
            )}
        </div>
      </div>

      {/* FINAL DRAMATIC REVEAL IMPACT */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-[10020] p-10">
            <div className="relative text-center space-y-20 max-w-6xl animate-result-slam-3d">
                <div className="space-y-10">
                    <div className="inline-block bg-amber-500/20 border-2 border-amber-500 px-12 py-5 rounded-full mb-4 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                        <p className="text-white font-black text-[18px] uppercase tracking-[1.5em] animate-pulse">VERIFIED DRAW RESULT</p>
                    </div>
                    <h2 className="text-white text-8xl sm:text-[11rem] font-black russo tracking-tighter uppercase drop-shadow-[0_0_100px_rgba(245,158,11,0.6)] leading-none">{gameName}</h2>
                </div>
                
                {/* Hiding the digital number - the focal point is the ball in the background tray */}
                <div className="relative inline-block px-28 py-24 sm:px-64 sm:py-48 bg-white/[0.05] rounded-[7rem] sm:rounded-[16rem] border-4 border-amber-500/70 shadow-[0_0_300px_rgba(245,158,11,0.5)] backdrop-blur-3xl overflow-hidden min-h-[400px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-amber-500/20" />
                    <div className="flex flex-col items-center justify-center h-full">
                         {/* This spacer keeps the layout but hides the text number */}
                    </div>
                </div>

                <div className="pt-20">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-32 py-12 sm:px-56 sm:py-14 rounded-[5rem] uppercase tracking-[1.2em] text-[16px] sm:text-xl transition-all transform active:scale-95 shadow-[0_0_120px_rgba(245,158,11,0.7)] border-b-[10px] border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">CONFIRM AUTHENTICATION</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;