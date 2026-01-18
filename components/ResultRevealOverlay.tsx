
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#f472b6', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#ffffff', '#94a3b8'];

// --- ADVANCED AUDIO ENGINE ---
class DrawAudioEngine {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;
    droneOsc: OscillatorNode | null = null;
    engineNoise: AudioWorkletNode | any = null;

    init() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 1);

        // Continuous Suspense Drone
        this.droneOsc = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        this.droneOsc.type = 'sawtooth';
        this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, this.ctx.currentTime);

        this.droneOsc.connect(filter);
        filter.connect(droneGain);
        droneGain.connect(this.masterGain);
        droneGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        
        this.droneOsc.start();
    }

    startEngine() {
        if (!this.ctx || !this.masterGain) return;
        
        // Simulating air compressor with white noise
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
        noiseFilter.Q.setValueAtTime(1, this.ctx.currentTime);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        whiteNoise.start();
    }

    playReveal() {
        if (!this.ctx || !this.masterGain) return;
        const revealOsc = this.ctx.createOscillator();
        const revealGain = this.ctx.createGain();
        revealOsc.type = 'square';
        revealOsc.frequency.setValueAtTime(880, this.ctx.currentTime);
        revealOsc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 1.5);
        
        revealGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        revealGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);

        revealOsc.connect(revealGain);
        revealGain.connect(this.masterGain);
        revealOsc.start();
        revealOsc.stop(this.ctx.currentTime + 1.5);
    }

    stop() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
            setTimeout(() => this.ctx?.close(), 600);
        }
    }
}

const Ball: React.FC<{ index: number; phase: string; isWinner: boolean; winningNumber: string; bowlRadius: number }> = ({ index, phase, isWinner, winningNumber, bowlRadius }) => {
    const color = useMemo(() => BALL_COLORS[index % BALL_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    // Containment logic: Keep balls strictly inside
    const physics = useMemo(() => {
        const ballSize = window.innerWidth < 640 ? 14 : 18;
        const maxR = bowlRadius - ballSize - 10;
        
        // Random "settle" position for static phase (bottom of bowl)
        const settleTheta = Math.PI * (0.2 + Math.random() * 0.6); // Bottom arc
        const settleR = maxR * (0.7 + Math.random() * 0.3);
        
        // Dynamic Shuffle Path (5 control points)
        const path = Array.from({ length: 5 }).map(() => {
            const r = Math.sqrt(Math.random()) * maxR;
            const t = Math.random() * 2 * Math.PI;
            return { x: r * Math.cos(t), y: r * Math.sin(t) };
        });

        return {
            sx: settleR * Math.cos(settleTheta),
            sy: settleR * Math.sin(settleTheta),
            path,
            delay: Math.random() * -5,
            duration: 0.8 + Math.random() * 0.7
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'DROP' || phase === 'REVEAL')) {
        return (
            <div 
                className={`lottery-ball winner-ball ${phase === 'DROP' ? 'ball-pipe-descent' : 'ball-at-exit'}`}
                style={{ '--ball-color': '#fbbf24', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    const isShuffling = phase === 'SHUFFLE';
    
    return (
        <div 
            className={`lottery-ball ${isShuffling ? 'ball-shuffling' : 'ball-locked'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${physics.delay}s`,
                '--duration': `${physics.duration}s`,
                '--x1': `${physics.path[0].x}px`, '--y1': `${physics.path[0].y}px`,
                '--x2': `${physics.path[1].x}px`, '--y2': `${physics.path[1].y}px`,
                '--x3': `${physics.path[2].x}px`, '--y3': `${physics.path[2].y}px`,
                '--x4': `${physics.path[3].x}px`, '--y4': `${physics.path[3].y}px`,
                left: `calc(50% + ${physics.sx}px)`,
                top: `calc(50% + ${physics.sy}px)`,
            } as any}
        >
            <span className="ball-text">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STATIC' | 'SHUFFLE' | 'DROP' | 'REVEAL'>('STATIC');
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<DrawAudioEngine | null>(null);
  const balls = useMemo(() => Array.from({ length: 100 }).map((_, i) => i), []);

  const INITIAL_DELAY = 4000; 
  const SHUFFLE_DURATION = 45000;

  useEffect(() => {
    audioRef.current = new DrawAudioEngine();
    audioRef.current.init();

    const startTime = Date.now();
    
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
        audioRef.current?.startEngine();
    }, INITIAL_DELAY);

    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < INITIAL_DELAY) return;

        const p = Math.min(((elapsed - INITIAL_DELAY) / SHUFFLE_DURATION) * 100, 100);
        setProgress(p);
        
        if (p >= 100) {
            clearInterval(progressInterval);
            setPhase('DROP');
        }
    }, 100);

    const revealTimer = setTimeout(() => {
        setPhase('REVEAL');
        audioRef.current?.playReveal();
    }, INITIAL_DELAY + SHUFFLE_DURATION + 2500);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        clearTimeout(revealTimer);
        audioRef.current?.stop();
    };
  }, []);

  const bowlSize = window.innerWidth < 640 ? 140 : 250;

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex items-center justify-center overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)]"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      </div>

      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-4">
        
        {/* ARENA HEADER */}
        <div className="absolute top-6 sm:top-10 text-center w-full max-w-2xl px-6 animate-fade-in">
            <div className="inline-flex items-center gap-3 bg-black/40 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-6">
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Live Result Protocol</span>
            </div>
            
            <h1 className="text-white text-4xl sm:text-6xl font-black russo tracking-tighter mb-4 uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                {gameName} <span className="text-amber-500">OFFICIAL</span>
            </h1>
            
            <div className="bg-slate-900/60 p-1.5 rounded-full border border-white/5 shadow-inner backdrop-blur-sm">
                <div 
                    className="h-2.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 transition-all duration-300 ease-linear shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between mt-2 px-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{phase === 'STATIC' ? 'WAITING' : 'PROCESS'}</span>
                <span className="text-[9px] font-black text-amber-500 font-mono">{Math.floor(progress)}% COMPLETE</span>
            </div>
        </div>

        {/* THE MACHINE - RIGID CENTERING */}
        <div className="relative mt-20 sm:mt-0 flex items-center justify-center">
            
            {/* Holographic Ring */}
            <div className="absolute -inset-10 border-2 border-amber-500/10 rounded-full animate-spin-slow"></div>
            <div className="absolute -inset-20 border border-white/5 rounded-full animate-reverse-spin-slow"></div>

            {/* Bowl Container */}
            <div className="relative w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full glass-bowl flex items-center justify-center overflow-hidden">
                
                {/* Visual Enhancements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08)_0%,transparent_60%)] z-30 pointer-events-none"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] z-20"></div>

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

                {/* The Winning Ball Logic */}
                {(phase === 'SHUFFLE' || phase === 'STATIC') ? (
                     <Ball 
                        index={parseInt(winningNumber)} 
                        phase={phase} 
                        isWinner={true} 
                        winningNumber={winningNumber} 
                        bowlRadius={bowlSize} 
                     />
                ) : (
                     <div className="absolute inset-0 z-50 pointer-events-none">
                         <Ball 
                            index={parseInt(winningNumber)} 
                            phase={phase} 
                            isWinner={true} 
                            winningNumber={winningNumber} 
                            bowlRadius={bowlSize} 
                         />
                     </div>
                )}
            </div>

            {/* Exit Mechanics */}
            <div className="absolute -bottom-10 w-48 h-12 bg-gradient-to-b from-slate-800 to-slate-950 border border-white/10 rounded-t-3xl shadow-2xl z-0 flex items-center justify-center">
                <div className="w-12 h-1.5 bg-amber-500/20 rounded-full animate-pulse"></div>
            </div>
        </div>

        {/* DELIVERY PIPE */}
        <div className="relative w-full h-40 sm:h-60 -mt-16 sm:-mt-24 z-10 pointer-events-none flex justify-center">
            <svg className="w-64 sm:w-96 h-full" viewBox="0 0 200 150" fill="none">
                <path 
                    d="M 100 0 L 100 30 L 180 70 L 20 110 L 100 140" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="35" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>

        {/* IMPACT REVEAL */}
        {phase === 'REVEAL' && (
            <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-lg animate-fade-in p-6">
                <div className="relative animate-result-slam">
                    <div className="absolute -inset-10 bg-amber-500/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-white text-slate-950 rounded-[3rem] px-16 sm:px-24 py-8 sm:py-12 shadow-[0_0_100px_rgba(245,158,11,0.6)] border-[10px] border-amber-400">
                        <span className="text-9xl sm:text-[15rem] font-black russo tracking-tighter leading-none block drop-shadow-xl">{winningNumber}</span>
                    </div>
                </div>
                
                <div className="mt-16 text-center animate-fade-in-up">
                    <p className="text-amber-500 text-sm font-black uppercase tracking-[0.5em] mb-4">Official Declaration</p>
                    <h2 className="text-4xl sm:text-6xl font-black text-white russo uppercase mb-12 tracking-tight">DRAW SUCCESSFUL</h2>

                    <button 
                        onClick={onClose}
                        className="group relative bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-16 py-5 rounded-2xl transition-all active:scale-95 shadow-[0_25px_60px_rgba(245,158,11,0.3)] russo text-xl tracking-widest uppercase overflow-hidden"
                    >
                        <span className="relative z-10">Return to Floor</span>
                        <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ResultRevealOverlay;
