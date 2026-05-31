import React, { useState, useEffect } from "react";
import { ReportItem } from "../types";
import { ShieldAlert, BarChart3, Users, Landmark, CheckCircle, XCircle, RefreshCw, Eye, EyeOff } from "lucide-react";

interface AdminPanelProps {
  onRefreshTransactions: () => void;
}

export default function AdminPanel({ onRefreshTransactions }: AdminPanelProps) {
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState({
    totalCoinTransactions: 0,
    totalCoinRevenueUSD: 0,
    pendingKYCVers: 0,
    flaggedAccounts: 0,
  });
  const [loading, setLoading] = useState(false);
  const [aiModerationEnabled, setAiModEnabled] = useState(true);
  const [antiSpamActive, setAntiSpamActive] = useState(true);

  const fetchReportsAndStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reports");
      const data = await response.json();
      if (data) {
        setReportsList(data.reports || []);
        setStats(data.stats || {
          totalCoinTransactions: 549300,
          totalCoinRevenueUSD: 5493.00,
          pendingKYCVers: 12,
          flaggedAccounts: 3,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndStats();
  }, []);

  const handleResolveReport = async (reportId: string, action: 'Reviewed' | 'Dismissed') => {
    try {
      const response = await fetch("/api/reports/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action })
      });
      const data = await response.json();
      if (data.success) {
        // Refresh values locally
        fetchReportsAndStats();
        onRefreshTransactions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Admin header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-obsidian-750">
        <div>
          <span className="text-gold-400 font-display font-bold text-xs uppercase tracking-widest bg-gold-950/40 border border-gold-800/10 px-3 py-1 rounded-full">
            SYSTEM ROOT / KONTROL PANEL
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight mt-1.5">
            XChat Central Admin Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Realtime analytics ledger tracking, verified agency KYC processing checks, content moderation triggers, and report audits.
          </p>
        </div>

        <button
          onClick={fetchReportsAndStats}
          disabled={loading}
          id="btn-admin-refresh"
          className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold bg-obsidian-800 text-gray-200 border border-obsidian-700 hover:bg-obsidian-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Admin Nodes
        </button>
      </div>

      {/* 1. Quad Stat Cards Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric box 1 */}
        <div className="bg-obsidian-800/40 border border-obsidian-750 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">Estimated Coin Circulation</span>
            <BarChart3 className="w-5 h-5 text-gold-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-white block">
            🪙 {stats.totalCoinTransactions.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500 mt-1 block">Accumulated gross interactions</span>
        </div>

        {/* Metric box 2 */}
        <div className="bg-obsidian-800/40 border border-obsidian-750 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">Gross Platform Revenue</span>
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-emerald-400 block mb-0.5">
            $ {stats.totalCoinRevenueUSD.toFixed(2)}
          </span>
          <span className="text-[10px] text-gray-500 block">Calculated ledger subscriptions</span>
        </div>

        {/* Metric box 3 */}
        <div className="bg-obsidian-800/40 border border-obsidian-750 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">Pending KYC Audits</span>
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-violet-400 block">
            {stats.pendingKYCVers} Verified
          </span>
          <span className="text-[10px] text-gray-500 mt-1 block">Hosts seeking verification status</span>
        </div>

        {/* Metric box 4 */}
        <div className="bg-obsidian-800/40 border border-obsidian-750 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">Restricted Node Accounts</span>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <span className="text-2xl font-mono font-bold text-red-400 block">
            {stats.flaggedAccounts} Flagged
          </span>
          <span className="text-[10px] text-gray-500 mt-1 block">Blocked device footprints</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 2. Left Side: Active user abuse reports moderator list (8 Cols) */}
        <div className="lg:col-span-8 bg-obsidian-800/50 border border-obsidian-750 p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-base font-display font-extrabold text-white uppercase tracking-wide">
              Priority Moderation Incidents Ledger
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Review and act on automatic and peer-reported compliance reports.
            </p>
          </div>

          <div className="space-y-4">
            {reportsList.length === 0 ? (
              <div className="text-center py-10 rounded-xl bg-obsidian-900/60 border border-obsidian-800 text-xs text-gray-500">
                ⭐ Compliance pristine. No active moderator incidents pending manual review.
              </div>
            ) : (
              reportsList.map((rep) => (
                <div 
                  key={rep.id} 
                  className="bg-obsidian-900 border border-obsidian-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-display">Target Host: {rep.reportedHostName}</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        rep.status === 'Pending' 
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20'
                          : rep.status === 'Reviewed'
                          ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 italic">Report query reasoning: "{rep.reason}"</p>
                    <span className="text-[9px] text-gray-500 block font-mono">Date Filed: {new Date(rep.timestamp).toLocaleString()}</span>
                  </div>

                  {rep.status === 'Pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, 'Reviewed')}
                        id={`btn-admin-report-approve-${rep.id}`}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold bg-emerald-600 font-display text-obsidian-950 hover:bg-emerald-500 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Infraction Review
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'Dismissed')}
                        id={`btn-admin-report-dismiss-${rep.id}`}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold bg-obsidian-850 border border-obsidian-750 text-gray-300 hover:bg-obsidian-750 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-gray-400" /> Dismiss Request
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Right Side: Compliance togglers and system state adjustments */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-obsidian-800/50 border border-obsidian-750 p-5 rounded-2xl space-y-5">
            <div>
              <h3 className="text-xs font-display font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-obsidian-750">
                🛡️ Moderation Configurations
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Configure active safeguards.</p>
            </div>

            {/* Config Item 1 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-800">
              <div>
                <span className="text-xs font-bold text-white block">Real-time AI Moderation</span>
                <span className="text-[10px] text-gray-400 block">Auto flagged speech filter</span>
              </div>
              <button
                onClick={() => setAiModEnabled(!aiModerationEnabled)}
                id="btn-toggle-ai-mod"
                className={`py-1.5 px-3.5 rounded-lg text-[10px] font-bold tracking-wide uppercase border transition-all ${
                  aiModerationEnabled
                    ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                    : "bg-obsidian-950 border-obsidian-750 text-gray-500"
                }`}
              >
                {aiModerationEnabled ? "Active" : "Disabled"}
              </button>
            </div>

            {/* Config Item 2 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-obsidian-900 border border-obsidian-800">
              <div>
                <span className="text-xs font-bold text-white block">Anti-Spam OTP Guard</span>
                <span className="text-[10px] text-gray-400 block">Throttles rapid calling attempts</span>
              </div>
              <button
                onClick={() => setAntiSpamActive(!antiSpamActive)}
                id="btn-toggle-antispam"
                className={`py-1.5 px-3.5 rounded-lg text-[10px] font-bold tracking-wide uppercase border transition-all ${
                  antiSpamActive
                    ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                    : "bg-obsidian-950 border-obsidian-750 text-gray-500"
                }`}
              >
                {antiSpamActive ? "Active" : "Disabled"}
              </button>
            </div>

            {/* Visual KYC Verification guidelines logs */}
            <div className="p-3.5 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-1">
              <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest block font-mono">KYC Verification standard</span>
              <p className="text-[10px] text-gray-400 leading-relaxed leading-relaxed italic pr-2">
                "Hosts must supply face-scans mapped against matching physical IDs. Platform AI verifies symmetry thresholds automatically before enabling profile ratings."
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
