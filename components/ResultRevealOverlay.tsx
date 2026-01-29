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
}> = React.memo(({ id, number, phase, isActuallyWinner }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  // Natural spread physics for settling at the bottom of the spherical chamber
  const settledPos = useMemo(() => {
    // We want them to spread across the bottom arc of the sphere
    const angle = (id / 99) * Math.PI - (Math.PI / 2); // Spreads from -90deg to +90deg
    const spreadWidth = 140; // Max horizontal spread
    const x = Math.sin(angle) * (spreadWidth * (0.8 + Math.random() * 0.4));
    const y = 160 + Math.cos(angle) * 15 + (Math.floor(id / 15) * -12); // Layered pile
    const rot = (id * 23) % 360;
    return { x, y, rot };
  }, [id]);

  const motion = useMemo(() => {
    // Airflow-driven circular motion parameters
    const radiusX = 80 + Math.random() * 100;
    const radiusY = 60 + Math.random() * 80;
    const speed = 0.25 + Math.random() * 0.2;
    const delay = Math.random() * -10;
    return { radiusX, radiusY, speed, delay };
  }, []);

  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL')) {
      return null;
  }

  const isMixing = phase === 'SHUFFLE';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-airflow' : 'ball-settled'}`}
        style={{
            '--ball-color': color,
            '--radius-x': `${motion.radiusX}px`,
            '--radius-y': `${motion.radiusY}px`,
            '--speed': `${motion.speed}s`,
            '--delay': `${motion.delay}s`,
            '--target-x': `${settledPos.x}px`,
            '--target-y': `${settledPos.y}px`,
            '--target-rot': `${settledPos.rot}deg`,
        } as any}
    >
        <span className="ball-text-3d">{parseInt(number).toString()}</span>
    </div>
  );
});

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [timeLeft, setTimeLeft] = useState(SHUFFLE_TIME / 1000);
  const [aiBackdrop, setAiBackdrop] = useState<string | null>(null);
  
  const balls = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    number: i.toString() 
  })), []);

  useEffect(() => {
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "Hyper-realistic high-tech glass lottery machine laboratory, top extraction neck with glowing orange air jets, smooth glass tubes, dark cinematic lighting, 8k." }] },
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

  // NEW PATH: Emerges from the TOP neck, loops around for visual drama, and enters the tray at bottom
  const pipelinePath = "M 200 150 Q 200 50 300 50 Q 380 50 380 200 Q 380 350 200 400 Q 20 450 20 600 Q 20 750 200 780";

  const formattedWinner = useMemo(() => parseInt(winningNumber).toString(), [winningNumber]);

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden flex flex-col items-center justify-center font-inter">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-xl" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        </div>
      )}

      {/* HEADER STATUS */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-[10010] w-full px-8 animate-fade-in">
            <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-5">
                    <div className={`w-3 h-3 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        {phase === 'SHUFFLE' ? 'AIR-FLOW MIXING: ACTIVE' : 'PRESSURE STABILIZED: SETTLED'}
                    </p>
                </div>
                {phase === 'SHUFFLE' && (
                  <div className="bg-slate-900/60 border border-white/5 px-8 py-2.5 rounded-2xl shadow-xl flex items-center gap-5 backdrop-blur-md">
                    <span className="text-amber-500 font-mono font-black text-lg tracking-widest uppercase">EXTRACTION IN {timeLeft}S</span>
                  </div>
                )}
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'scale-105 brightness-75' : 'opacity-100'}`}>
        
        {/* PIPELINE CONTAINER */}
        <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="pipeBack" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0,0,0,0.6)" />
                        <stop offset="50%" stopColor="rgba(0,0,0,0.1)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
                    </linearGradient>

                    <linearGradient id="glassWall" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="15%" stopColor="rgba(255,255,255,0.03)" />
                        <stop offset="85%" stopColor="rgba(255,255,255,0.03)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                    </linearGradient>

                    <linearGradient id="glassRim" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="3%" stopColor="rgba(255,255,255,0.08)" />
                        <stop offset="97%" stopColor="rgba(255,255,255,0.08)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
                    </linearGradient>

                    <linearGradient id="specularGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="48%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
                        <stop offset="52%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                </defs>

                {/* 1. BACKSIDE OF PIPE */}
                <path d={pipelinePath} stroke="url(#pipeBack)" strokeWidth="66" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
                
                {/* --- WINNING BALL MOVES HERE --- */}

                {/* 2. FRONT GLASS LAYER */}
                <path d={pipelinePath} stroke="url(#glassWall)" strokeWidth="62" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.5" />
                
                {/* 3. SPECULAR HIGHLIGHTS */}
                <path d={pipelinePath} className="glass-pipe-highlight" stroke="url(#specularGlow)" strokeWidth="18" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
                
                {/* 4. RIM LIGHTING */}
                <path d={pipelinePath} stroke="url(#glassRim)" strokeWidth="68" fill="none" strokeLinejoin="round" strokeLinecap="round" />

                {/* TOP EXTRACTION PORT (Lifting Upwards) */}
                <g transform="translate(200, 150)">
                    <rect x="-40" y="-30" width="80" height="40" fill="rgba(15,23,42,0.95)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" rx="10" />
                    <circle r="30" fill="none" stroke="#f59e0b" strokeWidth="4" opacity="0.6" className="animate-pulse" />
                </g>
            </svg>
        </div>

        {/* WINNING BALL EXTRACTION LAYER */}
        {(phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL') && (
            <div 
                className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
                style={{ 
                    '--ball-color': '#f59e0b', 
                    zIndex: 35,
                    '--path-data': `path('${pipelinePath}')` 
                } as any}
            >
                <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' || phase === 'REVEAL' ? '24px' : '14px' }}>
                    {formattedWinner}
                </span>
                <div className="absolute inset-0 bg-white/5 rounded-full pointer-events-none" />
            </div>
        )}

        {/* CHAMBER (JAR) */}
        <div className="machine-jar">
            <div className="jar-neck-mechanical">
                <div className="jar-neck-glow" />
            </div>
            <div className={`jar-body-sphere ${phase === 'SHUFFLE' ? 'chamber-vortex-glow' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10 rounded-full pointer-events-none z-[25]" />
                {balls.map((b) => (
                    <Ball 
                        key={b.id} 
                        id={b.id} 
                        number={b.number} 
                        phase={phase} 
                        isActuallyWinner={parseInt(b.number) === parseInt(winningNumber)} 
                    />
                ))}
            </div>
        </div>

        {/* COLLECTION TRAY */}
        <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-32' : 'opacity-100 translate-y-0'}`}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-slate-900 border border-amber-500/40 px-6 py-1.5 rounded-full shadow-lg">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] whitespace-nowrap">EXTRACTED UNIT</p>
                </div>
            </div>
            
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

      {/* FINAL OVERLAY */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-[10020] p-10">
            <div className="relative text-center space-y-16 max-w-4xl animate-result-slam-3d">
                <div className="space-y-6">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/30 px-6 py-2 rounded-full mb-2">
                        <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.8em] animate-pulse">DRAW AUTHENTICATED</p>
                    </div>
                    <h2 className="text-white text-6xl sm:text-8xl font-black russo tracking-tighter uppercase drop-shadow-[0_0_50px_rgba(245,158,11,0.3)]">{gameName}</h2>
                </div>
                
                <div className="relative inline-block px-16 py-12 sm:px-40 sm:py-24 bg-white/[0.02] rounded-[4rem] sm:rounded-[10rem] border border-amber-500/30 shadow-[0_0_150px_rgba(245,158,11,0.2)] backdrop-blur-2xl overflow-hidden min-h-[250px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/10" />
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