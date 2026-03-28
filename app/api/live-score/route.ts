import { NextRequest } from "next/server";

/**
 * Live Score API — FREE, no API key needed
 * Uses the open-source cricbuzz-live proxy (scrapes Cricbuzz public data)
 * Fallback: direct Cricbuzz public endpoints
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
const CACHE_TTL_MS = 30_000; // 30 seconds

// Cricbuzz match ID cache (team pair → cricbuzz match ID)
const matchIdCache = new Map<string, { id: string; timestamp: number }>();
const MATCH_ID_CACHE_TTL = 300_000; // 5 minutes

const TEAM_ALIASES: Record<string, string[]> = {
  csk: ["chennai super kings", "chennai", "csk"],
  mi: ["mumbai indians", "mumbai", "mi"],
  rcb: ["royal challengers bengaluru", "royal challengers bangalore", "rcb", "bengaluru", "bangalore"],
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
 * Strategy 1: Use cricbuzz-live open-source API (Vercel-hosted, scrapes Cricbuzz)
 * No API key, no limits, free forever
 */
async function fetchFromCricbuzzLive(teamA: string, teamB: string): Promise<LiveScoreData | null> {
  try {
    // Step 1: Get live matches list
    const cacheKey = getCacheKey(teamA, teamB);
    let cricMatchId = matchIdCache.get(cacheKey);

    if (!cricMatchId || Date.now() - cricMatchId.timestamp > MATCH_ID_CACHE_TTL) {
      const listRes = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (!listRes.ok) return null;
      const listData = await listRes.json();

      // Find the matching IPL match
      const matchTypes = listData?.typeMatches || [];
      for (const type of matchTypes) {
        const series = type?.seriesMatches || [];
        for (const s of series) {
          const matches = s?.seriesAdWrapper?.matches || [];
          for (const m of matches) {
            const info = m?.matchInfo;
            if (!info) continue;
            const t1 = info?.team1?.teamSName || info?.team1?.teamName || "";
            const t2 = info?.team2?.teamSName || info?.team2?.teamName || "";
            const matchDesc = `${t1} ${t2} ${info?.team1?.teamName || ""} ${info?.team2?.teamName || ""}`;

            if (teamMatches(matchDesc, teamA) && teamMatches(matchDesc, teamB)) {
              cricMatchId = { id: String(info.matchId), timestamp: Date.now() };
              matchIdCache.set(cacheKey, cricMatchId);
              break;
            }
          }
          if (cricMatchId && Date.now() - cricMatchId.timestamp < 1000) break;
        }
        if (cricMatchId && Date.now() - cricMatchId.timestamp < 1000) break;
      }
    }

    if (!cricMatchId) return null;

    // Step 2: Get score for this match
    const scoreRes = await fetch(`https://cricbuzz-live.vercel.app/v1/score/${cricMatchId.id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!scoreRes.ok) return null;
    const scoreData = await scoreRes.json();

    return parseCricbuzzLiveScore(scoreData);
  } catch {
    return null;
  }
}

function parseCricbuzzLiveScore(data: Record<string, unknown>): LiveScoreData | null {
  try {
    const miniscore = data.miniscore as Record<string, unknown> | undefined;
    if (!miniscore) {
      // Try direct format
      const status = (data.status as string) || (data.matchHeader as Record<string, unknown>)?.status as string || "";
      return {
        battingTeam: "Match",
        battingTeamShort: "",
        score: status || "In Progress",
        overs: "",
        runRate: "0.00",
        requiredRunRate: null,
        target: null,
        batsmen: [],
        bowler: null,
        lastSixBalls: [],
        matchStatus: status || "Loading...",
        isSecondInnings: false,
      };
    }

    const batTeam = miniscore.batTeam as Record<string, unknown> | undefined;
    const battingTeamName = (batTeam?.teamName as string) || "Unknown";
    const battingTeamShort = extractShortName(battingTeamName);

    const inningsId = (miniscore.currentInningsId as number) || 1;
    const isSecondInnings = inningsId >= 2;

    // Score
    const runs = (miniscore.batTeamScore as Record<string, unknown>)?.inngs1 as Record<string, unknown> | undefined;
    const score = runs
      ? `${runs.runs || 0}/${runs.wickets || 0}`
      : `${(miniscore as Record<string, unknown>).runs || 0}/${(miniscore as Record<string, unknown>).wickets || 0}`;
    const overs = String(runs?.overs || (miniscore as Record<string, unknown>).overs || "0");

    // Run rates
    const crr = String(miniscore.currentRunRate || "0.00");
    const rrr = miniscore.requiredRunRate ? String(miniscore.requiredRunRate) : null;
    const target = miniscore.target ? Number(miniscore.target) : null;

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

    // Last 6 balls
    const lastSixBalls: string[] = [];
    const recentOvs = miniscore.recentOvsStats as string | undefined;
    if (recentOvs) {
      // Format: "1 0 4 W 2 6 | 0 1 ..."
      const balls = recentOvs.replace(/\|/g, "").trim().split(/\s+/);
      lastSixBalls.push(...balls.slice(-6));
    }

    // Match status
    const matchStatus = (miniscore.status as string) ||
      (data.matchHeader as Record<string, unknown>)?.status as string ||
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

/**
 * Strategy 2: Direct Cricbuzz HTML scraping as fallback
 */
async function fetchFromCricbuzzDirect(teamA: string, teamB: string): Promise<LiveScoreData | null> {
  try {
    // Fetch Cricbuzz live scores page
    const res = await fetch("https://www.cricbuzz.com/cricket-match/live-scores", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SixSense/1.0)",
        Accept: "text/html",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Extract match links to find the right match ID
    // Pattern: /live-cricket-scores/12345/team-a-vs-team-b
    const matchPattern = /\/live-cricket-scores\/(\d+)\/([^"]+)/g;
    let match;
    let cricMatchId: string | null = null;

    while ((match = matchPattern.exec(html)) !== null) {
      const slug = match[2].toLowerCase();
      if (teamMatches(slug.replace(/-/g, " "), teamA) && teamMatches(slug.replace(/-/g, " "), teamB)) {
        cricMatchId = match[1];
        break;
      }
    }

    if (!cricMatchId) return null;

    // Fetch match commentary API (JSON)
    const commentaryRes = await fetch(
      `https://www.cricbuzz.com/api/cricket-match/${cricMatchId}/full-commentary/1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SixSense/1.0)",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!commentaryRes.ok) return null;
    const commentaryData = await commentaryRes.json();
    return parseCricbuzzLiveScore(commentaryData);
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

  // Strategy 1: cricbuzz-live open-source API (free, no key)
  let data = await fetchFromCricbuzzLive(teamA, teamB);

  // Strategy 2: Direct Cricbuzz scraping fallback
  if (!data) {
    data = await fetchFromCricbuzzDirect(teamA, teamB);
  }

  if (data) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return Response.json(data);
  }

  // Return stale cache if all strategies fail
  if (cached) {
    return Response.json({ ...cached.data, cached: true, stale: true });
  }

  return Response.json(
    { error: "No matching live match found", code: "NO_MATCH" },
    { status: 404 }
  );
}
