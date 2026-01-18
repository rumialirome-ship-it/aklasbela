
import React, { useState, useMemo, useEffect } from 'react';
import { Dealer, User, Game, PrizeRates, LedgerEntry, Bet, Admin, SubGameType, Role, NumberLimit } from '../types';
import { Icons } from '../constants';
import { useAuth } from '../hooks/useAuth';

// --- HELPERS ---
const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

// --- SUB-COMPONENTS ---

const StatCard: React.FC<{ title: string; value: string | number; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
    <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>{icon}</div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{title}</p>
        <p className={`text-2xl font-black russo tracking-tighter ${color}`}>{value}</p>
    </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl'; themeColor?: string }> = ({ isOpen, onClose, title, children, size = 'md', themeColor = 'red' }) => {
    if (!isOpen) return null;
    const sizeClasses: Record<string, string> = { md: 'max-w-md', lg: 'max-w-3xl', xl: 'max-w-6xl' };
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex justify-center items-center z-[100] p-4 overflow-y-auto">
            <div className={`bg-slate-900 rounded-[2.5rem] shadow-2xl w-full border border-white/10 ${sizeClasses[size]} flex flex-col my-auto max-h-[95vh]`}>
                <div className="flex justify-between items-center p-6 sm:p-8 border-b border-white/5">
                    <h3 className={`text-xl font-black text-${themeColor}-500 uppercase tracking-tighter russo`}>{title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 transition-colors">{Icons.close}</button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar">{children}</div>
            </div>
        </div>
    );
};

// --- PRE-DECLARATION ANALYZER COMPONENT ---

const PotentialWinners: React.FC<{ gameId: string; winningNum: string; bets: Bet[]; users: User[] }> = ({ gameId, winningNum, bets, users }) => {
    if (!winningNum || winningNum.length === 0) return null;

    const potential = bets
        .filter(b => b.gameId === gameId)
        .map(bet => {
            const user = users.find(u => u.id === bet.userId);
            if (!user) return null;
            
            let winsCount = 0;
            bet.numbers.forEach(n => {
                if (bet.subGameType === SubGameType.OneDigitOpen && winningNum.length >= 1 && n === winningNum[0]) winsCount++;
                if (bet.subGameType === SubGameType.OneDigitClose && winningNum.length === 2 && n === winningNum[1]) winsCount++;
                if (bet.subGameType === SubGameType.TwoDigit && winningNum.length === 2 && n === winningNum) winsCount++;
            });

            if (winsCount === 0) return null;

            const multiplier = bet.subGameType === SubGameType.OneDigitOpen ? user.prizeRates.oneDigitOpen : (bet.subGameType === SubGameType.OneDigitClose ? user.prizeRates.oneDigitClose : user.prizeRates.twoDigit);
            return { name: user.name, amount: winsCount * bet.amountPerNumber * multiplier };
        })
        .filter(Boolean) as { name: string; amount: number }[];

    if (potential.length === 0) return (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center">No Winners for this number</p>
        </div>
    );

    const totalPotential = potential.reduce((s, w) => s + w.amount, 0);

    return (
        <div className="mt-4 space-y-2 bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Potential Payouts</p>
                <p className="text-xs font-black text-white font-mono">PKR {totalPotential.toLocaleString()}</p>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 no-scrollbar">
                {potential.map((w, i) => (
                    <div key={i} className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                        <span className="text-slate-400">{w.name}</span>
                        <span className="text-red-400">PKR {w.amount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN ANALYTICAL INTERFACE ---

const AdminPanel: React.FC<any> = ({ 
    admin, dealers, onSaveDealer, users, games, bets, 
    declareWinner, updateWinner, approvePayouts, toggleGameVisibility,
    onRefreshData 
}) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [summary, setSummary] = useState<any>(null);
    const [stakeSummary, setStakeSummary] = useState<any>(null);
    const [limits, setLimits] = useState<NumberLimit[]>([]);
    const [winningNumbers, setWinningNumbers] = useState<{[key: string]: string}>({});
    const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | undefined>(undefined);
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
    const [viewingLedger, setViewingLedger] = useState<any>(null);
    const { fetchWithAuth } = useAuth();

    // Bet Search State
    const [betSearch, setBetSearch] = useState('');
    const [betDateFilter, setBetDateFilter] = useState('');

    const refreshAnalyticalData = async () => {
        try {
            const [sumRes, stakeRes, dataRes] = await Promise.all([
                fetchWithAuth('/api/admin/summary'),
                fetchWithAuth('/api/admin/number-summary'),
                fetchWithAuth('/api/admin/data')
            ]);
            if (sumRes.ok) setSummary(await sumRes.json());
            if (stakeRes.ok) setStakeSummary(await stakeRes.json());
            if (dataRes.ok) {
                const data = await dataRes.json();
                setLimits(data.limits || []);
            }
            if (onRefreshData) onRefreshData();
        } catch (e) {}
    };

    useEffect(() => {
        refreshAnalyticalData();
        const interval = setInterval(refreshAnalyticalData, 10000);
        return () => clearInterval(interval);
    }, [fetchWithAuth]);

    const handleDeclareWinner = (gameId: string, gameName: string) => {
        const num = winningNumbers[gameId];
        if (!num) return;
        declareWinner(gameId, num);
        setWinningNumbers(prev => ({...prev, [gameId]: ''}));
    };

    const handleSaveLimit = async (limit: Partial<NumberLimit>) => {
        try {
            await fetchWithAuth('/api/admin/limits', { method: 'POST', body: JSON.stringify(limit) });
            refreshAnalyticalData();
            setIsLimitModalOpen(false);
        } catch (e) {}
    };

    const handleDeleteLimit = async (id: number) => {
        try {
            await fetchWithAuth(`/api/admin/limits/${id}`, { method: 'DELETE' });
            refreshAnalyticalData();
        } catch (e) {}
    };

    const filteredBets = useMemo(() => {
        if (!bets) return [];
        return [...bets].reverse().filter(b => {
            const user = users.find(u => u.id === b.userId);
            const dealer = dealers.find(d => d.id === b.dealerId);
            const game = games.find(g => g.id === b.gameId);
            const search = betSearch.toLowerCase();
            const matchesSearch = 
                !search || 
                user?.name.toLowerCase().includes(search) || 
                dealer?.name.toLowerCase().includes(search) || 
                game?.name.toLowerCase().includes(search) || 
                b.userId.toLowerCase().includes(search) ||
                b.numbers.some(n => n.includes(search));
            const matchesDate = !betDateFilter || b.timestamp.includes(betDateFilter);
            return matchesSearch && matchesDate;
        });
    }, [bets, users, dealers, games, betSearch, betDateFilter]);

    const tabs = [
        { id: 'dashboard', label: 'Financials', icon: Icons.chartBar },
        { id: 'live', label: 'Bet Search', icon: Icons.search },
        { id: 'stakes', label: 'Number Summary', icon: Icons.clipboardList },
        { id: 'limits', label: 'Limits', icon: Icons.eyeOff },
        { id: 'games', label: 'Markets', icon: Icons.gamepad },
        { id: 'dealers', label: 'Dealers', icon: Icons.userGroup },
        { id: 'users', label: 'Users', icon: Icons.user },
    ];

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
                <div>
                    <h2 className="text-3xl sm:text-5xl font-black text-red-500 uppercase russo tracking-tighter">ADMIN <span className="text-white">NEXUS</span></h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Central Command Terminal</p>
                </div>
                <div className="bg-slate-900/60 p-1.5 rounded-2xl flex items-center gap-1 border border-white/5 overflow-x-auto no-scrollbar max-w-full">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`shrink-0 flex items-center gap-2 py-3 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-xl shadow-red-900/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {tab.icon} <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'dashboard' && summary && (
                <div className="animate-fade-in space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Stake" value={`PKR ${summary.totals.totalStake.toLocaleString()}`} color="text-white" icon={Icons.chartBar} />
                        <StatCard title="Total Payouts" value={`PKR ${summary.totals.totalPayouts.toLocaleString()}`} color="text-emerald-500" icon={Icons.checkCircle} />
                        <StatCard title="Dealer Profits" value={`PKR ${summary.totals.totalDealerProfit.toLocaleString()}`} color="text-amber-500" icon={Icons.userGroup} />
                        <StatCard title="Net Profit" value={`PKR ${summary.totals.netProfit.toLocaleString()}`} color="text-red-500" icon={Icons.wallet} />
                    </div>

                    <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Global Market Performance</h3>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Market</th>
                                        <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Result</th>
                                        <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Stake</th>
                                        <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Payouts</th>
                                        <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Net</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-xs">
                                    {summary.games.map((g: any) => (
                                        <tr key={g.gameName} className="hover:bg-white/[0.02]">
                                            <td className="p-5 text-white font-black uppercase tracking-widest">{g.gameName}</td>
                                            <td className="p-5"><span className="bg-slate-950 px-3 py-1 rounded-lg border border-white/10 text-amber-500 russo">{g.winningNumber}</span></td>
                                            <td className="p-5 text-right">{g.totalStake.toLocaleString()}</td>
                                            <td className="p-5 text-right text-emerald-500">{g.totalPayouts.toLocaleString()}</td>
                                            <td className="p-5 text-right font-black text-white">{g.netProfit.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'live' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <h3 className="text-xl font-black text-white russo uppercase tracking-tighter">Betting Search</h3>
                        <div className="flex-1 flex gap-2 w-full">
                            <input 
                                type="text" 
                                placeholder="Search by user, dealer, game, or number..." 
                                value={betSearch}
                                onChange={e => setBetSearch(e.target.value)}
                                className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500/50"
                            />
                            <input 
                                type="date" 
                                value={betDateFilter}
                                onChange={e => setBetDateFilter(e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">User/Node</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Dealer</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Market</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nums</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Stake</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                                    {filteredBets.slice(0, 100).map((bet: Bet) => (
                                        <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-6 text-slate-500 whitespace-nowrap">{new Date(bet.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            <td className="p-6">
                                                <p className="font-bold text-white uppercase">{users.find(u => u.id === bet.userId)?.name || bet.userId}</p>
                                                <p className="opacity-50">{bet.userId}</p>
                                            </td>
                                            <td className="p-6 text-slate-400">{dealers.find(d => d.id === bet.dealerId)?.name || bet.dealerId}</td>
                                            <td className="p-6 text-sky-400 font-black">{games.find(g => g.id === bet.gameId)?.name}</td>
                                            <td className="p-6 text-slate-300 max-w-[150px] truncate">{bet.numbers.join(', ')}</td>
                                            <td className="p-6 text-right font-black text-white">PKR {bet.totalAmount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {filteredBets.length === 0 && (
                                        <tr><td colSpan={6} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest">No matching bets found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stakes' && stakeSummary && (
                <div className="animate-fade-in space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-8">
                            <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 flex justify-between items-center">
                                <span>Position Volume (2-Digit)</span>
                                <span className="text-slate-500">Live Stakes</span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {stakeSummary.twoDigit.slice(0, 50).map((s: any) => (
                                    <div key={s.number} className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-center group hover:border-red-500/30 transition-all">
                                        <p className="text-xl font-black russo text-white group-hover:text-red-500">{s.number}</p>
                                        <p className="text-[9px] font-bold text-slate-500 font-mono mt-1">PKR {s.stake.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-8">
                                <h4 className="text-xs font-black text-sky-500 uppercase tracking-widest mb-6">Open Position Analysis</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    {stakeSummary.oneDigitOpen.map((s: any) => (
                                        <div key={s.number} className="bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xl font-black russo text-white">{s.number}</p>
                                            <p className="text-[8px] font-bold text-slate-500 mt-1">{s.stake.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-8">
                                <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-6">Close Position Analysis</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    {stakeSummary.oneDigitClose.map((s: any) => (
                                        <div key={s.number} className="bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xl font-black russo text-white">{s.number}</p>
                                            <p className="text-[8px] font-bold text-slate-500 mt-1">{s.stake.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'limits' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-white russo uppercase tracking-tighter">Number-wise Betting Limits</h3>
                        <button onClick={() => setIsLimitModalOpen(true)} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20">Set Limit</button>
                    </div>
                    <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Number</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Stake</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-xs">
                                {limits.map(l => (
                                    <tr key={l.id} className="hover:bg-white/[0.02]">
                                        <td className="p-6 text-slate-400 uppercase">{l.gameType}</td>
                                        <td className="p-6 font-black text-white text-lg">{l.numberValue}</td>
                                        <td className="p-6 text-red-500 font-bold">PKR {l.limitAmount.toLocaleString()}</td>
                                        <td className="p-6 text-right">
                                            <button onClick={() => handleDeleteLimit(l.id)} className="text-red-500 hover:text-white transition-colors">{Icons.close}</button>
                                        </td>
                                    </tr>
                                ))}
                                {limits.length === 0 && (
                                    <tr><td colSpan={4} className="p-20 text-center text-slate-600 uppercase tracking-widest">No custom limits defined</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'games' && (
                <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {games.map((game: Game) => {
                        const hasWinner = !!game.winningNumber && !game.winningNumber.endsWith('_');
                        const isPayoutApproved = !!game.payoutsApproved;
                        const isVisible = game.isVisible !== false;

                        return (
                            <div key={game.id} className={`bg-slate-900/40 rounded-[2rem] border border-white/5 p-6 flex flex-col group transition-all duration-500 ${!isVisible ? 'opacity-60 grayscale-[0.4]' : ''}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="text-xl font-black text-white russo tracking-tighter mb-1 flex items-center gap-2">
                                            {game.name}
                                            {!isVisible && <span className="text-[8px] font-black bg-slate-950 text-slate-500 px-2 py-0.5 rounded-full border border-white/5">HIDDEN</span>}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Draw @ {game.drawTime}</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleGameVisibility(game.id)}
                                        className={`p-2 rounded-xl border transition-all ${isVisible ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                                    >
                                        {isVisible ? Icons.eye : Icons.eyeOff}
                                    </button>
                                </div>

                                <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 text-center min-h-[110px] flex flex-col justify-center mb-6">
                                    {hasWinner ? (
                                        <>
                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Result Declared</p>
                                            <p className="text-5xl font-black text-white russo gold-shimmer">{game.winningNumber}</p>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Sync Outcome</p>
                                            <input 
                                                type="text" 
                                                placeholder="00"
                                                value={winningNumbers[game.id] || ''}
                                                maxLength={2}
                                                onChange={(e) => setWinningNumbers(prev => ({...prev, [game.id]: e.target.value.replace(/\D/g, '')}))}
                                                className="w-full bg-transparent border-b border-white/10 text-white text-center font-black russo text-4xl outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {!hasWinner && (
                                    <PotentialWinners 
                                        gameId={game.id} 
                                        winningNum={winningNumbers[game.id] || ''} 
                                        bets={bets} 
                                        users={users} 
                                    />
                                )}

                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {!hasWinner ? (
                                        <button 
                                            onClick={() => handleDeclareWinner(game.id, game.name)} 
                                            className="col-span-2 py-4 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-900/20"
                                        >
                                            DECLARE
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                disabled={isPayoutApproved}
                                                onClick={() => updateWinner(game.id, prompt('New Number?') || '')} 
                                                className="py-3 rounded-xl bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest disabled:opacity-30"
                                            >
                                                EDIT
                                            </button>
                                            <button 
                                                disabled={isPayoutApproved}
                                                onClick={() => approvePayouts(game.id)} 
                                                className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${isPayoutApproved ? 'bg-emerald-900/10 text-emerald-500' : 'bg-emerald-600 text-white'}`}
                                            >
                                                {isPayoutApproved ? 'SETTLED' : 'APPROVE'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'dealers' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-white russo uppercase tracking-tighter">Dealers Control</h3>
                        <button onClick={() => { setSelectedDealer(undefined); setIsDealerModalOpen(true); }} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Add Dealer Node</button>
                    </div>
                    <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Dealer Node</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Comm %</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Liquidity</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {dealers.map((dealer: Dealer) => (
                                    <tr key={dealer.id} className="hover:bg-white/[0.02]">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center font-black text-red-500 russo">{dealer.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold text-white uppercase tracking-widest text-sm">{dealer.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">ID: {dealer.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-emerald-500 font-black">{dealer.commissionRate}%</td>
                                        <td className="p-6 text-right font-mono text-white">PKR {dealer.wallet.toLocaleString()}</td>
                                        <td className="p-6 text-right space-x-4">
                                            <button onClick={() => setViewingLedger(dealer)} className="text-[10px] font-black text-sky-500 hover:text-white uppercase tracking-widest underline underline-offset-4">View Ledger</button>
                                            <button onClick={() => { setSelectedDealer(dealer); setIsDealerModalOpen(true); }} className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Config</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="animate-fade-in space-y-6">
                    <h3 className="text-xl font-black text-white russo uppercase tracking-tighter">Global User Registry</h3>
                    <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Node</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Yield/Comm</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Funds</th>
                                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map((user: User) => (
                                    <tr key={user.id} className="hover:bg-white/[0.02]">
                                        <td className="p-6">
                                            <p className="font-bold text-white uppercase tracking-widest text-sm">{user.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">ID: {user.id} | D: {user.dealerId}</p>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-amber-500">2D: {user.prizeRates.twoDigit}</span>
                                                <span className="text-sky-500">{user.commissionRate}%</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right font-mono text-white">PKR {user.wallet.toLocaleString()}</td>
                                        <td className="p-6 text-right">
                                            <button onClick={() => { setSelectedUser(user); setIsUserModalOpen(true); }} className="text-[10px] font-black text-red-500 hover:text-white uppercase tracking-widest">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODALS */}
            <Modal isOpen={isLimitModalOpen} onClose={() => setIsLimitModalOpen(false)} title="Set Betting Limit">
                <LimitForm onSave={handleSaveLimit} />
            </Modal>

            <Modal isOpen={isDealerModalOpen} onClose={() => setIsDealerModalOpen(false)} title={selectedDealer ? "Configure Dealer" : "Authorize New Node"}>
                <DealerForm dealer={selectedDealer} onClose={() => setIsDealerModalOpen(false)} onSave={onSaveDealer} />
            </Modal>

            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Edit User Node">
                <UserForm user={selectedUser} onClose={() => setIsUserModalOpen(false)} onSave={async (u, id) => {
                    await fetchWithAuth(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(u) });
                    refreshAnalyticalData();
                }} />
            </Modal>

            <Modal isOpen={!!viewingLedger} onClose={() => setViewingLedger(null)} title={`Dealer Ledger Trace: ${viewingLedger?.name}`} size="xl">
                <div className="bg-slate-950/50 rounded-3xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 text-slate-500 uppercase">Timestamp</th>
                                <th className="p-4 text-slate-500 uppercase">Narration</th>
                                <th className="p-4 text-slate-500 uppercase text-right">Debit</th>
                                <th className="p-4 text-slate-500 uppercase text-right">Credit</th>
                                <th className="p-4 text-slate-500 uppercase text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[...(viewingLedger?.ledger || [])].reverse().map((e: LedgerEntry) => (
                                <tr key={e.id}>
                                    <td className="p-4 text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                                    <td className="p-4 text-white uppercase">{e.description}</td>
                                    <td className="p-4 text-right text-red-400">-{e.debit.toFixed(2)}</td>
                                    <td className="p-4 text-right text-emerald-400">+{e.credit.toFixed(2)}</td>
                                    <td className="p-4 text-right font-bold text-white">PKR {e.balance.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
};

// --- FORMS ---

const LimitForm: React.FC<{ onSave: (limit: Partial<NumberLimit>) => void }> = ({ onSave }) => {
    const [gameType, setGameType] = useState<'2-digit' | '1-open' | '1-close'>('2-digit');
    const [numberValue, setNumberValue] = useState('');
    const [limitAmount, setLimitAmount] = useState('');

    const inputClass = "w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white text-sm outline-none";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2";

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className={labelClass}>Game Type</label>
                    <select value={gameType} onChange={e => setGameType(e.target.value as any)} className={inputClass}>
                        <option value="2-digit">2 Digit</option>
                        <option value="1-open">1 Digit Open</option>
                        <option value="1-close">1 Digit Close</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Target Number</label>
                    <input 
                        type="text" 
                        value={numberValue} 
                        onChange={e => setNumberValue(e.target.value)} 
                        placeholder="e.g. 14 or 1"
                        className={inputClass} 
                    />
                </div>
                <div>
                    <label className={labelClass}>Max Stake Limit (PKR)</label>
                    <input 
                        type="number" 
                        value={limitAmount} 
                        onChange={e => setLimitAmount(e.target.value)} 
                        className={inputClass} 
                    />
                </div>
            </div>
            <button 
                onClick={() => onSave({ gameType, numberValue, limitAmount: parseFloat(limitAmount) })}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs"
            >
                Authorize Limit
            </button>
        </div>
    );
};

const DealerForm: React.FC<{ dealer?: Dealer; onSave: (d: Dealer, originalId?: string) => Promise<void>; onClose: () => void }> = ({ dealer, onSave, onClose }) => {
    const [formData, setFormData] = useState<any>(dealer || {
        id: '', name: '', password: '', area: '', contact: '', commissionRate: 10,
        prizeRates: { oneDigitOpen: 90, oneDigitClose: 90, twoDigit: 900 },
        wallet: 0, isRestricted: false, avatarUrl: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (name.startsWith('prizeRates.')) {
            const key = name.split('.')[1];
            setFormData({ ...formData, prizeRates: { ...formData.prizeRates, [key]: parseFloat(value) } });
        } else {
            setFormData({ ...formData, [name]: type === 'number' ? parseFloat(value) : value });
        }
    };

    const inputClass = "w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white text-sm outline-none";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1";

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData, dealer?.id); onClose(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Login ID</label><input name="id" value={formData.id} onChange={handleChange} className={inputClass} disabled={!!dealer} required /></div>
                <div><label className={labelClass}>Display Name</label><input name="name" value={formData.name} onChange={handleChange} className={inputClass} required /></div>
                <div><label className={labelClass}>Password</label><input type="text" name="password" value={formData.password} onChange={handleChange} className={inputClass} required /></div>
                <div><label className={labelClass}>Comm. Rate (%)</label><input type="number" step="0.1" name="commissionRate" value={formData.commissionRate} onChange={handleChange} className={inputClass} required /></div>
            </div>
            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Authorized Prize Multipliers</p>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className={labelClass}>2 Digit</label><input type="number" step="0.1" name="prizeRates.twoDigit" value={formData.prizeRates.twoDigit} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>1D Open</label><input type="number" step="0.1" name="prizeRates.oneDigitOpen" value={formData.prizeRates.oneDigitOpen} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>1D Close</label><input type="number" step="0.1" name="prizeRates.oneDigitClose" value={formData.prizeRates.oneDigitClose} onChange={handleChange} className={inputClass} /></div>
                </div>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs shadow-xl shadow-red-900/20">
                {dealer ? 'Sync Profile' : 'Authorize Dealer'}
            </button>
        </form>
    );
};

const UserForm: React.FC<{ user?: User; onSave: (u: User, originalId?: string) => Promise<void>; onClose: () => void }> = ({ user, onSave, onClose }) => {
    const [formData, setFormData] = useState<any>(user || {
        id: '', name: '', password: '', commissionRate: 5,
        prizeRates: { oneDigitOpen: 80, oneDigitClose: 80, twoDigit: 800 }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (name.startsWith('prizeRates.')) {
            const key = name.split('.')[1];
            setFormData({ ...formData, prizeRates: { ...formData.prizeRates, [key]: parseFloat(value) } });
        } else {
            setFormData({ ...formData, [name]: type === 'number' ? parseFloat(value) : value });
        }
    };

    const inputClass = "w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white text-sm outline-none";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1";

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData, user?.id); onClose(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>User ID</label><input name="id" value={formData.id} className={inputClass} disabled /></div>
                <div><label className={labelClass}>Name</label><input name="name" value={formData.name} onChange={handleChange} className={inputClass} /></div>
                <div><label className={labelClass}>Comm. Rate (%)</label><input type="number" step="0.1" name="commissionRate" value={formData.commissionRate} onChange={handleChange} className={inputClass} /></div>
            </div>
            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">User Specific Prize Overrides</p>
                <div className="grid grid-cols-3 gap-4">
                    <div><label className={labelClass}>2 Digit</label><input type="number" step="0.1" name="prizeRates.twoDigit" value={formData.prizeRates.twoDigit} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>1D Open</label><input type="number" step="0.1" name="prizeRates.oneDigitOpen" value={formData.prizeRates.oneDigitOpen} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>1D Close</label><input type="number" step="0.1" name="prizeRates.oneDigitClose" value={formData.prizeRates.oneDigitClose} onChange={handleChange} className={inputClass} /></div>
                </div>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs">Commit Updates</button>
        </form>
    );
};

export default AdminPanel;
