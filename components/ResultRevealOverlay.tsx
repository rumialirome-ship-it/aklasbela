import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "SEQUENCING MECHANICAL AGITATORS...",
    "INITIATING HIGH-VOLUME TURBULENCE...",
    "RANDOMIZING 100% TRANSPARENT CHAMBER...",
    "CALIBRATING EXTRACTION成员...",
    "IDENTIFYING WINNING SPHERE...",
    "SATELLITE SYNC: RESULT VERIFIED...",
    "CHANNELLING OFFICIAL BALL TO PORT...",
    "READY FOR DRAW DECLARATION..."
];

const ProLotteryBall: React.FC<{ index: number, intensity: number, isWinner?: boolean, isExiting?: boolean }> = ({ index, intensity, isWinner, isExiting }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 40 : 28 + (index % 15); // Large balls
        const delay = (index * -0.9) % 8;
        // Higher intensity speeds up the "storm"
        const duration = (1.2 + (index % 3)) / (1 + intensity * 1.5);
        
        // Random distribution across the massive port
        const left = 5 + (index * 19) % 90;
        const top = 5 + (index * 23) % 80;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation: isExiting ? 'extraction-sequence 2.5s forwards cubic-bezier(0.5, 0, 0.5, 1)' : `ball-storm-ultra ${duration}s ease-in-out ${delay}s infinite alternate`,
            zIndex: isWinner ? 200 : Math.floor(Math.random() * 100),
            fontSize: `${size / 2.2}px`,
            opacity: isExiting ? 1 : 0.95,
            border: isWinner ? '4px solid white' : 'none',
        } as React.CSSProperties;
    }, [index, intensity, isExiting, isWinner]);

    const num = useMemo(() => index.toString().padStart(2, '0'), [index]);

    return (
        <div className="lottery-ball-pro" style={style}>
            <span className="drop-shadow-2xl">{isWinner ? '?' : num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'MIXING' | 'EXTRACTION' | 'REVEALED'>('MIXING');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const TOTAL_MIX_TIME = 45000; // 45 seconds of agitation
  const EXTRACTION_TIME = 5500; // Time for the ball to travel out

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
      }, 5600);

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
            }, 200);
        }, EXTRACTION_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / TOTAL_MIX_TIME, 1);
  // Large visual port density
  const balls = useMemo(() => Array.from({ length: 90 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Dramatic Cinematic Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.3)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${phase === 'REVEALED' ? 'opacity-70' : 'opacity-30'} bg-amber-500 animate-pulse`}></div>
        {/* Machine CRT/Industrial Overlay */}
        <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_6px,6px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center">
        
        {/* Control Interface Status */}
        <div className="mb-12 text-center w-full max-w-xl">
            <h3 className="text-sky-400 text-xs md:text-sm font-black tracking-[1em] uppercase mb-6 animate-pulse russo">
                {phase === 'REVEALED' ? 'OFFICIAL RESULT DECLARED' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-3 w-full bg-slate-900/90 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-800 via-sky-400 to-cyan-100 transition-all duration-100 ease-linear shadow-[0_0_25px_rgba(56,189,248,0.9)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[11px] text-slate-400 font-black tracking-[0.2em] russo uppercase">
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> AGITATION ACTIVE</span>
                <span className="text-sky-500">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE LARGE MECHANICAL TUMBLER ASSEMBLY */}
        <div className="relative mb-20 flex flex-col items-center">
            
            {/* Massive Cast Steel Pedestal Base */}
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[350px] h-[300px] bg-gradient-to-t from-slate-950 via-slate-800 to-slate-900 border-x-[20px] border-slate-700 rounded-t-[120px] shadow-[0_50px_120px_rgba(0,0,0,1)]">
                {/* Internal LED Floodlight */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-sky-400/40 rounded-full blur-2xl animate-pulse"></div>
                {/* Small Precision Exit Port */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-16 bg-slate-950 border-x-4 border-slate-600 rounded-b-3xl shadow-inner overflow-hidden">
                    <div className="absolute inset-0 bg-sky-500/10 extraction-port-highlight"></div>
                </div>
            </div>
            
            {/* THE LARGE VISUAL PORT (THE DRUM) */}
            <div className={`
                w-80 h-80 md:w-[620px] md:h-[620px] rounded-full relative overflow-hidden visual-port-drum transition-all duration-1000
                ${phase === 'MIXING' ? 'scale-100 rotate-0' : 'scale-95 opacity-30 rotate-[30deg] blur-md'}
            `}>
                <div className="acrylic-edge-highlight"></div>
                
                {/* Rotating High-Speed Paddles */}
                <div className="absolute top-1/2 left-1/2 w-[90%] h-8 bg-gradient-to-r from-transparent via-white/10 to-transparent shadow-[0_0_30px_rgba(255,255,255,0.1)] rounded-full opacity-40" 
                     style={{ animation: `paddle-spin ${0.5 / (1 + progress)}s linear infinite` }}></div>
                <div className="absolute top-1/2 left-1/2 w-[90%] h-8 bg-gradient-to-r from-transparent via-white/10 to-transparent shadow-[0_0_30px_rgba(255,255,255,0.1)] rounded-full opacity-40" 
                     style={{ animation: `paddle-spin ${0.5 / (1 + progress)}s linear reverse infinite`, transform: 'translate(-50%, -50%) rotate(90deg)' }}></div>

                {/* The 'Storm' of Large Numbered Balls */}
                {phase === 'MIXING' && balls.map(i => (
                    <ProLotteryBall key={i} index={i} intensity={progress} />
                ))}

                {/* The Captured Result Ball transition */}
                {phase === 'EXTRACTION' && (
                    <ProLotteryBall index={parseInt(winningNumber) || 9} intensity={1} isWinner={true} isExiting={true} />
                )}

                {/* Industrial Center Drive Shaft */}
                <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                    <div className="w-24 h-24 bg-slate-800 rounded-full border-[10px] border-slate-700 shadow-2xl flex items-center justify-center">
                        <div className="w-8 h-8 bg-sky-500 rounded-full animate-pulse shadow-[0_0_20px_#0ea5e9] border-2 border-white/50"></div>
                    </div>
                </div>
            </div>

            {/* Polished Acrylic Collection Tube */}
            <div className={`
                absolute top-[92%] left-1/2 -translate-x-1/2 w-24 h-64 bg-gradient-to-b from-white/30 via-white/5 to-transparent border-x-[6px] border-white/20 transition-all duration-1000
                ${phase === 'MIXING' ? 'opacity-0 -translate-y-16' : 'opacity-100 translate-y-0'}
            `}>
                <div className="absolute bottom-0 w-full h-4 bg-sky-500 shadow-[0_0_40px_#0ea5e9] animate-pulse"></div>
                {/* Port Label */}
                <div className="absolute top-4 left-full ml-4 whitespace-nowrap text-[9px] font-black text-sky-400 uppercase tracking-widest border-l border-sky-400/50 pl-2">
                    EXTRACTION UNIT 01
                </div>
            </div>
        </div>

        {/* OFFICIAL DECLARATION THEATRE */}
        <div className="h-[350px] flex flex-col items-center justify-center">
            {phase === 'EXTRACTION' && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 to-amber-600 shadow-[0_0_80px_rgba(251,191,36,0.8)] flex items-center justify-center border-[8px] border-white animate-bounce">
                        <span className="text-white font-black text-5xl russo drop-shadow-md">?</span>
                    </div>
                    <p className="mt-10 text-amber-500 font-black text-sm tracking-[0.8em] uppercase animate-pulse russo">ISOLATING WINNER</p>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'declaration-slam 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-12">
                        {/* THE LARGE DECLARED SPHERE */}
                        <div className="w-64 h-64 md:w-[450px] md:h-[450px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-900 shadow-[0_0_200px_rgba(251,191,36,0.6)] border-[24px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95)_0%,transparent_60%)]"></div>
                            <span className="text-slate-950 text-[10rem] md:text-[18rem] font-black russo tracking-tighter drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            {/* Cinematic Chrome Polish Sweep */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-2/3 h-full -skew-x-45" 
                                 style={{ animation: 'shine-sweep 2.2s infinite linear' }}></div>
                        </div>
                        
                        {/* Divine Volumetric Lighting */}
                        <div className="absolute -inset-32 bg-amber-400/25 blur-[120px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-12 left-1/2 -translate-x-1/2 w-80 h-16 bg-black/80 blur-[40px] rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-6xl md:text-9xl font-black text-white uppercase russo mb-3 tracking-widest drop-shadow-[0_0_30px_rgba(56,189,248,0.5)]">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[1em] text-[11px] md:text-base mb-14">CERTIFIED MARKET RESULT</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-24 py-6 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_80px_rgba(255,255,255,0.3)] russo text-xl tracking-[0.2em]"
                        >
                            <span className="relative z-10">ACCEPT RESULT</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-600"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Atmospheric High-Agitation Particles */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none opacity-60">
            {Array.from({ length: 60 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-400 rounded-full animate-ping" style={{
                    width: '3px', height: '3px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 2 + 0.5}s`,
                    animationDelay: `${Math.random() * 1}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;