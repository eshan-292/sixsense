"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Match, Market } from "@/lib/types";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stats, setStats] = useState({ players: 0, predictions: 0 });
  const [settledCount, setSettledCount] = useState(0);
  const [totalCoinsInCirculation, setTotalCoinsInCirculation] = useState(0);
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

    const [matchesRes, marketsRes, playersRes, predsRes, coinsRes] = await Promise.all([
      supabase.from("matches").select("*").order("match_date", { ascending: true }),
      supabase.from("markets").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("predictions").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("coins"),
    ]);

    setMatches(matchesRes.data || []);
    setMarkets(marketsRes.data || []);
    setStats({
      players: playersRes.count || 0,
      predictions: predsRes.count || 0,
    });
    setSettledCount((marketsRes.data || []).filter(m => m.status === "settled").length);
    setTotalCoinsInCirculation(
      (coinsRes.data || []).reduce((sum: number, p: { coins: number }) => sum + p.coins, 0)
    );
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
    </div>
  );
  if (!isAdmin) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-3">🔒</p>
      <p className="text-red-400">Access denied. Admin only.</p>
    </div>
  );

  const openMarkets = markets.filter((m) => m.status === "open");
  const lockedMarkets = markets.filter((m) => m.status === "locked");
  const pendingMarkets = [...openMarkets, ...lockedMarkets];
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");
  const liveMatches = matches.filter((m) => m.status === "live");
  const completedMatches = matches.filter((m) => m.status === "completed");
  const todayMatches = matches.filter((m) => {
    const d = new Date(m.match_date);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const matchesWithoutMarkets = upcomingMatches.filter(
    m => !markets.some(mk => mk.match_id === m.id)
  );

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Full control over SixSense</p>
            </div>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              View Site →
            </Link>
          </div>

          {/* Stats Overview - 2 rows */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-400">{matches.length}</p>
              <p className="text-[10px] text-gray-500">Total Matches</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{markets.length}</p>
              <p className="text-[10px] text-gray-500">Total Markets</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.players}</p>
              <p className="text-[10px] text-gray-500">Players</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.predictions}</p>
              <p className="text-[10px] text-gray-500">Predictions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{liveMatches.length}</p>
              <p className="text-[10px] text-gray-500">Live Now</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{pendingMarkets.length}</p>
              <p className="text-[10px] text-gray-500">Unsettled Markets</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{settledCount}</p>
              <p className="text-[10px] text-gray-500">Settled Markets</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-cyan-400">{totalCoinsInCirculation.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-gray-500">Coins in Play</p>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <Link
              href="/admin/matches"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group"
            >
              <p className="text-2xl mb-2">🏏</p>
              <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">Matches</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Add & manage</p>
            </Link>

            <Link
              href="/admin/settle"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group relative"
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="text-2xl">⚖️</p>
                {pendingMarkets.length > 0 && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                    {pendingMarkets.length}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Settle</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Resolve markets</p>
            </Link>

            <Link
              href="/admin/users"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group"
            >
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">Users</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Manage players</p>
            </Link>

            <Link
              href="/admin/analytics"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group"
            >
              <p className="text-2xl mb-2">📊</p>
              <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">Analytics</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Stats & reports</p>
            </Link>

            <Link
              href="/admin/markets"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group"
            >
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm font-semibold text-white group-hover:text-yellow-400 transition-colors">Markets</p>
              <p className="text-[10px] text-gray-500 mt-0.5">View & cancel</p>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        {/* Alerts / Action Items */}
        {(matchesWithoutMarkets.length > 0 || lockedMarkets.length > 0 || liveMatches.length > 0) && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-red-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Action Required</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-red-500/50 to-transparent" />
            </div>
            <div className="space-y-2">
              {matchesWithoutMarkets.length > 0 && (
                <Link href="/admin/matches" className="glass-card rounded-lg p-3 flex items-center justify-between hover:bg-gray-800/50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="text-sm text-white font-medium">{matchesWithoutMarkets.length} match{matchesWithoutMarkets.length > 1 ? "es" : ""} without markets</p>
                      <p className="text-[10px] text-gray-500">Create markets before they go live</p>
                    </div>
                  </div>
                  <span className="text-xs text-orange-400">Fix →</span>
                </Link>
              )}
              {lockedMarkets.length > 0 && (
                <Link href="/admin/settle" className="glass-card rounded-lg p-3 flex items-center justify-between hover:bg-gray-800/50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔒</span>
                    <div>
                      <p className="text-sm text-white font-medium">{lockedMarkets.length} locked market{lockedMarkets.length > 1 ? "s" : ""} awaiting settlement</p>
                      <p className="text-[10px] text-gray-500">Settle when results are in</p>
                    </div>
                  </div>
                  <span className="text-xs text-yellow-400">Settle →</span>
                </Link>
              )}
              {liveMatches.length > 0 && (
                <div className="glass-card rounded-lg p-3 flex items-center gap-3">
                  <span className="text-lg">🟢</span>
                  <div>
                    <p className="text-sm text-white font-medium">{liveMatches.length} match{liveMatches.length > 1 ? "es" : ""} currently live</p>
                    <p className="text-[10px] text-gray-500">
                      {liveMatches.map(m => `${m.team_a_short} vs ${m.team_b_short}`).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Today's Matches */}
        {todayMatches.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-orange-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Today&apos;s Matches</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-orange-500/50 to-transparent" />
            </div>
            <div className="space-y-2">
              {todayMatches.map((match) => (
                <MatchRow key={match.id} match={match} markets={markets} supabase={supabase} onUpdate={loadData} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Upcoming ({upcomingMatches.length})</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
            </div>
            <div className="space-y-2">
              {upcomingMatches.slice(0, 10).map((match) => (
                <MatchRow key={match.id} match={match} markets={markets} supabase={supabase} onUpdate={loadData} />
              ))}
              {upcomingMatches.length > 10 && (
                <Link href="/admin/matches" className="block text-center text-xs text-indigo-400 hover:text-indigo-300 mt-2">
                  View all {upcomingMatches.length} upcoming →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Recently Completed */}
        {completedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-gray-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed ({completedMatches.length})</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-gray-500/50 to-transparent" />
            </div>
            <div className="space-y-2">
              {completedMatches.slice(0, 5).map((match) => (
                <MatchRow key={match.id} match={match} markets={markets} supabase={supabase} onUpdate={loadData} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MatchRow({
  match,
  markets,
  supabase,
  onUpdate,
}: {
  match: Match;
  markets: Market[];
  supabase: any;
  onUpdate: () => void;
}) {
  const [settingResult, setSettingResult] = useState(false);
  const matchMarkets = markets.filter((m) => m.match_id === match.id);
  const hasMarkets = matchMarkets.length > 0;
  const settledCount = matchMarkets.filter(m => m.status === "settled").length;

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("matches").update({ status: newStatus }).eq("id", match.id);
    if (newStatus === "live") {
      await supabase
        .from("markets")
        .update({ status: "locked" })
        .eq("match_id", match.id)
        .eq("status", "open");
    }
    onUpdate();
  };

  const handleSetResult = async (result: string) => {
    await supabase.from("matches").update({ result }).eq("id", match.id);
    setSettingResult(false);
    onUpdate();
  };

  return (
    <div className="glass-card rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">
            {match.team_a_short} vs {match.team_b_short}
          </p>
          <p className="text-[11px] text-gray-500">
            {new Date(match.match_date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
            {" · "}
            {new Date(match.match_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            {hasMarkets ? (
              <span className="text-indigo-400 ml-1.5">
                · {matchMarkets.length} market{matchMarkets.length > 1 ? "s" : ""}
                {settledCount > 0 && <span className="text-green-400"> ({settledCount} settled)</span>}
              </span>
            ) : (
              <span className="text-orange-400/70 ml-1.5">· No markets</span>
            )}
            {match.result && (
              <span className="text-green-400 ml-1.5">
                · {match.result === "team_a_win" ? `${match.team_a_short} Won` : match.result === "team_b_win" ? `${match.team_b_short} Won` : "No Result"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!hasMarkets && match.status === "upcoming" && (
            <Link href="/admin/matches" className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-medium hover:bg-orange-500/20 transition-colors">
              + Markets
            </Link>
          )}
          {match.status === "upcoming" && (
            <button
              onClick={() => handleStatusChange("live")}
              className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded transition-colors"
            >
              Go Live
            </button>
          )}
          {match.status === "live" && (
            <button
              onClick={() => handleStatusChange("completed")}
              className="text-[10px] bg-gray-600 hover:bg-gray-500 text-white px-2 py-0.5 rounded transition-colors"
            >
              Complete
            </button>
          )}
          {match.status === "completed" && !match.result && (
            <button
              onClick={() => setSettingResult(!settingResult)}
              className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded transition-colors"
            >
              Set Result
            </button>
          )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              match.status === "upcoming"
                ? "bg-blue-500/10 text-blue-400"
                : match.status === "live"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-gray-500/10 text-gray-400"
            }`}
          >
            {match.status}
          </span>
        </div>
      </div>
      {/* Result picker */}
      {settingResult && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800">
          <button onClick={() => handleSetResult("team_a_win")} className="flex-1 text-xs bg-gray-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-gray-700 text-white py-1.5 rounded transition-colors">
            {match.team_a_short} Won
          </button>
          <button onClick={() => handleSetResult("team_b_win")} className="flex-1 text-xs bg-gray-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-gray-700 text-white py-1.5 rounded transition-colors">
            {match.team_b_short} Won
          </button>
          <button onClick={() => handleSetResult("no_result")} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 px-3 py-1.5 rounded transition-colors">
            No Result
          </button>
        </div>
      )}
    </div>
  );
}
