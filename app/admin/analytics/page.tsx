"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatCoins } from "@/lib/utils";

interface AnalyticsData {
  totalUsers: number;
  totalPredictions: number;
  totalMatches: number;
  totalMarkets: number;
  settledMarkets: number;
  openMarkets: number;
  lockedMarkets: number;
  totalCoins: number;
  totalWagered: number;
  totalPaidOut: number;
  avgCoinsPerUser: number;
  avgPredictionsPerUser: number;
  topPredictors: { display_name: string; total_predictions: number; total_wins: number; coins: number }[];
  mostActiveMarkets: { question: string; predCount: number }[];
  matchCompletionRate: number;
  avgWagerAmount: number;
}

export default function AnalyticsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const supabase = createClient();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    const [profilesRes, matchesRes, marketsRes, predsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("matches").select("*"),
      supabase.from("markets").select("*"),
      supabase.from("predictions").select("*"),
    ]);

    const profiles = profilesRes.data || [];
    const matches = matchesRes.data || [];
    const markets = marketsRes.data || [];
    const preds = predsRes.data || [];

    const totalCoins = profiles.reduce((s, p) => s + p.coins, 0);
    const totalWagered = preds.reduce((s, p) => s + p.coins_wagered, 0);
    const totalPaidOut = preds.reduce((s, p) => s + (p.coins_won || 0), 0);
    const completedMatches = matches.filter(m => m.status === "completed").length;

    // Prediction count per market
    const predCountByMarket: Record<string, number> = {};
    preds.forEach(p => {
      predCountByMarket[p.market_id] = (predCountByMarket[p.market_id] || 0) + 1;
    });

    const mostActiveMarkets = markets
      .map(m => ({ question: m.question, predCount: predCountByMarket[m.id] || 0 }))
      .sort((a, b) => b.predCount - a.predCount)
      .slice(0, 5);

    const topPredictors = profiles
      .sort((a, b) => b.total_predictions - a.total_predictions)
      .slice(0, 5)
      .map(p => ({
        display_name: p.display_name,
        total_predictions: p.total_predictions,
        total_wins: p.total_wins,
        coins: p.coins,
      }));

    setData({
      totalUsers: profiles.length,
      totalPredictions: preds.length,
      totalMatches: matches.length,
      totalMarkets: markets.length,
      settledMarkets: markets.filter(m => m.status === "settled").length,
      openMarkets: markets.filter(m => m.status === "open").length,
      lockedMarkets: markets.filter(m => m.status === "locked").length,
      totalCoins,
      totalWagered,
      totalPaidOut,
      avgCoinsPerUser: profiles.length > 0 ? Math.round(totalCoins / profiles.length) : 0,
      avgPredictionsPerUser: profiles.length > 0 ? Math.round((preds.length / profiles.length) * 10) / 10 : 0,
      topPredictors,
      mostActiveMarkets,
      matchCompletionRate: matches.length > 0 ? Math.round((completedMatches / matches.length) * 100) : 0,
      avgWagerAmount: preds.length > 0 ? Math.round(totalWagered / preds.length) : 0,
    });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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
  if (!data) return null;

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-gray-500">Platform performance & insights</p>
            </div>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg transition-colors">
              ← Dashboard
            </Link>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{data.totalUsers}</p>
              <p className="text-[10px] text-gray-500">Users</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-400">{data.totalPredictions}</p>
              <p className="text-[10px] text-gray-500">Predictions</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{formatCoins(data.totalWagered)}</p>
              <p className="text-[10px] text-gray-500">Total Wagered</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{formatCoins(data.totalPaidOut)}</p>
              <p className="text-[10px] text-gray-500">Total Paid Out</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-10">
        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Coins/User</p>
            <p className="text-xl font-bold text-cyan-400">{formatCoins(data.avgCoinsPerUser)}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Predictions/User</p>
            <p className="text-xl font-bold text-orange-400">{data.avgPredictionsPerUser}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Wager Size</p>
            <p className="text-xl font-bold text-emerald-400">{formatCoins(data.avgWagerAmount)}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Match Completion</p>
            <p className="text-xl font-bold text-blue-400">{data.matchCompletionRate}%</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Coins in Play</p>
            <p className="text-xl font-bold text-yellow-400">{formatCoins(data.totalCoins)}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Market Status</p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs text-blue-400">{data.openMarkets} open</span>
              <span className="text-xs text-yellow-400">{data.lockedMarkets} locked</span>
              <span className="text-xs text-green-400">{data.settledMarkets} settled</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Most Active Markets */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Most Active Markets</h3>
            {data.mostActiveMarkets.length === 0 ? (
              <p className="text-xs text-gray-500">No predictions yet</p>
            ) : (
              <div className="space-y-2">
                {data.mostActiveMarkets.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-xs text-gray-300 truncate flex-1 mr-2">{m.question}</p>
                    <span className="text-xs text-indigo-400 font-mono shrink-0">{m.predCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Predictors */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Top Predictors</h3>
            {data.topPredictors.length === 0 ? (
              <p className="text-xs text-gray-500">No users yet</p>
            ) : (
              <div className="space-y-2">
                {data.topPredictors.map((u, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white font-medium">{u.display_name}</p>
                      <p className="text-[10px] text-gray-500">
                        {u.total_predictions}P · {u.total_wins}W · {formatCoins(u.coins)} coins
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
