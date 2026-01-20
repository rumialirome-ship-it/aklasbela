
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Role, User, Dealer, Admin, Game, Bet, LedgerEntry } from './types';
import { Icons } from './constants';
import LandingPage from './components/LandingPage';
import AdminPanel from './components/AdminPanel';
import DealerPanel from './components/DealerPanel';
import UserPanel from './components/UserPanel';
import ResultRevealOverlay from './components/ResultRevealOverlay';
import { AuthProvider, useAuth } from './hooks/useAuth';

const Header: React.FC = () => {
    const { role, account, logout } = useAuth();
    if (!role || !account) return null;

    const roleStyles: { [key in Role]: string } = {
        [Role.Admin]: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
        [Role.Dealer]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
        [Role.User]: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]',
    };

    return (
        <header className="sticky top-0 z-50 glass-panel border-b border-white/5 h-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-full">
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-amber-500/30 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        {role === Role.Admin ? (
                            <div className="relative w-12 h-12 rounded-xl bg-red-600 border-2 border-amber-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <span className="russo text-xs text-white font-black tracking-tighter">GURU</span>
                            </div>
                        ) : account.avatarUrl ? (
                            <img src={account.avatarUrl} alt={account.name} className="relative w-12 h-12 rounded-full object-cover border-2 border-amber-500/30" />
                        ) : (
                            <div className="relative w-12 h-12 rounded-full bg-slate-900 border-2 border-amber-500/30 flex items-center justify-center">
                                <span className="russo text-xl text-amber-400">{account.name ? account.name.charAt(0) : '?'}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="hidden sm:block">
                        <h1 className="text-xl font-black russo tracking-tighter text-white" style={{letterSpacing: '-0.02em'}}>
                            AKLASBELA <span className="text-amber-500">TV</span>
                        </h1>
                         <div className="flex items-center mt-0.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mr-3 border ${roleStyles[role]}`}>{role}</span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{account.name || 'Account'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                     { typeof account.wallet === 'number' && (
                        <div className="hidden md:flex flex-col items-end">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Liquidity</p>
                            <div className="flex items-center bg-slate-950/50 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner">
                                <span className="font-black text-amber-500 text-lg font-mono">PKR {account.wallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={logout} 
                        className="bg-slate-900/80 border border-white/5 hover:border-red-500/40 hover:text-red-400 text-slate-400 text-[10px] font-black uppercase tracking-widest py-2.5 px-6 rounded-xl transition-all duration-300"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        </header>
    );
};

const AppContent: React.FC = () => {
    const { role, account, loading, fetchWithAuth, verifyData, setAccount } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [bets, setBets] = useState<Bet[]>([]);
    const [hasInitialFetched, setHasInitialFetched] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isMaintenance, setIsMaintenance] = useState(false);
    
    const [activeReveal, setActiveReveal] = useState<{ name: string; number: string } | null>(null);
    const lastGamesRef = useRef<Game[]>([]);

    const parseAllDates = (data: any) => {
        if (!data) return data;
        const parseLedger = (ledger: LedgerEntry[] = []) => ledger.map(e => ({...e, timestamp: new Date(e.timestamp)}));
        if (data.users && Array.isArray(data.users)) data.users = data.users.map((u: User) => u ? ({...u, ledger: parseLedger(u.ledger)}) : null).filter(Boolean);
        if (data.dealers && Array.isArray(data.dealers)) data.dealers = data.dealers.map((d: Dealer) => d ? ({...d, ledger: parseLedger(d.ledger)}) : null).filter(Boolean);
        if (data.bets && Array.isArray(data.bets)) data.bets = data.bets.map((b: Bet) => ({...b, timestamp: new Date(b.timestamp)}));
        if (data.account && data.account.ledger) data.account.ledger = parseLedger(data.account.ledger);
        return data;
    };

    const fetchPublicData = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const gamesResponse = await fetch('/api/games', { headers });
            const data = await gamesResponse.json();
            if (gamesResponse.ok) {
                setGames(data);
                setApiError(null);
                setIsMaintenance(false);
            } else {
                setApiError(data.message || `Server error: ${gamesResponse.status}`);
                setIsMaintenance(!!data.maintenance);
            }
        } catch (e) {
            setApiError("Connection failure. Check node status.");
            setIsMaintenance(false);
        }
    }, []);

    const fetchPrivateData = useCallback(async () => {
        if (!role) return;
        try {
            const endpoint = role === Role.Admin ? '/api/admin/data' : (role === Role.Dealer ? '/api/dealer/data' : '/api/user/data');
            const response = await fetchWithAuth(endpoint);
            const data = await response.json();
            if (response.ok) {
                const parsedData = parseAllDates(data);
                if (parsedData.account) setAccount(parsedData.account);
                if (role === Role.Admin) { setUsers(parsedData.users); setDealers(parsedData.dealers); setBets(parsedData.bets); }
                else if (role === Role.Dealer) { setUsers(parsedData.users); setBets(parsedData.bets); }
                else { setBets(parsedData.bets); }
                setHasInitialFetched(true);
            } else {
                setApiError(data.message);
                setIsMaintenance(!!data.maintenance);
            }
        } catch (error) {
            console.error("Private fetch error", error);
        }
    }, [role, fetchWithAuth, setAccount]);

    useEffect(() => {
        if (!loading && verifyData) {
            const parsed = parseAllDates(verifyData);
            if (parsed.users) setUsers(parsed.users);
            if (parsed.dealers) setDealers(parsed.dealers);
            if (parsed.bets) setBets(parsed.bets);
            setHasInitialFetched(true);
        }
    }, [loading, verifyData]);

    useEffect(() => {
        fetchPublicData();
        const interval = setInterval(fetchPublicData, 5000);
        return () => clearInterval(interval);
    }, [fetchPublicData]);

    useEffect(() => {
        if (role) {
            if (!hasInitialFetched) fetchPrivateData();
            const interval = setInterval(fetchPrivateData, 3000);
            return () => clearInterval(interval);
        } else {
            setHasInitialFetched(false);
            setUsers([]); setBets([]); setDealers([]);
        }
    }, [role, fetchPrivateData]);

    useEffect(() => {
        if (games.length > 0 && lastGamesRef.current.length > 0) {
            games.forEach(newGame => {
                const oldGame = lastGamesRef.current.find(g => g.id === newGame.id);
                if (newGame.winningNumber && !newGame.winningNumber.endsWith('_') && (!oldGame?.winningNumber || oldGame.winningNumber.endsWith('_'))) {
                    setActiveReveal({ name: newGame.name, number: newGame.winningNumber });
                }
            });
        }
        lastGamesRef.current = games;
    }, [games]);

    const handleWatchDraw = (game: Game) => {
        if (game.winningNumber && !game.winningNumber.endsWith('_')) {
            setActiveReveal({ name: game.name, number: game.winningNumber });
        }
    };

    const placeBet = async (d: any) => { await fetchWithAuth('/api/user/bets', { method: 'POST', body: JSON.stringify(d) }); fetchPrivateData(); };
    const placeBetAsDealer = async (d: any) => { await fetchWithAuth('/api/dealer/bets/bulk', { method: 'POST', body: JSON.stringify(d) }); fetchPrivateData(); };
    
    const onSaveUser = async (u: any, o: any, i: any) => {
        const method = o ? 'PUT' : 'POST';
        const url = o ? `/api/dealer/users/${o}` : '/api/dealer/users';
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(o ? u : { userData: u, initialDeposit: i }) });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Operation failed');
        }
        fetchPrivateData();
    };

    const onDeleteUser = async (uId: string) => {
        const response = await fetchWithAuth(`/api/dealer/users/${uId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete user");
        fetchPrivateData();
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="russo text-amber-500 text-lg md:text-xl tracking-[0.4em] animate-pulse">
                INITIALIZING SECURE PROTOCOL...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col relative">
            {apiError && (
                <div className={`fixed top-0 left-0 w-full z-[100] ${isMaintenance ? 'bg-red-600' : 'bg-amber-600'} text-white text-[10px] font-black uppercase tracking-[0.4em] py-2 text-center shadow-2xl`}>
                    <span className="mr-4">{isMaintenance ? 'CRITICAL SYSTEM STATUS' : 'NODE WARNING'}</span>
                    <span className="opacity-80">|</span>
                    <span className="ml-4">{apiError}</span>
                </div>
            )}
            
            {!role || !account ? (
                <LandingPage games={games} />
            ) : (
                <>
                    <Header />
                    <main className={`flex-grow pb-20 relative z-10 ${apiError ? 'pt-10' : ''}`}>
                        {role === Role.User && <UserPanel user={account as User} games={games} bets={bets} placeBet={placeBet} onWatchDraw={handleWatchDraw} />}
                        {role === Role.Dealer && (
                            <DealerPanel 
                                dealer={account as Dealer} users={users} 
                                onSaveUser={onSaveUser} 
                                onDeleteUser={onDeleteUser}
                                topUpUserWallet={async (id, amt) => { await fetchWithAuth('/api/dealer/topup/user', { method: 'POST', body: JSON.stringify({ userId: id, amount: amt }) }); fetchPrivateData(); }} 
                                withdrawFromUserWallet={async (id, amt) => { await fetchWithAuth('/api/dealer/withdraw/user', { method: 'POST', body: JSON.stringify({ userId: id, amount: amt }) }); fetchPrivateData(); }} 
                                toggleAccountRestriction={async (id) => { await fetchWithAuth(`/api/dealer/users/${id}/toggle-restriction`, { method: 'PUT' }); fetchPrivateData(); }} 
                                bets={bets} games={games} placeBetAsDealer={placeBetAsDealer} isLoaded={hasInitialFetched}
                            />
                        )}
                        {role === Role.Admin && (
                            <AdminPanel 
                                admin={account as Admin} dealers={dealers} 
                                onSaveDealer={async (d, o) => { const url = o ? `/api/admin/dealers/${o}` : '/api/admin/dealers'; await fetchWithAuth(url, { method: o ? 'PUT' : 'POST', body: JSON.stringify(d) }); fetchPrivateData(); }} 
                                users={users} setUsers={setUsers} games={games} bets={bets} 
                                declareWinner={async (id, num) => { await fetchWithAuth(`/api/admin/games/${id}/declare-winner`, { method: 'POST', body: JSON.stringify({ winningNumber: num }) }); fetchPrivateData(); }}
                                updateWinner={async (id, num) => { await fetchWithAuth(`/api/admin/games/${id}/update-winner`, { method: 'PUT', body: JSON.stringify({ newWinningNumber: num }) }); fetchPrivateData(); }}
                                approvePayouts={async (id) => { await fetchWithAuth(`/api/admin/games/${id}/approve-payouts`, { method: 'POST' }); fetchPrivateData(); }}
                                toggleGameVisibility={async (id) => { await fetchWithAuth(`/api/admin/games/${id}/toggle-visibility`, { method: 'PUT' }); fetchPublicData(); }}
                                topUpDealerWallet={async (id, amt) => { await fetchWithAuth('/api/admin/topup/dealer', { method: 'POST', body: JSON.stringify({ dealerId: id, amount: amt }) }); fetchPrivateData(); }}
                                withdrawFromDealerWallet={async (id, amt) => { await fetchWithAuth('/api/admin/withdraw/dealer', { method: 'POST', body: JSON.stringify({ dealerId: id, amount: amt }) }); fetchPrivateData(); }}
                                toggleAccountRestriction={async (id, type) => { await fetchWithAuth(`/api/admin/accounts/${type}/${id}/toggle-restriction`, { method: 'PUT' }); fetchPrivateData(); }}
                                onPlaceAdminBets={async (d) => { await fetchWithAuth('/api/admin/bulk-bet', { method: 'POST', body: JSON.stringify(d) }); fetchPrivateData(); }}
                                updateGameDrawTime={async (id, time) => { await fetchWithAuth(`/api/admin/games/${id}/draw-time`, { method: 'PUT', body: JSON.stringify({ newDrawTime: time }) }); fetchPrivateData(); }}
                                onRefreshData={async () => { await Promise.all([fetchPublicData(), fetchPrivateData()]); }} 
                            />
                        )}
                    </main>
                </>
            )}
            {activeReveal && <ResultRevealOverlay gameName={activeReveal.name} winningNumber={activeReveal.number} onClose={() => setActiveReveal(null)} />}
        </div>
    );
};

function App() { return (<AuthProvider><AppContent /></AuthProvider>); }
export default App;
