
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
    drone: OscillatorNode | null = null;

    init() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.5);

            this.drone = this.ctx.createOscillator();
            this.drone.type = 'sine';
            this.drone.frequency.setValueAtTime(55, this.ctx.currentTime);
            const droneGain = this.ctx.createGain();
            droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            this.drone.connect(droneGain);
            droneGain.connect(this.masterGain);
            this.drone.start();
        } catch (e) { console.error("Audio init failed", e); }
    }

    playClink() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 500, this.ctx.currentTime);
        g.gain.setValueAtTime(0.08, this.ctx.currentTime);
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
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 1);
        g.gain.setValueAtTime(0.6, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.2);
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
        const maxR = bowlRadius - ballSize - 12;
        
        // Settle at bottom with overlap prevention
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
                className={`lottery-ball winner-ball-3d ${phase === 'EXITING' ? 'ball-flow-down-zigzag' : 'ball-at-reveal-point'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 100 } as any}
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
  const balls = useMemo(() => Array.from({ length: 90 }).map((_, i) => i), []);

  const INITIAL_DELAY = 4000; 
  const SHUFFLE_DURATION = 45000;

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
            
            // Sounds matching tube corners
            setTimeout(() => audioRef.current?.playClink(), 600);
            setTimeout(() => audioRef.current?.playClink(), 1300);
            setTimeout(() => audioRef.current?.playClink(), 2100);

            setTimeout(() => {
                setPhase('REVEAL');
                audioRef.current?.playReveal();
            }, 3600);
        }
    }, 100);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        audioRef.current?.stop();
    };
  }, []);

  const bowlRadius = window.innerWidth < 640 ? 120 : 180;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden">
      
      {/* 3D ATMOSPHERIC HEADER */}
      <div className="absolute top-12 text-center z-[60] w-full px-4 animate-fade-in">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-4 py-1 mb-3">
            <p className="text-pink-500 text-[9px] font-black uppercase tracking-[0.4em]">Live Mechanical Verification</p>
          </div>
          <h2 className="text-white text-4xl sm:text-7xl font-black russo tracking-tighter uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              {gameName} <span className="text-pink-500">3D</span>
          </h2>
          <div className="max-w-[300px] mx-auto mt-6">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                  <div className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full transition-all duration-300 linear shadow-[0_0_15px_#ec4899]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      <div className="relative flex items-center justify-center w-full h-full">
        
        {/* 3D ZIGZAG TUBE - WRAPPING PORT */}
        <div className="absolute inset-0 pointer-events-none z-20">
            <svg className="w-full h-full" viewBox="0 0 500 800" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <filter id="tubeGlow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                    </linearGradient>
                </defs>
                
                {/* Main 3D Tube Body */}
                <path 
                    d="M 250 220 L 250 140 L 460 250 L 40 500 L 250 680 L 250 780" 
                    stroke="rgba(255,255,255,0.15)" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                
                {/* Inner Specular Highlight for 3D depth */}
                <path 
                    d="M 250 220 L 250 140 L 460 250 L 40 500 L 250 680 L 250 780" 
                    stroke="rgba(255,255,255,0.4)" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#tubeGlow)"
                />
            </svg>
        </div>

        {/* 3D SPHERICAL PORT CHAMBER */}
        <div className="relative w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] rounded-full flex items-center justify-center bg-black">
            {/* Outer Bezel */}
            <div className="absolute inset-0 rounded-full border-[6px] border-white/10 shadow-[0_0_40px_rgba(0,0,0,1),inset_0_0_60px_rgba(255,255,255,0.05)]"></div>
            
            {/* 3D Glass Surface effect */}
            <div className="absolute inset-2 rounded-full bg-radial-3d opacity-60"></div>
            
            {/* Glass Highlight */}
            <div className="absolute top-[15%] left-[15%] w-[40%] h-[40%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>

            {/* Internal Shadow for depth */}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_20px_40px_rgba(0,0,0,0.8),inset_0_-20px_40px_rgba(255,255,255,0.02)]"></div>

            {/* Balls - Restricted inside */}
            <div className="relative w-full h-full rounded-full overflow-hidden">
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
            </div>

            {/* Winning Ball Layer */}
            <Ball 
                index={parseInt(winningNumber) || 7} 
                phase={phase} 
                isWinner={true} 
                winningNumber={winningNumber} 
                bowlRadius={bowlRadius} 
            />

            {/* Physical Top Exit Node */}
            <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-20 h-4 bg-black border-x border-white/20 rounded-t-lg"></div>
        </div>

      </div>

      {/* REVEAL PANEL - 3D CLIMAX */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-6">
              <div className="relative animate-result-slam-3d mb-12">
                  <div className="absolute -inset-20 bg-pink-600/30 blur-[100px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-black rounded-[4rem] px-20 sm:px-32 py-10 sm:py-16 border-[12px] border-pink-500 shadow-[0_0_100px_rgba(236,72,153,0.6)]">
                      <span className="text-[10rem] sm:text-[18rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-4xl sm:text-6xl font-black russo tracking-tight uppercase mb-10 gold-shimmer">
                      WINNER <span className="text-pink-500">DECLARED</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-16 py-6 rounded-2xl transition-all active:scale-95 shadow-[0_15px_30px_rgba(236,72,153,0.3)] text-xl uppercase tracking-widest"
                  >
                      Complete Feed
                  </button>
              </div>
          </div>
      )}

      {/* RESET BUTTON STYLED AS 3D BUTTON */}
      <div className="absolute right-12 bottom-12 opacity-30 hover:opacity-100 transition-all cursor-pointer">
          <div className="w-16 h-16 bg-blue-600 rounded-full border-[4px] border-blue-400 shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_4px_4px_rgba(255,255,255,0.4)] flex items-center justify-center">
              <span className="text-[9px] font-black text-white uppercase tracking-tighter">Reset</span>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
