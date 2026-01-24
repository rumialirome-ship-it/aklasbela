
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

const SHUFFLE_TIME = 15000; // 15 seconds of cinematic mixing
const EXIT_TIME = 5000;    // 5 seconds for the long pipe travel

class DrawAudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.playMechanicalWhir();
    } catch (e) { console.error("Audio initialization failed", e); }
  }

  playMechanicalWhir() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(35, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + SHUFFLE_TIME / 1000);
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 3);
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
    osc.frequency.setValueAtTime(25, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.6);
    g.gain.setValueAtTime(1.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);
    osc.connect(g);
    g.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 2.5);
  }

  stop() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1);
      setTimeout(() => this.ctx?.close(), 1100);
    }
  }
}

const Ball: React.FC<{ index: number; phase: Phase; isWinner: boolean; winningNumber: string; chamberSize: number }> = React.memo(({ index, phase, isWinner, winningNumber, chamberSize }) => {
  const color = useMemo(() => RAINBOW_COLORS[index % RAINBOW_COLORS.length], [index]);
  const displayNum = isWinner ? winningNumber : index.toString().padStart(2, '0');
  
  const motion = useMemo(() => {
    const R = (chamberSize / 2) - 45;
    const path = Array.from({ length: 4 }).map(() => {
        const r = Math.sqrt(Math.random()) * R;
        const a = Math.random() * Math.PI * 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
    return {
        delay: Math.random() * -20,
        duration: 0.15 + Math.random() * 0.35,
        path
    };
  }, [chamberSize]);

  if (isWinner && phase === 'EXITING') {
      return (
        <div 
          className="lottery-ball-3d ball-mechanical-pipe-descent winner-ball-3d" 
          style={{ 
            '--ball-color': '#f59e0b',
            '--chamber-radius': `${chamberSize / 2}px`,
            zIndex: 1000
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
            '--x4': `${motion.path[3].x}px`, '--y4': `${motion.path[3].y}px`,
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
  const chamberSize = Math.min(window.innerWidth * 0.95, 540);
  const ballRange = useMemo(() => Array.from({ length: 100 }, (_, i) => i), []);

  useEffect(() => {
    audio.current = new DrawAudioEngine();
    audio.current.init();

    const exitTimer = setTimeout(() => setPhase('EXITING'), SHUFFLE_TIME);
    const revealTimer = setTimeout(() => {
        setPhase('REVEAL');
        audio.current?.playImpact();
    }, SHUFFLE_TIME + EXIT_TIME);

    // AI Backdrop generation using user's specific high-detail 3D prompts
    const generateBackdrop = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `A highly detailed 3D render of a glossy spherical ball materializing in a minimal blue-gray studio. Soft directional light creates realistic reflections and subtle shadows on a polished floor. Final shot of a ball resting on a softly illuminated pedestal, ambient lighting fading to black, high-detail reflections and a minimalist background. Cinematic low-angle, 8k resolution, photorealistic.`;
            
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: "16:9" } }
            });
            for (const p of resp.candidates[0].content.parts) {
                if (p.inlineData) setRevealImage(`data:image/png;base64,${p.inlineData.data}`);
            }
        } catch (e) {
            console.error("Backdrop generation failed", e);
        }
    };
    generateBackdrop();

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
        <div className="absolute top-10 text-center animate-fade-in z-50 px-4 w-full">
            <h2 className="text-white text-5xl sm:text-8xl font-black russo tracking-[0.25em] uppercase mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                {gameName} <span className="text-amber-500">LIVE</span>
            </h2>
            <div className="flex items-center justify-center gap-10">
                <div className="w-24 h-[2px] bg-amber-500/50"></div>
                <p className="text-amber-500 text-[12px] font-black uppercase tracking-[1em] animate-pulse">
                    {phase === 'SHUFFLE' ? 'CORE STABILIZATION' : 'REVEALING OUTCOME'}
                </p>
                <div className="w-24 h-[2px] bg-amber-500/50"></div>
            </div>
        </div>
      )}

      {/* MECHANICAL ENGINE CORE */}
      <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1500 ${phase === 'REVEAL' ? 'opacity-0 scale-150 blur-xl' : 'opacity-100'}`}>
        
        {/* THE MAIN CHAMBER */}
        <div className="relative z-20" style={{ width: chamberSize, height: chamberSize }}>
            {/* Industrial Exterior Housing */}
            <div className="absolute -inset-14 border-[32px] border-slate-900 rounded-full shadow-[0_120px_240px_rgba(0,0,0,1),inset_0_4px_24px_rgba(255,255,255,0.1)] bg-slate-950/90" />
            
            {/* Primary Glass Vessel - Perfectly Centered */}
            <div className="absolute inset-0 bg-slate-900/30 rounded-full border-2 border-white/10 overflow-hidden backdrop-blur-xl shadow-[inset_0_40px_100px_rgba(0,0,0,1)]">
                <div className="absolute inset-0 bg-radial-3d opacity-30" />
                <div className="relative w-full h-full">
                    {ballRange.map(i => (
                        <Ball key={i} index={i} phase={phase} isWinner={false} winningNumber={winningNumber} chamberSize={chamberSize} />
                    ))}
                    {/* The specific Winning Ball to descent from center port */}
                    <Ball index={777} phase={phase} isWinner winningNumber={winningNumber} chamberSize={chamberSize} />
                </div>
            </div>

            {/* Bottom Port Housing (The Exit) */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-24 bg-slate-800 rounded-t-[4rem] border-x-[12px] border-t-[12px] border-slate-700 z-30 flex items-center justify-center shadow-[0_40px_80px_rgba(0,0,0,1)]">
                <div className="w-32 h-16 bg-black rounded-full shadow-inner border-2 border-white/10" />
            </div>
        </div>

        {/* THE LONG CENTERED ZIG-ZAG PIPE VISUAL */}
        <div className="absolute z-10 pointer-events-none opacity-60" style={{ top: `calc(50% + ${chamberSize / 2}px - 20px)`, width: '450px', height: '800px' }}>
            <svg className="w-full h-full" viewBox="0 0 450 800" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                   <linearGradient id="mechanicalPipeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
                   </linearGradient>
                   <filter id="mechanicalPipeGlow"><feGaussianBlur stdDeviation="20" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                </defs>
                {/* Visual rendering of the "Long" zig-zag descent pipe */}
                <path 
                    d="M 225 0 L 225 100 L 105 200 L 345 320 L 125 440 L 225 540 L 225 800" 
                    stroke="url(#mechanicalPipeGrad)" 
                    strokeWidth="110" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#mechanicalPipeGlow)"
                />
                <path 
                    d="M 225 0 L 225 100 L 105 200 L 345 320 L 125 440 L 225 540 L 225 800" 
                    stroke="white" 
                    strokeWidth="2" 
                    opacity="0.2" 
                    strokeDasharray="30 60" 
                />
                <g transform="translate(225, 750)">
                   <circle r="120" fill="rgba(2,6,23,0.9)" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                   <circle r="80" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="2" className="animate-pulse" />
                </g>
            </svg>
        </div>
      </div>

      {/* FINAL CINEMATIC REVEAL SCREEN */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center animate-fade-in p-6 z-[100] overflow-hidden">
            {/* AI Background based on User prompts */}
            {revealImage && (
                <div className="absolute inset-0 z-0">
                    <img src={revealImage} className="w-full h-full object-cover opacity-35 blur-sm scale-105" alt="Cinematic Winner Backdrop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950" />
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            )}

            <div className="relative z-10 animate-result-slam-3d text-center w-full max-w-6xl">
                <p className="text-amber-500 font-black russo text-4xl sm:text-9xl tracking-[0.5em] mb-20 uppercase italic drop-shadow-[0_0_60px_rgba(245,158,11,0.8)] premium-gold-text">AUTHENTIC WINNER</p>
                
                <div className="glass-panel rounded-[8rem] sm:rounded-[12rem] px-24 py-28 sm:px-72 sm:py-64 border-[24px] sm:border-[54px] border-amber-500 shadow-[0_0_400px_rgba(245,158,11,0.6)] relative overflow-hidden backdrop-blur-3xl premium-glow-amber">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-50"></div>
                    <span className="relative text-[20rem] sm:text-[48rem] font-black russo text-white leading-none drop-shadow-[0_60px_120px_rgba(0,0,0,1)] gold-shimmer block">{winningNumber}</span>
                </div>

                <div className="mt-32">
                    <button 
                        onClick={onClose}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-28 py-12 sm:px-52 sm:py-16 rounded-full text-5xl sm:text-8xl uppercase tracking-[0.7em] transition-all active:scale-95 shadow-[0_50px_100px_rgba(0,0,0,1)] border-b-[20px] border-amber-800 hover:border-b-[10px] hover:translate-y-[10px] russo"
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SYSTEM STATUS BAR */}
      <div className="absolute bottom-12 left-12 opacity-40 flex items-center gap-6">
        <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_30px_#10b981]" />
        <span className="text-[14px] font-black text-white uppercase tracking-[0.8em]">MECHANICAL PIPELINE: SECURE & VERIFIED</span>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;