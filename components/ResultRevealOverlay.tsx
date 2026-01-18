import React, { useState, useEffect, useMemo } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#f472b6', '#ffffff', '#94a3b8'];

const TENSION_PHRASES = [
    "ENGAGING HIGH-VOLUME AGITATORS...",
    "INITIATING CHAOTIC MIXING SEQUENCE...",
    "MAXIMUM SPHERE TURBULENCE REACHED...",
    "CALIBRATING SCOOPING MEMBER...",
    "ISOLATING OFFICIAL RESULT...",
    "CAPTURING WINNING SPHERE IN PORT...",
    "SATELLITE SYNC: MARKET VALIDATED...",
    "PREPARING DRAW DECLARATION..."
];

const MechanicalBall: React.FC<{ index: number, intensity: number, isWinner?: boolean, isCaptured?: boolean }> = ({ index, intensity, isWinner, isCaptured }) => {
    const style = useMemo(() => {
        const color = isWinner ? '#fbbf24' : BALL_COLORS[index % BALL_COLORS.length];
        const size = isWinner ? 44 : 32 + (index % 12);
        const delay = (index * -0.6) % 10;
        
        // Intensity increases speed as time goes on
        const duration = (1.4 + (index % 2.5)) / (1 + intensity * 1.5);
        
        // Initial random positions inside the massive volume
        const left = 15 + (index * 17) % 70;
        const top = 15 + (index * 21) % 65;
        
        return {
            '--ball-color': color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            top: `${top}%`,
            animation: isCaptured ? 'ball-scoop-to-port 2.2s forwards cubic-bezier(0.4, 0, 0.2, 1)' : `ball-storm-chaotic ${duration}s ease-in-out ${delay}s infinite alternate`,
            zIndex: isWinner ? 300 : Math.floor(Math.random() * 100),
            fontSize: `${size / 2.2}px`,
            opacity: 1,
            border: isWinner ? '4px solid white' : 'none',
            boxShadow: isWinner ? '0 0 30px rgba(251, 191, 36, 0.8), inset -5px -5px 12px rgba(0,0,0,0.8)' : 'inset -5px -5px 12px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.6)'
        } as React.CSSProperties;
    }, [index, intensity, isCaptured, isWinner]);

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

  const TOTAL_MIX_TIME = 45000; // 45 seconds exact agitation
  const EXTRACTION_TIME = 5000; // 5 seconds extraction journey

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
  // High volume of balls for total transparency simulation
  const balls = useMemo(() => Array.from({ length: 95 }).map((_, i) => i), []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Dynamic Dramatic Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] h-full bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.25)_0%,transparent_60%)]"></div>
        <div className={`absolute inset-0 transition-opacity duration-2000 ${phase === 'REVEALED' ? 'opacity-80' : 'opacity-20'} bg-amber-500/20 animate-pulse`}></div>
        {/* Machine Scanlines & Grain */}
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.6)_50%),linear-gradient(90deg,rgba(255,0,0,0.1),rgba(0,255,0,0.05),rgba(0,0,255,0.1))] bg-[length:100%_8px,8px_100%] pointer-events-none"></div>
      </div>

      {showFlash && <div className="fixed inset-0 bg-white z-[3000]"></div>}

      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center">
        
        {/* Status Hub */}
        <div className="mb-14 text-center w-full max-w-xl">
            <h3 className="text-sky-400 text-xs md:text-sm font-black tracking-[1em] uppercase mb-6 animate-pulse russo">
                {phase === 'REVEALED' ? 'OFFICIAL DECLARATION LOCKED' : TENSION_PHRASES[phraseIndex]}
            </h3>
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-900 via-sky-500 to-cyan-200 transition-all duration-100 ease-linear shadow-[0_0_30px_rgba(56,189,248,0.8)] rounded-full" 
                    style={{ width: phase === 'REVEALED' ? '100%' : `${progress * 100}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-3 text-[11px] text-slate-500 font-black tracking-[0.3em] russo uppercase">
                <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${phase === 'REVEALED' ? 'bg-emerald-500' : 'bg-sky-500 animate-ping'}`}></span>
                    {phase === 'REVEALED' ? 'CONSENSUS REACHED' : 'MECHANICAL SYNC'}
                </span>
                <span className="text-sky-400">{Math.floor(progress * 100)}%</span>
            </div>
        </div>

        {/* THE GIANT MECHANICAL TUMBLER ASSEMBLY */}
        <div className="relative mb-24 flex flex-col items-center">
            
            {/* Massive Reinforced Base */}
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[380px] h-[320px] bg-gradient-to-t from-black via-slate-900 to-slate-800 border-x-[24px] border-slate-700 rounded-t-[140px] shadow-[0_60px_150px_rgba(0,0,0,1)]">
                {/* Internal Floodlighting */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 h-12 bg-sky-400/30 rounded-full blur-3xl animate-pulse"></div>
                
                {/* Small Precision Exit Port Housing */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-18 exit-port-housing border-x-4 border-slate-600 rounded-b-3xl flex items-center justify-center">
                    <div className="w-16 h-1 bg-sky-400/50 rounded-full blur-sm"></div>
                </div>
            </div>
            
            {/* THE LARGE VISUAL PORT (THE GLASS GLOBE) */}
            <div className={`
                w-80 h-80 md:w-[680px] md:h-[680px] rounded-full relative overflow-hidden visual-port-massive transition-all duration-1500
                ${phase === 'MIXING' ? 'scale-100 rotate-0' : 'scale-90 opacity-40 rotate-[45deg] blur-xl'}
            `}>
                {/* Polished Rim Highlight */}
                <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none"></div>
                
                {/* High-Speed Mechanical Agitators (Visual Vanes) */}
                <div className="absolute top-1/2 left-1/2 w-[94%] h-12 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full opacity-30" 
                     style={{ animation: `paddle-rotation ${0.4 / (1 + progress)}s linear infinite` }}></div>
                <div className="absolute top-1/2 left-1/2 w-[94%] h-12 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full opacity-30" 
                     style={{ animation: `paddle-rotation ${0.4 / (1 + progress)}s linear reverse infinite`, transform: 'translate(-50%, -50%) rotate(90deg)' }}></div>

                {/* The "Storm" of Agitated Balls */}
                {balls.map(i => (
                    <MechanicalBall key={i} index={i} intensity={progress} />
                ))}

                {/* The Captured Result Ball journey */}
                {phase === 'EXTRACTION' && (
                    <MechanicalBall index={parseInt(winningNumber) || 12} intensity={1} isWinner={true} isCaptured={true} />
                )}

                {/* Core Drive Mechanism */}
                <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
                    <div className="w-32 h-32 bg-slate-900 rounded-full border-[12px] border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex items-center justify-center">
                        <div className="w-10 h-10 bg-sky-500 rounded-full animate-pulse shadow-[0_0_30px_#0ea5e9] border-2 border-white/40"></div>
                    </div>
                </div>
            </div>

            {/* Precision Acrylic Extraction Tube */}
            <div className={`
                absolute top-[92%] left-1/2 -translate-x-1/2 w-28 h-72 bg-gradient-to-b from-white/20 via-sky-400/5 to-transparent border-x-[8px] border-white/10 transition-all duration-1000
                ${phase === 'MIXING' ? 'opacity-0 -translate-y-20' : 'opacity-100 translate-y-0'}
            `}>
                <div className="absolute bottom-0 w-full h-5 bg-sky-500 shadow-[0_0_50px_#0ea5e9] animate-pulse"></div>
                {/* Technical Decals */}
                <div className="absolute top-8 left-full ml-6 whitespace-nowrap text-[10px] font-black text-sky-400 uppercase tracking-widest border-l-2 border-sky-500/40 pl-3">
                    EXTRACTION UNIT 7-B<br/>
                    <span className="text-slate-500">READY FOR DEPLOYMENT</span>
                </div>
            </div>
        </div>

        {/* OFFICIAL DECLARATION THEATRE */}
        <div className="h-[400px] flex flex-col items-center justify-center">
            {phase === 'EXTRACTION' && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-amber-600 shadow-[0_0_100px_rgba(251,191,36,0.8)] flex items-center justify-center border-[10px] border-white animate-bounce">
                        <span className="text-white font-black text-6xl russo drop-shadow-xl">?</span>
                    </div>
                    <p className="mt-12 text-amber-500 font-black text-sm tracking-[1em] uppercase animate-pulse russo">ISOLATING WINNER</p>
                </div>
            )}

            {phase === 'REVEALED' && (
                <div className="flex flex-col items-center" style={{ animation: 'result-slam-reveal 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
                    <div className="relative group mb-14">
                        {/* THE DECLARED WINNING SPHERE */}
                        <div className="w-72 h-72 md:w-[500px] md:h-[500px] rounded-full bg-gradient-to-br from-white via-amber-400 to-amber-950 shadow-[0_0_250px_rgba(251,191,36,0.6)] border-[32px] border-white flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1)_0%,transparent_60%)]"></div>
                            <span className="text-slate-950 text-[12rem] md:text-[24rem] font-black russo tracking-tighter drop-shadow-[0_20px_20px_rgba(0,0,0,0.7)] z-10 leading-none">
                                {winningNumber}
                            </span>
                            {/* Cinematic High-Gloss Shine */}
                            <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                                <div className="absolute top-0 h-full w-[40%] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-45" 
                                     style={{ animation: 'shine-sweep 2.5s infinite ease-in-out' }}></div>
                            </div>
                        </div>
                        
                        {/* Divine Ambient Lighting */}
                        <div className="absolute -inset-40 bg-amber-400/20 blur-[150px] -z-10 animate-pulse rounded-full"></div>
                        <div className="absolute top-full mt-14 left-1/2 -translate-x-1/2 w-96 h-20 bg-black/90 blur-[50px] rounded-full"></div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-7xl md:text-[10rem] font-black text-white uppercase russo mb-4 tracking-widest drop-shadow-[0_0_40px_rgba(56,189,248,0.4)] leading-none">{gameName}</h1>
                        <p className="text-amber-400 font-black uppercase tracking-[1.2em] text-[12px] md:text-lg mb-16">CERTIFIED SYSTEM SELECTION</p>
                        
                        <button 
                            onClick={onClose}
                            className="group relative bg-white text-slate-950 font-black px-28 py-7 rounded-full overflow-hidden hover:scale-110 active:scale-95 transition-all shadow-[0_0_100px_rgba(255,255,255,0.4)] russo text-2xl tracking-[0.3em]"
                        >
                            <span className="relative z-10">ACCEPT RESULT</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Atmospheric Turbulence Particulates */}
      {phase === 'MIXING' && (
        <div className="absolute inset-0 pointer-events-none opacity-70">
            {Array.from({ length: 80 }).map((_, i) => (
                <div key={i} className="absolute bg-sky-300 rounded-full animate-ping" style={{
                    width: '3px', height: '3px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 1.5 + 0.5}s`,
                    animationDelay: `${Math.random() * 1}s`
                }}></div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResultRevealOverlay;