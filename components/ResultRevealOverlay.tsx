import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "ENGAGING HIGH-VELOCITY AIR TURBINES...",
    "INITIATING 45-SECOND TUMBLING STORM...",
    "VERIFYING TOTAL SPHERE TRANSPARENCY...",
    "CHAOTIC AGITATION SEQUENCE ACTIVE...",
    "CALIBRATING OVERHEAD SUCTION SYSTEM...",
    "ISOLATING DECLARED RESULT BALL...",
    "INITIATING VERTICAL PIPE ASCENT...",
    "EXECUTING FOREGROUND DRAW REVEAL..."
];

const MechanicalSphere: React.FC<{ 
    index: number, 
    phase: 'STORM' | 'SETTLE' | 'ASCENT' | 'DESCENT' | 'REVEALED', 
    isWinner?: boolean 
}> = ({ index, phase, isWinner }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 62 : 40 + (index % 12); 
        const delay = (index * -0.28) % 20;
        
        let animation = '';
        let zIndex = Math.floor(Math.random() * 200);

        if (isWinner) {
            if (phase === 'DESCENT') {
                animation = 'foreground-descent 3s forwards cubic-bezier(0.4, 0, 0.2, 1)';
                zIndex = 1000;
            } else if (phase === 'ASCENT') {
                animation = 'vertical-ascent 3s forwards ease-in';
                zIndex = 800;
            } else if (phase === 'STORM') {
                const duration = 1.0 + (index % 1.4);
                animation = `physics-storm-v4 ${duration}s ease-in-out ${delay}s infinite alternate`;
            } else if (phase === 'SETTLE') {
                animation = 'ball-rest-gentle 2s infinite alternate ease-in-out';
            }
        } else {
            if (phase === 'STORM') {
                const duration = 1.0 + (index % 1.4);
                animation = `physics-storm-v4 ${duration}s ease-in-out ${delay}s infinite alternate`;
            } else {
                // Background balls settle in lower port
                const settleDelay = (index * 0.05) % 1;
                animation = `ball-rest-gentle 2.5s ${settleDelay}s infinite alternate ease-in-out`;
            }
        }
        
        const left = 15 + (index * 29) % 70;
        const top = 15 + (index * 37) % 60;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation,
            zIndex,
            fontSize: `${size / 1.85}px`,
            border: isWinner ? '6px solid white' : 'none',
            boxShadow: isWinner ? '0 0 60px rgba(251, 191, 36, 1), inset -6px -6px 16px rgba(0,0,0,0.8)' : 'inset -6px -6px 16px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.6)'
        } as React.CSSProperties;
    }, [index, phase, isWinner]);

    const num = index.toString().padStart(2, '0');

    return (
        <div className="lottery-sphere-pro" style={style}>
            <span className="drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                {isWinner && phase !== 'REVEALED' && phase !== 'DESCENT' ? '?' : num}
            </span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STORM' | 'SETTLE' | 'ASCENT' | 'DESCENT' | 'REVEALED'>('STORM');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const STORM_TIME = 45000;  // High-velocity 45s mixing
  const SETTLE_TIME = 3000; // Settle time before draw
  const ASCENT_TIME = 3000; // Suction through vertical pipe
  const DESCENT_TIME = 3000; // Travel to foreground

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let phraseInterval: ReturnType<typeof setInterval>;

    if (phase === 'STORM') {
      progressInterval = setInterval(() => {
        setElapsed(prev => {
            if (prev >= STORM_TIME) {
                clearInterval(progressInterval);
                setPhase('SETTLE');
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

    if (phase === 'SETTLE') {
        const timer = setTimeout(() => setPhase('ASCENT'), SETTLE_TIME);
        return () => clearTimeout(timer);
    }

    if (phase === 'ASCENT') {
        const timer = setTimeout(() => setPhase('DESCENT'), ASCENT_TIME);
        return () => clearTimeout(timer);
    }

    if (phase === 'DESCENT') {
        const timer = setTimeout(() => {
            setShowFlash(true);
            setTimeout(() => {
                setPhase('REVEALED');
                setShowFlash(false);
            }, 300);
        }, DESCENT_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / STORM_TIME, 1);
  const backgroundSpheres = useMemo(() => Array.from({ length: 99 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Background Volumetric Layering */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.3)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-[5000ms] ${phase === 'REVEALED' ? 'opacity-100' : 'opacity-20'} bg-amber-500/10 animate-pulse`}></div>
        {/* Cinematic Distortion Scanlines */}
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.8)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_4px,4px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center h-full justify-center">
        
        {/* VERTICAL OVERHEAD DELIVERY PIPE */}
        <div className={`
            absolute top-0 left-1/2 -translate-x-1/2 w-32 md:w-44 h-[40vh] md:h-[45vh] overhead-suction-pipe transition-all duration-[2500ms]
            ${phase === 'STORM' ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'}
        `}>
            <div className="absolute bottom-0 w-full h-1.5 bg-sky-400 shadow-[0_0_60px_#0ea5e9]"></div>
            {/* Technical HUD Label */}
            <div className="absolute top-1/4 left-full ml-6 whitespace-nowrap text-[10px] md:text-[13px] font-black text-sky-400 uppercase tracking-widest border-l-4 border-sky-500/40 pl-4">
                VERTICAL EXTRACTION NODE: <span className="text-white">ONLINE</span><br/>
                <span className="text-slate-500 font-mono">{phase === 'ASCENT' ? 'VACUUM LIFT ACTIVE' : 'SYSTEM READY'}</span>
            </div>
        </div>

        {/* TOP HUD STATUS BAR */}
        <div className="absolute top-12 md:top-20 text-center w-full max-w-3xl px-8">
            <h3 className="text-sky-400 text-[12px] md:text-base font-black tracking-[1.4em] uppercase mb-6 animate-pulse russo">
                {phase === 'REVEALED' ? 'CERTIFIED MARKET DECLARATION' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-4 w-full bg-slate-900/90 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-900 via-sky-500 to-cyan-100 transition-all duration-100 ease-linear shadow-[0_0_50px_rgba(56,189,248,1)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-4 text-[10px] md:text-[13px] text-slate-500 font-black tracking-[0.6em] russo uppercase">
                <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${phase === 'REVEALED' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-sky-500 animate-ping'}`}></span>
                    {phase === 'REVEALED' ? 'CONSENSUS REACHED' : 'MECHANICAL SYNC'}
                </span>
                <span className="text-sky-400 font-mono bg-slate-900 px-3 py-0.5 rounded border border-slate-700">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* PRIMARY GLASS CHAMBER ASSEMBLY */}
        <div className="relative mt-24 mb-16 flex flex-col items-center">
            
            {/* Lower Port Housing (Base) */}
            <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[340px] md:w-[540px] h-[280px] md:h-[420px] bg-gradient-to-t from-black via-slate-900 to-slate-800 border-x-[24px] md:border-x-[40px] border-slate-700 rounded-t-[180px] md:rounded-t-[220px] shadow-[0_120px_240px_rgba(0,0,0,1)] lower-port-floor">
                {/* Volumetric Internal Illumination */}
                <div className="absolute top-16 left-1/2 -translate-x-1/2 w-80 h-24 bg-sky-400/20 rounded-full blur-[80px] animate-pulse"></div>
                
                {/* EXTRACTION APERTURE (Base suction point) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 md:w-56 h-22 md:h-32 bg-slate-950 border-x-4 border-slate-600 rounded-b-[60px] flex items-center justify-center overflow-hidden">
                    <div className="w-28 h-2 bg-sky-500/50 rounded-full blur-sm"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.25)_0%,transparent_80%)]"></div>
                </div>
            </div>
            
            {/* THE TRANSPARENT CIRCULAR GLASS CHAMBER */}
            <div className={`
                w-80 h-80 md:w-[720px] md:h-[720px] lg:w-[860px] lg:h-[860px] rounded-full relative overflow-hidden glass-chamber-massive transition-all duration-[5000ms]
                ${phase === 'REVEALED' ? 'scale-75 opacity-5 rotate-[150deg] blur-[120px]' : 'scale-100 rotate-0'}
            `}>
                {/* Visual Internal Agitator Turbine Blades */}
                <div className="absolute top-1/2 left-1/2 w-[99%] h-28 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full opacity-30" 
                     style={{ animation: `turbine-spin ${0.12 / (0.05 + progress)}s linear infinite` }}></div>
                
                {/* FULL VISIBILITY: 99 Balls Agitating then Settling */}
                {backgroundSpheres.map(i => (
                    <MechanicalSphere key={i} index={i} phase={phase} />
                ))}

                {/* THE WINNING SPHERE: Extraction Suction -> Vertical Ascent -> Descent Journey */}
                {(phase !== 'STORM' && phase !== 'REVEALED') && (
                    <MechanicalSphere 
                        index={parseInt(winningNumber) || 8} 
                        phase={phase}
                        isWinner={true} 
                    />
                )}

                {/* Core Drive Hub Unit */}
                <div className="absolute inset-0 flex items-center justify-center opacity-70 pointer-events-none">
                    <div className="w-36 h-36 md:w-56 md:h-56 bg-slate-900 rounded-full border-[16px] md:border-[24px] border-slate-800 shadow-[0_0_150px_rgba(0,0,0,1)] flex items-center justify-center">
                        <div className="w-12 h-12 md:w-18 md:h-18 bg-sky-500 rounded-full animate-pulse shadow-[0_0_100px_#0ea5e9] border-[10px] border-white/40"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* OFFICIAL REVEAL THEATRE (SLAM DECLARATION) */}
        <div className="absolute h-full flex flex-col items-center justify-center pointer-events-none">
            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center pointer-events-auto" style={{ animation: 'result-slam-final 1.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-20">
                        {/* THE OFFICIAL DECLARED WINNING SPHERE */}
                        <div className="w-80 h-80 md:w-[680px] md:h-[680px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-950 shadow-[0_0_500px_rgba(251,191,36,1)] border-[36px] md:border-[56px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1)_0%,transparent_65%)]"></div>
                            <span className="text-slate-950 text-[16rem] md:text-[42rem] font-black russo tracking-tighter drop-shadow-[0_50px_50px_rgba(0,0,0,0.8)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            {/* Extreme Glossy Surface Reflectance Sweep */}
                            <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                                <div className="absolute top-0 h-full w-[55%] bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-45" 
                                     style={{ animation: 'shine-sweep 2.5s infinite ease-in-out' }}></div>
                            </div>
                        </div>
                        
                        {/* God-Ray Volumetric Lighting Array */}
                        <div className="absolute -inset-[300px] bg-amber-400/25 blur-[300px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-24 left-1/2 -translate-x-1/2 w-[800px] h-32 bg-black/95 blur-[100px] rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-8xl md:text-[18rem] font-black text-white uppercase russo mb-10 tracking-widest drop-shadow-[0_0_100px_rgba(56,189,248,0.8)] leading-none">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[2em] text-sm md:text-4xl mb-32">SYSTEM CERTIFIED MARKET RESULT</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-40 py-10 md:px-64 md:py-14 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_200px_rgba(255,255,255,0.6)] russo text-4xl md:text-7xl tracking-[0.6em]"
                        >
                            <span className="relative z-10">DISMISS DRAW</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-[1200ms]"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Atmospheric Agitation Interaction Micro-Particles */}
      {phase === 'STORM' && (
        <div className="absolute inset-0 pointer-events-none opacity-90">
            {Array.from({ length: 200 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-200 rounded-full animate-ping" style={{
                    width: '6px', height: '6px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 0.7 + 0.15}s`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;