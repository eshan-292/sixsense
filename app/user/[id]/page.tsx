import { createClient } from "@/lib/supabase/server";
import { formatCoins } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import UserAchievementBadges from "@/components/UserAchievementBadges";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .single();

  return {
    title: profile?.display_name || "Player Profile",
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // Get rank
  const { count: higherCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gt("coins", profile.coins);
  const rank = (higherCount ?? 0) + 1;

  // Get all predictions with market info (for achievements + display)
  const { data: allPredictions } = await supabase
    .from("predictions")
    .select("*, market:markets(*)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const predictions = (allPredictions || []).slice(0, 10);

  // Get parlays for achievements
  const { data: parlayData } = await supabase
    .from("parlays")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const winRate =
    profile.total_predictions > 0
      ? ((profile.total_wins / profile.total_predictions) * 100).toFixed(0)
      : "0";

  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
          <Link
            href="/leaderboard"
            className="inline-flex items-center text-xs text-gray-500 hover:text-gray-300 mb-4 transition-colors"
          >
            ← Back to leaderboard
          </Link>

          {/* Profile Card */}
          <div className="card rounded-2xl p-6">
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
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-indigo-400">#{rank}</p>
                <p className="text-[11px] text-gray-600">Global Rank</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-yellow-400">
                  {formatCoins(profile.coins)}
                </p>
                <p className="text-[11px] text-gray-600">Coins</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-indigo-400">
                  {profile.total_predictions}
                </p>
                <p className="text-[11px] text-gray-600">Predictions</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-green-400">{winRate}%</p>
                <p className="text-[11px] text-gray-600">Win Rate</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-orange-400">
                  {profile.win_streak > 0 ? profile.win_streak : "0"}
                </p>
                <p className="text-[11px] text-gray-600">Streak</p>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-purple-400">
                  {profile.best_streak}
                </p>
                <p className="text-[11px] text-gray-600">Best</p>
              </div>
            </div>

            {/* Achievement Badges */}
            <UserAchievementBadges
              profile={profile}
              predictions={allPredictions || []}
              parlays={parlayData || []}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Recent Predictions */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
            Recent Predictions
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent" />
        </div>

        {!predictions || predictions.length === 0 ? (
          <div className="text-center py-12 card rounded-xl">
            <p className="text-4xl mb-3">🔮</p>
            <p className="text-gray-400 text-sm">No predictions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {predictions.map((pred: any) => {
              const market = pred.market;
              const selectedLabel =
                market?.options?.find(
                  (o: { id: string }) => o.id === pred.selected_option_id
                )?.label || "—";

              const isWin = pred.coins_won !== null && pred.coins_won > 0;
              const isLoss = pred.coins_won !== null && pred.coins_won === 0;

              return (
                <div
                  key={pred.id}
                  className={`card rounded-lg p-3 flex items-center justify-between border-l-2 ${
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
                      <span className="text-[11px] text-gray-600">
                        Wagered {formatCoins(pred.coins_wagered)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3">
                    {pred.coins_won === null && (
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-medium">
                        Pending
                      </span>
                    )}
                    {isWin && (
                      <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
                        +{formatCoins(pred.coins_won)}
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
