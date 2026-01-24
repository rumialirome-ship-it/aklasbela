
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'IDLE' | 'SHUFFLE' | 'DRAW' | 'REVEAL';

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

const BALL_COLORS_MAP = Array.from({ length: 100 }, (_, i) => {
  if (i < 14) return '#ef4444'; // Red
  if (i < 28) return '#f97316'; // Orange
  if (i < 42) return '#fbbf24'; // Yellow
  if (i < 56) return '#22c55e'; // Green
  if (i < 70) return '#3b82f6'; // Blue
  if (i < 84) return '#a855f7'; // Purple
  return '#ec4899'; // Pink
});

const SHUFFLE_DURATION = 5000; // 5 seconds of mixing
const DRAW_DURATION = 4000;    // 4 seconds for ball to follow path

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [showFinalNumber, setShowFinalNumber] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate 100 balls with random movement parameters
  const balls = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 120;
      return {
        id: i,
        number: (i + 1).toString().padStart(2, '0'),
        color: BALL_COLORS_MAP[i],
        // Random drift points for mixing animation
        x0: Math.cos(angle) * dist,
        y0: Math.sin(angle) * dist,
        x1: Math.cos(angle + 1) * (dist + 20),
        y1: Math.sin(angle + 1) * (dist - 10),
        x2: Math.cos(angle - 1) * (dist - 15),
        y2: Math.sin(angle - 1) * (dist + 15),
        x3: Math.cos(angle + 0.5) * dist,
        y3: Math.sin(angle + 0.5) * dist,
        dur: 0.4 + Math.random() * 0.4
      };
    });
  }, []);

  useEffect(() => {
    // Auto-start sequence
    const startTimer = setTimeout(() => setPhase('SHUFFLE'), 1000);
    const drawTimer = setTimeout(() => setPhase('DRAW'), 1000 + SHUFFLE_DURATION);
    const revealTimer = setTimeout(() => {
      setPhase('REVEAL');
      setShowFinalNumber(true);
    }, 1000 + SHUFFLE_DURATION + DRAW_DURATION);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(drawTimer);
      clearTimeout(revealTimer);
    };
  }, []);

  // Calculate coordinates relative to screen center
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.35;

  // Path from video: starts from chamber exit, zig-zags down
  // Chamber exit is roughly at (centerX, centerY + 160)
  const pathD = `M ${centerX} ${centerY + 160} 
                C ${centerX} ${centerY + 220}, ${centerX + 180} ${centerY + 260}, ${centerX + 180} ${centerY + 320}
                C ${centerX + 180} ${centerY + 380}, ${centerX - 180} ${centerY + 440}, ${centerX - 180} ${centerY + 520}
                L ${centerX} ${centerY + 580}`;

  return (
    <div className="fixed inset-0 z-[9999] lottery-machine-container flex flex-col items-center">
      
      {/* Header Info */}
      <div className="absolute top-6 left-6 text-left opacity-60">
        <h2 className="text-white text-xl font-black uppercase tracking-widest russo">{gameName}</h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mechanical Draw Session</p>
      </div>

      {/* SVG Path Background */}
      <svg className="delivery-path-svg" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}>
        <path 
          d={pathD} 
          fill="none" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="2" 
          strokeDasharray="8 8" 
        />
      </svg>

      {/* Chamber */}
      <div className="chamber-circle">
        <div className="relative w-full h-full flex items-center justify-center">
          {balls.map((ball) => {
            // If it's the winning ball and we are in DRAW phase, hide it from the chamber
            if (ball.number === winningNumber && phase === 'DRAW') return null;
            // If we are in REVEAL phase, hide all balls to match video end state? 
            // Video actually keeps them at bottom.
            const isMixing = phase === 'SHUFFLE' || phase === 'DRAW';
            return (
              <div 
                key={ball.id}
                className={`lottery-ball-2d ${isMixing ? 'ball-mixing' : ''}`}
                style={{
                  backgroundColor: ball.color,
                  '--x0': `${ball.x0}px`, '--y0': `${ball.y0}px`,
                  '--x1': `${ball.x1}px`, '--y1': `${ball.y1}px`,
                  '--x2': `${ball.x2}px`, '--y2': `${ball.y2}px`,
                  '--x3': `${ball.x3}px`, '--y3': `${ball.y3}px`,
                  '--dur': `${ball.dur}s`,
                  // Static position when not mixing (at the bottom of the circle)
                  left: isMixing ? '50%' : `calc(50% + ${ball.x0 * 0.5}px)`,
                  top: isMixing ? '50%' : `calc(85% + ${ball.y0 * 0.15}px)`
                } as any}
              >
                {ball.number}
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons (Decorative to match video) */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-6">
        <div className="video-btn video-btn-blue">Reset</div>
        <div className="video-btn video-btn-red">Draw</div>
      </div>

      {/* Winning Ball Animation */}
      {phase === 'DRAW' && (
        <div 
          className="winning-ball-path"
          style={{ 
            offsetPath: `path('${pathD}')`,
            backgroundColor: BALL_COLORS_MAP[parseInt(winningNumber) - 1] || '#ef4444'
          } as any}
        >
          {winningNumber}
        </div>
      )}

      {/* Final Reveal Box */}
      <div className="absolute bottom-[10%] w-full flex flex-col items-center">
        <div className="final-result-box">
          {showFinalNumber ? winningNumber : ''}
        </div>
        
        {showFinalNumber && (
          <button 
            onClick={onClose}
            className="mt-8 bg-white text-black font-black px-12 py-3 rounded-full hover:bg-amber-500 transition-colors uppercase tracking-widest text-sm"
          >
            Continue
          </button>
        )}
      </div>

      {/* Video UI Artifacts */}
      <div className="absolute bottom-4 left-4 flex gap-4 opacity-30 scale-75 origin-bottom-left">
          <div className="w-8 h-8 rounded bg-white/10" />
          <div className="w-24 h-8 rounded bg-white/10" />
      </div>

    </div>
  );
};

export default ResultRevealOverlay;