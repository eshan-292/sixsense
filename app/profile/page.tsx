"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";
import type { Profile, Prediction, Market, Parlay } from "@/lib/types";
import { computeEarnedAchievements, ACHIEVEMENTS } from "@/lib/achievements";
import type { UserStats } from "@/lib/achievements";
import AchievementBadge from "@/components/AchievementBadge";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [predictions, setPredictions] = useState<(Prediction & { market?: Market })[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);

    const { data: allPreds } = await supabase
      .from("predictions")
      .select("*, market:markets(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPredictions(allPreds || []);

    const { data: parlayData } = await supabase
      .from("parlays")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setParlays(parlayData || []);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const canClaimBonus = () => {
    if (!profile?.last_daily_bonus) return true;
    const last = new Date(profile.last_daily_bonus);
    const now = new Date();
    return now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
  };

  const claimDailyBonus = async () => {
    if (!profile || claiming) return;
    setClaiming(true);
    setClaimMessage("");
    const bonus = 500;
    const { error } = await supabase
      .from("profiles")
      .update({ coins: profile.coins + bonus, last_daily_bonus: new Date().toISOString() })
      .eq("id", profile.id);
    if (error) { setClaimMessage("Failed to claim"); }
    else {
      setClaimMessage(`+${bonus} coins!`);
      setProfile({ ...profile, coins: profile.coins + bonus, last_daily_bonus: new Date().toISOString() });
    }
    setClaiming(false);
  };

  const winRate = profile && profile.total_predictions > 0
    ? ((profile.total_wins / profile.total_predictions) * 100).toFixed(0) : "0";

  const achievementResults = useMemo(() => {
    if (!profile) return [];
    const stats: UserStats = { profile, predictions, parlays };
    return computeEarnedAchievements(stats);
  }, [profile, predictions, parlays]);

  const earnedAchievements = achievementResults.filter((r) => r.earned);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-[#e63946]/30 border-t-[#e63946] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🏏</p>
        <p className="text-white text-lg font-semibold mb-2">Join SixSense</p>
        <p className="text-[#8899a6] text-sm mb-6">
          Predict IPL outcomes and compete on the leaderboard
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/auth/callback` },
            });
          }}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Daily Bonus */}
      {canClaimBonus() && (
        <button
          onClick={claimDailyBonus}
          disabled={claiming}
          className="w-full card p-3 mb-4 flex items-center justify-between border-[#2ecc71]/20 hover:border-[#2ecc71]/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <span className="text-sm font-medium text-[#2ecc71]">
              {claimMessage || "Claim 500 free coins"}
            </span>
          </div>
          {!claimMessage && (
            <span className="text-xs font-semibold text-[#2ecc71] bg-[#2ecc71]/10 px-3 py-1 rounded-md">
              Claim
            </span>
          )}
        </button>
      )}

      {/* Profile card */}
      <div className="card p-5 mb-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-5">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full border-2 border-[#243040]" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#e63946] flex items-center justify-center text-xl font-bold text-white">
              {profile.display_name?.[0] || "?"}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{profile.display_name}</h1>
            <p className="text-xs text-[#556677]">
              Joined {new Date(profile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Hero coins */}
        <div className="text-center py-4 bg-[#151f2b] rounded-xl mb-4">
          <p className="text-xs text-[#8899a6] mb-1">Balance</p>
          <p className="text-4xl font-bold text-[#f5a623] font-mono">
            {formatCoins(profile.coins)}
          </p>
          <p className="text-xs text-[#556677] mt-1">coins</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center py-3 bg-[#151f2b] rounded-lg">
            <p className="text-xl font-bold text-white">{winRate}%</p>
            <p className="text-[11px] text-[#556677] mt-0.5">Win Rate</p>
          </div>
          <div className="text-center py-3 bg-[#151f2b] rounded-lg">
            <p className="text-xl font-bold text-white">{profile.total_predictions}</p>
            <p className="text-[11px] text-[#556677] mt-0.5">Predictions</p>
          </div>
          <div className="text-center py-3 bg-[#151f2b] rounded-lg">
            <p className="text-xl font-bold text-[#f5a623]">{profile.win_streak || 0}</p>
            <p className="text-[11px] text-[#556677] mt-0.5">Streak</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {earnedAchievements.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">
              Achievements
              <span className="text-[#556677] font-normal ml-1.5">
                {earnedAchievements.length}/{ACHIEVEMENTS.length}
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {earnedAchievements.slice(0, 8).map((r) => (
              <AchievementBadge key={r.achievement.id} achievement={r.achievement} earned size="sm" />
            ))}
            {earnedAchievements.length > 8 && (
              <span className="text-xs text-[#8899a6] self-center ml-1">
                +{earnedAchievements.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="space-y-2 mb-4">
        {profile.is_admin && (
          <Link href="/admin" className="card p-3 flex items-center justify-between">
            <span className="text-sm text-[#f5a623] font-medium">Admin Panel</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#556677" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        )}
        <Link href="/how-to-play" className="card p-3 flex items-center justify-between">
          <span className="text-sm text-[#e8eaed]">How to Play</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#556677" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      </div>

      {/* Sign out */}
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/";
        }}
        className="w-full text-center py-3 text-sm text-[#e63946] font-medium"
      >
        Sign Out
      </button>

      <p className="text-center text-[11px] text-[#334155] mt-4 mb-6">
        Not real gambling · Virtual coins only
      </p>
    </div>
  );
}
