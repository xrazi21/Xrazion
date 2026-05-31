import React, { useState } from "react";
import { Transaction, UserProfile } from "../types";
import { Coins, Award, Sparkles, TrendingUp, DollarSign, Clock, RefreshCw, Layers } from "lucide-react";

interface WalletProps {
  profile: UserProfile;
  transactionsList: Transaction[];
  onWalletUpdated: (newProfile: UserProfile) => void;
  onRefreshTransactions: () => void;
}

export default function Wallet({ profile, transactionsList, onWalletUpdated, onRefreshTransactions }: WalletProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [diamondsToWithdraw, setDiamondsToWithdraw] = useState<number>(500);

  // High-fidelity coin products
  const coinPackages = [
    { coins: 1000, price: 0.99, id: "coin_1", description: "Starter Pack + 10% Bonus" },
    { coins: 5000, price: 4.99, id: "coin_2", description: "Popular choice" },
    { coins: 10000, price: 9.99, id: "coin_3", description: "Best Value: 10% extra coins" },
    { coins: 50000, price: 49.99, id: "coin_4", description: "VIP Whales Elite Tier Pack" },
  ];

  const handleTopUp = async (coins: number, price: number, packId: string) => {
    setLoading(packId);
    setSuccessMsg(null);
    try {
      const response = await fetch("/api/gems/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinPack: coins, priceUSD: price })
      });
      const data = await response.json();
      if (data.success) {
        onWalletUpdated(data.profile);
        onRefreshTransactions();
        setSuccessMsg(`🎉 Successfully credited ${coins.toLocaleString()} Coins to your account!`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleBuyVIP = async () => {
    setLoading("vip");
    setSuccessMsg(null);
    try {
      const response = await fetch("/api/gems/buy-vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        onWalletUpdated(data.profile);
        onRefreshTransactions();
        setSuccessMsg("👑 Welcome to XChat VIP obsidian Club! Priority features enabled.");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(data.error || "Failed context validation.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (diamondsToWithdraw < 100) {
      alert("Minimum cashout withdrawal is 100 diamonds.");
      return;
    }
    setLoading("withdraw");
    setSuccessMsg(null);

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diamondsToCash: diamondsToWithdraw })
      });
      const data = await response.json();
      if (data.success) {
        onWalletUpdated(data.profile);
        onRefreshTransactions();
        setSuccessMsg(`💸 Conversion success! Converted ${diamondsToWithdraw} Diamonds to $${(diamondsToWithdraw * 0.1).toFixed(2)} USD virtual cash.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(data.error || "Failed withdrawal submission.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Account balances snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Coin balance panel */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-gold-600/30 via-obsidian-850 to-obsidian-900 border border-gold-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-400 rounded-full blur-[70px] opacity-10"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display font-semibold uppercase tracking-wider text-gold-300">
              Gold Coin Credit Balance
            </span>
            <div className="p-2 rounded-xl bg-gold-950/40 border border-gold-500/30">
              <Coins className="w-5 h-5 text-gold-400" />
            </div>
          </div>
          <span className="text-3xl md:text-4xl font-display font-black text-white block truncate mb-1">
            🌟 {profile.coins.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400 italic">Used for private calls & virtual gifts.</span>
        </div>

        {/* Diamond pool stats */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 via-obsidian-850 to-obsidian-900 border border-pink-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-400 rounded-full blur-[70px] opacity-10"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display font-semibold uppercase tracking-wider text-pink-300">
              Host Diamonds Holdings
            </span>
            <div className="p-2 rounded-xl bg-pink-950/40 border border-pink-500/30">
              <TrendingUp className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          <span className="text-3xl md:text-4xl font-display font-black text-white block truncate mb-1">
            💎 {profile.diamonds.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400 italic">Representing agency metrics (Withdraw eligible).</span>
        </div>

        {/* Profile membership and level */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 via-obsidian-850 to-obsidian-900 border border-violet-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-400 rounded-full blur-[70px] opacity-10"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display font-semibold uppercase tracking-wider text-violet-300">
              User tier ranking status
            </span>
            <div className="p-2 rounded-xl bg-violet-950/40 border border-violet-500/30">
              <Award className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-display font-black text-white">LEVEL {profile.level}</span>
            {profile.vip && (
              <span className="vip-border-anim text-[10px] text-obsidian-950 font-display font-extrabold px-2 py-0.5 rounded-full uppercase">
                VIP
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 italic">Next level requires {Math.round(profile.level * 2.5)} XP.</span>
        </div>

      </div>

      {/* Transaction status alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-2xl text-center select-none animate-pulse">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 2. Buy Coins Area (Left, 8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-obsidian-800/50 border border-obsidian-750 rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <Coins className="w-5 h-5 text-gold-400" /> Buy Gold Coins / Top Up Dompet Coin
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-sans">
              Choose your ideal luxury seed coin package to unlock unrestricted communication flows. Fast checkout simulation active (mock credit cards processed instantly).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coinPackages.map((pkg) => (
                <div 
                  key={pkg.id}
                  className="bg-obsidian-900 border border-obsidian-800 rounded-xl p-4 flex flex-col justify-between hover:border-gold-500/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-display font-bold text-base">🌟 {pkg.coins.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-500 font-mono italic">{pkg.description}</span>
                    </div>
                    <span className="text-xs text-gray-400 block pb-3">{pkg.coins / 100} mins Call Equivalency</span>
                  </div>

                  <button
                    onClick={() => handleTopUp(pkg.coins, pkg.price, pkg.id)}
                    disabled={loading !== null}
                    id={`btn-wallet-topup-${pkg.id}`}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-gold-600 text-obsidian-950 hover:bg-gold-500 disabled:opacity-40 transition-colors"
                  >
                    {loading === pkg.id ? "Processing Transaction..." : `Purchase for $${pkg.price.toFixed(2)} USD`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. VIP Subscription box */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-gold-500/25 relative overflow-hidden flex flex-col sm:flex-row gap-6 items-center justify-between">
            <div className="space-y-2">
              <span className="vip-border-anim text-[9px] text-obsidian-950 font-display font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                Exclusive Invitation
              </span>
              <h4 className="text-lg font-display font-black text-white flex items-center gap-1.5 leading-none">
                Get VIP Crown Obsidian Club <Sparkles className="w-4 h-4 text-gold-300 fill-gold-400" />
              </h4>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                Unlock gold profiles highlights, double daily XP logs, VIP custom message borders, and prioritized high-definition video matching lobbies globally.
              </p>
              <span className="text-xs text-gold-400 block font-mono font-bold pt-1">
                💎 Package Cost: 1,500 Coins / Monthly renewal
              </span>
            </div>

            <button
              onClick={handleBuyVIP}
              disabled={loading !== null || profile.vip}
              id="btn-wallet-buy-vip"
              className={`px-6 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wide transition-all border shrink-0 ${
                profile.vip
                  ? "bg-obsidian-850 border-emerald-500/30 text-emerald-400 cursor-default"
                  : "bg-gold-600 text-obsidian-950 border-gold-500 hover:bg-gold-400 shadow-lg shadow-gold-600/10"
              }`}
            >
              {profile.vip ? "VIP Member Enabled" : "Unlock VIP Membership"}
            </button>
          </div>
        </div>

        {/* 4. Withdraw Area & ledger history list (Right, 4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Agency Cashout withdraw simulator */}
          <div className="bg-obsidian-800/50 border border-obsidian-750 rounded-2xl p-5">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-pink-300 mb-2 flex items-center gap-1.5 pb-2 border-b border-obsidian-750">
              <DollarSign className="w-4 h-4" /> Agency Host Withdrawal
            </h3>
            <p className="text-xs text-gray-400 pb-4 leading-relaxed font-sans">
              Hosts make a living by exchanging diamond earnings. Simulate host payout conversions (10 Diamonds = $1.00 USD).
            </p>

            <form onSubmit={handleWithdraw} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1.5 font-mono">
                  Convert Quantity (Diamonds)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={diamondsToWithdraw}
                  onChange={(e) => setDiamondsToWithdraw(parseInt(e.target.value) || 0)}
                  disabled={loading !== null}
                  id="input-withdraw-diamonds"
                  className="w-full py-2 px-3 rounded-lg bg-obsidian-900 border border-obsidian-800 text-white text-xs text-center font-mono font-bold outline-none ring-1 ring-obsidian-750 focus:ring-pink-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-obsidian-950 text-center">
                <span className="text-[10px] text-gray-500 block font-mono">ESTIMATED PAYOUT CASH VALUE</span>
                <span className="text-lg font-mono font-black text-emerald-400">$ {(diamondsToWithdraw * 0.1).toFixed(2)} USD</span>
              </div>

              <button
                type="submit"
                id="btn-wallet-withdraw-submit"
                disabled={loading !== null || profile.diamonds < diamondsToWithdraw}
                className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-transparent text-pink-400 border border-pink-500/50 hover:bg-pink-500/10 disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
              >
                {loading === "withdraw" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Payout...
                  </>
                ) : (
                  <>
                    💸 Submit Cashout Request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Core financial logs registry list */}
          <div className="bg-obsidian-800/30 border border-obsidian-750 rounded-2xl p-5">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1 pb-2 border-b border-obsidian-750">
              <Clock className="w-4 h-4 text-gray-500" /> Transaction Ledgers
            </h3>

            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
              {transactionsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No registered transactional ledger history.
                </div>
              ) : (
                transactionsList.map((tx) => (
                  <div key={tx.id} className="p-2.5 bg-obsidian-900/50 border border-obsidian-800 rounded-lg flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-semibold block truncate leading-tight mb-0.5">{tx.description}</span>
                      <span className="text-[9px] text-gray-500 block font-mono">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`block font-mono font-bold leading-tight ${
                        tx.type === 'buy_coin' ? 'text-emerald-400' : tx.type === 'withdraw' ? 'text-pink-400' : 'text-amber-400'
                      }`}>
                        {tx.type === 'buy_coin' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-gray-400 block bg-obsidian-950 px-1 rounded border border-obsidian-750">{tx.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
