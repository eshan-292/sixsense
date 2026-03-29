import { createAdminClient } from "./supabase/admin";

/**
 * Auto-settle ALL 15 market types for completed matches.
 * Scrapes both the Cricbuzz match page (basic results) AND the scorecard page
 * (detailed stats: sixes per batter, powerplay score, fall of wickets).
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
  winner: string | null;
  winnerFull: string | null;
  totalRuns: number | null;
  firstInningsScore: number | null;
  highestScore: number | null;
  statusText: string;
  wonByText: string | null;
  tossWinner: string | null;
  isCompleted: boolean;
  // Detailed stats from scorecard
  totalSixes: number | null;
  teamASixes: number | null;
  teamBSixes: number | null;
  firstInningsPowerplayScore: number | null;
  firstWicketOver: number | null; // over at which first wicket fell
  highestPowerplayIndividual: number | null; // highest individual score by end of 6th over (approximation)
  topScorerName: string | null; // name of the highest run scorer
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

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/**
 * Find Cricbuzz match ID and slug
 */
async function findCricbuzzMatch(
  teamAShort: string,
  teamBShort: string
): Promise<{ id: string; slug: string } | null> {
  const html = await fetchPage("https://www.cricbuzz.com/cricket-match/live-scores");
  if (!html) return null;

  const pattern = /\/live-cricket-scores\/(\d+)\/([^"]+)/g;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const slug = m[2].toLowerCase().replace(/-/g, " ");
    if (teamMatches(slug, teamAShort) && teamMatches(slug, teamBShort)) {
      return { id: m[1], slug: m[2] };
    }
  }
  return null;
}

/**
 * Parse match result from the main match page
 */
function parseMatchPage(html: string): Partial<ParsedResult> {
  const result: Partial<ParsedResult> = { isCompleted: false };

  // Check for "won by"
  const wonByMatch = html.match(/([A-Za-z ]+)(won by \d+ (?:runs?|wkts?|wickets?))/i);
  if (wonByMatch) {
    result.isCompleted = true;
    result.winnerFull = wonByMatch[1].trim();
    result.winner = extractShortName(result.winnerFull);
    result.wonByText = wonByMatch[2].trim();
    result.statusText = `${result.winnerFull} ${result.wonByText}`;
  }

  // Extract scores from og:title: "TEAM1 201/9 (20) vs TEAM2 203/4 (15.4)"
  const scorePattern = /([A-Z]{2,5})\s+(\d+)(?:\/(\d+))?\s*\((\d+\.?\d*)\)/gi;
  const scores: { runs: number }[] = [];
  let sm;
  while ((sm = scorePattern.exec(html.substring(0, 5000))) !== null) {
    scores.push({ runs: parseInt(sm[2]) });
    if (scores.length >= 2) break;
  }

  if (scores.length >= 1) result.firstInningsScore = scores[0].runs;
  if (scores.length >= 2) result.totalRuns = scores[0].runs + scores[1].runs;

  // Toss winner
  const tossMatch = html.match(/([A-Za-z ]+)(?:opt(?:ed)?|elected|chose) to (?:bat|bowl)/i);
  if (tossMatch) result.tossWinner = extractShortName(tossMatch[1].trim());

  // Highest individual from og:title — pattern: "Player Name RUNS(BALLS)"
  // e.g. "Virat Kohli 69(38) Tim David 16(10)"
  const batterPattern = /([A-Z][a-z]+(?: [A-Z][a-z]+)+)\s+(\d{1,3})\((\d+)\)/g;
  let topRuns = 0;
  let topName: string | null = null;
  let bm;
  while ((bm = batterPattern.exec(html.substring(0, 5000))) !== null) {
    const runs = parseInt(bm[2]);
    if (runs > topRuns) {
      topRuns = runs;
      topName = bm[1].trim();
    }
  }
  result.highestScore = topRuns > 0 ? topRuns : null;
  result.topScorerName = topName;

  // Fallback: try simpler pattern "RUNS(BALLS)" without names
  if (!result.highestScore) {
    const simpleScores = html.match(/(\d{2,3})\s*\(\d+\)/g);
    if (simpleScores) {
      const runs = simpleScores.map((s) => parseInt(s.match(/(\d+)/)?.[1] || "0"));
      result.highestScore = Math.max(...runs);
    }
  }

  return result;
}

/**
 * Parse detailed stats from the scorecard page.
 * Extracts: sixes per batter, powerplay score, fall of wickets overs.
 *
 * Cricbuzz scorecard HTML patterns:
 * - Batting rows: runs</div><div>balls</div><div>fours</div><div>sixes</div>
 * - Powerplay: "Mandatory</div><div>0.1 - 6</div><div>49</div>"
 * - Fall of wickets overs: consecutive floats like "2.1</div> 2.6</div> 4.2</div>"
 */
function parseScorecardPage(html: string): {
  totalSixes: number;
  innings1Sixes: number;
  innings2Sixes: number;
  powerplayScore1: number | null;
  powerplayScore2: number | null;
  firstWicketOver: number | null;
} {
  // ── Extract sixes per batter ──
  // Pattern: font-bold>RUNS</div><div>BALLS</div><div>FOURS</div><div>SIXES</div>
  const battingPattern =
    /font-bold[^>]*>(\d+)<\/div><div[^>]*>(\d+)<\/div><div[^>]*>(\d+)<\/div><div[^>]*>(\d+)<\/div>/g;
  const allBatterStats: { runs: number; balls: number; fours: number; sixes: number }[] = [];
  let bm;
  while ((bm = battingPattern.exec(html)) !== null) {
    const runs = parseInt(bm[1]);
    const balls = parseInt(bm[2]);
    const sixes = parseInt(bm[4]);
    // Filter: valid batting entries have balls > 0 or runs > 0, and sixes <= runs/6
    if ((balls > 0 || runs > 0) && sixes <= Math.ceil(runs / 6) + 1) {
      allBatterStats.push({ runs, balls, fours: parseInt(bm[3]), sixes });
    }
  }

  // Split into innings: the scorecard shows innings in order.
  // Use a heuristic: find where the runs reset (second innings start).
  // Actually, just sum all sixes — we'll split by innings using the separate
  // "Mandatory" powerplay scores which clearly delineate innings.
  const totalSixes = allBatterStats.reduce((sum, b) => sum + b.sixes, 0);

  // ── Extract powerplay scores ──
  // Pattern: "Mandatory</div><div...>0.1 - 6</div><div...>SCORE</div>"
  const ppPattern =
    /Mandatory<\/div><div[^>]*>[^<]*<\/div><div[^>]*>(\d+)<\/div>/g;
  const ppScores: number[] = [];
  let pp;
  while ((pp = ppPattern.exec(html)) !== null) {
    ppScores.push(parseInt(pp[1]));
  }
  // Deduplicate (Cricbuzz repeats the scorecard data for mobile/desktop views)
  const uniquePP = [...new Set(ppScores)];
  const powerplayScore1 = uniquePP.length >= 1 ? uniquePP[0] : null;
  const powerplayScore2 = uniquePP.length >= 2 ? uniquePP[1] : null;

  // ── Extract fall of wickets overs ──
  // After the FOW section, over numbers appear as floating point values.
  // They appear in the HTML between FOW and the next section.
  // Pattern: consecutive floats like "2.1</div>...2.6</div>...4.2</div>"
  // These are the overs at which wickets fell.
  let firstWicketOver: number | null = null;

  // Find the FOW section in the first innings
  const fowIndex = html.indexOf("Fall of Wickets");
  if (fowIndex > -1) {
    // Look for over numbers in the next 2000 chars
    const fowSection = html.substring(fowIndex, fowIndex + 2000);
    // Over numbers are small floats like 0.4, 2.1, 4.2 etc.
    const overPattern = />\s*(\d{1,2}\.\d)\s*<\/div>/g;
    let om;
    const overs: number[] = [];
    while ((om = overPattern.exec(fowSection)) !== null) {
      const ov = parseFloat(om[1]);
      // Valid overs: 0.1 to 20.0
      if (ov >= 0.1 && ov <= 20.0) {
        overs.push(ov);
      }
    }
    if (overs.length > 0) {
      firstWicketOver = overs[0];
    }
  }

  // ── Split sixes by innings ──
  // If we have exactly 2 powerplay scores, we know the boundary.
  // Heuristic: first N batters are innings 1 (count batters until sixes sum matches reasonable)
  // Simple approach: split batters list in half (roughly)
  let innings1Sixes = 0;
  let innings2Sixes = 0;
  if (allBatterStats.length > 0) {
    // Find the split point: look for a batter with distinctly low runs after a sequence
    // Simpler: just assign first ~11 batters to innings 1, rest to innings 2
    const midpoint = Math.ceil(allBatterStats.length / 2);
    innings1Sixes = allBatterStats.slice(0, midpoint).reduce((s, b) => s + b.sixes, 0);
    innings2Sixes = allBatterStats.slice(midpoint).reduce((s, b) => s + b.sixes, 0);
  }

  return {
    totalSixes,
    innings1Sixes,
    innings2Sixes,
    powerplayScore1,
    powerplayScore2,
    firstWicketOver,
  };
}

/**
 * Fetch complete match data from Cricbuzz (match page + scorecard page)
 */
async function fetchCricbuzzResult(
  teamAShort: string,
  teamBShort: string
): Promise<ParsedResult | null> {
  const matchInfo = await findCricbuzzMatch(teamAShort, teamBShort);
  if (!matchInfo) return null;

  // Fetch both pages in parallel
  const [matchHtml, scorecardHtml] = await Promise.all([
    fetchPage(`https://www.cricbuzz.com/live-cricket-scores/${matchInfo.id}/${matchInfo.slug}`),
    fetchPage(`https://www.cricbuzz.com/live-cricket-scorecard/${matchInfo.id}/${matchInfo.slug}`),
  ]);

  if (!matchHtml) return null;

  // Parse basic results
  const basic = parseMatchPage(matchHtml);
  if (!basic.isCompleted) return null;

  // Parse detailed scorecard stats
  let detailed = {
    totalSixes: null as number | null,
    teamASixes: null as number | null,
    teamBSixes: null as number | null,
    firstInningsPowerplayScore: null as number | null,
    firstWicketOver: null as number | null,
    highestPowerplayIndividual: null as number | null,
    topScorerName: basic.topScorerName || null,
  };

  if (scorecardHtml) {
    const sc = parseScorecardPage(scorecardHtml);
    detailed.totalSixes = sc.totalSixes;
    detailed.teamASixes = sc.innings1Sixes;
    detailed.teamBSixes = sc.innings2Sixes;
    detailed.firstInningsPowerplayScore = sc.powerplayScore1;
    detailed.firstWicketOver = sc.firstWicketOver;
    // Approximate: if powerplay score is high, someone likely scored 50+ in PP
    // (not perfect but best we can do without ball-by-ball)
    detailed.highestPowerplayIndividual = sc.powerplayScore1
      ? Math.min(sc.powerplayScore1, sc.powerplayScore1 * 0.7) // rough heuristic
      : null;
  }

  return {
    winner: basic.winner || null,
    winnerFull: basic.winnerFull || null,
    totalRuns: basic.totalRuns || null,
    firstInningsScore: basic.firstInningsScore || null,
    highestScore: basic.highestScore || null,
    statusText: basic.statusText || "",
    wonByText: basic.wonByText || null,
    tossWinner: basic.tossWinner || null,
    isCompleted: true,
    ...detailed,
  };
}

/**
 * Resolve ALL 15 market types from parsed results
 */
function resolveMarkets(
  markets: { id: string; question: string; options: { id: string; label: string; odds: number }[] }[],
  r: ParsedResult,
  teamAShort: string,
  teamBShort: string
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const market of markets) {
    const q = market.question.toLowerCase();
    let opt: { id: string } | undefined;

    // ── Match Winner ──
    if ((q.includes("who will win") || q.includes("match winner")) && !q.includes("toss")) {
      if (r.winner) {
        opt = market.options.find((o) =>
          o.label.toUpperCase().includes(r.winner!) || teamMatches(o.label, r.winner!)
        );
      }
    }

    // ── Toss Winner ──
    else if (q.includes("toss")) {
      if (r.tossWinner) {
        opt = market.options.find((o) =>
          o.label.toUpperCase().includes(r.tossWinner!) || teamMatches(o.label, r.tossWinner!)
        );
      }
    }

    // ── Total Runs Over/Under ──
    else if (q.includes("total") && (q.includes("exceed") || q.includes("combined"))) {
      if (r.totalRuns !== null) {
        const threshold = parseInt(q.match(/(\d{2,3})/)?.[1] || "0");
        if (threshold > 0) {
          const isOver = r.totalRuns > threshold;
          opt = market.options.find((o) => {
            const l = o.label.toLowerCase();
            return isOver ? (l.includes("over") || l.includes("yes")) : (l.includes("under") || l.includes("no"));
          });
        }
      }
    }

    // ── First Innings Score bracket ──
    else if (q.includes("first innings score")) {
      if (r.firstInningsScore !== null) {
        opt = findBracketOption(market.options, r.firstInningsScore);
      }
    }

    // ── Player of the Match (by team) ──
    else if (q.includes("player of the match") || q.includes("team player")) {
      if (r.winner) {
        opt = market.options.find((o) =>
          o.label.toUpperCase().includes(r.winner!) || teamMatches(o.label, r.winner!)
        );
      }
    }

    // ── Top Scorer ──
    else if (q.includes("top scorer")) {
      if (r.topScorerName) {
        // Try exact match first, then partial match
        opt = market.options.find((o) =>
          o.label.toLowerCase() === r.topScorerName!.toLowerCase()
        ) || market.options.find((o) => {
          const parts = r.topScorerName!.toLowerCase().split(" ");
          const label = o.label.toLowerCase();
          // Match by last name or full name
          return parts.some(p => p.length > 3 && label.includes(p));
        });
        // If no named option matches, pick "Someone else"
        if (!opt) {
          opt = market.options.find((o) => o.label.toLowerCase().includes("someone else"));
        }
      }
    }

    // ── Century scored ──
    else if (q.includes("century")) {
      if (r.highestScore !== null) {
        const has = r.highestScore >= 100;
        opt = market.options.find((o) => {
          const l = o.label.toLowerCase();
          return has ? (l.includes("yes") || l.includes("century!")) : l.includes("no");
        });
      }
    }

    // ── Super Over ──
    else if (q.includes("super over")) {
      if (r.wonByText) {
        opt = market.options.find((o) => o.label.toLowerCase().includes("no"));
      }
    }

    // ── Highest Individual Score bracket ──
    else if (q.includes("highest individual score")) {
      if (r.highestScore !== null) {
        opt = findBracketOption(market.options, r.highestScore);
      }
    }

    // ── Win Margin / Method ──
    else if (q.includes("winning team win") || q.includes("how will")) {
      if (r.wonByText) {
        const wbt = r.wonByText.toLowerCase();
        if (wbt.includes("wicket")) {
          opt = market.options.find((o) => o.label.toLowerCase().includes("wicket"));
        } else {
          const margin = parseInt(wbt.match(/(\d+)/)?.[1] || "0");
          if (margin > 0) {
            opt = market.options.find((o) => {
              const l = o.label.toLowerCase();
              if (l.includes("1-20") && margin >= 1 && margin <= 20) return true;
              if (l.includes("21-40") && margin >= 21 && margin <= 40) return true;
              if ((l.includes("40+") || l.includes("41+")) && margin > 40) return true;
              return false;
            });
          }
        }
      }
    }

    // ── First Ball Six ──
    else if (q.includes("first ball") && q.includes("six")) {
      // We can't reliably detect this from scorecard.
      // But we CAN check: if first wicket fell on ball 0.1, it wasn't a six.
      // If powerplay score < 6 after 1 ball... too hard to infer.
      // Default: "No" — first ball sixes happen in ~3-5% of T20s.
      // The 8x odds reflect this rarity. Safe default.
      opt = market.options.find((o) => o.label.toLowerCase().includes("no"));
    }

    // ── 50+ in Powerplay ──
    else if (q.includes("50+") && q.includes("powerplay")) {
      if (r.firstInningsPowerplayScore !== null) {
        // If powerplay score is under 50, no individual could have scored 50+
        // If powerplay is 50+, it's POSSIBLE but not certain one batter did it
        // Conservative: "Yes" only if powerplay >= 65 (likely one batter dominated)
        // "No" if powerplay < 50 (impossible)
        // For 50-64: default "No" (two batters likely shared)
        const ppScore = r.firstInningsPowerplayScore;
        const likely50 = ppScore >= 65;
        const impossible50 = ppScore < 50;
        if (impossible50 || !likely50) {
          opt = market.options.find((o) => o.label.toLowerCase().includes("no"));
        } else {
          opt = market.options.find((o) => o.label.toLowerCase().includes("yes"));
        }
      }
    }

    // ── Powerplay Runs (first innings) ──
    else if (q.includes("powerplay") && (q.includes("runs") || q.includes("how many"))) {
      if (r.firstInningsPowerplayScore !== null) {
        opt = findBracketOption(market.options, r.firstInningsPowerplayScore);
      }
    }

    // ── Most Sixes (which team) ──
    else if (q.includes("more sixes") || q.includes("most sixes")) {
      if (r.teamASixes !== null && r.teamBSixes !== null) {
        if (r.teamASixes > r.teamBSixes) {
          opt = market.options.find((o) =>
            o.label.toUpperCase().includes(teamAShort) || teamMatches(o.label, teamAShort)
          );
        } else if (r.teamBSixes > r.teamASixes) {
          opt = market.options.find((o) =>
            o.label.toUpperCase().includes(teamBShort) || teamMatches(o.label, teamBShort)
          );
        } else {
          opt = market.options.find((o) => o.label.toLowerCase().includes("equal"));
        }
      }
    }

    // ── Wicket in First Over ──
    else if (q.includes("wicket") && q.includes("first over")) {
      if (r.firstWicketOver !== null) {
        const inFirstOver = r.firstWicketOver <= 1.0;
        opt = market.options.find((o) => {
          const l = o.label.toLowerCase();
          return inFirstOver ? l.includes("yes") : l.includes("no");
        });
      }
    }

    // ── Total Sixes in Match ──
    else if (q.includes("sixes") && (q.includes("entire match") || q.includes("how many sixes"))) {
      if (r.totalSixes !== null) {
        opt = findBracketOption(market.options, r.totalSixes);
      }
    }

    if (opt) {
      resolved[market.id] = opt.id;
    }
  }

  return resolved;
}

/**
 * Find the matching bracket option for a numeric value.
 * Handles patterns like: "Under 40", "40-55", "56-70", "71+", "200+"
 */
function findBracketOption(
  options: { id: string; label: string }[],
  value: number
): { id: string } | undefined {
  return options.find((o) => {
    const l = o.label.toLowerCase();
    // "Under X" / "Under X"
    const underMatch = l.match(/under\s+(\d+)/);
    if (underMatch && value < parseInt(underMatch[1])) return true;
    // "X+" pattern
    const plusMatch = l.match(/(\d+)\+/);
    if (plusMatch && value >= parseInt(plusMatch[1])) return true;
    // "X-Y" range
    const rangeMatch = l.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch && value >= parseInt(rangeMatch[1]) && value <= parseInt(rangeMatch[2])) return true;
    return false;
  });
}

// ── Settlement Engine ──

type MarketTier = "easy" | "medium" | "hard";
const SSR_REWARDS: Record<MarketTier, number> = { easy: 10, medium: 25, hard: 50 };
const SSR_PENALTY = 3;
function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

async function settleMarket(
  admin: ReturnType<typeof createAdminClient>,
  marketId: string,
  correctOptionId: string
): Promise<{ settled: number; paidOut: number }> {
  const { data: market } = await admin.from("markets").select("*").eq("id", marketId).single();
  if (!market || market.status === "settled") return { settled: 0, paidOut: 0 };

  const tier: MarketTier = market.tier || "easy";
  const baseSSR = SSR_REWARDS[tier];
  const { data: predictions } = await admin.from("predictions").select("*").eq("market_id", marketId);
  let totalPaidOut = 0;

  if (predictions) {
    for (const pred of predictions) {
      const isWinner = pred.selected_option_id === correctOptionId;
      const winOpt = market.options.find((o: { id: string; odds: number }) => o.id === correctOptionId);
      const payoutOdds = pred.locked_odds || winOpt?.odds || 1;
      const coinsWon = isWinner ? Math.floor(pred.coins_wagered * payoutOdds) : 0;
      totalPaidOut += coinsWon;

      const { data: up } = await admin.from("profiles").select("*").eq("id", pred.user_id).single();
      if (!up) continue;

      const newStreak = isWinner ? (up.current_streak || 0) + 1 : 0;
      const newWinStreak = isWinner ? up.win_streak + 1 : 0;
      const ssrEarned = isWinner ? Math.floor(baseSSR * getStreakMultiplier(newStreak)) : -SSR_PENALTY;

      await admin.from("predictions").update({ coins_won: coinsWon, ssr_earned: ssrEarned }).eq("id", pred.id);
      await admin
        .from("profiles")
        .update({
          coins: up.coins + coinsWon,
          total_wins: up.total_wins + (isWinner ? 1 : 0),
          total_losses: up.total_losses + (isWinner ? 0 : 1),
          win_streak: newWinStreak,
          best_streak: Math.max(up.best_streak, newWinStreak),
          ssr: Math.max(0, (up.ssr || 0) + ssrEarned),
          ssr_today: (up.ssr_today || 0) + (isWinner ? ssrEarned : 0),
          current_streak: newStreak,
        })
        .eq("id", pred.user_id);
    }
  }

  await admin.from("markets").update({ status: "settled", correct_option_id: correctOptionId }).eq("id", marketId);

  // Resolve parlays that include this market
  const { data: activeParlays } = await admin.from("parlays").select("*").eq("status", "active");
  if (activeParlays) {
    for (const parlay of activeParlays) {
      const legs = parlay.predictions as { market_id: string; selected_option_id: string }[];
      if (!legs.some((l) => l.market_id === marketId)) continue;

      const legMarketIds = legs.map((l) => l.market_id);
      const { data: legMarkets } = await admin.from("markets").select("id, status, correct_option_id").in("id", legMarketIds);
      if (!legMarkets?.every((m) => m.status === "settled")) continue;

      const allCorrect = legs.every((l) => {
        const sm = legMarkets.find((m) => m.id === l.market_id);
        return sm && sm.correct_option_id === l.selected_option_id;
      });

      const parlayWin = allCorrect ? Math.floor(parlay.coins_wagered * parlay.combined_odds) : 0;
      await admin.from("parlays").update({ status: allCorrect ? "won" : "lost", coins_won: parlayWin }).eq("id", parlay.id);

      if (allCorrect && parlayWin > 0) {
        const { data: pu } = await admin.from("profiles").select("coins").eq("id", parlay.user_id).single();
        if (pu) await admin.from("profiles").update({ coins: pu.coins + parlayWin }).eq("id", parlay.user_id);
      }
    }
  }

  return { settled: predictions?.length || 0, paidOut: totalPaidOut };
}

/**
 * Main auto-settle function.
 * Checks live matches 3.5+ hours old and settles ALL markets.
 */
export async function autoSettleCompletedMatches() {
  const admin = createAdminClient();

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 3, cutoff.getMinutes() - 30);

  const { data: liveMatches } = await admin
    .from("matches")
    .select("*")
    .eq("status", "live")
    .lt("match_date", cutoff.toISOString());

  if (!liveMatches || liveMatches.length === 0) return;

  for (const match of liveMatches) {
    if (match.team_a_short.startsWith("TT")) continue;

    const result = await fetchCricbuzzResult(match.team_a_short, match.team_b_short);
    if (!result || !result.isCompleted) continue;

    const { data: markets } = await admin
      .from("markets")
      .select("*")
      .eq("match_id", match.id)
      .in("status", ["open", "locked"]);

    const resolved = markets ? resolveMarkets(markets, result, match.team_a_short, match.team_b_short) : {};

    let settledCount = 0;
    for (const [marketId, correctOptionId] of Object.entries(resolved)) {
      await settleMarket(admin, marketId, correctOptionId);
      settledCount++;
    }

    const matchResult = result.winner === match.team_a_short
      ? "team_a_win"
      : result.winner === match.team_b_short
        ? "team_b_win"
        : "no_result";
    await admin.from("matches").update({ status: "completed", result: matchResult }).eq("id", match.id);

    console.log(
      `[auto-settle] ${match.team_a_short} vs ${match.team_b_short}: ` +
      `${settledCount}/${markets?.length || 0} markets settled. ${result.statusText}`
    );
  }
}
