import { createClient } from "@/lib/supabase/server";
import { getTeamColor } from "@/lib/utils";
import Link from "next/link";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  // Group matches by date
  const grouped: Record<string, Match[]> = {};
  matches?.forEach((match) => {
    const dateKey = new Date(match.match_date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(match);
  });

  const totalMatches = matches?.length || 0;
  const completedMatches = matches?.filter((m) => m.status === "completed").length || 0;
  const liveMatches = matches?.filter((m) => m.status === "live").length || 0;

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">
            IPL 2026 Schedule
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Complete fixtures list &middot; {totalMatches} matches
          </p>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{completedMatches}</p>
              <p className="text-[10px] text-gray-500">Completed</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-400">{liveMatches}</p>
              <p className="text-[10px] text-gray-500">Live</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-blue-400">
                {totalMatches - completedMatches - liveMatches}
              </p>
              <p className="text-[10px] text-gray-500">Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {Object.entries(grouped).map(([date, dayMatches]) => {
          const isToday = (() => {
            const d = new Date(dayMatches[0].match_date);
            const now = new Date();
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })();

          return (
            <div key={date} className="mb-6">
              <div className="flex items-center gap-2 mb-2 sticky top-14 z-10 bg-[#030712]/90 backdrop-blur-sm py-2">
                <div className={`h-px flex-1 ${isToday ? "bg-gradient-to-r from-orange-500/50 to-transparent" : "bg-gray-800/50"}`} />
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-orange-400" : "text-gray-500"}`}>
                  {isToday && "🔥 "}{date}
                  {dayMatches.length > 1 && (
                    <span className="text-gray-600 ml-1.5 normal-case">
                      ({dayMatches.length} matches)
                    </span>
                  )}
                </h3>
                <div className={`h-px flex-1 ${isToday ? "bg-gradient-to-l from-orange-500/50 to-transparent" : "bg-gray-800/50"}`} />
              </div>

              <div className="space-y-2">
                {dayMatches.map((match, idx) => (
                  <Link key={match.id} href={`/match/${match.id}`}>
                    <div
                      className={`glass-card rounded-lg p-3 hover:bg-gray-800/50 transition-all cursor-pointer ${
                        isToday ? "border-orange-500/20 border" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full ${getTeamColor(match.team_a_short)} flex items-center justify-center text-[10px] font-bold shrink-0`}
                          >
                            {match.team_a_short}
                          </div>
                          <span className="text-sm font-medium text-white truncate">
                            {match.team_a_short}
                          </span>
                        </div>

                        <div className="px-2 shrink-0 flex flex-col items-center">
                          <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(match.match_date).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[9px] text-gray-700">vs</span>
                        </div>

                        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                          <span className="text-sm font-medium text-white truncate text-right">
                            {match.team_b_short}
                          </span>
                          <div
                            className={`w-9 h-9 rounded-full ${getTeamColor(match.team_b_short)} flex items-center justify-center text-[10px] font-bold shrink-0`}
                          >
                            {match.team_b_short}
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-600 mt-1.5 text-center truncate">
                        📍 {match.venue}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {(!matches || matches.length === 0) && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-gray-400">No schedule available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
