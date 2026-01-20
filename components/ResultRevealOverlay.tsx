
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
        const ballSize = window.innerWidth < 640 ? 14 : 18;
        const maxR = bowlRadius - ballSize - 12;
        
        // Initial Cluster at the bottom of the circular port - clearly resting
        const angle = (index / 99) * Math.PI * 0.7 + (Math.PI * 0.15);
        const clusterR = maxR * (0.7 + Math.random() * 0.3);
        const gx = clusterR * Math.cos(angle + Math.PI / 2); 
        const gy = clusterR * Math.sin(angle + Math.PI / 2);

        // Chaotic Pathing for shuffle
        const path = Array.from({ length: 8 }).map(() => {
            const r = Math.sqrt(Math.random()) * maxR;
            const t = Math.random() * 2 * Math.PI;
            return { x: r * Math.cos(t), y: r * Math.sin(t) };
        });

        return {
            gx, gy,
            path,
            delay: Math.random() * -10,
            duration: 0.35 + Math.random() * 0.25,
            slowDuration: 1.2 + Math.random() * 0.8
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

    // Remaining balls during and after exit phase keep reanimating slightly for authenticity
    const currentPhase = (phase === 'EXITING' || phase === 'REVEAL') ? 'SHUFFLE' : phase;
    const animDuration = (phase === 'EXITING' || phase === 'REVEAL') ? physics.slowDuration : physics.duration;

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
    
    // Initial Resting Period for transparency
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
    }, 2500);

    const sequenceInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (phase === 'SHUFFLE') {
            const p = Math.min((elapsed / SHUFFLE_DURATION) * 100, 100);
            setProgress(p);
            
            if (p >= 100) {
                setPhase('EXITING');
                // Synchronized mechanical audio triggers
                setTimeout(() => audioRef.current?.playClink(), 800);   
                setTimeout(() => audioRef.current?.playClink(), 2400);  
                setTimeout(() => audioRef.current?.playClink(), 4100);  
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

  // Port made bigger as per user request
  const bowlRadius = window.innerWidth < 640 ? 160 : 220;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* HUD - Hiding winning number until final reveal */}
      {phase !== 'REVEAL' && (
          <div className="absolute top-10 text-center z-[60] animate-fade-in px-6">
              <h2 className="text-white text-3xl sm:text-4xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                  {gameName} <span className="text-amber-500">Lottery</span>
              </h2>
              <div className="w-64 sm:w-80 h-1.5 bg-white/10 mx-auto rounded-full overflow-hidden p-[1px]">
                  <div className="h-full bg-amber-500 transition-all duration-300 linear shadow-[0_0_15px_#f59e0b]" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Authentic Draw In Progress</p>
          </div>
      )}

      {/* MECHANICAL CHAMBER & PIPE ENGINE */}
      <div className="relative flex flex-col items-center justify-center w-full h-full pointer-events-none scale-90 sm:scale-100">
        
        {/* BIGGER CIRCULAR PORT (TRANSPARENT GLASS CHAMBER) */}
        <div className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] z-20">
            {/* The Heavy Professional Bezel */}
            <div className="absolute -inset-8 rounded-full border-[14px] border-slate-900 shadow-[0_60px_120px_rgba(0,0,0,1),inset_0_4px_10px_rgba(255,255,255,0.05)]"></div>
            
            {/* Transparent Glass Chamber */}
            <div className="absolute inset-0 rounded-full bg-[#010411] shadow-[inset_0_50px_100px_rgba(0,0,0,0.95),inset_0_-40px_80px_rgba(255,255,255,0.01)] overflow-hidden border border-white/5">
                <div className="absolute inset-0 bg-radial-3d opacity-95"></div>
                <div className="absolute top-[8%] left-[22%] w-[45%] h-[35%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl rotate-[-18deg]"></div>
                
                {/* Balls Inside Port */}
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
                    {/* The Winning Ball released only at the end of shuffle */}
                    <Ball 
                        index={parseInt(winningNumber) || 88} 
                        phase={phase} 
                        isWinner={true} 
                        winningNumber={winningNumber} 
                        bowlRadius={bowlRadius} 
                    />
                </div>
            </div>

            {/* MECHANICAL EXIT JUNCTION */}
            <div className="absolute bottom-[1%] left-[10%] w-24 h-24 z-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 border-[5px] border-slate-700 rounded-2xl rotate-45 shadow-2xl flex items-center justify-center">
                    <div className="w-10 h-10 bg-black rounded-full border border-white/10 shadow-inner"></div>
                </div>
            </div>
        </div>

        {/* TRANSPARENT DELIVERY PIPE PATH */}
        <div className="relative w-[280px] sm:w-[440px] h-[600px] sm:h-[800px] z-10 translate-y-[-50px] sm:translate-y-[-70px] sm:translate-x-[-120px]">
            <svg className="w-full h-full drop-shadow-[0_50px_100px_rgba(0,0,0,0.9)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="pipeGloss" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
                    </linearGradient>
                    <filter id="pipeGlow">
                        <feGaussianBlur stdDeviation="12" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* Structural Tube */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="rgba(255,255,255,0.04)" 
                    strokeWidth="78" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
                
                {/* Internal Visual Channel */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="url(#pipeGloss)" 
                    strokeWidth="58" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {/* Light Refraction Highlight */}
                <path 
                    d="M 50 100 L 150 250 L 350 400 L 200 550" 
                    stroke="rgba(255,255,255,0.12)" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#pipeGlow)"
                />

                {/* Dedicated Display Resting Area (Bottom Cup) */}
                <g transform="translate(200, 550)">
                    <circle r="60" fill="#080c1d" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                    <circle r="38" fill="rgba(245,158,11,0.02)" stroke="rgba(245,158,11,0.25)" strokeWidth="1" className="animate-pulse" />
                </g>
            </svg>
        </div>

      </div>

      {/* FINAL RESULT DISPLAY AREA (REVEALED ONLY AT END) */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-slate-950/99 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
              <div className="relative animate-result-slam-3d mb-16">
                  <div className="absolute -inset-72 bg-amber-500/10 blur-[240px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-slate-950 rounded-[6rem] px-40 sm:px-80 py-24 sm:py-44 border-[28px] border-amber-500 shadow-[0_0_220px_rgba(245,158,11,0.6)] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-200/5 to-transparent"></div>
                      <span className="relative text-[22rem] sm:text-[38rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-6xl sm:text-9xl font-black russo tracking-tight uppercase mb-16 premium-gold-text italic">
                      DRAW RESULT
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black px-36 py-10 rounded-[3.5rem] transition-all active:scale-95 shadow-[0_50px_90px_rgba(245,158,11,0.4)] text-4xl uppercase tracking-[0.3em] border-b-[18px] border-amber-800"
                  >
                      EXIT DRAW
                  </button>
              </div>
          </div>
      )}

      {/* SYSTEM STATUS FEED */}
      <div className="absolute right-12 bottom-12 flex items-center gap-8 opacity-25">
          <div className="text-right">
              <p className="text-[11px] font-black text-white uppercase tracking-[0.6em] mb-1">Decentralized Feed</p>
              <p className="text-[15px] font-bold text-amber-500 font-mono tracking-tighter uppercase">Physical_Sync_Locked</p>
          </div>
          <div className="w-20 h-20 bg-slate-900 rounded-full border-[8px] border-slate-800 shadow-2xl flex items-center justify-center">
              <div className="w-8 h-8 border-[6px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
