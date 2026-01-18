
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
            drone.frequency.setValueAtTime(55, this.ctx.currentTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.04, this.ctx.currentTime);
            drone.connect(g);
            g.connect(this.masterGain);
            drone.start();
        } catch (e) { console.error("Audio init failed", e); }
    }

    playClink() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 400, this.ctx.currentTime);
        g.gain.setValueAtTime(0.08, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playReveal() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1);
        g.gain.setValueAtTime(0.6, this.ctx.currentTime);
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
        const maxR = bowlRadius - ballSize - 15;
        
        const settleTheta = (Math.PI * 0.35) + (Math.random() * Math.PI * 0.3); 
        const settleDist = maxR * (0.6 + Math.random() * 0.4);
        
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
            duration: 0.6 + Math.random() * 0.6
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball-3d winner-ball-3d ${phase === 'EXITING' ? 'ball-realistic-delivery' : 'ball-hidden'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 1000 } as any}
            >
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
  const balls = useMemo(() => Array.from({ length: 70 }).map((_, i) => i), []);

  const INITIAL_DELAY = 4000; 
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
            
            // Sync audio with the ball hitting zigzag bends
            setTimeout(() => audioRef.current?.playClink(), 1000); // Gate entry
            setTimeout(() => audioRef.current?.playClink(), 1800); // First bend
            setTimeout(() => audioRef.current?.playClink(), 2600); // Terminal
            
            setTimeout(() => {
                setPhase('REVEAL');
                audioRef.current?.playReveal();
            }, 3500);
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
    <div className="fixed inset-0 z-[5000] bg-[#020617] flex flex-col items-center justify-center overflow-hidden">
      
      {/* ATMOSPHERIC ENVIRONMENT */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.5)_0%,_rgba(2,6,23,1)_100%)]"></div>
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.02] to-transparent"></div>

      {/* HEADER */}
      <div className="absolute top-10 text-center z-[60] w-full px-4 animate-fade-in">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-5 py-1 mb-4 backdrop-blur-md">
            <p className="text-pink-500 text-[9px] font-black uppercase tracking-[0.4em]">Live Mechanical Feed</p>
          </div>
          <h2 className="text-white text-4xl sm:text-7xl font-black russo tracking-tighter uppercase mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
              {gameName} <span className="text-pink-500">REALTIME</span>
          </h2>
          <div className="max-w-[320px] mx-auto">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                  <div className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full transition-all duration-300 linear shadow-[0_0_15px_#ec4899]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      {/* THE MACHINE ASSEMBLY */}
      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-4 w-full h-[600px] max-w-5xl px-6">
        
        {/* SHARED CONTAINER FOR PORT AND PIPE */}
        <div className="relative w-full h-full flex items-center justify-center">
            
            {/* 3D PORT UNIT */}
            <div className="relative shrink-0 w-[240px] h-[240px] sm:w-[360px] sm:h-[360px] rounded-full flex items-center justify-center">
                {/* Metallic Outer Rim */}
                <div className="absolute -inset-4 rounded-full border-[10px] border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)]"></div>
                <div className="absolute -inset-4 rounded-full border border-slate-700/50"></div>

                {/* Glass Chamber */}
                <div className="absolute inset-0 rounded-full bg-[#0f172a] shadow-[inset_0_20px_40px_rgba(0,0,0,0.9),inset_0_-10px_20px_rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="absolute inset-0 bg-radial-3d opacity-60"></div>
                    {/* Interior glares */}
                    <div className="absolute top-[10%] left-[20%] w-[30%] h-[20%] bg-gradient-to-b from-white/10 to-transparent rounded-full blur-xl rotate-[-25deg]"></div>
                    
                    {/* Restless Balls */}
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
                        {/* Winner Ball - Positioned here but will animate out */}
                        <Ball 
                            index={99} 
                            phase={phase} 
                            isWinner={true} 
                            winningNumber={winningNumber} 
                            bowlRadius={bowlRadius} 
                        />
                    </div>
                </div>

                {/* External Glass Reflection (realistic layer) */}
                <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.1] shadow-[inset_0_0_80px_rgba(255,255,255,0.05)]"></div>

                {/* EXIT GATE (At the "Head" - top right) */}
                <div className="absolute top-[5%] right-[5%] w-24 h-24 pointer-events-none z-30">
                     {/* The physical coupling to the pipe */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 border-4 border-slate-700 rounded-2xl rotate-45 shadow-2xl flex items-center justify-center">
                        <div className="w-10 h-10 bg-slate-950 rounded-full border border-white/5"></div>
                     </div>
                </div>
            </div>

            {/* VOLUMETRIC ZIGZAG PIPE (Beside the port, starts at head) */}
            <div className="absolute top-0 right-[-100px] sm:right-[50px] w-[200px] sm:w-[350px] h-full pointer-events-none z-20 translate-y-[-50px]">
                <svg className="w-full h-full drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="pipeGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                        </linearGradient>
                        <filter id="pipeGlow">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    
                    {/* Connection Tube from Head */}
                    <path 
                        d="M -50 150 Q 50 150 100 150 L 350 250 L 50 400 L 200 550" 
                        stroke="url(#pipeGlass)" 
                        strokeWidth="45" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                    />
                    {/* Interior Specular Highlight */}
                    <path 
                        d="M -50 150 Q 50 150 100 150 L 350 250 L 50 400 L 200 550" 
                        stroke="rgba(255,255,255,0.3)" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        filter="url(#pipeGlow)"
                    />
                    {/* Outlines */}
                    <path 
                        d="M -50 150 Q 50 150 100 150 L 350 250 L 50 400 L 200 550" 
                        stroke="rgba(255,255,255,0.1)" 
                        strokeWidth="48" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                    />
                </svg>
            </div>
        </div>
      </div>

      {/* FINAL DECLARATION OVERLAY */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in">
              <div className="relative animate-result-slam-3d mb-12">
                  <div className="absolute -inset-32 bg-pink-600/20 blur-[150px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-slate-950 rounded-[5rem] px-24 sm:px-48 py-14 sm:py-24 border-[16px] border-pink-500 shadow-[0_0_150px_rgba(236,72,153,0.5)]">
                      <span className="text-[12rem] sm:text-[22rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center px-6">
                  <h3 className="text-white text-4xl sm:text-6xl font-black russo tracking-tight uppercase mb-12 gold-shimmer">
                      SYSTEM <span className="text-pink-500">DECLARED</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-24 py-7 rounded-2xl transition-all active:scale-95 shadow-[0_20px_50px_rgba(236,72,153,0.4)] text-2xl uppercase tracking-widest"
                  >
                      Exit Protocol
                  </button>
              </div>
          </div>
      )}

      {/* SYNC INDICATOR */}
      <div className="absolute left-10 bottom-10 flex items-center gap-4 opacity-40">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-blue-400/50">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Mechanical Sync</span>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
