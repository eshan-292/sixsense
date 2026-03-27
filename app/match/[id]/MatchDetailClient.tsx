"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTeamColor, formatCoins } from "@/lib/utils";
import MarketCard from "@/components/MarketCard";
import ShareButton from "@/components/ShareButton";
import type { Match, Market, Prediction, Profile } from "@/lib/types";

export default function MatchDetailClient({
  match,
  initialMarkets,
}: {
  match: Match;
  initialMarkets: Market[];
}) {
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionCounts, setPredictionCounts] = useState<
    Record<string, Record<string, number>>
  >({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p);

      const marketIds = markets.map((m) => m.id);
      if (marketIds.length > 0) {
        const { data: preds } = await supabase
          .from("predictions")
          .select("*")
          .eq("user_id", user.id)
          .in("market_id", marketIds);
        setPredictions(preds || []);
      }
    }

    const counts: Record<string, Record<string, number>> = {};
    for (const market of markets) {
      const { data: allPreds } = await supabase
        .from("predictions")
        .select("selected_option_id")
        .eq("market_id", market.id);

      counts[market.id] = {};
      allPreds?.forEach((p) => {
        counts[market.id][p.selected_option_id] =
          (counts[market.id][p.selected_option_id] || 0) + 1;
      });
    }
    setPredictionCounts(counts);
  }, [markets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalWagered = predictions.reduce((sum, p) => sum + p.coins_wagered, 0);
  const totalWon = predictions.reduce((sum, p) => sum + (p.coins_won || 0), 0);

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Match Header */}
          <div className="glass-card rounded-2xl p-6 gradient-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500">
                  {new Date(match.match_date).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {new Date(match.match_date).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" IST"}
                </p>
              </div>
              {match.status === "live" && (
                <span className="text-xs bg-green-500/10 text-green-400 px-3 py-1 rounded-full font-medium live-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> LIVE
                </span>
              )}
              {match.status === "completed" && (
                <span className="text-xs bg-gray-500/10 text-gray-400 px-3 py-1 rounded-full font-medium">
                  Completed
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center gap-3 flex-1">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${getTeamColor(match.team_a_short)} flex items-center justify-center text-sm sm:text-base font-bold team-badge`}
                >
                  {match.team_a_short}
                </div>
                <p className="text-sm font-semibold text-white text-center leading-tight">
                  {match.team_a}
                </p>
              </div>

              <div className="flex flex-col items-center px-2">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-500">VS</span>
                </div>
                {match.result && (
                  <span className="text-xs text-green-400 mt-2 font-medium">
                    {match.result === "team_a_win"
                      ? `${match.team_a_short} Won`
                      : match.result === "team_b_win"
                        ? `${match.team_b_short} Won`
                        : "No Result"}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 flex-1">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${getTeamColor(match.team_b_short)} flex items-center justify-center text-sm sm:text-base font-bold team-badge`}
                >
                  {match.team_b_short}
                </div>
                <p className="text-sm font-semibold text-white text-center leading-tight">
                  {match.team_b}
                </p>
              </div>
            </div>

            {match.venue && (
              <p className="text-xs text-gray-600 mt-5 text-center">
                📍 {match.venue}
              </p>
            )}

            <div className="mt-4 flex justify-center">
              <ShareButton
                text={`🏏 I'm predicting ${match.team_a_short} vs ${match.team_b_short} on SixSense!`}
              />
            </div>
          </div>

          {/* Your Stats for this match */}
          {profile && predictions.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-indigo-400">{predictions.length}</p>
                <p className="text-[10px] text-gray-500">Predictions</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-yellow-400">🪙 {formatCoins(totalWagered)}</p>
                <p className="text-[10px] text-gray-500">Wagered</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${totalWon > 0 ? "text-green-400" : "text-gray-500"}`}>
                  {totalWon > 0 ? `+🪙 ${formatCoins(totalWon)}` : "—"}
                </p>
                <p className="text-[10px] text-gray-500">Won</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Markets */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
            Prediction Markets
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent" />
        </div>

        {markets.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl">
            <p className="text-4xl mb-3">🔮</p>
            <p className="text-gray-400">No markets available yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              Check back closer to match time!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {markets.map((market) => {
              const existingPred = predictions.find(
                (p) => p.market_id === market.id
              );
              const counts = predictionCounts[market.id] || {};
              const total = Object.values(counts).reduce((a, b) => a + b, 0);

              return (
                <MarketCard
                  key={market.id}
                  market={market}
                  predictionCounts={counts}
                  totalPredictions={total}
                  existingPrediction={existingPred}
                  userProfile={profile}
                  onPredictionPlaced={loadData}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
