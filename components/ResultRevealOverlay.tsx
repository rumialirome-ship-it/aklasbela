
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

const SHUFFLE_TIME = 10000; // 10 seconds of mixing
const EXIT_TIME = 4500;    // 4.5 seconds for pipe travel

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
    osc.frequency.exponentialRampToValueAtTime(65, this.ctx.currentTime + SHUFFLE_TIME / 1000);
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
    osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.5);
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
    const R = chamberSize / 2 - 35;
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -15,
        duration: 0.25 + Math.random() * 0.4,
        path
    };
  }, [chamberSize]);

  if (isWinner && phase === 'EXITING') {
      return (
        <div 
          className="lottery-ball-3d ball-mechanical-pipe-descent winner-ball-3d" 
          style={{ 
            '--ball-color': '#f59e0b',
            '--chamber-radius': `${chamberSize / 2}px` 
          } as any}
        >
            <span className="ball-text-3d">{winningNumber}</span>
        </div>
      );
  }

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
  const chamberSize = Math.min(window.innerWidth * 0.85, 500);
  const ballRange = useMemo(() => Array.from({ length: 100 }, (_, i) => i), []);

  useEffect(() => {
    audio.current = new DrawAudioEngine();
    audio.current.init();

    const exitTimer = setTimeout(() => setPhase('EXITING'), SHUFFLE_TIME);
    const revealTimer = setTimeout(() => {
        setPhase('REVEAL');
        audio.current?.playImpact();
    }, SHUFFLE_TIME + EXIT_TIME);

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
        <div className="absolute top-10 text-center animate-fade-in z-50 px-4">
            <h2 className="text-white text-4xl sm:text-6xl font-black russo tracking-[0.2em] uppercase mb-2 drop-shadow-2xl">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-[2px] bg-amber-500/30"></div>
                <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">
                    {phase === 'SHUFFLE' ? 'SYST MIXING' : 'DRAW FINALIZING'}
                </p>
                <div className="w-12 h-[2px] bg-amber-500/30"></div>
            </div>
        </div>
      )}

      {/* MECHANICAL CORE */}
      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150' : 'opacity-100'}`}>
        
        {/* THE CHAMBER */}
        <div className="relative z-20" style={{ width: chamberSize, height: chamberSize }}>
            {/* Outer Machine Frame */}
            <div className="absolute -inset-10 border-[16px] sm:border-[24px] border-slate-900 rounded-full shadow-[0_60px_120px_rgba(0,0,0,0.9),inset_0_4px_12px_rgba(255,255,255,0.1)] bg-slate-950" />
            
            {/* Glass Container - Perfectly Centered Content */}
            <div className="absolute inset-0 bg-slate-900/40 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm shadow-[inset_0_20px_60px_rgba(0,0,0,0.9)]">
                <div className="absolute inset-0 bg-radial-3d opacity-50" />
                <div className="relative w-full h-full">
                    {ballRange.map(i => (
                        <Ball key={i} index={i} phase={phase} isWinner={false} winningNumber={winningNumber} chamberSize={chamberSize} />
                    ))}
                    {/* The specific Winning Ball */}
                    <Ball index={999} phase={phase} isWinner winningNumber={winningNumber} chamberSize={chamberSize} />
                </div>
            </div>

            {/* Bottom Port Exit (The "Port") */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-16 bg-slate-800 rounded-t-[2.5rem] border-x-4 border-t-4 border-slate-700 z-30 flex items-center justify-center shadow-2xl">
                <div className="w-16 h-8 bg-black rounded-full shadow-inner border border-white/5" />
            </div>
        </div>

        {/* LONG DELIVERY PIPE (Zig-zag path visually matching the animation) */}
        <div className="absolute z-10 pointer-events-none opacity-40" style={{ top: `calc(50% + ${chamberSize / 2}px - 20px)`, width: '400px', height: '500px' }}>
            <svg className="w-full h-full" viewBox="0 0 400 500" fill="none">
                <defs>
                   <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                   </linearGradient>
                </defs>
                {/* The "Long" zig-zag pipe */}
                <path d="M 200 0 L 200 60 L 120 120 L 320 200 L 200 300 L 200 500" stroke="url(#pipeGrad)" strokeWidth="85" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 200 0 L 200 60 L 120 120 L 320 200 L 200 300 L 200 500" stroke="white" strokeWidth="2" opacity="0.3" strokeDasharray="10 20" />
            </svg>
        </div>
      </div>

      {/* BIG REVEAL SCREEN */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center animate-fade-in p-6 z-[100]">
            {revealImage && (
                <div className="absolute inset-0 z-0">
                    <img src={revealImage} className="w-full h-full object-cover opacity-30 blur-md scale-110" alt="Backdrop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950" />
                </div>
            )}

            <div className="relative z-10 animate-result-slam-3d text-center w-full max-w-4xl">
                <p className="text-amber-500 font-black russo text-3xl sm:text-6xl tracking-[0.3em] mb-12 uppercase italic drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">Official Winner</p>
                
                <div className="glass-panel rounded-[4rem] sm:rounded-[6rem] px-16 py-20 sm:px-48 sm:py-40 border-[16px] sm:border-[30px] border-amber-500 shadow-[0_0_250px_rgba(245,158,11,0.4)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30"></div>
                    <span className="relative text-[16rem] sm:text-[36rem] font-black russo text-white leading-none drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)] gold-shimmer block">{winningNumber}</span>
                </div>

                <div className="mt-24">
                    <button 
                        onClick={onClose}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-20 py-8 sm:px-32 sm:py-10 rounded-full text-3xl sm:text-5xl uppercase tracking-[0.5em] transition-all active:scale-90 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-b-[12px] border-amber-800 hover:border-b-[8px] hover:translate-y-[4px]"
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FOOTER STATUS */}
      <div className="absolute bottom-10 left-10 opacity-30 flex items-center gap-4">
        <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]" />
        <span className="text-[11px] font-black text-white uppercase tracking-[0.5em]">SYNC STATUS: ENCRYPTED & VERIFIED</span>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;