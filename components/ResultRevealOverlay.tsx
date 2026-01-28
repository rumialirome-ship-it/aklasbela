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
    const radius = 70 + Math.random() * 130;
    const speed = 0.15 + Math.random() * 0.35;
    const delay = Math.random() * -10;
    return { radius, speed, delay };
  }, []);

  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return null;
  }

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
            transform: !isMixing ? `translate(${(id % 12 - 5.5) * 22}px, ${145 + (Math.floor(id/12) * -19)}px)` : undefined
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
                contents: { parts: [{ text: "Ultramodern high-tech lottery control center, high contrast lighting, laboratory aesthetic, 8k, cinematic atmosphere." }] },
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
            <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_50px_rgba(245,158,11,0.6)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                    <div className={`w-5 h-5 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse shadow-[0_0_20px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_25px_#10b981]'}`} />
                    <p className="text-[13px] font-black text-slate-200 uppercase tracking-[0.5em]">
                        {phase === 'SHUFFLE' ? 'TURBULENCE: ACTIVE' : 'OUTCOME: FINALIZED'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900 border border-white/20 px-12 py-4 rounded-3xl shadow-3xl flex items-center gap-8 backdrop-blur-2xl">
                    <span className="text-amber-500 font-mono font-black text-2xl tracking-tighter uppercase">ESTABLISHING T-MINUS {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
        
        {/* SHARED SVG PIPELINE DEFS */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
                <linearGradient id="pipeBackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(20,40,60,1)" />
                    <stop offset="20%" stopColor="rgba(60,100,140,0.8)" />
                    <stop offset="50%" stopColor="rgba(80,120,160,0.5)" />
                    <stop offset="80%" stopColor="rgba(60,100,140,0.8)" />
                    <stop offset="100%" stopColor="rgba(20,40,60,1)" />
                </linearGradient>
                <linearGradient id="pipeGlassVolume" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(180,240,255,0.8)" />
                    <stop offset="10%" stopColor="rgba(180,240,255,0.25)" />
                    <stop offset="90%" stopColor="rgba(180,240,255,0.25)" />
                    <stop offset="100%" stopColor="rgba(180,240,255,0.8)" />
                </linearGradient>
                <linearGradient id="pipeSpecularRim" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="2%" stopColor="white" stopOpacity="0.3" />
                    <stop offset="98%" stopColor="white" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="white" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="pipeCenterBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="48%" stopColor="transparent" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.98)" />
                    <stop offset="52%" stopColor="transparent" />
                </linearGradient>
            </defs>
        </svg>

        {/* 1. PIPELINE BACK LAYER */}
        <div className="absolute inset-0 glass-back-wall pipeline-container">
            <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="pipeline-svg">
                <path d={pipelinePath} stroke="rgba(0,0,0,1)" strokeWidth="74" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <path d={pipelinePath} stroke="url(#pipeBackGradient)" strokeWidth="68" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
        </div>

        {/* 2. PIPELINE FRONT LAYER (HIGHLIGHTS) - Elevated Viewport */}
        <div className="absolute inset-0 glass-front-highlights pipeline-container">
            <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="pipeline-svg">
                {/* Volumetric Tint */}
                <path d={pipelinePath} stroke="url(#pipeGlassVolume)" strokeWidth="60" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
                {/* Sharp Specular Edge */}
                <path d={pipelinePath} stroke="url(#pipeSpecularRim)" strokeWidth="64" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Glossy Reflection */}
                <path d={pipelinePath} className="glass-specular-beam" stroke="url(#pipeCenterBeam)" strokeWidth="22" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                
                {/* THE "VISIBLE PORTS" (Mechanical Connectors) */}
                <g opacity="1">
                    <circle cx="200" cy="400" r="48" fill="rgba(15,23,42,0.95)" stroke="white" strokeWidth="2" />
                    <circle cx="200" cy="400" r="40" fill="none" stroke="rgba(245,158,11,1)" strokeWidth="8" />
                    <circle cx="200" cy="400" r="32" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                    <path d="M 180 400 L 220 400 M 200 380 L 200 420" stroke="white" strokeWidth="1" opacity="0.3" />
                </g>
            </svg>
        </div>

        {/* 3. WINNING BALL (EXTRACTION LAYER) - Now rendered IN FRONT of the glass pipeline */}
        {(phase === 'DELIVERY' || phase === 'HOLD') && (
            <div 
                className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
                style={{ '--ball-color': '#f59e0b' } as any}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/5 to-transparent blur-[1px] rounded-full pointer-events-none" />
                <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '28px' : '18px' }}>
                    {winningNumber.padStart(2, '0')}
                </span>
            </div>
        )}

        {/* THE SPHERICAL MIXING CHAMBER */}
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
        <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-48 scale-90' : 'opacity-100 translate-y-0 scale-100'}`}>
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-slate-950 border-2 border-amber-500 px-12 py-4 rounded-full shadow-3xl">
                    <p className="text-[14px] font-black text-amber-500 uppercase tracking-[0.8em] whitespace-nowrap">SECURE COLLECTION PORT</p>
                </div>
                <div className="w-1.5 h-14 bg-gradient-to-b from-amber-500 to-transparent"></div>
            </div>
            
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber.padStart(2, '0')}</span>
            ) : (
                <div className="flex gap-6">
                    <div className="w-6 h-6 rounded-full bg-slate-800 animate-bounce shadow-[0_0_20px_rgba(255,255,255,0.15)]" />
                    <div className="w-6 h-6 rounded-full bg-slate-800 animate-bounce delay-150" />
                    <div className="w-6 h-6 rounded-full bg-slate-800 animate-bounce delay-300" />
                </div>
            )}
        </div>
      </div>

      {/* FINAL DRAMATIC REVEAL IMPACT */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black reveal-slam-bg z-[10020] p-10">
            <div className="relative text-center space-y-20 max-w-5xl animate-result-slam-3d">
                <div className="space-y-8">
                    <div className="inline-block bg-amber-500/15 border border-amber-500/40 px-10 py-4 rounded-full mb-3">
                        <p className="text-amber-500 font-black text-[14px] uppercase tracking-[1.5em] animate-pulse">OFFICIAL AUTHENTICATION</p>
                    </div>
                    <h2 className="text-white text-7xl sm:text-[9rem] font-black russo tracking-tighter uppercase drop-shadow-[0_0_80px_rgba(245,158,11,0.5)] leading-none">{gameName}</h2>
                </div>
                
                <div className="relative inline-block px-24 py-20 sm:px-56 sm:py-36 bg-white/[0.04] rounded-[6rem] sm:rounded-[14rem] border-4 border-amber-500/60 shadow-[0_0_250px_rgba(245,158,11,0.4)] backdrop-blur-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-amber-500/20" />
                    <span className="relative text-[14rem] sm:text-[32rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_50px_120px_rgba(0,0,0,1)]">
                        {winningNumber.padStart(2, '0')}
                    </span>
                </div>

                <div className="pt-16">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-28 py-10 sm:px-48 sm:py-12 rounded-[4rem] uppercase tracking-[1em] text-[14px] sm:text-lg transition-all transform active:scale-95 shadow-[0_0_100px_rgba(245,158,11,0.6)] border-b-8 border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">ACCEPT VERIFIED OUTCOME</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;