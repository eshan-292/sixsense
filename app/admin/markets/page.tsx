"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Market, Match } from "@/lib/types";

export default function AdminMarketsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<(Market & { match?: Match })[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "locked" | "settled">("all");
  const [msg, setMsg] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [predCounts, setPredCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    const { data: mk } = await supabase
      .from("markets")
      .select("*, match:matches(*)")
      .order("created_at", { ascending: false });
    setMarkets(mk || []);

    // Get prediction counts per market
    const { data: preds } = await supabase.from("predictions").select("market_id");
    const counts: Record<string, number> = {};
    (preds || []).forEach(p => { counts[p.market_id] = (counts[p.market_id] || 0) + 1; });
    setPredCounts(counts);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCancel = async (marketId: string) => {
    setCancelling(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/cancel-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: marketId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Market cancelled! ${data.predictions_refunded} predictions refunded (${data.total_refunded.toLocaleString("en-IN")} coins returned).`);
      setConfirmCancel(null);
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setCancelling(false);
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

  const filtered = filter === "all" ? markets : markets.filter(m => m.status === filter);

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">All Markets</h1>
              <p className="text-sm text-gray-500">{markets.length} total markets</p>
            </div>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg transition-colors">
              ← Dashboard
            </Link>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2">
            {(["all", "open", "locked", "settled"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800/50 text-gray-400 hover:text-white"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1 text-[10px] opacity-70">
                  ({f === "all" ? markets.length : markets.filter(m => m.status === f).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        {msg && (
          <div className={`${msg.startsWith("Error") ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-green-500/10 border-green-500/20 text-green-300"} border text-sm p-3 rounded-lg mb-4`}>
            {msg}
          </div>
        )}

        {/* Cancel confirmation modal */}
        {confirmCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="glass-card rounded-xl p-5 max-w-sm w-full border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-2">Cancel Market</h3>
              <p className="text-xs text-gray-400 mb-1">
                This will <span className="text-red-400 font-medium">delete this market</span> and refund all {predCounts[confirmCancel] || 0} predictions.
              </p>
              <p className="text-xs text-gray-500 mb-4">This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(null)} className="flex-1 text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 transition-colors">
                  Keep Market
                </button>
                <button
                  onClick={() => handleCancel(confirmCancel)}
                  disabled={cancelling}
                  className="flex-1 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg py-2 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel & Refund"}
                </button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-gray-400">No markets found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((market) => {
              const match = market.match as Match | undefined;
              const count = predCounts[market.id] || 0;

              return (
                <div key={market.id} className="glass-card rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      {match && (
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          {match.team_a_short} vs {match.team_b_short} · {new Date(match.match_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      <p className="text-sm text-white font-medium">{market.question}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {market.options.map(opt => (
                          <span
                            key={opt.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              market.correct_option_id === opt.id
                                ? "bg-green-500/20 text-green-400 font-medium"
                                : "bg-gray-800/50 text-gray-500"
                            }`}
                          >
                            {opt.label} ({opt.odds}x)
                            {market.correct_option_id === opt.id && " ✓"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[10px] text-gray-500">{count} pred{count !== 1 ? "s" : ""}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        market.status === "open" ? "bg-blue-500/10 text-blue-400"
                          : market.status === "locked" ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                      }`}>
                        {market.status}
                      </span>
                      {market.status !== "settled" && (
                        <button
                          onClick={() => setConfirmCancel(market.id)}
                          className="text-[10px] bg-red-600/20 text-red-400 hover:bg-red-600/30 px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
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
