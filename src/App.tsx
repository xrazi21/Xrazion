import React, { useState, useEffect } from "react";
import { UserProfile, Host, Transaction, ReportItem } from "./types";
import HostCard from "./components/HostCard";
import Lounge from "./components/Lounge";
import VideoCall from "./components/VideoCall";
import Wallet from "./components/Wallet";
import AdminPanel from "./components/AdminPanel";
import GoogleWorkspace from "./components/GoogleWorkspace";
import { 
  Sparkles, Globe, Coins, ShieldAlert, Award, Compass, RefreshCw, 
  MessageSquare, SlidersHorizontal, BookOpen, AlertTriangle, Send, Heart, CircleCheck 
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./googleAuth";
import { getUserProfile, saveUserProfile, listTransactions } from "./firebaseService";

export default function App() {
  // Navigation & Screens state
  const [activeTab, setActiveTab] = useState<'lobby' | 'match' | 'google' | 'wallet' | 'admin'>('lobby');
  const [activeCallHost, setActiveCallHost] = useState<Host | null>(null);

  // Global Sync Status States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hostsList, setHostsList] = useState<Host[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters for the live stream grids
  const [countryFilter, setCountryFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");

  // Local state for Quick Personal Messenger Chat overlay
  const [chattingHost, setChattingHost] = useState<Host | null>(null);
  const [quickMessages, setQuickMessages] = useState<Array<{ sender: 'user' | 'host', text: string }>>([]);
  const [quickInput, setQuickInput] = useState("");
  const [quickAiResponding, setQuickAiResponding] = useState(false);

  // Local state for Filing Abuse Reports
  const [reportingHost, setReportingHost] = useState<Host | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // 1. Initial Load Bootstrap State
  const bootstrapState = async () => {
    setLoading(true);
    try {
      // Parallel fetches for optimum performant loads
      const [profileRes, hostsRes, txRes] = await Promise.all([
        fetch("/api/profile"),
        fetch(`/api/hosts?country=${countryFilter}&gender=${genderFilter}`),
        fetch("/api/transactions")
      ]);

      const profileData = await profileRes.json();
      const hostsData = await hostsRes.json();
      const txData = await txRes.json();

      setHostsList(hostsData);

      // If securely logged in with Firebase, fetch from Firestore; otherwise fallback to memory-API
      const fbUser = auth.currentUser;
      if (fbUser) {
        const cachedProfile = await getUserProfile(fbUser.uid);
        if (cachedProfile) {
          setUserProfile(cachedProfile);
        } else {
          // Initialize user profile in Firestore
          const initialProfile: UserProfile = {
            id: fbUser.uid,
            name: fbUser.displayName || profileData.name,
            avatar: fbUser.photoURL || profileData.avatar,
            coins: profileData.coins,
            diamonds: profileData.diamonds,
            level: profileData.level,
            vip: profileData.vip,
            country: profileData.country,
            gender: "Male",
            bio: profileData.bio,
            verified: true,
          };
          await saveUserProfile(fbUser.uid, initialProfile);
          setUserProfile(initialProfile);
        }

        const cachedTx = await listTransactions(fbUser.uid);
        setTransactions(cachedTx);
      } else {
        setUserProfile(profileData);
        setTransactions(txData);
      }
    } catch (e) {
      console.error("Failed to bootstrap full-stack database states:", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync state changes on dynamic Firebase Auth triggers
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      bootstrapState();
    });
    return () => unsubscribe();
  }, [countryFilter, genderFilter]);

  // 2. Fetch financial transaction lists individually when wallet updates
  const refreshTransactionsList = async () => {
    try {
      const fbUser = auth.currentUser;
      if (fbUser) {
        const cachedTx = await listTransactions(fbUser.uid);
        setTransactions(cachedTx);
      } else {
        const txRes = await fetch("/api/transactions");
        const txData = await txRes.json();
        setTransactions(txData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Setup quick personal messenger overlay chatting session
  const startQuickChat = (host: Host) => {
    setChattingHost(host);
    setQuickMessages([
      {
        sender: 'host',
        text: `Hey Aditya! I saw you visiting my grid. Sending you standard warm greetings, are you free to chat right now? 😊`
      }
    ]);
  };

  const handleSendQuickChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !chattingHost || quickAiResponding) return;

    const userMsgText = quickInput.trim();
    setQuickMessages((prev) => [...prev, { sender: 'user', text: userMsgText }]);
    setQuickInput("");
    setQuickAiResponding(true);

    try {
      const response = await fetch("/api/gemini/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: chattingHost.name,
          hostCountry: chattingHost.country,
          hostBio: chattingHost.bio,
          userMessage: userMsgText,
          conversationHistory: quickMessages
        })
      });

      const resData = await response.json();
      if (resData.reply) {
        setQuickMessages((prev) => [...prev, { 
          sender: 'host', 
          text: `${resData.action || ''} ${resData.reply} (${resData.translation ? 'IN: ' + resData.translation : ''})` 
        }]);
      }
    } catch (err) {
      console.error(err);
      setQuickMessages((prev) => [...prev, { 
        sender: 'host', 
        text: `I'm currently streaming active multi guests right now! Call my room so we can speak privately! 💖` 
      }]);
    } finally {
      setQuickAiResponding(false);
    }
  };

  // 4. Report Host Incident Flow
  const submitAbuseReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingHost || !reportReason.trim()) return;

    try {
      const response = await fetch("/api/reports/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: reportingHost.id,
          hostName: reportingHost.name,
          reason: reportReason.trim()
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setReportSuccess(true);
        setReportReason("");
        setTimeout(() => {
          setReportingHost(null);
          setReportSuccess(false);
        }, 2200);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWalletUpdated = async (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    const fbUser = auth.currentUser;
    if (fbUser) {
      try {
        await saveUserProfile(fbUser.uid, newProfile);
      } catch (err) {
        console.error("Failed to persist wallet update to Firestore:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 font-sans text-gray-200 selection:bg-gold-500 selection:text-obsidian-950 flex flex-col justify-between">
      
      {/* Dynamic Full Screen active 1-on-1 video call overlay takes priority */}
      {activeCallHost && userProfile && (
        <div className="fixed inset-0 z-50 bg-obsidian-950 p-4 md:p-6 flex flex-col justify-center animate-fadeIn">
          <VideoCall
            host={activeCallHost}
            onEndCall={() => {
              setActiveCallHost(null);
              bootstrapState(); // refresh profiles coins
            }}
            userCoins={userProfile.coins}
            onCoinsUpdated={(newCoins) => {
              const updated = userProfile ? { ...userProfile, coins: newCoins } : null;
              if (updated) handleWalletUpdated(updated);
            }}
            onAddTransaction={refreshTransactionsList}
          />
        </div>
      )}

      {/* TOP: Luxury Header Bar */}
      <header className="sticky top-0 bg-obsidian-950/95 backdrop-blur-md border-b border-obsidian-850 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* Logo and Premium identity statement */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gold-metallic-bg flex items-center justify-center shadow-md shadow-gold-500/20 group cursor-pointer">
            <span className="font-display font-black text-2xl text-obsidian-950 tracking-tighter select-none">X</span>
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-white tracking-tight flex items-center gap-1 leading-none select-none">
              XChat <span className="gold-gradient-text text-sm font-extrabold uppercase ml-1">PREMIUM</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-wider">SECURE LIVE P2P PLATFORM</p>
          </div>
        </div>

        {/* Global tab navigation switches */}
        <nav className="hidden md:flex bg-obsidian-900 border border-obsidian-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('lobby')}
            id="nav-tab-lobby"
            className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'lobby'
                ? "bg-gold-600 text-obsidian-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔥 Live Portal
          </button>
          
          <button
            onClick={() => setActiveTab('match')}
            id="nav-tab-match"
            className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'match'
                ? "bg-gold-600 text-obsidian-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🧭 Smart Matcher
          </button>

          <button
            onClick={() => setActiveTab('google')}
            id="nav-tab-google"
            className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'google'
                ? "bg-rose-600 text-white font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            💼 Workspace
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            id="nav-tab-wallet"
            className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'wallet'
                ? "bg-gold-600 text-obsidian-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            💰 Wallet & VIP
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            id="nav-tab-admin"
            className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? "bg-gold-600 text-obsidian-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🛡️ Admin Panel
          </button>
        </nav>

        {/* USER PROFILE STATUS QUICK CHECKS */}
        {userProfile ? (
          <div className="flex items-center gap-4">
            
            {/* Wallet Quick Balance Display */}
            <div 
              onClick={() => setActiveTab('wallet')}
              id="header-coins-trigger"
              className="px-3.5 py-1.5 rounded-full bg-obsidian-900 border border-gold-500/25 cursor-pointer hover:border-gold-400 transition flex items-center gap-2 select-none"
              title="Top up wallet"
            >
              <Coins className="w-4 h-4 text-gold-400 fill-gold-500" />
              <span className="text-white text-xs font-mono font-bold">{userProfile.coins.toLocaleString()}</span>
              <span className="text-[10px] text-gold-400 font-display font-semibold uppercase">Coins</span>
            </div>

            {/* Profile Avatar Badge with level */}
            <div className="flex items-center gap-2 text-right">
              <div className="hidden sm:block leading-none">
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-white font-semibold text-xs font-display">{userProfile.name}</span>
                  {userProfile.vip && (
                    <span className="vip-border-anim text-[8px] text-obsidian-950 font-display font-extrabold px-1 rounded uppercase">VIP</span>
                  )}
                </div>
                <span className="text-[9.5px] text-gray-500 font-mono">Verified Level {userProfile.level}</span>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden border border-gold-500/30">
                <img src={userProfile.avatar} alt="Me" className="w-[100%] h-[100%] object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>

          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching session profiles...
          </div>
        )}

      </header>

      {/* MOBILE LOWER NAVIGATION BAR */}
      <div className="md:hidden sticky top-[72px] bg-obsidian-900 border-b border-obsidian-800 p-2 z-40 flex justify-around">
        <button
          onClick={() => setActiveTab('lobby')}
          className={`px-2 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'lobby' ? 'bg-gold-600 text-obsidian-950' : 'text-gray-400'}`}
        >
          🔥 Lobby
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`px-2 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'match' ? 'bg-gold-600 text-obsidian-950' : 'text-gray-400'}`}
        >
          🧭 Match
        </button>
        <button
          onClick={() => setActiveTab('google')}
          className={`px-2 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'google' ? 'bg-rose-600 text-white' : 'text-gray-400'}`}
        >
          💼 Workspace
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`px-2 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'wallet' ? 'bg-gold-600 text-obsidian-950' : 'text-gray-400'}`}
        >
          💰 Wallet
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-2 py-1.5 text-xs font-bold rounded-lg ${activeTab === 'admin' ? 'bg-gold-600 text-obsidian-950' : 'text-gray-400'}`}
        >
          🛡️ Admin
        </button>
      </div>

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        
        {/* LOBBY / LIVE CHAT HOST PORTAL */}
        {activeTab === 'lobby' && (
          <div className="space-y-6">
            
            {/* Filters Row */}
            <div className="bg-obsidian-900 border border-obsidian-850 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gold-400" />
                <span className="text-white text-xs font-display font-semibold uppercase tracking-wide">
                  Explore Active Lobbies / Filter Host aktif
                </span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Gender filter dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Gender:</span>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    id="filter-host-gender"
                    className="bg-obsidian-950 border border-obsidian-750 p-1.5 py-1 text-white text-xs rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">All Genders</option>
                    <option value="Female">Female Profiles</option>
                    <option value="Male">Male Profiles</option>
                  </select>
                </div>

                {/* Country filter dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Negara:</span>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    id="filter-host-country"
                    className="bg-obsidian-950 border border-obsidian-750 p-1.5 py-1 text-white text-xs rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">Worldwide Countries</option>
                    <option value="South Korea">🇰🇷 South Korea</option>
                    <option value="Brazil">🇧🇷 Brazil</option>
                    <option value="France">🇫🇷 France</option>
                    <option value="Japan">🇯🇵 Japan</option>
                    <option value="United States">🇺🇸 USA</option>
                    <option value="UAE">🇦🇪 UAE</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Welcome Jumbotron */}
            <div className="bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border-x border-gold-500/10 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  <span className="text-gold-300 font-display font-semibold text-xs tracking-wider uppercase">Chamet Premium Redefined</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
                  1-on-1 Priority Live Connections
                </h2>
                <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                  Join direct face-to-face dialogues instantly. Features automatic AI translators supporting Indonesian captions dynamically. Tap "Call" to occupy a host's videostream.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('match')}
                id="jumbotron-match-trigger"
                className="py-3 px-6 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-gold-600 text-obsidian-950 hover:bg-gold-500 hover:scale-[1.02] transition-all duration-200 shrink-0 shadow-lg shadow-gold-500/15"
              >
                ⚡ Start Instant AI Matching
              </button>
            </div>

            {/* Grid list of active hosts */}
            {loading ? (
              <div className="text-center py-20">
                <RefreshCw className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-4" />
                <p className="text-xs text-gray-500 font-mono font-bold">Scanning priority node matrix networks...</p>
              </div>
            ) : hostsList.length === 0 ? (
              <div className="text-center py-16 bg-obsidian-900/40 border border-obsidian-850 rounded-2xl">
                <span className="text-3xl mb-2 block">🌍</span>
                <p className="text-xs text-gray-400 font-semibold uppercase">No matching active hosts logged in this area.</p>
                <p className="text-[11px] text-gray-500 mt-1">Try resetting your country or gender filter flags.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {hostsList.map((host) => (
                  <HostCard
                    key={host.id}
                    host={host}
                    onCall={(h) => setActiveCallHost(h)}
                    onChat={(h) => startQuickChat(h)}
                    onReport={(h) => setReportingHost(h)}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* MATCHMAKING ARENA TAB */}
        {activeTab === 'match' && (
          <Lounge 
            hosts={hostsList}
            onMatched={(matchedHost) => {
              setActiveCallHost(matchedHost);
            }} 
          />
        )}

        {/* FINANCIAL WALLET RECHARGE TAB */}
        {activeTab === 'wallet' && userProfile && (
          <Wallet
            profile={userProfile}
            transactionsList={transactions}
            onWalletUpdated={handleWalletUpdated}
            onRefreshTransactions={refreshTransactionsList}
          />
        )}

        {/* PLATFORM ADMIN CONFIG DECK */}
        {activeTab === 'admin' && (
          <AdminPanel 
            onRefreshTransactions={refreshTransactionsList}
          />
        )}

        {/* GOOGLE WORKSPACE COGNITIVE SYNC PANEL */}
        {activeTab === 'google' && (
          <GoogleWorkspace />
        )}

      </main>

      {/* QUICK INBOX MESSENGER DRAWER OVERLAY */}
      {chattingHost && (
        <div className="fixed bottom-0 right-4 md:right-12 z-40 w-full max-w-[340px] bg-obsidian-900/98 border-t border-x border-gold-500/30 rounded-t-2xl shadow-2xl flex flex-col h-[420px] transition-all animate-fadeIn">
          
          {/* Box Header */}
          <div className="p-3 bg-obsidian-950 flex items-center justify-between rounded-t-xl border-b border-obsidian-850">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-gold-500/20">
                <img src={chattingHost.avatar} alt="host" className="w-[100%] h-[100%] object-cover object-center" referrerPolicy="no-referrer" />
              </div>
              <div>
                <span className="font-display font-bold text-white text-xs block leading-none">{chattingHost.name}</span>
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Direct Chat
                </span>
              </div>
            </div>

            <button 
              onClick={() => setChattingHost(null)}
              id="btn-close-quick-chat"
              className="text-gray-400 hover:text-red-400 text-xs font-bold font-mono px-1.5"
            >
              ✕
            </button>
          </div>

          {/* Quick dialogue streams */}
          <div className="flex-grow p-3 overflow-y-auto space-y-2.5 h-[280px]">
            {quickMessages.map((msg, idx) => {
              const isHost = msg.sender === 'host';
              return (
                <div key={idx} className={`max-w-[85%] p-2 rounded-xl text-xs leading-relaxed ${
                  isHost 
                    ? "bg-obsidian-950 text-white rounded-tl-none border border-obsidian-850 mr-auto" 
                    : "bg-gold-600 text-obsidian-950 rounded-tr-none font-medium ml-auto"
                }`}>
                  {msg.text}
                </div>
              );
            })}
            
            {quickAiResponding && (
              <span className="text-[10px] text-gray-500 font-mono italic block text-center">
                ⏳ {chattingHost.name} is typing response...
              </span>
            )}
          </div>

          {/* Input block */}
          <form onSubmit={handleSendQuickChat} className="p-3 bg-obsidian-950 border-t border-obsidian-850 flex gap-1.5 items-center">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              disabled={quickAiResponding}
              placeholder="Type chat text..."
              id="input-quick-chat-text"
              className="flex-grow py-1.5 px-3 rounded-lg bg-obsidian-900 border border-obsidian-800 text-white text-xs outline-none focus:ring-1 focus:ring-gold-500"
            />
            <button
              type="submit"
              id="btn-quick-chat-submit"
              disabled={!quickInput.trim() || quickAiResponding}
              className="p-1.5 rounded-lg bg-gold-600 text-obsidian-950 hover:bg-gold-500 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* REPORT CONFLICT MODAL */}
      {reportingHost && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-obsidian-900 border border-obsidian-750 rounded-2xl p-6 max-w-md w-full relative animate-scaleIn">
            
            <button
              onClick={() => setReportingHost(null)}
              id="btn-close-report-modal"
              className="absolute top-4 right-4 text-gray-500 hover:text-white font-mono text-base font-bold"
            >
              ✕
            </button>

            {reportSuccess ? (
              <div className="text-center py-6 space-y-2">
                <span className="text-4xl">🛡️</span>
                <h4 className="text-emerald-400 font-display font-bold text-lg">Report Filed Successfully</h4>
                <p className="text-xs text-gray-400">
                  Our central auto compliance system is reviewing the logs of {reportingHost.name}.
                </p>
              </div>
            ) : (
              <form onSubmit={submitAbuseReport} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-obsidian-800 pb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-display font-bold text-white uppercase">
                    Report Incident: {reportingHost.name}
                  </h3>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Help XChat remain premium and secure. Flag inappropriate behaviors, mock streams, or latency incidents instantly.
                </p>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1.5">
                    Description of infraction / Alasan Laporan
                  </label>
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    required
                    placeholder="Provide specific details about your conflict..."
                    id="input-report-reason"
                    className="w-full p-2.5 rounded-xl bg-obsidian-950 border border-obsidian-850 text-white text-xs outline-none focus:ring-1 focus:ring-red-400 resize-none font-sans"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingHost(null)}
                    id="btn-report-cancel"
                    className="px-4 py-2 rounded-lg text-xs bg-obsidian-800 text-gray-400 hover:bg-obsidian-750 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-report-submit"
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-red-650 text-white hover:bg-red-500 transition"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* FOOTER METADATA STATEMENT */}
      <footer className="bg-obsidian-950 border-t border-obsidian-900 py-6 text-center select-none">
        <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
          XCHAT © 2026 // COMPLIANT SECURE PEER-TO-PEER VIDEO SYNC ENGINE
        </p>
        <p className="text-[9.5px] text-gold-400/50 uppercase mt-0.5 tracking-wider">
          Crafted with Extreme Luxury Design Pairings | AI Verification Verified
        </p>
      </footer>

    </div>
  );
}
