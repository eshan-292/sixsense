"use client";

import { useState } from "react";
import { formatCoins } from "@/lib/utils";
import { useToast } from "./Toast";
import type { Market, Prediction, Profile } from "@/lib/types";

interface Props {
  market: Market;
  predictionCounts: Record<string, number>;
  totalPredictions: number;
  existingPrediction?: Prediction;
  userProfile: Profile | null;
  onPredictionPlaced: () => void;
}

export default function MarketCard({
  market,
  predictionCounts,
  totalPredictions,
  existingPrediction,
  userProfile,
  onPredictionPlaced,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wager, setWager] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const isLocked = market.status !== "open";
  const hasPredicted = !!existingPrediction;

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

      const pickedLabel = market.options.find((o) => o.id === selectedOption)?.label;
      showToast(`Prediction placed! "${pickedLabel}" for 🪙 ${wager}`, "success");
      onPredictionPlaced();
      setSelectedOption(null);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedOdds = market.options.find((o) => o.id === selectedOption)?.odds || 0;
  const potentialWin = Math.floor(wager * selectedOdds);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{market.question}</h3>
        <div className="shrink-0 ml-2">
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
              onClick={() =>
                !isLocked && !hasPredicted && setSelectedOption(option.id)
              }
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
                    <span className="text-xs">✓</span>
                  )}
                  {isCorrect && <span className="text-xs">🏆</span>}
                  {isWrongPick && <span className="text-xs">✗</span>}
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
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-gray-800/50 text-gray-500"
                    }`}
                  >
                    {option.odds}x
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
                🪙 {formatCoins(existingPrediction!.coins_wagered)}
              </span>
              {existingPrediction!.coins_won !== null && (
                <span>
                  {" → "}
                  {existingPrediction!.coins_won > 0 ? (
                    <span className="text-green-400 font-semibold">
                      Won 🪙 {formatCoins(existingPrediction!.coins_won)}
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold">Lost</span>
                  )}
                </span>
              )}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const pickedOption = market.options.find(
                  (o) => o.id === existingPrediction!.selected_option_id
                );
                const text = `🏏 I predicted "${pickedOption?.label}" on "${market.question}" with ${formatCoins(existingPrediction!.coins_wagered)} coins on SixSense!${existingPrediction!.coins_won !== null && existingPrediction!.coins_won > 0 ? ` Won ${formatCoins(existingPrediction!.coins_won)} coins! 🎉` : ""}`;
                if (navigator.share) {
                  navigator.share({ text, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                  showToast("Copied to clipboard!", "success");
                }
              }}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 ml-2"
            >
              Share →
            </button>
          </div>
        </div>
      )}

      {/* Wager UI */}
      {!isLocked && !hasPredicted && selectedOption && userProfile && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Wager Amount</label>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-yellow-400">🪙 {wager}</span>
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
            <span>Potential win: <span className="text-green-400 font-medium">🪙 {formatCoins(potentialWin)}</span></span>
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
              `Predict & Wager 🪙 ${wager}`
            )}
          </button>
        </div>
      )}

      {!userProfile && !isLocked && (
        <p className="mt-3 text-xs text-gray-600 text-center">
          Sign in to make predictions
        </p>
      )}
    </div>
  );
}
