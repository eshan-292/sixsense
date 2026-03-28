import { NextRequest } from "next/server";

/**
 * Live Score API — FREE, no API key needed
 * Scrapes Cricbuzz match pages and extracts score from HTML meta tags
 * Caches results for 30 seconds to be respectful
 */

interface CachedResult {
  data: LiveScoreData;
  timestamp: number;
}

interface LiveScoreData {
  teamA: string;
  teamAShort: string;
  teamAScore: string | null;
  teamB: string;
  teamBShort: string;
  teamBScore: string | null;
  matchStatus: string;
  statusText: string;
  matchUrl: string;
}

const cache = new Map<string, CachedResult>();
const CACHE_TTL_MS = 30_000;

// Cache for Cricbuzz match IDs (lasts 10 minutes)
const matchIdCache = new Map<
  string,
  { id: string; slug: string; timestamp: number }
>();
const MATCH_ID_CACHE_TTL = 600_000;

const TEAM_ALIASES: Record<string, string[]> = {
  csk: ["chennai super kings", "chennai", "csk"],
  mi: ["mumbai indians", "mumbai", "mi"],
  rcb: [
    "royal challengers bengaluru",
    "royal challengers bangalore",
    "rcb",
    "bengaluru",
    "bangalore",
  ],
  kkr: ["kolkata knight riders", "kolkata", "kkr"],
  dc: ["delhi capitals", "delhi", "dc"],
  srh: ["sunrisers hyderabad", "hyderabad", "srh"],
  rr: ["rajasthan royals", "rajasthan", "rr"],
  pbks: ["punjab kings", "punjab", "pbks"],
  gt: ["gujarat titans", "gujarat", "gt"],
  lsg: ["lucknow super giants", "lucknow", "lsg"],
  // PSL teams
  qtg: ["quetta gladiators", "quetta", "qtg"],
  krk: ["karachi kings", "karachi", "krk"],
  rwp: ["rawalpindi pindiz", "rawalpindi", "rwp"],
  psz: ["peshawar zalmi", "peshawar", "psz"],
  ms: ["multan sultans", "multan", "ms"],
  isu: ["islamabad united", "islamabad", "isu"],
  lhr: ["lahore qalandars", "lahore", "lhr"],
  // International teams
  ind: ["india", "ind"],
  aus: ["australia", "aus"],
  eng: ["england", "eng"],
  sa: ["south africa", "sa", "rsa"],
  nz: ["new zealand", "nz"],
  pak: ["pakistan", "pak"],
  sl: ["sri lanka", "sl"],
  ban: ["bangladesh", "ban"],
  wi: ["west indies", "wi"],
  afg: ["afghanistan", "afg"],
  zim: ["zimbabwe", "zim"],
  ire: ["ireland", "ire"],
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

function teamMatches(text: string, teamShort: string): boolean {
  const lower = text.toLowerCase();
  const aliases =
    TEAM_ALIASES[teamShort.toLowerCase()] || [teamShort.toLowerCase()];
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
  return parts
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .substring(0, 3);
}

/**
 * Step 1: Find the Cricbuzz match ID by scraping the live scores page
 */
async function findCricbuzzMatchId(
  teamA: string,
  teamB: string
): Promise<{ id: string; slug: string } | null> {
  const cacheKey = getCacheKey(teamA, teamB);
  const cached = matchIdCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MATCH_ID_CACHE_TTL) {
    return { id: cached.id, slug: cached.slug };
  }

  try {
    const res = await fetch(
      "https://www.cricbuzz.com/cricket-match/live-scores",
      {
        headers: FETCH_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();

    // Extract match URLs: /live-cricket-scores/149618/rcb-vs-srh-...
    const matchPattern = /\/live-cricket-scores\/(\d+)\/([^"]+)/g;
    let match;
    while ((match = matchPattern.exec(html)) !== null) {
      const slug = match[2].toLowerCase().replace(/-/g, " ");
      if (teamMatches(slug, teamA) && teamMatches(slug, teamB)) {
        const id = match[1];
        const fullSlug = match[2];
        matchIdCache.set(cacheKey, { id, slug: fullSlug, timestamp: Date.now() });
        return { id, slug: fullSlug };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Step 2: Fetch score by scraping the match page HTML
 * Extracts from meta tags (og:description, description) which reliably contain score info
 */
async function fetchScoreFromMatchPage(
  matchId: string,
  slug: string
): Promise<LiveScoreData | null> {
  try {
    const url = `https://www.cricbuzz.com/live-cricket-scores/${matchId}/${slug}`;
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    return parseMatchPageHtml(html, matchId, slug);
  } catch {
    return null;
  }
}

/**
 * Parse score data from Cricbuzz match page HTML
 *
 * Cricbuzz og:title format for matches with scores:
 *   "QTG 167/7 (20) vs KRK 181/7 (Ben McDermott 25(13) ...)"
 *   "TEAM1 SCORE (OVERS) vs TEAM2 SCORE"
 *
 * For matches without scores:
 *   "Cricket commentary | Royal Challengers Bengaluru vs Sunrisers Hyderabad, ..."
 *
 * Status text found via "won by X" patterns in the HTML body
 */
function parseMatchPageHtml(
  html: string,
  matchId: string,
  slug: string
): LiveScoreData | null {
  try {
    // Extract the first 5000 chars — all meta tags are in the <head>
    const head = html.substring(0, 8000);

    // Try to find og:title which has the best score data
    // Format: content="QTG 167/7 (20) vs KRK 181/7 ..."
    const ogTitleMatch = head.match(
      /property="og:title"\s+content="([^"]+)"/
    );
    // Also get description for additional context
    const descMatches = html.match(
      /Follow ([A-Z]{2,5} \d+\/?\d*\s*\(\d+\.?\d*\)[^"]*vs[^"]*)/
    );

    const ogTitle = ogTitleMatch?.[1] || "";
    const descContent = descMatches?.[1] || "";

    // Use whichever has score data
    const scoreSource = ogTitle || descContent;

    // Extract team short names from slug as fallback
    let teamAShort = "";
    let teamBShort = "";
    const slugParts = slug.split("-vs-");
    if (slugParts.length >= 2) {
      teamAShort = slugParts[0].split("-").pop() || slugParts[0];
      teamBShort = slugParts[1].split("-")[0] || "";
    }

    // Parse: "TEAM1 SCORE/WICKETS (OVERS) vs TEAM2 SCORE/WICKETS"
    // Example: "QTG 167/7 (20) vs KRK 181/7"
    const vsPattern =
      /([A-Z]{2,5})\s+(\d+(?:\/\d+)?)\s*\((\d+\.?\d*)\)\s*vs\s*([A-Z]{2,5})\s+(\d+(?:\/\d+)?)/i;
    const vsMatch = scoreSource.match(vsPattern);

    // Also try single-innings pattern: "TEAM SCORE/WICKETS (OVERS)"
    const singlePattern =
      /([A-Z]{2,5})\s+(\d+(?:\/\d+)?)\s*\((\d+\.?\d*)\)/i;
    const singleMatch = scoreSource.match(singlePattern);

    let teamAScore: string | null = null;
    let teamBScore: string | null = null;

    if (vsMatch) {
      // Both innings have scores
      teamAShort = vsMatch[1];
      teamAScore = `${vsMatch[2]} (${vsMatch[3]} ov)`;
      teamBShort = vsMatch[4];
      teamBScore = `${vsMatch[5]} ov` // missing overs for team B, extract separately
      // Try to find team B overs
      const teamBOversPattern = new RegExp(
        `${vsMatch[4]}\\s+${vsMatch[5].replace("/", "\\/")}\\s*\\((\\d+\\.?\\d*)\\)`,
        "i"
      );
      const teamBOvers = scoreSource.match(teamBOversPattern);
      teamBScore = teamBOvers
        ? `${vsMatch[5]} (${teamBOvers[1]} ov)`
        : vsMatch[5]; // Just show score without overs
    } else if (singleMatch) {
      // Only one innings has scores (first innings in progress or second team yet to bat)
      teamAShort = singleMatch[1];
      teamAScore = `${singleMatch[2]} (${singleMatch[3]} ov)`;
    }

    // Normalize short names through alias map
    teamAShort = extractShortName(teamAShort) || teamAShort.toUpperCase();
    teamBShort = extractShortName(teamBShort) || teamBShort.toUpperCase();

    // Extract status text from the match-specific content only
    // Use the og:description / score source + first part of page to avoid picking up other matches
    const statusSource = scoreSource + " " + head;
    let statusText = "";

    // Check for results involving our teams specifically
    const teamAName = getFullTeamName(teamAShort);
    const teamBName = getFullTeamName(teamBShort);
    const teamPattern = `(?:${teamAShort}|${teamBShort}|${teamAName}|${teamBName})`.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    // Try team-specific status patterns first
    const teamWonMatch = statusSource.match(
      new RegExp(`(${teamPattern}[A-Za-z ]* won by \\d+ (?:runs?|wkts?|wickets?))`, "i")
    );
    const teamNeedsMatch = statusSource.match(
      new RegExp(`(${teamPattern}[A-Za-z ]* needs? \\d+ runs?)`, "i")
    );
    const teamOptMatch = statusSource.match(
      new RegExp(`(${teamPattern}[A-Za-z ]* opt(?:ed)? to (?:bat|bowl))`, "i")
    );

    // Fallback: look for status patterns in the og:title area only (first 500 chars)
    const titleArea = head.substring(0, 1500);
    const genericWonMatch = titleArea.match(
      /([A-Za-z ]+won by \d+ (?:runs?|wkts?|wickets?))/i
    );
    const genericOptMatch = titleArea.match(
      /([A-Za-z ]+opt(?:ed)? to (?:bat|bowl))/i
    );

    statusText =
      teamWonMatch?.[1]?.trim() ||
      teamNeedsMatch?.[1]?.trim() ||
      teamOptMatch?.[1]?.trim() ||
      genericWonMatch?.[1]?.trim() ||
      genericOptMatch?.[1]?.trim() ||
      "";

    // Determine match state
    let matchStatus = "live";
    if (statusText.toLowerCase().includes("won by")) {
      matchStatus = "completed";
    } else if (
      statusText.toLowerCase().includes("drawn") ||
      statusText.toLowerCase().includes("no result")
    ) {
      matchStatus = "completed";
    }

    // If no score data found at all, check if match hasn't started
    if (!teamAScore && !teamBScore) {
      const hasPreview =
        html.toLowerCase().includes("preview") &&
        !html.toLowerCase().includes("opt to");
      if (hasPreview) {
        statusText = "Match yet to start";
      } else if (teamOptMatch) {
        statusText = teamOptMatch[1].trim();
        matchStatus = "live";
      } else {
        statusText = "Match starting soon";
      }
    }

    if (!statusText && (teamAScore || teamBScore)) {
      statusText = "Match in progress";
    }

    // Clean up
    statusText = statusText.replace(/&amp;/g, "&").replace(/&#039;/g, "'");

    const matchUrl = `https://www.cricbuzz.com/live-cricket-scores/${matchId}/${slug}`;
    const teamAFull = getFullTeamName(teamAShort);
    const teamBFull = getFullTeamName(teamBShort);

    return {
      teamA: teamAFull,
      teamAShort,
      teamAScore,
      teamB: teamBFull,
      teamBShort,
      teamBScore,
      matchStatus,
      statusText,
      matchUrl,
    };
  } catch {
    return null;
  }
}

function getFullTeamName(shortName: string): string {
  const map: Record<string, string> = {
    CSK: "Chennai Super Kings",
    MI: "Mumbai Indians",
    RCB: "Royal Challengers Bengaluru",
    KKR: "Kolkata Knight Riders",
    DC: "Delhi Capitals",
    SRH: "Sunrisers Hyderabad",
    RR: "Rajasthan Royals",
    PBKS: "Punjab Kings",
    GT: "Gujarat Titans",
    LSG: "Lucknow Super Giants",
    QTG: "Quetta Gladiators",
    KRK: "Karachi Kings",
    RWP: "Rawalpindi Pindiz",
    PSZ: "Peshawar Zalmi",
    MS: "Multan Sultans",
    ISU: "Islamabad United",
    LHR: "Lahore Qalandars",
    IND: "India",
    AUS: "Australia",
    ENG: "England",
    SA: "South Africa",
    NZ: "New Zealand",
    PAK: "Pakistan",
    SL: "Sri Lanka",
    BAN: "Bangladesh",
    WI: "West Indies",
    AFG: "Afghanistan",
    ZIM: "Zimbabwe",
    IRE: "Ireland",
  };
  return map[shortName.toUpperCase()] || shortName;
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
  const matchInfo = await findCricbuzzMatchId(teamA, teamB);

  if (!matchInfo) {
    // Return stale cache if available
    if (cached) {
      return Response.json({ ...cached.data, cached: true, stale: true });
    }
    return Response.json(
      { error: "No matching live match found", code: "NO_MATCH" },
      { status: 404 }
    );
  }

  // Step 2: Fetch live score from match page HTML
  const data = await fetchScoreFromMatchPage(matchInfo.id, matchInfo.slug);

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
