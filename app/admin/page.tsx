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
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      const { data: m } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true });
      setMatches(m || []);

      const { data: mk } = await supabase
        .from("markets")
        .select("*")
        .order("created_at", { ascending: true });
      setMarkets(mk || []);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-red-400">Access denied. Admin only.</div>;

  const openMarkets = markets.filter((m) => m.status === "open" || m.status === "locked");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Link
          href="/admin/matches"
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-indigo-500 transition-colors"
        >
          <p className="text-2xl mb-2">🏏</p>
          <p className="text-sm font-semibold text-white">Manage Matches</p>
          <p className="text-xs text-gray-500">{matches.length} matches</p>
        </Link>

        <Link
          href="/admin/settle"
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-green-500 transition-colors"
        >
          <p className="text-2xl mb-2">⚖️</p>
          <p className="text-sm font-semibold text-white">Settle Markets</p>
          <p className="text-xs text-gray-500">{openMarkets.length} unsettled</p>
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-semibold text-white">Quick Stats</p>
          <p className="text-xs text-gray-500">
            {matches.length} matches, {markets.length} markets
          </p>
        </div>
      </div>

      {/* Recent matches */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Recent Matches
      </h2>
      <div className="space-y-2">
        {matches.slice(-5).reverse().map((match) => (
          <div
            key={match.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-white">
                {match.team_a_short} vs {match.team_b_short}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(match.match_date).toLocaleDateString("en-IN")}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
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
        ))}
      </div>
    </div>
  );
}
