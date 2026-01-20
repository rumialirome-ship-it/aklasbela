
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

      // Low Machine Drone
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
      const now = this.ctx!.currentTime;
      for (let i = 0; i < 8; i++) {
        const t = now + i * 0.5;
        // "Thump" bass heartbeat
        playPulse(60, t, 0.2, 0.4);
        if (i % 2 === 0) playPulse(120, t, 0.05, 0.2);
        
        // Eerie tension notes
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
    const size = window.innerWidth < 640 ? 16 : 22;
    const maxR = bowlRadius - size - 15;

    // Distributed around the bottom port area
    const gridAngle = (index / 99) * Math.PI * 0.75 + Math.PI * 0.125;
    const gridR = maxR * (0.65 + Math.random() * 0.35);

    const gridX = gridR * Math.cos(gridAngle + Math.PI / 2);
    const gridY = gridR * Math.sin(gridAngle + Math.PI / 2);

    const path = Array.from({ length: 6 }).map(() => {
      const r = Math.sqrt(Math.random()) * maxR * 0.9;
      const t = Math.random() * Math.PI * 2;
      return { x: r * Math.cos(t), y: r * Math.sin(t) };
    });

    return {
      gridX,
      gridY,
      path,
      delay: Math.random() * -10,
      fast: 0.3 + Math.random() * 0.25,
      slow: 1.5 + Math.random() * 1.0,
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
        {phase === 'REVEAL' && <span className="ball-text-3d">{winningNumber}</span>}
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
  const bowlRadius = useMemo(() => (window.innerWidth < 640 ? 180 : 280), []);

  useEffect(() => {
    audio.current = new DrawAudioEngine();
    audio.current.init();

    const start = Date.now();
    const shuffleTimer = setTimeout(() => setPhase('SHUFFLE'), 2500);
    const exitTimer = setTimeout(() => {
      setPhase('EXITING');
      setTimeout(() => audio.current?.playClink(), 800);
      setTimeout(() => audio.current?.playClink(), 2500);
      setTimeout(() => audio.current?.playClink(), 4200);
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
        <div className="absolute top-10 text-center z-[60] animate-fade-in px-6">
          <h2 className="text-white text-3xl sm:text-5xl font-black russo tracking-[0.2em] uppercase mb-4 drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
            {gameName} <span className="text-amber-500">Live</span>
          </h2>
          <div className="w-64 sm:w-[400px] h-2 bg-white/10 mx-auto rounded-full overflow-hidden p-[1px]">
            <div className="h-full bg-amber-500 transition-all duration-300 linear shadow-[0_0_20px_#f59e0b]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3 animate-pulse">Core Process Synchronizing...</p>
        </div>
      )}

      {/* MECHANICAL ENGINE */}
      <div className="relative flex flex-col items-center justify-center w-full h-full pointer-events-none scale-90 sm:scale-100">
        
        {/* BIGGER CHAMBER */}
        <div className="relative w-[380px] h-[380px] sm:w-[600px] sm:h-[600px] z-20">
          {/* Bezel */}
          <div className="absolute -inset-10 rounded-full border-[18px] border-slate-900 shadow-[0_80px_150px_rgba(0,0,0,1),inset_0_4px_15px_rgba(255,255,255,0.05)]" />
          
          {/* Glass */}
          <div className="absolute inset-0 rounded-full bg-[#010411] shadow-[inset_0_60px_120px_rgba(0,0,0,1),inset_0_-50px_100px_rgba(255,255,255,0.01)] overflow-hidden border border-white/5">
            <div className="absolute inset-0 bg-radial-3d opacity-98" />
            <div className="absolute top-[8%] left-[22%] w-[45%] h-[35%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-[80px] rotate-[-18deg]" />
            
            <div className="relative w-full h-full">
              {balls.map((i) => (
                <Ball key={i} index={i} phase={phase} isWinner={false} winningNumber={winningNumber} bowlRadius={bowlRadius} />
              ))}
              <Ball index={parseInt(winningNumber) || 77} phase={phase} isWinner winningNumber={winningNumber} bowlRadius={bowlRadius} />
            </div>
          </div>

          {/* Exit Portal */}
          <div className="absolute bottom-[2%] left-[12%] w-28 h-28 z-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-slate-900 border-[6px] border-slate-700 rounded-3xl rotate-45 shadow-3xl flex items-center justify-center">
              <div className="w-12 h-12 bg-black rounded-full border border-white/10 shadow-inner" />
            </div>
          </div>
        </div>

        {/* DELIVERY PIPE */}
        <div className="relative w-[300px] sm:w-[500px] h-[650px] sm:h-[900px] z-10 translate-y-[-60px] sm:translate-y-[-100px] sm:translate-x-[-150px]">
          <svg className="w-full h-full drop-shadow-[0_60px_120px_rgba(0,0,0,0.95)]" viewBox="0 0 400 600" fill="none" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="pipeGloss" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
              </linearGradient>
              <filter id="pipeGlow"><feGaussianBlur stdDeviation="15" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
            </defs>
            <path d="M 50 100 L 150 250 L 350 400 L 200 550" stroke="rgba(255,255,255,0.03)" strokeWidth="88" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 50 100 L 150 250 L 350 400 L 200 550" stroke="url(#pipeGloss)" strokeWidth="68" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 50 100 L 150 250 L 350 400 L 200 550" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#pipeGlow)" />
            <g transform="translate(200, 550)">
              <circle r="70" fill="#040816" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <circle r="45" fill="rgba(245,158,11,0.02)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" className="animate-pulse" />
            </g>
          </svg>
        </div>
      </div>

      {/* FINAL CLIMAX */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 z-[6000] bg-slate-950/99 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in px-8">
          <div className="relative animate-result-slam-3d mb-16">
            <div className="absolute -inset-[100px] bg-amber-500/15 blur-[250px] rounded-full animate-pulse" />
            <div className="relative bg-white text-slate-950 rounded-[6rem] px-48 sm:px-96 py-32 sm:py-56 border-[32px] border-amber-500 shadow-[0_0_300px_rgba(245,158,11,0.7)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-200/10 to-transparent" />
              <span className="relative text-[25rem] sm:text-[45rem] font-black russo tracking-tighter leading-none block drop-shadow-3xl">{winningNumber}</span>
            </div>
          </div>
          <div className="text-center animate-fade-in" style={{ animationDelay: '1s' }}>
            <h3 className="text-white text-7xl sm:text-9xl font-black russo tracking-tight uppercase mb-20 premium-gold-text italic">OFFICIAL RESULT</h3>
            <button
              onClick={onClose}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black px-48 py-12 rounded-[4rem] transition-all active:scale-95 shadow-[0_60px_100px_rgba(245,158,11,0.5)] text-5xl uppercase tracking-[0.4em] border-b-[20px] border-amber-800"
            >
              RETURN
            </button>
          </div>
        </div>
      )}

      <div className="absolute left-12 bottom-12 opacity-10">
        <p className="text-[10px] font-black text-white uppercase tracking-[0.8em]">Secure Draw Sequence Active</p>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;
