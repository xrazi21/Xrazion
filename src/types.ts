/**
 * XChat Type Definitions
 */

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  diamonds: number;
  level: number;
  vip: boolean;
  country: string;
  gender: 'Male' | 'Female' | 'Other';
  bio: string;
  verified: boolean;
}

export interface Host {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  gender: 'Female' | 'Male';
  country: string;
  countryFlag: string;
  city: string;
  online: boolean;
  level: number;
  fansCount: number;
  tags: string[];
  hourlyRate: number; // in coins
  rating: number;
}

export type GiftId = 'rose' | 'perfume' | 'sports_car' | 'crown' | 'yacht' | 'ring';

export interface Gift {
  id: GiftId;
  name: string;
  price: number; // in coins
  emoji: string;
  animationClass: string;
  luxuryFactor: number; // 1-5 scale for visual effects
}

export interface StreamMessage {
  id: string;
  senderName: string;
  senderLevel: number;
  text: string;
  gift?: {
    name: string;
    emoji: string;
    price: number;
  };
  timestamp: string;
  isSystem?: boolean;
}

export interface CallSession {
  id: string;
  hostId: string;
  status: 'connecting' | 'active' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number; // in seconds
  subtitle?: string;
  translation?: string;
}

export interface Transaction {
  id: string;
  type: 'buy_coin' | 'send_gift' | 'vip_purchase' | 'withdraw';
  amount: number; // coin count
  diamondsAmount?: number;
  description: string;
  timestamp: string;
  status: 'Success' | 'Pending' | 'Failed';
}

export interface ReportItem {
  id: string;
  reportedHostId: string;
  reportedHostName: string;
  reason: string;
  timestamp: string;
  status: 'Pending' | 'Reviewed' | 'Dismissed';
}
