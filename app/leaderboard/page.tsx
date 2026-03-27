import { createClient } from "@/lib/supabase/server";
import { formatCoins } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: leaders } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, coins, total_predictions, total_wins, win_streak"
    )
    .order("coins", { ascending: false })
    .limit(50);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRank: number | null = null;
  if (user) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt(
        "coins",
        leaders?.find((l) => l.id === user.id)?.coins ?? 0
      );
    userRank = (count ?? 0) + 1;
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">🏆 Leaderboard</h1>

      {/* Top 3 podium */}
      {leaders && leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {[1, 0, 2].map((idx) => {
            const leader = leaders[idx];
            const heights = ["h-28", "h-36", "h-24"];
            const heightIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            return (
              <div
                key={leader.id}
                className="flex flex-col items-center"
              >
                <div className="text-2xl mb-1">{medals[idx]}</div>
                {leader.avatar_url ? (
                  <img
                    src={leader.avatar_url}
                    alt=""
                    className={`w-10 h-10 rounded-full border-2 ${idx === 0 ? "border-yellow-500" : idx === 1 ? "border-gray-400" : "border-amber-600"} mb-1`}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white mb-1">
                    {leader.display_name?.[0] || "?"}
                  </div>
                )}
                <p className="text-xs font-medium text-white truncate max-w-[80px]">
                  {leader.display_name}
                </p>
                <p className="text-xs text-yellow-400 font-semibold">
                  🪙 {formatCoins(leader.coins)}
                </p>
                <div
                  className={`${heights[heightIdx]} w-20 bg-gradient-to-t from-indigo-600/30 to-indigo-400/10 rounded-t-lg mt-2 border-t-2 border-indigo-500`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">
                #
              </th>
              <th className="text-left text-xs text-gray-500 font-medium py-3 px-4">
                Player
              </th>
              <th className="text-right text-xs text-gray-500 font-medium py-3 px-4">
                Coins
              </th>
              <th className="text-right text-xs text-gray-500 font-medium py-3 px-4 hidden sm:table-cell">
                W/L
              </th>
              <th className="text-right text-xs text-gray-500 font-medium py-3 px-4 hidden sm:table-cell">
                Streak
              </th>
            </tr>
          </thead>
          <tbody>
            {leaders?.map((leader: LeaderboardEntry, idx: number) => (
              <tr
                key={leader.id}
                className={`border-b border-gray-800/50 ${leader.id === user?.id ? "bg-indigo-500/10" : ""}`}
              >
                <td className="py-3 px-4 text-sm text-gray-400">
                  {idx < 3 ? medals[idx] : idx + 1}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {leader.avatar_url ? (
                      <img
                        src={leader.avatar_url}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white">
                        {leader.display_name?.[0] || "?"}
                      </div>
                    )}
                    <span className="text-sm text-white truncate max-w-[120px]">
                      {leader.display_name}
                      {leader.id === user?.id && (
                        <span className="text-indigo-400 ml-1">(You)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-sm font-semibold text-yellow-400">
                  🪙 {formatCoins(leader.coins)}
                </td>
                <td className="py-3 px-4 text-right text-xs text-gray-400 hidden sm:table-cell">
                  <span className="text-green-400">{leader.total_wins}W</span>
                  {" / "}
                  <span className="text-red-400">
                    {leader.total_predictions - leader.total_wins}L
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-xs hidden sm:table-cell">
                  {leader.win_streak > 0 ? (
                    <span className="text-orange-400">
                      🔥 {leader.win_streak}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userRank && userRank > 50 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          Your rank: <span className="text-indigo-400 font-semibold">#{userRank}</span>
        </p>
      )}
    </div>
  );
}
