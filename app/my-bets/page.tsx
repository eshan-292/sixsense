"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";
import type { Prediction, Market, Parlay } from "@/lib/types";
import Link from "next/link";

type Tab = "active" | "settled" | "parlays";

export default function MyBetsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [predictions, setPredictions] = useState<(Prediction & { market?: Market })[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoggedIn(false); setLoading(false); return; }

      const { data: preds } = await supabase
        .from("predictions")
        .select("*, market:markets(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPredictions(preds || []);

      const { data: parlayData } = await supabase
        .from("parlays")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setParlays(parlayData || []);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-[#e63946]/30 border-t-[#e63946] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-3xl mb-3">📋</p>
        <p className="text-white font-semibold mb-1">Sign in to see your bets</p>
        <p className="text-[#556677] text-sm">Your predictions will appear here</p>
      </div>
    );
  }

  const activePreds = predictions.filter((p) => p.coins_won === null);
  const settledPreds = predictions.filter((p) => p.coins_won !== null);
  const totalWon = settledPreds.filter((p) => p.coins_won! > 0).reduce((s, p) => s + (p.coins_won ?? 0), 0);
  const totalLost = settledPreds.filter((p) => p.coins_won === 0).reduce((s, p) => s + p.coins_wagered, 0);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active", count: activePreds.length },
    { key: "settled", label: "Settled", count: settledPreds.length },
    { key: "parlays", label: "Parlays", count: parlays.length },
  ];

  const currentPreds = tab === "active" ? activePreds : tab === "settled" ? settledPreds : [];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* P&L Summary */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 card p-3 text-center">
          <p className="text-lg font-bold text-[#2ecc71]">+{formatCoins(totalWon)}</p>
          <p className="text-[11px] text-[#556677]">Won</p>
        </div>
        <div className="flex-1 card p-3 text-center">
          <p className="text-lg font-bold text-[#e63946]">-{formatCoins(totalLost)}</p>
          <p className="text-[11px] text-[#556677]">Lost</p>
        </div>
        <div className="flex-1 card p-3 text-center">
          <p className={`text-lg font-bold ${totalWon - totalLost >= 0 ? "text-[#2ecc71]" : "text-[#e63946]"}`}>
            {totalWon - totalLost >= 0 ? "+" : ""}{formatCoins(totalWon - totalLost)}
          </p>
          <p className="text-[11px] text-[#556677]">Net</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#151f2b] rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-[#1a2332] text-white" : "text-[#556677]"
            }`}
          >
            {t.label} {t.count > 0 && <span className="text-[11px] ml-0.5 opacity-60">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Predictions list */}
      {tab !== "parlays" && (
        <div className="space-y-2">
          {currentPreds.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#556677] text-sm">
                {tab === "active" ? "No active predictions" : "No settled predictions yet"}
              </p>
            </div>
          )}
          {currentPreds.map((pred) => {
            const market = pred.market;
            const selectedLabel = market?.options?.find((o: { id: string }) => o.id === pred.selected_option_id)?.label || "—";
            const isWin = pred.coins_won !== null && pred.coins_won > 0;
            const isLoss = pred.coins_won !== null && pred.coins_won === 0;

            return (
              <div
                key={pred.id}
                className={`card p-3 border-l-2 ${
                  isWin ? "border-l-[#2ecc71]" : isLoss ? "border-l-[#e63946]" : "border-l-blue-500"
                }`}
              >
                <p className="text-sm text-white truncate">{market?.question || "—"}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#e63946] bg-[#e63946]/10 px-2 py-0.5 rounded font-medium">
                      {selectedLabel}
                    </span>
                    <span className="text-[11px] text-[#556677]">{formatCoins(pred.coins_wagered)} coins</span>
                  </div>
                  {pred.coins_won === null && (
                    <span className="text-[11px] text-blue-400 font-medium">Pending</span>
                  )}
                  {isWin && (
                    <span className="text-[11px] font-semibold text-[#2ecc71]">+{formatCoins(pred.coins_won!)}</span>
                  )}
                  {isLoss && (
                    <span className="text-[11px] font-semibold text-[#e63946]">Lost</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Parlays list */}
      {tab === "parlays" && (
        <div className="space-y-2">
          {parlays.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#556677] text-sm">No parlays placed yet</p>
            </div>
          )}
          {parlays.map((parlay) => (
            <div
              key={parlay.id}
              className={`card p-3 border-l-2 ${
                parlay.status === "won" ? "border-l-[#2ecc71]"
                  : parlay.status === "lost" ? "border-l-[#e63946]"
                    : "border-l-blue-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">
                    {parlay.predictions?.length || "—"} picks · {(parlay.combined_odds || 0).toFixed(1)}x
                  </p>
                  <p className="text-[11px] text-[#556677] mt-0.5">
                    Wagered {formatCoins(parlay.coins_wagered)}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  parlay.status === "won" ? "text-[#2ecc71] bg-[#2ecc71]/10"
                    : parlay.status === "lost" ? "text-[#e63946] bg-[#e63946]/10"
                      : "text-blue-400 bg-blue-400/10"
                }`}>
                  {parlay.status === "won" ? `+${formatCoins(parlay.coins_won || 0)}`
                    : parlay.status === "lost" ? "Lost"
                      : "Active"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
