"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Market, Match } from "@/lib/types";

export default function SettlePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<(Market & { match?: Match })[]>([]);
  const [settling, setSettling] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
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
        `Settled! ${data.predictions_settled} predictions resolved.`
      );
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSettling(null);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-400">Access denied.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">⚖️ Settle Markets</h1>

      {msg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-sm p-3 rounded-lg mb-4">
          {msg}
        </div>
      )}

      {markets.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-gray-500">No unsettled markets.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map((market) => {
            const match = market.match as Match | undefined;
            return (
              <div
                key={market.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {match
                        ? `${match.team_a_short} vs ${match.team_b_short}`
                        : "Unknown match"}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {market.question}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      market.status === "locked"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-blue-500/10 text-blue-400"
                    }`}
                  >
                    {market.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-2">
                  Select the correct outcome:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {market.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSettle(market.id, opt.id)}
                      disabled={settling === market.id}
                      className="bg-gray-800 hover:bg-green-600/20 hover:border-green-500 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white transition-all disabled:opacity-50"
                    >
                      {opt.label}
                      <span className="text-xs text-gray-500 ml-1">
                        ({opt.odds}x)
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
  );
}
