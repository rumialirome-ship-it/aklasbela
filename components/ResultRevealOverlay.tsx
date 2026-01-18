
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const PHOTO_COLORS = ['#fbbf24', '#10b981', '#ec4899', '#3b82f6', '#f97316', '#ef4444'];

class DrawAudioEngine {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;

    init() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.5);
            
            const drone = this.ctx.createOscillator();
            drone.type = 'sine';
            drone.frequency.setValueAtTime(40, this.ctx.currentTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.05, this.ctx.currentTime);
            drone.connect(g);
            g.connect(this.masterGain);
            drone.start();
        } catch (e) { console.error("Audio init failed", e); }
    }

    playMechanical() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(20 + Math.random() * 10, this.ctx.currentTime);
        g.gain.setValueAtTime(0.02, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playClink() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600 + Math.random() * 400, this.ctx.currentTime);
        g.gain.setValueAtTime(0.12, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playReveal() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.5);
        g.gain.setValueAtTime(0.4, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    }

    stop() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
            setTimeout(() => this.ctx?.close(), 1100);
        }
    }
}

const Ball: React.FC<{ 
    index: number; 
    phase: 'STATIC' | 'SHUFFLE' | 'EXITING' | 'REVEAL'; 
    isWinner: boolean; 
    winningNumber: string; 
    bowlRadius: number;
}> = ({ index, phase, isWinner, winningNumber, bowlRadius }) => {
    const color = useMemo(() => PHOTO_COLORS[index % PHOTO_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    const physics = useMemo(() => {
        const ballSize = window.innerWidth < 640 ? 12 : 16;
        const maxR = bowlRadius - ballSize - 10;
        
        const settleTheta = (Math.PI * 0.35) + (Math.random() * Math.PI * 0.3); 
        const settleDist = maxR * (0.5 + Math.random() * 0.4);
        
        const path = Array.from({ length: 4 }).map(() => {
            const r = Math.sqrt(Math.random()) * maxR;
            const t = Math.random() * 2 * Math.PI;
            return { x: r * Math.cos(t), y: r * Math.sin(t) };
        });

        return {
            sx: settleDist * Math.cos(settleTheta),
            sy: settleDist * Math.sin(settleTheta),
            path,
            delay: Math.random() * -5,
            duration: 0.5 + Math.random() * 0.5
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball-3d winner-ball-3d ${phase === 'EXITING' ? 'ball-mechanical-delivery' : 'ball-hidden'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 2000 } as any}
            >
                <div className="ball-glow"></div>
                <span className="ball-text-3d">{winningNumber}</span>
            </div>
        );
    }

    const currentPhase = phase === 'REVEAL' ? 'STATIC' : phase;

    return (
        <div 
            className={`lottery-ball-3d ${currentPhase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-static-pile'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${physics.delay}s`,
                '--duration': `${physics.duration}s`,
                '--x1': `${physics.path[0]?.x || 0}px`, '--y1': `${physics.path[0]?.y || 0}px`,
                '--x2': `${physics.path[1]?.x || 0}px`, '--y2': `${physics.path[1]?.y || 0}px`,
                '--x3': `${physics.path[2]?.x || 0}px`, '--y3': `${physics.path[2]?.y || 0}px`,
                left: `calc(50% + ${physics.sx}px)`,
                top: `calc(50% + ${physics.sy}px)`,
            } as any}
        >
            <span className="ball-text-3d">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STATIC' | 'SHUFFLE' | 'EXITING' | 'REVEAL'>('STATIC');
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<DrawAudioEngine | null>(null);
  const balls = useMemo(() => Array.from({ length: 75 }).map((_, i) => i), []);

  const INITIAL_DELAY = 3500; 
  const SHUFFLE_DURATION = 40000;

  useEffect(() => {
    audioRef.current = new DrawAudioEngine();
    audioRef.current.init();

    const startTime = Date.now();
    
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
    }, INITIAL_DELAY);

    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < INITIAL_DELAY) return;

        const p = Math.min(((elapsed - INITIAL_DELAY) / SHUFFLE_DURATION) * 100, 100);
        setProgress(p);
        
        if (p >= 100) {
            clearInterval(progressInterval);
            setPhase('EXITING');
            
            // Choreographed audio triggers
            setTimeout(() => audioRef.current?.playClink(), 800);   // Enters Gate
            setTimeout(() => audioRef.current?.playClink(), 1600);  // Corner 1
            setTimeout(() => audioRef.current?.playClink(), 2400);  // Corner 2
            setTimeout(() => audioRef.current?.playClink(), 3200);  // Corner 3
            
            setTimeout(() => {
                setPhase('REVEAL');
                audioRef.current?.playReveal();
            }, 4200);
        }
    }, 100);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        audioRef.current?.stop();
    };
  }, []);

  const bowlRadius = window.innerWidth < 640 ? 110 : 160;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* 3D ATMOSPHERIC LAYERS */}
      <div className="absolute inset-0 bg-[#020617] opacity-100"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.4)_0%,_rgba(2,6,23,1)_100%)]"></div>
      
      {/* HEADER HUD */}
      <div className="absolute top-10 text-center z-[60] w-full px-4 animate-fade-in">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-6 py-1.5 mb-5 backdrop-blur-xl">
            <p className="text-pink-500 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Live Draw Sequential Protocol</p>
          </div>
          <h2 className="text-white text-4xl sm:text-7xl font-black russo tracking-tighter uppercase mb-5 drop-shadow-[0_15px_30px_rgba(0,0,0,1)]">
              {gameName} <span className="text-pink-500">X-Draw</span>
          </h2>
          <div className="max-w-[340px] mx-auto">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                  <div className="h-full bg-gradient-to-r from-pink-700 via-pink-500 to-pink-400 rounded-full transition-all duration-300 linear shadow-[0_0_20px_#ec4899]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      <div className="relative flex flex-col sm:flex-row items-center justify-center w-full h-full max-w-6xl px-4 gap-0 pointer-events-none">
        
        {/* MECHANICAL PORT UNIT (LEFT) */}
        <div className="relative shrink-0 w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] rounded-full flex items-center justify-center">
            {/* 3D Metallic Bezel */}
            <div className="absolute -inset-6 rounded-full border-[12px] border-slate-900 shadow-[0_30px_60px_rgba(0,0,0,1),inset_0_2px_4px_rgba(255,255,255,0.1)]"></div>
            <div className="absolute -inset-6 rounded-full border border-slate-700/30"></div>

            {/* Glass Vacuum Chamber */}
            <div className="absolute inset-0 rounded-full bg-[#0c1222] shadow-[inset_0_30px_60px_rgba(0,0,0,0.95),inset_0_-20px_40px_rgba(255,255,255,0.03)] overflow-hidden">
                <div className="absolute inset-0 bg-radial-3d opacity-60"></div>
                
                {/* Internal Refraction Spots */}
                <div className="absolute top-[15%] left-[15%] w-[35%] h-[25%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl rotate-[-20deg]"></div>
                
                {/* Balls - Restricted inside */}
                <div className="relative w-full h-full">
                    {balls.map(i => (
                        <Ball 
                            key={i} 
                            index={i} 
                            phase={phase} 
                            isWinner={false} 
                            winningNumber={winningNumber} 
                            bowlRadius={bowlRadius} 
                        />
                    ))}
                    {/* The Hidden Winning Ball (Before it launches) */}
                    <Ball 
                        index={parseInt(winningNumber) || 99} 
                        phase={phase} 
                        isWinner={true} 
                        winningNumber={winningNumber} 
                        bowlRadius={bowlRadius} 
                    />
                </div>
            </div>

            {/* Front Surface Refraction Layer */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>

            {/* THE HEAD / EXIT JUNCTION (Top-Right coupling) */}
            <div className="absolute top-[5%] right-[5%] w-24 h-24 z-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 border-[6px] border-slate-700 rounded-3xl rotate-45 shadow-[0_15px_30px_rgba(0,0,0,0.8)] flex items-center justify-center">
                    <div className="w-10 h-10 bg-black rounded-full border border-white/10 inner-shadow"></div>
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-pink-600 rounded-full animate-pulse opacity-50 blur-lg"></div>
            </div>
        </div>

        {/* VOLUMETRIC ZIGZAG DELIVERY PIPE (BESIDE PORT) */}
        <div className="relative w-[180px] sm:w-[320px] h-[400px] sm:h-[600px] z-20 translate-y-[-40px] sm:translate-x-[40px]">
            <svg className="w-full h-full drop-shadow-[0_25px_40px_rgba(0,0,0,0.8)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="pipeMetal" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                    </linearGradient>
                    <filter id="volumetricGlow">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* 3D Glass Tube Outer Case */}
                <path 
                    d="M -20 120 L 80 120 L 280 250 L 50 420 L 200 580" 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="54" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
                
                {/* 3D Glass Tube Inner Channel */}
                <path 
                    d="M -20 120 L 80 120 L 280 250 L 50 420 L 200 580" 
                    stroke="url(#pipeMetal)" 
                    strokeWidth="42" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {/* Specular Edge Highlight */}
                <path 
                    d="M -20 120 L 80 120 L 280 250 L 50 420 L 200 580" 
                    stroke="rgba(255,255,255,0.25)" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#volumetricGlow)"
                />

                {/* Final Terminal Socket */}
                <circle cx="200" cy="580" r="40" fill="#0c1222" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle cx="200" cy="580" r="25" fill="rgba(236,72,153,0.1)" stroke="rgba(236,72,153,0.4)" strokeWidth="1" className="animate-pulse" />
            </svg>
        </div>

      </div>

      {/* FINAL DECLARATION SCREEN (CLIMAX) */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-slate-950/99 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
              <div className="relative animate-result-slam-3d mb-14">
                  <div className="absolute -inset-36 bg-pink-600/30 blur-[180px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-slate-950 rounded-[6rem] px-28 sm:px-56 py-16 sm:py-28 border-[18px] border-pink-500 shadow-[0_0_200px_rgba(236,72,153,0.6)] overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-slate-100/5 to-transparent"></div>
                      <span className="relative text-[14rem] sm:text-[24rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-5xl sm:text-7xl font-black russo tracking-tight uppercase mb-14 gold-shimmer">
                      SYSTEM <span className="text-pink-500">AUTHENTICATED</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-24 py-8 rounded-[2rem] transition-all active:scale-95 shadow-[0_25px_60px_rgba(236,72,153,0.4)] text-2xl uppercase tracking-[0.2em] border-b-8 border-pink-800"
                  >
                      Close Sequence
                  </button>
              </div>
          </div>
      )}

      {/* MECHANICAL SYNC STATUS */}
      <div className="absolute right-12 bottom-12 flex items-center gap-6 opacity-30 hover:opacity-100 transition-all duration-500 cursor-default">
          <div className="text-right">
              <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-1">Mech Status</p>
              <p className="text-[12px] font-bold text-blue-400 font-mono">ENCRYPTED_FEED_0x{winningNumber || '??'}</p>
          </div>
          <div className="w-16 h-16 bg-blue-600 rounded-full border-[4px] border-blue-400 shadow-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
