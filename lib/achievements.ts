import type { Profile, Prediction, Market, Parlay } from "@/lib/types";

export interface UserStats {
  profile: Profile;
  predictions: (Prediction & { market?: Market })[];
  parlays: Parlay[];
}

export type AchievementTier = "bronze" | "silver" | "gold" | "diamond";
export type AchievementCategory =
  | "prediction"
  | "streak"
  | "earnings"
  | "social"
  | "special";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: (stats: UserStats) => boolean;
  tier: AchievementTier;
}

export const TIER_COLORS: Record<
  AchievementTier,
  { bg: string; border: string; text: string; glow: string }
> = {
  bronze: {
    bg: "bg-amber-600/20",
    border: "border-amber-600/50",
    text: "text-amber-500",
    glow: "shadow-amber-500/30",
  },
  silver: {
    bg: "bg-slate-400/20",
    border: "border-slate-400/50",
    text: "text-slate-300",
    glow: "shadow-slate-400/30",
  },
  gold: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
    glow: "shadow-yellow-500/30",
  },
  diamond: {
    bg: "bg-cyan-400/20",
    border: "border-cyan-400/50",
    text: "text-cyan-300",
    glow: "shadow-cyan-400/30",
  },
};

export const ACHIEVEMENTS: Achievement[] = [
  // Prediction category
  {
    id: "first_blood",
    name: "First Blood",
    description: "Place your first prediction",
    icon: "\u{1F3AF}",
    category: "prediction",
    tier: "bronze",
    condition: (s) => s.profile.total_predictions >= 1,
  },
  {
    id: "getting_started",
    name: "Getting Started",
    description: "Make 10 predictions",
    icon: "\u{1F4CA}",
    category: "prediction",
    tier: "bronze",
    condition: (s) => s.profile.total_predictions >= 10,
  },
  {
    id: "seasoned_predictor",
    name: "Seasoned Predictor",
    description: "Make 50 predictions",
    icon: "\u{1F9E0}",
    category: "prediction",
    tier: "silver",
    condition: (s) => s.profile.total_predictions >= 50,
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Make 100 predictions",
    icon: "\u{1F4AF}",
    category: "prediction",
    tier: "gold",
    condition: (s) => s.profile.total_predictions >= 100,
  },

  // Streak category
  {
    id: "crystal_ball",
    name: "Crystal Ball",
    description: "Win your first prediction",
    icon: "\u{1F52E}",
    category: "streak",
    tier: "bronze",
    condition: (s) => s.profile.total_wins >= 1,
  },
  {
    id: "hot_streak",
    name: "Hot Streak",
    description: "Win 3 in a row",
    icon: "\u{1F525}",
    category: "streak",
    tier: "silver",
    condition: (s) => s.profile.best_streak >= 3,
  },
  {
    id: "on_fire",
    name: "On Fire",
    description: "Win 5 in a row",
    icon: "\u{2604}\u{FE0F}",
    category: "streak",
    tier: "gold",
    condition: (s) => s.profile.best_streak >= 5,
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Win 10 in a row",
    icon: "\u{1F4A5}",
    category: "streak",
    tier: "diamond",
    condition: (s) => s.profile.best_streak >= 10,
  },

  // Special category
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    description: "60%+ win rate with 20+ predictions",
    icon: "\u{1F3F9}",
    category: "special",
    tier: "silver",
    condition: (s) =>
      s.profile.total_predictions >= 20 &&
      s.profile.total_wins / s.profile.total_predictions >= 0.6,
  },
  {
    id: "bold_caller",
    name: "Bold Caller",
    description: "Win a Bold Prediction (hard tier) market",
    icon: "\u{1F9E8}",
    category: "special",
    tier: "silver",
    condition: (s) =>
      s.predictions.some(
        (p) =>
          p.market?.tier === "hard" &&
          p.coins_won !== null &&
          p.coins_won > 0
      ),
  },
  {
    id: "parlay_pro",
    name: "Parlay Pro",
    description: "Win a parlay bet",
    icon: "\u{1F3B0}",
    category: "special",
    tier: "gold",
    condition: (s) => s.parlays.some((p) => p.status === "won"),
  },

  // Earnings category
  {
    id: "big_spender",
    name: "Big Spender",
    description: "Wager 10,000+ coins total",
    icon: "\u{1F4B8}",
    category: "earnings",
    tier: "silver",
    condition: (s) => {
      const totalWagered = s.predictions.reduce(
        (sum, p) => sum + p.coins_wagered,
        0
      );
      return totalWagered >= 10000;
    },
  },
  {
    id: "moneybags",
    name: "Moneybags",
    description: "Accumulate 25,000+ coins",
    icon: "\u{1F4B0}",
    category: "earnings",
    tier: "gold",
    condition: (s) => s.profile.coins >= 25000,
  },
  {
    id: "whale",
    name: "Whale",
    description: "Accumulate 50,000+ coins",
    icon: "\u{1F433}",
    category: "earnings",
    tier: "diamond",
    condition: (s) => s.profile.coins >= 50000,
  },

  // Social category (SSR-based)
  {
    id: "rising_star",
    name: "Rising Star",
    description: "Reach 100 SSR",
    icon: "\u{2B50}",
    category: "social",
    tier: "bronze",
    condition: (s) => (s.profile.ssr ?? 0) >= 100,
  },
  {
    id: "all_star",
    name: "All Star",
    description: "Reach 500 SSR",
    icon: "\u{1F31F}",
    category: "social",
    tier: "silver",
    condition: (s) => (s.profile.ssr ?? 0) >= 500,
  },
  {
    id: "legend",
    name: "Legend",
    description: "Reach 1000 SSR",
    icon: "\u{1F451}",
    category: "social",
    tier: "gold",
    condition: (s) => (s.profile.ssr ?? 0) >= 1000,
  },

  // Special category continued
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Place a prediction within 1 hour of market opening",
    icon: "\u{1F426}",
    category: "special",
    tier: "bronze",
    condition: (s) =>
      s.predictions.some((p) => {
        if (!p.market?.created_at) return false;
        const marketCreated = new Date(p.market.created_at).getTime();
        const predCreated = new Date(p.created_at).getTime();
        return predCreated - marketCreated <= 60 * 60 * 1000;
      }),
  },
  {
    id: "diversified",
    name: "Diversified",
    description: "Predict on all market tiers in one match",
    icon: "\u{1F308}",
    category: "special",
    tier: "silver",
    condition: (s) => {
      const matchTiers = new Map<string, Set<string>>();
      for (const p of s.predictions) {
        if (!p.market?.tier) continue;
        const matchId = p.market.match_id;
        if (!matchTiers.has(matchId)) {
          matchTiers.set(matchId, new Set());
        }
        matchTiers.get(matchId)!.add(p.market.tier);
      }
      return Array.from(matchTiers.values()).some(
        (tiers) =>
          tiers.has("easy") && tiers.has("medium") && tiers.has("hard")
      );
    },
  },
];

export function computeEarnedAchievements(
  stats: UserStats
): { achievement: Achievement; earned: boolean }[] {
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    earned: achievement.condition(stats),
  }));
}
