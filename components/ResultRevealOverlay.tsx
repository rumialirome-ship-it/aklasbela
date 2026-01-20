
import React, { useState, useEffect, useMemo, useRef } from 'react';

/* ---------------------------------- TYPES --------------------------------- */

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'STATIC' | 'SHUFFLE' | 'EXITING' | 'REVEAL';

/* -------------------------------- CONSTANTS -------------------------------- */

const RAINBOW_COLORS = [
  '#ef4444',
  '#f97316',
  '#fbbf24',
  '#22c55e',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

const SHUFFLE_DURATION = 40000; // 40s
const PIPE_DURATION = 5000;    // 5s

/* ------------------------------ AUDIO ENGINE ------------------------------- */

class DrawAudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  drone: OscillatorNode | null = null;
  musicInterval: number | null = null;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 2);

      this.drone = this.ctx.createOscillator();
      this.drone.type = 'triangle';
      this.drone.frequency.setValueAtTime(42, this.ctx.currentTime);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.drone.connect(g);
      g.connect(this.masterGain);
      this.drone.start();

      this.startTensionMusic();
    } catch (e) {
      console.error('Audio init failed', e);
    }
  }

  startTensionMusic() {
    if (!this.ctx || !this.masterGain) return;

    const playPulse = (freq: number, time: number, vol: number, dur: number) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(vol, time + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(time);
      osc.stop(time + dur);
    };

    const sequence = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const t = now + i * 0.5;
        playPulse(60, t, 0.2, 0.4);
        if (i % 2 === 0) playPulse(120, t, 0.05, 0.2);
        if (i === 0 || i === 4) {
          playPulse(180, t, 0.03, 0.8);
          playPulse(220, t, 0.03, 0.8);
        }
      }
    };

    sequence();
    this.musicInterval = window.setInterval(sequence, 4000);
  }

  playClink() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400 + Math.random() * 600, this.ctx.currentTime);
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
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
    osc.frequency.setValueAtTime(50, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.7);
    g.gain.setValueAtTime(1.0, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  stop() {
    if (this.musicInterval) clearInterval(this.musicInterval);
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
    setTimeout(() => {
      this.drone?.stop();
      this.ctx?.close();
    }, 1100);
  }
}

/* ---------------------------------- BALL ---------------------------------- */

const Ball: React.FC<{
  index: number;
  phase: Phase;
  isWinner: boolean;
  winningNumber: string;
  bowlRadius: number;
}> = React.memo(({ index, phase, isWinner, winningNumber, bowlRadius }) => {
  const color = useMemo(() => RAINBOW_COLORS[index % RAINBOW_COLORS.length], [index]);
  const number = index.toString().padStart(2, '0');

  const motion = useMemo(() => {
    const size = bowlRadius * 0.12;
    const maxR = bowlRadius - size - 10;

    // Centered distribution logic
    const phi = (Math.sqrt(5) + 1) / 2;
    const t = index / 99;
    const gridAngle = 2 * Math.PI * index * phi;
    const gridR = maxR * Math.sqrt(t);

    const gridX = gridR * Math.cos(gridAngle);
    const gridY = gridR * Math.sin(gridAngle);

    const path = Array.from({ length: 6 }).map(() => {
      const r = Math.sqrt(Math.random()) * maxR;
      const ang = Math.random() * Math.PI * 2;
      return { x: r * Math.cos(ang), y: r * Math.sin(ang) };
    });

    return {
      gridX,
      gridY,
      path,
      delay: Math.random() * -10,
      fast: 0.25 + Math.random() * 0.2,
      slow: 1.2 + Math.random() * 0.8,
    };
  }, [bowlRadius, index]);

  if (isWinner && (phase === 'EXITING' || phase === 'REVEAL')) {
    return (
      <div
        className={`lottery-ball-3d winner-ball-3d ${
          phase === 'EXITING' ? 'ball-mechanical-pipe-descent' : 'ball-hidden'
        }`}
        style={{ '--ball-color': '#ec4899', zIndex: 5000 } as any}
      >
        <div className="ball-glow" />
        {/* Show number on ball as it descends */}
        <span className="ball-text-3d">{winningNumber}</span>
      </div>
    );
  }

  const activePhase = (phase === 'EXITING' || phase === 'REVEAL') ? 'SHUFFLE' : phase;
  const duration = (phase === 'EXITING' || phase === 'REVEAL') ? motion.slow : motion.fast;

  return (
    <div
      className={`lottery-ball-3d ${activePhase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-grid-static'}`}
      style={{
        '--ball-color': color,
        '--delay': `${motion.delay}s`,
        '--duration': `${duration}s`,
        '--grid-x': `${motion.gridX}px`,
        '--grid-y': `${motion.gridY}px`,
        '--x1': `${motion.path[0].x}px`, '--y1': `${motion.path[0].y}px`,
        '--x2': `${motion.path[1].x}px`, '--y2': `${motion.path[1].y}px`,
        '--x3': `${motion.path[2].x}px`, '--y3': `${motion.path[2].y}px`,
        '--x4': `${motion.path[3].x}px`, '--y4': `${motion.path[3].y}px`,
      } as any}
    >
      <span className="ball-text-3d">{number}</span>
    </div>
  );
});

/* ----------------------------- MAIN COMPONENT ----------------------------- */

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({
  gameName,
  winningNumber,
  onClose,
}) => {
  const [phase, setPhase] = useState<Phase>('STATIC');
  const [progress, setProgress] = useState(0);

  const audio = useRef<DrawAudioEngine | null>(null);
  const balls = useMemo(() => Array.from({ length: 99 }, (_, i) => i), []);
  
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chamberPx = useMemo(() => {
    const minSide = Math.min(viewportSize.w * 0.85, viewportSize.h * 0.6);
    return Math.min(minSide, 650); 
  }, [viewportSize]);

  const bowlRadius = chamberPx / 2;

  useEffect(() => {
    audio.current = new DrawAudioEngine();
    audio.current.init();

    const start = Date.now();
    const shuffleTimer = setTimeout(() => setPhase('SHUFFLE'), 2500);
    const exitTimer = setTimeout(() => {
      setPhase('EXITING');
      // Mechanical clinks synchronized with ball hitting pipe bends
      setTimeout(() => audio.current?.playClink(), 1000);
      setTimeout(() => audio.current?.playClink(), 2500);
      setTimeout(() => audio.current?.playClink(), 4000);
    }, 2500 + SHUFFLE_DURATION);
    
    const revealTimer = setTimeout(() => {
      setPhase('REVEAL');
      audio.current?.playSlam();
    }, 2500 + SHUFFLE_DURATION + PIPE_DURATION);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / SHUFFLE_DURATION) * 100, 100);
      setProgress(p);
    }, 50);

    return () => {
      clearTimeout(shuffleTimer);
      clearTimeout(exitTimer);
      clearTimeout(revealTimer);
      clearInterval(progressInterval);
      audio.current?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* HUD */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-6 sm:top-10 text-center z-[60] animate-fade-in px-6 w-full">
          <h2 className="text-white text-3xl sm:text-6xl font-black russo tracking-[0.1em] uppercase mb-4 drop-shadow-[0_2px_20px_rgba(0,0,0,1)]">
            {gameName} <span className="text-amber-500">Live</span>
          </h2>
          <div className="w-64 sm:w-[500px] h-2 bg-white/10 mx-auto rounded-full overflow-hidden p-[1px] border border-white/5">
            <div className="h-full bg-amber-500 transition-all duration-300 linear shadow-[0_0_20px_#f59e0b]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-4 animate-pulse">Establishing Mechanical Core Connectivity...</p>
        </div>
      )}

      {/* MECHANICAL ENGINE - PERFECTLY CENTERED */}
      <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
        
        {/* GIANT ROUND CHAMBER */}
        <div 
          className="relative z-20 rounded-full" 
          style={{ width: `${chamberPx}px`, height: `${chamberPx}px` }}
        >
          {/* Industrial Heavy Bezel */}
          <div className="absolute -inset-[5%] sm:-inset-16 rounded-full border-[12px] sm:border-[30px] border-slate-900 shadow-[0_120px_240px_rgba(0,0,0,1),inset_0_4px_20px_rgba(255,255,255,0.05)]" />
          
          {/* Glass Sphere Interior */}
          <div className="absolute inset-0 rounded-full bg-[#020617] shadow-[inset_0_100px_200px_rgba(0,0,0,1),inset_0_-80px_160px_rgba(255,255,255,0.03)] overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-radial-3d opacity-95" />
            
            {/* Dynamic Glass Refraction Overlay */}
            <div className="absolute top-[10%] left-[20%] w-[60%] h-[40%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-[100px] rotate-[-20deg]" />
            
            {/* Balls correctly distributed and centered */}
            <div className="relative w-full h-full flex items-center justify-center">
              {balls.map((i) => (
                <Ball key={i} index={i} phase={phase} isWinner={false} winningNumber={winningNumber} bowlRadius={bowlRadius} />
              ))}
              <Ball index={parseInt(winningNumber) || 77} phase={phase} isWinner winningNumber={winningNumber} bowlRadius={bowlRadius} />
            </div>
          </div>

          {/* Mechanical Exit Portal (At the bottom) */}
          <div className="absolute -bottom-[2%] left-1/2 -translate-x-1/2 w-[20%] h-[20%] z-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-slate-900 border-[8px] border-slate-700 rounded-3xl rotate-45 shadow-4xl flex items-center justify-center">
              <div className="w-1/2 h-1/2 bg-black rounded-full border border-white/10 shadow-inner" />
            </div>
          </div>
        </div>

        {/* DELIVERY PIPE - ORIENTED UP-SIDE DOWN (Top to Bottom) */}
        <div 
           className="absolute z-10"
           style={{ 
             width: `${chamberPx * 1.6}px`, 
             height: `${chamberPx * 1.8}px`,
             transform: `translateY(${chamberPx * 0.45}px)`
           }}
        >
          <svg className="w-full h-full drop-shadow-[0_100px_200px_rgba(0,0,0,0.95)]" viewBox="0 0 600 800" fill="none" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="pipeGloss" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
              </linearGradient>
              <filter id="pipeGlow"><feGaussianBlur stdDeviation="25" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
            </defs>
            
            {/* The industrial downward-flowing pipe */}
            <path d="M 300 0 L 300 200 L 500 400 L 300 650" stroke="rgba(255,255,255,0.05)" strokeWidth="110" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 300 0 L 300 200 L 500 400 L 300 650" stroke="url(#pipeGloss)" strokeWidth="90" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 300 0 L 300 200 L 500 400 L 300 650" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#pipeGlow)" />
            
            {/* Receiving result socket */}
            <g transform="translate(300, 650)">
              <circle r="90" fill="#020617" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
              <circle r="60" fill="rgba(245,158,11,0.03)" stroke="rgba(245,158,11,0.4)" strokeWidth="2" className="animate-pulse" />
            </g>
          </svg>
        </div>
      </div>

      {/* FINAL CINEMATIC RESULT OVERLAY */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 z-[6000] bg-slate-950/99 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
          <div className="relative animate-result-slam-3d mb-12 sm:mb-20">
            <div className="absolute -inset-[200px] bg-amber-500/20 blur-[350px] rounded-full animate-pulse" />
            <div className="relative bg-white text-slate-950 rounded-[4rem] sm:rounded-[7rem] px-24 sm:px-[25rem] py-20 sm:py-64 border-[18px] sm:border-[44px] border-amber-500 shadow-[0_0_500px_rgba(245,158,11,0.9)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-200/10 to-transparent" />
              <span className="relative text-[18rem] sm:text-[54rem] font-black russo tracking-tighter leading-none block drop-shadow-4xl">{winningNumber}</span>
            </div>
          </div>
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.9s' }}>
            <h3 className="text-white text-5xl sm:text-[10rem] font-black russo tracking-tight uppercase mb-12 sm:mb-24 premium-gold-text italic text-center">WINNER DECLARED</h3>
            <button
              onClick={onClose}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black px-40 py-12 sm:px-80 sm:py-20 rounded-[4.5rem] transition-all active:scale-95 shadow-[0_60px_100px_rgba(245,158,11,0.5)] text-3xl sm:text-7xl uppercase tracking-[0.5em] border-b-[14px] sm:border-b-[30px] border-amber-800"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      <div className="absolute left-8 bottom-8 sm:left-14 sm:bottom-14 opacity-20 group">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] sm:text-[13px] font-black text-white uppercase tracking-[0.7em]">Mechanical Verification: Stable</p>
        </div>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;
