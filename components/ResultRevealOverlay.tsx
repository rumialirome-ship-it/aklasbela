
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
            this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 2);
            
            // Low rumble machine drone
            this.drone = this.ctx.createOscillator();
            this.drone.type = 'triangle';
            this.drone.frequency.setValueAtTime(42, this.ctx.currentTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1, this.ctx.currentTime);
            this.drone.connect(g);
            g.connect(this.masterGain);
            this.drone.start();

            // Friction / Rolling Noise
            const bufferSize = 4096;
            this.noise = this.ctx.createScriptProcessor(bufferSize, 1, 1);
            this.noise.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.015;
                }
            };
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(250, this.ctx.currentTime);
            this.noise.connect(filter);
            filter.connect(this.masterGain);

        } catch (e) { console.error("Audio engine failed", e); }
    }

    playClink() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, this.ctx.currentTime);
        g.gain.setValueAtTime(0.2, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSlam() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.8);
        g.gain.setValueAtTime(0.8, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.9);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.9);
    }

    stop() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
            setTimeout(() => {
                if (this.drone) this.drone.stop();
                this.ctx?.close();
            }, 1100);
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
        
        // Initial Cluster at the bottom of the circular port
        const angle = (index / 99) * Math.PI * 0.8 + (Math.PI * 0.1);
        const clusterR = maxR * (0.6 + Math.random() * 0.4);
        const gx = clusterR * Math.cos(angle + Math.PI / 2); // Spread across bottom arc
        const gy = clusterR * Math.sin(angle + Math.PI / 2);

        // Chaotic Pathing
        const path = Array.from({ length: 8 }).map(() => {
            const r = Math.sqrt(Math.random()) * maxR;
            const t = Math.random() * 2 * Math.PI;
            return { x: r * Math.cos(t), y: r * Math.sin(t) };
        });

        return {
            gx, gy,
            path,
            delay: Math.random() * -10,
            duration: 0.4 + Math.random() * 0.3,
            slowDuration: 1.5 + Math.random() * 1.0
        };
    }, [bowlRadius, index]);

    // Handle winning ball special path
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

    // Remaining balls during exit phase keep reanimating slightly
    const currentPhase = (phase === 'EXITING') ? 'SHUFFLE' : phase;
    const animDuration = (phase === 'EXITING') ? physics.slowDuration : physics.duration;

    return (
        <div 
            className={`lottery-ball-3d ${currentPhase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-grid-static'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${physics.delay}s`,
                '--duration': `${animDuration}s`,
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

  const SHUFFLE_DURATION = 40000; 
  const EXIT_DURATION = 5000;    

  useEffect(() => {
    audioRef.current = new DrawAudioEngine();
    audioRef.current.init();

    const startTime = Date.now();
    
    // All balls clearly resting at start
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
    }, 2000);

    const sequenceInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (phase === 'SHUFFLE') {
            const p = Math.min((elapsed / SHUFFLE_DURATION) * 100, 100);
            setProgress(p);
            
            if (p >= 100) {
                setPhase('EXITING');
                // Mechanical interaction audio
                setTimeout(() => audioRef.current?.playClink(), 800);   
                setTimeout(() => audioRef.current?.playClink(), 2500);  
                setTimeout(() => audioRef.current?.playClink(), 4200);  
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
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* 45S TOTAL DRAW HUD */}
      {phase !== 'REVEAL' && (
          <div className="absolute top-10 text-center z-[60] animate-fade-in px-6">
              <h2 className="text-white text-3xl sm:text-4xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                  {gameName} <span className="text-amber-500">Live</span>
              </h2>
              <div className="w-64 sm:w-80 h-1.5 bg-white/10 mx-auto rounded-full overflow-hidden p-[1px]">
                  <div className="h-full bg-amber-500 transition-all duration-300 linear shadow-[0_0_15px_#f59e0b]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      )}

      {/* MECHANICAL CHAMBER & PIPE ENGINE */}
      <div className="relative flex flex-col items-center justify-center w-full h-full pointer-events-none">
        
        {/* CIRCULAR PORT (TRANSPARENT GLASS CHAMBER) */}
        <div className="relative w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] z-20">
            {/* The Heavy Bezel */}
            <div className="absolute -inset-6 rounded-full border-[12px] border-slate-900 shadow-[0_50px_100px_rgba(0,0,0,1),inset_0_4px_8px_rgba(255,255,255,0.05)]"></div>
            
            {/* Transparent Glass Chamber */}
            <div className="absolute inset-0 rounded-full bg-[#020617] shadow-[inset_0_40px_80px_rgba(0,0,0,0.9),inset_0_-30px_60px_rgba(255,255,255,0.01)] overflow-hidden border border-white/5">
                <div className="absolute inset-0 bg-radial-3d opacity-95"></div>
                <div className="absolute top-[10%] left-[25%] w-[40%] h-[30%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl rotate-[-20deg]"></div>
                
                {/* Balls Inside Port - All visible and resting at start */}
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
                    {/* The Winning Ball handles its own release animation */}
                    <Ball 
                        index={parseInt(winningNumber) || 77} 
                        phase={phase} 
                        isWinner={true} 
                        winningNumber={winningNumber} 
                        bowlRadius={bowlRadius} 
                    />
                </div>
            </div>

            {/* EXIT PORTAL (Bottom Junction) */}
            <div className="absolute bottom-[2%] left-[12%] w-20 h-20 z-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 border-[4px] border-slate-700 rounded-2xl rotate-45 shadow-2xl flex items-center justify-center">
                    <div className="w-8 h-8 bg-black rounded-full border border-white/10 shadow-inner"></div>
                </div>
            </div>
        </div>

        {/* TRANSPARENT DELIVERY PIPE */}
        <div className="relative w-[240px] sm:w-[400px] h-[550px] sm:h-[750px] z-10 translate-y-[-40px] sm:translate-y-[-60px] sm:translate-x-[-100px]">
            <svg className="w-full h-full drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="pipeMetalGloss" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
                    </linearGradient>
                    <filter id="pipeBloom">
                        <feGaussianBlur stdDeviation="10" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* The Tube Structure */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="70" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
                
                {/* Internal Visible Channel */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="url(#pipeMetalGloss)" 
                    strokeWidth="54" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {/* Glass Highlight */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="rgba(255,255,255,0.15)" 
                    strokeWidth="1" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#pipeBloom)"
                />

                {/* Final Landing Cup */}
                <g transform="translate(200, 550)">
                    <circle r="55" fill="#0f172a" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle r="35" fill="rgba(245,158,11,0.03)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" className="animate-pulse" />
                </g>
            </svg>
        </div>

      </div>

      {/* FINAL DISPLAY AREA (HIDDEN UNTIL SEQUENCE END) */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-slate-950/99 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
              <div className="relative animate-result-slam-3d mb-20">
                  <div className="absolute -inset-64 bg-amber-500/10 blur-[200px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-slate-950 rounded-[5rem] px-36 sm:px-72 py-24 sm:py-40 border-[24px] border-amber-500 shadow-[0_0_200px_rgba(245,158,11,0.5)] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-200/5 to-transparent"></div>
                      <span className="relative text-[20rem] sm:text-[36rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-6xl sm:text-8xl font-black russo tracking-tight uppercase mb-16 premium-gold-text italic">
                      DECLARED
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black px-32 py-10 rounded-[3rem] transition-all active:scale-95 shadow-[0_40px_80px_rgba(245,158,11,0.3)] text-4xl uppercase tracking-[0.3em] border-b-[16px] border-amber-800"
                  >
                      CONTINUE
                  </button>
              </div>
          </div>
      )}

      {/* MECHANICAL STATUS HUD */}
      <div className="absolute right-12 bottom-12 flex items-center gap-8 opacity-20 group">
          <div className="text-right">
              <p className="text-[11px] font-black text-white uppercase tracking-[0.6em] mb-1">Authenticity Node</p>
              <p className="text-[15px] font-bold text-amber-500 font-mono tracking-tighter uppercase">Physical_Simulation_Active_{winningNumber}</p>
          </div>
          <div className="w-20 h-20 bg-slate-900 rounded-full border-[8px] border-slate-800 shadow-2xl flex items-center justify-center">
              <div className="w-8 h-8 border-[6px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
