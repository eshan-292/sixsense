"use client";

import { useState } from "react";

interface LiveScoreWidgetProps {
  teamA: string;
  teamB: string;
  teamAShort: string;
  teamBShort: string;
  matchStatus: string;
}

export default function LiveScoreWidget({
  teamAShort,
  teamBShort,
  matchStatus,
}: LiveScoreWidgetProps) {
  const [expanded, setExpanded] = useState(true);

  // Only render when match is live
  if (matchStatus !== "live") return null;

  // Only show for real IPL teams
  const IPL_TEAMS = ["CSK", "MI", "RCB", "KKR", "DC", "SRH", "RR", "PBKS", "GT", "LSG"];
  const isRealMatch = IPL_TEAMS.includes(teamAShort.toUpperCase()) && IPL_TEAMS.includes(teamBShort.toUpperCase());

  if (!isRealMatch) {
    return (
      <div className="mt-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
          <span className="text-sm text-gray-400">
            {teamAShort} vs {teamBShort} — Match is live
          </span>
        </div>
      </div>
    );
  }

  // Cricbuzz search URL — always works, loads the live match
  const cricbuzzUrl = `https://www.cricbuzz.com/cricket-match/live-scores`;
  const searchQuery = `${teamAShort} vs ${teamBShort} IPL 2026 live score`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&igu=1`;

  return (
    <div className="mt-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
          <span className="text-sm font-medium text-white">
            {teamAShort} vs {teamBShort} — Live Score
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={cricbuzzUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Cricbuzz ↗
          </a>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Live score embed */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* Google search embed — always shows live score card */}
          <iframe
            src={googleUrl}
            className="w-full border-0 bg-white"
            style={{ height: "320px", colorScheme: "light" }}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            title={`Live score: ${teamAShort} vs ${teamBShort}`}
          />
          <div className="px-4 py-2 flex items-center justify-between border-t border-gray-800">
            <span className="text-[10px] text-gray-600">
              Live score powered by Google
            </span>
            <div className="flex items-center gap-3">
              <a
                href={`https://www.cricbuzz.com/live-cricket-scores`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                Open in Cricbuzz
              </a>
              <a
                href={`https://www.espncricinfo.com/live-cricket-score`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                Open in ESPNcricinfo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
