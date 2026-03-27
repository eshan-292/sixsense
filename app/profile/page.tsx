"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";
import type { Profile, Prediction, Market } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [predictions, setPredictions] = useState<
    (Prediction & { market?: Market })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const supabase = createClient();

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(p);

    const { data: preds } = await supabase
      .from("predictions")
      .select("*, market:markets(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setPredictions(preds || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canClaimBonus = () => {
    if (!profile?.last_daily_bonus) return true;
    const last = new Date(profile.last_daily_bonus);
    const now = new Date();
    return (
      now.getDate() !== last.getDate() ||
      now.getMonth() !== last.getMonth() ||
      now.getFullYear() !== last.getFullYear()
    );
  };

  const claimDailyBonus = async () => {
    if (!profile || claiming) return;
    setClaiming(true);
    setClaimMessage("");

    const bonus = 500;
    const { error } = await supabase
      .from("profiles")
      .update({
        coins: profile.coins + bonus,
        last_daily_bonus: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      setClaimMessage("Failed to claim bonus");
    } else {
      setClaimMessage(`+🪙 ${bonus} coins claimed!`);
      setProfile({ ...profile, coins: profile.coins + bonus, last_daily_bonus: new Date().toISOString() });
    }
    setClaiming(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">👤</p>
        <p className="text-gray-400 text-lg">Sign in to see your profile</p>
      </div>
    );
  }

  const winRate =
    profile.total_predictions > 0
      ? ((profile.total_wins / profile.total_predictions) * 100).toFixed(0)
      : "0";

  const totalWon = predictions
    .filter((p) => p.coins_won !== null && p.coins_won > 0)
    .reduce((sum, p) => sum + (p.coins_won ?? 0), 0);
  const totalLost = predictions
    .filter((p) => p.coins_won !== null && p.coins_won === 0)
    .reduce((sum, p) => sum + p.coins_wagered, 0);

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
          {/* Profile Header */}
          <div className="glass-card gradient-border rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-4 mb-5">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-16 h-16 rounded-full border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {profile.display_name?.[0] || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate">
                  {profile.display_name}
                </h1>
                <p className="text-xs text-gray-500">
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {profile.is_admin && (
                  <span className="inline-block text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full mt-1 font-medium">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-yellow-400">
                  🪙 {formatCoins(profile.coins)}
                </p>
                <p className="text-[10px] text-gray-600">Total Coins</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-indigo-400">
                  {profile.total_predictions}
                </p>
                <p className="text-[10px] text-gray-600">Predictions</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-green-400">{winRate}%</p>
                <p className="text-[10px] text-gray-600">Win Rate</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-orange-400">
                  {profile.win_streak > 0 ? `🔥${profile.win_streak}` : "0"}
                </p>
                <p className="text-[10px] text-gray-600">Streak</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-purple-400">
                  {profile.best_streak}
                </p>
                <p className="text-[10px] text-gray-600">Best Streak</p>
              </div>
            </div>
          </div>

          {/* Daily Bonus */}
          <div className="glass-card rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  🎁 Daily Bonus
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Claim 500 free coins every day
                </p>
              </div>
              {canClaimBonus() ? (
                <button
                  onClick={claimDailyBonus}
                  disabled={claiming}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
                >
                  {claiming ? "Claiming..." : "Claim 🪙 500"}
                </button>
              ) : (
                <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-2 rounded-lg">
                  Claimed today ✓
                </span>
              )}
            </div>
            {claimMessage && (
              <p className="text-xs text-green-400 mt-2 text-center font-medium">
                {claimMessage}
              </p>
            )}
          </div>

          {/* P&L Summary */}
          {predictions.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-400">
                  +🪙 {formatCoins(totalWon)}
                </p>
                <p className="text-[10px] text-gray-600">Total Won</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-400">
                  -🪙 {formatCoins(totalLost)}
                </p>
                <p className="text-[10px] text-gray-600">Total Lost</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Prediction History */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
            Prediction History
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent" />
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl">
            <p className="text-4xl mb-3">🔮</p>
            <p className="text-gray-400">No predictions yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Head to a match and start predicting!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {predictions.map((pred) => {
              const market = pred.market as Market | undefined;
              const selectedLabel =
                market?.options.find(
                  (o: { id: string }) => o.id === pred.selected_option_id
                )?.label || pred.selected_option_id;

              const isWin = pred.coins_won !== null && pred.coins_won > 0;
              const isLoss = pred.coins_won !== null && pred.coins_won === 0;
              const isPending = pred.coins_won === null;

              return (
                <div
                  key={pred.id}
                  className={`glass-card rounded-lg p-3 flex items-center justify-between border-l-2 ${
                    isWin
                      ? "border-l-green-500"
                      : isLoss
                        ? "border-l-red-500"
                        : "border-l-blue-500"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">
                      {market?.question || "Unknown market"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {selectedLabel}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        Wagered 🪙 {formatCoins(pred.coins_wagered)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3">
                    {isPending && (
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-medium">
                        ⏳ Pending
                      </span>
                    )}
                    {isWin && (
                      <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
                        +🪙 {formatCoins(pred.coins_won!)}
                      </span>
                    )}
                    {isLoss && (
                      <span className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full font-medium">
                        Lost
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
