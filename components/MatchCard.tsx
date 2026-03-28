"use client";

import Link from "next/link";
import { getTeamColor, timeUntil } from "@/lib/utils";
import type { Match } from "@/lib/types";
import { useEffect, useState } from "react";

export default function MatchCard({ match }: { match: Match }) {
  const [countdown, setCountdown] = useState(timeUntil(match.match_date));

  useEffect(() => {
    if (match.status !== "upcoming") return;
    const interval = setInterval(() => {
      setCountdown(timeUntil(match.match_date));
    }, 60000);
    return () => clearInterval(interval);
  }, [match.match_date, match.status]);

  const statusBadge = {
    upcoming: (
      <span className="text-[11px] bg-[#1e3a5f] text-blue-300 px-2.5 py-1 rounded-md font-medium">
        {countdown}
      </span>
    ),
    live: (
      <span className="text-[11px] bg-[#e63946]/15 text-[#e63946] px-2.5 py-1 rounded-md font-semibold live-pulse flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#e63946]" /> LIVE
      </span>
    ),
    completed: (
      <span className="text-[11px] bg-[#243040] text-[#8899a6] px-2.5 py-1 rounded-md font-medium">
        {match.result === "team_a_win"
          ? `${match.team_a_short} Won`
          : match.result === "team_b_win"
            ? `${match.team_b_short} Won`
            : match.result
              ? "No Result"
              : "Completed"}
      </span>
    ),
  };

  return (
    <Link href={`/match/${match.id}`}>
      <div className="card p-4 hover:border-[#334155] transition-colors active:scale-[0.99]">
        {/* Top row: date + status */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-[#8899a6]">
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
          </span>
          {statusBadge[match.status]}
        </div>

        {/* Teams row */}
        <div className="flex items-center">
          {/* Team A */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className={`w-10 h-10 rounded-full ${getTeamColor(match.team_a_short)} flex items-center justify-center text-[11px] font-bold team-badge shrink-0`}
            >
              {match.team_a_short}
            </div>
            <span className="text-sm font-semibold text-white truncate">
              {match.team_a_short}
            </span>
          </div>

          {/* VS */}
          <span className="text-xs font-bold text-[#556677] px-3 shrink-0">VS</span>

          {/* Team B */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold text-white truncate text-right">
              {match.team_b_short}
            </span>
            <div
              className={`w-10 h-10 rounded-full ${getTeamColor(match.team_b_short)} flex items-center justify-center text-[11px] font-bold team-badge shrink-0`}
            >
              {match.team_b_short}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
