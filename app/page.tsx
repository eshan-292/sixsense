import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import NextMatchCountdown from "@/components/NextMatchCountdown";
import { autoUpdateMatchStatuses } from "@/lib/auto-status";
import type { Match } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Filter out test matches (TTA, TTB etc.)
function filterRealMatches(matches: Match[] | null): Match[] {
  if (!matches) return [];
  return matches.filter(
    (m) => !m.team_a_short.startsWith("TT") && !m.team_b_short.startsWith("TT")
  );
}

export default async function Home() {
  await autoUpdateMatchStatuses();

  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's matches
  const { data: rawTodayMatches } = await supabase
    .from("matches")
    .select("*")
    .gte("match_date", today.toISOString())
    .lt("match_date", tomorrow.toISOString())
    .order("match_date", { ascending: true });

  // Upcoming matches (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: rawUpcomingMatches } = await supabase
    .from("matches")
    .select("*")
    .gte("match_date", tomorrow.toISOString())
    .lt("match_date", nextWeek.toISOString())
    .order("match_date", { ascending: true });

  const todayMatches = filterRealMatches(rawTodayMatches);
  const upcomingMatches = filterRealMatches(rawUpcomingMatches);

  // Find next upcoming match for countdown
  const nextMatch =
    todayMatches.find((m) => new Date(m.match_date).getTime() > Date.now()) ||
    upcomingMatches[0];

  const hasAnyMatch = todayMatches.length > 0 || upcomingMatches.length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Countdown banner */}
      {nextMatch && (
        <NextMatchCountdown
          matchDate={nextMatch.match_date}
          matchId={nextMatch.id}
          teamA={nextMatch.team_a_short}
          teamB={nextMatch.team_b_short}
        />
      )}

      {/* Today's Matches */}
      {todayMatches.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-[#8899a6] uppercase tracking-wider mb-3">
            Today
          </h2>
          <div className="space-y-3">
            {todayMatches.map((match: Match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-[#8899a6] uppercase tracking-wider mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcomingMatches.map((match: Match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
          <Link
            href="/schedule"
            className="block text-center text-xs text-[#e63946] hover:text-[#ff4d5a] mt-3 py-2 transition-colors"
          >
            See full schedule →
          </Link>
        </section>
      )}

      {/* Empty State */}
      {!hasAnyMatch && (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🏏</p>
          <p className="text-white text-lg font-semibold">No matches yet</p>
          <p className="text-[#556677] text-sm mt-1">
            Check back soon for IPL predictions!
          </p>
        </div>
      )}

      {/* How to Play */}
      <section className="mb-6">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e63946]/10 flex items-center justify-center shrink-0">
                <span className="text-sm">🎯</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Predict</p>
                <p className="text-xs text-[#8899a6]">Pick match outcomes and wager virtual coins</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 flex items-center justify-center shrink-0">
                <span className="text-sm">📈</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Earn</p>
                <p className="text-xs text-[#8899a6]">Win coins based on odds — early bets lock better rates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2ecc71]/10 flex items-center justify-center shrink-0">
                <span className="text-sm">🏆</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Compete</p>
                <p className="text-xs text-[#8899a6]">Climb the leaderboard and prove your cricket IQ</p>
              </div>
            </div>
          </div>
          <Link
            href="/how-to-play"
            className="block text-center text-xs text-[#e63946] mt-3 pt-3 border-t border-[#243040]"
          >
            Full rules & strategies →
          </Link>
        </div>
      </section>
    </div>
  );
}
