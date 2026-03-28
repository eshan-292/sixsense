import { NextRequest } from "next/server";

/**
 * Live Score API — FREE, no API key needed
 * Scrapes Cricbuzz public pages and their internal JSON API
 * Caches results for 30 seconds to be respectful
 */

interface CachedResult {
  data: LiveScoreData;
  timestamp: number;
}

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
}

const cache = new Map<string, CachedResult>();
const CACHE_TTL_MS = 30_000;

// Cache for Cricbuzz match IDs (lasts 10 minutes)
const matchIdCache = new Map<string, { id: string; timestamp: number }>();
const MATCH_ID_CACHE_TTL = 600_000;

const TEAM_ALIASES: Record<string, string[]> = {
  csk: ["chennai super kings", "chennai", "csk"],
  mi: ["mumbai indians", "mumbai", "mi"],
  rcb: ["royal challengers bengaluru", "royal challengers bangalore", "rcb"],
  kkr: ["kolkata knight riders", "kolkata", "kkr"],
  dc: ["delhi capitals", "delhi", "dc"],
  srh: ["sunrisers hyderabad", "hyderabad", "srh"],
  rr: ["rajasthan royals", "rajasthan", "rr"],
  pbks: ["punjab kings", "punjab", "pbks"],
  gt: ["gujarat titans", "gujarat", "gt"],
  lsg: ["lucknow super giants", "lucknow", "lsg"],
};

function teamMatches(text: string, teamShort: string): boolean {
  const lower = text.toLowerCase();
  const aliases = TEAM_ALIASES[teamShort.toLowerCase()] || [teamShort.toLowerCase()];
  return aliases.some((alias) => lower.includes(alias));
}

function getCacheKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join("-").toLowerCase();
}

function extractShortName(teamName: string): string {
  const lower = teamName.toLowerCase();
  for (const [short, aliases] of Object.entries(TEAM_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) return short.toUpperCase();
  }
  const parts = teamName.split(" ");
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  return parts.map((p) => p[0]).join("").toUpperCase().substring(0, 3);
}

/**
 * Step 1: Find the Cricbuzz match ID by scraping the live scores page
 */
async function findCricbuzzMatchId(teamA: string, teamB: string): Promise<string | null> {
  const cacheKey = getCacheKey(teamA, teamB);
  const cached = matchIdCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MATCH_ID_CACHE_TTL) {
    return cached.id;
  }

  try {
    const res = await fetch("https://www.cricbuzz.com/cricket-match/live-scores", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract match URLs: /live-cricket-scores/149618/rcb-vs-srh-...
    const matchPattern = /\/live-cricket-scores\/(\d+)\/([^"]+)/g;
    let match;
    while ((match = matchPattern.exec(html)) !== null) {
      const slug = match[2].toLowerCase().replace(/-/g, " ");
      if (teamMatches(slug, teamA) && teamMatches(slug, teamB)) {
        const id = match[1];
        matchIdCache.set(cacheKey, { id, timestamp: Date.now() });
        return id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Step 2: Fetch score from Cricbuzz's internal mini-scorecard API
 */
async function fetchCricbuzzScore(matchId: string): Promise<LiveScoreData | null> {
  try {
    // Try the mini-scorecard API endpoint
    const res = await fetch(
      `https://www.cricbuzz.com/api/cricket-match/${matchId}/full-commentary/1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      // Try alternative endpoint
      return await fetchCricbuzzScoreAlt(matchId);
    }

    const data = await res.json();
    return parseCommentaryData(data);
  } catch {
    return await fetchCricbuzzScoreAlt(matchId);
  }
}

/**
 * Alternative: use the match score API
 */
async function fetchCricbuzzScoreAlt(matchId: string): Promise<LiveScoreData | null> {
  try {
    const res = await fetch(
      `https://www.cricbuzz.com/api/html/cricket-scorecard/${matchId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;
    const html = await res.text();
    return parseScoreHtml(html, matchId);
  } catch {
    return null;
  }
}

function parseCommentaryData(data: Record<string, unknown>): LiveScoreData | null {
  try {
    const miniscore = data.miniscore as Record<string, unknown> | undefined;
    const matchHeader = data.matchHeader as Record<string, unknown> | undefined;

    if (!miniscore) {
      // Fallback: just show status
      const status = (matchHeader?.status as string) || "Match in progress";
      return {
        battingTeam: "Match",
        battingTeamShort: "",
        score: "—",
        overs: "",
        runRate: "0.00",
        requiredRunRate: null,
        target: null,
        batsmen: [],
        bowler: null,
        lastSixBalls: [],
        matchStatus: status,
        isSecondInnings: false,
      };
    }

    // Batting team
    const batTeam = miniscore.batTeam as Record<string, unknown> | undefined;
    const battingTeamName = (batTeam?.teamName as string) || "Unknown";
    const battingTeamShort = extractShortName(battingTeamName);

    const inningsId = (miniscore.currentInningsId as number) || 1;
    const isSecondInnings = inningsId >= 2;

    // Score from matchScoreDetails
    const matchScore = miniscore.matchScoreDetails as Record<string, unknown> | undefined;
    const inningsScores = matchScore?.inningsScoreList as Array<Record<string, unknown>> | undefined;

    let score = "0/0";
    let overs = "0";

    if (inningsScores && inningsScores.length > 0) {
      // Get the current (last) innings
      const current = inningsScores[inningsScores.length - 1];
      score = `${current.score || 0}/${current.wickets || 0}`;
      overs = String(current.overs || "0");
    }

    // Run rates
    const crr = String(miniscore.currentRunRate || "0.00");
    const rrr = miniscore.requiredRunRate ? String(miniscore.requiredRunRate) : null;
    const target = miniscore.remRunsToWin
      ? Number(miniscore.remRunsToWin) + (inningsScores && inningsScores.length > 1 ? Number(inningsScores[inningsScores.length - 1]?.score || 0) : 0)
      : null;

    // Batsmen
    const batsmen: { name: string; runs: string }[] = [];
    const batsmanStriker = miniscore.batsmanStriker as Record<string, unknown> | undefined;
    const batsmanNonStriker = miniscore.batsmanNonStriker as Record<string, unknown> | undefined;
    if (batsmanStriker) {
      batsmen.push({
        name: (batsmanStriker.batName as string) || "Unknown",
        runs: `${batsmanStriker.batRuns || 0}(${batsmanStriker.batBalls || 0})`,
      });
    }
    if (batsmanNonStriker) {
      batsmen.push({
        name: (batsmanNonStriker.batName as string) || "Unknown",
        runs: `${batsmanNonStriker.batRuns || 0}(${batsmanNonStriker.batBalls || 0})`,
      });
    }

    // Bowler
    let bowler: { name: string; figures: string } | null = null;
    const bowlerStriker = miniscore.bowlerStriker as Record<string, unknown> | undefined;
    if (bowlerStriker) {
      bowler = {
        name: (bowlerStriker.bowlName as string) || "Unknown",
        figures: `${bowlerStriker.bowlWkts || 0}/${bowlerStriker.bowlRuns || 0} (${bowlerStriker.bowlOvs || 0})`,
      };
    }

    // Last 6 balls from recent overs stats
    const lastSixBalls: string[] = [];
    const recentOvs = miniscore.recentOvsStats as string | undefined;
    if (recentOvs) {
      const balls = recentOvs.replace(/\|/g, "").trim().split(/\s+/);
      lastSixBalls.push(...balls.slice(-6));
    }

    // Match status
    const matchStatus = (miniscore.status as string) ||
      (matchHeader?.status as string) ||
      "In Progress";

    return {
      battingTeam: battingTeamName,
      battingTeamShort,
      score,
      overs,
      runRate: crr,
      requiredRunRate: rrr,
      target,
      batsmen,
      bowler,
      lastSixBalls,
      matchStatus,
      isSecondInnings,
    };
  } catch {
    return null;
  }
}

function parseScoreHtml(html: string, _matchId: string): LiveScoreData | null {
  try {
    // Basic HTML parsing for score — fallback only
    // Look for score patterns like "185/4 (18.2)"
    const scoreMatch = html.match(/(\d+)\/(\d+)\s*\((\d+\.?\d*)\s*ov/i);
    if (!scoreMatch) return null;

    return {
      battingTeam: "Current Innings",
      battingTeamShort: "",
      score: `${scoreMatch[1]}/${scoreMatch[2]}`,
      overs: scoreMatch[3],
      runRate: "0.00",
      requiredRunRate: null,
      target: null,
      batsmen: [],
      bowler: null,
      lastSixBalls: [],
      matchStatus: "In Progress",
      isSecondInnings: false,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const teamA = request.nextUrl.searchParams.get("teamA");
  const teamB = request.nextUrl.searchParams.get("teamB");

  if (!teamA || !teamB) {
    return Response.json(
      { error: "teamA and teamB query params required" },
      { status: 400 }
    );
  }

  // Check cache
  const cacheKey = getCacheKey(teamA, teamB);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Response.json({ ...cached.data, cached: true });
  }

  // Step 1: Find the match on Cricbuzz
  const matchId = await findCricbuzzMatchId(teamA, teamB);

  if (!matchId) {
    // Return stale cache if available
    if (cached) {
      return Response.json({ ...cached.data, cached: true, stale: true });
    }
    return Response.json(
      { error: "No matching live match found", code: "NO_MATCH" },
      { status: 404 }
    );
  }

  // Step 2: Fetch live score
  const data = await fetchCricbuzzScore(matchId);

  if (data) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return Response.json(data);
  }

  // Return stale cache if fetch failed
  if (cached) {
    return Response.json({ ...cached.data, cached: true, stale: true });
  }

  return Response.json(
    { error: "Failed to fetch score", code: "FETCH_ERROR" },
    { status: 500 }
  );
}
