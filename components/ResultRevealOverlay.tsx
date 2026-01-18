
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
    const shuffleDuration = useMemo(() => 0.4 + Math.random() * 0.6, []);
    const initialPos = useMemo(() => ({
        x: -160 + Math.random() * 320,
        y: -140 + Math.random() * 280
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
                top: `calc(48% + ${initialPos.y}px)`,
            } as any}
        >
            <span className="ball-text">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'SHUFFLE' | 'DROP' | 'REVEAL'>('SHUFFLE');
  const [progress, setProgress] = useState(0);
  const backgroundBalls = useMemo(() => Array.from({ length: 100 }).map((_, i) => i), []);

  const SHUFFLE_DURATION = 45000; // 45 seconds as requested

  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min((elapsed / SHUFFLE_DURATION) * 100, 100);
        setProgress(p);
        
        if (p >= 100) {
            clearInterval(progressInterval);
            setPhase('DROP');
        }
    }, 100);

    const dropToRevealTimer = setTimeout(() => {
        setPhase('REVEAL');
    }, SHUFFLE_DURATION + 2500); // Wait for pipe travel after shuffle finishes

    return () => {
        clearInterval(progressInterval);
        clearTimeout(dropToRevealTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[180px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-600 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl h-full flex flex-col items-center justify-center px-4">
        
        {/* Header Info & Progress Bar */}
        <div className="absolute top-12 text-center w-full animate-fade-in px-8">
            <h2 className="text-amber-500 text-lg font-black tracking-[0.5em] uppercase mb-2 russo">{gameName}</h2>
            <div className="flex items-center gap-4 mb-1">
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Synchronizing Ledger...</p>
                 <div className="h-1.5 flex-grow bg-slate-900 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                 </div>
                 <p className="text-amber-500 font-mono text-[10px] w-8">{Math.floor(progress)}%</p>
            </div>
        </div>

        {/* The Machine Bowl - Made Larger */}
        <div className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] md:w-[560px] md:h-[560px] rounded-full glass-bowl flex items-center justify-center transition-all duration-700">
            {/* The Shuffling Balls - All 100 Visible */}
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

            {/* Chamber Inner Details */}
            <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none bg-radial-inner"></div>
        </div>

        {/* The ZigZag Pipe Path */}
        <div className="relative w-full h-56 -mt-10 md:-mt-16">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid meet">
                {/* Pipe structure */}
                <path 
                    d="M 200 0 L 200 40 L 340 80 L 60 140 L 200 180" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="42" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path 
                    d="M 200 0 L 200 40 L 340 80 L 60 140 L 200 180" 
                    stroke="rgba(56,189,248,0.15)" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                />
            </svg>
        </div>

        {/* The Reveal Moment */}
        {phase === 'REVEAL' && (
            <div className="flex flex-col items-center animate-result-slam w-full mt-6">
                <div className="bg-white text-slate-950 rounded-3xl px-16 py-4 mb-6 shadow-[0_0_60px_rgba(251,191,36,0.8)] border-4 border-amber-400">
                    <span className="text-7xl sm:text-9xl font-black russo tracking-tighter leading-none">{winningNumber}</span>
                </div>
                
                <h1 className="text-4xl sm:text-6xl font-black text-white russo uppercase mb-8 tracking-[0.2em] text-center drop-shadow-2xl">{gameName}</h1>

                <button 
                    onClick={onClose}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-16 py-5 rounded-2xl transition-all active:scale-95 shadow-[0_20px_50px_rgba(245,158,11,0.3)] russo text-xl tracking-widest uppercase border-b-4 border-amber-700"
                >
                    Dismiss Declaration
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default ResultRevealOverlay;
