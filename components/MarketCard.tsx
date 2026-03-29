"use client";

import { useState, useRef, useEffect } from "react";
import { formatCoins } from "@/lib/utils";
import { useToast } from "./Toast";
import type { Market, MarketTier, Prediction, Profile } from "@/lib/types";

const SSR_REWARDS: Record<MarketTier, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

// Total virtual seed pool — distributed proportionally to initial odds
// Options with lower odds (more likely) get more seed, higher odds (less likely) get less
// This makes displayed odds match initial odds when no one has bet yet
const TOTAL_SEED = 1000;

function getOptionSeed(option: { odds: number }, allOptions: { odds: number }[]): number {
  // Seed proportional to implied probability (1/odds)
  const totalImpliedProb = allOptions.reduce((sum, o) => sum + 1 / o.odds, 0);
  const impliedProb = 1 / option.odds;
  return Math.round((impliedProb / totalImpliedProb) * TOTAL_SEED);
}

function calculateLiveOdds(
  options: { id: string; odds: number }[],
  pools: Record<string, number>
): Record<string, number> {
  const totalPool = options.reduce(
    (sum, o) => sum + (pools[o.id] || 0) + getOptionSeed(o, options),
    0
  );
  const odds: Record<string, number> = {};
  for (const o of options) {
    const optionPool = (pools[o.id] || 0) + getOptionSeed(o, options);
    odds[o.id] = Math.round((totalPool / optionPool) * 100) / 100;
  }
  return odds;
}

const WAGER_PRESETS = [10, 50, 100, 200];

interface Props {
  market: Market;
  predictionCounts: Record<string, number>;
  totalPredictions: number;
  predictionPools?: Record<string, number>;
  existingPrediction?: Prediction;
  userProfile: Profile | null;
  onPredictionPlaced: () => void;
  parlayMode?: boolean;
  isParlaySelected?: boolean;
  onParlayToggle?: (marketId: string, optionId: string | null) => void;
  matchTeams?: string;
  matchUrl?: string;
}

export default function MarketCard({
  market,
  predictionCounts,
  totalPredictions,
  predictionPools = {},
  existingPrediction,
  userProfile,
  onPredictionPlaced,
  parlayMode,
  isParlaySelected,
  onParlayToggle,
  matchTeams = "",
  matchUrl = "",
}: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wager, setWager] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const isLocked = market.status !== "open";
  const hasPredicted = !!existingPrediction;
  const tier = market.tier || "easy";
  const ssrReward = SSR_REWARDS[tier];

  const liveOdds = calculateLiveOdds(market.options, predictionPools);

  // Track previous odds for flash animation
  const prevOddsRef = useRef<Record<string, number>>({});
  const [oddsFlash, setOddsFlash] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const prev = prevOddsRef.current;
    const flashes: Record<string, "up" | "down"> = {};
    let hasFlash = false;
    for (const optId of Object.keys(liveOdds)) {
      if (prev[optId] !== undefined && prev[optId] !== liveOdds[optId]) {
        flashes[optId] = liveOdds[optId] > prev[optId] ? "up" : "down";
        hasFlash = true;
      }
    }
    prevOddsRef.current = { ...liveOdds };
    if (hasFlash) {
      setOddsFlash(flashes);
      const timer = setTimeout(() => setOddsFlash({}), 1000);
      return () => clearTimeout(timer);
    }
  }, [liveOdds]);

  const handlePredict = async () => {
    if (!selectedOption || !userProfile) return;
    if (wager < 10 || wager > 500) {
      setError("Wager must be 10-500 coins");
      return;
    }
    if (wager > userProfile.coins) {
      setError("Not enough coins!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: market.id,
          selected_option_id: selectedOption,
          coins_wagered: wager,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place prediction");

      const pickedOption = market.options.find((o) => o.id === selectedOption);
      const pickedLabel = pickedOption?.label || "";
      const lockedOdds = liveOdds[selectedOption] || pickedOption?.odds || 1;
      let toastMsg = `Predicted "${pickedLabel}" for ${wager} coins`;
      if (data.daily_bonus > 0) toastMsg += ` | +${data.daily_bonus} bonus!`;
      if (data.safety_net) toastMsg += ` | Balance restored to 2,000`;
      showToast(toastMsg, "success");

      onPredictionPlaced();
      setSelectedOption(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedOdds = selectedOption ? (liveOdds[selectedOption] || 0) : 0;
  const potentialWin = Math.floor(wager * selectedOdds);
  const maxWager = Math.min(500, userProfile?.coins || 500);

  return (
    <div className={`card p-4 ${isParlaySelected ? "ring-2 ring-[#e63946]/40" : ""}`}>
      {/* Question */}
      <h3 className="text-sm font-semibold text-white mb-3">{market.question}</h3>

      {/* Options */}
      <div className="space-y-2">
        {market.options.map((option) => {
          const count = predictionCounts[option.id] || 0;
          const pct = totalPredictions > 0 ? (count / totalPredictions) * 100 : 0;
          const isSelected = selectedOption === option.id;
          const isPredicted = existingPrediction?.selected_option_id === option.id;
          const isCorrect = market.status === "settled" && market.correct_option_id === option.id;
          const isWrongPick = market.status === "settled" && isPredicted && market.correct_option_id !== option.id;

          return (
            <button
              key={option.id}
              onClick={() => {
                if (isLocked || hasPredicted) return;
                if (parlayMode && onParlayToggle) {
                  onParlayToggle(market.id, isSelected ? null : option.id);
                  setSelectedOption(isSelected ? null : option.id);
                } else {
                  setSelectedOption(isSelected ? null : option.id);
                }
              }}
              disabled={isLocked || hasPredicted}
              className={`w-full relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
                isCorrect
                  ? "border-[#2ecc71]/40 bg-[#2ecc71]/8"
                  : isWrongPick
                    ? "border-[#e63946]/30 bg-[#e63946]/5"
                    : isPredicted
                      ? "border-blue-500/40 bg-blue-500/8"
                      : isSelected
                        ? "border-[#e63946] bg-[#e63946]/10"
                        : "border-[#243040] hover:border-[#334155]"
              } ${isLocked || hasPredicted ? "cursor-default" : "cursor-pointer active:scale-[0.99]"}`}
            >
              {/* Progress bar */}
              <div
                className={`absolute inset-0 ${
                  isCorrect ? "bg-[#2ecc71]/6" : isSelected || isPredicted ? "bg-[#e63946]/5" : "bg-white/[0.02]"
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPredicted && market.status !== "settled" && (
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px] text-blue-400">✓</span>
                  )}
                  {isCorrect && <span className="text-xs">🏆</span>}
                  {isWrongPick && <span className="text-xs text-[#e63946]">✗</span>}
                  {isSelected && !isPredicted && (
                    <span className="w-2 h-2 rounded-full bg-[#e63946]" />
                  )}
                  <span className={`text-sm ${isSelected || isPredicted ? "text-white font-medium" : "text-[#e8eaed]"}`}>
                    {option.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="text-[11px] text-[#556677]">
                      {count} {count === 1 ? "bet" : "bets"}
                    </span>
                  )}
                  <span
                    className={`text-sm font-bold font-mono ${
                      oddsFlash[option.id] === "up"
                        ? "odds-flash-up"
                        : oddsFlash[option.id] === "down"
                          ? "odds-flash-down"
                          : ""
                    } ${isSelected ? "text-[#e63946]" : "text-[#8899a6]"}`}
                  >
                    {liveOdds[option.id]?.toFixed(2)}x
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Existing prediction summary */}
      {hasPredicted && (
        <div className="mt-3 py-2.5 px-3 bg-[#151f2b] rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8899a6]">
              Wagered <span className="text-white font-medium">{formatCoins(existingPrediction!.coins_wagered)}</span>
              {existingPrediction!.locked_odds && (
                <span className="text-[#556677]"> at {existingPrediction!.locked_odds.toFixed(2)}x</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {existingPrediction!.coins_won !== null && (
                existingPrediction!.coins_won > 0 ? (
                  <span className="text-xs font-semibold text-[#2ecc71]">+{formatCoins(existingPrediction!.coins_won)}</span>
                ) : (
                  <span className="text-xs font-semibold text-[#e63946]">Lost</span>
                )
              )}
              {existingPrediction!.coins_won === null && (
                <span className="text-xs text-[#f5a623] font-medium">Pending</span>
              )}
              <button
                onClick={() => {
                  const pickedOption = market.options.find(o => o.id === existingPrediction!.selected_option_id);
                  const text = `I predicted "${pickedOption?.label}" on "${market.question}" on SixSense! ${matchUrl || window.location.href}`;
                  if (navigator.share) {
                    navigator.share({ text });
                  } else {
                    navigator.clipboard.writeText(text);
                    showToast("Copied to clipboard!", "success");
                  }
                }}
                className="text-[11px] text-[#556677] hover:text-white transition-colors"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wager UI */}
      {!parlayMode && !isLocked && !hasPredicted && selectedOption && userProfile && (
        <div className="mt-4 pt-4 border-t border-[#243040]">
          {/* Preset buttons */}
          <div className="flex items-center gap-2 mb-2">
            {WAGER_PRESETS.filter(v => v <= maxWager).map((preset) => (
              <button
                key={preset}
                onClick={() => setWager(preset)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  wager === preset
                    ? "bg-[#e63946] text-white"
                    : "bg-[#151f2b] text-[#8899a6] border border-[#243040]"
                }`}
              >
                {preset}
              </button>
            ))}
            <button
              onClick={() => setWager(maxWager)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                wager === maxWager && !WAGER_PRESETS.includes(maxWager)
                  ? "bg-[#e63946] text-white"
                  : "bg-[#151f2b] text-[#8899a6] border border-[#243040]"
              }`}
            >
              Max
            </button>
          </div>

          {/* Slider */}
          <div className="mb-3">
            <input
              type="range"
              min={10}
              max={maxWager}
              step={50}
              value={wager}
              onChange={(e) => setWager(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center justify-between text-[11px] text-[#556677] mt-1">
              <span>100</span>
              <span className="text-sm font-bold text-[#f5a623]">{wager} coins</span>
              <span>{maxWager}</span>
            </div>
          </div>

          {/* Hero potential win */}
          <div className="text-center mb-3">
            <span className="text-[#8899a6] text-xs">Bet {wager} →</span>
            <span className="text-2xl font-bold text-[#2ecc71] ml-2">
              Win {formatCoins(potentialWin)}
            </span>
          </div>

          {error && (
            <p className="text-xs text-[#e63946] bg-[#e63946]/10 px-3 py-2 rounded-lg mb-3">
              {error}
            </p>
          )}

          {/* Predict button */}
          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full bg-[#e63946] hover:bg-[#d32f3c] active:bg-[#c5303c] text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Placing...
              </span>
            ) : (
              `Predict & Wager ${wager} coins`
            )}
          </button>
        </div>
      )}

      {!userProfile && !isLocked && (
        <p className="mt-3 text-xs text-[#556677] text-center">
          Sign in to make predictions
        </p>
      )}

    </div>
  );
}
