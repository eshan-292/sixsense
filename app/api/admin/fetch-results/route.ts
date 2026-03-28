import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchCurrentMatches,
  fetchScorecard,
  resolveMatchResults,
  autoResolveMarkets,
  getShortName,
  type MatchResults,
} from "@/lib/cricket-api";

/**
 * POST /api/admin/fetch-results
 * Fetches live results from CricketData.org and returns auto-resolved market answers.
 * Body: { match_id: string }  (our internal match ID)
 *
 * The endpoint:
 * 1. Gets the match from our DB
 * 2. Searches CricketData.org for a matching completed match
 * 3. Fetches the scorecard
 * 4. Auto-resolves each market question against the real data
 * 5. Returns the suggested answers (admin still confirms before settling)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { match_id } = await request.json();
  if (!match_id) {
    return NextResponse.json({ error: "Missing match_id" }, { status: 400 });
  }

  // Get our match
  const { data: match } = await admin
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Get unsettled markets for this match
  const { data: markets } = await admin
    .from("markets")
    .select("id, question, options, status")
    .eq("match_id", match_id)
    .in("status", ["open", "locked"]);

  if (!markets || markets.length === 0) {
    return NextResponse.json({ error: "No unsettled markets" }, { status: 400 });
  }

  try {
    // Search for this match in CricketData.org
    const currentMatches = await fetchCurrentMatches();

    // Try to find our match by team names
    const teamAShort = match.team_a_short?.toUpperCase();
    const teamBShort = match.team_b_short?.toUpperCase();
    const teamAFull = match.team_a?.toLowerCase();
    const teamBFull = match.team_b?.toLowerCase();

    const cricMatch = currentMatches.find((cm) => {
      const matchTeams = cm.teams?.map((t: string) => t.toLowerCase()) || [];
      const matchName = cm.name?.toLowerCase() || "";
      return (
        (matchTeams.some((t: string) => t.includes(teamAFull || "")) &&
         matchTeams.some((t: string) => t.includes(teamBFull || ""))) ||
        (matchName.includes(teamAFull || "") && matchName.includes(teamBFull || ""))
      );
    });

    if (!cricMatch) {
      return NextResponse.json({
        error: "Match not found on CricketData.org. It may not have started or the API may not have it yet.",
        searched_for: `${match.team_a} vs ${match.team_b}`,
        available_matches: currentMatches.map((m) => m.name).slice(0, 10),
      }, { status: 404 });
    }

    if (!cricMatch.matchEnded) {
      return NextResponse.json({
        error: "Match found but not yet completed",
        cric_match_id: cricMatch.id,
        status: cricMatch.status,
        score: cricMatch.score,
      }, { status: 400 });
    }

    // Fetch detailed scorecard
    const scorecard = await fetchScorecard(cricMatch.id);
    const results = resolveMatchResults(scorecard);

    // Auto-resolve markets
    const resolved = autoResolveMarkets(
      markets.map((m) => ({
        id: m.id,
        question: m.question,
        options: m.options as { id: string; label: string }[],
      })),
      results,
      teamAShort,
      teamBShort
    );

    return NextResponse.json({
      success: true,
      cric_match_id: cricMatch.id,
      results: {
        matchWinner: results.matchWinner,
        matchWinnerFull: results.matchWinnerFull,
        totalRuns: results.totalRuns,
        firstInningsScore: results.firstInningsScore,
        manOfTheMatch: results.manOfTheMatch,
        status: results.status,
        scores: results.scores,
      },
      resolved_markets: resolved,
      unresolved_markets: markets
        .filter((m) => !resolved[m.id])
        .map((m) => ({ id: m.id, question: m.question })),
    });
  } catch (err: any) {
    return NextResponse.json({
      error: `Cricket API error: ${err.message}`,
    }, { status: 500 });
  }
}
