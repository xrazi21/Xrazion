import React from "react";
import { Host } from "../types";
import { Phone, Star, ShieldCheck, Heart, Trophy, Award, Crown, Sparkles } from "lucide-react";

interface HostCardProps {
  key?: string | number;
  host: Host;
  onCall: (host: Host) => void;
  onChat: (host: Host) => void;
  onReport: (host: Host) => void;
}

export default function HostCard({ host, onCall, onChat, onReport }: HostCardProps) {
  // Compute Tier styling dynamically based on host level
  const getHostTier = (level: number) => {
    if (level < 20) {
      return {
        name: "Bronze Class",
        borderClass: "border-amber-700/30 hover:border-amber-500/70 hover:shadow-[0_0_15px_rgba(217,119,6,0.15)]",
        badgeBg: "bg-amber-950/90 text-amber-300 border-amber-655/40",
        textClass: "text-amber-500",
        bgGradient: "from-amber-950/5 to-transparent",
        icon: <Trophy className="w-3.5 h-3.5 text-amber-500" />,
      };
    } else if (level < 30) {
      return {
        name: "Silver Prestige",
        borderClass: "border-slate-500/30 hover:border-slate-350 hover:shadow-[0_0_15px_rgba(203,213,225,0.15)]",
        badgeBg: "bg-slate-900/90 text-slate-300 border-slate-500/35",
        textClass: "text-slate-400",
        bgGradient: "from-slate-900/5 to-transparent",
        icon: <Award className="w-3.5 h-3.5 text-slate-300" />,
      };
    } else if (level < 40) {
      return {
        name: "Gold Imperial",
        borderClass: "border-yellow-600/30 hover:border-yellow-500 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]",
        badgeBg: "bg-yellow-950/90 text-yellow-300 border-yellow-500/40",
        textClass: "text-yellow-500 font-bold",
        bgGradient: "from-yellow-950/5 to-transparent",
        icon: <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/15" />,
      };
    } else {
      return {
        name: "Platinum Elite",
        borderClass: "border-rose-500/35 hover:border-rose-450 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]",
        badgeBg: "vip-border-anim text-white border-rose-400/40 shadow-rose-950/40",
        textClass: "gold-gradient-text font-black",
        bgGradient: "from-rose-950/10 via-transparent to-indigo-950/5",
        icon: <Sparkles className="w-3.5 h-3.5 text-rose-300 fill-rose-300/15" />,
      };
    }
  };

  const tier = getHostTier(host.level);

  return (
    <div className={`relative group overflow-hidden rounded-2xl bg-obsidian-800/80 border ${tier.borderClass} transition-all duration-300 backdrop-blur-md flex flex-col justify-between h-[400px] shadow-sm`}>
      
      {/* Premium Badge Overlay */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className={`flex items-center gap-1.5 text-[10px] font-display font-semibold px-2.5 py-1 rounded-full border ${tier.badgeBg} backdrop-blur-md shadow-lg`}>
          {tier.icon}
          <span>Lv.{host.level}</span>
        </span>
        <span className="flex items-center gap-1 text-[10px] bg-black/70 text-white px-2 py-1 rounded-full border border-white/10 shadow-lg select-none backdrop-blur-md">
          <span>{host.countryFlag}</span>
          <span className="hidden sm:inline">{host.city}</span>
        </span>
      </div>

      {/* Online indicator */}
      <div className="absolute top-3 right-3 z-10">
        <span className="flex h-2.5 w-2.5 relative">
          {host.online && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${host.online ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
        </span>
      </div>

      {/* Image header with hover zoom */}
      <div className="relative w-full h-[210px] overflow-hidden bg-obsidian-900">
        <img 
          src={host.avatar} 
          alt={host.name} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-500"
          referrerPolicy="no-referrer"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-800 via-transparent to-transparent opacity-95"></div>
        
        {/* Dynamic Rate Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-obsidian-950/80 px-2.5 py-1 rounded-lg border border-gold-500/30 backdrop-blur-md">
          <span className="text-gold-400 text-xs font-mono font-bold">💎 {host.hourlyRate}</span>
          <span className="text-[10px] text-gray-400">/min</span>
        </div>

        {/* Level & Rating */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded text-xs select-none backdrop-blur-md border border-white/5">
          <Star className="w-3 select-none h-3 text-gold-400 fill-gold-400" />
          <span className="text-gray-200 font-bold font-mono">{host.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Body content with dynamic background gradients driven by Level Tier */}
      <div className={`p-4 flex flex-col justify-between flex-grow bg-gradient-to-br ${tier.bgGradient}`}>
        <div>
          <div className="flex items-center gap-1.5 mb-1 justify-between">
            <div className="flex flex-col">
              <span className={`text-[9px] font-display font-extrabold tracking-widest uppercase leading-none pb-1 ${tier.textClass}`}>
                {tier.name}
              </span>
              <h3 className="font-display font-bold text-white tracking-wide text-base group-hover:text-gold-400 transition-colors leading-tight">
                {host.name}
              </h3>
            </div>
            <span className="text-[10px] text-gray-500 flex items-center gap-1 select-none font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-300" /> Verified
            </span>
          </div>
          
          <p className="text-xs text-gray-400 line-clamp-2 min-h-[32px] leading-relaxed italic mt-0.5">
            "{host.bio}"
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 my-2">
          {host.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-[10px] bg-obsidian-700/40 text-gold-200/80 px-2.5 py-0.5 rounded-full border border-obsidian-600/30">
              #{tag}
            </span>
          ))}
        </div>

        {/* Actions bar */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-obsidian-750">
          <button 
            onClick={() => onCall(host)}
            id={`btn-call-${host.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-display font-bold bg-gold-600 text-obsidian-950 hover:bg-gold-500 transition-all duration-200 shadow-lg shadow-gold-600/10"
          >
            <Phone className="w-3.5 h-3.5 fill-current" /> Call Host
          </button>
          
          <button 
            onClick={() => onChat(host)}
            id={`btn-chat-${host.id}`}
            className="px-3 py-1.5 rounded-lg text-xs bg-obsidian-700/70 text-gray-200 border border-obsidian-600 hover:bg-obsidian-600 transition-colors"
            title="Send chat"
          >
            Chat
          </button>
          
          <button 
            onClick={() => onReport(host)}
            id={`btn-report-${host.id}`}
            className="px-2 py-1.5 rounded-lg text-xs bg-transparent text-gray-500 hover:text-red-400 transition-colors hover:bg-red-500/10"
            title="Report abuse"
          >
            ⚠️
          </button>
        </div>
      </div>
    </div>
  );
}
