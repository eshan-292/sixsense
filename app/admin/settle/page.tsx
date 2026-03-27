"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Market, Match } from "@/lib/types";

export default function SettlePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<(Market & { match?: Match })[]>([]);
  const [settling, setSettling] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmSettle, setConfirmSettle] = useState<{
    marketId: string;
    optionId: string;
    optionLabel: string;
  } | null>(null);
  const supabase = createClient();

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    const { data: mk } = await supabase
      .from("markets")
      .select("*, match:matches(*)")
      .in("status", ["open", "locked"])
      .order("created_at", { ascending: true });
    setMarkets(mk || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSettle = async (marketId: string, correctOptionId: string) => {
    setSettling(marketId);
    setMsg("");
    setConfirmSettle(null);

    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: marketId,
          correct_option_id: correctOptionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg(
        `Settled! ${data.predictions_settled} predictions resolved, 🪙 ${data.total_paid_out?.toLocaleString("en-IN") || 0} paid out.`
      );
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSettling(null);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
    </div>
  );
  if (!isAdmin) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="text-red-400">Access denied.</p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Settle Markets</h1>
              <p className="text-sm text-gray-500">{markets.length} unsettled market{markets.length !== 1 ? "s" : ""}</p>
            </div>
            <Link
              href="/admin"
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-10">
        {msg && (
          <div className={`${msg.startsWith("Error") ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-green-500/10 border-green-500/20 text-green-300"} border text-sm p-3 rounded-lg mb-4`}>
            {msg}
          </div>
        )}

        {/* Confirmation modal */}
        {confirmSettle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="glass-card rounded-xl p-5 max-w-sm w-full border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-2">Confirm Settlement</h3>
              <p className="text-xs text-gray-400 mb-4">
                Are you sure you want to settle this market with <span className="text-green-400 font-medium">&quot;{confirmSettle.optionLabel}&quot;</span> as the correct answer? This will pay out winners and cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSettle(null)}
                  className="flex-1 text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSettle(confirmSettle.marketId, confirmSettle.optionId)}
                  disabled={settling !== null}
                  className="flex-1 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg py-2 transition-colors disabled:opacity-50"
                >
                  {settling ? "Settling..." : "Confirm & Settle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {markets.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-400">All markets are settled!</p>
            <p className="text-gray-600 text-xs mt-1">
              No pending markets to resolve.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {markets.map((market) => {
              const match = market.match as Match | undefined;
              const isSettling = settling === market.id;

              return (
                <div
                  key={market.id}
                  className={`glass-card rounded-xl p-4 transition-all ${isSettling ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {match && (
                        <p className="text-[11px] text-gray-500 mb-1 flex items-center gap-1.5">
                          <span className="font-medium text-gray-400">
                            {match.team_a_short} vs {match.team_b_short}
                          </span>
                          <span>·</span>
                          {new Date(match.match_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-white">
                        {market.question}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                        market.status === "locked"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {market.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">
                    Select the correct outcome
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {market.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() =>
                          setConfirmSettle({
                            marketId: market.id,
                            optionId: opt.id,
                            optionLabel: opt.label,
                          })
                        }
                        disabled={isSettling}
                        className="bg-gray-800/50 hover:bg-green-600/20 hover:border-green-500/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white transition-all disabled:opacity-50 text-left"
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-[10px] text-gray-500 ml-1.5">
                          {opt.odds}x
                        </span>
                      </button>
                    ))}
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
