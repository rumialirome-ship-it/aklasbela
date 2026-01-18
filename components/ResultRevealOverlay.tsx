import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "ACTIVATING HIGH-SPEED TURBINE...",
    "MIXING LARGE FORMAT SPHERES...",
    "MAXIMUM AGITATION ENGAGED...",
    "VERIFYING MECHANICAL SELECTION...",
    "EXTRACTION PORT PREPARING...",
    "ISOLATING OFFICIAL RESULT BALL...",
    "SATELLITE UPLINK CONFIRMED...",
    "READY TO DECLARE WINNER..."
];

const TumblingBall: React.FC<{ index: number, intensity: number, isWinner?: boolean, isExiting?: boolean }> = ({ index, intensity, isWinner, isExiting }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 35 : 24 + (index % 12);
        const delay = (index * -1.2) % 6;
        // High intensity = faster animations
        const duration = (1.5 + (index % 2.5)) / (1 + intensity * 1.2);
        
        // Dynamic initial offset for the "storm" effect - balls hit every surface
        const left = 10 + (index * 13) % 80;
        const top = 10 + (index * 17) % 70;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation: isExiting ? 'winner-extraction-path 2s forwards cubic-bezier(0.4, 0, 0.2, 1)' : `ball-storm ${duration}s ease-in-out ${delay}s infinite alternate`,
            zIndex: isWinner ? 100 : Math.floor(Math.random() * 50),
            fontSize: `${size / 2.2}px`,
            opacity: isExiting ? 1 : 0.9,
            border: isWinner ? '3px solid white' : 'none',
        } as React.CSSProperties;
    }, [index, intensity, isExiting, isWinner]);

    const num = useMemo(() => index.toString().padStart(2, '0'), [index]);

    return (
        <div className="lottery-ball-mechanical" style={style}>
            <span className="drop-shadow-lg">{isWinner ? '?' : num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'MIXING' | 'EXTRACTION' | 'REVEALED'>('MIXING');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const TOTAL_MIX_TIME = 45000; // 45 seconds of heavy mechanical agitation
  const EXTRACTION_TIME = 5000; // 5 seconds of cinematic ball travel

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
            }, 180);
        }, EXTRACTION_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / TOTAL_MIX_TIME, 1);
  // Generate 80 numbered balls for a dense, high-energy visual experience
  const balls = useMemo(() => Array.from({ length: 80 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Dynamic Dramatic Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.25)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${phase === 'REVEALED' ? 'opacity-60' : 'opacity-20'} bg-amber-500 animate-pulse`}></div>
        {/* CRT Scanline / Mechanical Overlay */}
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.08),rgba(0,255,0,0.04),rgba(0,0,255,0.08))] bg-[length:100%_4px,4px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-6xl px-4 flex flex-col items-center">
        
        {/* Status Terminal */}
        <div className="mb-14 text-center w-full max-w-lg">
            <h3 className="text-sky-400 text-xs md:text-sm font-black tracking-[0.9em] uppercase mb-5 animate-pulse russo">
                {phase === 'REVEALED' ? 'SYSTEMS STABLE - RESULT LOCKED' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 relative p-0.5">
                <div 
                    className="h-full bg-gradient-to-r from-blue-700 via-sky-400 to-cyan-200 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(56,189,248,0.8)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-black tracking-[0.2em] russo uppercase">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> High-Agitation Phase</span>
                <span className="text-sky-500">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE GIANT MECHANICAL TUMBLER */}
        <div className="relative mb-16 flex flex-col items-center">
            
            {/* Massive Steel Pedestal */}
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-80 h-64 bg-gradient-to-t from-slate-950 via-slate-800 to-slate-900 border-x-[16px] border-slate-700 rounded-t-[100px] shadow-[0_40px_100px_rgba(0,0,0,0.9)]">
                {/* Internal Glow from bottom LED */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-6 bg-sky-400/30 rounded-full blur-xl animate-pulse"></div>
                {/* Precision Exit Port Housing */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-12 bg-slate-950 border-x-4 border-slate-600 rounded-b-2xl shadow-inner">
                    <div className="absolute inset-0 extraction-port-highlight opacity-50"></div>
                </div>
            </div>
            
            {/* The Main High-Visibility Globe */}
            <div className={`
                w-80 h-80 md:w-[560px] md:h-[560px] rounded-full relative overflow-hidden glass-globe-premium transition-all duration-1000
                ${phase === 'MIXING' ? 'scale-100 rotate-0' : 'scale-90 opacity-40 rotate-[25deg] blur-sm'}
            `}>
                <div className="acrylic-edge"></div>
                <div className="globe-shine"></div>
                
                {/* Rotating Inner Vanes/Turbine (Visual Only) */}
                <div className="absolute inset-10 border-[6px] border-dashed border-white/5 rounded-full" 
                     style={{ animation: `drum-rotation ${2.5 / (1 + progress)}s linear infinite` }}></div>
                <div className="absolute inset-[30%] border-[2px] border-white/5 rounded-full" 
                     style={{ animation: `drum-rotation ${5 / (1 + progress)}s linear reverse infinite` }}></div>

                {/* The 'Storm' of Balls */}
                {phase === 'MIXING' && balls.map(i => (
                    <TumblingBall key={i} index={i} intensity={progress} />
                ))}

                {/* The Specific Winning Ball being Channeled */}
                {phase === 'EXTRACTION' && (
                    <TumblingBall index={parseInt(winningNumber) || 8} intensity={1} isWinner={true} isExiting={true} />
                )}

                {/* Heavy Duty Hub Component */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                    <div className="w-20 h-20 bg-slate-800 rounded-full border-8 border-slate-700 shadow-2xl flex items-center justify-center">
                        <div className="w-6 h-6 bg-sky-500 rounded-full animate-pulse shadow-[0_0_15px_#0ea5e9]"></div>
                    </div>
                </div>
            </div>

            {/* Clear Acrylic Display/Extraction Tube */}
            <div className={`
                absolute top-[90%] left-1/2 -translate-x-1/2 w-20 h-56 bg-gradient-to-b from-white/20 via-white/5 to-transparent border-x-4 border-white/10 transition-all duration-1000
                ${phase === 'MIXING' ? 'opacity-0 -translate-y-12' : 'opacity-100 translate-y-0'}
            `}>
                <div className="absolute bottom-0 w-full h-3 bg-sky-400 shadow-[0_0_30px_#0ea5e9] animate-pulse"></div>
            </div>
        </div>

        {/* WINNING REVEAL DECLARATION AREA */}
        <div className="h-72 flex flex-col items-center justify-center">
            {phase === 'EXTRACTION' && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_60px_rgba(251,191,36,0.7)] flex items-center justify-center border-[6px] border-white animate-bounce">
                        <span className="text-white font-black text-4xl russo">?</span>
                    </div>
                    <p className="mt-8 text-amber-500 font-black text-xs tracking-[0.6em] uppercase animate-pulse russo">ISOLATING WINNING SPHERE</p>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'ball-slam-reveal 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-10">
                        {/* LARGE DECLARED WINNING BALL */}
                        <div className="w-52 h-52 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-800 shadow-[0_0_150px_rgba(251,191,36,0.6)] border-[16px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9)_0%,transparent_60%)]"></div>
                            <span className="text-slate-950 text-9xl md:text-[14rem] font-black russo tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-10">
                                {winningNumber}
                            </span>
                            {/* Extreme Metallic Shine Sweep */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 h-full -skew-x-45" 
                                 style={{ animation: 'shine-sweep 2.5s infinite linear' }}></div>
                        </div>
                        
                        {/* Divine Aura Lighting */}
                        <div className="absolute -inset-24 bg-amber-400/30 blur-[100px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-10 left-1/2 -translate-x-1/2 w-64 h-12 bg-black/70 blur-3xl rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-5xl md:text-8xl font-black text-white uppercase russo mb-2 tracking-widest drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[0.8em] text-[10px] md:text-sm mb-12">OFFICIAL DRAW DECLARATION</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-20 py-5 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_60px_rgba(255,255,255,0.25)] russo text-lg tracking-[0.2em]"
                        >
                            <span className="relative z-10">DISMISS RESULT</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* High-Agitation Particle Effects */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none opacity-50">
            {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="absolute bg-white rounded-full animate-ping" style={{
                    width: '2px', height: '2px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 3 + 1}s`,
                    animationDelay: `${Math.random() * 1}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;