"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTeamColor, formatCoins } from "@/lib/utils";
import MarketCard from "@/components/MarketCard";
import ShareButton from "@/components/ShareButton";
import Link from "next/link";
import type { Match, Market, MarketTier, Prediction, Profile } from "@/lib/types";

const TIER_SECTIONS: { tier: MarketTier; label: string; icon: string; description: string }[] = [
  { tier: "easy", label: "SAFE PICKS", icon: "\u{1F7E2}", description: "+10 SSR per correct" },
  { tier: "medium", label: "SMART CALLS", icon: "\u{1F7E1}", description: "+25 SSR per correct" },
  { tier: "hard", label: "BOLD PREDICTIONS", icon: "\u{1F534}", description: "+50 SSR per correct" },
];

export default function MatchDetailClient({
  match,
  initialMarkets,
  bettingOpen,
}: {
  match: Match;
  initialMarkets: Market[];
  bettingOpen: boolean;
}) {
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionCounts, setPredictionCounts] = useState<
    Record<string, Record<string, number>>
  >({});
  const [predictionPools, setPredictionPools] = useState<
    Record<string, Record<string, number>>
  >({});
  const [profile, setProfile] = useState<Profile | null>(null);

  // Parlay state
  const [parlayMode, setParlayMode] = useState(false);
  const [parlaySelections, setParlaySelections] = useState<
    Record<string, string>
  >({});
  const [parlayWager, setParlayWager] = useState(200);
  const [parlayLoading, setParlayLoading] = useState(false);
  const [parlayError, setParlayError] = useState("");
  const [parlaySuccess, setParlaySuccess] = useState("");

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
    const pools: Record<string, Record<string, number>> = {};
    for (const market of markets) {
      const { data: allPreds } = await supabase
        .from("predictions")
        .select("selected_option_id, coins_wagered")
        .eq("market_id", market.id);

      counts[market.id] = {};
      pools[market.id] = {};
      allPreds?.forEach((p) => {
        counts[market.id][p.selected_option_id] =
          (counts[market.id][p.selected_option_id] || 0) + 1;
        pools[market.id][p.selected_option_id] =
          (pools[market.id][p.selected_option_id] || 0) + p.coins_wagered;
      });
    }
    setPredictionCounts(counts);
    setPredictionPools(pools);
  }, [markets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalWagered = predictions.reduce((sum, p) => sum + p.coins_wagered, 0);
  const totalWon = predictions.reduce((sum, p) => sum + (p.coins_won || 0), 0);

  // Group markets by tier
  const marketsByTier = (tier: MarketTier) =>
    markets.filter((m) => (m.tier || "easy") === tier);

  // Parlay helpers
  const parlayEntries = Object.entries(parlaySelections);
  const parlayCount = parlayEntries.length;

  const combinedOdds = parlayEntries.reduce((acc, [marketId, optionId]) => {
    const pools = predictionPools[marketId] || {};
    const market = markets.find((m) => m.id === marketId);
    if (!market) return acc;
    const hasRealBets = Object.values(pools).some((v) => v > 0);
    if (hasRealBets) {
      const BASE = 500;
      const totalPool = market.options.reduce((s, o) => s + (pools[o.id] || 0) + BASE, 0);
      const optPool = (pools[optionId] || 0) + BASE;
      return acc * (totalPool / optPool);
    }
    const option = market.options.find((o) => o.id === optionId);
    return acc * (option?.odds || 1);
  }, 1);

  const potentialParlayPayout = Math.floor(parlayWager * combinedOdds);

  const handleParlayToggle = (marketId: string, optionId: string | null) => {
    setParlaySelections((prev) => {
      const next = { ...prev };
      if (optionId === null) {
        delete next[marketId];
      } else {
        if (Object.keys(next).length >= 4 && !next[marketId]) {
          return prev; // max 4
        }
        next[marketId] = optionId;
      }
      return next;
    });
  };

  const handlePlaceParlay = async () => {
    if (parlayCount < 2) {
      setParlayError("Select at least 2 markets for a parlay");
      return;
    }
    if (!profile) return;
    if (parlayWager > profile.coins) {
      setParlayError("Not enough coins!");
      return;
    }

    setParlayLoading(true);
    setParlayError("");
    setParlaySuccess("");

    try {
      const res = await fetch("/api/parlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: match.id,
          predictions: parlayEntries.map(([market_id, selected_option_id]) => ({
            market_id,
            selected_option_id,
          })),
          coins_wagered: parlayWager,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place parlay");

      setParlaySuccess(
        `Parlay placed! ${parlayCount} picks combined. Bet ${formatCoins(parlayWager)} to win ${formatCoins(data.potential_payout)}!`
      );
      setParlaySelections({});
      setParlayMode(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setParlayError(message);
    } finally {
      setParlayLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center text-xs text-gray-500 hover:text-gray-300 mb-3 transition-colors"
          >
            &larr; Back to matches
          </Link>

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
                {match.venue}
              </p>
            )}

            <div className="mt-4 flex justify-center">
              <ShareButton
                text={`I'm predicting ${match.team_a_short} vs ${match.team_b_short} on SixSense!`}
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
                <p className="text-lg font-bold text-yellow-400">{formatCoins(totalWagered)}</p>
                <p className="text-[10px] text-gray-500">Wagered</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${totalWon > 0 ? "text-green-400" : "text-gray-500"}`}>
                  {totalWon > 0 ? `+${formatCoins(totalWon)}` : "\u2014"}
                </p>
                <p className="text-[10px] text-gray-500">Won</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Betting locked banner */}
        {!bettingOpen && match.status === "upcoming" && (
          <div className="mt-4 glass-card rounded-xl p-4 border border-yellow-500/20 text-center">
            <p className="text-sm text-yellow-400 font-medium">{"\u{1F512}"} Betting Not Open Yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Predictions will open once the current match concludes. Check back soon!
            </p>
          </div>
        )}

        {/* Markets grouped by tier */}
        {markets.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl mt-4">
            <p className="text-4xl mb-3">{"\u{1F52E}"}</p>
            <p className="text-gray-400">No markets available yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              Check back closer to match time!
            </p>
          </div>
        ) : (
          <>
            {TIER_SECTIONS.map(({ tier, label, icon, description }) => {
              const tierMarkets = marketsByTier(tier);
              if (tierMarkets.length === 0) return null;

              return (
                <div key={tier} className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>{icon}</span> {label}
                      <span className="text-[10px] text-gray-500 font-normal ml-1">({description})</span>
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent" />
                  </div>
                  <div className="space-y-3">
                    {tierMarkets.map((market) => {
                      const existingPred = predictions.find(
                        (p) => p.market_id === market.id
                      );
                      const counts = predictionCounts[market.id] || {};
                      const total = Object.values(counts).reduce((a, b) => a + b, 0);
                      const pools = predictionPools[market.id] || {};

                      // Override market to locked if betting isn't open
                      const displayMarket = !bettingOpen && market.status === "open"
                        ? { ...market, status: "locked" as const }
                        : market;

                      return (
                        <MarketCard
                          key={market.id}
                          market={displayMarket}
                          predictionCounts={counts}
                          totalPredictions={total}
                          predictionPools={pools}
                          existingPrediction={existingPred}
                          userProfile={profile}
                          onPredictionPlaced={loadData}
                          parlayMode={parlayMode}
                          isParlaySelected={!!parlaySelections[market.id]}
                          onParlayToggle={handleParlayToggle}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Parlay Builder */}
            {profile && bettingOpen && match.status !== "completed" && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-purple-500/50 to-transparent" />
                  <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    {"\u26A1"} PARLAY BUILDER
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-l from-purple-500/50 to-transparent" />
                </div>

                <div className="glass-card rounded-xl p-4 border border-purple-500/20">
                  {!parlayMode ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-3">
                        Combine 2-4 predictions for massive payouts! Get them all right to win big.
                      </p>
                      <button
                        onClick={() => setParlayMode(true)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-purple-500/20"
                      >
                        Build a Parlay
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-white">
                          Select 2-4 markets above
                        </p>
                        <button
                          onClick={() => {
                            setParlayMode(false);
                            setParlaySelections({});
                            setParlayError("");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Selected markets summary */}
                      {parlayCount > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {parlayEntries.map(([marketId, optionId]) => {
                            const market = markets.find((m) => m.id === marketId);
                            const option = market?.options.find(
                              (o) => o.id === optionId
                            );
                            return (
                              <div
                                key={marketId}
                                className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-400 truncate">
                                    {market?.question}
                                  </p>
                                  <p className="text-sm text-white font-medium">
                                    {option?.label}
                                  </p>
                                </div>
                                <span className="text-xs text-indigo-400 ml-2">
                                  Win {option ? `${option.odds}x` : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Combined odds display */}
                      <div className="bg-gray-800/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Win Multiplier</span>
                          <span className="text-lg font-bold text-purple-400">
                            {combinedOdds.toFixed(1)}x your bet
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">Wager</label>
                          <span className="text-sm font-bold text-yellow-400">
                            {parlayWager} coins
                          </span>
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={Math.min(2000, profile.coins)}
                          step={100}
                          value={parlayWager}
                          onChange={(e) => setParlayWager(Number(e.target.value))}
                          className="w-full mt-2"
                        />
                        <div className="flex items-center justify-between text-[10px] text-gray-600 mt-1">
                          <span>100</span>
                          <span>
                            Bet {parlayWager} → <span className="text-green-400 font-medium">
                              Win {formatCoins(potentialParlayPayout)}
                            </span>
                          </span>
                          <span>{Math.min(2000, profile.coins)}</span>
                        </div>
                      </div>

                      {parlayError && (
                        <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded mb-3">
                          {parlayError}
                        </p>
                      )}
                      {parlaySuccess && (
                        <p className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded mb-3">
                          {parlaySuccess}
                        </p>
                      )}

                      <button
                        onClick={handlePlaceParlay}
                        disabled={parlayLoading || parlayCount < 2}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                      >
                        {parlayLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Placing Parlay...
                          </span>
                        ) : parlayCount < 2 ? (
                          `Select ${2 - parlayCount} more market${2 - parlayCount > 1 ? "s" : ""}`
                        ) : (
                          `Place Parlay — ${parlayCount} picks → Win ${formatCoins(potentialParlayPayout)}`
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
