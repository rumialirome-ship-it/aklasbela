import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "ACTIVATING HIGH-VELOCITY AIR TURBINES...",
    "INITIATING 45-SECOND TUMBLING STORM...",
    "VERIFYING TOTAL SPHERE TRANSPARENCY...",
    "CHAOTIC AGITATION AT MAXIMUM CAPACITY...",
    "ENGAGING PRECISION SUCTION MEMBER...",
    "ISOLATING DECLARED RESULT BALL...",
    "SATELLITE SYNC: MARKET VALIDATED...",
    "INITIATING OVERHEAD PIPE DELIVERY..."
];

const PhysicsBall: React.FC<{ index: number, phase: 'STORM' | 'CAPTURE' | 'LIFT' | 'REVEALED', isWinner?: boolean }> = ({ index, phase, isWinner }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 54 : 36 + (index % 12); 
        const delay = (index * -0.35) % 18;
        
        let animation = '';
        let zIndex = Math.floor(Math.random() * 200);

        if (isWinner && phase === 'LIFT') {
            animation = 'vertical-lift-extraction 3s forwards cubic-bezier(0.5, 0, 0.5, 1)';
            zIndex = 600;
        } else if (isWinner && phase === 'CAPTURE') {
            animation = 'suction-capture 1.5s forwards ease-in';
            zIndex = 600;
        } else if (phase === 'STORM') {
            const duration = 1.0 + (index % 1.5);
            animation = `storm-physics-chaotic ${duration}s ease-in-out ${delay}s infinite alternate`;
        } else {
            // Background balls settling realistically
            const duration = 2.0 + (index % 2);
            animation = `ball-settle-active ${duration}s ease-out forwards`;
        }
        
        // Random spatial grid for storm surface interaction
        const left = 10 + (index * 23) % 80;
        const top = 10 + (index * 29) % 70;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation,
            zIndex,
            fontSize: `${size / 2.0}px`,
            border: isWinner ? '5px solid white' : 'none',
            boxShadow: isWinner ? '0 0 50px rgba(251, 191, 36, 1), inset -5px -5px 15px rgba(0,0,0,0.8)' : 'inset -5px -5px 15px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.6)'
        } as React.CSSProperties;
    }, [index, phase, isWinner]);

    const num = useMemo(() => index.toString().padStart(2, '0'), [index]);

    return (
        <div className="lottery-ball-storm" style={style}>
            <span className="drop-shadow-[0_6px_6px_rgba(0,0,0,0.7)]">{isWinner && phase !== 'REVEALED' && phase !== 'LIFT' ? '?' : num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STORM' | 'CAPTURE' | 'LIFT' | 'REVEALED'>('STORM');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const STORM_TIME = 45000; // 45s storm
  const CAPTURE_TIME = 2500; // 2.5s capture at base
  const LIFT_TIME = 4000;    // 4s travel through pipe

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let phraseInterval: ReturnType<typeof setInterval>;

    if (phase === 'STORM') {
      progressInterval = setInterval(() => {
        setElapsed(prev => {
            if (prev >= STORM_TIME) {
                clearInterval(progressInterval);
                setPhase('CAPTURE');
                return STORM_TIME;
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

    if (phase === 'CAPTURE') {
        const timer = setTimeout(() => {
            setPhase('LIFT');
        }, CAPTURE_TIME);
        return () => clearTimeout(timer);
    }

    if (phase === 'LIFT') {
        const timer = setTimeout(() => {
            setShowFlash(true);
            setTimeout(() => {
                setPhase('REVEALED');
                setShowFlash(false);
            }, 300);
        }, LIFT_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / STORM_TIME, 1);
  const backgroundBalls = useMemo(() => Array.from({ length: 99 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Background Cinematic FX */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.3)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-[4000ms] ${phase === 'REVEALED' ? 'opacity-100' : 'opacity-30'} bg-amber-500/10 animate-pulse`}></div>
        {/* CRT Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.7)_50%),linear-gradient(90deg,rgba(255,0,0,0.15),rgba(0,255,0,0.08),rgba(0,0,255,0.15))] bg-[length:100%_6px,6px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center h-full justify-center">
        
        {/* Overhead Delivery Pipe (Top Center) */}
        <div className={`
            absolute top-0 left-1/2 -translate-x-1/2 w-28 md:w-36 h-[35vh] md:h-[40vh] top-delivery-pipe transition-all duration-[2000ms]
            ${phase === 'STORM' ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'}
        `}>
            <div className="absolute bottom-0 w-full h-1 bg-sky-400 shadow-[0_0_40px_#0ea5e9]"></div>
            <div className="absolute top-10 left-full ml-4 whitespace-nowrap text-[9px] md:text-[11px] font-black text-sky-400 uppercase tracking-widest border-l-4 border-sky-500/30 pl-3">
                VERTICAL DELIVERY STATUS<br/>
                <span className="text-slate-500">{phase === 'LIFT' ? 'EXTRACTING SPHERE...' : 'READY'}</span>
            </div>
        </div>

        {/* Phase / Progress Header */}
        <div className="absolute top-12 md:top-20 text-center w-full max-w-xl px-6">
            <h3 className="text-sky-400 text-[10px] md:text-sm font-black tracking-[1.2em] uppercase mb-5 animate-pulse russo">
                {phase === 'REVEALED' ? 'CONSENSUS VALIDATED' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-900 via-sky-500 to-cyan-100 transition-all duration-100 ease-linear shadow-[0_0_30px_rgba(56,189,248,0.9)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[10px] md:text-[11px] text-slate-500 font-black tracking-[0.5em] russo uppercase">
                <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${phase === 'REVEALED' ? 'bg-emerald-500' : 'bg-sky-500 animate-ping'}`}></span>
                    {phase === 'REVEALED' ? 'LOCKED' : '45S STORM'}
                </span>
                <span className="text-sky-400">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE PRIMARY MECHANICAL DRUM (LARGE VISUAL PORT) */}
        <div className="relative mt-20 mb-12 flex flex-col items-center">
            
            {/* The Precision Suction Member (Capture Base) */}
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[300px] md:w-[450px] h-[250px] md:h-[350px] bg-gradient-to-t from-black via-slate-900 to-slate-800 border-x-[20px] md:border-x-[32px] border-slate-700 rounded-t-[140px] md:rounded-t-[180px] shadow-[0_80px_180px_rgba(0,0,0,1)] suction-base-member">
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 h-16 bg-sky-400/20 rounded-full blur-3xl animate-pulse"></div>
                
                {/* THE SUCTION PORT (Base Aperture) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 md:w-44 h-16 md:h-24 bg-slate-950 border-x-4 border-slate-600 rounded-b-[40px] flex items-center justify-center overflow-hidden">
                    <div className="w-20 h-1 bg-sky-500/40 rounded-full blur-sm"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15)_0%,transparent_80%)]"></div>
                </div>
            </div>
            
            {/* THE TRANSPARENT GLASS DRUM (MASSIVE VISUAL PORT) */}
            <div className={`
                w-80 h-80 md:w-[680px] md:h-[680px] lg:w-[760px] lg:h-[760px] rounded-full relative overflow-hidden glass-port-drum transition-all duration-[3000ms]
                ${phase === 'REVEALED' ? 'scale-75 opacity-10 rotate-[90deg] blur-[60px]' : 'scale-100 rotate-0'}
            `}>
                {/* Visual Internal Air Turbine Vanes */}
                <div className="absolute top-1/2 left-1/2 w-[98%] h-20 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full opacity-30" 
                     style={{ animation: `turbine-spin ${0.2 / (0.05 + progress)}s linear infinite` }}></div>
                
                {/* CONTINUOUS VISIBLE INTERACTION: Balls always visible in background */}
                {backgroundBalls.map(i => (
                    <PhysicsBall key={i} index={i} phase={phase} />
                ))}

                {/* THE EXTRACTED BALL: Suction -> Vertical Lift Journey */}
                {(phase === 'CAPTURE' || phase === 'LIFT') && (
                    <PhysicsBall 
                        index={parseInt(winningNumber) || 7} 
                        phase={phase}
                        isWinner={true} 
                    />
                )}

                {/* Heavy Industrial Hub Component */}
                <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                    <div className="w-28 h-28 md:w-44 md:h-44 bg-slate-900 rounded-full border-[12px] md:border-[18px] border-slate-800 shadow-[0_0_80px_rgba(0,0,0,1)] flex items-center justify-center">
                        <div className="w-8 h-8 md:w-14 md:h-14 bg-sky-500 rounded-full animate-pulse shadow-[0_0_60px_#0ea5e9] border-[6px] border-white/40"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* OFFICIAL REVEAL THEATRE (THE SLAM DECLARATION) */}
        <div className="absolute h-full flex flex-col items-center justify-center pointer-events-none">
            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center pointer-events-auto" style={{ animation: 'result-slam-reveal-v2 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-14">
                        {/* THE OFFICIAL DECLARED SPHERE */}
                        <div className="w-80 h-80 md:w-[580px] md:h-[580px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-950 shadow-[0_0_350px_rgba(251,191,36,0.8)] border-[30px] md:border-[44px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1)_0%,transparent_65%)]"></div>
                            <span className="text-slate-950 text-[14rem] md:text-[32rem] font-black russo tracking-tighter drop-shadow-[0_30px_30px_rgba(0,0,0,0.8)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            {/* Cinematic High-Reflectance Sweep */}
                            <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                                <div className="absolute top-0 h-full w-[45%] bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-45" 
                                     style={{ animation: 'shine-sweep 2.2s infinite ease-in-out' }}></div>
                            </div>
                        </div>
                        
                        {/* God-Ray Volumetric Lighting */}
                        <div className="absolute -inset-64 bg-amber-400/25 blur-[220px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-16 left-1/2 -translate-x-1/2 w-[600px] h-24 bg-black/95 blur-[60px] rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-7xl md:text-[14rem] font-black text-white uppercase russo mb-6 tracking-widest drop-shadow-[0_0_60px_rgba(56,189,248,0.6)] leading-none">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[1.6em] text-xs md:text-2xl mb-24">SYSTEM CERTIFIED MARKET RESULT</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-32 py-8 md:px-44 md:py-10 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_150px_rgba(255,255,255,0.4)] russo text-2xl md:text-4xl tracking-[0.4em]"
                        >
                            <span className="relative z-10">DISMISS DRAW</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-[900ms]"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* High-Agitation Atmospheric Interaction Particles */}
      {phase === 'STORM' && (
        <div className="absolute inset-0 pointer-events-none opacity-90">
            {Array.from({ length: 150 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-200 rounded-full animate-ping" style={{
                    width: '4px', height: '4px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 1.0 + 0.2}s`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;