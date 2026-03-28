/**
 * Cricket API integration using CricketData.org (api.cricapi.com)
 * Free tier: 100 requests/day
 * Used for auto-fetching match results to settle markets
 */

const API_BASE = "https://api.cricapi.com/v1";

function getApiKey(): string {
  const key = process.env.CRICKET_API_KEY;
  if (!key) throw new Error("CRICKET_API_KEY not set in environment");
  return key;
}

export interface CricMatchInfo {
  id: string;
  name: string;          // e.g. "Chennai Super Kings vs Mumbai Indians, 12th Match"
  matchType: string;     // "t20"
  status: string;        // e.g. "Chennai Super Kings won by 7 wickets"
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];       // ["Chennai Super Kings", "Mumbai Indians"]
  teamInfo: { name: string; shortname: string; img: string }[];
  score: { r: number; w: number; o: number; inning: string }[];  // runs, wickets, overs
  tpiWinner: string;     // winning team full name
  matchWinner: string;   // winning team full name
  matchStarted: boolean;
  matchEnded: boolean;
}

export interface CricScorecard {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  teams: string[];
  score: { r: number; w: number; o: number; inning: string }[];
  scorecard: {
    batting: {
      batsman: { name: string; "runs-scored": number; balls: number; fours: number; sixes: number; "strike-rate": string }[];
      extras: { r: number; b: number };
      totals: { R: number; W: number; O: number };
    };
    bowling: {
      bowler: { name: string; overs: string; maidens: number; "runs-conceded": number; wickets: number; economy: string }[];
    };
    inning: string;
  }[];
  matchWinner: string;
  manOfTheMatch?: string;
}

// Searches for current IPL matches
export async function fetchCurrentMatches(): Promise<CricMatchInfo[]> {
  const res = await fetch(`${API_BASE}/currentMatches?apikey=${getApiKey()}&offset=0`);
  if (!res.ok) throw new Error(`Cricket API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.reason || "API call failed");

  // Filter for IPL T20 matches only
  return (data.data || []).filter((m: any) =>
    m.matchType === "t20" &&
    (m.name?.includes("Indian Premier League") || m.series_id?.includes("ipl"))
  );
}

// Fetches detailed match info including winner
export async function fetchMatchInfo(cricMatchId: string): Promise<CricMatchInfo> {
  const res = await fetch(`${API_BASE}/match_info?apikey=${getApiKey()}&id=${cricMatchId}`);
  if (!res.ok) throw new Error(`Cricket API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.reason || "API call failed");
  return data.data;
}

// Fetches full scorecard (batting, bowling, innings scores)
export async function fetchScorecard(cricMatchId: string): Promise<CricScorecard> {
  const res = await fetch(`${API_BASE}/match_scorecard?apikey=${getApiKey()}&id=${cricMatchId}`);
  if (!res.ok) throw new Error(`Cricket API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.reason || "API call failed");
  return data.data;
}

// Searches for IPL matches to link with our database matches
export async function searchMatches(query: string): Promise<CricMatchInfo[]> {
  const res = await fetch(`${API_BASE}/matches?apikey=${getApiKey()}&offset=0`);
  if (!res.ok) throw new Error(`Cricket API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "success") throw new Error(data.reason || "API call failed");

  const lowerQ = query.toLowerCase();
  return (data.data || []).filter((m: any) =>
    m.name?.toLowerCase().includes(lowerQ) ||
    m.teams?.some((t: string) => t.toLowerCase().includes(lowerQ))
  );
}

/**
 * Resolves match results from scorecard data.
 * Returns structured answers for each market template type.
 */
export interface MatchResults {
  matchWinner: string | null;           // Winning team short name
  matchWinnerFull: string | null;       // Full team name
  totalRuns: number | null;             // Combined total of both innings
  firstInningsScore: number | null;     // First innings total
  manOfTheMatch: string | null;         // MOTM player name
  status: string;                       // Match status text
  scores: { inning: string; runs: number; wickets: number; overs: number }[];
}

// IPL team name mapping (full name → short)
const TEAM_SHORT_NAMES: Record<string, string> = {
  "chennai super kings": "CSK",
  "mumbai indians": "MI",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "kolkata knight riders": "KKR",
  "delhi capitals": "DC",
  "sunrisers hyderabad": "SRH",
  "rajasthan royals": "RR",
  "punjab kings": "PBKS",
  "gujarat titans": "GT",
  "lucknow super giants": "LSG",
};

export function getShortName(fullName: string): string {
  return TEAM_SHORT_NAMES[fullName.toLowerCase()] || fullName;
}

export function resolveMatchResults(scorecard: CricScorecard): MatchResults {
  const scores = (scorecard.score || []).map(s => ({
    inning: s.inning,
    runs: s.r,
    wickets: s.w,
    overs: s.o,
  }));

  const firstInningsScore = scores.length > 0 ? scores[0].runs : null;
  const totalRuns = scores.reduce((sum, s) => sum + s.runs, 0) || null;

  const matchWinnerFull = scorecard.matchWinner || null;
  const matchWinner = matchWinnerFull ? getShortName(matchWinnerFull) : null;

  return {
    matchWinner,
    matchWinnerFull,
    totalRuns,
    firstInningsScore,
    manOfTheMatch: scorecard.manOfTheMatch || null,
    status: scorecard.status,
    scores,
  };
}

/**
 * Auto-resolves market answers based on match results.
 * Returns a map of market_id → correct_option_id for markets that can be auto-settled.
 */
export function autoResolveMarkets(
  markets: { id: string; question: string; options: { id: string; label: string }[] }[],
  results: MatchResults,
  teamAShort: string,
  teamBShort: string
): Record<string, { optionId: string; optionLabel: string; reason: string }> {
  const resolved: Record<string, { optionId: string; optionLabel: string; reason: string }> = {};

  for (const market of markets) {
    const q = market.question.toLowerCase();

    // Match Winner
    if (q.includes("who will win") || q.includes("match winner")) {
      if (results.matchWinner) {
        const winOpt = market.options.find(o =>
          o.label.toUpperCase() === results.matchWinner?.toUpperCase() ||
          o.label.toLowerCase().includes(results.matchWinner?.toLowerCase() || "")
        );
        if (winOpt) {
          resolved[market.id] = {
            optionId: winOpt.id,
            optionLabel: winOpt.label,
            reason: `${results.matchWinnerFull} won — ${results.status}`,
          };
        }
      }
    }

    // Total Runs Over/Under
    else if (q.includes("total") && (q.includes("exceed") || q.includes("over") || q.includes("under"))) {
      if (results.totalRuns !== null) {
        // Extract the threshold number from the question
        const numMatch = q.match(/(\d{2,3})/);
        if (numMatch) {
          const threshold = parseInt(numMatch[1]);
          const isOver = results.totalRuns > threshold;
          const correctOpt = market.options.find(o => {
            const label = o.label.toLowerCase();
            return isOver ? label.includes("over") : label.includes("under");
          });
          if (correctOpt) {
            resolved[market.id] = {
              optionId: correctOpt.id,
              optionLabel: correctOpt.label,
              reason: `Total runs: ${results.totalRuns} (threshold: ${threshold})`,
            };
          }
        }
      }
    }

    // First Innings Score brackets
    else if (q.includes("first innings score") || q.includes("first innings")) {
      if (results.firstInningsScore !== null) {
        const score = results.firstInningsScore;
        const correctOpt = market.options.find(o => {
          const label = o.label.toLowerCase();
          if (label.includes("under 150") && score < 150) return true;
          if ((label.includes("150-179") || label.includes("150 - 179")) && score >= 150 && score <= 179) return true;
          if ((label.includes("180-199") || label.includes("180 - 199")) && score >= 180 && score <= 199) return true;
          if (label.includes("200+") && score >= 200) return true;
          if (label.includes("200 +") && score >= 200) return true;
          // Generic range matching: "X-Y" pattern
          const rangeMatch = label.match(/(\d+)\s*[-–]\s*(\d+)/);
          if (rangeMatch) {
            const low = parseInt(rangeMatch[1]);
            const high = parseInt(rangeMatch[2]);
            if (score >= low && score <= high) return true;
          }
          return false;
        });
        if (correctOpt) {
          resolved[market.id] = {
            optionId: correctOpt.id,
            optionLabel: correctOpt.label,
            reason: `First innings score: ${score}`,
          };
        }
      }
    }

    // Player of the Match (by team)
    else if (q.includes("player of the match")) {
      if (results.manOfTheMatch && results.matchWinner) {
        // The market has options like "CSK player" or "MI player"
        // MOTM is typically from the winning team, but not always
        // We match by checking if the option label contains the winner's short name
        const motmOpt = market.options.find(o => {
          const label = o.label.toLowerCase();
          return label.includes(results.matchWinner?.toLowerCase() || "");
        });
        if (motmOpt) {
          resolved[market.id] = {
            optionId: motmOpt.id,
            optionLabel: motmOpt.label,
            reason: `Man of the Match: ${results.manOfTheMatch}`,
          };
        }
      }
    }
  }

  return resolved;
}
