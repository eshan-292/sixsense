import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import NextMatchCountdown from "@/components/NextMatchCountdown";
import type { Match } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's matches
  const { data: todayMatches } = await supabase
    .from("matches")
    .select("*")
    .gte("match_date", today.toISOString())
    .lt("match_date", tomorrow.toISOString())
    .order("match_date", { ascending: true });

  // Get upcoming matches (next 7 days, excluding today)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select("*")
    .gte("match_date", tomorrow.toISOString())
    .lt("match_date", nextWeek.toISOString())
    .order("match_date", { ascending: true });

  // Get recent completed matches
  const { data: recentMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "completed")
    .order("match_date", { ascending: false })
    .limit(3);

  // Get markets and predictions for match stats
  const allMatchIds = [
    ...(todayMatches || []),
    ...(upcomingMatches || []),
    ...(recentMatches || []),
  ].map((m) => m.id);

  const { data: matchMarkets } = allMatchIds.length > 0
    ? await supabase
        .from("markets")
        .select("id, match_id")
        .in("match_id", allMatchIds)
    : { data: [] };

  const marketIds = (matchMarkets || []).map((m) => m.id);
  const { data: matchPredictions } = marketIds.length > 0
    ? await supabase
        .from("predictions")
        .select("id, market_id")
        .in("market_id", marketIds)
    : { data: [] };

  // Build counts per match
  const marketCountByMatch: Record<string, number> = {};
  const predictionCountByMatch: Record<string, number> = {};
  (matchMarkets || []).forEach((m) => {
    marketCountByMatch[m.match_id] = (marketCountByMatch[m.match_id] || 0) + 1;
  });
  (matchPredictions || []).forEach((p) => {
    const market = (matchMarkets || []).find((m) => m.id === p.market_id);
    if (market) {
      predictionCountByMatch[market.match_id] =
        (predictionCountByMatch[market.match_id] || 0) + 1;
    }
  });

  // Stats
  const { count: totalPlayers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const { count: totalPredictions } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true });

  // Top 3 for mini leaderboard
  const { data: topPlayers } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, coins")
    .order("coins", { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-indigo-300 font-medium">IPL 2026 Season is LIVE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            Six<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Sense</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg mb-6">
            Predict match outcomes. Climb the leaderboard. Prove your cricket IQ.
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                {totalPlayers || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Players</p>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {totalPredictions || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Predictions</p>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                70
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Matches</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Next match countdown */}
        {(() => {
          const nextMatch =
            todayMatches?.find(
              (m) => new Date(m.match_date).getTime() > Date.now()
            ) || upcomingMatches?.[0];
          return nextMatch ? (
            <NextMatchCountdown
              matchDate={nextMatch.match_date}
              teamA={nextMatch.team_a_short}
              teamB={nextMatch.team_b_short}
            />
          ) : null;
        })()}

        {/* Today's Matches */}
        {todayMatches && todayMatches.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-orange-500/50 to-transparent" />
              <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-base">🔥</span> Today
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-orange-500/50 to-transparent" />
            </div>
            <div className="space-y-3">
              {todayMatches.map((match: Match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  featured
                  marketCount={marketCountByMatch[match.id]}
                  predictionCount={predictionCountByMatch[match.id]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcomingMatches && upcomingMatches.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-base">📅</span> Upcoming
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
            </div>
            <div className="space-y-3">
              {upcomingMatches.map((match: Match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  marketCount={marketCountByMatch[match.id]}
                  predictionCount={predictionCountByMatch[match.id]}
                />
              ))}
            </div>
            <Link
              href="/schedule"
              className="block text-center text-xs text-indigo-400 hover:text-indigo-300 mt-3 transition-colors"
            >
              View all 70 matches →
            </Link>
          </section>
        )}

        {/* Mini Leaderboard */}
        {topPlayers && topPlayers.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-yellow-500/50 to-transparent" />
              <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-base">🏆</span> Top Players
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-yellow-500/50 to-transparent" />
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="space-y-3">
                {topPlayers.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{["🥇", "🥈", "🥉"][idx]}</span>
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt="" className="w-8 h-8 rounded-full border border-gray-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                          {player.display_name?.[0] || "?"}
                        </div>
                      )}
                      <span className="text-sm text-white font-medium">{player.display_name}</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-400">🪙 {player.coins.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              <Link href="/leaderboard" className="block text-center text-xs text-indigo-400 hover:text-indigo-300 mt-4 pt-3 border-t border-gray-800">
                View Full Leaderboard →
              </Link>
            </div>
          </section>
        )}

        {/* Recent Results */}
        {recentMatches && recentMatches.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-gray-500/50 to-transparent" />
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-base">✅</span> Recent
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-gray-500/50 to-transparent" />
            </div>
            <div className="space-y-3">
              {recentMatches.map((match: Match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  marketCount={marketCountByMatch[match.id]}
                  predictionCount={predictionCountByMatch[match.id]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!todayMatches || todayMatches.length === 0) &&
          (!upcomingMatches || upcomingMatches.length === 0) && (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">🏏</p>
              <p className="text-gray-400 text-lg">No matches scheduled yet.</p>
              <p className="text-gray-600 text-sm mt-1">
                Check back soon for IPL predictions!
              </p>
            </div>
          )}

        {/* How it works */}
        <section className="mt-4">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">How SixSense Works</h3>
              <Link href="/how-to-play" className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                Full rules →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🎯</span>
                </div>
                <p className="text-xs text-gray-300 font-medium">Predict</p>
                <p className="text-xs text-gray-500 mt-0.5">Pick outcomes & wager virtual coins</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">⚡</span>
                </div>
                <p className="text-xs text-gray-300 font-medium">Compete</p>
                <p className="text-xs text-gray-500 mt-0.5">Climb the leaderboard with wins</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🏆</span>
                </div>
                <p className="text-xs text-gray-300 font-medium">Win</p>
                <p className="text-xs text-gray-500 mt-0.5">Prove you know cricket best</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
