"use client";

import { useState, useRef, useEffect } from "react";
import { formatCoins } from "@/lib/utils";
import { useToast } from "./Toast";
import PredictionShareCard from "./PredictionShareCard";
import type { Market, MarketTier, Prediction, Profile } from "@/lib/types";

const SSR_REWARDS: Record<MarketTier, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

const TIER_CONFIG: Record<MarketTier, { label: string; color: string; bgColor: string }> = {
  easy: { label: "Safe Pick", color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/20" },
  medium: { label: "Smart Call", color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20" },
  hard: { label: "Bold Prediction", color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20" },
};

// Base virtual liquidity per option (prevents extreme odds with few bets)
const BASE_LIQUIDITY = 500;

function calculateLiveOdds(
  options: { id: string; odds: number }[],
  pools: Record<string, number>
): Record<string, number> {
  const totalPool = options.reduce(
    (sum, o) => sum + (pools[o.id] || 0) + BASE_LIQUIDITY,
    0
  );
  const odds: Record<string, number> = {};
  for (const o of options) {
    const optionPool = (pools[o.id] || 0) + BASE_LIQUIDITY;
    odds[o.id] = Math.round((totalPool / optionPool) * 100) / 100;
  }
  return odds;
}

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
  const [wager, setWager] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareCardData, setShareCardData] = useState<{
    selectedOption: string;
    odds: number;
    wager: number;
    potentialWin: number;
  } | null>(null);
  const { showToast } = useToast();

  const isLocked = market.status !== "open";
  const hasPredicted = !!existingPrediction;
  const tier = market.tier || "easy";
  const tierConfig = TIER_CONFIG[tier];
  const ssrReward = SSR_REWARDS[tier];

  // Calculate live odds from prediction pools
  // Start with equal odds for all options; crowd shifts them
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
    if (wager < 100 || wager > 1000) {
      setError("Wager must be between 100 and 1,000 coins");
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
      let toastMsg = `Prediction placed! "${pickedLabel}" for ${wager} coins`;
      if (data.daily_bonus > 0) {
        toastMsg += ` | +${data.daily_bonus} daily bonus!`;
      }
      if (data.safety_net) {
        toastMsg += ` | Safety net applied - balance restored to 2,000`;
      }
      showToast(toastMsg, "success");

      // Show share card
      setShareCardData({
        selectedOption: pickedLabel,
        odds: lockedOdds,
        wager,
        potentialWin: Math.floor(wager * lockedOdds),
      });
      setShowShareCard(true);

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

  return (
    <div className={`glass-card rounded-xl p-4 ${isParlaySelected ? "ring-2 ring-indigo-500/50" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{market.question}</h3>
        <div className="shrink-0 ml-2 flex items-center gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${tierConfig.bgColor}`}>
            <span className={tierConfig.color}>{tierConfig.label}</span>
          </span>
          <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">
            +{ssrReward} SSR
          </span>
          {market.status === "settled" && (
            <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">
              Settled
            </span>
          )}
          {market.status === "locked" && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
              Locked
            </span>
          )}
          {market.status === "open" && (
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              Open
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {market.options.map((option) => {
          const count = predictionCounts[option.id] || 0;
          const pct =
            totalPredictions > 0 ? (count / totalPredictions) * 100 : 0;
          const isSelected = selectedOption === option.id;
          const isPredicted =
            existingPrediction?.selected_option_id === option.id;
          const isCorrect =
            market.status === "settled" &&
            market.correct_option_id === option.id;
          const isWrongPick =
            market.status === "settled" &&
            isPredicted &&
            market.correct_option_id !== option.id;

          return (
            <button
              key={option.id}
              onClick={() => {
                if (isLocked || hasPredicted) return;
                if (parlayMode && onParlayToggle) {
                  onParlayToggle(market.id, isSelected ? null : option.id);
                  setSelectedOption(isSelected ? null : option.id);
                } else {
                  setSelectedOption(option.id);
                }
              }}
              disabled={isLocked || hasPredicted}
              className={`w-full relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
                isCorrect
                  ? "border-green-500/50 bg-green-500/10"
                  : isWrongPick
                    ? "border-red-500/30 bg-red-500/5"
                    : isPredicted
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : isSelected
                        ? "border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
                        : "border-gray-700/50 hover:border-gray-600"
              } ${isLocked || hasPredicted ? "cursor-default" : "cursor-pointer"}`}
            >
              {/* Progress bar background */}
              <div
                className={`absolute inset-0 transition-all ${
                  isCorrect
                    ? "bg-green-500/10"
                    : isSelected || isPredicted
                      ? "bg-indigo-500/5"
                      : "bg-gray-700/10"
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPredicted && !isCorrect && market.status !== "settled" && (
                    <span className="text-xs">&#10003;</span>
                  )}
                  {isCorrect && <span className="text-xs">&#127942;</span>}
                  {isWrongPick && <span className="text-xs">&#10007;</span>}
                  {isSelected && !isPredicted && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  )}
                  <span
                    className={`text-sm ${
                      isSelected || isPredicted
                        ? "text-white font-medium"
                        : "text-gray-300"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded transition-colors duration-300 ${
                      oddsFlash[option.id] === "up"
                        ? "odds-flash-up"
                        : oddsFlash[option.id] === "down"
                          ? "odds-flash-down"
                          : ""
                    } ${
                      isSelected
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-gray-800/50 text-gray-500"
                    }`}
                  >
                    {liveOdds[option.id]?.toFixed(2)}x · Win {formatCoins(Math.floor(wager * (liveOdds[option.id] || option.odds)))}
                  </span>
                  {totalPredictions > 0 && (
                    <span className="text-[10px] text-gray-600 min-w-[28px] text-right">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Existing prediction summary */}
      {hasPredicted && (
        <div className="mt-3 p-2.5 bg-indigo-500/5 border border-indigo-500/15 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs text-indigo-300">
              You wagered{" "}
              <span className="font-semibold">
                {formatCoins(existingPrediction!.coins_wagered)} coins
              </span>
              {existingPrediction!.coins_won !== null && (
                <span>
                  {" -> "}
                  {existingPrediction!.coins_won > 0 ? (
                    <span className="text-green-400 font-semibold">
                      Won {formatCoins(existingPrediction!.coins_won)} coins
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold">Lost</span>
                  )}
                </span>
              )}
              {existingPrediction!.ssr_earned !== undefined && existingPrediction!.ssr_earned !== 0 && (
                <span className={`ml-1 ${existingPrediction!.ssr_earned > 0 ? "text-purple-400" : "text-red-400"}`}>
                  ({existingPrediction!.ssr_earned > 0 ? "+" : ""}{existingPrediction!.ssr_earned} SSR)
                </span>
              )}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const pickedOption = market.options.find(
                  (o) => o.id === existingPrediction!.selected_option_id
                );
                const text = `I predicted "${pickedOption?.label}" on "${market.question}" with ${formatCoins(existingPrediction!.coins_wagered)} coins on SixSense!${existingPrediction!.coins_won !== null && existingPrediction!.coins_won > 0 ? ` Won ${formatCoins(existingPrediction!.coins_won)} coins!` : ""}`;
                if (navigator.share) {
                  navigator.share({ text, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                  showToast("Copied to clipboard!", "success");
                }
              }}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 ml-2"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {/* Wager UI (only in non-parlay mode) */}
      {!parlayMode && !isLocked && !hasPredicted && selectedOption && userProfile && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Wager Amount</label>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-yellow-400">{wager} coins</span>
              <span className="text-[10px] text-gray-600">
                / {formatCoins(userProfile.coins)}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={100}
            max={Math.min(1000, userProfile.coins)}
            step={100}
            value={wager}
            onChange={(e) => setWager(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <span>100</span>
            <span>Bet {wager} → <span className="text-green-400 font-medium">Win {formatCoins(potentialWin)}</span> + <span className="text-purple-400 font-medium">+{ssrReward} SSR</span></span>
            <span>{Math.min(1000, userProfile.coins)}</span>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
              {error}
            </p>
          )}

          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
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
        <p className="mt-3 text-xs text-gray-600 text-center">
          Sign in to make predictions
        </p>
      )}

      {showShareCard && shareCardData && (
        <PredictionShareCard
          matchTeams={matchTeams}
          question={market.question}
          selectedOption={shareCardData.selectedOption}
          odds={shareCardData.odds}
          wager={shareCardData.wager}
          potentialWin={shareCardData.potentialWin}
          matchUrl={matchUrl || (typeof window !== "undefined" ? window.location.href : "")}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
