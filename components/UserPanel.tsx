
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Game, SubGameType, LedgerEntry, Bet, PrizeRates } from '../types';
import { Icons, getDynamicLogo } from '../constants';
import { useCountdown } from '../hooks/useCountdown';
import { useAuth } from '../hooks/useAuth';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const formatTime12h = (time24: string) => {
    if (!time24) return '--:--';
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

// --- PRESIZED HELPER COMPONENTS ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="relative overflow-hidden bg-slate-900/60 border border-white/5 rounded-2xl p-4 sm:p-5 group transition-all duration-500 hover:border-white/10 hover:bg-slate-900/80 shadow-2xl">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            {icon}
        </div>
        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className={`text-xl sm:text-2xl font-black russo tracking-tighter ${color} drop-shadow-sm truncate`}>{value}</p>
        <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-700 bg-gradient-to-r from-transparent via-${color.split('-')[1]}-500/30 to-transparent`}></div>
    </div>
);

const ActivityTab: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            active 
            ? 'bg-amber-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.2)]' 
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
    >
        <span className={active ? 'animate-pulse' : ''}>{icon}</span>
        <span className="hidden xs:inline">{label}</span>
        <span className="xs:hidden">{label.split(' ')[0]}</span>
    </button>
);

// --- REIMAGINED GAME CARD ---

const GameCard: React.FC<{ game: Game; onPlay: (game: Game) => void; isRestricted: boolean; }> = ({ game, onPlay, isRestricted }) => {
    const { status, text: countdownText } = useCountdown(game.drawTime);
    const hasFinalWinner = !!game.winningNumber && !game.winningNumber.endsWith('_');
    const isMarketClosedForDisplay = !game.isMarketOpen;
    const isPlayable = !!game.isMarketOpen && !isRestricted && status === 'OPEN';
    const logo = getDynamicLogo(game.name);

    return (
        <div className={`group relative flex flex-col bg-slate-900/40 rounded-3xl border border-white/5 transition-all duration-500 overflow-hidden ${!isPlayable ? 'opacity-70 grayscale-[0.3]' : 'hover:border-amber-500/30 hover:bg-slate-900/60 hover:-translate-y-1'}`}>
            <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="p-5 sm:p-6 relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="relative shrink-0">
                        <div className="absolute -inset-2 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <img src={logo} alt={game.name} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-white/5 object-cover shadow-2xl" />
                    </div>
                    <div className="text-right ml-2">
                        <h3 className="text-lg sm:text-xl font-black text-white russo tracking-tighter leading-none mb-1 truncate max-w-[120px] sm:max-w-none">{game.name}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Draw @ {formatTime12h(game.drawTime)}</p>
                    </div>
                </div>

                <div className="space-y-4 flex-grow flex flex-col justify-end">
                    <div className="bg-slate-950/60 rounded-2xl p-3 sm:p-4 border border-white/5 text-center min-h-[80px] sm:min-h-[90px] flex flex-col justify-center">
                        {hasFinalWinner ? (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Market Settled</span>
                                <span className="text-3xl sm:text-4xl font-black text-white russo gold-shimmer">{game.winningNumber}</span>
                            </>
                        ) : isMarketClosedForDisplay ? (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-red-500 uppercase tracking-[0.3em] mb-1">Status</span>
                                <span className="text-base sm:text-lg font-black text-slate-400 russo uppercase tracking-tighter">Market Suspended</span>
                            </>
                        ) : status === 'OPEN' ? (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-amber-500/60 uppercase tracking-[0.3em] mb-1">Trading Closes</span>
                                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tighter">{countdownText}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Market Opens</span>
                                <span className="text-lg sm:text-xl font-black text-slate-500 font-mono">{countdownText}</span>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => onPlay(game)} 
                        disabled={!isPlayable}
                        className={`w-full py-3.5 sm:py-4 rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] transition-all duration-300 transform active:scale-95 ${
                            isPlayable 
                            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10 hover:bg-amber-400' 
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {isPlayable ? 'Initiate Trade' : 'Market Closed'}
                    </button>
                </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );
};

// --- ACTIVITY CENTER ---

const ActivityCenter: React.FC<{ bets: Bet[]; games: Game[]; user: User }> = ({ bets, games, user }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'ledger'>('history');
    const [dateRange, setDateRange] = useState({ start: getTodayDateString(), end: getTodayDateString() });
    const [search, setSearch] = useState('');

    const calculateBetPayout = (bet: Bet, game: Game | undefined, userPrizeRates: PrizeRates) => {
        if (!game || !game.winningNumber || game.winningNumber.includes('_')) return 0;
        const winningNumber = game.winningNumber;
        let winsCount = 0;
        bet.numbers.forEach(num => {
            let isWin = false;
            switch (bet.subGameType) {
                case SubGameType.OneDigitOpen: if (winningNumber.length === 2) isWin = num === winningNumber[0]; break;
                case SubGameType.OneDigitClose: if (game.name === 'AKC') isWin = num === winningNumber; else if (winningNumber.length === 2) isWin = num === winningNumber[1]; break;
                default: isWin = num === winningNumber; break;
            }
            if (isWin) winsCount++;
        });
        const multiplier = bet.subGameType === SubGameType.OneDigitOpen ? userPrizeRates.oneDigitOpen : (bet.subGameType === SubGameType.OneDigitClose ? userPrizeRates.oneDigitClose : userPrizeRates.twoDigit);
        return winsCount * bet.amountPerNumber * multiplier;
    };

    const filteredData = useMemo(() => {
        if (activeTab === 'history') {
            return (bets || []).filter(b => {
                const bDate = b.timestamp.toISOString().split('T')[0];
                const game = games.find(g => g.id === b.gameId);
                const matchesDate = (!dateRange.start || bDate >= dateRange.start) && (!dateRange.end || bDate <= dateRange.end);
                const matchesSearch = !search || game?.name.toLowerCase().includes(search.toLowerCase()) || b.subGameType.toLowerCase().includes(search.toLowerCase());
                return matchesDate && matchesSearch;
            }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        } else {
            return (user.ledger || []).filter(e => {
                const eDate = e.timestamp.toISOString().split('T')[0];
                return (!dateRange.start || eDate >= dateRange.start) && (!dateRange.end || eDate <= dateRange.end);
            }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        }
    }, [activeTab, bets, games, user, dateRange, search]);

    const inputClass = "bg-slate-950/50 border border-white/5 rounded-xl p-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-300 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all w-full sm:w-auto";

    return (
        <div className="mt-10 sm:mt-16 bg-slate-900/30 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-4 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 sm:mb-10">
                <div className="flex gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-slate-950/40 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    <ActivityTab 
                        active={activeTab === 'history'} 
                        onClick={() => setActiveTab('history')} 
                        label="Trade History" 
                        icon={Icons.clipboardList} 
                    />
                    <ActivityTab 
                        active={activeTab === 'ledger'} 
                        onClick={() => setActiveTab('ledger')} 
                        label="Finance Log" 
                        icon={Icons.bookOpen} 
                    />
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="flex gap-2 items-center w-full sm:w-auto">
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className={inputClass} />
                        <span className="text-slate-700 font-bold text-[10px] uppercase">to</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className={inputClass} />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {activeTab === 'history' && (
                            <div className="relative flex-grow sm:w-48">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 scale-75">{Icons.search}</span>
                                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className={inputClass + " pl-10"} />
                            </div>
                        )}
                        <button onClick={() => setDateRange({start: '', end: ''})} className="shrink-0 px-4 py-2.5 rounded-xl border border-white/5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all">All</button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left min-w-[650px]">
                    <thead className="border-b border-white/5">
                        <tr>
                            <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Time</th>
                            {activeTab === 'history' ? (
                                <>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Market / Contract</th>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Stake</th>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Yield</th>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Status</th>
                                </>
                            ) : (
                                <>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Narration</th>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Debit</th>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Credit</th>
                                    <th className="pb-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Balance</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredData.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 sm:py-20 text-center text-slate-600 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">No matching synchronized records</td></tr>
                        ) : filteredData.map((item: any) => {
                            if (activeTab === 'history') {
                                const game = games.find(g => g.id === item.gameId);
                                const payout = calculateBetPayout(item, game, user.prizeRates);
                                const isPending = !game?.winningNumber || game.winningNumber.endsWith('_');
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-4 sm:py-5 text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="py-4 sm:py-5">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-950 flex items-center justify-center russo text-[9px] sm:text-[10px] text-amber-500 border border-white/5">{game?.name ? game.name.charAt(0) : '?'}</div>
                                                <div>
                                                    <div className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider">{game?.name || '---'}</div>
                                                    <div className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate max-w-[120px] sm:max-w-[150px]">{item.subGameType}: {item.numbers.join(',')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 sm:py-5 text-right font-mono text-xs font-bold text-slate-300 whitespace-nowrap">PKR {item.totalAmount.toFixed(0)}</td>
                                        <td className="py-4 sm:py-5 text-right font-mono text-xs font-black text-emerald-400 whitespace-nowrap">{payout > 0 ? `+${payout.toFixed(2)}` : '-'}</td>
                                        <td className="py-4 sm:py-5 text-right whitespace-nowrap">
                                            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 sm:py-1 rounded-full border ${
                                                isPending ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : payout > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                                {isPending ? 'Live' : payout > 0 ? 'Won' : 'Loss'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            } else {
                                const e = item as LedgerEntry;
                                return (
                                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 sm:py-5 text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">{e.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="py-4 sm:py-5 text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">{e.description}</td>
                                        <td className="py-4 sm:py-5 text-right font-mono text-xs text-red-400 whitespace-nowrap">{e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
                                        <td className="py-4 sm:py-5 text-right font-mono text-xs text-emerald-400 whitespace-nowrap">{e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
                                        <td className="py-4 sm:py-5 text-right font-mono text-xs font-black text-white whitespace-nowrap">PKR {e.balance.toFixed(2)}</td>
                                    </tr>
                                );
                            }
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- BETTING INTERFACE MODAL ---

const BettingModal: React.FC<{
    game: Game | null;
    games: Game[];
    user: User;
    onClose: () => void;
    onPlaceBet: (details: any) => Promise<void>;
    apiError: string | null;
    clearApiError: () => void;
}> = ({ game, user, onClose, onPlaceBet, apiError, clearApiError }) => {
    const [subGameType, setSubGameType] = useState<SubGameType>(SubGameType.TwoDigit);
    const [numbers, setNumbers] = useState<string>('');
    const [amount, setAmount] = useState<number | ''>('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!game) return null;

    const isSingleDigitGame = game.name === 'AK' || game.name === 'AKC';

    const calculatedNumbers = useMemo(() => {
        const rawList = numbers.split(/[-.,\s]+/).filter(n => n.length > 0);
        if (subGameType === SubGameType.Combo) {
            // Generate all unique 2-digit combinations from digits provided
            const digits = rawList.join('').split('').filter((v, i, a) => a.indexOf(v) === i);
            const combos: string[] = [];
            for (let i = 0; i < digits.length; i++) {
                // Fix: Corrected typo in condition from j < j < digits.length to j < digits.length
                for (let j = 0; j < digits.length; j++) {
                    if (i !== j) combos.push(digits[i] + digits[j]);
                }
            }
            return combos;
        }
        return rawList;
    }, [numbers, subGameType]);

    const totalStake = calculatedNumbers.length * (Number(amount) || 0);

    const handleConfirm = async () => {
        if (!amount || calculatedNumbers.length === 0) return;
        setIsProcessing(true);
        clearApiError();

        try {
            await onPlaceBet({
                gameId: game.id,
                betGroups: [{
                    subGameType: subGameType === SubGameType.Combo || subGameType === SubGameType.Bulk ? SubGameType.TwoDigit : subGameType,
                    numbers: calculatedNumbers,
                    amountPerNumber: Number(amount)
                }]
            });
            setNumbers('');
            setAmount('');
        } catch (err) {
            // Error is handled in parent via apiError
        } finally {
            setIsProcessing(false);
        }
    };

    const modeInfo = {
        [SubGameType.TwoDigit]: { label: '2-Digit', desc: 'Enter pairs (00-99)', color: 'amber' },
        [SubGameType.OneDigitOpen]: { label: 'Open', desc: 'Enter first digit (0-9)', color: 'sky' },
        [SubGameType.OneDigitClose]: { label: 'Close', desc: 'Enter second digit (0-9)', color: 'emerald' },
        [SubGameType.Bulk]: { label: 'Bulk', desc: 'Paste many numbers for same stake', color: 'indigo' },
        [SubGameType.Combo]: { label: 'Combo', desc: 'Enter digits to play all pairs', color: 'pink' }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
                <div className="p-8 sm:p-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-white russo tracking-tighter mb-1 uppercase">EXCHANGE CONTRACT</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{game.name} // DRAW @ {formatTime12h(game.drawTime)}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">{Icons.close}</button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-1.5 p-1 bg-slate-950/40 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                            {(isSingleDigitGame 
                                ? [SubGameType.OneDigitOpen, SubGameType.OneDigitClose] 
                                : [SubGameType.TwoDigit, SubGameType.OneDigitOpen, SubGameType.OneDigitClose, SubGameType.Bulk, SubGameType.Combo]
                            ).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSubGameType(type)}
                                    className={`shrink-0 py-3 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        subGameType === type 
                                        ? 'bg-amber-500 text-slate-950 shadow-lg' 
                                        : 'bg-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {modeInfo[type].label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{modeInfo[subGameType].desc}</label>
                            {subGameType === SubGameType.Bulk ? (
                                <textarea 
                                    rows={4}
                                    value={numbers}
                                    onChange={e => setNumbers(e.target.value)}
                                    className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/5 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white font-mono placeholder-slate-800 text-sm"
                                    placeholder="Paste multiple numbers here..."
                                />
                            ) : (
                                <input 
                                    type="text" 
                                    value={numbers}
                                    onChange={e => setNumbers(e.target.value)}
                                    className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/5 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white font-mono placeholder-slate-800"
                                    placeholder={subGameType === SubGameType.Combo ? "e.g. 123 for pairs 12,13,21,23,31,32" : "e.g. 14, 88, 92"}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stake Per Unit (PKR)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/5 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white font-mono placeholder-slate-800"
                                placeholder="Enter amount..."
                            />
                        </div>

                        {calculatedNumbers.length > 0 && (
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Generated Pairs</p>
                                <div className="text-[10px] text-amber-500 font-mono flex flex-wrap gap-x-2">
                                    {calculatedNumbers.slice(0, 20).join(', ')}{calculatedNumbers.length > 20 ? '...' : ''}
                                    <span className="text-white">({calculatedNumbers.length} units)</span>
                                </div>
                            </div>
                        )}

                        {apiError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-widest animate-shake">
                                {apiError}
                            </div>
                        )}

                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                            <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Obligation</p>
                                <p className="text-xl font-black text-white russo tracking-tighter">PKR {totalStake.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing || !amount || calculatedNumbers.length === 0}
                                className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black px-8 py-3 rounded-xl transition-all uppercase tracking-widest text-[11px] shadow-lg shadow-amber-500/10"
                            >
                                {isProcessing ? 'PROCESSING...' : 'CONFIRM TRADE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN USER PANEL ---

const UserPanel: React.FC<any> = ({ user, games, bets, placeBet }) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const handlePlaceBet = async (details: any) => {
        try {
            await placeBet(details);
            setSelectedGame(null);
        } catch (err: any) {
            setApiError(err.message || "Execution Error");
        }
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayBets = (bets || []).filter(b => b.timestamp.toISOString().split('T')[0] === today);
        return {
            todayVolume: todayBets.reduce((s, b) => s + b.totalAmount, 0),
            activeTickets: todayBets.length,
            netWorth: user.wallet || 0
        };
    }, [bets, user]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fade-in">
            <div className="flex flex-col xl:flex-row gap-6 sm:gap-8 items-start justify-between mb-10 sm:mb-16">
                <div className="space-y-2 w-full xl:w-auto">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2 animate-pulse">
                        Verified Member Node
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white russo tracking-tighter leading-tight">
                        TRADING <span className="text-amber-500">FLOOR</span>
                    </h1>
                    <p className="text-slate-500 text-[11px] sm:text-sm font-medium">Market synchronization active for <span className="text-white font-bold">{user.name}</span>.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full xl:w-auto">
                    <StatCard title="Total Liquidity" value={`PKR ${stats.netWorth.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={Icons.wallet} color="text-amber-500" />
                    <StatCard title="Daily Stake" value={`PKR ${stats.todayVolume.toLocaleString()}`} icon={Icons.chartBar} color="text-cyan-400" />
                    <StatCard title="Active Positions" value={stats.activeTickets} icon={Icons.clipboardList} color="text-emerald-400" />
                </div>
            </div>

            <div className="mb-10">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-8 sm:w-10 h-1 bg-amber-500 rounded-full"></div>
                    <h2 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Exchange Markets</h2>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {games.map(g => <GameCard key={g.id} game={g} onPlay={setSelectedGame} isRestricted={user.isRestricted} />)}
                </div>
            </div>

            <ActivityCenter bets={bets} games={games} user={user} />

            <BettingModal 
                game={selectedGame} 
                games={games}
                user={user} 
                onClose={() => setSelectedGame(null)} 
                onPlaceBet={handlePlaceBet}
                apiError={apiError}
                clearApiError={() => setApiError(null)}
            />
        </div>
    );
};

export default UserPanel;
