
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
            this.masterGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1);

            // Continuous Draw Drone
            this.drone = this.ctx.createOscillator();
            this.drone.type = 'sine';
            this.drone.frequency.setValueAtTime(60, this.ctx.currentTime);
            const droneGain = this.ctx.createGain();
            droneGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            this.drone.connect(droneGain);
            droneGain.connect(this.masterGain);
            this.drone.start();
        } catch (e) { console.error("Audio init failed", e); }
    }

    playMechanicalHum() {
        if (!this.ctx || !this.masterGain) return;
        const noise = this.ctx.createOscillator();
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(40, this.ctx.currentTime);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.ctx.currentTime);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        noise.start();
    }

    playImpact() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
        g.gain.setValueAtTime(0.4, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    stop() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            setTimeout(() => this.ctx?.close(), 600);
        }
    }
}

const Ball: React.FC<{ 
    index: number; 
    phase: 'STATIC' | 'SHUFFLE' | 'EXITING' | 'REVEAL'; 
    isWinner: boolean; 
    winningNumber: string; 
    bowlRadius: number 
}> = ({ index, phase, isWinner, winningNumber, bowlRadius }) => {
    const color = useMemo(() => PHOTO_COLORS[index % PHOTO_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    const physics = useMemo(() => {
        const ballSize = window.innerWidth < 640 ? 10 : 14;
        const maxR = bowlRadius - ballSize - 5;
        
        // Static Pile: Concentrated at bottom arc
        const settleAngle = (Math.PI * 0.3) + (Math.random() * Math.PI * 0.4); 
        const settleDist = maxR * (0.6 + Math.random() * 0.4);
        
        // Shuffle Path
        const path = Array.from({ length: 4 }).map(() => {
            const r = Math.sqrt(Math.random()) * maxR;
            const t = Math.random() * 2 * Math.PI;
            return { x: r * Math.cos(t), y: r * Math.sin(t) };
        });

        return {
            sx: settleDist * Math.cos(settleAngle),
            sy: settleDist * Math.sin(settleAngle),
            path,
            delay: Math.random() * -5,
            duration: 0.7 + Math.random() * 0.5
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball winner-ball ${phase === 'EXITING' ? 'ball-pipe-zigzag' : 'ball-at-reveal-box'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    return (
        <div 
            className={`lottery-ball ${phase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-settled'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${physics.delay}s`,
                '--duration': `${physics.duration}s`,
                '--x1': `${physics.path[0].x}px`, '--y1': `${physics.path[0].y}px`,
                '--x2': `${physics.path[1].x}px`, '--y2': `${physics.path[1].y}px`,
                '--x3': `${physics.path[2].x}px`, '--y3': `${physics.path[2].y}px`,
                left: `calc(50% + ${physics.sx}px)`,
                top: `calc(50% + ${physics.sy}px)`,
            } as any}
        >
            <span className="ball-text">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STATIC' | 'SHUFFLE' | 'EXITING' | 'REVEAL'>('STATIC');
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<DrawAudioEngine | null>(null);
  const balls = useMemo(() => Array.from({ length: 99 }).map((_, i) => i), []);

  const INITIAL_DELAY = 4000; 
  const SHUFFLE_DURATION = 45000;

  useEffect(() => {
    audioRef.current = new DrawAudioEngine();
    audioRef.current.init();

    const startTime = Date.now();
    
    // Engine start after 4s
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
        audioRef.current?.playMechanicalHum();
    }, INITIAL_DELAY);

    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < INITIAL_DELAY) return;

        const p = Math.min(((elapsed - INITIAL_DELAY) / SHUFFLE_DURATION) * 100, 100);
        setProgress(p);
        
        if (p >= 100) {
            clearInterval(progressInterval);
            setPhase('EXITING');
            setTimeout(() => {
                setPhase('REVEAL');
                audioRef.current?.playImpact();
            }, 3000);
        }
    }, 100);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        audioRef.current?.stop();
    };
  }, []);

  const bowlSize = window.innerWidth < 640 ? 150 : 250;

  return (
    <div className="fixed inset-0 z-[3000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="absolute top-8 text-center animate-fade-in z-50">
          <p className="text-pink-500 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Syncing Live Draw</p>
          <h2 className="text-white text-3xl sm:text-5xl font-black russo tracking-tighter uppercase">{gameName}</h2>
          <div className="mt-4 w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-pink-500 transition-all duration-300 linear" style={{ width: `${progress}%` }} />
          </div>
      </div>

      {/* THE MACHINE - MATCHING PHOTO */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        
        {/* Main Port Chamber */}
        <div className="relative w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] border-[1px] border-white/40 rounded-full flex items-center justify-center">
            
            {/* Shuffling Balls */}
            {balls.map(i => (
                <Ball 
                    key={i} 
                    index={i} 
                    phase={phase} 
                    isWinner={false} 
                    winningNumber={winningNumber} 
                    bowlRadius={bowlSize} 
                />
            ))}

            {/* Winning Ball (always present, but changes behavior) */}
            <Ball 
                index={parseInt(winningNumber) || 77} 
                phase={phase} 
                isWinner={true} 
                winningNumber={winningNumber} 
                bowlRadius={bowlSize} 
            />

            {/* Entry Opening at Top */}
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-20 h-[1px] bg-black"></div>
        </div>

        {/* ZIGZAG DELIVERY PIPE - MATCHING PHOTO */}
        <div className="relative w-[300px] sm:w-[500px] h-[150px] sm:h-[250px] -mt-1 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 500 250" fill="none">
                {/* zig zag lines */}
                <path 
                    d="M 250 0 L 250 30 L 10 100 L 490 200 L 250 250" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="2" 
                />
            </svg>
        </div>

        {/* REVEAL TERMINAL BOX - BOTTOM */}
        <div className="absolute bottom-0 w-full h-24 sm:h-32 bg-black border-t border-white/10 flex items-center justify-center gap-12">
            <div className="flex flex-col items-center">
                 <p className="text-white text-5xl sm:text-7xl font-black russo tracking-tighter">
                     {phase === 'REVEAL' ? winningNumber : '--'}
                 </p>
            </div>

            {phase === 'REVEAL' && (
                <button 
                    onClick={onClose}
                    className="bg-white text-black font-black px-8 py-3 rounded-full text-xs uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all transform active:scale-95"
                >
                    Confirm Result
                </button>
            )}
        </div>

      </div>

      {/* PHOTO STYLE RESET BUTTON OVERLAY (UI ONLY) */}
      <div className="absolute right-10 bottom-40 hidden sm:block">
           <div className="w-16 h-16 rounded-full bg-blue-600 border-4 border-blue-400 shadow-[inset_0_4px_10px_rgba(255,255,255,0.5),0_10px_20px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer">
               <span className="text-[10px] font-black text-white uppercase">Reset</span>
           </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
