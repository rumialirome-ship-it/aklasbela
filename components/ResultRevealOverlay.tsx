
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

const SHUFFLE_TIME = 6000;  // 6 seconds mixing
const DELIVERY_TIME = 4500; // 4.5 seconds travel (matches CSS)
const HOLD_TIME = 5000;     // 5 seconds hold before big screen

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    const R = 150; // Max radius within chamber
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -10,
        duration: 0.25 + Math.random() * 0.4,
        path
    };
  }, []);

  // During delivery OR hold, the actual winning ball travels and then stays
  if (isWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return (
        <div 
          className="lottery-ball-3d ball-delivering" 
          style={{ '--ball-color': '#f59e0b' } as any}
        >
            <span className="ball-text-3d" style={{fontSize: '14px'}}>{winningNumber}</span>
        </div>
      );
  }

  // If we are in reveal phase, everything in the machine is hidden
  if (phase === 'REVEAL') return null;

  // Fix: Removed redundant check that caused TypeScript narrowing error as phase was already narrowed by previous returns.
  // The winner ball is already handled for DELIVERY/HOLD/REVEAL phases above.

  const isMixing = phase === 'SHUFFLE' || phase === 'DELIVERY' || phase === 'HOLD';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-mixing' : ''}`}
        style={{
            '--ball-color': color,
            '--delay': `${motion.delay}s`,
            '--duration': `${motion.duration}s`,
            '--x1': `${motion.path[0].x}px`, '--y1': `${motion.path[0].y}px`,
            '--x2': `${motion.path[1].x}px`, '--y2': `${motion.path[1].y}px`,
            '--x3': `${motion.path[2].x}px`, '--y3': `${motion.path[2].y}px`,
            '--x4': `${motion.path[3].x}px`, '--y4': `${motion.path[3].y}px`,
            // If not mixing, they settle at the bottom
            transform: !isMixing ? `translate(${(id % 20 - 10) * 14}px, ${140 + (Math.floor(id/20) * -16)}px)` : undefined
        } as any}
    >
        <span className="ball-text-3d">{number}</span>
    </div>
  );
});

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [aiBackdrop, setAiBackdrop] = useState<string | null>(null);
  
  const balls = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    number: i.toString().padStart(2, '0')
  })), []);

  useEffect(() => {
    // Atmosphere generation
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "A high-end cinematic 3D lottery studio with neon accents and metallic textures, minimal blue-gray lighting, 8k resolution." }] },
                config: { imageConfig: { aspectRatio: "9:16" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setAiBackdrop(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {}
    };
    gen();

    // Sequence timing
    const startTimer = setTimeout(() => setPhase('SHUFFLE'), 800);
    const deliveryTimer = setTimeout(() => setPhase('DELIVERY'), 800 + SHUFFLE_TIME);
    const holdTimer = setTimeout(() => setPhase('HOLD'), 800 + SHUFFLE_TIME + DELIVERY_TIME);
    const revealTimer = setTimeout(() => setPhase('REVEAL'), 800 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);

    return () => {
        clearTimeout(startTimer);
        clearTimeout(deliveryTimer);
        clearTimeout(holdTimer);
        clearTimeout(revealTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] lottery-machine-viewport select-none bg-black">
      
      {/* AI Atmosphere Backdrop */}
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-30 blur-md" alt="Backdrop" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </div>
      )}

      {/* HEADER HUD */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-50 animate-fade-in">
            <h2 className="text-white text-5xl font-black russo tracking-[0.3em] uppercase mb-2 drop-shadow-2xl">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex items-center justify-center gap-4">
                <div className={`w-3 h-3 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {phase === 'SHUFFLE' ? 'STABILIZING NODES...' : phase === 'DELIVERY' ? 'NODE EXTRACTION...' : 'DRAW VERIFIED'}
                </p>
            </div>
        </div>
      )}

      {/* MECHANICAL CORE */}
      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
        
        {/* THE CHAMBER */}
        <div className="machine-chamber">
            {balls.map((b) => (
                <Ball 
                    key={b.id} 
                    id={b.id} 
                    number={b.number} 
                    phase={phase} 
                    isWinner={b.number === winningNumber} 
                    winningNumber={winningNumber} 
                />
            ))}
            
            {/* PORT HOUSING */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-16 bg-slate-900 rounded-t-3xl border-x-4 border-t-4 border-slate-800 z-30 flex items-center justify-center shadow-inner">
                <div className="w-16 h-8 bg-black rounded-full shadow-inner border border-white/5" />
            </div>
        </div>

        {/* DELIVERY PATH (Zig-Zag visual) */}
        <div className="absolute z-10 pointer-events-none opacity-40">
            <svg width="400" height="800" viewBox="0 0 400 800" fill="none">
                <path 
                    d="M 200 350 L 200 450 L 80 520 L 320 620 L 200 700 L 200 800" 
                    stroke="white" strokeWidth="2" strokeDasharray="15 20" 
                />
            </svg>
        </div>

        {/* SIDE BUTTON DECORATION */}
        <div className="side-buttons">
            <div className="mech-btn btn-blue">Reset</div>
            <div className="mech-btn btn-red">Draw</div>
        </div>

        {/* RESULT BOX AT BOTTOM */}
        <div className="result-display-box">
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber}</span>
            ) : (
                <span className="opacity-20 text-3xl font-black">??</span>
            )}
        </div>
      </div>

      {/* THE BIG SCREEN REVEAL */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in overflow-hidden">
            {aiBackdrop && (
                <img src={aiBackdrop} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110" alt="" />
            )}
            
            <div className="relative z-10 animate-result-slam-3d text-center">
                <p className="text-amber-500 font-black russo text-4xl sm:text-6xl tracking-[0.4em] mb-12 uppercase italic drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">AUTHENTIC WINNER</p>
                
                <div className="glass-panel rounded-[5rem] sm:rounded-[8rem] px-20 py-24 sm:px-64 sm:py-56 border-[24px] sm:border-[40px] border-amber-500 shadow-[0_0_200px_rgba(245,158,11,0.3)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-40"></div>
                    <span className="relative text-[18rem] sm:text-[36rem] font-black russo text-white leading-none drop-shadow-[0_30px_60px_rgba(0,0,0,1)] gold-shimmer block">
                        {winningNumber}
                    </span>
                </div>

                <div className="mt-24">
                    <button 
                        onClick={onClose}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-24 py-10 rounded-full text-3xl sm:text-5xl uppercase tracking-[0.5em] transition-all active:scale-90 shadow-2xl border-b-[12px] border-amber-800 hover:translate-y-2 hover:border-b-[8px]"
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FOOTER SYNC STATUS */}
      <div className="absolute bottom-8 left-8 opacity-40 flex items-center gap-4">
          <div className="w-5 h-5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_20px_#10b981]" />
          <span className="text-[12px] font-black text-white uppercase tracking-[0.6em]">MECHANICAL PIPELINE: SECURE & VERIFIED</span>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;
