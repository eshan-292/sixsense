"use client";

import Link from "next/link";
import { getTeamColor, timeUntil } from "@/lib/utils";
import type { Match } from "@/lib/types";
import { useEffect, useState } from "react";

export default function MatchCard({
  match,
  featured = false,
  marketCount,
  predictionCount,
}: {
  match: Match;
  featured?: boolean;
  marketCount?: number;
  predictionCount?: number;
}) {
  const [countdown, setCountdown] = useState(timeUntil(match.match_date));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(timeUntil(match.match_date));
    }, 60000);
    return () => clearInterval(interval);
  }, [match.match_date]);

  const statusBadge = {
    upcoming: (
      <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full font-medium">
        {countdown}
      </span>
    ),
    live: (
      <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-0.5 rounded-full font-medium live-pulse flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> LIVE
      </span>
    ),
    completed: (
      <span className="text-xs bg-gray-500/10 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">
        Completed
      </span>
    ),
  };

  return (
    <Link href={`/match/${match.id}`}>
      <div
        className={`group relative rounded-xl p-4 transition-all cursor-pointer ${
          featured
            ? "glass-card gradient-border hover:bg-gray-800/50"
            : "bg-gray-900/80 border border-gray-800 hover:border-gray-700 hover:bg-gray-900"
        }`}
      >
        {featured && (
          <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-20 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">
            {new Date(match.match_date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
            {" · "}
            {new Date(match.match_date).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {statusBadge[match.status]}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-11 h-11 rounded-full ${getTeamColor(match.team_a_short)} flex items-center justify-center text-[11px] font-bold team-badge shrink-0`}
            >
              {match.team_a_short}
            </div>
            <p className="text-sm font-semibold text-white truncate">
              {match.team_a}
            </p>
          </div>

          <div className="px-3 shrink-0">
            <span className="text-xs font-bold text-gray-600 bg-gray-800/50 px-2 py-1 rounded">VS</span>
          </div>

          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <p className="text-sm font-semibold text-white truncate text-right">
              {match.team_b}
            </p>
            <div
              className={`w-11 h-11 rounded-full ${getTeamColor(match.team_b_short)} flex items-center justify-center text-[11px] font-bold team-badge shrink-0`}
            >
              {match.team_b_short}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          {match.venue ? (
            <p className="text-[11px] text-gray-600 truncate flex-1">
              📍 {match.venue}
            </p>
          ) : (
            <div />
          )}
          {(marketCount !== undefined || predictionCount !== undefined) && (
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {marketCount !== undefined && marketCount > 0 && (
                <span className="text-[10px] text-gray-500">
                  {marketCount} market{marketCount !== 1 ? "s" : ""}
                </span>
              )}
              {predictionCount !== undefined && predictionCount > 0 && (
                <span className="text-[10px] text-indigo-400/70">
                  {predictionCount} prediction{predictionCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {match.status === "completed" && match.result && (
          <div className="mt-2 text-center">
            <span className="text-xs text-green-400 font-medium">
              🏆 {match.result === "team_a_win"
                ? `${match.team_a_short} Won`
                : match.result === "team_b_win"
                  ? `${match.team_b_short} Won`
                  : "No Result"}
            </span>
          </div>
        )}
        {match.status !== "completed" && (
          <div className="mt-2 text-center">
            <span className="text-xs text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors">
              Predict Now →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
