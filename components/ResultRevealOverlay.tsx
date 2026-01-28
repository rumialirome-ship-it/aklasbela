import React, { useState, useEffect, useMemo } from 'react';

/* ---------------------------------- TYPES --------------------------------- */

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'IDLE' | 'SHUFFLE' | 'DELIVERY' | 'HOLD' | 'REVEAL';

/* -------------------------------- CONSTANTS -------------------------------- */

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

const SHUFFLE_TIME = 12000;
const DELIVERY_TIME = 16000;
const HOLD_TIME = 4500;

/* ---------------------------------- BALL ---------------------------------- */

const Ball: React.FC<{
  id: number;
  number: string;
  phase: Phase;
  isWinner: boolean;
}> = React.memo(({ id, number, phase, isWinner }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);

  if (isWinner && (phase === 'DELIVERY' || phase === 'HOLD')) return null;
  if (phase === 'REVEAL') return null;

  return (
    <div
      className={`lottery-ball-3d ${phase === 'SHUFFLE' ? 'ball-vortex' : ''}`}
      style={{ 
        '--ball-color': color,
        '--radius': `${60 + Math.random() * 120}px`,
        '--speed': `${0.2 + Math.random() * 0.3}s`,
        '--delay': `${Math.random() * -10}s`
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
  const [phase, setPhase] = useState<Phase>('IDLE');

  const balls = useMemo(
    () => Array.from({ length: 100 }, (_, i) => ({
      id: i,
      number: i.toString().padStart(2, '0'),
    })),
    []
  );

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('SHUFFLE'), 800);
    const t2 = setTimeout(() => setPhase('DELIVERY'), 800 + SHUFFLE_TIME);
    const t3 = setTimeout(() => setPhase('HOLD'), 800 + SHUFFLE_TIME + DELIVERY_TIME);
    const t4 = setTimeout(() => setPhase('REVEAL'), 800 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const pipelinePath =
    'M 200 80 L 200 220 L 320 300 L 80 380 L 320 460 L 80 540 L 200 620';

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[9999] select-none">

      {/* HEADER */}
      {phase !== 'REVEAL' && (
        <div className="absolute top-10 w-full text-center z-50">
          <h1 className="text-white text-6xl font-black tracking-widest russo">
            {gameName} <span className="text-amber-500">LIVE</span>
          </h1>
        </div>
      )}

      {/* PIPE DEFINITIONS */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="pipeBack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(20,30,40,1)" />
            <stop offset="50%" stopColor="rgba(80,100,120,0.4)" />
            <stop offset="100%" stopColor="rgba(20,30,40,1)" />
          </linearGradient>

          <linearGradient id="pipeGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(220,245,255,0.55)" />
            <stop offset="50%" stopColor="rgba(220,245,255,0.12)" />
            <stop offset="100%" stopColor="rgba(220,245,255,0.55)" />
          </linearGradient>

          <linearGradient id="pipeBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="48%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="52%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      {/* PIPE BACK */}
      <svg className="absolute inset-0 glass-back-wall" viewBox="0 0 400 700" preserveAspectRatio="none">
        <path d={pipelinePath} stroke="rgba(255,255,255,0.2)" strokeWidth="72" fill="none" strokeLinejoin="round" />
        <path d={pipelinePath} stroke="black" strokeWidth="68" fill="none" strokeLinejoin="round" />
        <path d={pipelinePath} stroke="url(#pipeBack)" strokeWidth="64" fill="none" strokeLinejoin="round" />
        {/* glass thickness */}
        <path d={pipelinePath} stroke="rgba(200,230,255,0.18)" strokeWidth="60" fill="none" strokeLinejoin="round" transform="translate(2,0)" />
      </svg>

      {/* BALL INSIDE PIPE / HELD */}
      {(phase === 'DELIVERY' || phase === 'HOLD') && (
        <div 
          className={`lottery-ball-3d ${phase === 'DELIVERY' ? 'pipe-ball pipe-entry-glow' : 'ball-held'}`}
          style={{ '--ball-color': '#f59e0b' } as any}
        >
          <span className="ball-text-3d">{winningNumber.padStart(2, '0')}</span>
        </div>
      )}

      {/* PIPE FRONT */}
      <svg className="absolute inset-0 pointer-events-none glass-front-highlights" viewBox="0 0 400 700" preserveAspectRatio="none">
        <path d={pipelinePath} stroke="url(#pipeGlass)" strokeWidth="58" fill="none" strokeLinejoin="round" opacity="0.85" />
        <path d={pipelinePath} stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" opacity="0.4" />
        <path
          d={pipelinePath}
          stroke="url(#pipeBeam)"
          strokeWidth="14"
          className="glass-specular-beam"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>

      {/* CHAMBER */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${phase === 'REVEAL' ? 'opacity-0 scale-150' : 'opacity-100'}`}>
        <div className="machine-jar">
          <div className="jar-body-sphere">
            {balls.map(b => (
              <Ball
                key={b.id}
                id={b.id}
                number={b.number}
                phase={phase}
                isWinner={parseInt(b.number) === parseInt(winningNumber)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* FINAL REVEAL */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 reveal-slam-bg">
          <div className="relative animate-result-slam-3d">
            <div className="text-white text-[15rem] sm:text-[25rem] font-black russo tracking-tighter drop-shadow-[0_0_100px_#f59e0b] leading-none gold-shimmer">
              {winningNumber.padStart(2, '0')}
            </div>
            <div className="text-center">
               <button
                onClick={onClose}
                className="mt-12 bg-amber-500 hover:bg-amber-400 text-black px-20 py-8 rounded-full font-black tracking-[0.4em] uppercase transition-all transform active:scale-95 shadow-[0_0_50px_rgba(245,158,11,0.3)]"
              >
                CONFIRM RESULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;