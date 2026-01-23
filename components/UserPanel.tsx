
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Game, SubGameType, LedgerEntry, Bet, PrizeRates } from '../types';
import { Icons, getDynamicLogo } from '../constants';
import { useCountdown } from '../hooks/useCountdown';
import { useAuth } from '../hooks/useAuth';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const formatTime12h = (time24: string | undefined) => {
    if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) return '--:--';
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

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
            active ? 'bg-amber-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
    >
        <span className={active ? 'animate-pulse' : ''}>{icon}</span>
        <span className="hidden xs:inline">{label}</span>
        <span className="xs:hidden">{label.split(' ')[0]}</span>
    </button>
);

const GameCard: React.FC<{ game: Game; onPlay: (game: Game) => void; onWatch: (game: Game) => void; isRestricted: boolean; }> = ({ game, onPlay, onWatch, isRestricted }) => {
    const { status, text: countdownText } = useCountdown(game.drawTime);
    const hasFinalWinner = !!game.winningNumber && !game.winningNumber.endsWith('_');
    
    // STRICT UI CHECK: Game is only playable if market status is OPEN, user not restricted, and no final winner declared.
    const isMarketOpen = status === 'OPEN';
    const canPlay = !isRestricted && !hasFinalWinner && isMarketOpen;
    
    const logo = getDynamicLogo(game.name);

    return (
        <div className={`group relative flex flex-col bg-slate-900/40 rounded-3xl border border-white/5 transition-all duration-500 overflow-hidden ${!canPlay && !hasFinalWinner ? 'opacity-70 grayscale-[0.3]' : 'hover:border-amber-500/30 hover:bg-slate-900/60 hover:-translate-y-1'}`}>
            <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="p-5 sm:p-6 relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="relative shrink-0">
                        <div className="absolute -inset-2 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <img src={logo} alt={game.name} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-white/5 object-cover shadow-2xl" />
                    </div>
                    <div className="text-right ml-2">
                        <h3 className="text-lg sm:text-xl font-black text-white russo tracking-tighter leading-none mb-1 truncate max-w-[120px] sm:max-w-none uppercase">{game.name}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Draw @ {formatTime12h(game.drawTime)}</p>
                    </div>
                </div>

                <div className="space-y-4 flex-grow flex flex-col justify-end">
                    <div className="bg-slate-950/60 rounded-2xl p-3 sm:p-4 border border-white/5 text-center min-h-[80px] sm:min-h-[90px] flex flex-col justify-center">
                        {hasFinalWinner ? (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Final Outcome</span>
                                <span className="text-3xl sm:text-4xl font-black text-white russo gold-shimmer">{game.winningNumber}</span>
                            </>
                        ) : status === 'OPEN' || status === 'SOON' ? (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-amber-500/60 uppercase tracking-[0.3em] mb-1">
                                    {status === 'OPEN' ? 'Market Closes In' : 'Market Status'}
                                </span>
                                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tighter ${status === 'OPEN' ? 'text-amber-400' : 'text-sky-400 text-lg'}`}>{countdownText}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Status</span>
                                <span className="text-base sm:text-lg font-black text-slate-400 russo uppercase tracking-tighter">Market Closed</span>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => hasFinalWinner ? onWatch(game) : onPlay(game)} 
                        disabled={!canPlay && !hasFinalWinner}
                        className={`w-full py-3.5 sm:py-4 rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] transition-all duration-300 transform active:scale-95 ${
                            hasFinalWinner 
                            ? 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
                            : canPlay 
                            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10 hover:bg-amber-400' 
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {hasFinalWinner ? 'Watch Draw' : isMarketOpen ? 'Play Game' : 'Closed'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BettingModal: React.FC<{
    game: Game | null;
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

    // Track real-time status inside the modal
    const { status } = useCountdown(game?.drawTime || '');
    const isClosed = status === 'CLOSED' || status === 'LOADING';

    if (!game) return null;

    const isSingleDigitGame = game.name === 'AK' || game.name === 'AKC';

    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        if (subGameType === SubGameType.TwoDigit) {
            const digitsOnly = val.replace(/\D/g, '');
            const pairs = digitsOnly.match(/.{1,2}/g) || [];
            setNumbers(pairs.join(', '));
        } else if (subGameType === SubGameType.OneDigitOpen || subGameType === SubGameType.OneDigitClose) {
            const digitsOnly = val.replace(/\D/g, '');
            const singles = digitsOnly.split('');
            setNumbers(singles.join(', '));
        } else {
            setNumbers(val);
        }
    };

    const calculatedNumbers = useMemo(() => {
        const rawList = numbers.split(/[-,.\s\n\r]+/).filter(n => n.trim().length > 0).map(n => n.trim());
        if (subGameType === SubGameType.Combo) {
            const digits = rawList.join('').split('').filter((v, i, a) => a.indexOf(v) === i);
            const combos: string[] = [];
            for (let i = 0; i < digits.length; i++) {
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
        if (!amount || calculatedNumbers.length === 0 || isClosed) return;
        setIsProcessing(true);
        clearApiError();

        try {
            await onPlaceBet({
                gameId: game.id,
                betGroups: [{
                    subGameType: (subGameType === SubGameType.Combo || subGameType === SubGameType.Bulk) ? SubGameType.TwoDigit : subGameType,
                    numbers: calculatedNumbers,
                    amountPerNumber: Number(amount)
                }]
            });
            setNumbers('');
            setAmount('');
        } catch (err) {
            // Managed by parent
        } finally {
            setIsProcessing(false);
        }
    };

    const modeInfo = {
        [SubGameType.TwoDigit]: { label: '2-Digit', desc: 'Enter pairs (00-99)', color: 'amber' },
        [SubGameType.OneDigitOpen]: { label: 'Open', desc: 'Enter first digit (0-9)', color: 'sky' },
        [SubGameType.OneDigitClose]: { label: 'Close', desc: 'Enter second digit (0-9)', color: 'emerald' },
        [SubGameType.Bulk]: { label: 'Bulk', desc: 'Paste multiple pairs at once', color: 'indigo' },
        [SubGameType.Combo]: { label: 'Combo', desc: 'Combines all digits entered into pairs', color: 'pink' }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in my-auto">
                <div className="p-8 sm:p-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-white russo tracking-tighter mb-1 uppercase">GAME TICKET</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{game.name} // Draw @ {formatTime12h(game.drawTime)}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">{Icons.close}</button>
                    </div>

                    <div className="space-y-6">
                        {isClosed && (
                           <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
                               <p className="text-[10px] font-black uppercase tracking-widest">MARKET CLOSED</p>
                               <p className="text-[9px] font-bold opacity-70 mt-1">This market is no longer accepting entries.</p>
                           </div>
                        )}

                        <div className={`flex gap-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
                            {(isSingleDigitGame 
                                ? [SubGameType.OneDigitOpen, SubGameType.OneDigitClose] 
                                : [SubGameType.TwoDigit, SubGameType.OneDigitOpen, SubGameType.OneDigitClose, SubGameType.Bulk, SubGameType.Combo]
                            ).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setSubGameType(type); setNumbers(''); }}
                                    className={`shrink-0 py-3 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        subGameType === type ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {modeInfo[type].label}
                                </button>
                            ))}
                        </div>

                        <div className={`space-y-2 ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{modeInfo[subGameType].desc}</label>
                            {subGameType === SubGameType.Bulk ? (
                                <textarea 
                                    rows={4} value={numbers} onChange={handleNumberInputChange}
                                    className="w-full bg-slate-950/80 p-4 rounded-2xl border border-white/10 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white font-mono placeholder-slate-800 text-sm"
                                    placeholder="Paste many numbers (e.g. 14, 25, 88...)"
                                    disabled={isClosed}
                                />
                            ) : (
                                <input 
                                    type="text" value={numbers} onChange={handleNumberInputChange}
                                    className="w-full bg-slate-950/80 p-4 rounded-2xl border border-white/10 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white font-mono placeholder-slate-800"
                                    placeholder={subGameType === SubGameType.Combo ? "Enter digits (e.g. 123)" : "Enter number(s)"}
                                    disabled={isClosed}
                                />
                            )}
                        </div>

                        <div className={`space-y-2 ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stake Per Selection (PKR)</label>
                            <input 
                                type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full bg-slate-950/80 p-4 rounded-2xl border border-white/10 focus:ring-2 focus:ring-amber-500/50 focus:outline-none text-white font-mono placeholder-slate-800"
                                placeholder="Stake amount..."
                                disabled={isClosed}
                            />
                        </div>

                        {calculatedNumbers.length > 0 && (
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 max-h-24 overflow-y-auto no-scrollbar">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Generated Entry List</p>
                                <div className="text-[10px] text-amber-500 font-mono flex flex-wrap gap-x-2">
                                    {calculatedNumbers.join(', ')} <span className="text-white">({calculatedNumbers.length} entries)</span>
                                </div>
                            </div>
                        )}

                        {apiError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-widest animate-shake">
                                {apiError}
                            </div>
                        )}

                        <div className="bg-slate-950/60 p-6 rounded-2xl border border-white/10 flex justify-between items-center">
                            <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Stake</p>
                                <p className="text-xl font-black text-white russo tracking-tighter">PKR {totalStake.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing || !amount || calculatedNumbers.length === 0 || isClosed}
                                className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black px-8 py-3 rounded-xl transition-all uppercase tracking-widest text-[11px] shadow-lg shadow-amber-500/10"
                            >
                                {isProcessing ? 'SUBMITTING...' : isClosed ? 'MARKET CLOSED' : 'CONFIRM TICKET'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
        
        // Deep null safety for prize multipliers
        const rates = userPrizeRates || { oneDigitOpen: 0, oneDigitClose: 0, twoDigit: 0 };
        const multiplier = bet.subGameType === SubGameType.OneDigitOpen ? (rates.oneDigitOpen || 0) : (bet.subGameType === SubGameType.OneDigitClose ? (rates.oneDigitClose || 0) : (rates.twoDigit || 0));
        return winsCount * (bet.amountPerNumber || 0) * multiplier;
    };

    const filteredData = useMemo(() => {
        if (activeTab === 'history') {
            return (bets || []).filter(b => {
                const bDate = b.timestamp.toISOString().split('T')[0];
                const game = games.find(g => g.id === b.gameId);
                const matchesDate = (!dateRange.start || bDate >= dateRange.start) && (!dateRange.end || bDate <= dateRange.end);
                const matchesSearch = !search || (game?.name || '').toLowerCase().includes(search.toLowerCase()) || (b.subGameType || '').toLowerCase().includes(search.toLowerCase());
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
                    <ActivityTab active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" icon={Icons.clipboardList} />
                    <ActivityTab active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label="Ledger" icon={Icons.bookOpen} />
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
                        <button onClick={() => setDateRange({start: '', end: ''})} className="shrink-0 px-4 py-2.5 rounded-xl border border-white/5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all">Reset</button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left min-w-[650px]">
                    <thead className="border-b border-white/5">
                        <tr>
                            <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Timestamp</th>
                            {activeTab === 'history' ? (
                                <>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Game / Type</th>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Stake</th>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Winning</th>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Status</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Description</th>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Debit</th>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Credit</th>
                                    <th className="p-4 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 text-right">Balance</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredData.length === 0 ? (
                            <tr><td colSpan={6} className="py-16 sm:py-20 text-center text-slate-600 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">No entries found for this period</td></tr>
                        ) : filteredData.map((item: any) => {
                            if (activeTab === 'history') {
                                const game = games.find(g => g.id === item.gameId);
                                const payout = calculateBetPayout(item, game, user.prizeRates);
                                const isPending = !game?.winningNumber || game.winningNumber.endsWith('_');
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 sm:py-5 text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">{item.timestamp.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</td>
                                        <td className="p-4 sm:py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="russo text-[10px] text-amber-500 uppercase">{game?.name || '---'}</div>
                                                <div className="text-[9px] text-slate-500 font-mono truncate max-w-[150px] uppercase">[{item.subGameType}]: {item.numbers.join(',')}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:py-5 text-right font-mono text-xs font-bold text-slate-300">PKR {item.totalAmount.toFixed(0)}</td>
                                        <td className="p-4 sm:py-5 text-right font-mono text-xs font-black text-emerald-400">{payout > 0 ? `+${payout.toFixed(2)}` : '-'}</td>
                                        <td className="p-4 sm:py-5 text-right">
                                            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                                                isPending ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : payout > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>{isPending ? 'Live' : payout > 0 ? 'Winner' : 'Closed'}</span>
                                        </td>
                                    </tr>
                                );
                            } else {
                                const e = item as LedgerEntry;
                                return (
                                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 sm:py-5 text-[9px] sm:text-[10px] font-mono text-slate-500">{e.timestamp.toLocaleString()}</td>
                                        <td className="p-4 sm:py-5 text-[11px] font-bold text-white uppercase tracking-wider">{e.description}</td>
                                        <td className="p-4 sm:py-5 text-right font-mono text-xs text-red-400">{e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
                                        <td className="p-4 sm:py-5 text-right font-mono text-xs text-emerald-400">{e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
                                        <td className="p-4 sm:py-5 text-right font-mono text-xs font-black text-white">PKR {e.balance.toFixed(2)}</td>
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

const UserPanel: React.FC<any> = ({ user, games, bets, placeBet, onWatchDraw }) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const handlePlaceBet = async (details: any) => {
        try {
            await placeBet(details);
            setSelectedGame(null);
            setApiError(null);
        } catch (err: any) {
            setApiError(err.message || "Entry submission failed.");
        }
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayBets = (bets || []).filter(b => b.timestamp.toISOString().split('T')[0] === today);
        return {
            todayVolume: todayBets.reduce((s, b) => s + b.totalAmount, 0),
            activeTickets: todayBets.length,
            netWorth: (user && user.wallet) || 0
        };
    }, [bets, user]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fade-in">
            <div className="flex flex-col xl:flex-row gap-6 sm:gap-8 items-start justify-between mb-10 sm:mb-16">
                <div className="space-y-2 w-full xl:w-auto">
                    <div className="inline-block bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2 animate-pulse">Account verified</div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white russo tracking-tighter leading-tight uppercase">GAME <span className="text-amber-500">TERMINAL</span></h1>
                    <p className="text-slate-500 text-[11px] sm:text-sm font-medium">Verified session active for <span className="text-white font-bold">{(user && user.name) || 'Player'}</span></p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full xl:w-auto">
                    <StatCard title="Wallet Liquidity" value={`PKR ${stats.netWorth.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={Icons.wallet} color="text-amber-500" />
                    <StatCard title="Today's Stake" value={`PKR ${stats.todayVolume.toLocaleString()}`} icon={Icons.chartBar} color="text-cyan-400" />
                    <StatCard title="Entry Count" value={stats.activeTickets} icon={Icons.clipboardList} color="text-emerald-400" />
                </div>
            </div>

            <div className="mb-10">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-8 sm:w-10 h-1 bg-amber-500 rounded-full"></div>
                    <h2 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Available Markets</h2>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {games.map(g => <GameCard key={g.id} game={g} onPlay={(game) => { setApiError(null); setSelectedGame(game); }} onWatch={() => onWatchDraw(g)} isRestricted={(user && user.isRestricted) || false} />)}
                </div>
            </div>

            <ActivityCenter bets={bets} games={games} user={user} />

            {selectedGame && (
                <BettingModal 
                    game={selectedGame} 
                    user={user} 
                    onClose={() => setSelectedGame(null)} 
                    onPlaceBet={handlePlaceBet} 
                    apiError={apiError} 
                    clearApiError={() => setApiError(null)} 
                />
            )}
        </div>
    );
};

export default UserPanel;
