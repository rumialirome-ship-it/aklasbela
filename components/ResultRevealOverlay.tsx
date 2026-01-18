import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const TENSION_PHRASES = [
    "INITIALIZING CAGE ROTATION...",
    "RANDOMLY MIXING 100 ENTRIES...",
    "VERIFYING BLOCKCHAIN SEED...",
    "SYSTEM STABILIZING...",
    "CALCULATING PHYSICS PATH...",
    "IDENTIFYING WINNING SPHERE...",
    "LOCKING EXTRACTION CHAMBER...",
    "RELEASING OFFICIAL RESULT..."
];

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const LotteryDrumBall: React.FC<{ index: number, isMixing: boolean, intensity: number }> = ({ index, isMixing, intensity }) => {
    const style = useMemo(() => {
        const color = BALL_COLORS[index % BALL_COLORS.length];
        const size = Math.random() * 12 + 18; // More uniform but varied
        const delay = Math.random() * -10;
        const duration = (Math.random() * 3 + 2) / (1 + intensity * 1.5);
        const left = 15 + Math.random() * 70;
        const top = 20 + Math.random() * 60;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation: isMixing ? `ball-swirl ${duration}s ease-in-out ${delay}s infinite` : 'none',
            opacity: 0.9,
            zIndex: Math.floor(Math.random() * 20),
            fontSize: `${size / 2.5}px`
        } as React.CSSProperties;
    }, [index, isMixing, intensity]);

    const numDisplay = useMemo(() => Math.floor(Math.random() * 100).toString().padStart(2, '0'), []);

    return <div className="lottery-ball-3d" style={style}>{numDisplay}</div>;
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'MIXING' | 'EXTRACTING' | 'REVEALED'>('MIXING');
  const [elapsed, setElapsed] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const TOTAL_MIX_TIME = 45000; // 45 seconds exactly
  const EXTRACTION_TIME = 5000; // 5 seconds cinematic extraction

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
      }, 5600); // Cycles through phrases

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
            }, 200);
        }, EXTRACTION_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / TOTAL_MIX_TIME, 1);
  const balls = useMemo(() => Array.from({ length: 60 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Background Lighting Layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-[100vh] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.2)_0%,transparent_70%)] transition-opacity duration-1000 ${phase === 'REVEALED' ? 'opacity-30' : 'opacity-100'}`}></div>
        <div className={`absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent`}></div>
        {/* Dynamic Scanline */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-6xl px-4 flex flex-col items-center">
        
        {/* Top Branding & Status */}
        <div className="mb-8 text-center">
            <h3 className="text-sky-400 text-xs font-black tracking-[0.8em] uppercase mb-3 animate-pulse russo">
                {phase === 'REVEALED' ? 'OFFICIAL RESULT VALIDATED' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-2 w-72 md:w-[500px] bg-slate-900/80 rounded-full mx-auto overflow-hidden border border-white/5 relative p-0.5">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(56,189,248,0.6)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between w-72 md:w-[500px] mx-auto mt-2 text-[10px] text-slate-500 font-black tracking-widest russo">
                <span>SECURE SYNC</span>
                <span className="text-sky-500">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE GIANT GLASS POT */}
        <div className="relative mb-12 flex flex-col items-center">
            
            {/* Pedestal Base */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-t from-slate-800 to-slate-950 border-x-8 border-slate-700 rounded-t-[100px] shadow-2xl">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-sky-500/20 rounded-full blur-md"></div>
            </div>
            
            {/* The Huge Glass Sphere */}
            <div className={`
                w-80 h-80 md:w-[500px] md:h-[500px] rounded-full border-[10px] border-white/10 relative overflow-hidden glass-pot-glow transition-all duration-1000
                ${phase === 'MIXING' ? 'scale-100 rotate-0' : 'scale-90 opacity-40 rotate-[15deg] blur-sm'}
                bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15)_0%,rgba(56,189,248,0.05)_100%)]
            `}>
                {/* Glass Highlights */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[10%] left-[15%] w-1/4 h-1/4 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-[10%] right-[15%] w-1/3 h-1/3 bg-sky-500/5 rounded-full blur-3xl"></div>
                    {/* Shimmer Sweep */}
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-1/2 h-full skew-x-[-30deg]" style={{ animation: 'glass-shimmer 3s infinite' }}></div>
                    </div>
                </div>

                {/* Mixing Balls */}
                {phase === 'MIXING' && balls.map(i => (
                    <LotteryDrumBall key={i} index={i} isMixing={true} intensity={progress} />
                ))}

                {/* Central Mechanism */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <div className="w-1/2 h-1/2 border-[20px] border-dotted border-white/20 rounded-full" style={{ animation: `drum-spin ${3 / (1 + progress)}s linear infinite` }}></div>
                </div>
            </div>

            {/* Extraction Pipe */}
            <div className={`
                absolute top-[90%] left-1/2 -translate-x-1/2 w-20 h-48 bg-gradient-to-b from-transparent via-white/5 to-white/10 border-x-4 border-white/10 transition-all duration-1000
                ${phase === 'MIXING' ? 'opacity-0 -translate-y-20' : 'opacity-100 translate-y-0'}
            `}>
                <div className="absolute bottom-0 w-full h-2 bg-sky-500 shadow-[0_0_20px_#0ea5e9] animate-pulse"></div>
            </div>
        </div>

        {/* WINNING REVEAL DISPLAY AREA */}
        <div className="h-64 flex flex-col items-center justify-center">
            {phase === 'EXTRACTING' && (
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_50px_rgba(251,191,36,0.6)] flex items-center justify-center border-8 border-white animate-bounce">
                        <span className="text-white font-black text-3xl russo">?</span>
                    </div>
                    <h4 className="mt-6 text-amber-500 font-black text-sm tracking-[0.5em] uppercase animate-pulse russo">EXTRACTING WINNER</h4>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'ball-drop-cinematic 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-8">
                        {/* THE WINNING BALL */}
                        <div className="w-40 h-40 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-700 shadow-[0_0_120px_rgba(251,191,36,0.5)] border-[12px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8)_0%,transparent_60%)]"></div>
                            <span className="text-slate-900 text-7xl md:text-9xl font-black russo tracking-tighter drop-shadow-2xl z-10">
                                {winningNumber}
                            </span>
                            {/* Inner Shine Sweep */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 h-full skew-x-[-45deg]" style={{ animation: 'glass-shimmer 2s infinite' }}></div>
                        </div>
                        
                        {/* Aura Glow */}
                        <div className="absolute -inset-16 bg-amber-500/20 blur-[80px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/40 blur-xl rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-4xl md:text-7xl font-black text-white uppercase russo mb-1 tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{gameName}</h1>
                        <p className="text-amber-400 font-bold uppercase tracking-[0.5em] text-xs md:text-sm mb-10">THE GOLD STANDARD RESULTS</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-16 py-4 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] russo text-base tracking-widest"
                        >
                            <span className="relative z-10">BACK TO MARKET</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Cinematic Particulates */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="absolute bg-white rounded-full opacity-20" style={{
                    width: '1px', height: '1px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `ball-swirl ${Math.random() * 10 + 5}s linear infinite`,
                    animationDelay: `${Math.random() * -10}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;