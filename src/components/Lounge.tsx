import React, { useState, useEffect } from "react";
import { Host } from "../types";
import { Sparkles, Globe, Compass, RefreshCw, Smartphone } from "lucide-react";

interface LoungeProps {
  onMatched: (host: Host) => void;
  hosts: Host[];
}

export default function Lounge({ onMatched, hosts }: LoungeProps) {
  const [matching, setMatching] = useState(false);
  const [matchStep, setMatchStep] = useState("");
  const [selectedGender, setSelectedGender] = useState<'All' | 'Female' | 'Male'>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');

  // Realistic list of search steps
  const steps = [
    "Establishing high-speed premium channel...",
    "Scanning worldwide live hosts...",
    "Verifying translation handshakes...",
    "Applying gender & location protocols...",
    "Handshaking peer-to-peer WebRTC link...",
    "Optimizing real-time video pipeline...",
    "VIP Priority Channel Secured! Connecting..."
  ];

  const uniqueCountries = Array.from(new Set(hosts.map(h => h.country)));

  const startMatch = async () => {
    setMatching(true);
    let stepIndex = 0;
    setMatchStep(steps[0]);

    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setMatchStep(steps[stepIndex]);
      } else {
        clearInterval(interval);
      }
    }, 700);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genderPreference: selectedGender,
          countryPreference: selectedCountry
        })
      });

      const resData = await response.json();
      
      // Artificial delay to make search process satisfying
      setTimeout(() => {
        clearInterval(interval);
        setMatching(false);
        if (resData.success && resData.host) {
          onMatched(resData.host);
        } else {
          // fallback to a random online host
          const onlineHosts = hosts.filter(h => h.online);
          if (onlineHosts.length > 0) {
            onMatched(onlineHosts[Math.floor(Math.random() * onlineHosts.length)]);
          }
        }
      }, 3500);

    } catch (e) {
      console.error(e);
      setTimeout(() => {
        clearInterval(interval);
        setMatching(false);
        const onlineHosts = hosts.filter(h => h.online);
        if (onlineHosts.length > 0) {
          onMatched(onlineHosts[Math.floor(Math.random() * onlineHosts.length)]);
        }
      }, 2000);
    }
  };

  return (
    <div className="bg-obsidian-800/60 border border-obsidian-750 p-6 md:p-8 rounded-3xl backdrop-blur-md max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center min-h-[480px] shadow-xl">
      
      {/* Left controls panel */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <span className="text-gold-400 font-display font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 mb-1 bg-gold-950/40 w-fit px-3 py-1 rounded-full border border-gold-800/30">
            <Sparkles className="w-3.5 h-3.5" /> High-Speed Matchmaker
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
            XChat AI Matching Portal
          </h2>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            Specify your preferences to engage in priority 1-on-1 premium video channels with verified hosts. Our translation matrix automatically processes multilingual streams.
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4 pt-2 border-t border-obsidian-700/60">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              Preferred Gender / Preferensi Gender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['All', 'Female', 'Male'] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  id={`btn-pref-gender-${gender}`}
                  onClick={() => setSelectedGender(gender)}
                  disabled={matching}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                    selectedGender === gender
                      ? "bg-gold-600 text-obsidian-950 border-gold-500 font-bold"
                      : "bg-obsidian-900 text-gray-300 border-obsidian-750 hover:bg-obsidian-750"
                  }`}
                >
                  {gender === "All" ? "🌍 All Gender" : gender === "Female" ? "♀️ Female" : "♂️ Male"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              Preferred Country / Preferensi Negara
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="btn-pref-country-all"
                onClick={() => setSelectedCountry('All')}
                disabled={matching}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                  selectedCountry === 'All'
                    ? "bg-gold-600 text-obsidian-950 border-gold-500 font-bold"
                    : "bg-obsidian-900 text-gray-300 border-obsidian-750 hover:bg-obsidian-750"
                }`}
              >
                🌐 Global Match
              </button>
              {uniqueCountries.map((country) => (
                <button
                  key={country}
                  type="button"
                  id={`btn-pref-country-${country}`}
                  onClick={() => setSelectedCountry(country)}
                  disabled={matching}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                    selectedCountry === country
                      ? "bg-gold-600 text-obsidian-950 border-gold-500 font-bold"
                      : "bg-obsidian-900 text-gray-300 border-obsidian-750 hover:bg-obsidian-750"
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Call Trigger */}
        <div className="pt-4">
          <button
            onClick={startMatch}
            disabled={matching}
            id="btn-start-matching"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-display font-extrabold text-base tracking-wide uppercase transition-all duration-300 shadow-lg shadow-gold-600/20 bg-gold-600 text-obsidian-950 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {matching ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Matching in Progress...
              </>
            ) : (
              <>
                <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" /> Start AI Matchmaking
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right animation panel */}
      <div className="w-full md:w-[320px] flex flex-col items-center justify-center p-6 bg-obsidian-950/60 rounded-3xl border border-obsidian-700/40 relative min-h-[340px]">
        
        {/* Glowing Radar Background */}
        <div className="relative w-52 h-52 flex items-center justify-center rounded-full border border-gold-500/10">
          
          {/* Radar Pulses */}
          <div className={`absolute inset-0 rounded-full border border-gold-500/20 ${matching ? 'animate-ping duration-1000' : ''}`}></div>
          <div className={`absolute inset-4 rounded-full border border-gold-500/15 ${matching ? 'animate-ping duration-1000 delay-300' : ''}`}></div>
          <div className={`absolute inset-10 rounded-full border border-gold-400/20 ${matching ? 'animate-ping duration-1000 delay-500' : ''}`}></div>
          
          {/* Sweeper Dial for visual state */}
          <div className={`absolute inset-0 rounded-full bg-transparent ${matching ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }}>
            <div className="absolute top-0 left-1/2 -ml-1 w-1 h-26 bg-gradient-to-b from-gold-400 to-transparent origin-bottom rounded"></div>
          </div>

          {/* Central Matchmaking Core */}
          <div className="relative z-10 w-24 h-24 rounded-full bg-obsidian-900 border-2 border-gold-500/40 flex flex-col items-center justify-center p-3 text-center shadow-lg shadow-gold-500/10 hover:border-gold-400">
            <Smartphone className="w-8 h-8 text-gold-400 animate-bounce mb-1" />
            <span className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-widest">
              {matching ? "SCANNING" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Live Search Console Output */}
        <div className="mt-6 w-full text-center">
          <p className="text-xs font-mono min-h-[40px] text-gold-300/90 leading-relaxed px-4 break-words">
            {matching ? matchStep : "~ Ready to link client-camera streams ~"}
          </p>
          <div className="flex justify-center gap-1.5 mt-3 items-center">
            <span className={`block w-2 h-2 rounded-full ${matching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="text-[10px] text-gray-500 font-mono font-bold">
              {matching ? "ACTIVE TUNNEL ENCRYPTED" : "ENCRYPTION ACTIVE // SECURE"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
