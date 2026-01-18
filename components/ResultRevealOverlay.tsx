
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const PHOTO_COLORS = ['#fbbf24', '#10b981', '#ec4899', '#3b82f6', '#f97316', '#ef4444'];

// --- CONTINUOUS AUDIO ENGINE ---
class DrawAudioEngine {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;
    drone: OscillatorNode | null = null;
    shimmer: OscillatorNode | null = null;

    init() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 1.5);

            // Deep Suspense Drone
            this.drone = this.ctx.createOscillator();
            this.drone.type = 'sine';
            this.drone.frequency.setValueAtTime(50, this.ctx.currentTime);
            const droneGain = this.ctx.createGain();
            droneGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            this.drone.connect(droneGain);
            droneGain.connect(this.masterGain);
            this.drone.start();

            // High Shimmer (Tension)
            this.shimmer = this.ctx.createOscillator();
            this.shimmer.type = 'sine';
            this.shimmer.frequency.setValueAtTime(440, this.ctx.currentTime);
            const shimGain = this.ctx.createGain();
            shimGain.gain.setValueAtTime(0, this.ctx.currentTime);
            shimGain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 5);
            this.shimmer.connect(shimGain);
            shimGain.connect(this.masterGain);
            this.shimmer.start();
        } catch (e) { console.error("Audio engine failed to ignite", e); }
    }

    startMechanicalAction() {
        if (!this.ctx || !this.masterGain) return;
        // White noise for air pressure
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, this.ctx.currentTime);
        
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1);
        
        noiseSource.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        noiseSource.start();
    }

    playRevealSlam() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.8);
        g.gain.setValueAtTime(0.6, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
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
        const ballSize = window.innerWidth < 640 ? 12 : 16;
        const maxR = bowlRadius - ballSize - 4;
        
        // Gravity settled at the bottom 1/4 of the circle
        const settleTheta = (Math.PI * 0.4) + (Math.random() * Math.PI * 0.2); 
        const settleDist = maxR * (0.6 + Math.random() * 0.4);
        
        // Path for shuffle
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
            duration: 0.6 + Math.random() * 0.4
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball winner-ball ${phase === 'EXITING' ? 'ball-pipe-ascent' : 'ball-at-terminal'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    return (
        <div 
            className={`lottery-ball ${phase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-static-pile'}`}
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
    
    // Shuffle starts after 4s
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
        audioRef.current?.startMechanicalAction();
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
                audioRef.current?.playRevealSlam();
            }, 3500);
        }
    }, 100);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        audioRef.current?.stop();
    };
  }, []);

  const bowlSize = window.innerWidth < 640 ? 140 : 220;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* HEADER - BROADCAST STYLE */}
      <div className="absolute top-10 sm:top-14 text-center z-50 animate-fade-in w-full px-6">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-4 backdrop-blur-sm">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_#ec4899]"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Live Declaration Protocol</span>
          </div>
          <h2 className="text-white text-4xl sm:text-6xl font-black russo tracking-tighter uppercase mb-4 drop-shadow-2xl">
              {gameName} <span className="text-pink-500">EXCHANGE</span>
          </h2>
          
          <div className="max-w-xs mx-auto">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all duration-300 linear" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between mt-2">
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{phase}</span>
                   <span className="text-[8px] font-bold text-pink-500 font-mono">{Math.floor(progress)}%</span>
              </div>
          </div>
      </div>

      <div className="relative w-full h-full flex flex-col items-center justify-center pt-20">
        
        {/* ZIGZAG PIPE - NOW ON TOP */}
        <div className="relative w-[300px] sm:w-[500px] h-[160px] sm:h-[220px] mb-[-2px] z-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 500 200" fill="none" preserveAspectRatio="xMidYMax meet">
                <path 
                    d="M 250 200 L 250 170 L 400 120 L 100 60 L 250 20" 
                    stroke="rgba(255,255,255,0.4)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>

        {/* CHAMBER (PORT) - POSITIONED LOWER */}
        <div className="relative w-[280px] h-[280px] sm:w-[440px] sm:h-[440px] border-[2px] border-white/60 rounded-full flex items-center justify-center bg-black/40">
            {/* Visual highlight on circle */}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_rgba(255,255,255,0.05)] pointer-events-none"></div>
            
            {/* All Shuffling Balls */}
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

            {/* Winning Ball Logic */}
            <Ball 
                index={parseInt(winningNumber) || 0} 
                phase={phase} 
                isWinner={true} 
                winningNumber={winningNumber} 
                bowlRadius={bowlSize} 
            />

            {/* Opening at the top for the pipe entry */}
            <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-16 h-2 bg-black"></div>
        </div>
      </div>

      {/* FINAL TERMINAL REVEAL OVERLAY */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in">
              <div className="relative animate-result-slam mb-12">
                  <div className="absolute -inset-10 bg-pink-500/20 blur-3xl rounded-full"></div>
                  <div className="relative bg-white text-black rounded-[3rem] px-16 sm:px-24 py-8 sm:py-12 border-[10px] border-pink-500 shadow-[0_0_80px_rgba(236,72,153,0.5)]">
                      <span className="text-9xl sm:text-[15rem] font-black russo tracking-tighter leading-none block">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center animate-fade-in-up">
                  <h3 className="text-white text-3xl sm:text-5xl font-black russo tracking-tight uppercase mb-8">
                      DRAW <span className="text-pink-500">AUTHENTICATED</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-12 py-5 rounded-2xl transition-all active:scale-95 shadow-2xl shadow-pink-900/40 text-lg uppercase tracking-widest"
                  >
                      Close Sequence
                  </button>
              </div>
          </div>
      )}

      {/* PHOTO STYLE RESET BUTTON UI (FOR VISUALS) */}
      <div className="absolute right-8 bottom-8 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-14 h-14 bg-blue-600 rounded-full border-4 border-blue-400 shadow-xl flex items-center justify-center">
              <span className="text-[8px] font-black text-white uppercase">Reset</span>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
