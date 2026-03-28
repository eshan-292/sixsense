"use client";

import { useEffect, useState, useCallback } from "react";

interface LiveScoreData {
  battingTeam: string;
  battingTeamShort: string;
  score: string;
  overs: string;
  runRate: string;
  requiredRunRate: string | null;
  target: number | null;
  batsmen: { name: string; runs: string }[];
  bowler: { name: string; figures: string } | null;
  lastSixBalls: string[];
  matchStatus: string;
  isSecondInnings: boolean;
  cached?: boolean;
  stale?: boolean;
}

interface LiveScoreWidgetProps {
  teamA: string;
  teamB: string;
  teamAShort: string;
  teamBShort: string;
  matchStatus: string;
}

type FetchState = "loading" | "success" | "error" | "no-match";

export default function LiveScoreWidget({
  teamA,
  teamB,
  teamAShort,
  teamBShort,
  matchStatus,
}: LiveScoreWidgetProps) {
  const [data, setData] = useState<LiveScoreData | null>(null);
  const [state, setState] = useState<FetchState>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live-score?teamA=${encodeURIComponent(teamAShort)}&teamB=${encodeURIComponent(teamBShort)}`
      );
      const json = await res.json();

      if (!res.ok) {
        if (json.code === "NO_MATCH" || json.code === "NO_DATA") {
          setState("no-match");
        } else {
          setState("error");
        }
        return;
      }

      setData(json);
      setState("success");
      setLastUpdated(new Date());
    } catch {
      setState("error");
    }
  }, [teamAShort, teamBShort]);

  useEffect(() => {
    if (matchStatus !== "live") return;

    fetchScore();
    const interval = setInterval(fetchScore, 30_000);
    return () => clearInterval(interval);
  }, [matchStatus, fetchScore]);

  // Don't render if match is not live
  if (matchStatus !== "live") return null;

  // Loading state
  if (state === "loading") {
    return (
      <div className="mt-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-center gap-3">
          <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading live scores...</span>
        </div>
      </div>
    );
  }

  // Error / no match state
  if (state === "error" || state === "no-match" || !data) {
    return (
      <div className="mt-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400">
              {state === "no-match"
                ? "Waiting for match data..."
                : "Score update failed"}
            </span>
          </div>
          <button
            onClick={fetchScore}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine ball display colors
  const getBallStyle = (ball: string) => {
    const b = ball.toUpperCase();
    if (b === "W") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (b === "0" || b === ".") return "bg-gray-800/50 text-gray-500 border-gray-700";
    if (b === "4") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (b === "6") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
  };

  return (
    <div className="mt-4 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Header row: LIVE indicator + status + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            Score updates every 30s
          </span>
        </div>
        <button
          onClick={fetchScore}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          title="Refresh score"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h4.5M20 20v-5h-4.5M4.5 9A8 8 0 0119.8 7.5M19.5 15A8 8 0 014.2 16.5"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main score display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{data.battingTeam}</p>
          <p className="text-2xl font-bold text-white">
            {data.score}
            <span className="text-sm font-normal text-gray-500 ml-1.5">
              ({data.overs} ov)
            </span>
          </p>
        </div>
        <div className="text-right space-y-0.5">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-gray-500">CRR</span>
            <span className="text-sm font-semibold text-indigo-400">
              {data.runRate}
            </span>
          </div>
          {data.requiredRunRate && (
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-gray-500">RRR</span>
              <span className="text-sm font-semibold text-purple-400">
                {data.requiredRunRate}
              </span>
            </div>
          )}
          {data.target && (
            <p className="text-xs text-gray-500">
              Target: {data.target}
            </p>
          )}
        </div>
      </div>

      {/* Match status line */}
      {data.matchStatus && (
        <p className="text-xs text-yellow-400/80 bg-yellow-500/5 px-2 py-1 rounded">
          {data.matchStatus}
        </p>
      )}

      {/* Batsmen & Bowler */}
      {(data.batsmen.length > 0 || data.bowler) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Batsmen */}
          {data.batsmen.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">
                Batting
              </p>
              {data.batsmen.map((b, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 truncate max-w-[80px]">
                    {i === 0 ? (
                      <span className="text-indigo-400">*</span>
                    ) : null}
                    {b.name}
                  </span>
                  <span className="text-xs font-medium text-white ml-1">
                    {b.runs}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Bowler */}
          {data.bowler && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">
                Bowling
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300 truncate max-w-[80px]">
                  {data.bowler.name}
                </span>
                <span className="text-xs font-medium text-white ml-1">
                  {data.bowler.figures}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Last 6 balls */}
      {data.lastSixBalls.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
            Last 6 Balls
          </p>
          <div className="flex gap-1.5">
            {data.lastSixBalls.map((ball, i) => (
              <span
                key={i}
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-medium ${getBallStyle(ball)}`}
              >
                {ball === "0" ? "." : ball}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: last updated + stale indicator */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800/50">
        <span className="text-[10px] text-gray-600">
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : ""}
        </span>
        {data.stale && (
          <span className="text-[10px] text-yellow-500">Using cached data</span>
        )}
        <span className="text-[10px] text-gray-600 sm:hidden">
          Updates every 30s
        </span>
      </div>
    </div>
  );
}
