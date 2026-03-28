"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTeamColor, formatCoins } from "@/lib/utils";
import MarketCard from "@/components/MarketCard";
import LiveScoreWidget from "@/components/LiveScoreWidget";
import WinCelebration from "@/components/WinCelebration";
import TeamBadge from "@/components/TeamBadge";
import Link from "next/link";
import type { Match, Market, MarketTier, Prediction, Profile } from "@/lib/types";

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
  const [predictionCounts, setPredictionCounts] = useState<Record<string, Record<string, number>>>({});
  const [predictionPools, setPredictionPools] = useState<Record<string, Record<string, number>>>({});
  const [profile, setProfile] = useState<Profile | null>(null);

  // Parlay state
  const [parlayMode, setParlayMode] = useState(false);
  const [parlaySelections, setParlaySelections] = useState<Record<string, string>>({});
  const [parlayWager, setParlayWager] = useState(200);
  const [parlayLoading, setParlayLoading] = useState(false);
  const [parlayError, setParlayError] = useState("");
  const [parlaySuccess, setParlaySuccess] = useState("");
  const [winCelebration, setWinCelebration] = useState<{
    marketId: string;
    question: string;
    selectedOption: string;
    odds: number;
    coinsWagered: number;
    coinsWon: number;
    ssrEarned: number;
  } | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
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
        counts[market.id][p.selected_option_id] = (counts[market.id][p.selected_option_id] || 0) + 1;
        pools[market.id][p.selected_option_id] = (pools[market.id][p.selected_option_id] || 0) + p.coins_wagered;
      });
    }
    setPredictionCounts(counts);
    setPredictionPools(pools);
  }, [markets]);

  useEffect(() => { loadData(); }, [loadData]);

  // Win detection
  useEffect(() => {
    if (predictions.length === 0 || markets.length === 0) return;
    for (const pred of predictions) {
      const market = markets.find((m) => m.id === pred.market_id);
      if (!market || market.status !== "settled") continue;
      if (!pred.coins_won || pred.coins_won <= 0) continue;
      const dismissKey = `sixsense_win_dismissed_${pred.market_id}`;
      if (typeof window !== "undefined" && localStorage.getItem(dismissKey)) continue;
      const option = market.options.find((o) => o.id === pred.selected_option_id);
      setWinCelebration({
        marketId: pred.market_id,
        question: market.question,
        selectedOption: option?.label || "",
        odds: pred.locked_odds || option?.odds || 1,
        coinsWagered: pred.coins_wagered,
        coinsWon: pred.coins_won,
        ssrEarned: pred.ssr_earned || 0,
      });
      break;
    }
  }, [predictions, markets]);

  // Real-time subscription
  useEffect(() => {
    const marketIds = markets.map((m) => m.id);
    if (marketIds.length === 0) return;

    const channel = supabase
      .channel(`match-predictions-${match.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "predictions", filter: `market_id=in.(${marketIds.join(",")})` },
        (payload) => {
          const newPred = payload.new as { market_id: string; selected_option_id: string; coins_wagered: number };
          setPredictionCounts((prev) => {
            const updated = { ...prev };
            if (!updated[newPred.market_id]) updated[newPred.market_id] = {};
            updated[newPred.market_id] = { ...updated[newPred.market_id] };
            updated[newPred.market_id][newPred.selected_option_id] = (updated[newPred.market_id][newPred.selected_option_id] || 0) + 1;
            return updated;
          });
          setPredictionPools((prev) => {
            const updated = { ...prev };
            if (!updated[newPred.market_id]) updated[newPred.market_id] = {};
            updated[newPred.market_id] = { ...updated[newPred.market_id] };
            updated[newPred.market_id][newPred.selected_option_id] = (updated[newPred.market_id][newPred.selected_option_id] || 0) + newPred.coins_wagered;
            return updated;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [markets, match.id, supabase]);

  // Sort markets: easy → medium → hard
  const sortedMarkets = [...markets].sort((a, b) => {
    const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
    return (order[a.tier || "easy"] || 0) - (order[b.tier || "easy"] || 0);
  });

  // Parlay helpers
  const parlayEntries = Object.entries(parlaySelections);
  const parlayCount = parlayEntries.length;
  const combinedOdds = parlayEntries.reduce((acc, [marketId, optionId]) => {
    const mPools = predictionPools[marketId] || {};
    const market = markets.find((m) => m.id === marketId);
    if (!market) return acc;
    const hasRealBets = Object.values(mPools).some((v) => v > 0);
    if (hasRealBets) {
      const BASE = 500;
      const totalPool = market.options.reduce((s, o) => s + (mPools[o.id] || 0) + BASE, 0);
      const optPool = (mPools[optionId] || 0) + BASE;
      return acc * (totalPool / optPool);
    }
    const option = market.options.find((o) => o.id === optionId);
    return acc * (option?.odds || 1);
  }, 1);
  const potentialParlayPayout = Math.floor(parlayWager * combinedOdds);

  const handleParlayToggle = (marketId: string, optionId: string | null) => {
    setParlaySelections((prev) => {
      const next = { ...prev };
      if (optionId === null) { delete next[marketId]; }
      else {
        if (Object.keys(next).length >= 4 && !next[marketId]) return prev;
        next[marketId] = optionId;
      }
      return next;
    });
  };

  const handlePlaceParlay = async () => {
    if (parlayCount < 2) { setParlayError("Select at least 2 markets"); return; }
    if (!profile) return;
    if (parlayWager > profile.coins) { setParlayError("Not enough coins!"); return; }

    setParlayLoading(true);
    setParlayError("");
    setParlaySuccess("");

    try {
      const res = await fetch("/api/parlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: match.id,
          predictions: parlayEntries.map(([market_id, selected_option_id]) => ({ market_id, selected_option_id })),
          coins_wagered: parlayWager,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place parlay");
      setParlaySuccess(`Parlay placed! ${parlayCount} picks for ${formatCoins(parlayWager)} coins`);
      setParlaySelections({});
      setParlayMode(false);
      loadData();
    } catch (err: unknown) {
      setParlayError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setParlayLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-3 pb-4">
      {/* Back */}
      <Link href="/" className="inline-flex items-center text-xs text-[#8899a6] hover:text-white mb-3 transition-colors">
        ← Back
      </Link>

      {/* Match Header — compact */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-[#8899a6]">
            {new Date(match.match_date).toLocaleDateString("en-IN", {
              weekday: "short", day: "numeric", month: "short",
            })}
            {" · "}
            {new Date(match.match_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            {match.venue && ` · ${match.venue}`}
          </span>
          {match.status === "live" && (
            <span className="text-[11px] bg-[#e63946]/15 text-[#e63946] px-2.5 py-1 rounded-md font-semibold live-pulse flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e63946]" /> LIVE
            </span>
          )}
          {match.status === "completed" && (
            <span className="text-[11px] bg-[#243040] text-[#8899a6] px-2.5 py-1 rounded-md font-medium">
              Completed
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamBadge shortName={match.team_a_short} size="lg" />
            <span className="text-sm font-semibold text-white">{match.team_a_short}</span>
          </div>

          <div className="flex flex-col items-center px-4">
            <span className="text-xs font-bold text-[#556677]">VS</span>
            {match.result && (
              <span className="text-[11px] text-[#2ecc71] mt-1 font-medium">
                {match.result === "team_a_win" ? `${match.team_a_short} Won`
                  : match.result === "team_b_win" ? `${match.team_b_short} Won`
                    : "No Result"}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamBadge shortName={match.team_b_short} size="lg" />
            <span className="text-sm font-semibold text-white">{match.team_b_short}</span>
          </div>
        </div>
      </div>

      {/* Live Score */}
      <LiveScoreWidget
        teamA={match.team_a}
        teamB={match.team_b}
        teamAShort={match.team_a_short}
        teamBShort={match.team_b_short}
        matchStatus={match.status}
      />

      {/* Betting locked */}
      {!bettingOpen && match.status === "upcoming" && (
        <div className="card p-4 mb-4 border-[#f5a623]/20 text-center">
          <p className="text-sm text-[#f5a623] font-medium">🔒 Predictions Not Open Yet</p>
          <p className="text-xs text-[#556677] mt-1">Check back closer to match time!</p>
        </div>
      )}

      {/* Section header + Parlay toggle */}
      {sortedMarkets.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#8899a6] uppercase tracking-wider">
            Predictions
          </h2>
          {profile && bettingOpen && match.status !== "completed" && markets.length > 1 && (
            <button
              onClick={() => {
                setParlayMode(!parlayMode);
                if (parlayMode) { setParlaySelections({}); setParlayError(""); }
              }}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                parlayMode
                  ? "bg-[#e63946] text-white"
                  : "bg-[#1a2332] text-[#8899a6] border border-[#243040] hover:text-white"
              }`}
            >
              {parlayMode ? "✕ Cancel" : "⚡ Parlay"}
            </button>
          )}
        </div>
      )}

      {/* Markets — flat list */}
      {sortedMarkets.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-3xl mb-3">🔮</p>
          <p className="text-[#8899a6]">No predictions available yet.</p>
          <p className="text-[#556677] text-xs mt-1">Check back closer to match time!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMarkets.map((market) => {
            const existingPred = predictions.find((p) => p.market_id === market.id);
            const counts = predictionCounts[market.id] || {};
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const pools = predictionPools[market.id] || {};
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
                matchTeams={`${match.team_a_short} vs ${match.team_b_short}`}
                matchUrl={typeof window !== "undefined" ? window.location.href : ""}
              />
            );
          })}
        </div>
      )}

      {/* Parlay bar — sticky at bottom */}
      {parlayMode && parlayCount > 0 && profile && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-[#0f1923] border-t border-[#243040] p-4 animate-slide-up safe-area-bottom">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold text-white">{parlayCount} picks</span>
                <span className="text-sm text-[#8899a6] mx-2">·</span>
                <span className="text-sm font-bold text-[#f5a623]">{combinedOdds.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-2">
                {[200, 500].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setParlayWager(preset)}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      parlayWager === preset ? "bg-[#e63946] text-white" : "bg-[#1a2332] text-[#8899a6]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center mb-3">
              <span className="text-xs text-[#8899a6]">Bet {parlayWager} →</span>
              <span className="text-xl font-bold text-[#2ecc71] ml-2">Win {formatCoins(potentialParlayPayout)}</span>
            </div>

            {parlayError && <p className="text-xs text-[#e63946] mb-2">{parlayError}</p>}
            {parlaySuccess && <p className="text-xs text-[#2ecc71] mb-2">{parlaySuccess}</p>}

            <button
              onClick={handlePlaceParlay}
              disabled={parlayLoading || parlayCount < 2}
              className="w-full bg-[#e63946] hover:bg-[#d32f3c] text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {parlayLoading ? "Placing..." : parlayCount < 2
                ? `Select ${2 - parlayCount} more`
                : `Place Parlay — Win ${formatCoins(potentialParlayPayout)}`}
            </button>
          </div>
        </div>
      )}

      {/* Win Celebration */}
      {winCelebration && (
        <WinCelebration
          matchTeams={`${match.team_a_short} vs ${match.team_b_short}`}
          question={winCelebration.question}
          selectedOption={winCelebration.selectedOption}
          odds={winCelebration.odds}
          coinsWagered={winCelebration.coinsWagered}
          coinsWon={winCelebration.coinsWon}
          ssrEarned={winCelebration.ssrEarned}
          matchUrl={typeof window !== "undefined" ? window.location.href : ""}
          onClose={() => {
            localStorage.setItem(`sixsense_win_dismissed_${winCelebration.marketId}`, "1");
            setWinCelebration(null);
          }}
        />
      )}
    </div>
  );
}
