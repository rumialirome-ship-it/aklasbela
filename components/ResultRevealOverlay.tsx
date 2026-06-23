### Key Fixes Applied:
1. **Gemini SDK (`@google/genai`) Image Generation**:
   * Updated the configuration to set `responseModalities: ['IMAGE']` under the `config` object which is required by the SDK for generating images with `gemini-2.5-flash-image`.
   * Added robust type-safe parsing using optional chaining to retrieve the generated base64 image data from the response candidates.
   * Handled environment variables gracefully, checking for both `process.env.API_KEY` and Vite-specific `import.meta.env.VITE_API_KEY`. If no key is set, the API call is skipped with a warning, preventing console errors.

2. **Stale Closure Bug with Audio Muting**:
   * Because `playSynthesizerBeep` and `speakNarrative` were defined inside the component and captured `isMuted` during the initial render, toggling the mute button had no effect on timeouts that were already scheduled.
   * Fixed by implementing a mutable ref (`isMutedRef`) that keeps track of the live mute state, allowing the async timeouts to read the correct value immediately.

3. **Balls Vanishing During Draw Sequence**:
   * Previously, all non-winning lottery balls disappeared from the chamber during the `DELIVERY` and `HOLD` phases due to an incorrect conditional check (`!isActuallyWinner`).
   * Corrected the logic so that non-winning balls remain visible and settle to the bottom of the chamber (`isMixing = false`) while the winning ball travels through the tube.

4. **Draw Sequence Resetting on Props Change**:
   * Reset all simulation states (phase, camera, viewer counts, chat feeds, etc.) at the start of `useEffect` to ensure that if `gameName` or `winningNumber` changes, the drawing resets cleanly from the beginning.

5. **Performance & CSS Property Typing**:
   * Moved static configurations (like `SIMULATED_CHAT_FEED`, `pipelinePath`, and `RAINBOW_COLORS`) out of the component body to prevent them from being re-allocated on every render.
   * Padded and normalized the winning number in a `useMemo` hook once rather than calling `.padStart(2, '0')` and `parseInt` on every ball on every single frame render.
   * Rendered the `timeLeft` countdown (which was previously unused) inside the live camera header during the `SHUFFLE` phase.
   * Typed custom CSS variables securely as `React.CSSProperties` instead of using `as any`.

### Corrected Code:

```tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ResultRevealOverlayProps {
  gameName: string;
  winningNumber: string;
  onClose: () => void;
}

type Phase = 'IDLE' | 'SHUFFLE' | 'DELIVERY' | 'HOLD' | 'REVEAL';

const RAINBOW_COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

// Refined timings for cinematic feel (exactly 32.5s total pre-show)
const SHUFFLE_TIME = 12000;  // 12 seconds vortex mixing
const DELIVERY_TIME = 16000; // 16 seconds pathing through the custom glass cylinder
const HOLD_TIME = 4500;      // 4.5 seconds verification hold

// Sub-cam states for television interface
type CameraAngle = 'CAM_01_STUDIO' | 'CAM_02_DOME' | 'CAM_03_PIPE' | 'CAM_04_DESK';

interface ChatMsg {
  id: number;
  user: string;
  text: string;
  node: string;
  time: string;
}

const PIPELINE_PATH = "M 200 420 L 200 320 L 120 280 L 280 230 L 120 180 L 280 130 L 340 130 L 340 250 L 280 320 L 340 390 L 280 460 L 340 530 L 280 600 L 340 670 L 340 750 L 200 780";

const SIMULATED_CHAT_FEED = [
  { user: "Raja_G", text: "Please let it be open 07!" },
  { user: "LuckyPK", text: "Lahore Node online, heavy stakes active!" },
  { user: "Ali_Shah", text: "Aklasbela TV stream looks absolutely HD tonight" },
  { user: "CyberNomad", text: "Secure VPS Port 3005 connection is stable" },
  { user: "Zain_786", text: "Who else bets 2-digit double units today?" },
  { user: "Malik_Boss", text: "Hoping for standard returns" },
  { user: "CryptoSufi", text: "Pneumatic system is spinning incredibly fast!" },
  { user: "Amina_Jan", text: "08 is going to win, I swear" },
  { user: "Bano_TV", text: "Love the live 3D ball simulation" },
  { user: "King_Arthur", text: "Direct satellite connection is butter smooth." },
  { user: "Kashif_R", text: "Certified ledger values checked" },
  { user: "Siddique78", text: "This is a masterpiece live presentation!" }
];

const Ball: React.FC<{ 
  id: number; 
  number: string; 
  phase: Phase; 
  isActuallyWinner: boolean; 
  winningNumber: string 
}> = React.memo(({ id, number, phase, isActuallyWinner, winningNumber }) => {
  const color = useMemo(() => RAINBOW_COLORS[id % RAINBOW_COLORS.length], [id]);
  
  const motion = useMemo(() => {
    const radius = 60 + Math.random() * 120;
    const speed = 0.2 + Math.random() * 0.3;
    const delay = Math.random() * -10;
    return { radius, speed, delay };
  }, []);

  if (phase === 'REVEAL') return null;

  // The winning ball is drawn along the SVG pipeline path during delivery and hold phases, 
  // so we hide it from the main mixing chamber.
  if (isActuallyWinner && (phase === 'DELIVERY' || phase === 'HOLD')) {
      return null;
  }
  
  const isMixing = phase === 'SHUFFLE';

  return (
    <div 
        className={`lottery-ball-3d ${isMixing ? 'ball-vortex' : ''}`}
        style={{
            '--ball-color': color,
            '--radius': `${motion.radius}px`,
            '--speed': `${motion.speed}s`,
            '--delay': `${motion.delay}s`,
            transform: !isMixing ? `translate(${(id % 12 - 5.5) * 20}px, ${140 + (Math.floor(id/12) * -18)}px)` : undefined
        } as React.CSSProperties}
    >
        <span className="ball-text-3d">{number}</span>
    </div>
  );
});

const ResultRevealOverlay: React.FC<ResultRevealOverlayProps> = ({ gameName, winningNumber, onClose }) => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [timeLeft, setTimeLeft] = useState(SHUFFLE_TIME / 1000);
  const [aiBackdrop, setAiBackdrop] = useState<string | null>(null);
  
  // Custom Live-Stream Telemetry States
  const [camera, setCamera] = useState<CameraAngle>('CAM_01_STUDIO');
  const [isMuted, setIsMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(14850);
  const [bitrate, setBitrate] = useState(8420);
  const [currentSpeech, setCurrentSpeech] = useState("Establishing secure broadcast matrix...");
  const [isHostTalking, setIsHostTalking] = useState(false);
  const [liveChats, setLiveChats] = useState<ChatMsg[]>([]);

  const chatCounter = useRef(0);
  const isMutedRef = useRef(isMuted);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const normalizedWinningNumber = useMemo(() => winningNumber.padStart(2, '0'), [winningNumber]);

  const balls = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    number: i.toString().padStart(2, '0')
  })), []);

  // Audio synthesizer via web audio utility
  const playSynthesizerBeep = (freqStart: number, freqEnd: number, duration: number, wave: OscillatorType = 'sine') => {
    if (isMutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = wave;
      osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("browser sound trigger blocked till interaction");
    }
  };

  // Text-To-Speech Narrator Speech Engine
  const speakNarrative = (text: string) => {
    setCurrentSpeech(text);
    if (isMutedRef.current) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95; // announcer tone
      
      // Select appropriate English voice if available
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) 
                 || voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsHostTalking(true);
      utterance.onend = () => setIsHostTalking(false);
      utterance.onerror = () => setIsHostTalking(false);
      
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsHostTalking(false);
    }
  };

  // Core drawing state trigger logic
  useEffect(() => {
    // Reset states whenever props trigger a new sequence
    setPhase('IDLE');
    setTimeLeft(SHUFFLE_TIME / 1000);
    setCamera('CAM_01_STUDIO');
    setViewerCount(14850);
    setBitrate(8420);
    setCurrentSpeech("Establishing secure broadcast matrix...");
    setIsHostTalking(false);
    setLiveChats([]);
    chatCounter.current = 0;

    // 1. Scene Generation via Google GenAI Studio
    const generateAiBackdrop = async () => {
        try {
            const apiKey = (typeof process !== 'undefined' ? process.env.API_KEY : '') 
              || (import.meta as any).env?.VITE_API_KEY 
              || '';

            if (!apiKey) {
                console.warn("Google GenAI API Key is missing. Skipping AI background generation.");
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const resp = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: "Cinematic medium camera shot of a dark high class glass lottery television studio with scanning neon grids, 4k resolution, ultra futuristic.",
                config: { 
                    responseModalities: ['IMAGE'],
                    imageConfig: { aspectRatio: "16:9" } 
                }
            });

            const parts = resp.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const p of parts) {
                    if (p.inlineData?.data) {
                        setAiBackdrop(`data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.error("AI Scene Generation Engine idle", e);
        }
    };
    generateAiBackdrop();

    // 2. Main Timeline Execution
    playSynthesizerBeep(440, 880, 0.4, 'sawtooth');
    speakNarrative(`Standby. Connecting direct satellite uplink to Aklasbela TV live broadcast suite on port 3005 in Lahore... Network trace validated.`);

    // Timeline steps
    const tStandby = setTimeout(() => {
      setPhase('SHUFFLE');
      setCamera('CAM_02_DOME');
      playSynthesizerBeep(600, 1200, 0.6, 'sine');
      speakNarrative(`Satellite linked! Initiating pneumatic pressure. The official air vortex for ${gameName} has been engaged. All ninety nine secured digit units are under aerodynamic swirl. Ready for extraction!`);
    }, 4500);

    const tDelivery = setTimeout(() => {
      setPhase('DELIVERY');
      setCamera('CAM_03_PIPE');
      playSynthesizerBeep(1200, 300, 1.2, 'triangle');
      speakNarrative(`Zero contact isolation achieved! One random security unit is traveling through the refractive glass line. Highly precise optical sensors tracking in real time...`);
    }, 4500 + SHUFFLE_TIME);

    const tHold = setTimeout(() => {
      setPhase('HOLD');
      setCamera('CAM_04_DESK');
      playSynthesizerBeep(880, 1760, 0.8, 'sine');
      speakNarrative(`Isolation complete! The certified winning ball has docked in the calibration plinth. Official outcome detected...`);
    }, 4500 + SHUFFLE_TIME + DELIVERY_TIME);

    const tReveal = setTimeout(() => {
      setPhase('REVEAL');
      playSynthesizerBeep(523.25, 1046.50, 1.5, 'triangle'); // high C chord chime
      speakNarrative(`Outcome confirmed! The official winning result for ${gameName} is declared as double digit ${normalizedWinningNumber}. Multiplied payouts are routing to active dealer ledgers. Congratulations to the winning accounts!`);
    }, 4500 + SHUFFLE_TIME + DELIVERY_TIME + HOLD_TIME);

    // 3. Sub-ticks for countdown and telemetry fluctuation
    const startTime = Date.now();
    const tickInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, (SHUFFLE_TIME - (elapsed - 4500)) / 1000);
        if (elapsed >= 4500) {
            setTimeLeft(Math.ceil(remaining));
        }
        
        // Random viewer count and bitrate fluctuation
        setViewerCount(prev => prev + Math.floor(Math.random() * 21) - 10);
        setBitrate(prev => Math.max(8200, Math.min(8800, prev + Math.floor(Math.random() * 51) - 25)));
    }, 1000);

    // 4. Simulated Chat Matrix flow
    const chatInterval = setInterval(() => {
        const randomItem = SIMULATED_CHAT_FEED[Math.floor(Math.random() * SIMULATED_CHAT_FEED.length)];
        const newMsg: ChatMsg = {
          id: chatCounter.current++,
          user: randomItem.user,
          text: randomItem.text,
          node: `NODE_${3000 + Math.floor(Math.random() * 10)}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setLiveChats(prev => [newMsg, ...prev].slice(0, 12));
    }, 2500);

    return () => {
      clearTimeout(tStandby);
      clearTimeout(tDelivery);
      clearTimeout(tHold);
      clearTimeout(tReveal);
      clearInterval(tickInterval);
      clearInterval(chatInterval);
      window.speechSynthesis.cancel();
    };
  }, [gameName, winningNumber, normalizedWinningNumber]);

  // Handle sudden mute toggle changes and cancel or trigger script speak
  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    isMutedRef.current = nextState;
    if (nextState) {
      window.speechSynthesis.cancel();
      setIsHostTalking(false);
    } else {
      // resume speech narrative
      speakNarrative(currentSpeech);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] select-none bg-black overflow-hidden flex flex-col justify-between font-inter text-slate-100 pb-4">
      {/* 1. ANALOG CRUDE SCANLINES FILTER */}
      <div className="live-scanlines" />

      {/* BACKGROUND GRAPHIC (GENERATED LIVE BY AI STUDIO) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {aiBackdrop ? (
          <img src={aiBackdrop} className="w-full h-full object-cover opacity-20 blur-md scale-105" alt="" />
        ) : (
          <div className="w-full h-full bg-slate-950/90" />
        )}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/80 to-slate-950" />
      </div>

      {/* 2. BROADCAST TELECOMMUNICATION METADATA HEADER */}
      <div className="relative z-50 bg-slate-950/95 border-b border-white/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-md text-[10px] font-black uppercase tracking-widest live-indicator-pulse">
            <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
            <span>LIVE BROADCAST</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-4">
            <span className="hidden md:inline">TR: 3005-A_TV</span>
            <span>CH: {camera}</span>
            {phase === 'SHUFFLE' && (
              <span className="text-red-500 font-bold animate-pulse">SHUFFLE: {timeLeft}s</span>
            )}
            <span className="text-emerald-400 font-bold">{bitrate} KBPS</span>
            <span className="text-amber-500 font-black">{viewerCount.toLocaleString()} VIEWERS</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleToggleMute}
            className={`px-4 py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'}`}
          >
            {isMuted ? '🔊 CLICK TO UNMUTE SPEECH' : '🔇 MUTE ROBOT SPEAKER'}
          </button>
          
          <div className="text-right hidden sm:block">
            <h1 className="russo text-white text-base tracking-tighter leading-none">
              AKLASBELA <span className="text-amber-500">TV</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mt-1">Direct VPS Feed</p>
          </div>
        </div>
      </div>

      {/* 3. BROADCAST CONSOLE LAYOUT (TWO PALETTES) */}
      {phase !== 'REVEAL' ? (
        <div className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
          
          {/* LEFT CHANNEL: BROADCASTER FEED & PRESENTATION BOX */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            {/* VIRTUAL ROBOTIC ANNOUNCER AVATAR DECK */}
            <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center backdrop-blur-md relative overflow-hidden flex-1 group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-transparent" />
              
              {/* CYBERNETIC AVATAR PORTRAIT SVG */}
              <div className="relative w-28 h-28 rounded-full border-4 border-amber-500/40 bg-slate-950 flex items-center justify-center mb-4 overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <svg className="w-20 h-20 text-amber-500" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Cyber helmet outline */}
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M20 50 C20 30, 80 30, 80 50 C80 65, 70 80, 50 80 C30 80, 20 65, 20 50 Z" stroke="currentColor" strokeWidth="3" fill="#020617" />
                  {/* Glowing Visor screen */}
                  <rect x="25" y="42" width="50" height="12" rx="6" fill="#f59e0b" className="animate-pulse" opacity="0.8" />
                  <line x1="30" y1="48" x2="70" y2="48" stroke="#000" strokeWidth="2" />
                  {/* Animated mouth waves */}
                  <g transform="translate(50, 68)">
                    <rect x="-12" y="-3" width="24" height="6" rx="2" fill="currentColor" className={isHostTalking ? "presenter-mouth" : ""} style={{ '--speech-speed': '0.15s' } as React.CSSProperties} />
                  </g>
                  {/* Neon node ticks */}
                  <circle cx="50" cy="20" r="3" fill="#f59e0b" className="animate-ping" />
                </svg>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 tracking-widest uppercase">AI STREAM PRESENTER_4</span>
                <p className="font-mono text-[10px] text-slate-500 font-bold uppercase mt-1">Direct VPS Feed Synced</p>
              </div>

              {/* REAL-TIME PRESENTATION NARRATION SUBTITLES */}
              <div className="mt-4 bg-slate-950/80 p-4 rounded-xl border border-white/5 min-h-[90px] flex items-center justify-center max-w-xs mx-auto">
                <p className="font-mono text-[10px] text-amber-400 leading-normal uppercase text-center font-bold">
                  "{currentSpeech}"
                </p>
              </div>

              {/* BOUNCING EQUALIZER WAVEFORM BANDS */}
              <div className="flex justify-center items-end gap-1.5 h-10 mt-4">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="wave-bar" 
                    style={{
                      '--duration': `${0.4 + Math.random() * 0.5}s`,
                      '--delay': `${Math.random() * -1}s`,
                      backgroundColor: isHostTalking ? '#f59e0b' : '#334155',
                      height: isHostTalking ? undefined : '4px',
                      animationPlayState: isHostTalking ? 'running' : 'paused'
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE CHANNEL: CENTRAL CORE DRAWING PLATFORM */}
          <div className="lg:col-span-2 flex flex-col justify-center items-center relative overflow-hidden border border-white/5 rounded-[2rem] bg-slate-950/60 backdrop-blur-sm p-4 min-h-[460px]">
            {/* CAMERA BOUNDARY OVERLAY HUD */}
            <div className="absolute inset-4 border border-white/5 pointer-events-none rounded-2xl z-20">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-500" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-slate-500" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-slate-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-500" />
              <div className="absolute top-2 right-4 text-[9px] font-mono text-slate-500">AUTO-TRACK FEED [99.8%]</div>
            </div>

            {/* INTRO CONNECTING ANIMATION Screen */}
            {phase === 'IDLE' && (
              <div className="text-center space-y-4 animate-pulse relative z-50">
                <div className="w-16 h-16 rounded-full border-4 border-t-amber-500 border-r-amber-500/20 border-b-amber-500/20 border-l-amber-500/20 animate-spin mx-auto mb-4" />
                <h3 className="text-xl russo text-white tracking-[0.2em] uppercase">{gameName} LIVE</h3>
                <p className="text-[10px] font-mono text-amber-500 tracking-widest uppercase">LOCKING DECOUPLED TRANSMISSION FEED...</p>
              </div>
            )}

            {/* THE SPHERICAL MIXING CORE */}
            {(phase === 'SHUFFLE' || phase === 'DELIVERY' || phase === 'HOLD') && (
              <div className="relative aspect-[1/2] w-full max-w-[325px] h-full flex items-center justify-center p-0 mx-auto select-none">
                
                {/* GLASSY DRAW PIPE BACK VECTOR (Z-Index 10) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[10]" viewBox="0 0 400 800" preserveAspectRatio="none">
                    <defs>
                        <radialGradient id="winnerBallGrad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="15%" stopColor="#fffbeb" />
                            <stop offset="65%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#581c0c" />
                        </radialGradient>
                        <linearGradient id="glareGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="white" stopOpacity="0.84" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                        <filter id="ballShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.75" />
                        </filter>
                    </defs>
                    {/* Shadow casing of the glass tube */}
                    <path d={PIPELINE_PATH} stroke="rgba(15, 23, 42, 0.95)" strokeWidth="64" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    {/* Dark inner tube wall shading */}
                    <path d={PIPELINE_PATH} stroke="rgba(30, 41, 59, 0.82)" strokeWidth="58" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    {/* Internal vacuum track highlight */}
                    <path d={PIPELINE_PATH} stroke="rgba(245, 158, 11, 0.15)" strokeWidth="48" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                </svg>

                {/* WINNING BALL DOCKED AND DELIVERED (Z-Index 20) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[20]" viewBox="0 0 400 800" preserveAspectRatio="none">
                    {phase === 'DELIVERY' && (
                        <g filter="url(#ballShadow)">
                            <g>
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0"
                                    to="1440"
                                    dur="16s"
                                    repeatCount="1"
                                />
                                <circle cx="0" cy="0" r="23" fill="url(#winnerBallGrad)" />
                                <circle cx="0" cy="0" r="23" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                                <text
                                    textAnchor="middle"
                                    dy="6"
                                    fill="#1e1b4b"
                                    fontSize="18"
                                    fontWeight="900"
                                    fontFamily="'Russo One', sans-serif"
                                    letterSpacing="-0.5px"
                                >
                                    {normalizedWinningNumber}
                                </text>
                                <path d="M -16 -8 A 18 18 0 0 1 16 -8 A 18 10 0 0 0 -16 -8" fill="url(#glareGrad)" opacity="0.6" />
                            </g>
                            <animateMotion
                                key={phase + normalizedWinningNumber}
                                dur="16s"
                                repeatCount="1"
                                fill="freeze"
                                path={PIPELINE_PATH}
                                calcMode="paced"
                            />
                        </g>
                    )}

                    {phase === 'HOLD' && (
                        <g filter="url(#ballShadow)" transform="translate(200, 780)">
                            <circle cx="0" cy="0" r="24" fill="url(#winnerBallGrad)" />
                            <circle cx="0" cy="0" r="24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                            <text
                                textAnchor="middle"
                                dy="7"
                                fill="#1e1b4b"
                                fontSize="19"
                                fontWeight="900"
                                fontFamily="'Russo One', sans-serif"
                                letterSpacing="-0.5px"
                            >
                                {normalizedWinningNumber}
                            </text>
                            <path d="M -17 -8 A 19 19 0 0 1 17 -8 A 19 11 0 0 0 -17 -8" fill="url(#glareGrad)" opacity="0.6" />
                        </g>
                    )}
                </svg>

                {/* MECHANICAL ROTATING SPHERE (Z-Index 15) */}
                <div className="machine-jar">
                    <div className="jar-neck-mechanical">
                        <div className="jar-neck-glow" />
                    </div>
                    <div className={`jar-body-sphere ${phase === 'SHUFFLE' ? 'chamber-vortex-glow' : ''}`}>
                        {balls.map((b) => (
                            <Ball 
                                key={b.id} 
                                id={b.id} 
                                number={b.number} 
                                phase={phase} 
                                isActuallyWinner={b.number === normalizedWinningNumber} 
                                winningNumber={normalizedWinningNumber} 
                            />
                        ))}

                        {/* SECONDARY SVG GLASS-MORPHISM REFRACTION OVERLAY & FILTER (Z-Index 48 - directly on top of the balls) */}
                        <div className="absolute inset-0 rounded-full pointer-events-none z-[48] overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    {/* High-fidelity glass sphere glare gradient */}
                                    <linearGradient id="glassSphereGlare" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                                        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.22" />
                                        <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
                                    </linearGradient>
                                    
                                    {/* Sub-spherical internal refraction glow */}
                                    <radialGradient id="glassSphereRefraction" cx="70%" cy="70%" r="65%">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                                        <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.09" />
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                                    </radialGradient>
                                    
                                    {/* Pure light source specular hotspot */}
                                    <radialGradient id="glassHotspot" cx="28%" cy="24%" r="18%">
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
                                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.18" />
                                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                    </radialGradient>

                                    {/* Thick 3D lens highlight border */}
                                    <linearGradient id="glassRim" x1="1" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
                                        <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
                                    </linearGradient>

                                    {/* Real glass thickness edge distortion filter */}
                                    <filter id="glassRefractFilter" x="-10%" y="-10%" width="120%" height="120%">
                                        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" result="noise" />
                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                                    </filter>
                                </defs>

                                {/* Base refraction shading inside the glass chamber */}
                                <circle cx="50" cy="50" r="49.5" fill="url(#glassSphereRefraction)" />
                                
                                {/* Structural edge reflection ring */}
                                <circle cx="50" cy="50" r="48.5" fill="none" stroke="url(#glassRim)" strokeWidth="1.8" />
                                
                                {/* Realistic crescence glare curve mirroring standard glass bubbles */}
                                <path d="M 6,24 A 44,44 0 0,1 94,24 A 44,22 0 0,0 6,24" fill="url(#glassSphereGlare)" />
                                
                                {/* Deep micro hotspot glint */}
                                <circle cx="30" cy="22" r="9" fill="url(#glassHotspot)" />
                                
                                {/* Multi-faceted lens refraction circles */}
                                <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255, 255, 255, 0.09)" strokeWidth="0.8" strokeDasharray="3 15" />
                                <circle cx="50" cy="50" r="45.5" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* GLASSY DRAW PIPE FRONT REFRACTIVE HIGHLIGHTS (Z-Index 30) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[30]" viewBox="0 0 400 800" preserveAspectRatio="none">
                    {/* Soft glass edge glow */}
                    <path d={PIPELINE_PATH} stroke="rgba(255, 255, 255, 0.14)" strokeWidth="56" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    {/* High-gloss light strike refraction */}
                    <path d={PIPELINE_PATH} className="glass-pipe-highlight" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    {/* Dual glare reflection */}
                    <path d={PIPELINE_PATH} stroke="rgba(255, 255, 255, 0.18)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" transform="translate(6, 0)" opacity="0.8" />
                </svg>

                {/* DECISION COLLECTION CUPPED RECEPTACLE (Z-Index 50) */}
                <div className={`result-display-box transition-all duration-1000 ${phase === 'SHUFFLE' ? 'opacity-0 translate-y-48 scale-90' : 'opacity-100 translate-y-0 scale-100'}`}>
                    <div className="absolute -top-[52px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="bg-slate-900 border-2 border-amber-500/60 px-6 py-1 rounded-full shadow-lg shadow-amber-500/10">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] whitespace-nowrap">EXTRACTED DOCK</p>
                        </div>
                        <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500 to-transparent"></div>
                    </div>
                    
                    {phase === 'HOLD' ? (
                        <span className="result-glow-text">{normalizedWinningNumber}</span>
                    ) : (
                        <div className="flex gap-4">
                            <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce" />
                            <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-150" />
                            <div className="w-3 h-3 rounded-full bg-slate-800 animate-bounce delay-300" />
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT CHANNEL: THE LIVE STREAM CONSOLE FEED */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] p-6 flex flex-col backdrop-blur-md relative overflow-hidden flex-1">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-red-500 to-transparent" />
              
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  LIVE MATRIX CONDUIT
                </span>
                <span className="font-mono text-[8px] text-slate-500 font-bold uppercase">100% ONLINE</span>
              </div>

              {/* ROLLING DIGITAL COMMENTS */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 min-h-[220px]">
                {liveChats.map((c) => (
                  <div key={c.id} className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 space-y-1 animate-fade-in">
                    <div className="flex justify-between text-[8px] font-bold font-mono">
                      <span className="text-amber-500 uppercase tracking-tight">@{c.user}</span>
                      <span className="text-slate-500 uppercase">{c.node}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-normal uppercase">
                      {c.text}
                    </p>
                  </div>
                ))}
                {liveChats.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">AWAITING LIVE SATELLITE CHAT FEED...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. CLINICAL REVEAL PLATFORM SCREEN (STANDALONE FINALE VIEW) */}
      {phase === 'REVEAL' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black reveal-slam-bg z-[10020] p-10 select-none overflow-y-auto">
            <div className="relative text-center space-y-12 max-w-5xl animate-result-slam-3d my-auto w-full">
                <div className="space-y-6">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/40 px-8 py-3 rounded-full">
                        <p className="text-amber-500 font-black text-[11px] uppercase tracking-[1em] animate-pulse">OFFICIAL CERTIFIED RESULT</p>
                    </div>
                    <h2 className="text-white text-5xl sm:text-8xl font-black russo tracking-tighter uppercase drop-shadow-[0_0_60px_rgba(245,158,11,0.4)]">
                      {gameName}
                    </h2>
                </div>
                
                <div className="relative inline-block px-12 py-10 sm:px-44 sm:py-28 bg-white/[0.03] rounded-[4rem] sm:rounded-[10rem] border-2 border-amber-500/50 shadow-[0_0_120px_rgba(245,158,11,0.35)] backdrop-blur-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-amber-500/15" />
                    <span className="relative text-[10rem] sm:text-[24rem] font-black russo text-white gold-shimmer tracking-tighter leading-none block drop-shadow-[0_40px_100px_rgba(0,0,0,1)]">
                        {normalizedWinningNumber}
                    </span>
                </div>

                <div className="pt-8">
                    <button 
                        onClick={onClose}
                        className="group bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-20 py-6 sm:px-36 sm:py-8 rounded-[2.5rem] uppercase tracking-[0.8em] text-[11px] sm:text-sm transition-all transform active:scale-95 shadow-[0_0_50px_rgba(245,158,11,0.4)] border-b-8 border-amber-700 overflow-hidden relative"
                    >
                        <span className="relative z-10">ACCEPT CERTIFIED DIGIT</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 5. FOOTER NEWS MARQUEE ALERT TICKER STRIP */}
      <div className="relative z-50 bg-slate-950/95 border-t border-white/15 py-3 overflow-hidden">
        <div className="news-marquee-content">
          <div className="text-[10px] font-mono text-slate-400 font-bold uppercase flex gap-12 select-none">
            <span className="text-amber-500">★ AKLASBELA TV NET AT PORT 3005 ACTIVE ★</span>
            <span>DELEGATED PM2 DISPATCH HOST - RUNNING SAFELY ALONGSIDE PORT 3001</span>
            <span className="text-amber-500">★ MARKET STATUS: OPEN ★</span>
            <span>SECURITY CONTRACTS GUARANTEED BY SQLITE LEDGERS</span>
            <span className="text-amber-400">ALERT: ALL APPROVED WIN PAYOUTS SETTLED AUTOMATICALLY BY DIRECT INTEGRATION</span>
            <span className="text-amber-500">★ BROADCAST END ★</span>
          </div>
          {/* Duplicate content to complete scrolling loop seamlessly */}
          <div className="text-[10px] font-mono text-slate-400 font-bold uppercase flex gap-12 select-none pl-12">
            <span className="text-amber-500">★ AKLASBELA TV NET AT PORT 3005 ACTIVE ★</span>
            <span>DELEGATED PM2 DISPATCH HOST - RUNNING SAFELY ALONGSIDE PORT 3001</span>
            <span className="text-amber-500">★ MARKET STATUS: OPEN ★</span>
            <span>SECURITY CONTRACTS GUARANTEED BY SQLITE LEDGERS</span>
            <span className="text-amber-400">ALERT: ALL APPROVED WIN PAYOUTS SETTLED AUTOMATICALLY BY DIRECT INTEGRATION</span>
            <span className="text-amber-500">★ BROADCAST END ★</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultRevealOverlay;
```