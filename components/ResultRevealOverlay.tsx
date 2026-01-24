
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'IDLE' | 'SHUFFLE' | 'DELIVERY' | 'REVEAL';

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

const SHUFFLE_TIME = 8000; // 8 seconds mixing
const DELIVERY_TIME = 4500; // 4.5 seconds travel

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    const R = 140; // Max radius within chamber
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -10,
        duration: 0.3 + Math.random() * 0.4,
        path
    };
  }, []);

  // During delivery, the actual winning ball from the chamber is "pulled"
  if (isWinner && phase === 'DELIVERY') {
      return (
        <div 
          className="lottery-ball-3d ball-delivering" 
          style={{ '--ball-color': color } as any}
        >
            <span className="ball-text-3d">{winningNumber}</span>
        </div>
      );
  }

  // If this ball is the one being delivered, hide the static/shuffling one
  if (isWinner && (phase === 'DELIVERY' || phase === 'REVEAL')) return null;

  const isMixing = phase === 'SHUFFLE' || phase === 'DELIVERY';

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
            // If not mixing, they settle at the bottom
            transform: !isMixing ? `translate(${(id % 20 - 10) * 12}px, ${130 + (Math.floor(id/20) * -15)}px)` : undefined
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
    // Generate cinematic background
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "A premium 3D mechanical lottery machine set in a dark, high-end studio. Minimalist and elegant with soft blue accent lighting and realistic metallic textures. Photorealistic 8k render." }] },
                config: { imageConfig: { aspectRatio: "9:16" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setAiBackdrop(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {}
    };
    gen();

    // Sequence
    const startTimer = setTimeout(() => setPhase('SHUFFLE'), 500);
    const deliveryTimer = setTimeout(() => setPhase('DELIVERY'), 500 + SHUFFLE_TIME);
    const revealTimer = setTimeout(() => setPhase('REVEAL'), 500 + SHUFFLE_TIME + DELIVERY_TIME);

    return () => {
        clearTimeout(startTimer);
        clearTimeout(deliveryTimer);
        clearTimeout(revealTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] lottery-machine-viewport select-none">
      
      {/* AI Atmosphere */}
      {aiBackdrop && (
        <div className="absolute inset-0 z-0">
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-sm" alt="Backdrop" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        </div>
      )}

      {/* HEADER HUD */}
      <div className="absolute top-8 left-8 text-left z-50 opacity-80">
        <h2 className="text-white text-2xl font-black russo tracking-[0.2em] uppercase">{gameName}</h2>
        <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${phase === 'SHUFFLE' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {phase === 'SHUFFLE' ? 'Mixing Mechanism Active' : phase === 'DELIVERY' ? 'Extracting Final Node' : 'Verification Complete'}
            </p>
        </div>
      </div>

      {/* MECHANICAL CHAMBER */}
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
      </div>

      {/* DECORATIVE VIDEO UI */}
      <div className="side-buttons">
          <div className="mech-btn btn-blue">Reset</div>
          <div className="mech-btn btn-red">Draw</div>
      </div>

      {/* DELIVERY PATH OVERLAY (Visual only) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          <path 
            d="M 200 350 L 200 450 L 80 520 L 320 620 L 200 700 L 200 800" 
            stroke="white" strokeWidth="2" fill="none" strokeDasharray="10 10" 
          />
      </svg>

      {/* THE RESULT BOX */}
      <div className="result-display-box">
          {phase === 'REVEAL' ? (
              <span className="result-glow-text">{winningNumber}</span>
          ) : (
              <span className="opacity-10 text-3xl">--</span>
          )}
      </div>

      {/* CONTINUE BUTTON */}
      {phase === 'REVEAL' && (
        <div className="absolute bottom-4 animate-fade-in z-[100]">
            <button 
                onClick={onClose}
                className="bg-white text-black font-black px-10 py-3 rounded-full hover:bg-amber-500 transition-all uppercase tracking-[0.3em] text-[10px] shadow-2xl"
            >
                Confirm & Continue
            </button>
        </div>
      )}

      {/* STATUS FOOTER */}
      <div className="absolute bottom-4 left-4 opacity-30 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-white uppercase tracking-[0.5em]">Auth Stream: Encrypted</span>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;
