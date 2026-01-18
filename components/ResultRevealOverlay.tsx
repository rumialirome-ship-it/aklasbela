
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

const BALL_COLORS = ['#fbbf24', '#f472b6', '#38bdf8', '#10b981', '#ef4444', '#8b5cf6', '#ffffff', '#94a3b8'];

// Sound Engine
const playSound = (type: 'startup' | 'rattle' | 'reveal', audioCtx: AudioContext | null) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'startup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 2);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
        osc.start();
        osc.stop(audioCtx.currentTime + 2);
    } else if (type === 'reveal') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
    }
};

const Ball: React.FC<{ index: number; phase: string; isWinner: boolean; winningNumber: string; bowlRadius: number }> = ({ index, phase, isWinner, winningNumber, bowlRadius }) => {
    const color = useMemo(() => BALL_COLORS[index % BALL_COLORS.length], [index]);
    const num = index.toString().padStart(2, '0');
    
    // Polar coordinate math for perfect containment
    const pos = useMemo(() => {
        const ballSize = 16; // half ball width
        const padding = 20;
        const maxR = bowlRadius - ballSize - padding;
        
        // Random position within circle
        const r = Math.sqrt(Math.random()) * maxR;
        const theta = Math.random() * 2 * Math.PI;
        
        return {
            x: r * Math.cos(theta),
            y: r * Math.sin(theta),
            delay: Math.random() * -2,
            duration: 0.3 + Math.random() * 0.4
        };
    }, [bowlRadius]);

    if (isWinner && (phase === 'DROP' || phase === 'REVEAL')) {
        let className = "lottery-ball winner-ball ";
        if (phase === 'DROP') className += "ball-pipe-descent";
        if (phase === 'REVEAL') className += "ball-at-exit";

        return (
            <div 
                className={className}
                style={{ '--ball-color': '#fbbf24', zIndex: 100 } as any}
            >
                <span className="ball-text">{winningNumber}</span>
            </div>
        );
    }

    // Static Phase Style
    const isStatic = phase === 'STATIC';
    
    return (
        <div 
            className={`lottery-ball ${isStatic ? 'ball-locked' : 'ball-shuffling'}`}
            style={{ 
                '--ball-color': color,
                '--delay': `${pos.delay}s`,
                '--duration': `${pos.duration}s`,
                '--ix': `${pos.x}px`,
                '--iy': `${pos.y}px`,
                // If static, they settle near bottom
                left: `calc(50% + ${isStatic ? pos.x * 0.4 : pos.x}px)`,
                top: `calc(50% + ${isStatic ? (Math.abs(pos.y) + (bowlRadius * 0.4)) : pos.y}px)`,
            } as any}
        >
            <span className="ball-text">{num}</span>
        </div>
    );
};

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<'STATIC' | 'SHUFFLE' | 'DROP' | 'REVEAL'>('STATIC');
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const backgroundBalls = useMemo(() => Array.from({ length: 100 }).map((_, i) => i), []);

  const INITIAL_DELAY = 4000; 
  const SHUFFLE_DURATION = 45000;

  useEffect(() => {
    // Initialize Audio Context on user interaction (handled by overlay appearance usually)
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    const startTime = Date.now();
    
    // Timer for initial 4s delay
    const startTimer = setTimeout(() => {
        setPhase('SHUFFLE');
        if (!isMuted) playSound('startup', audioCtxRef.current);
    }, INITIAL_DELAY);

    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < INITIAL_DELAY) return; // Wait during static phase

        const p = Math.min(((elapsed - INITIAL_DELAY) / SHUFFLE_DURATION) * 100, 100);
        setProgress(p);
        
        if (p >= 100) {
            clearInterval(progressInterval);
            setPhase('DROP');
        }
    }, 100);

    const revealTimer = setTimeout(() => {
        setPhase('REVEAL');
        if (!isMuted) playSound('reveal', audioCtxRef.current);
    }, INITIAL_DELAY + SHUFFLE_DURATION + 2500);

    return () => {
        clearTimeout(startTimer);
        clearInterval(progressInterval);
        clearTimeout(revealTimer);
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(30,41,59,0)_0%,rgba(2,6,23,1)_80%)] z-10"></div>
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-20 w-full max-w-4xl h-full flex flex-col items-center justify-center px-4">
        
        {/* TOP BROADCAST HEADER */}
        <div className="absolute top-8 sm:top-12 text-center w-full px-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded-md mb-4 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Declaration</span>
            </div>
            <h2 className="text-white text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-4 russo drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                {gameName} <span className="text-amber-500">EXCHANGE</span>
            </h2>
            
            <div className="max-w-md mx-auto flex items-center gap-4">
                 <div className="h-2 flex-grow bg-slate-900/80 rounded-full overflow-hidden border border-white/10 shadow-inner">
                    <div 
                        className={`h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(251,191,36,0.6)] ${phase === 'STATIC' ? 'opacity-30' : 'opacity-100'}`}
                        style={{ width: `${progress}%` }}
                    />
                 </div>
                 <p className="text-amber-500 font-mono text-xs w-10 font-bold">{Math.floor(progress)}%</p>
            </div>
            {phase === 'STATIC' && (
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 animate-pulse">Initializing Mechanical Sequence...</p>
            )}
        </div>

        {/* MACHINE CHAMBER - CENTERED */}
        <div className="relative flex items-center justify-center">
            {/* The Outer Frame Decoration */}
            <div className="absolute -inset-10 border border-white/5 rounded-full pointer-events-none opacity-20 rotate-45"></div>
            <div className="absolute -inset-16 border border-white/5 rounded-full pointer-events-none opacity-10 -rotate-12"></div>

            {/* Main Bowl */}
            <div className="relative w-[300px] h-[300px] sm:w-[440px] sm:h-[440px] md:w-[520px] md:h-[520px] lg:w-[580px] lg:h-[580px] rounded-full glass-bowl flex items-center justify-center overflow-hidden">
                
                {/* Internal Reflections */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1)_0%,transparent_50%)] pointer-events-none z-30"></div>
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_40%,rgba(255,255,255,0.05)_100%)] pointer-events-none z-30"></div>

                {/* The Shuffling Balls */}
                {backgroundBalls.map(i => (
                    <Ball 
                        key={i} 
                        index={i} 
                        phase={phase} 
                        isWinner={false} 
                        winningNumber={winningNumber} 
                        bowlRadius={window.innerWidth < 640 ? 150 : (window.innerWidth < 768 ? 220 : 260)} 
                    />
                ))}

                {/* Winning Ball isolated (only shows during shuffle as one of the pack) */}
                {phase === 'SHUFFLE' || phase === 'STATIC' ? (
                     <Ball 
                        index={parseInt(winningNumber)} 
                        phase={phase} 
                        isWinner={true} 
                        winningNumber={winningNumber} 
                        bowlRadius={window.innerWidth < 640 ? 150 : (window.innerWidth < 768 ? 220 : 260)} 
                     />
                ) : (
                     <div className="absolute inset-0 pointer-events-none z-50">
                         <Ball 
                            index={parseInt(winningNumber)} 
                            phase={phase} 
                            isWinner={true} 
                            winningNumber={winningNumber} 
                            bowlRadius={window.innerWidth < 640 ? 150 : (window.innerWidth < 768 ? 220 : 260)} 
                         />
                     </div>
                )}
            </div>

            {/* Mechanical Base Support */}
            <div className="absolute -bottom-8 w-40 h-8 bg-slate-900 border-x border-t border-white/10 rounded-t-xl z-0"></div>
        </div>

        {/* ZIGZAG EXIT PIPE */}
        <div className="relative w-full h-40 sm:h-56 -mt-12 sm:-mt-20 z-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid meet">
                <path 
                    d="M 200 0 L 200 40 L 340 80 L 60 140 L 200 180" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="48" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path 
                    d="M 200 0 L 200 40 L 340 80 L 60 140 L 200 180" 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeWidth="42" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>

        {/* THE FINAL REVEAL IMPACT */}
        {phase === 'REVEAL' && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-fade-in">
                <div className="relative animate-result-slam">
                    {/* Glow Effect */}
                    <div className="absolute inset-[-40px] bg-amber-500/30 blur-[60px] rounded-full animate-pulse"></div>
                    
                    <div className="relative bg-white text-slate-950 rounded-[2.5rem] px-12 sm:px-20 py-6 sm:py-8 shadow-[0_0_80px_rgba(251,191,36,0.8)] border-[6px] border-amber-400">
                        <span className="text-8xl sm:text-[12rem] font-black russo tracking-tighter leading-none block">{winningNumber}</span>
                    </div>
                </div>
                
                <div className="mt-12 text-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    <h1 className="text-3xl sm:text-5xl font-black text-white russo uppercase mb-8 tracking-[0.2em] drop-shadow-2xl">
                        SUCCESSFUL <span className="text-amber-500">DRAW</span>
                    </h1>

                    <button 
                        onClick={onClose}
                        className="group relative bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-12 sm:px-20 py-4 sm:py-6 rounded-2xl transition-all active:scale-95 shadow-[0_20px_50px_rgba(245,158,11,0.4)] russo text-lg sm:text-2xl tracking-widest uppercase overflow-hidden"
                    >
                        <span className="relative z-10">Close Terminal</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    </button>
                </div>
            </div>
        )}

        {/* Sound Toggle */}
        <button 
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-8 right-8 p-4 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
            {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            )}
        </button>

      </div>
    </div>
  );
};

export default ResultRevealOverlay;
