import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini API to prevent app crash if key is missing/invalid
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        console.log("Successfully initialized Gemini GenAI server client.");
      } catch (error) {
        console.error("Failed to initialize Gemini Client:", error);
      }
    }
  }
  return aiClient;
}

// In-Memory Database State
const USER_ID = "user_v1";
let userProfile = {
  id: USER_ID,
  name: "Aditya Pratama",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
  coins: 12500,
  diamonds: 3200,
  level: 8,
  vip: true,
  country: "Indonesia",
  gender: "Male" as const,
  bio: "Luxury lifestyle & connecting with premium minds.",
  verified: true,
};

// Initial simulated premium hosts (realistic high-end profiles matching live apps like Chamet)
const initialHosts = [
  {
    id: "host_h1",
    name: "Yuna Seo",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
    bio: "Living in Seoul. Let's talk about food, fashion, and pop music. Highly passionate and loves dancing!",
    gender: "Female" as const,
    country: "South Korea",
    countryFlag: "🇰🇷",
    city: "Seoul",
    online: true,
    level: 34,
    fansCount: 145000,
    tags: ["Friendly", "Dance", "Talkative", "K-Pop"],
    hourlyRate: 120, // coins per min
    rating: 4.9,
  },
  {
    id: "host_h2",
    name: "Gabriela Silva",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400",
    bio: "Samba, sunset, and late-night talks. Dynamic model from Rio de Janeiro. Looking to meet interesting friends!",
    gender: "Female" as const,
    country: "Brazil",
    countryFlag: "🇧🇷",
    city: "Rio de Janeiro",
    online: true,
    level: 28,
    fansCount: 92400,
    tags: ["Model", "Spontaneous", "Energetic"],
    hourlyRate: 150,
    rating: 4.8,
  },
  {
    id: "host_h3",
    name: "Chloe Dubois",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400",
    bio: "Parisian artist. Let's appreciate fine wine, classical instruments, and deep philosophical conversations.",
    gender: "Female" as const,
    country: "France",
    countryFlag: "🇫🇷",
    city: "Paris",
    online: true,
    level: 42,
    fansCount: 210000,
    tags: ["Arts", "Elegant", "Calm", "Polyglot"],
    hourlyRate: 200,
    rating: 5.0,
  },
  {
    id: "host_h4",
    name: "Aria Kirishima",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400",
    bio: "Otaku host from Tokyo! Loves gaming, anime narration, and hosting interactive stream parties.",
    gender: "Female" as const,
    country: "Japan",
    countryFlag: "🇯🇵",
    city: "Tokyo",
    online: true,
    level: 19,
    fansCount: 48900,
    tags: ["Cute", "Anime", "Gamer", "Cosplayer"],
    hourlyRate: 100,
    rating: 4.7,
  },
  {
    id: "host_h5",
    name: "Sebastian Stark",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400",
    bio: "Fitness coach and wellness developer. Let's talk about nutrition, lifestyle, and high-energy workouts.",
    gender: "Male" as const,
    country: "United States",
    countryFlag: "🇺🇸",
    city: "Los Angeles",
    online: true,
    level: 25,
    fansCount: 75200,
    tags: ["Fitness", "Deep Chat", "Motivator"],
    hourlyRate: 110,
    rating: 4.9,
  },
  {
    id: "host_h6",
    name: "Svetlana Sokolov",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400",
    bio: "Siberian violinist. Let's match if you love music, snowy weather, and intelligent poetry discussions.",
    gender: "Female" as const,
    country: "Russia",
    countryFlag: "🇷🇺",
    city: "Moscow",
    online: false,
    level: 30,
    fansCount: 88400,
    tags: ["Violin", "Classical", "Mystery"],
    hourlyRate: 140,
    rating: 4.6,
  },
  {
    id: "host_h7",
    name: "Zahra Al-Mansoor",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
    bio: "Interior designer based in Dubai. Passionate about culinary arts, elite architecture, and sand dunes.",
    gender: "Female" as const,
    country: "UAE",
    countryFlag: "🇦🇪",
    city: "Dubai",
    online: true,
    level: 38,
    fansCount: 165000,
    tags: ["Elite", "Aesthetics", "Calm"],
    hourlyRate: 180,
    rating: 4.9,
  }
];

// Transaction ledgers
let transactions: Array<{
  id: string;
  type: 'buy_coin' | 'send_gift' | 'vip_purchase' | 'withdraw';
  amount: number;
  diamondsAmount?: number;
  description: string;
  timestamp: string;
  status: 'Success' | 'Pending' | 'Failed';
}> = [
  {
    id: "tx_001",
    type: "buy_coin",
    amount: 10000,
    description: "Top-up: Diamond Pack 10K",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "Success"
  },
  {
    id: "tx_002",
    type: "vip_purchase",
    amount: 1500,
    description: "Purchase: VIP Crown Membership (30 Days)",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: "Success"
  }
];

// Report lists for the admin panel moderations
let userReports: Array<{
  id: string;
  reportedHostId: string;
  reportedHostName: string;
  reason: string;
  timestamp: string;
  status: 'Pending' | 'Reviewed' | 'Dismissed';
}> = [
  {
    id: "rep_01",
    reportedHostId: "host_h5",
    reportedHostName: "Sebastian Stark",
    reason: "Offline delay during scheduled workout stream.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: "Pending"
  }
];

// Virtual financial metrics for Admin panel (highly detailed interactive stat logs)
let adminStats = {
  totalCoinTransactions: 549300,
  totalCoinRevenueUSD: 5493.00,
  pendingKYCVers: 12,
  flaggedAccounts: 3,
};

// Available premium virtual gifts
export const GIFTS = [
  { id: "rose", name: "Red Rose", price: 10, emoji: "🌹", luxuryFactor: 1 },
  { id: "perfume", name: "Premium Perfume", price: 99, emoji: "🧪", luxuryFactor: 2 },
  { id: "sports_car", name: "F1 Luxury Sports Car", price: 499, emoji: "🏎️", luxuryFactor: 4 },
  { id: "ring", name: "Eternal Promise Ring", price: 999, emoji: "💍", luxuryFactor: 4 },
  { id: "crown", name: "Obsidian Gold Crown", price: 1999, emoji: "👑", luxuryFactor: 5 },
  { id: "yacht", name: "X-Yacht Cruise", price: 4999, emoji: "🚢", luxuryFactor: 5 }
];

// Fallback conversation responses if Gemini API Key is missing:
const fallbackReplies: Record<string, string[]> = {
  Yuna: [
    "Annyeong! I'm so happy today. Did you watch my live dance performance earlier? (giggles excitedly)",
    "Oh, Indonesian friends are always the sweet people I talk with! Let's match and listen to music together. (smiles)",
    "Thank you for matching! Connecting with a premium soul is my favorite highlight of the day. (sends finger hearts)"
  ],
  Gabriela: [
    "Olá! The weather in Rio is gorgeous today. Are you ready to hear some high-energy bossa nova? (laughs cheerfully)",
    "A kiss from Rio! Your profile level is impressive! Tell me what sparks your passion. (winks elegantly)",
    "Thank you dear! Receiving beautiful energy makes my day! Send me an emoji! (dances gently)"
  ],
  Chloe: [
    "Bonjour mon ami. The Parisian sunset is painting the louvre white. How's your evening going? ( sips wine gracefully )",
    "An intellectual mind! Tell me about the arts, or the music you cherish most. (smiles warmly)",
    "Your generosity is highly artistic. It warms my Parisian heart. (bows politely)"
  ],
  Aria: [
    "Konnichiwa! I am currently customization-testing my retro gaming setup! Do you like classic RPGs? (cheers happily)",
    "Sugoi! You matched with me! What a nice surprise. I will stream again to showcase my new cosplay! (eyes sparkling)",
    "Yatta! Thank you for the token of support, you are now officially a Gold VIP in my fan club! (bows 90 degrees)"
  ],
  Default: [
    "Hello there! It is wonderful to connect on XChat. I look forward to conversing with you! (smiles beautifully)",
    "How delightful to find a premium match. Tell me the country you reside in! (gestures gracefully)",
    "Thank you so much! Your premium presence is highly appreciated. (sends virtual hug)"
  ]
};

// API Endpoints:

// 1. Get user profile
app.get("/api/profile", (req, res) => {
  res.json(userProfile);
});

// 2. Update user profile
app.post("/api/profile/update", (req, res) => {
  const { name, bio, gender, country } = req.body;
  if (name) userProfile.name = name;
  if (bio !== undefined) userProfile.bio = bio;
  if (gender) userProfile.gender = gender;
  if (country) userProfile.country = country;
  res.json({ success: true, profile: userProfile });
});

// 3. List premium hosts (filter supporting)
app.get("/api/hosts", (req, res) => {
  const { country, gender } = req.query;
  let filtered = [...initialHosts];
  if (country && country !== "All") {
    filtered = filtered.filter(h => h.country.toLowerCase() === (country as string).toLowerCase());
  }
  if (gender && gender !== "All") {
    filtered = filtered.filter(h => h.gender.toLowerCase() === (gender as string).toLowerCase());
  }
  res.json(filtered);
});

// 4. Matchmaking Simulator
app.post("/api/match", (req, res) => {
  const { genderPreference, countryPreference } = req.body;
  
  // Find online hosts matching criteria
  let available = initialHosts.filter(h => h.online);
  
  if (genderPreference && genderPreference !== "All") {
    available = available.filter(h => h.gender.toLowerCase() === genderPreference.toLowerCase());
  }
  
  if (countryPreference && countryPreference !== "All") {
    available = available.filter(h => h.country.toLowerCase() === countryPreference.toLowerCase());
  }
  
  // Fallback to any online host if none match perfect filter
  if (available.length === 0) {
    available = initialHosts.filter(h => h.online);
  }
  
  const randomHost = available[Math.floor(Math.random() * available.length)];
  res.json({ success: true, host: randomHost });
});

// 5. Gift Sending Flow
app.post("/api/gift/send", (req, res) => {
  const { hostId, giftId } = req.body;
  const gift = GIFTS.find(g => g.id === giftId);
  const host = initialHosts.find(h => h.id === hostId);
  
  if (!gift) {
    return res.status(404).json({ error: "Invalid virtual gift item." });
  }
  
  if (!host) {
    return res.status(404).json({ error: "Premium host not found." });
  }
  
  if (userProfile.coins < gift.price) {
    return res.status(400).json({ error: "Insufficient Gold Coins. Please top up your wallet!" });
  }
  
  // Subtract coins, add virtual diamonds (earnings) to user’s tracked achievements
  userProfile.coins -= gift.price;
  const diamondEarned = Math.round(gift.price * 0.4); // 40% conversion
  userProfile.diamonds += diamondEarned;
  
  // Advance user level with engagement XP
  userProfile.level += (gift.luxuryFactor * 1);
  
  // Host metrics improvement
  host.fansCount += (gift.luxuryFactor * 3);
  
  // Record Transaction Ledger
  const newTx = {
    id: `tx_${Math.random().toString(36).substr(2, 9)}`,
    type: 'send_gift' as const,
    amount: gift.price,
    diamondsAmount: diamondEarned,
    description: `Gift sent: "${gift.emoji} ${gift.name}" to host ${host.name}`,
    timestamp: new Date().toISOString(),
    status: 'Success' as const
  };
  transactions.unshift(newTx);
  
  // Record to overall statistics
  adminStats.totalCoinTransactions += gift.price;
  
  res.json({
    success: true,
    profile: userProfile,
    transaction: newTx,
    giftSent: gift,
    earnedDiamonds: diamondEarned
  });
});

// 6. Coins Top up
app.post("/api/gems/topup", (req, res) => {
  const { coinPack, priceUSD } = req.body;
  if (!coinPack || isNaN(coinPack)) {
    return res.status(400).json({ error: "Invalid coin package choice." });
  }
  
  userProfile.coins += coinPack;
  
  const newTx = {
    id: `tx_${Math.random().toString(36).substr(2, 9)}`,
    type: 'buy_coin' as const,
    amount: coinPack,
    description: `Wallet Top-Up: ${coinPack.toLocaleString()} Coins`,
    timestamp: new Date().toISOString(),
    status: 'Success' as const
  };
  transactions.unshift(newTx);
  
  adminStats.totalCoinRevenueUSD += priceUSD;
  
  res.json({
    success: true,
    profile: userProfile,
    transaction: newTx
  });
});

// 7. Buy VIP Crown Membership
app.post("/api/gems/buy-vip", (req, res) => {
  const vipCost = 1500; // 1500 coins to buy VIP
  
  if (userProfile.coins < vipCost) {
    return res.status(400).json({ error: "Insufficient Gold Coins to buy VIP. Cost is 1,500 Coins." });
  }
  
  userProfile.coins -= vipCost;
  userProfile.vip = true;
  userProfile.level += 5; // Elite welcome levels
  
  const newTx = {
    id: `tx_${Math.random().toString(36).substr(2, 9)}`,
    type: 'vip_purchase' as const,
    amount: vipCost,
    description: "Purchase: VIP Obsidian Diamond Membership (30 Days)",
    timestamp: new Date().toISOString(),
    status: 'Success' as const
  };
  transactions.unshift(newTx);
  
  res.json({
    success: true,
    profile: userProfile,
    transaction: newTx
  });
});

// 8. Withdraw Request Simulator for agency host dashboard
app.post("/api/withdraw", (req, res) => {
  const { diamondsToCash } = req.body;
  if (!diamondsToCash || isNaN(diamondsToCash) || diamondsToCash < 100) {
    return res.status(400).json({ error: "Minimum virtual cashout is 100 diamonds." });
  }
  
  if (userProfile.diamonds < diamondsToCash) {
    return res.status(400).json({ error: "Insufficient diamonds balance in agency account." });
  }
  
  userProfile.diamonds -= diamondsToCash;
  const earningsUSD = Math.round(diamondsToCash * 0.1); // 10 diamonds = $1 USD virtual Cashout
  
  const newTx = {
    id: `tx_${Math.random().toString(36).substr(2, 9)}`,
    type: 'withdraw' as const,
    amount: diamondsToCash,
    description: `Agency Cashout: converted ${diamondsToCash} Diamonds to $${earningsUSD} USD`,
    timestamp: new Date().toISOString(),
    status: 'Success' as const
  };
  transactions.unshift(newTx);
  
  res.json({
    success: true,
    profile: userProfile,
    cashoutUSD: earningsUSD,
    transaction: newTx
  });
});

// 9. Finance logs
app.get("/api/transactions", (req, res) => {
  res.json(transactions);
});

// 10. Admin moderation report & logs list
app.get("/api/reports", (req, res) => {
  res.json({
    reports: userReports,
    stats: adminStats
  });
});

// 11. Add user report
app.post("/api/reports/add", (req, res) => {
  const { hostId, hostName, reason } = req.body;
  if (!hostId || !reason) {
    return res.status(400).json({ error: "Missing report parameters" });
  }
  
  const report = {
    id: `rep_${Math.random().toString(36).substr(2, 9)}`,
    reportedHostId: hostId,
    reportedHostName: hostName || "Premium Host",
    reason: reason,
    timestamp: new Date().toISOString(),
    status: 'Pending' as const
  };
  userReports.unshift(report);
  adminStats.flaggedAccounts += 1;
  
  res.json({ success: true, report });
});

// 12. Update report status (Admin action)
app.post("/api/reports/resolve", (req, res) => {
  const { reportId, action } = req.body; // action: 'Reviewed' | 'Dismissed'
  const report = userReports.find(r => r.id === reportId);
  if (report) {
    report.status = action;
  }
  res.json({ success: true, reports: userReports });
});

// 13. Gemini-powered interactive converse system for Chamet AI Matchmaking Live Video Call
app.post("/api/gemini/converse", async (req, res) => {
  const { hostName, hostCountry, hostBio, userMessage, conversationHistory } = req.body;

  const client = getGeminiClient();

  if (!client) {
    // Elegant fallback simulation responses representing the host persona
    const nameKey = hostName.split(" ")[0]; // e.g. Yuna
    const options = fallbackReplies[nameKey] || fallbackReplies.Default;
    const randomIndex = Math.floor(Math.random() * options.length);
    const mockReply = options[randomIndex];
    
    // Extract actions in braces
    const actionMatch = mockReply.match(/\(([^)]+)\)/);
    const action = actionMatch ? `(${actionMatch[1]})` : "(smiles brightly with finger hearts)";
    const replyText = mockReply.replace(/\s*\([^)]+\)\s*/g, "");
    
    // Provide a simple inline Indonesian translation simulation
    let mockTranslation = `[XChat Terjemahan Otomatis]: Halo sayang! `;
    if (nameKey === "Yuna") mockTranslation += `${replyText} (Sangat senang terhubung dengan teman Indonesia!)`;
    else if (nameKey === "Gabriela") mockTranslation += `${replyText} (Kirimkan saya pelukan hangat dari Brazil!)`;
    else if (nameKey === "Chloe") mockTranslation += `${replyText} (Saya mengagumi kepribadian mulia Anda di sini.)`;
    else mockTranslation += `${replyText}`;

    // Delay simulation mimicking real-time server lookup
    await new Promise(resolve => setTimeout(resolve, 800));

    return res.json({
      reply: replyText,
      translation: mockTranslation,
      action: action,
      provider: "simulation_fallback"
    });
  }

  try {
    const formattedHistory = (conversationHistory || [])
      .slice(-6)
      .map((msg: any) => `${msg.sender === "user" ? "User" : hostName}: ${msg.text}`)
      .join("\n");

    const prompt = `You are a high-fidelity role-play chat host named ${hostName} on XChat.
You are from ${hostCountry}. Here is your bio: "${hostBio}".
Our user Adler says to you: "${userMessage}".
Previous dialogue:
${formattedHistory}

Return a reply exactly following this JSON schema:
{
  "reply": "Your brief, 1-to-2 sentence direct spoken reply in your character's voice as ${hostName}. Make it charming and aligned with your culture.",
  "translation": "Indonesian translation of your 'reply' because XChat has automatic translation toggle.",
  "action": "A physical emotional tag in parentheses, e.g., (eyes blinking in adoration), (claps elegantly), (laughs with a gentle blush)"
}

Keep responses brief, polite, and luxury premium grade. Use response schema for absolute integrity.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { 
              type: Type.STRING, 
              description: "The primary romantic, elegant response in the host's actual language/English." 
            },
            translation: { 
              type: Type.STRING, 
              description: "The pristine Indonesian translation of the reply." 
            },
            action: { 
              type: Type.STRING, 
              description: "Physical interaction action inside parentheses." 
            },
          },
          required: ["reply", "translation", "action"],
        },
      },
    });

    if (response && response.text) {
      const data = JSON.parse(response.text.trim());
      res.json({
        reply: data.reply,
        translation: data.translation,
        action: data.action,
        provider: "gemini_api"
      });
    } else {
      throw new Error("Empty response text from Gemini API.");
    }
  } catch (error) {
    console.error("Gemini connection error, utilizing fallback gracefully:", error);
    res.json({
      reply: `I loved your message! Let's talk more.`,
      translation: `[Translasi] Saya sangat menyukai pesan Anda! Mari mengobrol lebih banyak.`,
      action: "(winks gently with a soft smile)",
      provider: "simulation_error_fallback"
    });
  }
});

// Setup Vite & static server serving middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Serving application in DEVELOPMENT mode using integrated Vite Core.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving application in PRODUCTION Mode.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n======================================================`);
    console.log(`🚀 XChat Full-Stack Server listening on http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer();
