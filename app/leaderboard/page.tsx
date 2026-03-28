import { createClient } from "@/lib/supabase/server";
import { formatCoins } from "@/lib/utils";
import LeaderboardTabs from "./LeaderboardTabs";
import type { Metadata } from "next";
import type { LeaderboardEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See who's leading the SixSense IPL prediction market. Top predictors ranked by Points and coins.",
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Fetch top by SSR
  const { data: ssrLeaders } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, coins, total_predictions, total_wins, total_losses, win_streak, best_streak, ssr, ssr_today, current_streak"
    )
    .order("ssr", { ascending: false })
    .limit(50);

  // Fetch top by coins
  const { data: coinLeaders } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, coins, total_predictions, total_wins, total_losses, win_streak, best_streak, ssr, ssr_today, current_streak"
    )
    .order("coins", { ascending: false })
    .limit(50);

  // Fetch top by streak
  const { data: streakLeaders } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, coins, total_predictions, total_wins, total_losses, win_streak, best_streak, ssr, ssr_today, current_streak"
    )
    .order("current_streak", { ascending: false })
    .limit(50);

  // Fetch today's best
  const { data: todayLeaders } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, coins, total_predictions, total_wins, total_losses, win_streak, best_streak, ssr, ssr_today, current_streak"
    )
    .order("ssr_today", { ascending: false })
    .limit(50);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRank: number | null = null;
  let userProfile: LeaderboardEntry | null = null;
  if (user && ssrLeaders) {
    userProfile = ssrLeaders.find((l) => l.id === user.id) ?? null;
    if (!userProfile && coinLeaders) {
      userProfile = coinLeaders.find((l) => l.id === user.id) ?? null;
    }
    if (userProfile) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("ssr", userProfile.ssr ?? 0);
      userRank = (count ?? 0) + 1;
    }
  }

  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
          <h1 className="text-3xl font-bold text-white text-center mb-1">
            Leaderboard
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Top predictors of IPL 2026
          </p>

          {/* Your rank card */}
          {userProfile && userRank && (
            <div className="card rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {userProfile.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-indigo-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                      {userProfile.display_name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {userProfile.display_name}
                    </p>
                    <p className="text-xs text-gray-500">Your Position</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-400">
                    #{userRank}
                  </p>
                  <p className="text-xs text-purple-400 font-semibold">
                    {userProfile.ssr ?? 0} Pts
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-gray-800">
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{userProfile.total_predictions}</p>
                  <p className="text-[11px] text-gray-600">Predicted</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-green-400">{userProfile.total_wins}</p>
                  <p className="text-[11px] text-gray-600">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-red-400">{userProfile.total_losses}</p>
                  <p className="text-[11px] text-gray-600">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-purple-400">
                    {userProfile.ssr ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-600">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-orange-400">
                    {(userProfile.current_streak ?? 0) > 0 ? `${userProfile.current_streak}` : "-"}
                  </p>
                  <p className="text-[11px] text-gray-600">Streak</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        <LeaderboardTabs
          ssrLeaders={ssrLeaders || []}
          coinLeaders={coinLeaders || []}
          streakLeaders={streakLeaders || []}
          todayLeaders={todayLeaders || []}
          currentUserId={user?.id}
        />

        {userRank && userRank > 50 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            Your rank:{" "}
            <span className="text-indigo-400 font-semibold">#{userRank}</span>
          </p>
        )}
      </div>
    </div>
  );
}
