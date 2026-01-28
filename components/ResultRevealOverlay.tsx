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
    const radius = 60 + Math.random() * 120;
    const speed = 0.2 + Math.random() * 0.3;
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
            transform: !isMixing ? `translate(${(id % 12 - 5.5) * 20}px, ${140 + (Math.floor(id/12) * -18)}px)` : undefined
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
                contents: { parts: [{ text: "Hyper-realistic high-tech laboratory background for a lottery drawing, 8k resolution, cinematic amber and blue lighting, blurred machinery." }] },
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
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        </div>
      )}

      {/* MECHANICAL HEADER STATUS */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-[10010] w-full px-8 animate-fade-in">
            <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-5">
                    <div className={`w-4 h-4 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse shadow-[0_0_15px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_200px_#10b981]'}`} />
                    <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.4em]">
                        {phase === 'SHUFFLE' ? 'TURBULENCE: ACTIVE' : 'OUTCOME: STABLE'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900/90 border border-white/10 px-10 py-3 rounded-2xl shadow-2xl flex items-center gap-6 backdrop-blur-xl">
                    <span className="text-amber-500 font-mono font-black text-xl tracking-tighter uppercase">DRAW T-MINUS {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
        
        {/* SHARED SVG PIPELINE DEFS - BOOSTED CONTRAST */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
                <linearGradient id="pipeBackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(30,40,50,1)" />
                    <stop offset="15%" stopColor="rgba(60,80,100,0.6)" />
                    <stop offset="50%" stopColor="rgba(80,100,120,0.3)" />
                    <stop offset="85%" stopColor="rgba(60,80,100,0.6)" />
                    <stop offset="100%" stopColor="rgba(30,40,50,1)" />
                </linearGradient>
                <linearGradient id="pipeGlassVolume" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(200,240,255,0.6)" />
                    <stop offset="10%" stopColor="rgba(200,240,255,0.15)" />
                    <stop offset="90%" stopColor="rgba(200,240,255,0.15)" />
                    <stop offset="100%" stopColor="rgba(200,240,255,0.6)" />
                </linearGradient>
                <linearGradient id="pipeSpecularRim" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="2%" stopColor="white" stopOpacity="0.2" />
                    <stop offset="98%" stopColor="white" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="white" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="pipeCenterBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="48%" stopColor="transparent" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.95)" />
                    <stop offset="52%" stopColor="transparent" />
                </linearGradient>
            </defs>
        </svg>

        {/* 1. PIPELINE BACK LAYER (Physical Occlusion + High Contrast Inner Wall) */}
        <div className="absolute inset-0 glass-back-wall pipeline-container">
            <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="pipeline-svg">
                {/* Structural Outer Silhouette (Light color to separate from BG) */}
                <path d={pipelinePath} stroke="rgba(255,255,255,0.15)" strokeWidth="66" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Dark Depth Stroke */}
                <path d={pipelinePath} stroke="rgba(0,0,0,1)" strokeWidth="62" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Inner Gradient Wall */}
                <path d={pipelinePath} stroke="url(#pipeBackGradient)" strokeWidth="60" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
        </div>

        {/* 2. WINNING BALL (EXTRACTION LAYER) - Sandwiched between back and front glass */}
        {(phase === 'DELIVERY' || phase === 'HOLD') && (
            <div 
                className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
                style={{ '--ball-color': '#f59e0b' } as any}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/5 to-transparent blur-[1px] rounded-full pointer-events-none" />
                <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '22px' : '13px' }}>
                    {winningNumber.padStart(2, '0')}
                </span>
            </div>
        )}

        {/* 3. PIPELINE FRONT LAYER (Surface Physics + High Contrast Highlights) */}
        <div className="absolute inset-0 glass-front-highlights pipeline-container">
            <svg viewBox="0 0 400 800" preserveAspectRatio="none" className="pipeline-svg">
                {/* Volumetric Glass Material (Prominent tint) */}
                <path d={pipelinePath} stroke="url(#pipeGlassVolume)" strokeWidth="58" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
                {/* Hard Surface Specular Rim (Very Visible Edge) */}
                <path d={pipelinePath} stroke="url(#pipeSpecularRim)" strokeWidth="59.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Dynamic Glossy Shine (The "Front" highlight) */}
                <path d={pipelinePath} className="glass-specular-beam" stroke="url(#pipeCenterBeam)" strokeWidth="16" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Subtle Refractive Texture */}
                <path d={pipelinePath} className="caustic-texture" stroke="rgba(255,255,255,0.15)" strokeWidth="54" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                
                {/* Industrial Joints (Highly Visible) */}
                <circle cx="200" cy="400" r="42" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="8" />
                <circle cx="200" cy="400" r="34" fill="none" stroke="rgba(245,158,11,0.8)" strokeWidth="3" />
                <circle cx="200" cy="400" r="30" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            </svg>
        </div>

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
                <div className="bg-slate-900 border-2 border-amber-500/60 px-8 py-2 rounded-full shadow-2xl">
                    <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.6em] whitespace-nowrap">SECURE REVEAL</p>
                </div>
                <div className="w-1 h-10 bg-gradient-to-b from-amber-500 to-transparent"></div>
            </div>
            
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber.padStart(2, '0')}</span>
            ) : (
                <div className="flex gap-4">
                    <div className="w-4 h-4 rounded-full bg-slate-800 animate-bounce shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                    <div className="w-4 h-4 rounded-full bg-slate-800 animate-bounce delay-150" />
                    <div className="w-4 h-4 rounded-full bg-slate-800 animate-bounce delay-300" />
                </div>
            )}
        </div>
      </div>

      {/* FINAL DRAMATIC REVEAL IMPACT */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black reveal-slam-bg z-[10020] p-10">
            <div className="relative text-center space-y-20 max-w-5xl animate-result-slam-3d">
                <div className="space-y-8">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/40 px-8 py-3 rounded-full mb-3">
                        <p className="text-amber-500 font-black text-[12px] uppercase tracking-[1.2em] animate-pulse">OFFICIAL AUTHENTICATION</p>
                    </div>
                    <h2 className="text-white text-6xl sm:text-9xl font-black russo tracking-tighter uppercase drop-shadow-[0_0_60px_rgba(245,158,11,0.4)]">{gameName}</h2>
                </div>
                
                <div className="relative inline-block px-20 py-16 sm:px-48 sm:py-32 bg-white/[0.03] rounded-[5rem] sm:rounded-[12rem] border-2 border-amber-500/50 shadow-[0_0_200px_rgba(245,158,11,0.3)] backdrop-blur-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-amber-500/15" />
                    <span className="relative text-[12rem] sm:text-[28rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_40px_100px_rgba(0,0,0,1)]">
                        {winningNumber.padStart(2, '0')}
                    </span>
                </div>

                <div className="pt-16">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-24 py-8 sm:px-40 sm:py-10 rounded-[3rem] uppercase tracking-[0.8em] text-[12px] sm:text-base transition-all transform active:scale-95 shadow-[0_0_80px_rgba(245,158,11,0.5)] border-b-8 border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">ACCEPT VERIFIED OUTCOME</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;