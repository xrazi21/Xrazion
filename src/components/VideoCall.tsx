import React, { useState, useEffect, useRef } from "react";
import { Host, Gift, GiftId } from "../types";
import { GIFTS } from "../../server"; // We can redefine here to avoid strict circular resolution, or import locally
import {
  PhoneOff, Mic, MicOff, Video, VideoOff, Send, Sparkles, Languages,
  GiftIcon, TrendingUp, Award, Coins, Compass, RotateCcw, AlertTriangle
} from "lucide-react";

// Local definition of gifts to prevent compiler resolutions
const CALL_GIFTS: Gift[] = [
  { id: "rose", name: "Red Rose", price: 10, emoji: "🌹", luxuryFactor: 1, animationClass: "gift-fly-effect" },
  { id: "perfume", name: "Premium Perfume", price: 99, emoji: "🧪", luxuryFactor: 2, animationClass: "gift-fly-effect" },
  { id: "sports_car", name: "F1 Sports Car", price: 499, emoji: "🏎️", luxuryFactor: 4, animationClass: "gift-fly-effect" },
  { id: "ring", name: "Promise Ring", price: 999, emoji: "💍", luxuryFactor: 4, animationClass: "gift-fly-effect" },
  { id: "crown", name: "Obsidian Crown", price: 1999, emoji: "👑", luxuryFactor: 5, animationClass: "gift-fly-effect" },
  { id: "yacht", name: "X-Yacht Cruise", price: 4999, emoji: "🚢", luxuryFactor: 5, animationClass: "gift-fly-effect" }
];

interface VideoCallProps {
  host: Host;
  onEndCall: () => void;
  userCoins: number;
  onCoinsUpdated: (newAmount: number) => void;
  onAddTransaction: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'host' | 'system';
  senderName: string;
  text: string;
  translation?: string;
  action?: string;
}

export default function VideoCall({ host, onEndCall, userCoins, onCoinsUpdated, onAddTransaction }: VideoCallProps) {
  // Video and Call Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [useTranslation, setUseTranslation] = useState(true);
  
  // Media Stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Chat/AI Communication
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiIsResponding, setAiIsResponding] = useState(false);

  // Active floating gift animation registry
  const [flyingGifts, setFlyingGifts] = useState<Array<{ id: string; emoji: string; left: number }>>([]);
  const [showGiftTray, setShowGiftTray] = useState(false);
  const [giftNotification, setGiftNotification] = useState<string | null>(null);

  // Active subtitling captions
  const [currentSub, setCurrentSub] = useState<string | null>(null);
  const [currentTrans, setCurrentTrans] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  // Auto scroll chat list
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Start call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Elapsed Call Time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get user camera stream
  useEffect(() => {
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" },
            audio: false // handle feed within simulated calls
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          setStreamError("Web camera API not supported in this frame environment.");
        }
      } catch (err: any) {
        console.warn("Camera access denied or missing:", err);
        setStreamError("Webcam in-use / disabled by permissions.");
      }
    }

    if (!isVideoOff) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoOff]);

  // Welcome Intro Message
  useEffect(() => {
    const welcomeMsgs: ChatMessage[] = [
      {
        id: "sys_1",
        sender: "system",
        senderName: "System AI",
        text: `🔒 Protected priority bridge. Level ${host.level} matching confirmed with ${host.name}.`
      },
      {
        id: "host_init",
        sender: "host",
        senderName: host.name,
        text: `Hello Adler! Welcome to my private room! Let's have a beautiful conversation. (blows a sweet kiss) 💖`,
        translation: `Halo Adler! Selamat datang di kamar privat ku! Mari mengobrol dengan indah. (meniupkan ciuman manis) 💖`,
        action: "(blows a sweet kiss)"
      }
    ];
    setMessages(welcomeMsgs);
    setCurrentSub("Hello Adler! Welcome to my private room! Let me know if you want us to discuss anything special. 💖");
    setCurrentTrans("Halo Adler! Selamat datang di kamar privat ku! Ada hal spesial yang ingin kamu bicarakan hari ini? 💖");
    setCurrentAction("(blows a sweet kiss)");
  }, [host]);

  // Scroll to bottom of match chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiIsResponding]);

  // Send a virtual text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || aiIsResponding) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      senderName: "Aditya (Me)",
      text: chatInput.trim()
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setAiIsResponding(true);

    try {
      // API request to server-side Gemini
      const response = await fetch("/api/gemini/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: host.name,
          hostCountry: host.country,
          hostBio: host.bio,
          userMessage: userMsg.text,
          conversationHistory: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const resData = await response.json();

      if (resData.reply) {
        const hostMsg: ChatMessage = {
          id: `msg_ai_${Date.now()}`,
          sender: "host",
          senderName: host.name,
          text: resData.reply,
          translation: resData.translation,
          action: resData.action
        };
        setMessages((prev) => [...prev, hostMsg]);
        setCurrentSub(resData.reply);
        setCurrentTrans(resData.translation);
        setCurrentAction(resData.action);
      }
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `msg_f_${Date.now()}`,
        sender: "host",
        senderName: host.name,
        text: "I loved your response! Tell me what you are doing right now.",
        translation: "Saya sangat menyukai jawabanmu! Beritahu aku apa yang sedang kamu lakukan sekarang.",
        action: "(smiles happily across the screen)"
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setCurrentSub(fallbackMsg.text);
      setCurrentTrans(fallbackMsg.translation);
      setCurrentAction(fallbackMsg.action || null);
    } finally {
      setAiIsResponding(false);
    }
  };

  // Run full premium gift purchase & flying animations
  const handleSendGift = async (gift: Gift) => {
    if (userCoins < gift.price) {
      alert(`⚠️ Insufficient coins to send "${gift.emoji} ${gift.name}". Cost: ${gift.price} Coins.`);
      return;
    }

    try {
      const response = await fetch("/api/gift/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: host.id,
          giftId: gift.id
        })
      });

      const resData = await response.json();

      if (resData.success) {
        // Deduct local state cache
        onCoinsUpdated(resData.profile.coins);
        onAddTransaction(); // Refresh ledger logs list

        // Register visual fly emoji
        triggerFlyingGiftEffect(gift.emoji);

        // Notify room
        const sysGiftMsg: ChatMessage = {
          id: `sys_gift_${Date.now()}`,
          sender: "system",
          senderName: "Gift Bot",
          text: `🎁 You gifted "${gift.emoji} ${gift.name}" (💎 Host earned ${resData.earnedDiamonds} Diamonds!)`
        };
        setMessages((prev) => [...prev, sysGiftMsg]);

        setGiftNotification(`You sent Yuna standard "${gift.emoji} ${gift.name}"`);
        setTimeout(() => setGiftNotification(null), 3000);

        // Feed gift to host model interaction!
        // To behave naturally, we prompt Gemini indicating user sent them a precious gift!
        setAiIsResponding(true);
        const autoCommResponse = await fetch("/api/gemini/converse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostName: host.name,
            hostCountry: host.country,
            hostBio: host.bio,
            userMessage: `[System action: User Aditya has sent you a premium virtual gift: "${gift.emoji} ${gift.name}" costing ${gift.price} coins! React with absolute joy, excitement, and appreciation in your voice!]`,
            conversationHistory: messages.map(m => ({ sender: m.sender, text: m.text }))
          })
        });

        const autoCommData = await autoCommResponse.json();
        if (autoCommData.reply) {
          const hostReaction: ChatMessage = {
            id: `msg_ai_react_${Date.now()}`,
            sender: "host",
            senderName: host.name,
            text: autoCommData.reply,
            translation: autoCommData.translation,
            action: autoCommData.action
          };
          setMessages((prev) => [...prev, hostReaction]);
          setCurrentSub(autoCommData.reply);
          setCurrentTrans(autoCommData.translation);
          setCurrentAction(autoCommData.action);
        }
      } else {
        alert(resData.error || "Failed to make gift transaction.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiIsResponding(false);
      setShowGiftTray(false);
    }
  };

  // Spawn visual flow element
  const triggerFlyingGiftEffect = (emoji: string) => {
    const leftOffset = Math.random() * 60 + 20; // 20% to 80% horizontal range
    const id = `gift_fly_${Math.random()}`;
    setFlyingGifts((prev) => [...prev, { id, emoji, left: leftOffset }]);

    // auto clean particles after execution duration
    setTimeout(() => {
      setFlyingGifts((prev) => prev.filter(g => g.id !== id));
    }, 2500);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-[82vh]">
      
      {/* LEFT: Core Video Streaming Canvas / Simulated Phone screen (8 Cols) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-3xl overflow-hidden border border-obsidian-750 bg-obsidian-950 relative h-full">
        
        {/* Call Status Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gold-500/20">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-white text-xs font-mono font-bold tracking-wider">{formatTime(callDuration)}</span>
          <span className="text-gray-400 text-xs">|</span>
          <span className="text-gold-400 text-xs font-semibold uppercase">{host.countryFlag} AI Stream</span>
        </div>

        {/* Live Gift Animation Spawner Arena */}
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {flyingGifts.map((fg) => (
            <div
              key={fg.id}
              className="absolute bottom-20 text-6xl gift-fly-effect select-none"
              style={{ left: `${fg.left}%` }}
            >
              {fg.emoji}
            </div>
          ))}
        </div>

        {/* Gift Banner Notification overlay */}
        {giftNotification && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-gold-600/90 to-amber-600/90 text-obsidian-950 font-display font-extrabold text-xs px-4 py-2 rounded-full border border-gold-200 shadow-lg shadow-gold-500/20 animate-bounce flex items-center gap-1.5 leading-none">
            ⭐ {giftNotification}
          </div>
        )}

        {/* 1. Host Video Canvas (Main background placeholder with aesthetic voice visualizer) */}
        <div className="relative flex-grow flex items-center justify-center bg-gradient-to-b from-obsidian-900 to-obsidian-950 overflow-hidden">
          
          <img 
            src={host.avatar} 
            alt={host.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-35 object-center scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-obsidian-900/60 to-obsidian-950/40 z-10"></div>

          {/* Core UI feedback visual helper */}
          <div className="relative z-20 text-center flex flex-col items-center p-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gold-500/60 shadow-lg mb-4 cursor-pointer relative group">
              <img src={host.avatar} alt="host" className="w-[100%] h-[100%] object-cover object-center" referrerPolicy="no-referrer" />
              {/* Spinning status circle */}
              <div className="absolute inset-0 border-2 border-transparent border-t-gold-400 rounded-full animate-spin"></div>
            </div>
            
            <h2 className="text-xl font-display font-bold text-white mb-1 flex items-center gap-1.5 shadow-sm">
              {host.name} <span className="text-green-400 text-xs animate-pulse">●</span>
            </h2>
            <p className="text-xs text-gold-300 font-semibold uppercase tracking-wider mb-3">
              {host.city}, {host.country}
            </p>

            {/* Audio Wave animation showing activity feedback */}
            {aiIsResponding ? (
              <div className="flex justify-center gap-1.5 h-12 items-end">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 4, 2].map((h, i) => (
                  <span
                    key={i}
                    className="block w-1.5 rounded-full bg-gold-400 animate-pulse"
                    style={{
                      height: `${h * 8}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.6s'
                    }}
                  ></span>
                ))}
              </div>
            ) : (
              <div className="flex justify-center gap-1.5 h-8 items-center text-xs text-gray-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Receiving high-fidelity audio stream</span>
              </div>
            )}
          </div>

          {/* 2. User Video Overlay (Picture-In-Picture container) */}
          <div className="absolute bottom-6 right-6 z-20 w-36 h-48 md:w-44 md:h-56 rounded-2xl overflow-hidden bg-obsidian-900 border-2 border-gold-500/40 shadow-xl shadow-black/80 flex items-center justify-center">
            {isVideoOff ? (
              <div className="text-center p-3 flex flex-col items-center">
                <VideoOff className="w-6 h-6 text-gray-500 mb-1" />
                <span className="text-[10px] text-gray-500 font-mono uppercase">CAM DISABLED</span>
              </div>
            ) : streamError ? (
              <div className="text-center p-3 flex flex-col items-center">
                <div className="text-lg mb-1">🤳</div>
                <span className="text-[9px] text-gray-400 leading-snug font-mono uppercase">{streamError}</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[8.5px] font-mono text-white tracking-widest uppercase">
              USER CAMERA
            </div>
          </div>

          {/* AI TRANSLATION SUBTITLE OVERLAY */}
          <div className="absolute bottom-24 left-6 right-6 md:right-56 z-20 bg-black/75 p-3.5 rounded-2xl border border-gold-500/20 backdrop-blur-md">
            <div className="flex items-center gap-1 text-[10px] font-display font-semibold text-gold-400 uppercase tracking-widest mb-1.5">
              <Languages className="w-3.5 h-3.5" /> Real-time automatic translator
              {currentAction && <span className="text-gray-400 font-mono italic normal-case ml-2">{currentAction}</span>}
            </div>
            
            <p className="text-gray-100 text-sm leading-relaxed font-sans mb-1">
              "{currentSub || 'Waiting for host to speak...'}"
            </p>
            
            {useTranslation && currentTrans && (
              <p className="text-gold-300 text-xs leading-relaxed border-t border-white/5 pt-1 mt-1 italic font-sans flex items-start gap-1">
                <span>[ID]:</span>
                <span>"{currentTrans}"</span>
              </p>
            )}
          </div>
        </div>

        {/* bottom floating media bar */}
        <div className="bg-obsidian-900 p-4 border-t border-obsidian-850 flex items-center justify-between gap-4 z-20">
          <div className="flex gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              id="btn-toggle-mic"
              className={`p-3 rounded-full border transition-all duration-200 ${
                isMuted
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-obsidian-800 border-obsidian-700 text-gray-300 hover:bg-obsidian-750"
              }`}
              title={isMuted ? "Unmute" : "Mute Mic"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              id="btn-toggle-camera"
              className={`p-3 rounded-full border transition-all duration-200 ${
                isVideoOff
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-obsidian-800 border-obsidian-700 text-gray-300 hover:bg-obsidian-750"
              }`}
              title={isVideoOff ? "Turn Cam On" : "Turn Cam Off"}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setUseTranslation(!useTranslation)}
              id="btn-toggle-translation"
              className={`p-3 rounded-full border transition-all duration-200 ${
                useTranslation
                  ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                  : "bg-obsidian-800 border-obsidian-700 text-gray-500 hover:bg-obsidian-750"
              }`}
              title="Toggle Live Translation"
            >
              <Languages className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Gift Icon Toggle */}
          <div>
            <button
              onClick={() => setShowGiftTray(!showGiftTray)}
              id="btn-toggle-gift-tray"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-display font-bold text-xs uppercase tracking-wide transition-all border ${
                showGiftTray 
                  ? "bg-gold-600 text-obsidian-950 border-gold-450" 
                  : "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-400 shadow-md shadow-pink-500/20"
              }`}
            >
              <GiftIcon className="w-4 h-4 fill-current animate-pulse" /> Virtual Gift Tray
            </button>
          </div>

          <div>
            <button
              onClick={onEndCall}
              id="btn-end-call"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors font-display font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-650/20"
            >
              <PhoneOff className="w-4 h-4 fill-current" /> End Call
            </button>
          </div>
        </div>

        {/* 3. Dropdown virtual drawer for gifts */}
        {showGiftTray && (
          <div className="absolute bottom-20 left-4 right-4 z-40 bg-obsidian-900/95 border border-gold-500/25 p-4 rounded-2xl backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-obsidian-750">
              <span className="text-white text-xs font-display font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <GiftIcon className="w-4 h-4 text-pink-400" /> Send Premium Animated Gift
              </span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 bg-obsidian-950 px-2 py-0.5 rounded-full">
                My Wallet: <span className="text-gold-400 font-bold font-mono">🌟 {userCoins.toLocaleString()}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CALL_GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  id={`btn-gift-tray-send-${gift.id}`}
                  className="flex flex-col items-center p-2.5 bg-obsidian-950 rounded-xl border border-obsidian-800 hover:border-gold-500/40 hover:bg-obsidian-800 transition-all duration-200"
                >
                  <span className="text-3xl mb-1 hover:scale-125 transition-transform duration-200">{gift.emoji}</span>
                  <span className="text-[10px] text-white font-medium truncate w-full text-center">{gift.name}</span>
                  <span className="text-[10px] text-gold-400 font-mono font-bold mt-0.5">🌟 {gift.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT: Live Interactive Room Messenger Stream (4 Cols) */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-3xl overflow-hidden border border-obsidian-750 bg-obsidian-900/90 backdrop-blur-sm h-full">
        
        {/* Messenger Header */}
        <div className="bg-obsidian-950/80 p-4 border-b border-obsidian-750 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-white text-xs uppercase tracking-wider">
              En-Route Messenger
            </h3>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Gemini real-time translation active
            </p>
          </div>
          <span className="text-[10px] font-semibold text-gold-400 bg-gold-950/40 px-2.5 py-0.5 rounded-md border border-gold-800/20">
            Host VIP
          </span>
        </div>

        {/* Scrollable messages box */}
        <div className="flex-grow p-4 overflow-y-auto space-y-3 h-[250px]">
          {messages.map((msg, index) => {
            if (msg.sender === "system") {
              return (
                <div key={index} className="text-center">
                  <span className="inline-block bg-obsidian-950 text-[10px] text-gold-300/80 px-2.5 py-1 rounded-lg border border-obsidian-800">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender === "user";
            return (
              <div
                key={index}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-bold text-gray-400 font-display">
                    {msg.senderName}
                  </span>
                  {!isMe && (
                    <span className="text-[9px] bg-gold-950/40 text-gold-400 px-1 rounded border border-gold-800/10">
                      Lv.{host.level}
                    </span>
                  )}
                </div>
                
                <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                  isMe 
                    ? "bg-gold-600 text-obsidian-950 font-medium rounded-tr-none shadow-sm" 
                    : "bg-obsidian-950 text-white rounded-tl-none border border-obsidian-800"
                }`}>
                  <p>{msg.text}</p>
                  
                  {msg.translation && useTranslation && !isMe && (
                    <p className="text-[10.5px] text-gold-400/90 border-t border-white/5 pt-1 mt-1 font-sans leading-relaxed italic">
                      🇮🇩 "{msg.translation}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          {aiIsResponding && (
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono italic pl-2">
              <span className="animate-spin text-sm">⏳</span>
              <span>{host.name} is typing response/reacting...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Text Control area */}
        <form onSubmit={handleSendMessage} className="p-3 bg-obsidian-950 border-t border-obsidian-850 flex gap-1.5 items-center">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={aiIsResponding}
            placeholder={aiIsResponding ? "Typing..." : "Type text message..."}
            id="input-call-chat"
            className="flex-grow py-2 px-3.5 rounded-xl bg-obsidian-900 border border-obsidian-800 text-white text-xs focus:ring-1 focus:ring-gold-500 outline-none"
          />
          <button
            type="submit"
            id="btn-call-chat-submit"
            disabled={!chatInput.trim() || aiIsResponding}
            className="p-2 py-2 rounded-xl bg-gold-600 text-obsidian-950 hover:bg-gold-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>

    </div>
  );
}
