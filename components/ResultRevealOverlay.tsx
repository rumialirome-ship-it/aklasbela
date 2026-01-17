import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const TENSION_PHRASES = [
    "ACTIVATING CAGE REVOLUTION...",
    "MIXING ENTRIES IN REAL-TIME...",
    "SATELLITE DATA SYNCING...",
    "LOCKING EXTRACTION CHAMBER...",
    "CALCULATING PROBABILITY FIELD...",
    "IDENTIFYING THE WINNER...",
    "FINAL STABILIZATION...",
    "RELEASING JACKPOT BALL..."
];

const BALL_COLORS = ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#ffffff'];

const LotteryDrumBall: React.FC<{ index: number, isMixing: boolean, intensity: number }> = ({ index, isMixing, intensity }) => {
    const style = useMemo(() => {
        const color = BALL_COLORS[index % BALL_COLORS.length];
        const size = Math.random() * 15 + 15;
        const delay = Math.random() * -5;
        const duration = (Math.random() * 2 + 1.5) / (1 + intensity);
        const left = 20 + Math.random() * 60;
        const top = 30 + Math.random() * 40;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation: isMixing ? `ball-bounce-intense ${duration}s ease-in-out ${delay}s infinite alternate` : 'none',
            opacity: 0.8 + (Math.random() * 0.2),
            zIndex: Math.floor(Math.random() * 10),
            filter: `blur(${Math.random() * 1.5}px)`
        } as React.CSSProperties;
    }, [index, isMixing, intensity]);

    return <div className="lottery-ball" style={style} />;
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'MIXING' | 'EXTRACTING' | 'REVEALED'>('MIXING');
  const [elapsed, setElapsed] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const TOTAL_MIX_TIME = 45000; // Exact 45 seconds for mixing
  const EXTRACTION_TIME = 4000; // 4 seconds to drop the ball

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let phraseInterval: ReturnType<typeof setInterval>;

    if (phase === 'MIXING') {
      progressInterval = setInterval(() => {
        setElapsed(prev => {
            if (prev >= TOTAL_MIX_TIME) {
                clearInterval(progressInterval);
                setPhase('EXTRACTING');
                return TOTAL_MIX_TIME;
            }
            return prev + 100;
        });
      }, 100);

      phraseInterval = setInterval(() => {
        setPhraseIndex(prev => (prev + 1) % TENSION_PHRASES.length);
      }, 5500);

      return () => {
        clearInterval(progressInterval);
        clearInterval(phraseInterval);
      };
    }

    if (phase === 'EXTRACTING') {
        const timer = setTimeout(() => {
            setShowFlash(true);
            setTimeout(() => {
                setPhase('REVEALED');
                setShowFlash(false);
            }, 150);
        }, EXTRACTION_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / TOTAL_MIX_TIME, 1);
  const balls = useMemo(() => Array.from({ length: 35 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Cinematic Background Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-[100vh] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${progress > 0.8 ? 'opacity-20' : 'opacity-0'} bg-amber-500/10 animate-pulse`}></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[2100]"></div>}

      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center">
        
        {/* Header Status */}
        <div className="mb-12 text-center">
            <h2 className="text-amber-500 text-xs md:text-sm font-black tracking-[0.6em] uppercase mb-4 animate-pulse russo">
                {phase === 'REVEALED' ? '✨ OFFICIAL SELECTION ✨' : TENSION_PHRASES[phraseIndex]}
            </h2>
            <div className="h-1.5 w-64 md:w-96 bg-slate-900 rounded-full mx-auto overflow-hidden border border-white/5 relative">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest russo">
                {phase === 'REVEALED' ? 'TRANSACTION COMPLETE' : `NETWORK MIXING: ${(progress * 100).toFixed(0)}%`}
            </p>
        </div>

        {/* 3D LOTTERY CAGE (THE POT) */}
        <div className="relative mb-12">
            
            {/* The Stand */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-32 border-x-4 border-slate-700/50 rounded-t-3xl"></div>
            
            {/* The Glass Pot */}
            <div className={`
                w-64 h-64 md:w-96 md:h-96 rounded-full border-4 border-white/10 relative overflow-hidden backdrop-blur-[2px] transition-all duration-1000
                ${phase === 'MIXING' ? 'scale-100' : 'scale-90 opacity-50'}
                bg-gradient-to-br from-white/10 to-transparent
            `}>
                {/* Drum Shine */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1)_0%,transparent_60%)] pointer-events-none"></div>
                
                {/* Balls inside the pot */}
                {phase === 'MIXING' && balls.map(i => (
                    <LotteryDrumBall key={i} index={i} isMixing={true} intensity={progress} />
                ))}

                {/* Mixing Spinner Lines */}
                <div 
                    className="absolute inset-4 border-2 border-dashed border-white/5 rounded-full"
                    style={{ animation: `drum-spin ${2 / (1 + progress)}s linear infinite` }}
                ></div>
            </div>

            {/* Extraction Tube (Only visible when extracting or revealed) */}
            <div className={`
                absolute top-full left-1/2 -translate-x-1/2 w-12 h-24 border-x-4 border-slate-700/30 transition-all duration-1000
                ${phase === 'MIXING' ? 'opacity-0' : 'opacity-100'}
            `}>
                <div className="absolute bottom-0 w-full h-1 bg-amber-500/50 blur-md"></div>
            </div>
        </div>

        {/* WINNING BALL REVEAL */}
        <div className="h-48 flex flex-col items-center justify-center">
            {phase === 'EXTRACTING' && (
                <div className="flex flex-col items-center animate-bounce">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center justify-center border-4 border-white/20">
                        <span className="text-white font-black text-2xl animate-pulse">?</span>
                    </div>
                    <p className="text-amber-500 font-black text-[10px] mt-4 tracking-[0.4em] uppercase">Extracting...</p>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'ball-drop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group">
                        {/* Winning Ball */}
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-600 shadow-[0_0_80px_rgba(251,191,36,0.4)] border-[8px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8)_0%,transparent_50%)]"></div>
                            <span className="text-slate-900 text-6xl md:text-8xl font-black russo tracking-tighter drop-shadow-xl z-10">
                                {winningNumber}
                            </span>
                        </div>
                        
                        {/* God Ray Light */}
                        <div className="absolute -inset-20 bg-amber-500/20 blur-[60px] -z-10 animate-pulse"></div>
                    </div>

                    <div className="mt-8 text-center animate-reveal-slam-intense">
                        <h1 className="text-2xl md:text-5xl font-black text-white uppercase russo mb-2 tracking-widest">{gameName}</h1>
                        <p className="text-amber-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-8">Official Draw Result</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-12 py-3 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] russo text-sm tracking-widest"
                        >
                            <span className="relative z-10">CONTINUE</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Atmospheric Particles */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="absolute bg-white rounded-full animate-ping" style={{
                    width: '2px', height: '2px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 3 + 1}s`,
                    animationDelay: `${Math.random() * 2}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;