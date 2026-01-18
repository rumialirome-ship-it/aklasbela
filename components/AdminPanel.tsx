import React, { useState, useMemo, useEffect } from 'react';
import { Dealer, User, Game, PrizeRates, LedgerEntry, Bet, Admin, SubGameType, Role } from '../types';
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

// --- MODAL COMPONENT ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl'; themeColor?: string }> = ({ isOpen, onClose, title, children, size = 'md', themeColor = 'red' }) => {
    if (!isOpen) return null;
    const sizeClasses: Record<string, string> = { md: 'max-w-md', lg: 'max-w-3xl', xl: 'max-w-5xl' };
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-[100] p-4 overflow-y-auto">
            <div className={`bg-slate-900 rounded-[2.5rem] shadow-2xl w-full border border-${themeColor}-500/30 ${sizeClasses[size]} flex flex-col my-auto max-h-[95vh]`}>
                <div className="flex justify-between items-center p-6 sm:p-8 border-b border-white/5 flex-shrink-0">
                    <h3 className={`text-xl font-black text-${themeColor}-500 uppercase tracking-tighter russo`}>{title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 transition-colors">{Icons.close}</button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar">{children}</div>
            </div>
        </div>
    );
};

// --- FORM COMPONENTS ---
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

    const inputClass = "w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white text-sm focus:border-red-500/50 outline-none transition-all";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1";

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData, dealer?.id); onClose(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Login ID</label>
                    <input name="id" value={formData.id} onChange={handleChange} className={inputClass} disabled={!!dealer} required />
                </div>
                <div>
                    <label className={labelClass}>Display Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label className={labelClass}>Password</label>
                    <input type="text" name="password" value={formData.password} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label className={labelClass}>Comm. Rate (%)</label>
                    <input type="number" step="0.1" name="commissionRate" value={formData.commissionRate} onChange={handleChange} className={inputClass} required />
                </div>
            </div>
            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Market Prize Coefficients</p>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>2 Digit</label>
                        <input type="number" step="0.1" name="prizeRates.twoDigit" value={formData.prizeRates.twoDigit} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>1D Open</label>
                        <input type="number" step="0.1" name="prizeRates.oneDigitOpen" value={formData.prizeRates.oneDigitOpen} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>1D Close</label>
                        <input type="number" step="0.1" name="prizeRates.oneDigitClose" value={formData.prizeRates.oneDigitClose} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs shadow-xl shadow-red-900/20">
                {dealer ? 'Sync Profile' : 'Authorize Dealer'}
            </button>
        </form>
    );
};

const UserForm: React.FC<{ user?: User; onSave: (u: User, originalId?: string) => Promise<void>; onClose: () => void }> = ({ user, onSave, onClose }) => {
    // Note: This is an simplified edit form for Admin. 
    // Usually Admin only overrides prize/comm rates or resets password.
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

    const inputClass = "w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white text-sm focus:border-red-500/50 outline-none transition-all";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1";

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData, user?.id); onClose(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Login ID</label>
                    <input name="id" value={formData.id} className={inputClass} disabled />
                </div>
                <div>
                    <label className={labelClass}>Name</label>
                    <input name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Comm. Rate (%)</label>
                    <input type="number" step="0.1" name="commissionRate" value={formData.commissionRate} onChange={handleChange} className={inputClass} />
                </div>
            </div>
             <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">User Specific Prize Rates</p>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>2 Digit</label>
                        <input type="number" step="0.1" name="prizeRates.twoDigit" value={formData.prizeRates.twoDigit} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>1D Open</label>
                        <input type="number" step="0.1" name="prizeRates.oneDigitOpen" value={formData.prizeRates.oneDigitOpen} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>1D Close</label>
                        <input type="number" step="0.1" name="prizeRates.oneDigitClose" value={formData.prizeRates.oneDigitClose} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs">Update Profile</button>
        </form>
    );
};

// --- MAIN ADMIN PANEL ---
interface AdminPanelProps {
  admin: Admin; 
  dealers: Dealer[]; 
  onSaveDealer: (dealer: Dealer, originalId?: string) => Promise<void>;
  users: User[]; 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  games: Game[]; 
  bets: Bet[]; 
  declareWinner: (gameId: string, winningNumber: string) => void;
  updateWinner: (gameId: string, newWinningNumber: string) => void;
  approvePayouts: (gameId: string) => void;
  toggleGameVisibility: (gameId: string) => void;
  topUpDealerWallet: (dealerId: string, amount: number) => void;
  withdrawFromDealerWallet: (dealerId: string, amount: number) => void;
  toggleAccountRestriction: (accountId: string, accountType: 'user' | 'dealer') => void;
  onPlaceAdminBets: (details: { userId: string; gameId: string; betGroups: any[] }) => Promise<void>;
  updateGameDrawTime: (gameId: string, newDrawTime: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    admin, dealers, onSaveDealer, users, setUsers, games, bets, 
    declareWinner, updateWinner, approvePayouts, toggleGameVisibility, topUpDealerWallet, 
    withdrawFromDealerWallet, toggleAccountRestriction, onRefreshData 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [winningNumbers, setWinningNumbers] = useState<{[key: string]: string}>({});
  const [editingGame, setEditingGame] = useState<{ id: string, number: string } | null>(null);
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

  const handleDeclareWinner = (gameId: string, gameName: string) => {
    const num = winningNumbers[gameId];
    const isSingleDigitGame = gameName === 'AK' || gameName === 'AKC';
    const isValid = num && !isNaN(parseInt(num)) && (isSingleDigitGame ? num.length === 1 : num.length === 2);
    if (isValid) {
        declareWinner(gameId, num);
        setWinningNumbers(prev => ({...prev, [gameId]: ''}));
    } else {
        alert(`Please enter a valid ${isSingleDigitGame ? '1-digit' : '2-digit'} number.`);
    }
  };

  const handleUpdateWinner = (gameId: string, gameName: string) => {
    if (editingGame) {
        const num = editingGame.number;
        const isSingleDigitGame = gameName === 'AK' || gameName === 'AKC';
        const isValid = num && !isNaN(parseInt(num)) && (isSingleDigitGame ? num.length === 1 : num.length === 2);
        if (isValid) {
            updateWinner(gameId, num);
            setEditingGame(null);
        } else {
            alert(`Please enter a valid ${isSingleDigitGame ? '1-digit' : '2-digit'} number.`);
        }
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.chartBar },
    { id: 'dealers', label: 'Dealers', icon: Icons.userGroup }, 
    { id: 'users', label: 'Users', icon: Icons.clipboardList },
    { id: 'games', label: 'Games', icon: Icons.gamepad },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-red-500 uppercase russo tracking-tighter">Admin <span className="text-white">Nexus</span></h2>
          <div className="bg-slate-800/40 p-1.5 rounded-2xl flex items-center gap-1 border border-white/5 overflow-x-auto no-scrollbar max-w-[50vw] sm:max-w-none">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 flex items-center gap-2 py-2 px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
      </div>
      
      {activeTab === 'games' && (
        <div className="animate-fade-in space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-red-600 rounded-full"></div>
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em]">Market Control Interface</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {games.map(game => {
                    const hasWinner = !!game.winningNumber && !game.winningNumber.endsWith('_');
                    const isPayoutApproved = !!game.payoutsApproved;
                    const isSingleDigitGame = game.name === 'AK' || game.name === 'AKC';
                    const isEditing = editingGame?.id === game.id;
                    const isVisible = game.isVisible !== false;
                    
                    return (
                        <div key={game.id} className={`bg-slate-900/40 rounded-[2rem] border border-white/5 p-6 flex flex-col group hover:border-red-500/20 transition-all duration-500 ${!isVisible ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="text-xl font-black text-white russo tracking-tighter mb-1 flex items-center gap-2">
                                        {game.name}
                                        {!isVisible && <span className="text-[9px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/5">Hidden</span>}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Draw @ {game.drawTime}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`w-3 h-3 rounded-full ${hasWinner ? (isPayoutApproved ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-amber-500 animate-pulse') : 'bg-slate-700'}`}></div>
                                    <button 
                                        onClick={() => toggleGameVisibility(game.id)}
                                        className={`p-1.5 rounded-lg border transition-all ${isVisible ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}`}
                                        title={isVisible ? "Hide Game" : "Show Game"}
                                    >
                                        {isVisible ? Icons.eye : Icons.eyeOff}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-grow space-y-5">
                                <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 text-center min-h-[110px] flex flex-col justify-center">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Editing Mode</p>
                                            <input 
                                                type="text" 
                                                value={editingGame.number} 
                                                maxLength={isSingleDigitGame ? 1 : 2}
                                                onChange={(e) => setEditingGame({ ...editingGame, number: e.target.value.replace(/\D/g, '') })}
                                                className="w-full bg-slate-900 border border-cyan-500/50 text-cyan-400 text-4xl font-black text-center rounded-xl p-2 russo outline-none focus:ring-2 focus:ring-cyan-500/20"
                                                autoFocus
                                            />
                                        </div>
                                    ) : hasWinner ? (
                                        <>
                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Market Settled</p>
                                            <p className="text-5xl font-black text-white russo gold-shimmer">{game.winningNumber}</p>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Enter Result</p>
                                            <input 
                                                type="text" 
                                                placeholder={isSingleDigitGame ? "0" : "00"}
                                                value={winningNumbers[game.id] || ''}
                                                maxLength={isSingleDigitGame ? 1 : 2}
                                                onChange={(e) => setWinningNumbers(prev => ({...prev, [game.id]: e.target.value.replace(/\D/g, '')}))}
                                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl p-2 text-white text-center font-black russo text-3xl focus:border-red-500/30 outline-none transition-all"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => setEditingGame(null)} className="py-3 rounded-xl bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
                                            <button onClick={() => handleUpdateWinner(game.id, game.name)} className="py-3 rounded-xl bg-cyan-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/20">Update</button>
                                        </>
                                    ) : hasWinner ? (
                                        <>
                                            <button 
                                                disabled={isPayoutApproved}
                                                onClick={() => setEditingGame({ id: game.id, number: game.winningNumber!.replace(/_/g, '') })} 
                                                className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isPayoutApproved ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-cyan-900/20'}`}
                                            >
                                                Edit Result
                                            </button>
                                            <button 
                                                disabled={isPayoutApproved}
                                                onClick={() => approvePayouts(game.id)} 
                                                className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isPayoutApproved ? 'bg-emerald-900/10 text-emerald-500 border border-emerald-500/20 cursor-default' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'}`}
                                            >
                                                {isPayoutApproved ? 'Settled' : 'Approve'}
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => handleDeclareWinner(game.id, game.name)} 
                                            className="col-span-2 py-4 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-red-500 shadow-xl shadow-red-900/20 transition-all active:scale-95"
                                        >
                                            Declare Result
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {activeTab === 'dealers' && (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white russo uppercase tracking-tighter">Authorized Dealers</h3>
                <button onClick={() => { setSelectedDealer(undefined); setIsDealerModalOpen(true); }} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20">Authorize New Dealer</button>
            </div>
            <div className="bg-slate-900/40 rounded-[2rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID / Dealer Name</th>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Comm. Rate</th>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pool Balance</th>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dealers.map(dealer => (
                            <tr key={dealer.id} className="hover:bg-white/[0.02]">
                                <td className="p-4">
                                    <p className="font-bold text-white">{dealer.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{dealer.id}</p>
                                </td>
                                <td className="p-4">
                                    <span className="text-emerald-400 font-black russo">{dealer.commissionRate}%</span>
                                </td>
                                <td className="p-4 text-right">
                                    <p className="font-mono text-white text-sm font-bold">PKR {dealer.wallet.toLocaleString()}</p>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => { setSelectedDealer(dealer); setIsDealerModalOpen(true); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors">Edit Parameters</button>
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
            <div className="bg-slate-900/40 rounded-[2rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User / Dealer Parent</th>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rates</th>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Wallet</th>
                            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-white/[0.02]">
                                <td className="p-4">
                                    <p className="font-bold text-white">{user.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">ID: {user.id} | Parent: {user.dealerId}</p>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2 text-[9px] font-black uppercase tracking-tighter">
                                        <span className="text-amber-500">2D: {user.prizeRates.twoDigit}</span>
                                        <span className="text-emerald-500">Comm: {user.commissionRate}%</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <p className="font-mono text-white text-sm font-bold">PKR {user.wallet.toLocaleString()}</p>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => { setSelectedUser(user); setIsUserModalOpen(true); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors">Adjust Rates</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'dashboard' && <div className="py-20 text-center text-slate-500 font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Global Nexus Ledger...</div>}
      
      {/* Dealer Edit Modal */}
      <Modal isOpen={isDealerModalOpen} onClose={() => setIsDealerModalOpen(false)} title={selectedDealer ? "Configure Dealer Parameters" : "Authorize New Dealer"}>
          <DealerForm dealer={selectedDealer} onClose={() => setIsDealerModalOpen(false)} onSave={onSaveDealer} />
      </Modal>

      {/* User Edit Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Modify User Parameters">
          <UserForm user={selectedUser} onClose={() => setIsUserModalOpen(false)} onSave={async (u, originalId) => {
              // Usually via an API endpoint that allows Admin to update user
              await useAuth().fetchWithAuth(`/api/admin/users/${originalId}`, { method: 'PUT', body: JSON.stringify(u) });
              onRefreshData && onRefreshData();
          }} />
      </Modal>
    </div>
  );
};

export default AdminPanel;