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

const SHUFFLE_TIME = 4000;  // 4 seconds mixing
const DELIVERY_TIME = 4500; // 4.5 seconds travel
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
    const R = 150; 
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -10,
        duration: 0.2 + Math.random() * 0.3,
        path
    };
  }, []);

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

  if (phase === 'REVEAL') return null;
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
            '--x4': `${motion.path[3].x}px`, '--y4': `${motion.path[3].y}px`,
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
        } catch (e) {
            console.error("AI Error", e);
        }
    };
    gen();

    const t1 = setTimeout(() => setPhase('SHUFFLE'), 500);
    const t2 = setTimeout(() => setPhase('DELIVERY'), 500 + SHUFFLE_TIME);
    const t3 = setTimeout(() => setPhase('HOLD'), 500 + SHUFFLE_TIME + DELIVERY_TIME);
    const t4 = setTimeout(() => setPhase('REVEAL'), 500 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] lottery-machine-viewport select-none bg-black overflow-hidden">
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-md" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
      )}

      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center z-[10010] w-full animate-fade-in">
            <h2 className="text-white text-4xl sm:text-5xl font-black russo tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex items-center justify-center gap-3">
                <div className={`w-2 h-2 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {phase === 'SHUFFLE' ? 'NODE STABILIZATION' : phase === 'DELIVERY' ? 'NODE EXTRACTION' : phase === 'HOLD' ? 'VERIFICATION HOLD' : 'PROCESSING...'}
                </p>
            </div>
        </div>
      )}

      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-3xl' : 'opacity-100'}`}>
        <div className="machine-chamber">
            {balls.map((b) => (
                <Ball 
                    key={b.id} 
                    id={b.id} 
                    number={b.number} 
                    phase={phase} 
                    isWinner={Number(b.number) === Number(winningNumber)} 
                    winningNumber={winningNumber} 
                />
            ))}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-16 bg-slate-900 rounded-t-3xl border-x-4 border-t-4 border-slate-800 z-30 flex items-center justify-center">
                <div className="w-16 h-8 bg-black rounded-full shadow-inner border border-white/5" />
            </div>
        </div>

        <div className="absolute z-10 pointer-events-none opacity-20">
            <svg width="400" height="800" viewBox="0 0 400 800" fill="none">
                <path d="M 200 350 L 200 450 L 80 520 L 320 620 L 200 700 L 200 800" stroke="white" strokeWidth="2" strokeDasharray="10 15" />
            </svg>
        </div>

        <div className="result-display-box">
            {phase === 'HOLD' && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-emerald-400 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse whitespace-nowrap">
                    MATCH FOUND
                </div>
            )}
            {(phase === 'HOLD' || phase === 'REVEAL') ? (
                <span className="result-glow-text">{winningNumber}</span>
            ) : (
                <span className="opacity-10 text-4xl font-black text-white">??</span>
            )}
        </div>
      </div>

      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-[10020] animate-fade-in p-6 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f59e0b10_0%,_transparent_70%)] opacity-50" />
            <div className="relative text-center space-y-12 max-w-2xl animate-result-slam-3d">
                <div className="space-y-4">
                    <p className="text-amber-500 font-black text-xs sm:text-sm uppercase tracking-[0.8em] animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">AUTHENTIC WINNER</p>
                    <h2 className="text-white text-5xl sm:text-7xl font-black russo tracking-tighter uppercase drop-shadow-2xl">{gameName}</h2>
                </div>
                <div className="relative inline-block px-16 py-12 sm:px-24 sm:py-20 bg-white/[0.03] rounded-[4rem] sm:rounded-[6rem] border-2 border-amber-500/40 shadow-[0_0_100px_rgba(245,158,11,0.2)] group backdrop-blur-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
                    <span className="relative text-[10rem] sm:text-[18rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
                        {winningNumber}
                    </span>
                </div>
                <div className="pt-12">
                    <button 
                        onClick={onClose}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-16 py-5 rounded-2xl uppercase tracking-[0.4em] text-xs sm:text-sm transition-all transform active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                    >
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