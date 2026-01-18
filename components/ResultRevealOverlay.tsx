
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const PHOTO_COLORS = ['#fbbf24', '#10b981', '#ec4899', '#3b82f6', '#f97316', '#ef4444'];

// --- AUDIO ENGINE ---
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
            this.drone.frequency.setValueAtTime(50, this.ctx.currentTime);
            const droneGain = this.ctx.createGain();
            droneGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            this.drone.connect(droneGain);
            droneGain.connect(this.masterGain);
            this.drone.start();
        } catch (e) { console.error("Audio init failed", e); }
    }

    startMechanical() {
        if (!this.ctx || !this.masterGain) return;
        const noise = this.ctx.createOscillator();
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(45, this.ctx.currentTime);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, this.ctx.currentTime);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 1);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        noise.start();
    }

    playReveal() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.6);
        g.gain.setValueAtTime(0.4, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
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
    bowlRadius: number 
}> = ({ index, phase, isWinner, winningNumber, bowlRadius }) => {
    const color = useMemo(() => PHOTO_COLORS[index % PHOTO_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    const physics = useMemo(() => {
        // Safe radius to keep balls inside the border
        const ballRadiusSize = window.innerWidth < 640 ? 12 : 16;
        const maxR = bowlRadius - ballRadiusSize - 10;
        
        // Random bottom pile for static phase
        const settleTheta = (Math.PI * 0.35) + (Math.random() * Math.PI * 0.3); 
        const settleDist = maxR * (0.6 + Math.random() * 0.4);
        
        // Random path points for shuffle
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
            duration: 0.6 + Math.random() * 0.5
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball winner-ball ${phase === 'EXITING' ? 'ball-flow-down' : 'ball-at-bottom'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    const currentPhase = phase === 'REVEAL' && !isWinner ? 'STATIC' : phase;

    return (
        <div 
            className={`lottery-ball ${currentPhase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-static-pile'}`}
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
    
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
        audioRef.current?.startMechanical();
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
                audioRef.current?.playReveal();
            }, 3000);
        }
    }, 100);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        audioRef.current?.stop();
    };
  }, []);

  const bowlRadius = window.innerWidth < 640 ? 140 : 220;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-between overflow-hidden py-10">
      
      {/* HEADER */}
      <div className="text-center z-50 animate-fade-in w-full px-6">
          <p className="text-pink-500 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Authenticated Feed</p>
          <h2 className="text-white text-3xl sm:text-5xl font-black russo tracking-tighter uppercase mb-4">
              {gameName} <span className="text-white/20">LIVE</span>
          </h2>
          <div className="max-w-[200px] mx-auto">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-300 linear" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      {/* THE MACHINE PORT - CENTERED */}
      <div className="relative flex-grow flex items-center justify-center w-full">
        
        <div className="relative w-[280px] h-[280px] sm:w-[440px] sm:h-[440px] border-[1px] border-white/30 rounded-full flex items-center justify-center bg-black/50">
            {/* Balls Shuffling */}
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

            {/* Winning Ball */}
            <Ball 
                index={parseInt(winningNumber) || 0} 
                phase={phase} 
                isWinner={true} 
                winningNumber={winningNumber} 
                bowlRadius={bowlRadius} 
            />

            {/* EXIT AT TOP */}
            <div className="absolute top-[-1px] left-1/2 -translate-x-1/2 w-20 h-2 bg-black"></div>
        </div>

        {/* ZIGZAG PIPE - BELOW AND WRAPPING */}
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[400px] pointer-events-none z-10 translate-y-[20px]">
            <svg className="w-full h-full" viewBox="0 0 500 400" fill="none">
                <path 
                    d="M 250 -220 L 250 -250 L 480 -150 L 20 -50 L 250 50 L 250 150" 
                    stroke="rgba(255,255,255,0.4)" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
      </div>

      {/* BOTTOM RESULT AREA */}
      <div className="w-full h-40 flex flex-col items-center justify-center z-50">
          <div className="mb-4 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Draw Result</span>
              <div className="text-6xl sm:text-8xl font-black russo text-white tracking-tighter mt-1">
                  {phase === 'REVEAL' ? winningNumber : '--'}
              </div>
          </div>

          {phase === 'REVEAL' && (
              <button 
                  onClick={onClose}
                  className="bg-white text-black font-black px-10 py-3 rounded-full text-xs uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all transform active:scale-95"
              >
                  Close Result
              </button>
          )}
      </div>

      {/* RESET BUTTON VISUAL (MATCHING PHOTO) */}
      <div className="absolute right-10 bottom-40 opacity-40">
          <div className="w-16 h-16 bg-blue-600 rounded-full border-4 border-blue-400 flex flex-col items-center justify-center shadow-2xl">
              <span className="text-[8px] font-black text-white uppercase">Reset</span>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
