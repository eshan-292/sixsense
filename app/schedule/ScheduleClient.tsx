"use client";

import { useState } from "react";
import Link from "next/link";
import { getTeamColor } from "@/lib/utils";
import type { Match } from "@/lib/types";

const TEAMS = [
  "CSK", "MI", "RCB", "KKR", "DC", "SRH", "PBKS", "RR", "GT", "LSG",
];

export default function ScheduleClient({ matches }: { matches: Match[] }) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const filtered = selectedTeam
    ? matches.filter(
        (m) =>
          m.team_a_short === selectedTeam || m.team_b_short === selectedTeam
      )
    : matches;

  // Group by date
  const grouped: Record<string, Match[]> = {};
  filtered.forEach((match) => {
    const dateKey = new Date(match.match_date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(match);
  });

  return (
    <>
      {/* Team filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setSelectedTeam(null)}
          className={`shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
            !selectedTeam
              ? "bg-white text-gray-900"
              : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
          }`}
        >
          All Teams
        </button>
        {TEAMS.map((team) => (
          <button
            key={team}
            onClick={() =>
              setSelectedTeam(selectedTeam === team ? null : team)
            }
            className={`shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
              selectedTeam === team
                ? "bg-white text-gray-900"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      {selectedTeam && (
        <p className="text-xs text-gray-500 mb-3">
          Showing {filtered.length} match{filtered.length !== 1 ? "es" : ""} for{" "}
          <span className="text-white font-medium">{selectedTeam}</span>
        </p>
      )}

      {Object.entries(grouped).map(([date, dayMatches]) => {
        const isToday = (() => {
          const d = new Date(dayMatches[0].match_date);
          const now = new Date();
          return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        })();

        return (
          <div key={date} className="mb-6">
            <div className="flex items-center gap-2 mb-2 sticky top-14 z-10 bg-[#030712]/90 backdrop-blur-sm py-2">
              <div
                className={`h-px flex-1 ${
                  isToday
                    ? "bg-gradient-to-r from-orange-500/50 to-transparent"
                    : "bg-gray-800/50"
                }`}
              />
              <h3
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isToday ? "text-orange-400" : "text-gray-500"
                }`}
              >
                {isToday && "\uD83D\uDD25 "}
                {date}
                {dayMatches.length > 1 && (
                  <span className="text-gray-600 ml-1.5 normal-case">
                    ({dayMatches.length} matches)
                  </span>
                )}
              </h3>
              <div
                className={`h-px flex-1 ${
                  isToday
                    ? "bg-gradient-to-l from-orange-500/50 to-transparent"
                    : "bg-gray-800/50"
                }`}
              />
            </div>

            <div className="space-y-2">
              {dayMatches.map((match) => (
                <Link key={match.id} href={`/match/${match.id}`}>
                  <div
                    className={`glass-card rounded-lg p-3 hover:bg-gray-800/50 transition-all cursor-pointer ${
                      isToday ? "border-orange-500/20 border" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full ${getTeamColor(
                            match.team_a_short
                          )} flex items-center justify-center text-[10px] font-bold shrink-0`}
                        >
                          {match.team_a_short}
                        </div>
                        <span className="text-sm font-medium text-white truncate">
                          {match.team_a_short}
                        </span>
                      </div>

                      <div className="px-2 shrink-0 flex flex-col items-center">
                        <span className="text-[10px] text-gray-600 font-mono">
                          {new Date(match.match_date).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        <span className="text-[9px] text-gray-700">vs</span>
                      </div>

                      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                        <span className="text-sm font-medium text-white truncate text-right">
                          {match.team_b_short}
                        </span>
                        <div
                          className={`w-9 h-9 rounded-full ${getTeamColor(
                            match.team_b_short
                          )} flex items-center justify-center text-[10px] font-bold shrink-0`}
                        >
                          {match.team_b_short}
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-600 mt-1.5 text-center truncate">
                      \uD83D\uDCCD {match.venue}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{selectedTeam ? "🏏" : "📅"}</p>
          <p className="text-gray-400">
            {selectedTeam
              ? `No matches found for ${selectedTeam}.`
              : "No schedule available yet."}
          </p>
        </div>
      )}
    </>
  );
}
