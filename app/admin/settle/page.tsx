"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Market, Match } from "@/lib/types";

interface ResolvedMarket {
  optionId: string;
  optionLabel: string;
  reason: string;
}

interface FetchedResults {
  matchWinner: string | null;
  matchWinnerFull: string | null;
  totalRuns: number | null;
  firstInningsScore: number | null;
  manOfTheMatch: string | null;
  status: string;
  scores: { inning: string; runs: number; wickets: number; overs: number }[];
}

export default function SettlePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<(Market & { match?: Match })[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [settling, setSettling] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmSettle, setConfirmSettle] = useState<{
    marketId: string;
    optionId: string;
    optionLabel: string;
  } | null>(null);

  // Auto-fetch state
  const [fetchingResults, setFetchingResults] = useState<string | null>(null);
  const [fetchedResults, setFetchedResults] = useState<Record<string, FetchedResults>>({});
  const [resolvedMarkets, setResolvedMarkets] = useState<Record<string, ResolvedMarket>>({});
  const [autoSettling, setAutoSettling] = useState(false);

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

    // Get unique matches that have unsettled markets
    const matchMap = new Map<string, Match>();
    (mk || []).forEach((m: any) => {
      if (m.match && !matchMap.has(m.match.id)) {
        matchMap.set(m.match.id, m.match);
      }
    });
    setMatches(Array.from(matchMap.values()));

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
        `Settled! ${data.predictions_settled} predictions resolved, ${data.total_paid_out?.toLocaleString("en-IN") || 0} coins paid out.`
      );
      // Remove from resolved
      setResolvedMarkets(prev => {
        const next = { ...prev };
        delete next[marketId];
        return next;
      });
      loadData();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSettling(null);
    }
  };

  const handleFetchResults = async (matchId: string) => {
    setFetchingResults(matchId);
    setMsg("");

    try {
      const res = await fetch("/api/admin/fetch-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(`Fetch error: ${data.error}${data.available_matches ? ` | Available: ${data.available_matches.join(", ")}` : ""}`);
        return;
      }

      // Store results
      setFetchedResults(prev => ({ ...prev, [matchId]: data.results }));

      // Store resolved markets
      const newResolved = { ...resolvedMarkets };
      for (const [mId, resolution] of Object.entries(data.resolved_markets as Record<string, ResolvedMarket>)) {
        newResolved[mId] = resolution;
      }
      setResolvedMarkets(newResolved);

      const resolvedCount = Object.keys(data.resolved_markets).length;
      const unresolvedCount = data.unresolved_markets?.length || 0;
      setMsg(
        `Fetched results for ${data.results.matchWinnerFull || "match"}. ` +
        `Auto-resolved ${resolvedCount} market${resolvedCount !== 1 ? "s" : ""}` +
        (unresolvedCount > 0 ? `, ${unresolvedCount} need manual settlement.` : ".")
      );
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setFetchingResults(null);
    }
  };

  const handleAutoSettleAll = async (matchId: string) => {
    const matchMarketIds = markets
      .filter(m => m.match_id === matchId)
      .map(m => m.id);

    const toSettle = matchMarketIds.filter(id => resolvedMarkets[id]);
    if (toSettle.length === 0) {
      setMsg("No auto-resolved markets to settle.");
      return;
    }

    setAutoSettling(true);
    setMsg("");

    let settled = 0;
    let errors = 0;

    for (const marketId of toSettle) {
      const resolution = resolvedMarkets[marketId];
      try {
        const res = await fetch("/api/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market_id: marketId,
            correct_option_id: resolution.optionId,
          }),
        });
        if (res.ok) {
          settled++;
          setResolvedMarkets(prev => {
            const next = { ...prev };
            delete next[marketId];
            return next;
          });
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setMsg(`Auto-settled ${settled} market${settled !== 1 ? "s" : ""}${errors > 0 ? `, ${errors} failed` : ""}. Payouts processed!`);
    setAutoSettling(false);
    loadData();
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

  // Group markets by match
  const marketsByMatch = new Map<string, (Market & { match?: Match })[]>();
  for (const market of markets) {
    const mId = market.match_id;
    if (!marketsByMatch.has(mId)) marketsByMatch.set(mId, []);
    marketsByMatch.get(mId)!.push(market);
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Settle Markets</h1>
              <p className="text-sm text-gray-500">{markets.length} unsettled market{markets.length !== 1 ? "s" : ""} across {matches.length} match{matches.length !== 1 ? "es" : ""}</p>
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
          <div className={`${msg.startsWith("Error") || msg.startsWith("Fetch error") ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-green-500/10 border-green-500/20 text-green-300"} border text-sm p-3 rounded-lg mb-4`}>
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
          <div className="space-y-6">
            {Array.from(marketsByMatch.entries()).map(([matchId, matchMarkets]) => {
              const match = matchMarkets[0]?.match as Match | undefined;
              const matchResults = fetchedResults[matchId];
              const isFetching = fetchingResults === matchId;
              const resolvedCount = matchMarkets.filter(m => resolvedMarkets[m.id]).length;

              return (
                <div key={matchId} className="space-y-3">
                  {/* Match Header with Fetch Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-semibold text-white">
                        {match ? `${match.team_a_short} vs ${match.team_b_short}` : "Unknown Match"}
                      </h2>
                      {match && (
                        <span className="text-[10px] text-gray-500">
                          {new Date(match.match_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      {matchResults && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                          Results fetched
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {resolvedCount > 0 && (
                        <button
                          onClick={() => handleAutoSettleAll(matchId)}
                          disabled={autoSettling}
                          className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium"
                        >
                          {autoSettling ? "Settling..." : `Auto-Settle ${resolvedCount} Market${resolvedCount !== 1 ? "s" : ""}`}
                        </button>
                      )}
                      <button
                        onClick={() => handleFetchResults(matchId)}
                        disabled={isFetching}
                        className="text-xs bg-indigo-600/80 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isFetching ? (
                          <>
                            <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Fetch Results
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Fetched Results Summary */}
                  {matchResults && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500 block mb-0.5">Winner</span>
                          <span className="text-white font-semibold">{matchResults.matchWinner || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-0.5">Total Runs</span>
                          <span className="text-white font-semibold">{matchResults.totalRuns || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-0.5">1st Innings</span>
                          <span className="text-white font-semibold">{matchResults.firstInningsScore || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-0.5">MOTM</span>
                          <span className="text-white font-semibold">{matchResults.manOfTheMatch || "N/A"}</span>
                        </div>
                      </div>
                      {matchResults.scores.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-800 flex gap-4 text-[10px] text-gray-400">
                          {matchResults.scores.map((s, i) => (
                            <span key={i}>
                              {s.inning}: {s.runs}/{s.wickets} ({s.overs} ov)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Markets */}
                  {matchMarkets.map((market) => {
                    const isSettling = settling === market.id;
                    const resolved = resolvedMarkets[market.id];

                    return (
                      <div
                        key={market.id}
                        className={`glass-card rounded-xl p-4 transition-all ${isSettling ? "opacity-50" : ""} ${resolved ? "border-green-500/30" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {market.question}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {resolved && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                                Auto-resolved
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                market.status === "locked"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : "bg-blue-500/10 text-blue-400"
                              }`}
                            >
                              {market.status}
                            </span>
                          </div>
                        </div>

                        {resolved && (
                          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2 mb-3 text-xs">
                            <span className="text-green-400 font-medium">Suggested: {resolved.optionLabel}</span>
                            <span className="text-gray-500 ml-2">— {resolved.reason}</span>
                          </div>
                        )}

                        <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">
                          Select the correct outcome
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {market.options.map((opt) => {
                            const isAutoSuggested = resolved?.optionId === opt.id;
                            return (
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
                                className={`border rounded-lg px-3 py-2.5 text-sm text-white transition-all disabled:opacity-50 text-left ${
                                  isAutoSuggested
                                    ? "bg-green-600/20 border-green-500/50 hover:bg-green-600/30 ring-1 ring-green-500/30"
                                    : "bg-gray-800/50 hover:bg-green-600/20 hover:border-green-500/50 border-gray-700/50"
                                }`}
                              >
                                <span className="font-medium">{opt.label}</span>
                                {isAutoSuggested && (
                                  <span className="text-[10px] text-green-400 ml-1.5">✓ suggested</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Setup Instructions */}
        {!process.env.NEXT_PUBLIC_CRICKET_API_CONFIGURED && markets.length > 0 && (
          <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">API Setup</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              To auto-fetch match results, add <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">CRICKET_API_KEY</code> to your <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">.env.local</code> file.
              Get a free API key at <a href="https://cricketdata.org" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">cricketdata.org</a> (100 free requests/day).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
