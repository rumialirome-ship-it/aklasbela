
import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#f472b6', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#ffffff', '#94a3b8'];

const Ball: React.FC<{ index: number; phase: string; isWinner: boolean; winningNumber: string }> = ({ index, phase, isWinner, winningNumber }) => {
    const color = useMemo(() => BALL_COLORS[index % BALL_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    // Random shuffle properties
    const shuffleDelay = useMemo(() => Math.random() * -2, []);
    const shuffleDuration = useMemo(() => 0.6 + Math.random() * 0.4, []);
    const initialPos = useMemo(() => ({
        x: -120 + Math.random() * 240,
        y: -100 + Math.random() * 200
    }), []);

    if (isWinner && phase !== 'SHUFFLE') {
        let className = "lottery-ball winner-ball ";
        if (phase === 'DROP') className += "ball-pipe-descent";
        if (phase === 'REVEAL') className += "ball-at-exit";

        return (
            <div 
                className={className}
                style={{ '--ball-color': '#fbbf24', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    return (
        <div 
            className={`lottery-ball ${phase === 'SHUFFLE' ? 'ball-shuffling' : 'ball-resting'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${shuffleDelay}s`,
                '--duration': `${shuffleDuration}s`,
                '--ix': `${initialPos.x}px`,
                '--iy': `${initialPos.y}px`,
                left: `calc(50% + ${initialPos.x}px)`,
                top: `calc(45% + ${initialPos.y}px)`,
            } as any}
        >
            <span className="ball-text">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'SHUFFLE' | 'DROP' | 'REVEAL'>('SHUFFLE');
  const backgroundBalls = useMemo(() => Array.from({ length: 80 }).map((_, i) => i), []);

  useEffect(() => {
    const shuffleTimer = setTimeout(() => {
        setPhase('DROP');
    }, 4000); // 4 seconds of shuffling as per typical draw length

    const dropTimer = setTimeout(() => {
        setPhase('REVEAL');
    }, 6500); // After pipe travel

    return () => {
        clearTimeout(shuffleTimer);
        clearTimeout(dropTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-lg h-full flex flex-col items-center justify-center px-4">
        
        {/* Header Info */}
        <div className="absolute top-12 text-center w-full animate-fade-in">
            <h2 className="text-amber-500 text-sm font-black tracking-[0.5em] uppercase mb-1 russo">{gameName}</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Official Verification Draw</p>
        </div>

        {/* The Machine Bowl */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full glass-bowl flex items-center justify-center">
            {/* The Shuffling Balls */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
                {backgroundBalls.map(i => (
                    <Ball key={i} index={i} phase={phase} isWinner={false} winningNumber={winningNumber} />
                ))}
            </div>

            {/* Winning Ball isolated in shuffle or performing its drop */}
            {phase === 'SHUFFLE' ? (
                 <Ball index={parseInt(winningNumber)} phase={phase} isWinner={true} winningNumber={winningNumber} />
            ) : (
                 <div className="absolute inset-0 pointer-events-none">
                     <Ball index={parseInt(winningNumber)} phase={phase} isWinner={true} winningNumber={winningNumber} />
                 </div>
            )}

            {/* Shine FX */}
            <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none"></div>
        </div>

        {/* The ZigZag Pipe Path */}
        <div className="relative w-full h-48 -mt-6">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid meet">
                {/* Pipe structure */}
                <path 
                    d="M 200 0 L 200 40 L 320 80 L 80 140 L 200 180" 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="35" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Inner Glow Path */}
                <path 
                    d="M 200 0 L 200 40 L 320 80 L 80 140 L 200 180" 
                    stroke="rgba(56,189,248,0.2)" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                />
            </svg>
        </div>

        {/* The Reveal Moment */}
        {phase === 'REVEAL' && (
            <div className="flex flex-col items-center animate-result-slam w-full mt-8">
                <div className="bg-white text-slate-950 rounded-full px-12 py-3 mb-6 shadow-[0_0_50px_rgba(251,191,36,0.6)]">
                    <span className="text-6xl sm:text-8xl font-black russo tracking-tighter">{winningNumber}</span>
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-black text-white russo uppercase mb-10 tracking-widest text-center">{gameName} RESULT</h1>

                <button 
                    onClick={onClose}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-12 py-4 rounded-full transition-all active:scale-95 shadow-xl russo text-lg tracking-widest uppercase"
                >
                    Dismiss
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default ResultRevealOverlay;
