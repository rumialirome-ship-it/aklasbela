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

// Timing constants for a cinematic sequence
const SHUFFLE_TIME = 10000; 
const DELIVERY_TIME = 15000; 
const HOLD_TIME = 3500;

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isActuallyWinner: boolean; 
}> = React.memo(({ id, number, phase, isActuallyWinner }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  // Natural settling positions at the bottom of the spherical chamber
  const settledPos = useMemo(() => {
    // Spreads along the bottom arc of the sphere
    const angle = (id / 99) * Math.PI - (Math.PI / 2); 
    const spreadWidth = 110; 
    const x = Math.sin(angle) * (spreadWidth * (0.7 + Math.random() * 0.3));
    const y = 130 + Math.cos(angle) * 12 + (Math.floor(id / 15) * -10);
    const rot = (id * 23) % 360;
    return { x, y, rot };
  }, [id]);

  const motion = useMemo(() => {
    // Mixing motion constrained to the jar
    const radiusX = 60 + Math.random() * 80;
    const radiusY = 50 + Math.random() * 70;
    const speed = 0.3 + Math.random() * 0.2;
    const delay = Math.random() * -10;
    return { radiusX, radiusY, speed, delay };
  }, []);

  // Hide the winner inside the jar only when it's being "extracted" through the pipe
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
                contents: { parts: [{ text: "Hyper-realistic futuristic glass lottery extraction chamber, glowing orange airflow, mechanical laboratory, snaking glass tubes in front, dark cinematic background, 8k." }] },
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

  // EXTRACTION PATH (400x800 SVG space)
  const pipelinePath = "M 200 180 Q 200 80 300 80 Q 380 80 380 250 Q 380 400 200 450 Q 20 500 20 650 Q 20 780 200 780";

  const formattedWinner = useMemo(() => parseInt(winningNumber).toString(), [winningNumber]);

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden flex flex-col items-center justify-center font-inter">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-30 blur-2xl scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
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
                        {phase === 'SHUFFLE' ? 'AIRFLOW VORTEX: ACTIVE' : 'SYSTEM STABILIZED'}
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

      {/* CORE MACHINE ASSEMBLY */}
      <div className={`relative w-full h-full flex items-center justify-center max-w-lg transition-all duration-1000 ${phase === 'REVEAL' ? 'scale-75 -translate-y-20 opacity-40 blur-[2px]' : ''}`}>
        
        {/* BACKGROUND LAYER: The Spherical Chamber (Remaining 99 balls are here) */}
        <div className="absolute inset-0 flex items-center justify-center z-[10] translate-y-[10vh]">
            <div className="machine-jar scale-90 sm:scale-100">
                <div className="jar-neck-mechanical">
                    <div className="jar-neck-glow" />
                </div>
                <div className={`jar-body-sphere ${phase === 'SHUFFLE' ? 'chamber-vortex-glow' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10 rounded-full z-[25] pointer-events-none" />
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
        </div>

        {/* FOREGROUND LAYER: The Extraction Pipe and Moving Ball */}
        <div className="absolute inset-0 z-[50] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="pipeBack" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0,0,0,0.7)" />
                        <stop offset="50%" stopColor="rgba(0,0,0,0.2)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
                    </linearGradient>
                    <linearGradient id="glassWall" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                        <stop offset="10%" stopColor="rgba(255,255,255,0.04)" />
                        <stop offset="90%" stopColor="rgba(255,255,255,0.04)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
                    </linearGradient>
                    <linearGradient id="glassRim" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                        <stop offset="4%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="96%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
                    </linearGradient>
                    <linearGradient id="specularGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="48%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
                        <stop offset="52%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                </defs>

                <path d={pipelinePath} stroke="url(#pipeBack)" strokeWidth="70" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                
                {/* Extraction Animation Ball */}
                {(phase === 'DELIVERY' || phase === 'HOLD') && (
                    <foreignObject 
                        className={`overflow-visible ${phase === 'DELIVERY' ? 'ball-delivering-svg' : 'ball-held-svg-final'}`}
                        width="60" height="60"
                        style={{
                            '--path-data': `path('${pipelinePath}')`
                        } as any}
                    >
                        <div className="lottery-ball-3d relative flex items-center justify-center w-[60px] h-[60px]" style={{ '--ball-color': '#f59e0b' } as any}>
                            <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '28px' : '18px' }}>
                                {formattedWinner}
                            </span>
                        </div>
                    </foreignObject>
                )}

                <path d={pipelinePath} stroke="url(#glassWall)" strokeWidth="66" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.6" />
                <path d={pipelinePath} className="glass-pipe-highlight" stroke="url(#specularGlow)" strokeWidth="22" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
                <path d={pipelinePath} stroke="url(#glassRim)" strokeWidth="74" fill="none" strokeLinejoin="round" strokeLinecap="round" />

                <g transform="translate(200, 180)">
                    <rect x="-50" y="-40" width="100" height="60" fill="rgba(10,20,35,0.99)" stroke="rgba(255,255,255,0.25)" strokeWidth="2" rx="15" />
                    <circle r="36" fill="none" stroke="#f59e0b" strokeWidth="4" opacity="0.8" className="animate-pulse" />
                </g>
            </svg>
        </div>

        {/* COLLECTION TRAY (Bottom UI Anchor) - Removed the 'glow-text' from here as per request */}
        <div className={`result-display-box transition-all duration-1000 z-[60] translate-y-[38vh] ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-[48vh]' : 'opacity-100'}`}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="bg-slate-900 border border-amber-500/40 px-8 py-2 rounded-full shadow-2xl">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] whitespace-nowrap">UNIT CAPTURED</p>
                </div>
            </div>
            
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <div className="flex flex-col items-center gap-1">
                    <div className="w-20 h-1 bg-amber-500/20 rounded-full animate-pulse" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">DRAW AUTHENTICATED</p>
                </div>
            ) : (
                <div className="flex gap-4">
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce" />
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-150" />
                    <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-300" />
                </div>
            )}
        </div>
      </div>

      {/* FINAL SYSTEM AUTHENTICATION OVERLAY (Center Piece is the Ball) */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[10020] p-10">
            <div className="relative text-center space-y-12 max-w-4xl animate-result-slam-3d">
                <div className="space-y-6">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/30 px-6 py-2 rounded-full mb-2">
                        <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.8em] animate-pulse">CRYPTOGRAPHIC VERIFICATION SUCCESSFUL</p>
                    </div>
                    <h2 className="text-white text-6xl sm:text-8xl font-black russo tracking-tighter uppercase drop-shadow-[0_0_50px_rgba(245,158,11,0.5)]">{gameName}</h2>
                </div>
                
                {/* CENTERPIECE: The Winning Ball instead of text */}
                <div className="relative flex items-center justify-center p-20">
                    <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full scale-150 animate-pulse" />
                    <div className="lottery-ball-3d relative flex items-center justify-center w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] shadow-[0_0_80px_rgba(245,158,11,0.6)]" style={{ '--ball-color': '#f59e0b' } as any}>
                        <span className="font-black russo text-slate-950 text-7xl sm:text-9xl -rotate-12 drop-shadow-md">
                            {formattedWinner}
                        </span>
                        <div className="absolute inset-0 bg-white/15 rounded-full pointer-events-none border border-white/20" />
                    </div>
                </div>

                <div className="pt-8">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-24 py-8 sm:px-36 sm:py-9 rounded-[2.5rem] uppercase tracking-[0.6em] text-[11px] sm:text-sm transition-all transform active:scale-95 shadow-[0_0_60px_rgba(245,158,11,0.6)] border-b-4 border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">ACCEPT VALIDATION</span>
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