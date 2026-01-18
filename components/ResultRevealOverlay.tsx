import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "SEQUENCING MECHANICAL TURBINES...",
    "INITIATING 45-SECOND MIXING PHASE...",
    "VERIFYING TOTAL SPHERE TRANSPARENCY...",
    "MAXIMUM CHAMBER AGITATION ACTIVE...",
    "CALIBRATING SMALL HOLE EXIT PORT...",
    "IDENTIFYING DECLARED NUMBER...",
    "ISOLATING WINNING SPHERE FROM DRUM...",
    "READY FOR OFFICIAL DECLARATION..."
];

const PhysicalBall: React.FC<{ index: number, isMixing: boolean, isWinner?: boolean, isExtracted?: boolean }> = ({ index, isMixing, isWinner, isExtracted }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 48 : 34 + (index % 12); // Large format balls
        const delay = (index * -0.4) % 15;
        
        // Dynamic animation assignment
        let animation = '';
        if (isExtracted) {
            animation = 'extraction-chute 2.5s forwards cubic-bezier(0.5, 0, 0.5, 1)';
        } else if (isMixing) {
            const duration = 1.2 + (index % 2); // Chaotic bounce speed
            animation = `physics-storm ${duration}s ease-in-out ${delay}s infinite alternate`;
        } else {
            // Settling but still interacting (micro-movement)
            const duration = 2.5 + (index % 1.5);
            animation = `ball-settle ${duration}s ease-in-out forwards`;
        }
        
        // Initial random grid-like distribution to ensure they strike all sides
        const left = 10 + (index * 19) % 80;
        const top = 10 + (index * 23) % 70;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation,
            zIndex: isWinner ? 500 : Math.floor(Math.random() * 200),
            fontSize: `${size / 2.1}px`,
            opacity: 1,
            border: isWinner ? '4px solid white' : 'none',
            boxShadow: isWinner ? '0 0 40px rgba(251, 191, 36, 0.9), inset -4px -4px 10px rgba(0,0,0,0.8)' : 'inset -4px -4px 10px rgba(0,0,0,0.8), 0 8px 15px rgba(0,0,0,0.5)'
        } as React.CSSProperties;
    }, [index, isMixing, isWinner, isExtracted]);

    const num = useMemo(() => index.toString().padStart(2, '0'), [index]);

    return (
        <div className="lottery-ball-physics" style={style}>
            <span className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">{isWinner && !isExtracted ? '?' : num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'MIXING' | 'ISOLATION' | 'EXTRACTION' | 'REVEALED'>('MIXING');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const TOTAL_MIX_TIME = 45000; // Mandatory 45-second high-energy storm
  const ISOLATION_DELAY = 4000; // Time to settle and "find" the ball at the small hole
  const EXTRACTION_TIME = 4500; // Ball travel time

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let phraseInterval: ReturnType<typeof setInterval>;

    if (phase === 'MIXING') {
      progressInterval = setInterval(() => {
        setElapsed(prev => {
            if (prev >= TOTAL_MIX_TIME) {
                clearInterval(progressInterval);
                setPhase('ISOLATION');
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

    if (phase === 'ISOLATION') {
        const timer = setTimeout(() => {
            setPhase('EXTRACTION');
        }, ISOLATION_DELAY);
        return () => clearTimeout(timer);
    }

    if (phase === 'EXTRACTION') {
        const timer = setTimeout(() => {
            setShowFlash(true);
            setTimeout(() => {
                setPhase('REVEALED');
                setShowFlash(false);
            }, 250);
        }, EXTRACTION_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / TOTAL_MIX_TIME, 1);
  // Full volume of balls for complete transparency: 99 balls
  const balls = useMemo(() => Array.from({ length: 99 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Background Volumetric Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.2)_0%,transparent_70%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-[3000ms] ${phase === 'REVEALED' ? 'opacity-90' : 'opacity-20'} bg-amber-500/10 animate-pulse`}></div>
        {/* Physical Grit & Scanlines for Realism */}
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.6)_50%),linear-gradient(90deg,rgba(255,0,0,0.08),rgba(0,255,0,0.04),rgba(0,0,255,0.08))] bg-[length:100%_4px,4px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center">
        
        {/* Mechanical State Status */}
        <div className="mb-14 text-center w-full max-w-xl">
            <h3 className="text-sky-400 text-xs md:text-sm font-black tracking-[1.1em] uppercase mb-6 animate-pulse russo">
                {phase === 'REVEALED' ? 'DRAW CERTIFIED & VALIDATED' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-900 via-sky-500 to-cyan-100 transition-all duration-100 ease-linear shadow-[0_0_30px_rgba(56,189,248,0.7)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[11px] text-slate-500 font-black tracking-[0.4em] russo uppercase">
                <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${phase === 'REVEALED' ? 'bg-emerald-500' : 'bg-sky-500 animate-ping'}`}></span>
                    {phase === 'REVEALED' ? 'CONSENSUS REACHED' : '45-SEC STORM SYNC'}
                </span>
                <span className="text-sky-400">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE PRIMARY MECHANICAL DRUM (THE LARGE GLASS PORT) */}
        <div className="relative mb-24 flex flex-col items-center">
            
            {/* The Precision Exit Port Housing (Small Hole) */}
            <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 w-[420px] h-[340px] bg-gradient-to-t from-black via-slate-900 to-slate-800 border-x-[28px] border-slate-700 rounded-t-[160px] shadow-[0_80px_180px_rgba(0,0,0,1)]">
                {/* Volumetric Internal Light */}
                <div className="absolute top-14 left-1/2 -translate-x-1/2 w-72 h-14 bg-sky-400/20 rounded-full blur-3xl animate-pulse"></div>
                
                {/* THE SMALL HOLE (Precision Exit Port) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-20 exit-hole-rim border-x-4 border-slate-600 rounded-b-3xl flex items-center justify-center overflow-hidden">
                    <div className="w-20 h-1 bg-sky-400/40 rounded-full blur-sm"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1)_0%,transparent_80%)]"></div>
                </div>
            </div>
            
            {/* THE TRANSPARENT CHAMBER (LARGE VISUAL PORT) */}
            <div className={`
                w-80 h-80 md:w-[720px] md:h-[720px] rounded-full relative overflow-hidden glass-port-massive transition-all duration-[2000ms]
                ${phase === 'REVEALED' ? 'scale-90 opacity-20 rotate-[60deg] blur-2xl' : 'scale-100 rotate-0'}
            `}>
                {/* Internal High-Speed Agitator Vanes (Visuals only) */}
                <div className="absolute top-1/2 left-1/2 w-[96%] h-16 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full opacity-20" 
                     style={{ animation: `paddle-rotation ${0.3 / (0.1 + progress)}s linear infinite` }}></div>
                
                {/* CONTINUOUS VISIBLE INTERACTION: Balls always visible in background */}
                {balls.map(i => (
                    <PhysicalBall key={i} index={i} isMixing={phase === 'MIXING'} />
                ))}

                {/* THE ISOLATED DECLARED BALL: Transitions to small hole */}
                {(phase === 'ISOLATION' || phase === 'EXTRACTION') && (
                    <PhysicalBall 
                        index={parseInt(winningNumber) || 15} 
                        isMixing={false} 
                        isWinner={true} 
                        isExtracted={phase === 'EXTRACTION'} 
                    />
                )}

                {/* Industrial Drive Hub */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                    <div className="w-36 h-36 bg-slate-900 rounded-full border-[14px] border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex items-center justify-center">
                        <div className="w-12 h-12 bg-sky-500 rounded-full animate-pulse shadow-[0_0_40px_#0ea5e9] border-4 border-white/30"></div>
                    </div>
                </div>
            </div>

            {/* Precision Exit Chute (Clear Acrylic) */}
            <div className={`
                absolute top-[94%] left-1/2 -translate-x-1/2 w-32 h-80 bg-gradient-to-b from-white/20 via-sky-500/5 to-transparent border-x-[10px] border-white/10 transition-all duration-[1500ms]
                ${phase === 'MIXING' ? 'opacity-0 -translate-y-24' : 'opacity-100 translate-y-0'}
            `}>
                <div className="absolute bottom-0 w-full h-6 bg-sky-500 shadow-[0_0_60px_#0ea5e9] animate-pulse"></div>
                {/* Engineering Data Decals */}
                <div className="absolute top-10 left-full ml-8 whitespace-nowrap text-[11px] font-black text-sky-400 uppercase tracking-widest border-l-4 border-sky-500/30 pl-4">
                    CHUTE STATUS: ACTIVE<br/>
                    <span className="text-slate-500">ISOLATING SPHERE...</span>
                </div>
            </div>
        </div>

        {/* OFFICIAL DECLARATION THEATRE (THE REVEAL) */}
        <div className="h-[450px] flex flex-col items-center justify-center">
            {(phase === 'ISOLATION' || phase === 'EXTRACTION') && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-36 h-36 rounded-full bg-gradient-to-br from-amber-50 to-amber-600 shadow-[0_0_120px_rgba(251,191,36,0.8)] flex items-center justify-center border-[12px] border-white animate-bounce">
                        <span className="text-white font-black text-7xl russo drop-shadow-2xl">?</span>
                    </div>
                    <p className="mt-14 text-amber-500 font-black text-base tracking-[1.1em] uppercase animate-pulse russo">ANALYZING PORT RESULT</p>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'declaration-slam-premium 1.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-16">
                        {/* THE OFFICIAL DECLARED SPHERE */}
                        <div className="w-80 h-80 md:w-[560px] md:h-[560px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-950 shadow-[0_0_300px_rgba(251,191,36,0.7)] border-[36px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1)_0%,transparent_65%)]"></div>
                            <span className="text-slate-950 text-[14rem] md:text-[28rem] font-black russo tracking-tighter drop-shadow-[0_25px_25px_rgba(0,0,0,0.8)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            {/* Extreme Chrome Reflection Sweep */}
                            <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                                <div className="absolute top-0 h-full w-[45%] bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-45" 
                                     style={{ animation: 'shine-sweep 2s infinite ease-in-out' }}></div>
                            </div>
                        </div>
                        
                        {/* God Ray Volumetric Aura */}
                        <div className="absolute -inset-48 bg-amber-400/25 blur-[180px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-16 left-1/2 -translate-x-1/2 w-[500px] h-20 bg-black/90 blur-[60px] rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-8xl md:text-[12rem] font-black text-white uppercase russo mb-4 tracking-widest drop-shadow-[0_0_50px_rgba(56,189,248,0.5)] leading-none">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[1.4em] text-sm md:text-xl mb-20">SYSTEM CERTIFIED MARKET RESULT</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-32 py-8 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_120px_rgba(255,255,255,0.4)] russo text-3xl tracking-[0.4em]"
                        >
                            <span className="relative z-10">DISMISS DRAW</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-[800ms]"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Atmospheric Interaction Particles */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none opacity-80">
            {Array.from({ length: 120 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-200 rounded-full animate-ping" style={{
                    width: '4px', height: '4px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 1.2 + 0.3}s`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;