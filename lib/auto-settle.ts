import { createAdminClient } from "./supabase/admin";

/**
 * Auto-settle markets for completed matches by scraping Cricbuzz results.
 * Called from autoUpdateMatchStatuses() on server page loads.
 *
 * Flow:
 * 1. Find "live" matches that have been live for 4+ hours (likely finished)
 * 2. Scrape Cricbuzz for match result
 * 3. If match is completed, parse results and settle markets
 * 4. Update match status to "completed"
 */

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const TEAM_ALIASES: Record<string, string[]> = {
  CSK: ["chennai super kings", "chennai", "csk"],
  MI: ["mumbai indians", "mumbai", "mi"],
  RCB: ["royal challengers bengaluru", "royal challengers bangalore", "rcb", "bengaluru"],
  KKR: ["kolkata knight riders", "kolkata", "kkr"],
  DC: ["delhi capitals", "delhi", "dc"],
  SRH: ["sunrisers hyderabad", "hyderabad", "srh"],
  RR: ["rajasthan royals", "rajasthan", "rr"],
  PBKS: ["punjab kings", "punjab", "pbks"],
  GT: ["gujarat titans", "gujarat", "gt"],
  LSG: ["lucknow super giants", "lucknow", "lsg"],
};

interface ParsedResult {
  winner: string | null; // short name e.g. "RCB"
  winnerFull: string | null;
  teamAScore: string | null; // e.g. "201/9"
  teamBScore: string | null;
  teamAOvers: string | null;
  teamBOvers: string | null;
  totalRuns: number | null;
  firstInningsScore: number | null;
  highestScore: number | null;
  statusText: string;
  wonByText: string | null; // e.g. "won by 6 wickets"
  tossWinner: string | null;
  isCompleted: boolean;
}

function teamMatches(text: string, teamShort: string): boolean {
  const lower = text.toLowerCase();
  const aliases = TEAM_ALIASES[teamShort] || [teamShort.toLowerCase()];
  return aliases.some((a) => lower.includes(a));
}

function extractShortName(text: string): string {
  const lower = text.toLowerCase();
  for (const [short, aliases] of Object.entries(TEAM_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) return short;
  }
  return text.substring(0, 3).toUpperCase();
}

/**
 * Find a Cricbuzz match and scrape its result
 */
async function fetchCricbuzzResult(
  teamAShort: string,
  teamBShort: string
): Promise<ParsedResult | null> {
  try {
    // Step 1: Find the match on Cricbuzz live scores page
    const res = await fetch("https://www.cricbuzz.com/cricket-match/live-scores", {
      headers: FETCH_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Find match URL
    const matchPattern = /\/live-cricket-scores\/(\d+)\/([^"]+)/g;
    let matchUrl: string | null = null;
    let m;
    while ((m = matchPattern.exec(html)) !== null) {
      const slug = m[2].toLowerCase().replace(/-/g, " ");
      if (teamMatches(slug, teamAShort) && teamMatches(slug, teamBShort)) {
        matchUrl = `https://www.cricbuzz.com/live-cricket-scores/${m[1]}/${m[2]}`;
        break;
      }
    }

    if (!matchUrl) return null;

    // Step 2: Fetch the match page
    const matchRes = await fetch(matchUrl, {
      headers: FETCH_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!matchRes.ok) return null;
    const matchHtml = await matchRes.text();

    return parseMatchResult(matchHtml, teamAShort, teamBShort);
  } catch {
    return null;
  }
}

function parseMatchResult(
  html: string,
  teamAShort: string,
  teamBShort: string
): ParsedResult {
  const result: ParsedResult = {
    winner: null,
    winnerFull: null,
    teamAScore: null,
    teamBScore: null,
    teamAOvers: null,
    teamBOvers: null,
    totalRuns: null,
    firstInningsScore: null,
    highestScore: null,
    statusText: "",
    wonByText: null,
    tossWinner: null,
    isCompleted: false,
  };

  // Check if match is completed
  const wonByMatch = html.match(
    /([A-Za-z ]+)(won by \d+ (?:runs?|wkts?|wickets?))/i
  );
  if (wonByMatch) {
    result.isCompleted = true;
    result.winnerFull = wonByMatch[1].trim();
    result.winner = extractShortName(result.winnerFull);
    result.wonByText = wonByMatch[2].trim();
    result.statusText = `${result.winnerFull} ${result.wonByText}`;
  }

  // Extract scores from og:title
  // Format: "TEAM1 SCORE/WICKETS (OVERS) vs TEAM2 SCORE/WICKETS"
  const scorePattern =
    /([A-Z]{2,5})\s+(\d+)(?:\/(\d+))?\s*\((\d+\.?\d*)\)/gi;
  const scores: { team: string; runs: number; wickets: number; overs: string }[] = [];
  let scoreMatch;
  while ((scoreMatch = scorePattern.exec(html.substring(0, 5000))) !== null) {
    scores.push({
      team: scoreMatch[1],
      runs: parseInt(scoreMatch[2]),
      wickets: parseInt(scoreMatch[3] || "10"),
      overs: scoreMatch[4],
    });
    if (scores.length >= 2) break; // Only need first 2 innings
  }

  if (scores.length >= 1) {
    result.firstInningsScore = scores[0].runs;
    result.teamAScore = `${scores[0].runs}/${scores[0].wickets}`;
    result.teamAOvers = scores[0].overs;
  }
  if (scores.length >= 2) {
    result.teamBScore = `${scores[1].runs}/${scores[1].wickets}`;
    result.teamBOvers = scores[1].overs;
  }

  if (scores.length >= 2) {
    result.totalRuns = scores[0].runs + scores[1].runs;
  }

  // Extract toss winner
  const tossMatch = html.match(
    /([A-Za-z ]+)(?:opt(?:ed)?|elected|chose) to (?:bat|bowl)/i
  );
  if (tossMatch) {
    result.tossWinner = extractShortName(tossMatch[1].trim());
  }

  // Find highest individual score from batting data in HTML
  const battingScores = html.match(/(\d{2,3})\s*\(\d+\)/g);
  if (battingScores) {
    const runs = battingScores.map((s) => parseInt(s.match(/(\d+)/)?.[1] || "0"));
    result.highestScore = Math.max(...runs);
  }

  return result;
}

/**
 * Resolve market answers from parsed results
 */
function resolveMarkets(
  markets: { id: string; question: string; options: { id: string; label: string; odds: number }[] }[],
  result: ParsedResult,
  teamAShort: string,
  teamBShort: string
): Record<string, string> {
  const resolved: Record<string, string> = {}; // market_id -> correct option_id

  for (const market of markets) {
    const q = market.question.toLowerCase();
    let correctOpt: { id: string; label: string } | undefined;

    // Match Winner
    if ((q.includes("who will win") || q.includes("match winner")) && !q.includes("toss")) {
      if (result.winner) {
        correctOpt = market.options.find((o) =>
          o.label.toUpperCase().includes(result.winner!) ||
          teamMatches(o.label, result.winner!)
        );
      }
    }

    // Toss Winner
    else if (q.includes("toss")) {
      if (result.tossWinner) {
        correctOpt = market.options.find((o) =>
          o.label.toUpperCase().includes(result.tossWinner!) ||
          teamMatches(o.label, result.tossWinner!)
        );
      }
    }

    // Total Runs Over/Under
    else if (q.includes("total") && (q.includes("exceed") || q.includes("combined"))) {
      if (result.totalRuns !== null) {
        const numMatch = q.match(/(\d{2,3})/);
        if (numMatch) {
          const threshold = parseInt(numMatch[1]);
          const isOver = result.totalRuns > threshold;
          correctOpt = market.options.find((o) => {
            const l = o.label.toLowerCase();
            return isOver
              ? l.includes("over") || l.includes("yes")
              : l.includes("under") || l.includes("no");
          });
        }
      }
    }

    // First Innings Score bracket
    else if (q.includes("first innings score")) {
      if (result.firstInningsScore !== null) {
        const s = result.firstInningsScore;
        correctOpt = market.options.find((o) => {
          const l = o.label.toLowerCase();
          if (l.includes("under 150") && s < 150) return true;
          if ((l.includes("150-179") || l.includes("150 - 179")) && s >= 150 && s <= 179) return true;
          if ((l.includes("180-199") || l.includes("180 - 199")) && s >= 180 && s <= 199) return true;
          if (l.includes("200+") && s >= 200) return true;
          const rangeMatch = l.match(/(\d+)\s*[-–]\s*(\d+)/);
          if (rangeMatch && s >= parseInt(rangeMatch[1]) && s <= parseInt(rangeMatch[2])) return true;
          return false;
        });
      }
    }

    // Player of the Match (by team)
    else if (q.includes("player of the match") || q.includes("team player")) {
      if (result.winner) {
        correctOpt = market.options.find((o) =>
          o.label.toUpperCase().includes(result.winner!) ||
          teamMatches(o.label, result.winner!)
        );
      }
    }

    // Century scored
    else if (q.includes("century")) {
      if (result.highestScore !== null) {
        const hasCentury = result.highestScore >= 100;
        correctOpt = market.options.find((o) => {
          const l = o.label.toLowerCase();
          return hasCentury
            ? l.includes("yes") || l.includes("century!")
            : l.includes("no");
        });
      }
    }

    // Super Over
    else if (q.includes("super over")) {
      // If we have a regular "won by" result, no super over
      if (result.wonByText) {
        correctOpt = market.options.find((o) => o.label.toLowerCase().includes("no"));
      }
    }

    // Highest Individual Score bracket
    else if (q.includes("highest individual score")) {
      if (result.highestScore !== null) {
        const s = result.highestScore;
        correctOpt = market.options.find((o) => {
          const l = o.label.toLowerCase();
          if (l.includes("under 50") && s < 50) return true;
          if ((l.includes("50-74") || l.includes("50 - 74")) && s >= 50 && s <= 74) return true;
          if ((l.includes("75-99") || l.includes("75 - 99")) && s >= 75 && s <= 99) return true;
          if (l.includes("100+") && s >= 100) return true;
          const rangeMatch = l.match(/(\d+)\s*[-–]\s*(\d+)/);
          if (rangeMatch && s >= parseInt(rangeMatch[1]) && s <= parseInt(rangeMatch[2])) return true;
          return false;
        });
      }
    }

    // Win method
    else if (q.includes("winning team win") || q.includes("how will")) {
      if (result.wonByText) {
        const wbt = result.wonByText.toLowerCase();
        if (wbt.includes("wicket")) {
          correctOpt = market.options.find((o) => o.label.toLowerCase().includes("wicket"));
        } else {
          const runsMatch = wbt.match(/(\d+)\s*run/);
          if (runsMatch) {
            const margin = parseInt(runsMatch[1]);
            correctOpt = market.options.find((o) => {
              const l = o.label.toLowerCase();
              if (l.includes("1-20") && margin >= 1 && margin <= 20) return true;
              if (l.includes("21-40") && margin >= 21 && margin <= 40) return true;
              if (l.includes("40+") && margin > 40) return true;
              return false;
            });
          }
        }
      }
    }

    if (correctOpt) {
      resolved[market.id] = correctOpt.id;
    }
  }

  return resolved;
}

// SSR reward constants (must match settle/route.ts)
type MarketTier = "easy" | "medium" | "hard";
const SSR_REWARDS: Record<MarketTier, number> = { easy: 10, medium: 25, hard: 50 };
const SSR_PENALTY = 3;
function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

/**
 * Settle a single market (same logic as /api/settle but without HTTP)
 */
async function settleMarket(
  admin: ReturnType<typeof createAdminClient>,
  marketId: string,
  correctOptionId: string
): Promise<{ settled: number; paidOut: number }> {
  const { data: market } = await admin
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .single();

  if (!market || market.status === "settled") return { settled: 0, paidOut: 0 };

  const tier: MarketTier = market.tier || "easy";
  const baseSSR = SSR_REWARDS[tier];

  const { data: predictions } = await admin
    .from("predictions")
    .select("*")
    .eq("market_id", marketId);

  let totalPaidOut = 0;

  if (predictions) {
    for (const pred of predictions) {
      const isWinner = pred.selected_option_id === correctOptionId;
      const winningOption = market.options.find(
        (o: { id: string; odds: number }) => o.id === correctOptionId
      );
      const payoutOdds = pred.locked_odds || winningOption?.odds || 1;
      const coinsWon = isWinner ? Math.floor(pred.coins_wagered * payoutOdds) : 0;
      totalPaidOut += coinsWon;

      const { data: userProfile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", pred.user_id)
        .single();
      if (!userProfile) continue;

      const newStreak = isWinner ? (userProfile.current_streak || 0) + 1 : 0;
      const newWinStreak = isWinner ? userProfile.win_streak + 1 : 0;
      let ssrEarned = isWinner
        ? Math.floor(baseSSR * getStreakMultiplier(newStreak))
        : -SSR_PENALTY;

      await admin
        .from("predictions")
        .update({ coins_won: coinsWon, ssr_earned: ssrEarned })
        .eq("id", pred.id);

      await admin
        .from("profiles")
        .update({
          coins: userProfile.coins + coinsWon,
          total_wins: userProfile.total_wins + (isWinner ? 1 : 0),
          total_losses: userProfile.total_losses + (isWinner ? 0 : 1),
          win_streak: newWinStreak,
          best_streak: Math.max(userProfile.best_streak, newWinStreak),
          ssr: Math.max(0, (userProfile.ssr || 0) + ssrEarned),
          ssr_today: (userProfile.ssr_today || 0) + (isWinner ? ssrEarned : 0),
          current_streak: newStreak,
        })
        .eq("id", pred.user_id);
    }
  }

  // Mark market as settled
  await admin
    .from("markets")
    .update({ status: "settled", correct_option_id: correctOptionId })
    .eq("id", marketId);

  return { settled: predictions?.length || 0, paidOut: totalPaidOut };
}

/**
 * Main auto-settle function.
 * Checks live matches that have been running 3.5+ hours (T20 typically finishes in ~3.5h)
 * and attempts to settle them using Cricbuzz results.
 */
export async function autoSettleCompletedMatches() {
  const admin = createAdminClient();

  // Find live matches that started 3.5+ hours ago (likely finished)
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 3, cutoff.getMinutes() - 30);

  const { data: liveMatches } = await admin
    .from("matches")
    .select("*")
    .eq("status", "live")
    .lt("match_date", cutoff.toISOString());

  if (!liveMatches || liveMatches.length === 0) return;

  for (const match of liveMatches) {
    // Skip test matches
    if (match.team_a_short.startsWith("TT")) continue;

    // Fetch result from Cricbuzz
    const result = await fetchCricbuzzResult(match.team_a_short, match.team_b_short);
    if (!result || !result.isCompleted) continue;

    // Get unsettled markets
    const { data: markets } = await admin
      .from("markets")
      .select("*")
      .eq("match_id", match.id)
      .in("status", ["open", "locked"]);

    if (!markets || markets.length === 0) {
      // No markets to settle, just update match status
      const matchResult = result.winner === match.team_a_short
        ? "team_a_win"
        : result.winner === match.team_b_short
          ? "team_b_win"
          : "no_result";
      await admin
        .from("matches")
        .update({ status: "completed", result: matchResult })
        .eq("id", match.id);
      continue;
    }

    // Resolve markets
    const resolved = resolveMarkets(markets, result, match.team_a_short, match.team_b_short);

    // Settle resolved markets
    let settledCount = 0;
    for (const [marketId, correctOptionId] of Object.entries(resolved)) {
      await settleMarket(admin, marketId, correctOptionId);
      settledCount++;
    }

    // Update match status
    const matchResult = result.winner === match.team_a_short
      ? "team_a_win"
      : result.winner === match.team_b_short
        ? "team_b_win"
        : "no_result";
    await admin
      .from("matches")
      .update({ status: "completed", result: matchResult })
      .eq("id", match.id);

    console.log(
      `[auto-settle] ${match.team_a_short} vs ${match.team_b_short}: ` +
      `${settledCount}/${markets.length} markets settled, ` +
      `result: ${result.statusText}`
    );
  }
}
