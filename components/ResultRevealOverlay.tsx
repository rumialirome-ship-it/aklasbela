
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
        const size = isWinner ? 55 : 30 + (index % 12); 
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
            border: isWinner ? '4px solid white' : 'none',
            boxShadow: isWinner ? '0 0 40px rgba(251, 191, 36, 1), inset -4px -4px 12px rgba(0,0,0,0.8)' : 'inset -4px -4px 12px rgba(0,0,0,0.8), 0 8px 16px rgba(0,0,0,0.6)'
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

  const STORM_TIME = 45000;
  const SETTLE_TIME = 2000;
  const ASCENT_TIME = 2500;
  const DESCENT_TIME = 2500;

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
      }, 5000);

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
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.2)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-[5000ms] ${phase === 'REVEALED' ? 'opacity-100' : 'opacity-20'} bg-amber-500/10 animate-pulse`}></div>
        <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.8)_50%),linear-gradient(90deg,rgba(255,0,0,0.05),rgba(0,255,0,0.02),rgba(0,0,255,0.05))] bg-[length:100%_4px,4px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center h-full justify-center">
        
        <div className={`
            absolute top-0 left-1/2 -translate-x-1/2 w-24 md:w-32 h-[35vh] md:h-[40vh] overhead-suction-pipe transition-all duration-[2000ms]
            ${phase === 'STORM' ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'}
        `}>
            <div className="absolute bottom-0 w-full h-1 bg-sky-400 shadow-[0_0_40px_#0ea5e9]"></div>
            <div className="absolute top-1/4 left-full ml-4 whitespace-nowrap text-[8px] md:text-[11px] font-black text-sky-400 uppercase tracking-widest border-l-2 border-sky-500/40 pl-3">
                EXTRACTION: <span className="text-white">LIVE</span><br/>
                <span className="text-slate-500 font-mono">{phase === 'ASCENT' ? 'VACUUM ON' : 'READY'}</span>
            </div>
        </div>

        <div className="absolute top-8 md:top-16 text-center w-full max-w-2xl px-6">
            <h3 className="text-sky-400 text-[9px] md:text-sm font-black tracking-[1em] uppercase mb-4 animate-pulse russo">
                {phase === 'REVEALED' ? 'OFFICIAL MARKET DECLARATION' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-3 w-full bg-slate-900/90 rounded-full overflow-hidden border border-white/10 relative p-0.5 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-900 via-sky-500 to-cyan-100 transition-all duration-100 ease-linear shadow-[0_0_30px_rgba(56,189,248,1)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[8px] md:text-[11px] text-slate-500 font-black tracking-[0.4em] russo uppercase">
                <span>{phase === 'REVEALED' ? 'STABLE' : 'SYNCING'}</span>
                <span className="text-sky-400 font-mono">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        <div className="relative mt-16 mb-12 flex flex-col items-center scale-90 sm:scale-100">
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[280px] md:w-[460px] h-[220px] md:h-[340px] bg-gradient-to-t from-black via-slate-900 to-slate-800 border-x-[16px] md:border-x-[30px] border-slate-700 rounded-t-[140px] md:rounded-t-[180px] shadow-[0_80px_160px_rgba(0,0,0,1)] lower-port-floor">
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 h-16 bg-sky-400/10 rounded-full blur-[60px] animate-pulse"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 md:w-48 h-16 md:h-24 bg-slate-950 border-x-2 border-slate-600 rounded-b-[50px] flex items-center justify-center overflow-hidden">
                    <div className="w-20 h-1 bg-sky-500/30 rounded-full blur-sm"></div>
                </div>
            </div>
            
            <div className={`
                w-72 h-72 md:w-[600px] md:h-[600px] lg:w-[720px] lg:h-[720px] rounded-full relative overflow-hidden glass-chamber-massive transition-all duration-[4000ms]
                ${phase === 'REVEALED' ? 'scale-75 opacity-5 rotate-[120deg] blur-[100px]' : 'scale-100 rotate-0'}
            `}>
                <div className="absolute top-1/2 left-1/2 w-[99%] h-20 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full opacity-20" 
                     style={{ animation: `turbine-spin ${0.15 / (0.05 + progress)}s linear infinite` }}></div>
                
                {backgroundSpheres.map(i => (
                    <MechanicalSphere key={i} index={i} phase={phase} />
                ))}

                {(phase !== 'STORM' && phase !== 'REVEALED') && (
                    <MechanicalSphere 
                        index={parseInt(winningNumber) || 8} 
                        phase={phase}
                        isWinner={true} 
                    />
                )}

                <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
                    <div className="w-28 h-28 md:w-44 md:h-44 bg-slate-900 rounded-full border-[12px] md:border-[20px] border-slate-800 shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center justify-center">
                        <div className="w-8 h-8 md:w-14 md:h-14 bg-sky-500 rounded-full animate-pulse shadow-[0_0_80px_#0ea5e9] border-[8px] border-white/30"></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="absolute h-full flex flex-col items-center justify-center pointer-events-none w-full px-4">
            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center pointer-events-auto w-full max-w-4xl" style={{ animation: 'result-slam-final 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-12 md:mb-16">
                        <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-[480px] md:h-[480px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-950 shadow-[0_0_200px_rgba(251,191,36,0.8)] border-[20px] sm:border-[28px] md:border-[40px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8)_0%,transparent_65%)]"></div>
                            <span className="text-slate-950 text-[10rem] sm:text-[14rem] md:text-[24rem] lg:text-[28rem] font-black russo tracking-tighter drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                                <div className="absolute top-0 h-full w-[60%] bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-45" 
                                     style={{ animation: 'shine-sweep 3s infinite ease-in-out' }}></div>
                            </div>
                        </div>
                        <div className="absolute -inset-40 bg-amber-400/15 blur-[150px] -z-10 animate-pulse rounded-full"></div>
                    </div>

                    <div className="text-center w-full px-4">
                        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white uppercase russo mb-4 tracking-widest drop-shadow-[0_0_50px_rgba(56,189,248,0.6)] leading-tight truncate w-full">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[0.8em] text-[10px] sm:text-xs md:text-2xl mb-12 sm:mb-16">CERTIFIED MARKET RESULT</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-12 py-4 sm:px-24 sm:py-6 rounded-full overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-[0_0_100px_rgba(255,255,255,0.4)] russo text-xl sm:text-2xl md:text-4xl tracking-[0.4em]"
                        >
                            <span className="relative z-10">DISMISS</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {phase === 'STORM' && (
        <div className="absolute inset-0 pointer-events-none opacity-70">
            {Array.from({ length: 120 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-200 rounded-full animate-ping" style={{
                    width: '4px', height: '4px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 0.7 + 0.2}s`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;
