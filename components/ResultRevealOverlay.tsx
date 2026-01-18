
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
        const maxR = bowlRadius - ballSize - 12;
        
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
                className={`lottery-ball-3d winner-ball-3d ${phase === 'EXITING' ? 'ball-exit-to-side-pipe' : 'ball-at-reveal-point'}`}
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
  const balls = useMemo(() => Array.from({ length: 80 }).map((_, i) => i), []);

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
            
            // Sounds matching tube transitions
            setTimeout(() => audioRef.current?.playClink(), 800);
            setTimeout(() => audioRef.current?.playClink(), 1600);
            setTimeout(() => audioRef.current?.playClink(), 2400);

            setTimeout(() => {
                setPhase('REVEAL');
                audioRef.current?.playReveal();
            }, 3800);
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
      
      {/* 3D HEADER */}
      <div className="absolute top-10 text-center z-[60] w-full px-4 animate-fade-in">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-5 py-1 mb-4">
            <p className="text-pink-500 text-[9px] font-black uppercase tracking-[0.4em]">Live Verification Terminal</p>
          </div>
          <h2 className="text-white text-4xl sm:text-6xl font-black russo tracking-tighter uppercase mb-4">
              {gameName} <span className="text-pink-500">EXCHANGE</span>
          </h2>
          <div className="max-w-[280px] mx-auto">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                  <div className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full transition-all duration-300 linear shadow-[0_0_15px_#ec4899]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      <div className="relative flex flex-col sm:flex-row items-center justify-center w-full h-full max-w-6xl px-10 gap-10">
        
        {/* LEFT SIDE: THE PORT */}
        <div className="relative shrink-0 w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] rounded-full flex items-center justify-center bg-black">
            {/* Outer Bezel */}
            <div className="absolute inset-0 rounded-full border-[8px] border-white/10 shadow-[0_0_50px_rgba(0,0,0,1),inset_0_0_80px_rgba(255,255,255,0.05)]"></div>
            
            {/* Glass Surface */}
            <div className="absolute inset-2 rounded-full bg-radial-3d opacity-70"></div>
            
            {/* Glass Highlight */}
            <div className="absolute top-[12%] left-[12%] w-[45%] h-[45%] bg-gradient-to-br from-white/15 to-transparent rounded-full blur-2xl"></div>

            {/* Balls Container */}
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

            {/* Winner Ball Layer */}
            <Ball 
                index={parseInt(winningNumber) || 7} 
                phase={phase} 
                isWinner={true} 
                winningNumber={winningNumber} 
                bowlRadius={bowlRadius} 
            />

            {/* Physical Exit Gate (Top Right) */}
            <div className="absolute top-[10%] right-[10%] w-16 h-16 bg-black border-2 border-white/20 rounded-2xl rotate-45 flex items-center justify-center overflow-hidden">
                <div className="w-10 h-10 border border-white/5 rounded-full bg-white/5 blur-sm animate-pulse"></div>
            </div>
        </div>

        {/* RIGHT SIDE: THE DELIVERY PIPE (BESIDE PORT) */}
        <div className="relative w-[150px] sm:w-[250px] h-[400px] sm:h-[600px] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 250 600" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <filter id="tubeGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* 3D Translucent Pipe Body */}
                <path 
                    d="M 10 50 L 100 50 L 100 150 L 230 250 L 20 400 L 125 550" 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="40" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                
                {/* spec Highlight */}
                <path 
                    d="M 10 50 L 100 50 L 100 150 L 230 250 L 20 400 L 125 550" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#tubeGlow)"
                />

                {/* Terminal Terminal Node at the end */}
                <circle cx="125" cy="550" r="30" fill="rgba(236,72,153,0.1)" stroke="rgba(236,72,153,0.3)" strokeWidth="1" />
            </svg>
        </div>

      </div>

      {/* FINAL REVEAL OVERLAY */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-6">
              <div className="relative animate-result-slam-3d mb-12">
                  <div className="absolute -inset-24 bg-pink-600/30 blur-[120px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-black rounded-[4rem] px-24 sm:px-40 py-12 sm:py-20 border-[14px] border-pink-500 shadow-[0_0_120px_rgba(236,72,153,0.7)]">
                      <span className="text-[12rem] sm:text-[20rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-4xl sm:text-6xl font-black russo tracking-tight uppercase mb-12 gold-shimmer">
                      DRAW <span className="text-pink-500">AUTHENTICATED</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-20 py-7 rounded-2xl transition-all active:scale-95 shadow-[0_20px_40px_rgba(236,72,153,0.4)] text-xl uppercase tracking-widest"
                  >
                      Close Protocol
                  </button>
              </div>
          </div>
      )}

      {/* 3D RESET UI */}
      <div className="absolute left-12 bottom-12 opacity-20 hover:opacity-100 transition-all cursor-pointer">
          <div className="w-14 h-14 bg-blue-600 rounded-full border-[3px] border-blue-400 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <span className="text-[8px] font-black text-white uppercase tracking-tighter">Sync</span>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
