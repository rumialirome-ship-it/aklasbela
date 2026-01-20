
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const RAINBOW_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#fbbf24', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
];

class DrawAudioEngine {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;
    drone: OscillatorNode | null = null;
    noise: ScriptProcessorNode | null = null;

    init() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1.5);
            
            // Continuous Shuffling Machine Drone
            this.drone = this.ctx.createOscillator();
            this.drone.type = 'triangle';
            this.drone.frequency.setValueAtTime(45, this.ctx.currentTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.12, this.ctx.currentTime);
            this.drone.connect(g);
            g.connect(this.masterGain);
            this.drone.start();

            // Friction / Rolling Mechanical Noise
            const bufferSize = 4096;
            this.noise = this.ctx.createScriptProcessor(bufferSize, 1, 1);
            this.noise.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.02;
                }
            };
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, this.ctx.currentTime);
            this.noise.connect(filter);
            filter.connect(this.masterGain);

        } catch (e) { console.error("Audio engine failed", e); }
    }

    playClink() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 600, this.ctx.currentTime);
        g.gain.setValueAtTime(0.25, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playSlam() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.5);
        g.gain.setValueAtTime(0.9, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.0);
    }

    stop() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
            setTimeout(() => {
                if (this.drone) this.drone.stop();
                this.ctx?.close();
            }, 900);
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
    const color = useMemo(() => RAINBOW_COLORS[index % RAINBOW_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    const physics = useMemo(() => {
        const ballSize = window.innerWidth < 640 ? 12 : 16;
        const maxR = bowlRadius - ballSize - 10;
        
        // Grid layout for static state
        const itemsPerRow = 10;
        const col = index % itemsPerRow;
        const row = Math.floor(index / itemsPerRow);
        const gx = (col - itemsPerRow/2) * (ballSize * 2.1);
        const gy = (row - 3.5) * (ballSize * 2.1);

        // Path points for chaotic shuffle
        const path = Array.from({ length: 6 }).map(() => {
            const r = Math.sqrt(Math.random()) * maxR;
            const t = Math.random() * 2 * Math.PI;
            return { x: r * Math.cos(t), y: r * Math.sin(t) };
        });

        return {
            gx, gy,
            path,
            delay: Math.random() * -10,
            duration: 0.35 + Math.random() * 0.4
        };
    }, [bowlRadius, index]);

    // The Winning Ball handles its own EXITING phase
    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball-3d winner-ball-3d ${phase === 'EXITING' ? 'ball-mechanical-pipe-descent' : 'ball-hidden'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 4000 } as any}
            >
                <div className="ball-glow"></div>
                <span className="ball-text-3d">{winningNumber}</span>
            </div>
        );
    }

    const currentPhase = (phase === 'REVEAL' || phase === 'EXITING') ? 'STATIC' : phase;

    return (
        <div 
            className={`lottery-ball-3d ${currentPhase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-grid-static'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${physics.delay}s`,
                '--duration': `${physics.duration}s`,
                '--x1': `${physics.path[0]?.x || 0}px`, '--y1': `${physics.path[0]?.y || 0}px`,
                '--x2': `${physics.path[1]?.x || 0}px`, '--y2': `${physics.path[1]?.y || 0}px`,
                '--x3': `${physics.path[2]?.x || 0}px`, '--y3': `${physics.path[2]?.y || 0}px`,
                '--x4': `${physics.path[3]?.x || 0}px`, '--y4': `${physics.path[3]?.y || 0}px`,
                '--grid-x': `${physics.gx}px`,
                '--grid-y': `${physics.gy}px`,
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
  const balls = useMemo(() => Array.from({ length: 99 }).map((_, i) => i), []);

  const SHUFFLE_DURATION = 40000; // 40 seconds of shuffle
  const EXIT_DURATION = 5000;    // 5 seconds of pipe travel

  useEffect(() => {
    audioRef.current = new DrawAudioEngine();
    audioRef.current.init();

    const startTime = Date.now();
    
    // Auto start shuffle
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
    }, 1000);

    const sequenceInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (phase === 'SHUFFLE') {
            const p = Math.min((elapsed / SHUFFLE_DURATION) * 100, 100);
            setProgress(p);
            
            if (p >= 100) {
                setPhase('EXITING');
                // Play audio clinks for specific mechanical interaction points
                setTimeout(() => audioRef.current?.playClink(), 800);   // Port Exit
                setTimeout(() => audioRef.current?.playClink(), 1800);  // Pipe Bend 1
                setTimeout(() => audioRef.current?.playClink(), 3000);  // Pipe Bend 2
                setTimeout(() => audioRef.current?.playClink(), 4200);  // Terminal Hit
            }
        }

        if (phase === 'EXITING' && (elapsed >= (SHUFFLE_DURATION + EXIT_DURATION))) {
            setPhase('REVEAL');
            audioRef.current?.playSlam();
            clearInterval(sequenceInterval);
        }
    }, 50);

    return () => {
        clearTimeout(startTimer);
        clearInterval(sequenceInterval);
        audioRef.current?.stop();
    };
  }, [phase]);

  const bowlRadius = window.innerWidth < 640 ? 140 : 180;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* 45S TOTAL DRAW HUD */}
      {phase !== 'REVEAL' && (
          <div className="absolute top-10 text-center z-[60] animate-fade-in px-6">
              <h2 className="text-white text-3xl sm:text-4xl font-black russo tracking-[0.2em] uppercase mb-4">
                  {gameName} <span className="text-amber-500">Live</span>
              </h2>
              <div className="w-64 sm:w-80 h-1.5 bg-white/10 mx-auto rounded-full overflow-hidden p-[1px]">
                  <div className="h-full bg-amber-500 transition-all duration-300 linear shadow-[0_0_15px_#f59e0b]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      )}

      {/* THE MECHANICAL ENGINE */}
      <div className="relative flex flex-col items-center justify-center w-full h-full pointer-events-none">
        
        {/* CIRCULAR PORT (MACHINE) */}
        <div className="relative w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] z-20">
            {/* The Outer Frame / Bezel */}
            <div className="absolute -inset-4 rounded-full border-[10px] border-slate-900 shadow-[0_40px_80px_rgba(0,0,0,1),inset_0_2px_4px_rgba(255,255,255,0.1)]"></div>
            
            {/* Glass Vacuum Chamber */}
            <div className="absolute inset-0 rounded-full bg-[#020617] shadow-[inset_0_30px_60px_rgba(0,0,0,0.95),inset_0_-20px_40px_rgba(255,255,255,0.02)] overflow-hidden border border-white/5">
                <div className="absolute inset-0 bg-radial-3d opacity-90"></div>
                <div className="absolute top-[10%] left-[25%] w-[35%] h-[25%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl rotate-[-15deg]"></div>
                
                {/* Balls Inside the Port */}
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

            {/* EXIT JUNCTION (Bottom-Left Port) */}
            <div className="absolute bottom-[2%] left-[10%] w-24 h-24 z-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 border-[5px] border-slate-700 rounded-2xl rotate-45 shadow-2xl flex items-center justify-center">
                    <div className="w-10 h-10 bg-black rounded-full border border-white/10"></div>
                </div>
            </div>
        </div>

        {/* PHYSICAL DELIVERY PIPE (Joined to bottom-left) */}
        <div className="relative w-[220px] sm:w-[380px] h-[500px] sm:h-[700px] z-10 translate-y-[-50px] sm:translate-y-[-80px] sm:translate-x-[-120px]">
            <svg className="w-full h-full drop-shadow-[0_40px_60px_rgba(0,0,0,0.9)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="pipeMetalGloss" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
                    </linearGradient>
                    <filter id="pipeGlowBloom">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* 3D Glass Tube Case */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="64" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
                
                {/* Internal Channel */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="url(#pipeMetalGloss)" 
                    strokeWidth="48" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {/* Reflection Highlight */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="rgba(255,255,255,0.2)" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#pipeGlowBloom)"
                />

                {/* Final Socket */}
                <g transform="translate(200, 550)">
                    <circle r="50" fill="#0f172a" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                    <circle r="30" fill="rgba(245,158,11,0.05)" stroke="rgba(245,158,11,0.4)" strokeWidth="1" className="animate-pulse" />
                </g>
            </svg>
        </div>

      </div>

      {/* CLIMAX REVEAL (HIDDEN UNTIL END) */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
              <div className="relative animate-result-slam-3d mb-16">
                  <div className="absolute -inset-48 bg-amber-500/20 blur-[200px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-slate-950 rounded-[6rem] px-32 sm:px-64 py-24 sm:py-36 border-[20px] border-amber-500 shadow-[0_0_250px_rgba(245,158,11,0.6)] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-100/10 to-transparent"></div>
                      <span className="relative text-[18rem] sm:text-[32rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-5xl sm:text-8xl font-black russo tracking-tight uppercase mb-16 premium-gold-text">
                      DRAW <span className="text-amber-500">COMPLETE</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black px-24 py-8 rounded-[2.5rem] transition-all active:scale-95 shadow-[0_30px_70px_rgba(245,158,11,0.4)] text-3xl uppercase tracking-[0.2em] border-b-[12px] border-amber-800"
                  >
                      Close Draw
                  </button>
              </div>
          </div>
      )}

      {/* STATUS HUD */}
      <div className="absolute right-12 bottom-12 flex items-center gap-6 opacity-30">
          <div className="text-right">
              <p className="text-[10px] font-black text-white uppercase tracking-[0.5em] mb-1">Mechanical Feed</p>
              <p className="text-[14px] font-bold text-amber-500 font-mono tracking-tighter uppercase">Sync_Protocol_Active_{winningNumber}</p>
          </div>
          <div className="w-16 h-16 bg-slate-800 rounded-full border-[6px] border-slate-700 shadow-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
