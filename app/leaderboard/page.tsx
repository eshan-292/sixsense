import { createClient } from "@/lib/supabase/server";
import { formatCoins } from "@/lib/utils";
import Link from "next/link";
import LeaderboardTable from "./LeaderboardTable";
import type { Metadata } from "next";
import type { LeaderboardEntry } from "@/lib/types";

const medals = ["🥇", "🥈", "🥉"];

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See who's leading the SixSense IPL prediction market. Top predictors ranked by coins earned.",
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: leaders } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, coins, total_predictions, total_wins, total_losses, win_streak, best_streak"
    )
    .order("coins", { ascending: false })
    .limit(50);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRank: number | null = null;
  let userProfile: LeaderboardEntry | null = null;
  if (user && leaders) {
    userProfile = leaders.find((l) => l.id === user.id) ?? null;
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt("coins", userProfile?.coins ?? 0);
    userRank = (count ?? 0) + 1;
  }


  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
          <h1 className="text-3xl font-bold text-white text-center mb-1">
            Leaderboard
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Top predictors of IPL 2026
          </p>

          {/* Your rank card */}
          {userProfile && userRank && (
            <div className="glass-card gradient-border rounded-xl p-4 mb-6">
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
                  <p className="text-xs text-yellow-400 font-semibold">
                    🪙 {formatCoins(userProfile.coins)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-gray-800">
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{userProfile.total_predictions}</p>
                  <p className="text-[10px] text-gray-600">Predicted</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-green-400">{userProfile.total_wins}</p>
                  <p className="text-[10px] text-gray-600">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-red-400">{userProfile.total_losses}</p>
                  <p className="text-[10px] text-gray-600">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-orange-400">
                    {userProfile.win_streak > 0 ? `🔥${userProfile.win_streak}` : "-"}
                  </p>
                  <p className="text-[10px] text-gray-600">Streak</p>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 podium */}
          {leaders && leaders.length >= 3 && (
            <div className="flex items-end justify-center gap-4 mb-6">
              {[1, 0, 2].map((idx) => {
                const leader = leaders[idx];
                const podiumH = idx === 0 ? "h-24" : idx === 1 ? "h-16" : "h-12";
                const avatarSize = idx === 0 ? "w-14 h-14" : "w-11 h-11";
                const borderColor =
                  idx === 0
                    ? "border-yellow-400 shadow-yellow-500/30"
                    : idx === 1
                      ? "border-gray-300 shadow-gray-400/20"
                      : "border-amber-600 shadow-amber-500/20";

                return (
                  <Link key={leader.id} href={`/user/${leader.id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                    <div className="text-2xl mb-1">{medals[idx]}</div>
                    {leader.avatar_url ? (
                      <img
                        src={leader.avatar_url}
                        alt=""
                        className={`${avatarSize} rounded-full border-2 ${borderColor} shadow-lg mb-1`}
                      />
                    ) : (
                      <div
                        className={`${avatarSize} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white mb-1 border-2 ${borderColor} shadow-lg`}
                      >
                        {leader.display_name?.[0] || "?"}
                      </div>
                    )}
                    <p className="text-xs font-medium text-white truncate max-w-[80px] text-center">
                      {leader.display_name}
                    </p>
                    <p className="text-[11px] text-yellow-400 font-semibold">
                      🪙 {formatCoins(leader.coins)}
                    </p>
                    <div
                      className={`${podiumH} w-20 bg-gradient-to-t from-indigo-600/20 to-transparent rounded-t-lg mt-2 border-t-2 border-indigo-500/50`}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        <LeaderboardTable
          leaders={leaders || []}
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
