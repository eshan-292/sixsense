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
  const supabase = createClient();

  useEffect(() => {
    async function load() {
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

      const [matchesRes, marketsRes, playersRes, predsRes] = await Promise.all([
        supabase.from("matches").select("*").order("match_date", { ascending: true }),
        supabase.from("markets").select("*").order("created_at", { ascending: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("predictions").select("*", { count: "exact", head: true }),
      ]);

      setMatches(matchesRes.data || []);
      setMarkets(marketsRes.data || []);
      setStats({
        players: playersRes.count || 0,
        predictions: predsRes.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

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

  const openMarkets = markets.filter((m) => m.status === "open" || m.status === "locked");
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");
  const todayMatches = matches.filter((m) => {
    const d = new Date(m.match_date);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
          <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mb-6">Manage matches, markets, and settlements</p>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-400">{matches.length}</p>
              <p className="text-[10px] text-gray-500">Matches</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{markets.length}</p>
              <p className="text-[10px] text-gray-500">Markets</p>
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

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Link
              href="/admin/matches"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group"
            >
              <p className="text-2xl mb-2">🏏</p>
              <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">Manage Matches</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add matches & create markets
              </p>
            </Link>

            <Link
              href="/admin/settle"
              className="glass-card rounded-xl p-4 hover:bg-gray-800/50 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="text-2xl">⚖️</p>
                {openMarkets.length > 0 && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                    {openMarkets.length} pending
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Settle Markets</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Resolve outcomes & pay winners
              </p>
            </Link>

            <div className="glass-card rounded-xl p-4">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-sm font-semibold text-white">Quick Overview</p>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <p>{todayMatches.length} match{todayMatches.length !== 1 ? "es" : ""} today</p>
                <p>{upcomingMatches.length} upcoming</p>
                <p>{openMarkets.length} open markets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-10">
        {/* Today's Matches */}
        {todayMatches.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-orange-500/50 to-transparent" />
              <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Today</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-orange-500/50 to-transparent" />
            </div>
            <div className="space-y-2">
              {todayMatches.map((match) => (
                <MatchRow key={match.id} match={match} markets={markets} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Upcoming</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent" />
          </div>
          <div className="space-y-2">
            {upcomingMatches.slice(0, 10).map((match) => (
              <MatchRow key={match.id} match={match} markets={markets} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MatchRow({ match, markets }: { match: Match; markets: Market[] }) {
  const matchMarkets = markets.filter((m) => m.match_id === match.id);
  return (
    <div className="glass-card rounded-lg p-3 flex items-center justify-between">
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
          {matchMarkets.length > 0 && (
            <span className="text-indigo-400 ml-1.5">
              · {matchMarkets.length} market{matchMarkets.length > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>
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
  );
}
