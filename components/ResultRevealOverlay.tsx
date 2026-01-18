
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
        osc.frequency.setValueAtTime(1500 + Math.random() * 500, this.ctx.currentTime);
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
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
        g.gain.setValueAtTime(0.5, this.ctx.currentTime);
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
    isOutside?: boolean;
}> = ({ index, phase, isWinner, winningNumber, bowlRadius, isOutside = false }) => {
    const color = useMemo(() => PHOTO_COLORS[index % PHOTO_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    const physics = useMemo(() => {
        const ballSize = window.innerWidth < 640 ? 11 : 14;
        const maxR = bowlRadius - ballSize - 10;
        
        if (isOutside) {
            const angle = Math.random() * Math.PI * 2;
            const dist = bowlRadius + 40 + Math.random() * 60;
            return {
                sx: dist * Math.cos(angle),
                sy: dist * Math.sin(angle),
                path: [],
                delay: 0,
                duration: 0
            };
        }

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
            duration: 0.6 + Math.random() * 0.5
        };
    }, [bowlRadius, isOutside]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball winner-ball ${phase === 'EXITING' ? 'ball-flow-down-zigzag' : 'ball-at-reveal-point'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    const currentPhase = (phase === 'REVEAL' || isOutside) ? 'STATIC' : phase;

    return (
        <div 
            className={`lottery-ball ${currentPhase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-static-pile'}`}
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
            <span className="ball-text">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STATIC' | 'SHUFFLE' | 'EXITING' | 'REVEAL'>('STATIC');
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<DrawAudioEngine | null>(null);
  
  const insideBalls = useMemo(() => Array.from({ length: 85 }).map((_, i) => i), []);
  const outsideBalls = useMemo(() => Array.from({ length: 15 }).map((_, i) => i + 100), []);

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
            
            // Sound effects for hitting the zigzag corners
            setTimeout(() => audioRef.current?.playClink(), 500);
            setTimeout(() => audioRef.current?.playClink(), 1200);
            setTimeout(() => audioRef.current?.playClink(), 2000);

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

  const bowlRadius = window.innerWidth < 640 ? 130 : 200;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden">
      
      {/* HEADER INFO */}
      <div className="absolute top-10 text-center z-[60] w-full px-4 animate-fade-in">
          <p className="text-pink-500 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Authenticated Sequence</p>
          <h2 className="text-white text-3xl sm:text-6xl font-black russo tracking-tighter uppercase drop-shadow-2xl">
              {gameName} <span className="text-white/20">XCH</span>
          </h2>
          <div className="max-w-[250px] mx-auto mt-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-300 linear shadow-[0_0_10px_#ec4899]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      {/* THE MACHINE - MATCHING PHOTO */}
      <div className="relative flex items-center justify-center w-full h-[600px] sm:h-[800px]">
        
        {/* ZIGZAG PIPE - NOW STARTS AT TOP AND GOES DOWN */}
        <div className="absolute inset-0 pointer-events-none z-10">
            <svg className="w-full h-full" viewBox="0 0 500 800" fill="none" preserveAspectRatio="xMidYMid meet">
                {/* Visual Pipe Outline */}
                <path 
                    d="M 250 200 L 250 150 L 480 250 L 20 500 L 250 650 L 250 750" 
                    stroke="rgba(255,255,255,0.25)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>

        {/* PORT CHAMBER */}
        <div className="relative w-[260px] h-[260px] sm:w-[400px] sm:h-[400px] border-[1px] border-white/40 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
            
            {/* Inside Balls */}
            {insideBalls.map(i => (
                <Ball 
                    key={i} 
                    index={i} 
                    phase={phase} 
                    isWinner={false} 
                    winningNumber={winningNumber} 
                    bowlRadius={bowlRadius} 
                />
            ))}

            {/* Winner Ball (Initially inside, then exits top) */}
            <Ball 
                index={parseInt(winningNumber) || 0} 
                phase={phase} 
                isWinner={true} 
                winningNumber={winningNumber} 
                bowlRadius={bowlRadius} 
            />

            {/* EXIT AT TOP */}
            <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-16 h-3 bg-black"></div>
        </div>

        {/* Outside Decorative Balls */}
        {outsideBalls.map(i => (
             <Ball 
                key={i}
                index={i}
                phase={phase}
                isWinner={false}
                winningNumber={winningNumber}
                bowlRadius={bowlRadius}
                isOutside={true}
             />
        ))}

      </div>

      {/* BOTTOM REVEAL AREA */}
      <div className="absolute bottom-10 w-full flex flex-col items-center justify-center z-[100]">
           <div className="relative bg-black border border-white/10 rounded-3xl p-6 px-12 min-w-[200px] text-center shadow-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Declared Winner</span>
                <div className="text-7xl sm:text-9xl font-black russo text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    {phase === 'REVEAL' ? winningNumber : '--'}
                </div>
           </div>

           {phase === 'REVEAL' && (
               <button 
                   onClick={onClose}
                   className="mt-8 bg-pink-600 hover:bg-pink-500 text-white font-black px-12 py-4 rounded-2xl text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-xl shadow-pink-900/40"
               >
                   Confirm & Return
               </button>
           )}
      </div>

      {/* PHOTO STYLE RESET BUTTON UI */}
      <div className="absolute right-8 bottom-40 opacity-40 hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 bg-blue-600 rounded-full border-4 border-blue-400 flex flex-col items-center justify-center shadow-2xl">
              <span className="text-[8px] font-black text-white uppercase">Reset</span>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
