
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

const SHUFFLE_TIME = 5000;  // 5 seconds mixing
const DELIVERY_TIME = 4500; // 4.5 seconds travel
const HOLD_TIME = 5000;     // 5 seconds hold at bottom as requested

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    const R = 140; 
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -10,
        duration: 0.25 + Math.random() * 0.45,
        path
    };
  }, []);

  // Handle the winning ball delivery and hold
  if (isWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return (
        <div 
          className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'ball-delivering' : 'ball-held'}`} 
          style={{ '--ball-color': '#f59e0b' } as any}
        >
            <span className="ball-text-3d" style={{ fontSize: phase === 'HOLD' ? '14px' : '11px' }}>
                {winningNumber}
            </span>
        </div>
      );
  }

  // Everything in the machine vanishes during reveal
  if (phase === 'REVEAL') return null;

  // Static/mixing version of the winning ball is hidden once delivery starts
  if (isWinner && (phase === 'DELIVERY' || phase === 'HOLD')) return null;

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
            transform: !isMixing ? `translate(${(id % 20 - 10) * 14}px, ${130 + (Math.floor(id/20) * -15)}px)` : undefined
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
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "A premium 3D mechanical lottery set in a high-end dark studio with realistic metallic textures and minimal blue-gray lighting. Photorealistic 8k render." }] },
                config: { imageConfig: { aspectRatio: "9:16" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setAiBackdrop(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {}
    };
    gen();

    const startTimer = setTimeout(() => setPhase('SHUFFLE'), 500);
    const deliveryTimer = setTimeout(() => setPhase('DELIVERY'), 500 + SHUFFLE_TIME);
    const holdTimer = setTimeout(() => setPhase('HOLD'), 500 + SHUFFLE_TIME + DELIVERY_TIME);
    const revealTimer = setTimeout(() => setPhase('REVEAL'), 500 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);

    return () => {
        clearTimeout(startTimer);
        clearTimeout(deliveryTimer);
        clearTimeout(holdTimer);
        clearTimeout(revealTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] lottery-machine-viewport select-none bg-black">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-md" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black" />
        </div>
      )}

      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-50 animate-fade-in">
            <h2 className="text-white text-4xl sm:text-5xl font-black russo tracking-[0.3em] uppercase mb-2">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex items-center justify-center gap-4">
                <div className={`w-3 h-3 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {phase === 'SHUFFLE' ? 'CORE SHUFFLING' : phase === 'DELIVERY' ? 'NODE EXTRACTION' : phase === 'HOLD' ? 'VERIFYING DRAW' : 'REVEALING...'}
                </p>
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-[50px]' : 'opacity-100'}`}>
        <div className="machine-chamber">
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
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-16 bg-slate-900 rounded-t-3xl border-x-4 border-t-4 border-slate-800 z-30 flex items-center justify-center">
                <div className="w-16 h-8 bg-black rounded-full border border-white/5" />
            </div>
        </div>

        <div className="absolute z-10 pointer-events-none opacity-25">
            <svg width="400" height="800" viewBox="0 0 400 800" fill="none">
                <path d="M 200 350 L 200 450 L 80 520 L 320 620 L 200 700 L 200 800" stroke="white" strokeWidth="2" strokeDasharray="10 15" />
            </svg>
        </div>

        <div className="result-display-box">
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber}</span>
            ) : (
                <span className="opacity-10 text-4xl font-black">??</span>
            )}
        </div>
      </div>

      {phase === 'REVEAL' && (
        <div className="absolute inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in overflow-hidden">
            {aiBackdrop && (
                <img src={aiBackdrop} className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm scale-110" alt="" />
            )}
            <div className="relative z-10 animate-result-slam-3d text-center">
                <p className="text-amber-500 font-black russo text-4xl sm:text-7xl tracking-[0.5em] mb-12 uppercase italic">AUTHENTIC WINNER</p>
                <div className="glass-panel rounded-[6rem] sm:rounded-[10rem] px-24 py-28 sm:px-72 sm:py-64 border-[30px] sm:border-[54px] border-amber-500 shadow-[0_0_250px_rgba(245,158,11,0.4)] relative overflow-hidden backdrop-blur-3xl">
                    <span className="relative text-[20rem] sm:text-[42rem] font-black russo text-white leading-none gold-shimmer block">
                        {winningNumber}
                    </span>
                </div>
                <div className="mt-28">
                    <button onClick={onClose} className="bg-amber-600 hover:bg-amber-500 text-white font-black px-32 py-12 rounded-full text-4xl sm:text-6xl uppercase tracking-[0.6em] transition-all active:scale-95 shadow-2xl border-b-[15px] border-amber-800">
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
