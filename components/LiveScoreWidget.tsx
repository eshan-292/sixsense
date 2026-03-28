"use client";

import { useState, useEffect, useCallback } from "react";

interface LiveScoreWidgetProps {
  teamA: string;
  teamB: string;
  teamAShort: string;
  teamBShort: string;
  matchStatus: string;
}

interface ScoreData {
  teamA: string;
  teamAShort: string;
  teamAScore: string | null;
  teamB: string;
  teamBShort: string;
  teamBScore: string | null;
  matchStatus: string;
  statusText: string;
  matchUrl: string;
  cached?: boolean;
  stale?: boolean;
  error?: string;
  code?: string;
}

export default function LiveScoreWidget({
  teamAShort,
  teamBShort,
  matchStatus,
}: LiveScoreWidgetProps) {
  const [expanded, setExpanded] = useState(true);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live-score?teamA=${encodeURIComponent(teamAShort)}&teamB=${encodeURIComponent(teamBShort)}`
      );
      const data = await res.json();
      if (res.ok && !data.error) {
        setScore(data);
        setLastUpdated(new Date());
      } else {
        // Keep existing score if we have one (stale > nothing)
        if (!score) {
          setScore(data);
        }
      }
    } catch {
      // Network error — keep existing score
    } finally {
      setLoading(false);
    }
  }, [teamAShort, teamBShort, score]);

  useEffect(() => {
    if (matchStatus !== "live") return;

    fetchScore();
    const interval = setInterval(fetchScore, 30_000);
    return () => clearInterval(interval);
  }, [matchStatus, fetchScore]);

  // Only render when match is live
  if (matchStatus !== "live") return null;

  const cricbuzzUrl =
    score?.matchUrl || "https://www.cricbuzz.com/cricket-match/live-scores";
  const hasScore = score && !score.error;
  const hasAnyScore = hasScore && (score.teamAScore || score.teamBScore);

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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Score Content */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* Loading state */}
          {loading && !score && (
            <div className="px-4 py-8 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500">
                Fetching live score...
              </p>
            </div>
          )}

          {/* No match found */}
          {!loading && score?.error && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">
                {score.code === "NO_MATCH"
                  ? "No live match found on Cricbuzz"
                  : "Unable to fetch live score"}
              </p>
              <a
                href="https://www.cricbuzz.com/cricket-match/live-scores"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
              >
                Check Cricbuzz directly ↗
              </a>
            </div>
          )}

          {/* Score display */}
          {hasScore && (
            <div className="px-4 py-4">
              {/* Scores */}
              {hasAnyScore ? (
                <div className="space-y-3">
                  {/* Team A */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                        {score.teamAShort}
                      </span>
                      <span className="text-sm text-gray-300">
                        {score.teamA}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-white font-mono tracking-tight">
                      {score.teamAScore || "Yet to bat"}
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">
                        {score.teamBShort}
                      </span>
                      <span className="text-sm text-gray-300">
                        {score.teamB}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-white font-mono tracking-tight">
                      {score.teamBScore || "Yet to bat"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-400">
                    Match starting soon
                  </p>
                </div>
              )}

              {/* Status text */}
              {score.statusText && (
                <div className="mt-3 pt-3 border-t border-gray-800/50">
                  <p className="text-xs text-center text-green-400/80 font-medium">
                    {score.statusText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 flex items-center justify-between border-t border-gray-800 bg-gray-900/40">
            <span className="text-[10px] text-gray-600">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Live score via Cricbuzz"}
              {score?.stale && " (stale)"}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={cricbuzzUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cricbuzz
              </a>
              <a
                href="https://www.espncricinfo.com/live-cricket-score"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                ESPNcricinfo
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLoading(true);
                  fetchScore();
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
