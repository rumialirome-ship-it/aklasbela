
import React, { useState } from 'react';
import { Game } from '../types';
import { useCountdown } from '../hooks/useCountdown';
import { Icons, getDynamicLogo } from '../constants';
import { useAuth } from '../hooks/useAuth';

const formatTime12h = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const GameDisplayCard: React.FC<{ game: Game; onClick: () => void }> = ({ game, onClick }) => {
    const { status, text: countdownText } = useCountdown(game.drawTime);
    const hasFinalWinner = !!game.winningNumber && !game.winningNumber.endsWith('_');
    const isMarketClosedForDisplay = !game.isMarketOpen;
    const logo = getDynamicLogo(game.name);

    return (
        <button
            onClick={onClick}
            className="group relative glass-card p-6 flex flex-col items-center justify-between text-center w-full rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10 w-full flex flex-col h-full items-center">
                <div className="relative mb-4">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <img src={logo} alt={`${game.name} logo`} className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-800 group-hover:border-amber-500/50 transition-all duration-500 object-cover" />
                </div>
                
                <h3 className="text-xl md:text-2xl text-white mb-1 uppercase tracking-wider russo">{game.name}</h3>
                <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase">Draw @ {formatTime12h(game.drawTime)}</p>
                
                <div className={`text-center w-full p-3 mt-5 rounded-xl bg-slate-950/50 border border-white/5 min-h-[90px] flex flex-col justify-center transition-all duration-500 group-hover:bg-slate-950/80`}>
                    {hasFinalWinner ? (
                        <>
                            <div className="text-[9px] uppercase tracking-[0.4em] text-emerald-400 font-black mb-1">WINNING NUMBER</div>
                            <div className="text-4xl md:text-5xl font-mono font-black text-white gold-shimmer">
                                {game.winningNumber}
                            </div>
                        </>
                    ) : isMarketClosedForDisplay ? (
                        <>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">STATUS</div>
                            <div className="text-xl font-black text-red-500/80">MARKET CLOSED</div>
                        </>
                    ) : status === 'OPEN' ? (
                        <>
                            <div className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold mb-1">ENTRIES CLOSE</div>
                            <div className="text-3xl font-mono font-bold text-amber-400 tracking-tighter">{countdownText}</div>
                        </>
                    ) : (
                        <>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">NEXT GAME</div>
                            <div className="text-xl font-mono font-bold text-slate-400">{countdownText}</div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </div>
        </button>
    );
};

const LoginPanel: React.FC<{ onForgotPassword: () => void }> = ({ onForgotPassword }) => {
    const { login } = useAuth();
    const [activeTab, setActiveTab] = useState<'User' | 'Dealer'>('User');
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId.trim() || !password.trim()) { setError("Missing credentials."); return; }
        setIsLoading(true);
        setError(null);
        try { 
            await login(loginId, password); 
        } catch (err) { 
            setError("Invalid credentials. Please try again."); 
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-panel rounded-3xl shadow-2xl border border-white/10 overflow-hidden w-full max-w-md mx-auto">
            <div className="flex bg-slate-950/40 p-2 border-b border-white/5">
                {(['User', 'Dealer'] as const).map(role => (
                    <button 
                        key={role} 
                        onClick={() => { setActiveTab(role); setError(null); }}
                        className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-500 ${activeTab === role ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {role}
                    </button>
                ))}
            </div>
            
            <div className="p-8 sm:p-10">
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Login ID</label>
                        <input 
                            type="text" 
                            value={loginId} 
                            onChange={(e) => setLoginId(e.target.value)} 
                            className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/5 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white transition-all duration-300 placeholder-slate-700" 
                            placeholder={`Enter ${activeTab} ID`} 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Code</label>
                            <button type="button" onClick={onForgotPassword} className="text-[10px] font-bold text-amber-500/60 hover:text-amber-400 transition-colors uppercase tracking-widest">Help?</button>
                        </div>
                        <div className="relative">
                            <input 
                                type={isPasswordVisible ? 'text' : 'password'} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/5 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white transition-all duration-300 placeholder-slate-700 pr-12" 
                                placeholder="••••••••" 
                            />
                            <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-500 transition-colors">
                                {isPasswordVisible ? Icons.eyeOff : Icons.eye}
                            </button>
                        </div>
                    </div>
                    
                    {error && <div className="text-[11px] font-bold text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-shake">{error}</div>}
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-4 rounded-2xl transition-all duration-300 transform active:scale-95 shadow-xl shadow-amber-500/10 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
                    >
                        {isLoading ? <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div> : 'Secure Authorization'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const LandingPage: React.FC<{ games: Game[] }> = ({ games }) => {
    return (
        <div className="min-h-screen flex flex-col">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-grow flex flex-col">
                <header className="text-center pt-16 pb-12 md:pt-24 md:pb-20">
                    <div className="inline-block mb-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4 animate-pulse">
                            Secure Digital Lottery
                        </div>
                    </div>
                    <div className="relative inline-block">
                        <h1 className="text-6xl md:text-[9rem] font-black mb-6 tracking-tighter leading-none premium-gold-text glitch-layer" data-text="AKLASBELA-TV">
                            AKLASBELA-TV
                        </h1>
                        <div className="absolute -inset-x-20 -top-20 -bottom-20 bg-amber-500/5 blur-[100px] pointer-events-none -z-10"></div>
                    </div>
                    <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed mt-4">
                        The gold standard of digital lotteries. View live results and play with total security on our encrypted platform.
                    </p>
                </header>

                <section id="games" className="mb-24">
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="w-8 h-1 bg-amber-500 rounded-full"></span>
                            Live Games
                        </h2>
                        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Synchronized Feed
                        </div>
                    </div>
                    
                    {games && games.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8">
                            {games.map(game => (
                                <GameDisplayCard 
                                    key={game.id} 
                                    game={game} 
                                    onClick={() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel p-16 rounded-3xl border-dashed border-white/10 text-center">
                            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Syncing Game Data...</p>
                            <p className="text-sm text-slate-600">Verification nodes are updating the ledger. Please wait.</p>
                        </div>
                    )}
                </section>

                <section id="login" className="max-w-md mx-auto w-full pb-24 scroll-mt-24">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Game Portal</h2>
                        <p className="text-xs text-slate-500 mt-2">Enter your credentials to enter the platform.</p>
                    </div>
                    <LoginPanel onForgotPassword={() => alert("Please contact your administrator for credential recovery.")} />
                </section>

                <footer className="mt-auto border-t border-white/5 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs">AK</div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Aklasbela Protocol v4.5</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} Aklasbela-tv. All Rights Reserved.
                    </p>
                    <div className="flex gap-6">
                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest hover:text-amber-500 cursor-pointer transition-colors">Support</div>
                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest hover:text-amber-500 cursor-pointer transition-colors">Terms</div>
                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest hover:text-amber-500 cursor-pointer transition-colors">Privacy</div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
