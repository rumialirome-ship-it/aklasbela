import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "ENGAGING MECHANICAL TUMBLER...",
    "ROTATING 100% TRANSPARENT GLOBE...",
    "AGITATING ENTRIES FOR FAIRNESS...",
    "CALIBRATING EXTRACTION PORT...",
    "IDENTIFYING WINNING SPHERE...",
    "SATELLITE SYNCING RESULT...",
    "ISOLATING OFFICIAL BALL...",
    "READY TO DECLARE WINNER..."
];

const TumblingBall: React.FC<{ index: number, intensity: number, isWinner?: boolean, isExiting?: boolean }> = ({ index, intensity, isWinner, isExiting }) => {
    const style = useMemo(() => {
        const color = BALL_COLORS[index % BALL_COLORS.length];
        const size = 18 + (index % 10);
        const delay = (index * -0.7) % 5;
        const duration = (2 + (index % 3)) / (1 + intensity);
        
        // Random starting positions within the globe
        const left = 20 + (index * 7) % 60;
        const top = 20 + (index * 9) % 50;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation: isExiting ? 'winner-extraction 1.5s forwards ease-in' : `ball-tumble ${duration}s ease-in-out ${delay}s infinite alternate`,
            zIndex: isWinner ? 50 : Math.floor(Math.random() * 20),
            fontSize: `${size / 2.2}px`,
            opacity: isExiting ? 1 : 0.85
        } as React.CSSProperties;
    }, [index, intensity, isExiting, isWinner]);

    const num = useMemo(() => index.toString().padStart(2, '0'), [index]);

    return (
        <div className="lottery-ball-mechanical" style={style}>
            {isWinner ? '?' : num}
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'MIXING' | 'EXTRACTION' | 'REVEALED'>('MIXING');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const TOTAL_MIX_TIME = 45000; // 45 seconds of agitation
  const EXTRACTION_TIME = 4000; // 4 seconds of picking the ball

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let phraseInterval: ReturnType<typeof setInterval>;

    if (phase === 'MIXING') {
      progressInterval = setInterval(() => {
        setElapsed(prev => {
            if (prev >= TOTAL_MIX_TIME) {
                clearInterval(progressInterval);
                setPhase('EXTRACTION');
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

    if (phase === 'EXTRACTION') {
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
  // Generate 60 numbered balls for the tumbler
  const balls = useMemo(() => Array.from({ length: 60 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Dynamic Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${phase === 'REVEALED' ? 'opacity-40' : 'opacity-10'} bg-amber-500 animate-pulse`}></div>
        {/* Machine Scanlines */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_3px,3px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center">
        
        {/* Header Status Bar */}
        <div className="mb-12 text-center w-full max-w-md">
            <h3 className="text-sky-400 text-[10px] md:text-xs font-black tracking-[0.8em] uppercase mb-4 animate-pulse russo">
                {phase === 'REVEALED' ? 'VALIDATED SELECTION' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5 relative p-0.5">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(56,189,248,0.5)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-slate-500 font-black tracking-widest russo uppercase">
                <span>Mechanical Sync</span>
                <span className="text-sky-500">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE MECHANICAL TUMBLER MACHINE */}
        <div className="relative mb-12 flex flex-col items-center">
            
            {/* Pedestal Structure */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-64 h-48 bg-gradient-to-t from-slate-900 to-slate-800 border-x-[12px] border-slate-700 rounded-t-[80px] shadow-2xl">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-sky-500/20 rounded-full blur-md"></div>
                {/* Extraction Pipe Opening */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-10 bg-slate-950 border-x-4 border-slate-700 rounded-b-xl"></div>
            </div>
            
            {/* The Main Glass Globe */}
            <div className={`
                w-72 h-72 md:w-[480px] md:h-[480px] rounded-full relative overflow-hidden glass-globe transition-all duration-1000
                ${phase === 'MIXING' ? 'scale-100 rotate-0' : 'scale-90 opacity-40 rotate-[20deg] blur-sm'}
            `}>
                <div className="globe-shine"></div>
                
                {/* Internal Rotating Cage Vanes (Simulated with rotating border) */}
                <div className="absolute inset-8 border-[2px] border-dashed border-white/10 rounded-full" 
                     style={{ animation: `drum-rotation ${4 / (1 + progress)}s linear infinite` }}></div>

                {/* Tumbling Balls */}
                {phase === 'MIXING' && balls.map(i => (
                    <TumblingBall key={i} index={i} intensity={progress} />
                ))}

                {/* The "Picked" Ball (Only during extraction) */}
                {phase === 'EXTRACTION' && (
                    <TumblingBall index={parseInt(winningNumber) || 7} intensity={1} isWinner={true} isExiting={true} />
                )}

                {/* Center Hub */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-12 h-12 bg-slate-700 rounded-full border-4 border-white/20 shadow-2xl"></div>
                </div>
            </div>

            {/* Clear Extraction Tube */}
            <div className={`
                absolute top-[92%] left-1/2 -translate-x-1/2 w-16 h-40 bg-gradient-to-b from-white/10 to-transparent border-x-2 border-white/20 transition-all duration-700
                ${phase === 'MIXING' ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'}
            `}>
                <div className="absolute bottom-0 w-full h-1.5 bg-sky-500 shadow-[0_0_20px_#0ea5e9] animate-pulse"></div>
            </div>
        </div>

        {/* WINNING REVEAL ZONE */}
        <div className="h-64 flex flex-col items-center justify-center">
            {phase === 'EXTRACTION' && (
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_50px_rgba(251,191,36,0.6)] flex items-center justify-center border-4 border-white animate-bounce">
                        <span className="text-white font-black text-2xl russo">?</span>
                    </div>
                    <p className="mt-4 text-amber-500 font-black text-[10px] tracking-[0.4em] uppercase animate-pulse">Retrieving Pick...</p>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'ball-slam-reveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-8">
                        {/* OFFICIAL WINNING BALL */}
                        <div className="w-44 h-44 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-700 shadow-[0_0_120px_rgba(251,191,36,0.5)] border-[12px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8)_0%,transparent_60%)]"></div>
                            <span className="text-slate-950 text-8xl md:text-[11rem] font-black russo tracking-tighter drop-shadow-2xl z-10">
                                {winningNumber}
                            </span>
                            {/* Metallic Shine Sweep */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 h-full -skew-x-45" 
                                 style={{ animation: 'shine-sweep 3s infinite linear' }}></div>
                        </div>
                        
                        {/* Holy Aura */}
                        <div className="absolute -inset-20 bg-amber-500/20 blur-[80px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-6 left-1/2 -translate-x-1/2 w-48 h-10 bg-black/60 blur-2xl rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-4xl md:text-7xl font-black text-white uppercase russo mb-1 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{gameName}</h1>
                        <p className="text-amber-400 font-bold uppercase tracking-[0.4em] text-xs md:text-sm mb-10">Certified Draw Selection</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-16 py-4 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] russo text-sm tracking-widest"
                        >
                            <span className="relative z-10">DISMISS DRAW</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Atmospheric Particles */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
            {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="absolute bg-white rounded-full animate-ping" style={{
                    width: '1px', height: '1px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 4 + 2}s`,
                    animationDelay: `${Math.random() * 2}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;