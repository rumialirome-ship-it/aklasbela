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
  
  // Deterministic "settled" pile physics
  const settledPos = useMemo(() => {
    const row = Math.floor(id / 12);
    const col = id % 12;
    // Offset each row slightly to create a more natural pile look
    const xOffset = (row % 2) * 11;
    const x = (col - 5.5) * 22 + xOffset;
    const y = 165 + (row * -15.5);
    const rot = (id * 13) % 360;
    return { x, y, rot };
  }, [id]);

  const motion = useMemo(() => {
    // Randomized vortex parameters
    const radius = 65 + Math.random() * 115;
    const speed = 0.2 + Math.random() * 0.25;
    const delay = Math.random() * -10;
    return { radius, speed, delay };
  }, []);

  // When the winner is being delivered or held in the tray, it is removed from the jar rendering
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL')) {
      return null;
  }

  // All non-winning balls remain visible throughout
  const isMixing = phase === 'SHUFFLE';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-vortex' : 'ball-settled'}`}
        style={{
            '--ball-color': color,
            '--radius': `${motion.radius}px`,
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

  // Smoother curves for the glass pipe
  const pipelinePath = "M 200 420 Q 200 320 120 280 Q 280 230 120 180 Q 280 130 340 130 Q 340 250 280 320 Q 340 390 280 460 Q 340 530 280 600 Q 340 670 340 750 Q 340 780 200 780";

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
                        {phase === 'SHUFFLE' ? 'VORTEX MIXING: ACTIVE' : 'SYSTEM STATUS: ISOLATED'}
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
        
        {/* PIPELINE LAYER 1: BACK CAVITY (Behind ball) */}
        <div className="absolute inset-0 z-[30] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="pipeBack" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(0,0,0,0.5)" />
                        <stop offset="50%" stopColor="rgba(0,0,0,0.1)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
                    </linearGradient>
                </defs>
                <path d={pipelinePath} stroke="url(#pipeBack)" strokeWidth="66" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
        </div>

        {/* PIPELINE LAYER 2: THE WINNING BALL (Extraction) */}
        {(phase === 'DELIVERY' || phase === 'HOLD' || phase === 'REVEAL') && (
            <div 
                className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
                style={{ '--ball-color': '#f59e0b', zIndex: 35 } as any}
            >
                <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' || phase === 'REVEAL' ? '24px' : '14px' }}>
                    {formattedWinner}
                </span>
            </div>
        )}

        {/* PIPELINE LAYER 3: FRONT GLASS (Reflections, Specular, Rim) */}
        <div className="absolute inset-0 z-[40] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.01)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                    </linearGradient>
                    <linearGradient id="glassRim" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                        <stop offset="2%" stopColor="rgba(255,255,255,0.02)" />
                        <stop offset="98%" stopColor="rgba(255,255,255,0.02)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </linearGradient>
                    <linearGradient id="specularGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="47%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
                        <stop offset="53%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>
                </defs>
                
                {/* Refractive Body */}
                <path d={pipelinePath} stroke="url(#glassBody)" strokeWidth="60" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {/* Specular Highlights */}
                <path d={pipelinePath} stroke="url(#specularGlow)" strokeWidth="12" fill="none" strokeLinejoin="round" strokeLinecap="round" className="glass-pipe-highlight" />
                {/* Rim Lighting */}
                <path d={pipelinePath} stroke="url(#glassRim)" strokeWidth="64" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                
                {/* INTERFACE PORT */}
                <g transform="translate(200, 400)">
                    <circle r="52" fill="rgba(15,23,42,0.9)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                    <circle r="44" fill="none" stroke="#f59e0b" strokeWidth="6" opacity="0.6" />
                </g>
            </svg>
        </div>

        {/* CHAMBER (JAR) */}
        <div className="machine-jar">
            <div className="jar-neck-mechanical">
                <div className="jar-neck-glow" />
            </div>
            <div className={`jar-body-sphere ${phase === 'SHUFFLE' ? 'chamber-vortex-glow' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 rounded-full pointer-events-none z-[25]" />
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
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">VERIFIED SECURE</p>
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