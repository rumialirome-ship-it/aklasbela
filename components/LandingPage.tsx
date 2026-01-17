
import React, { useState } from 'react';
import { Game } from '../types';
import { useCountdown } from '../hooks/useCountdown';
import { Icons, GAME_LOGOS } from '../constants';
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
    const themeColor = hasFinalWinner ? 'emerald' : 'amber';
    const logo = GAME_LOGOS[game.name] || '';

    return (
        <button
            onClick={onClick}
            className={`relative group bg-slate-800/50 p-6 flex flex-col items-center justify-between text-center transition-all duration-300 ease-in-out border border-slate-700 w-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-${themeColor}-500`}
            style={{
                clipPath: 'polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
            }}
        >
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-${themeColor}-500 to-amber-300 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500`}></div>
            <div className="relative z-10 w-full flex flex-col h-full">
                <div className="flex-grow">
                    <img src={logo} alt={`${game.name} logo`} className="w-24 h-24 rounded-full mb-4 border-4 border-slate-700 group-hover:border-amber-400 transition-colors" />
                    <h3 className="text-2xl text-white mb-1 uppercase tracking-wider">{game.name}</h3>
                    <p className="text-slate-400 text-sm">Draw @ {formatTime12h(game.drawTime)}</p>
                </div>
                <div className={`text-center w-full p-2 mt-4 bg-black/30 border-t border-${themeColor}-400/20 min-h-[80px] flex flex-col justify-center`}>
                    {hasFinalWinner ? (
                        <>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-black mb-1">DRAW RESULT</div>
                            <div className="text-5xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(52,211,153,0.5)] flex items-center justify-center gap-2">
                                <span>{game.winningNumber}</span>
                            </div>
                        </>
                    ) : isMarketClosedForDisplay ? (
                        <>
                            <div className="text-xs uppercase tracking-widest text-slate-400">STATUS</div>
                            <div className="text-2xl font-mono font-bold text-red-400">MARKET CLOSED</div>
                        </>
                    ) : status === 'OPEN' ? (
                        <>
                            <div className="text-xs uppercase tracking-widest text-slate-400">CLOSES IN</div>
                            <div className="text-3xl font-mono font-bold text-amber-300">{countdownText}</div>
                        </>
                    ) : (
                        <>
                            <div className="text-xs uppercase tracking-widest text-slate-400">MARKET OPENS</div>
                            <div className="text-xl font-mono font-bold text-slate-400">{countdownText}</div>
                        </>
                    )}
                </div>
            </div>
        </button>
    );
};

type LoginRole = 'User' | 'Dealer';

const LoginPanel: React.FC<{ onForgotPassword: () => void }> = ({ onForgotPassword }) => {
    const { login } = useAuth();
    const [activeTab, setActiveTab] = useState<LoginRole>('User');
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const roles: { name: LoginRole; theme: { text: string; ring: string; button: string; buttonHover: string; } }[] = [
        { name: 'User', theme: { text: 'text-amber-400', ring: 'focus:ring-amber-500', button: 'from-amber-500 to-orange-500', buttonHover: 'hover:from-amber-400 hover:to-orange-400' } },
        { name: 'Dealer', theme: { text: 'text-emerald-400', ring: 'focus:ring-emerald-500', button: 'from-emerald-500 to-green-500', buttonHover: 'hover:from-emerald-400 hover:to-green-400' } }
    ];

    const activeRole = roles.find(r => r.name === activeTab)!;

    const handleTabClick = (role: LoginRole) => {
        setActiveTab(role);
        setLoginId(''); setPassword(''); setError(null); setIsPasswordVisible(false);
    };
    
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId.trim() || !password.trim()) { setError("Account ID and Password are required."); return; }
        setError(null);
        try { 
            await login(loginId, password); 
        } catch (err) { 
            setError(err instanceof Error ? err.message : "An unknown login error occurred."); 
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-1.5 flex items-center space-x-2 bg-black/20">
                {roles.map(role => (
                    <button key={role.name} onClick={() => handleTabClick(role.name)} className={`flex-1 py-2 px-4 text-sm uppercase tracking-widest rounded-md transition-all duration-300 ${activeTab === role.name ? `bg-slate-700 ${activeRole.theme.text} shadow-lg` : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`} aria-pressed={activeTab === role.name}>
                        {role.name}
                    </button>
                ))}
            </div>
            <div className="p-8">
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="loginId" className="block text-sm font-medium text-slate-300 mb-1 uppercase tracking-wider">Account ID</label>
                        <input type="text" id="loginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} className={`w-full bg-slate-900/50 p-3 rounded-md border border-slate-600 focus:ring-2 ${activeRole.theme.ring} focus:outline-none text-white placeholder-slate-500 transition-shadow duration-300 shadow-inner`} placeholder={`Enter ${activeTab} ID`} aria-describedby="error-message" />
                    </div>
                    <div>
                         <div className="flex justify-between items-center mb-1">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 uppercase tracking-wider">Password</label>
                            <button type="button" onClick={onForgotPassword} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Forgot?</button>
                        </div>
                        <div className="relative">
                            <input type={isPasswordVisible ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full bg-slate-900/50 p-3 rounded-md border border-slate-600 focus:ring-2 ${activeRole.theme.ring} focus:outline-none text-white placeholder-slate-500 transition-shadow duration-300 shadow-inner pr-10`} placeholder="Enter password" aria-describedby="error-message" />
                             <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white" aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}>
                                {isPasswordVisible ? Icons.eyeOff : Icons.eye}
                            </button>
                        </div>
                    </div>
                    {error && <p id="error-message" role="alert" className="text-sm text-red-300 bg-red-500/20 p-3 rounded-md border border-red-500/30">{error}</p>}
                    <button type="submit" className={`w-full text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20 bg-gradient-to-r ${activeRole.theme.button} ${activeRole.theme.buttonHover}`}>
                        LOGIN
                    </button>
                </form>
            </div>
        </div>
    );
};

const LandingPage: React.FC<{ games: Game[] }> = ({ games }) => {
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    
    const handleGameClick = () => {
        document.getElementById('login')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-transparent text-slate-200 p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center my-12 md:my-20">
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-3 tracking-wider glitch-text" data-text="A-BABA EXCHANGE">A-BABA EXCHANGE</h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-sans">The Gold Standard of Digital Lotteries. Manage your wealth, track results, and play with confidence.</p>
                </header>

                <section id="games" className="mb-20">
                    <h2 className="text-3xl font-bold text-center mb-10 text-white uppercase tracking-widest">Live Markets</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                        {games.map(game => (
                            <GameDisplayCard key={game.id} game={game} onClick={handleGameClick} />
                        ))}
                    </div>
                </section>

                <section id="login" className="max-w-md mx-auto scroll-mt-20">
                    <LoginPanel onForgotPassword={() => setIsResetModalOpen(true)} />
                     <div className="mt-6">
                        <button onClick={() => setIsAdminModalOpen(true)} className="w-full text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500">
                            ADMIN ACCESS
                        </button>
                    </div>
                </section>

                <footer className="text-center py-8 mt-12 text-slate-500 font-sans">
                    <p>&copy; {new Date().getFullYear()} A-Baba Exchange. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
