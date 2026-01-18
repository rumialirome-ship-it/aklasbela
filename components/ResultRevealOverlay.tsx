
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
    noise: AudioWorkletNode | ScriptProcessorNode | null = null;

    init() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 2);
            
            // Deep Draw Drone
            this.drone = this.ctx.createOscillator();
            this.drone.type = 'sine';
            this.drone.frequency.setValueAtTime(40, this.ctx.currentTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.08, this.ctx.currentTime);
            this.drone.connect(g);
            g.connect(this.masterGain);
            this.drone.start();

            // Mechanical Hum / Rattle (Simulated with filtered noise)
            const bufferSize = 4096;
            const scriptNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
            scriptNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.01; // Low level white noise
                }
            };
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, this.ctx.currentTime);
            scriptNode.connect(filter);
            filter.connect(this.masterGain);
            this.noise = scriptNode;

        } catch (e) { console.error("Audio init failed", e); }
    }

    playClink() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 600, this.ctx.currentTime);
        g.gain.setValueAtTime(0.15, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playReveal() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.6);
        g.gain.setValueAtTime(0.5, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.2);
    }

    stop() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
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
    const color = useMemo(() => PHOTO_COLORS[index % PHOTO_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    const physics = useMemo(() => {
        const ballSize = window.innerWidth < 640 ? 12 : 16;
        const maxR = bowlRadius - ballSize - 10;
        const settleTheta = (Math.PI * 0.35) + (Math.random() * Math.PI * 0.3); 
        const settleDist = maxR * (0.5 + Math.random() * 0.4);
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
            duration: 0.5 + Math.random() * 0.5
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball-3d winner-ball-3d ${phase === 'EXITING' ? 'ball-mechanical-delivery' : 'ball-hidden'}`}
                style={{ '--ball-color': '#ec4899', zIndex: 3000 } as any}
            >
                <div className="ball-glow"></div>
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
  const balls = useMemo(() => Array.from({ length: 75 }).map((_, i) => i), []);

  const INITIAL_DELAY = 2000; 
  const SHUFFLE_DURATION = 45000; // Full 45 seconds as requested

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
            
            // Choreographed audio for the pipe journey
            setTimeout(() => audioRef.current?.playClink(), 600);   // Junction Entry
            setTimeout(() => audioRef.current?.playClink(), 1800);  // Bend 1
            setTimeout(() => audioRef.current?.playClink(), 2900);  // Bend 2
            setTimeout(() => audioRef.current?.playClink(), 3800);  // Final Socket Hit
            
            setTimeout(() => {
                setPhase('REVEAL');
                audioRef.current?.playReveal();
            }, 5000);
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
      
      {/* 3D ATMOSPHERIC ENVIRONMENT */}
      <div className="absolute inset-0 bg-[#010413]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,50,90,0.3)_0%,_rgba(0,0,0,1)_100%)]"></div>
      
      {/* HEADER HUD */}
      <div className="absolute top-10 text-center z-[60] w-full px-4 animate-fade-in">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-6 py-1.5 mb-5 backdrop-blur-2xl">
            <p className="text-pink-500 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Mechanical Feed</p>
          </div>
          <h2 className="text-white text-4xl sm:text-7xl font-black russo tracking-tighter uppercase mb-5 drop-shadow-[0_15px_30px_rgba(0,0,0,1)]">
              {gameName} <span className="text-pink-500">Live</span>
          </h2>
          <div className="max-w-[340px] mx-auto">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
                  <div className="h-full bg-gradient-to-r from-pink-700 via-pink-500 to-pink-400 rounded-full transition-all duration-300 linear shadow-[0_0_20px_#ec4899]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      <div className="relative flex flex-col sm:flex-row items-center justify-center w-full h-full max-w-6xl px-4 gap-0 pointer-events-none">
        
        {/* MECHANICAL PORT UNIT */}
        <div className="relative shrink-0 w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] rounded-full flex items-center justify-center">
            {/* Outer Bezel (Metal) */}
            <div className="absolute -inset-6 rounded-full border-[12px] border-[#1e293b] shadow-[0_40px_80px_rgba(0,0,0,1),inset_0_2px_4px_rgba(255,255,255,0.1)]"></div>
            
            {/* Glass Vacuum Chamber */}
            <div className="absolute inset-0 rounded-full bg-[#030712] shadow-[inset_0_30px_60px_rgba(0,0,0,0.9),inset_0_-20px_40px_rgba(255,255,255,0.02)] overflow-hidden">
                <div className="absolute inset-0 bg-radial-3d opacity-80"></div>
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[30%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl rotate-[-15deg]"></div>
                
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

            {/* JUNCTION / HEAD */}
            <div className="absolute top-[5%] right-[5%] w-24 h-24 z-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#0f172a] border-[4px] border-[#334155] rounded-3xl rotate-45 shadow-2xl flex items-center justify-center">
                    <div className="w-10 h-10 bg-black rounded-full border border-white/10"></div>
                </div>
            </div>
        </div>

        {/* VOLUMETRIC ZIGZAG DELIVERY PIPE */}
        <div className="relative w-[200px] sm:w-[350px] h-[450px] sm:h-[650px] z-20 translate-y-[-50px] sm:translate-x-[50px]">
            <svg className="w-full h-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.8)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="pipeGlassRef" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </linearGradient>
                    <filter id="pipeGlowReal">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* 3D Glass Tube Outer Case */}
                <path 
                    d="M -30 140 L 100 140 L 320 280 L 80 440 L 220 560" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="58" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
                
                {/* 3D Glass Tube Inner Channel */}
                <path 
                    d="M -30 140 L 100 140 L 320 280 L 80 440 L 220 560" 
                    stroke="url(#pipeGlassRef)" 
                    strokeWidth="44" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {/* Highlights */}
                <path 
                    d="M -30 140 L 100 140 L 320 280 L 80 440 L 220 560" 
                    stroke="rgba(255,255,255,0.2)" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#pipeGlowReal)"
                />

                {/* EXIT TERMINAL SOCKET */}
                <g transform="translate(220, 560)">
                    <circle r="45" fill="#0f172a" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle r="28" fill="rgba(236,72,153,0.05)" stroke="rgba(236,72,153,0.3)" strokeWidth="1" className="animate-pulse" />
                </g>
            </svg>
        </div>

      </div>

      {/* CLIMAX REVEAL OVERLAY */}
      {phase === 'REVEAL' && (
          <div className="absolute inset-0 z-[6000] bg-[#020617]/99 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
              <div className="relative animate-result-slam-3d mb-16">
                  <div className="absolute -inset-40 bg-pink-600/30 blur-[200px] rounded-full animate-pulse"></div>
                  <div className="relative bg-white text-[#0f172a] rounded-[6rem] px-32 sm:px-64 py-20 sm:py-32 border-[20px] border-pink-500 shadow-[0_0_250px_rgba(236,72,153,0.7)] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-100/5 to-transparent"></div>
                      <span className="relative text-[16rem] sm:text-[28rem] font-black russo tracking-tighter leading-none block drop-shadow-2xl">{winningNumber}</span>
                  </div>
              </div>
              
              <div className="text-center">
                  <h3 className="text-white text-5xl sm:text-8xl font-black russo tracking-tight uppercase mb-16 gold-shimmer">
                      DRAW <span className="text-pink-500">FINALIZED</span>
                  </h3>
                  <button 
                      onClick={onClose}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-28 py-9 rounded-[2.5rem] transition-all active:scale-95 shadow-[0_30px_70px_rgba(236,72,153,0.5)] text-3xl uppercase tracking-[0.2em] border-b-[10px] border-pink-800"
                  >
                      Complete Session
                  </button>
              </div>
          </div>
      )}

      {/* STATUS HUD */}
      <div className="absolute right-12 bottom-12 flex items-center gap-6 opacity-40">
          <div className="text-right">
              <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-1">Node Feed Status</p>
              <p className="text-[14px] font-bold text-blue-500 font-mono tracking-tighter">SECURED_MECHANICAL_STREAM_v{winningNumber || '00'}</p>
          </div>
          <div className="w-16 h-16 bg-blue-600 rounded-full border-[5px] border-blue-400 shadow-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
      </div>

    </div>
  );
};

export default ResultRevealOverlay;
