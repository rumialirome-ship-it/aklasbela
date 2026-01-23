
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'SHUFFLE' | 'EXITING' | 'REVEAL';

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

const SHUFFLE_TIME = 12000; // 12 seconds of intense mixing
const EXIT_TIME = 4500;    // 4.5 seconds for ball to travel pipe

class DrawAudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.playTension();
    } catch (e) { console.error(e); }
  }

  playTension() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + SHUFFLE_TIME / 1000);
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 2);
    osc.connect(g);
    g.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + (SHUFFLE_TIME + EXIT_TIME) / 1000);
  }

  playImpact() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.5);
    g.gain.setValueAtTime(1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    osc.connect(g);
    g.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  stop() {
    this.ctx?.close();
  }
}

const Ball: React.FC<{ index: number; phase: Phase; isWinner: boolean; winningNumber: string; chamberSize: number }> = React.memo(({ index, phase, isWinner, winningNumber, chamberSize }) => {
  const color = useMemo(() => RAINBOW_COLORS[index % RAINBOW_COLORS.length], [index]);
  const displayNum = isWinner ? winningNumber : index.toString().padStart(2, '0');
  
  const motion = useMemo(() => {
    const R = chamberSize / 2 - 30;
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -15,
        duration: 0.3 + Math.random() * 0.5,
        path
    };
  }, [chamberSize]);

  if (isWinner && phase === 'EXITING') {
      return (
        <div className="lottery-ball-3d ball-mechanical-pipe-descent winner-ball-3d" style={{ '--ball-color': '#f59e0b' } as any}>
            <span className="ball-text-3d">{winningNumber}</span>
        </div>
      );
  }

  // Hide all balls once reveal hits
  if (phase === 'REVEAL') return null;

  return (
    <div 
        className="lottery-ball-3d ball-shuffling"
        style={{
            '--ball-color': color,
            '--delay': `${motion.delay}s`,
            '--duration': `${motion.duration}s`,
            '--x1': `${motion.path[0].x}px`, '--y1': `${motion.path[0].y}px`,
            '--x2': `${motion.path[1].x}px`, '--y2': `${motion.path[1].y}px`,
            '--x3': `${motion.path[2].x}px`, '--y3': `${motion.path[2].y}px`,
        } as any}
    >
        <span className="ball-text-3d">{displayNum}</span>
    </div>
  );
});

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<Phase>('SHUFFLE');
  const [revealImage, setRevealImage] = useState<string | null>(null);
  const audio = useRef<DrawAudioEngine | null>(null);
  const chamberSize = Math.min(window.innerWidth * 0.8, 500);
  const ballRange = useMemo(() => Array.from({ length: 100 }, (_, i) => i), []);

  useEffect(() => {
    audio.current = new DrawAudioEngine();
    audio.current.init();

    const exitTimer = setTimeout(() => setPhase('EXITING'), SHUFFLE_TIME);
    const revealTimer = setTimeout(() => {
        setPhase('REVEAL');
        audio.current?.playImpact();
    }, SHUFFLE_TIME + EXIT_TIME);

    // AI Backdrop generation for the big reveal
    const gen = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: "A highly detailed cinematic 3D render of a luminous floating pedestal in a futuristic minimal studio with soft directional lighting and metallic textures." }] },
                config: { imageConfig: { aspectRatio: "16:9" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setRevealImage(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {}
    };
    gen();

    return () => {
        clearTimeout(exitTimer);
        clearTimeout(revealTimer);
        audio.current?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col items-center justify-center select-none">
      
      {/* HUD HEADER */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 text-center animate-fade-in z-50">
            <h2 className="text-white text-5xl font-black russo tracking-[0.2em] uppercase mb-2 drop-shadow-2xl">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <p className="text-amber-500/60 text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                {phase === 'SHUFFLE' ? 'Mixing Positions...' : 'Finalizing Draw...'}
            </p>
        </div>
      )}

      {/* MECHANICAL CORE */}
      <div className={`relative w-full h-full flex items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150' : 'opacity-100'}`}>
        
        {/* THE CHAMBER (Matching the video) */}
        <div className="relative z-20" style={{ width: chamberSize, height: chamberSize }}>
            {/* Outer Frame */}
            <div className="absolute -inset-10 border-[20px] border-slate-900 rounded-full shadow-[0_50px_100px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(255,255,255,0.1)]" />
            
            {/* Glass Container */}
            <div className="absolute inset-0 bg-slate-900/40 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm shadow-[inset_0_20px_50px_rgba(0,0,0,0.9)]">
                <div className="absolute inset-0 bg-radial-3d opacity-60" />
                <div className="relative w-full h-full">
                    {ballRange.map(i => (
                        <Ball key={i} index={i} phase={phase} isWinner={false} winningNumber={winningNumber} chamberSize={chamberSize} />
                    ))}
                    <Ball index={999} phase={phase} isWinner winningNumber={winningNumber} chamberSize={chamberSize} />
                </div>
            </div>

            {/* Bottom Port Exit */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-24 h-12 bg-slate-800 rounded-t-3xl border-x-4 border-t-4 border-slate-700 z-30 flex items-center justify-center">
                <div className="w-12 h-6 bg-black rounded-full shadow-inner" />
            </div>
        </div>

        {/* DELIVERY PIPE (SVG Path matching CSS animation) */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-40">
            <svg className="w-full h-full" viewBox="0 0 1000 1000" fill="none">
                <path d="M 500 650 L 500 750 L 400 800 L 650 850 L 500 950" stroke="white" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
      </div>

      {/* BIG REVEAL */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center animate-fade-in p-6">
            {revealImage && (
                <div className="absolute inset-0 z-0">
                    <img src={revealImage} className="w-full h-full object-cover opacity-30 blur-md scale-110" alt="Backdrop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950" />
                </div>
            )}

            <div className="relative z-10 animate-result-slam-3d text-center">
                <p className="text-amber-500 font-black russo text-4xl sm:text-6xl tracking-widest mb-10 uppercase italic drop-shadow-2xl">Official Winner</p>
                
                <div className="glass-panel rounded-[5rem] px-24 py-20 sm:px-64 sm:py-48 border-[20px] border-amber-500 shadow-[0_0_200px_rgba(245,158,11,0.3)]">
                    <span className="text-[18rem] sm:text-[40rem] font-black russo text-white leading-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] gold-shimmer">{winningNumber}</span>
                </div>

                <div className="mt-20">
                    <button 
                        onClick={onClose}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-24 py-10 rounded-full text-4xl uppercase tracking-[0.4em] transition-all active:scale-95 shadow-2xl border-b-8 border-amber-800"
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FOOTER VERIFICATION */}
      <div className="absolute bottom-10 left-10 opacity-30 flex items-center gap-3">
        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Mechanical Sync: Authenticated</span>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;