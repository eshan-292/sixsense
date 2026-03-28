"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";

interface ActivityEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
  option_label: string;
  market_question: string;
  coins_wagered: number;
  created_at: string;
  isNew?: boolean;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  matchId?: string;
}

export default function ActivityFeed({ matchId }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const marketsCache = useRef<
    Record<string, { question: string; options: { id: string; label: string }[] }>
  >({});
  const profilesCache = useRef<
    Record<string, { display_name: string; avatar_url: string | null }>
  >({});

  // Fetch initial entries
  useEffect(() => {
    async function fetchInitial() {
      setLoading(true);

      // Build query for recent predictions
      let query = supabase
        .from("predictions")
        .select("id, user_id, market_id, selected_option_id, coins_wagered, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      // If matchId provided, filter by that match's markets
      let marketIds: string[] = [];
      if (matchId) {
        const { data: matchMarkets } = await supabase
          .from("markets")
          .select("id, question, options")
          .eq("match_id", matchId);

        if (matchMarkets) {
          marketIds = matchMarkets.map((m) => m.id);
          matchMarkets.forEach((m) => {
            marketsCache.current[m.id] = {
              question: m.question,
              options: m.options as { id: string; label: string }[],
            };
          });
          if (marketIds.length > 0) {
            query = query.in("market_id", marketIds);
          } else {
            setEntries([]);
            setLoading(false);
            return;
          }
        }
      }

      const { data: preds } = await query;
      if (!preds || preds.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch missing market data
      const missingMarketIds = [
        ...new Set(
          preds
            .map((p) => p.market_id)
            .filter((id) => !marketsCache.current[id])
        ),
      ];
      if (missingMarketIds.length > 0) {
        const { data: markets } = await supabase
          .from("markets")
          .select("id, question, options")
          .in("id", missingMarketIds);
        markets?.forEach((m) => {
          marketsCache.current[m.id] = {
            question: m.question,
            options: m.options as { id: string; label: string }[],
          };
        });
      }

      // Fetch missing profiles
      const missingUserIds = [
        ...new Set(
          preds
            .map((p) => p.user_id)
            .filter((id) => !profilesCache.current[id])
        ),
      ];
      if (missingUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", missingUserIds);
        profiles?.forEach((p) => {
          profilesCache.current[p.id] = {
            display_name: p.display_name,
            avatar_url: p.avatar_url,
          };
        });
      }

      const mapped = preds
        .map((p) => {
          const market = marketsCache.current[p.market_id];
          const profile = profilesCache.current[p.user_id];
          if (!market || !profile) return null;
          const option = market.options.find(
            (o) => o.id === p.selected_option_id
          );
          return {
            id: p.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            option_label: option?.label || "Unknown",
            market_question: market.question,
            coins_wagered: p.coins_wagered,
            created_at: p.created_at,
          };
        })
        .filter(Boolean) as ActivityEntry[];

      setEntries(mapped);
      setLoading(false);
    }

    fetchInitial();
  }, [matchId, supabase]);

  // Real-time subscription for new predictions
  useEffect(() => {
    const channelConfig: {
      event: "INSERT";
      schema: "public";
      table: "predictions";
      filter?: string;
    } = {
      event: "INSERT",
      schema: "public",
      table: "predictions",
    };

    // If we have a matchId, we already cached the marketIds during initial fetch
    // Use them for the filter
    if (matchId) {
      const cachedMarketIds = Object.keys(marketsCache.current);
      if (cachedMarketIds.length > 0) {
        channelConfig.filter = `market_id=in.(${cachedMarketIds.join(",")})`;
      }
    }

    const channel = supabase
      .channel(`activity-feed-${matchId || "global"}`)
      .on("postgres_changes", channelConfig, async (payload) => {
        const newPred = payload.new as {
          id: string;
          user_id: string;
          market_id: string;
          selected_option_id: string;
          coins_wagered: number;
          created_at: string;
        };

        // Fetch market if not cached
        if (!marketsCache.current[newPred.market_id]) {
          const { data: market } = await supabase
            .from("markets")
            .select("id, question, options")
            .eq("id", newPred.market_id)
            .single();
          if (market) {
            marketsCache.current[market.id] = {
              question: market.question,
              options: market.options as { id: string; label: string }[],
            };
          }
        }

        // Fetch profile if not cached
        if (!profilesCache.current[newPred.user_id]) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", newPred.user_id)
            .single();
          if (profile) {
            profilesCache.current[profile.id] = {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            };
          }
        }

        const market = marketsCache.current[newPred.market_id];
        const profile = profilesCache.current[newPred.user_id];
        if (!market || !profile) return;

        const option = market.options.find(
          (o) => o.id === newPred.selected_option_id
        );

        const entry: ActivityEntry = {
          id: newPred.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          option_label: option?.label || "Unknown",
          market_question: market.question,
          coins_wagered: newPred.coins_wagered,
          created_at: newPred.created_at,
          isNew: true,
        };

        setEntries((prev) => [entry, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  if (loading) {
    return (
      <div className="card rounded-xl p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-700 shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-700 rounded shimmer w-3/4" />
                <div className="h-2.5 bg-gray-800 rounded shimmer w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500">No predictions yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="card rounded-xl p-4">
      <div className="space-y-2.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-start gap-2.5 ${entry.isNew ? "animate-slide-down" : ""}`}
          >
            {/* Avatar */}
            {entry.avatar_url ? (
              <img
                src={entry.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full border border-gray-700 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {entry.display_name?.[0] || "?"}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 leading-relaxed">
                <span className="font-medium text-white">
                  {entry.display_name}
                </span>{" "}
                predicted{" "}
                <span className="font-medium text-indigo-300">
                  {entry.option_label}
                </span>{" "}
                on{" "}
                <span className="text-gray-400">{entry.market_question}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-gray-600">
                  {timeAgo(entry.created_at)}
                </span>
                <span className="text-[11px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
                  {formatCoins(entry.coins_wagered)} coins
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
