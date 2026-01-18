import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "ENGAGING HIGH-SPEED AGITATION TURBINES...",
    "INITIATING 45-SECOND MIXING CYCLE...",
    "VERIFYING 100% SPHERE TRANSPARENCY...",
    "CALIBRATING ISOLATION PARAMETERS...",
    "IDENTIFYING DECLARED RESULT BALL...",
    "CHANNELLING SPHERE TO DELIVERY CHUTE...",
    "SATELLITE LINK: MARKET CONFIRMED...",
    "EXECUTING OFFICIAL DRAW REVEAL..."
];

const ProPhysicsBall: React.FC<{ 
    index: number, 
    phase: 'STORM' | 'ISOLATION' | 'TRANSIT' | 'REVEALED', 
    isWinner?: boolean 
}> = ({ index, phase, isWinner }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 58 : 38 + (index % 12); 
        const delay = (index * -0.3) % 20;
        
        let animation = '';
        let zIndex = Math.floor(Math.random() * 200);

        if (isWinner && phase === 'TRANSIT') {
            animation = 'curved-path-transit 3.5s forwards cubic-bezier(0.5, 0, 0.5, 1)';
            zIndex = 700;
        } else if (isWinner && phase === 'ISOLATION') {
            animation = 'arc-isolation 2s forwards ease-in-out';
            zIndex = 700;
        } else if (phase === 'STORM') {
            const duration = 1.1 + (index % 1.6);
            animation = `physics-storm-v3 ${duration}s ease-in-out ${delay}s infinite alternate`;
        } else {
            // Background spheres settling realistically
            const duration = 2.2 + (index % 1.8);
            animation = `ball-settle-pro ${duration}s ease-out forwards`;
        }
        
        // Distribution spatial grid for chamber wall interaction
        const left = 10 + (index * 27) % 80;
        const top = 10 + (index * 31) % 70;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation,
            zIndex,
            fontSize: `${size / 1.9}px`,
            border: isWinner ? '6px solid white' : 'none',
            boxShadow: isWinner ? '0 0 60px rgba(251, 191, 36, 1), inset -6px -6px 18px rgba(0,0,0,0.8)' : 'inset -6px -6px 18px rgba(0,0,0,0.8), 0 12px 24px rgba(0,0,0,0.6)'
        } as React.CSSProperties;
    }, [index, phase, isWinner]);

    const num = index.toString().padStart(2, '0');

    return (
        <div className="lottery-ball-v3" style={style}>
            <span className="drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">
                {isWinner && phase !== 'REVEALED' && phase !== 'TRANSIT' ? '?' : num}
            </span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STORM' | 'ISOLATION' | 'TRANSIT' | 'REVEALED'>('STORM');
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const STORM_TIME = 45000;    // Mandatory 45s High-Agitation Storm
  const ISOLATION_TIME = 3000; // 3s Ball Isolation
  const TRANSIT_TIME = 4500;   // 4.5s Transit through Curved Chute

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    let phraseInterval: ReturnType<typeof setInterval>;

    if (phase === 'STORM') {
      progressInterval = setInterval(() => {
        setElapsed(prev => {
            if (prev >= STORM_TIME) {
                clearInterval(progressInterval);
                setPhase('ISOLATION');
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

    if (phase === 'ISOLATION') {
        const timer = setTimeout(() => {
            setPhase('TRANSIT');
        }, ISOLATION_TIME);
        return () => clearTimeout(timer);
    }

    if (phase === 'TRANSIT') {
        const timer = setTimeout(() => {
            setShowFlash(true);
            setTimeout(() => {
                setPhase('REVEALED');
                setShowFlash(false);
            }, 350);
        }, TRANSIT_TIME);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const progress = Math.min(elapsed / STORM_TIME, 1);
  const backgroundSpheres = useMemo(() => Array.from({ length: 99 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[220vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.25)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-[4000ms] ${phase === 'REVEALED' ? 'opacity-100' : 'opacity-20'} bg-amber-500/5 animate-pulse`}></div>
        {/* Physical Grit Noise Layer */}
        <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.8)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_4px,4px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center h-full justify-center">
        
        {/* TRANSPARENT CURVED DELIVERY CHUTE (Visual Only) */}
        <div className={`
            absolute top-[10%] right-[5%] w-80 h-[60vh] transition-all duration-[2000ms]
            ${phase === 'STORM' ? 'opacity-0 translate-x-20' : 'opacity-100 translate-x-0'}
        `}>
            {/* The Arc Chute Graphic */}
            <div className="arc-tube-visual -scale-x-100 right-0 top-0"></div>
            <div className="absolute top-1/4 right-full mr-6 whitespace-nowrap text-[10px] md:text-[12px] font-black text-sky-400 uppercase tracking-widest border-r-4 border-sky-500/30 pr-3 text-right">
                CURVED DELIVERY UNIT 9-X<br/>
                <span className="text-slate-500">{phase === 'TRANSIT' ? 'SPHERE IN TRANSIT...' : 'STATIONARY'}</span>
            </div>
        </div>

        {/* TOP STATUS CONSOLE */}
        <div className="absolute top-10 md:top-16 text-center w-full max-w-2xl px-6">
            <h3 className="text-sky-400 text-[11px] md:text-sm font-black tracking-[1.3em] uppercase mb-6 animate-pulse russo">
                {phase === 'REVEALED' ? 'CERTIFIED DRAW COMPLETE' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-900 via-sky-500 to-cyan-100 transition-all duration-100 ease-linear shadow-[0_0_40px_rgba(56,189,248,0.9)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[10px] md:text-[12px] text-slate-500 font-black tracking-[0.5em] russo uppercase">
                <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${phase === 'REVEALED' ? 'bg-emerald-500' : 'bg-sky-500 animate-ping'}`}></span>
                    {phase === 'REVEALED' ? 'CONSENSUS' : '45S MIXING CYCLE'}
                </span>
                <span className="text-sky-400 font-mono">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE MAIN GLASS CHAMBER ASSEMBLY */}
        <div className="relative mt-20 mb-12 flex flex-col items-center">
            
            {/* Massive Reinforced Mechanical Base */}
            <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 w-[320px] md:w-[500px] h-[260px] md:h-[380px] bg-gradient-to-t from-black via-slate-900 to-slate-800 border-x-[22px] md:border-x-[36px] border-slate-700 rounded-t-[160px] md:rounded-t-[200px] shadow-[0_100px_200px_rgba(0,0,0,1)]">
                {/* Internal Chamber Floor LED */}
                <div className="absolute top-14 left-1/2 -translate-x-1/2 w-72 h-20 bg-sky-400/20 rounded-full blur-[60px] animate-pulse"></div>
                
                {/* ISOLATION PORT (Small Opening at Base) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 md:w-48 h-20 md:h-28 bg-slate-950 border-x-4 border-slate-600 rounded-b-[50px] flex items-center justify-center overflow-hidden">
                    <div className="w-24 h-1.5 bg-sky-500/40 rounded-full blur-sm"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2)_0%,transparent_80%)]"></div>
                </div>
            </div>
            
            {/* THE TRANSPARENT CIRCULAR GLASS CHAMBER */}
            <div className={`
                w-80 h-80 md:w-[700px] md:h-[700px] lg:w-[820px] lg:h-[820px] rounded-full relative overflow-hidden transparent-chamber-pro transition-all duration-[4000ms]
                ${phase === 'REVEALED' ? 'scale-75 opacity-5 rotate-[120deg] blur-[100px]' : 'scale-100 rotate-0'}
            `}>
                {/* Visual Internal Agitator Blades */}
                <div className="absolute top-1/2 left-1/2 w-[98%] h-24 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full opacity-40" 
                     style={{ animation: `agitator-blade-spin ${0.15 / (0.05 + progress)}s linear infinite` }}></div>
                
                {/* CONTINUOUS VISIBILITY: Every ball clearly identifiable */}
                {backgroundSpheres.map(i => (
                    <ProPhysicsBall key={i} index={i} phase={phase} />
                ))}

                {/* THE SELECTED SPHERE: Isolation -> Transit Journey */}
                {(phase === 'ISOLATION' || phase === 'TRANSIT') && (
                    <ProPhysicsBall 
                        index={parseInt(winningNumber) || 12} 
                        phase={phase}
                        isWinner={true} 
                    />
                )}

                {/* Industrial Central Hub Mechanism */}
                <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
                    <div className="w-32 h-32 md:w-52 md:h-52 bg-slate-900 rounded-full border-[14px] md:border-[22px] border-slate-800 shadow-[0_0_120px_rgba(0,0,0,1)] flex items-center justify-center">
                        <div className="w-10 h-10 md:w-16 md:h-16 bg-sky-500 rounded-full animate-pulse shadow-[0_0_80px_#0ea5e9] border-[8px] border-white/40"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* OFFICIAL REVEAL THEATRE (CINEMATIC DECLARATION) */}
        <div className="absolute h-full flex flex-col items-center justify-center pointer-events-none">
            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center pointer-events-auto" style={{ animation: 'draw-declaration-slam 1.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-16">
                        {/* THE OFFICIAL DECLARED WINNING SPHERE */}
                        <div className="w-80 h-80 md:w-[620px] md:h-[620px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-950 shadow-[0_0_400px_rgba(251,191,36,0.9)] border-[32px] md:border-[48px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1)_0%,transparent_65%)]"></div>
                            <span className="text-slate-950 text-[15rem] md:text-[36rem] font-black russo tracking-tighter drop-shadow-[0_40px_40px_rgba(0,0,0,0.8)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            {/* Cinematic Metallic Reflection Sweep */}
                            <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                                <div className="absolute top-0 h-full w-[50%] bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-45" 
                                     style={{ animation: 'shine-sweep 2.5s infinite ease-in-out' }}></div>
                            </div>
                        </div>
                        
                        {/* Volumetric Aura Effect */}
                        <div className="absolute -inset-80 bg-amber-400/25 blur-[250px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-20 left-1/2 -translate-x-1/2 w-[700px] h-28 bg-black/95 blur-[80px] rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-8xl md:text-[16rem] font-black text-white uppercase russo mb-8 tracking-widest drop-shadow-[0_0_80px_rgba(56,189,248,0.7)] leading-none">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[1.8em] text-xs md:text-3xl mb-24">SYSTEM CERTIFIED MARKET SELECTION</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-36 py-9 md:px-52 md:py-12 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_180px_rgba(255,255,255,0.5)] russo text-3xl md:text-5xl tracking-[0.5em]"
                        >
                            <span className="relative z-10">ACCEPT DRAW</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-[1000ms]"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* High-Agitation Atmospheric Interaction Particulates */}
      {phase === 'STORM' && (
        <div className="absolute inset-0 pointer-events-none opacity-90">
            {Array.from({ length: 180 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-200 rounded-full animate-ping" style={{
                    width: '5px', height: '5px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 0.8 + 0.2}s`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;