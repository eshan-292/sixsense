"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match, Market, MarketOption, MarketTier } from "@/lib/types";

const SSR_REWARDS: Record<MarketTier, number> = { easy: 10, medium: 25, hard: 50 };
const TIER_LABELS: Record<MarketTier, { name: string; range: string }> = {
  easy: { name: "Safe Pick", range: "Low risk, small reward" },
  medium: { name: "Smart Call", range: "Medium risk, good reward" },
  hard: { name: "Bold Prediction", range: "High risk, huge reward" },
};

const IPL_TEAMS = [
  { name: "Chennai Super Kings", short: "CSK" },
  { name: "Mumbai Indians", short: "MI" },
  { name: "Royal Challengers Bengaluru", short: "RCB" },
  { name: "Kolkata Knight Riders", short: "KKR" },
  { name: "Delhi Capitals", short: "DC" },
  { name: "Sunrisers Hyderabad", short: "SRH" },
  { name: "Rajasthan Royals", short: "RR" },
  { name: "Punjab Kings", short: "PBKS" },
  { name: "Gujarat Titans", short: "GT" },
  { name: "Lucknow Super Giants", short: "LSG" },
];

export default function ManageMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Match form
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("19:30");
  const [venue, setVenue] = useState("");

  // Market form
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [marketQuestion, setMarketQuestion] = useState("");
  const [marketTier, setMarketTier] = useState<MarketTier>("easy");
  const [marketOptions, setMarketOptions] = useState<
    { label: string; odds: number }[]
  >([
    { label: "", odds: 2 },
    { label: "", odds: 2 },
  ]);

  const [creatingTemplates, setCreatingTemplates] = useState(false);
  const [msg, setMsg] = useState("");
  const supabase = createClient();

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    const { data: m } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });
    setMatches(m || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAddMatch = async () => {
    if (!teamA || !teamB || !matchDate) {
      setMsg("Fill in team A, team B, and date");
      return;
    }
    const tA = IPL_TEAMS.find((t) => t.short === teamA);
    const tB = IPL_TEAMS.find((t) => t.short === teamB);
    if (!tA || !tB) { setMsg("Select valid teams"); return; }

    const dateTime = new Date(`${matchDate}T${matchTime}:00+05:30`);

    const { error } = await supabase.from("matches").insert({
      team_a: tA.name,
      team_b: tB.name,
      team_a_short: tA.short,
      team_b_short: tB.short,
      match_date: dateTime.toISOString(),
      venue,
      status: "upcoming",
    });

    if (error) { setMsg(`Error: ${error.message}`); return; }
    setMsg("Match added!");
    setTeamA("");
    setTeamB("");
    setMatchDate("");
    setVenue("");
    loadData();
  };

  const handleAddMarket = async () => {
    if (!selectedMatchId || !marketQuestion) {
      setMsg("Select a match and enter a question");
      return;
    }
    const validOptions = marketOptions.filter((o) => o.label.trim());
    if (validOptions.length < 2) {
      setMsg("Need at least 2 options");
      return;
    }

    const options: MarketOption[] = validOptions.map((o, i) => ({
      id: `opt_${i}`,
      label: o.label.trim(),
      odds: o.odds,
    }));

    const { error } = await supabase.from("markets").insert({
      match_id: selectedMatchId,
      question: marketQuestion,
      market_type: options.length === 2 ? "binary" : "multiple_choice",
      options,
      status: "open",
      tier: marketTier,
    });

    if (error) { setMsg(`Error: ${error.message}`); return; }
    setMsg("Market added!");
    setMarketQuestion("");
    setMarketTier("easy");
    setMarketOptions([
      { label: "", odds: 2 },
      { label: "", odds: 2 },
    ]);
    loadData();
  };

  const getTemplatesForMatch = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return [];
    return [
      {
        name: "Match Winner",
        question: `Who will win ${match.team_a_short} vs ${match.team_b_short}?`,
        tier: "easy" as MarketTier,
        options: [
          { label: match.team_a_short, odds: 2 },
          { label: match.team_b_short, odds: 2 },
        ],
      },
      {
        name: "Total Runs O/U 340",
        question: `Will the combined total exceed 340 runs?`,
        tier: "easy" as MarketTier,
        options: [
          { label: "Over 340", odds: 1.9 },
          { label: "Under 340", odds: 1.9 },
        ],
      },
      {
        name: "First Innings Score",
        question: `What will the first innings score be?`,
        tier: "medium" as MarketTier,
        options: [
          { label: "Under 150", odds: 3 },
          { label: "150-179", odds: 2.5 },
          { label: "180-199", odds: 2.5 },
          { label: "200+", odds: 3 },
        ],
      },
      {
        name: "Player of the Match",
        question: `Which team's player will be Player of the Match?`,
        tier: "easy" as MarketTier,
        options: [
          { label: `${match.team_a_short} player`, odds: 2 },
          { label: `${match.team_b_short} player`, odds: 2 },
        ],
      },
    ];
  };

  const handleCreateFromTemplate = async (
    matchId: string,
    template: { question: string; options: { label: string; odds: number }[]; tier?: MarketTier }
  ) => {
    const options = template.options.map((o, i) => ({
      id: `opt_${i}`,
      label: o.label,
      odds: o.odds,
    }));

    const { error } = await supabase.from("markets").insert({
      match_id: matchId,
      question: template.question,
      market_type: options.length === 2 ? "binary" : "multiple_choice",
      options,
      status: "open",
      tier: template.tier || "easy",
    });

    if (error) {
      setMsg(`Error: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleCreateAllTemplates = async (matchId: string) => {
    setCreatingTemplates(true);
    const templates = getTemplatesForMatch(matchId);
    let created = 0;
    for (const t of templates) {
      const ok = await handleCreateFromTemplate(matchId, t);
      if (ok) created++;
    }
    setMsg(`Created ${created} markets from templates!`);
    setCreatingTemplates(false);
    loadData();
  };

  const handleUpdateStatus = async (matchId: string, status: string) => {
    await supabase.from("matches").update({ status }).eq("id", matchId);
    // If locking match, lock all its markets too
    if (status === "live") {
      await supabase
        .from("markets")
        .update({ status: "locked" })
        .eq("match_id", matchId)
        .eq("status", "open");
    }
    loadData();
  };

  const handleResetMatch = async (matchId: string) => {
    if (!confirm("Reset this match? This will reopen all markets and clear all settlement results. Predictions will keep their wagers but lose settlement data.")) return;

    // Reset match to upcoming
    await supabase
      .from("matches")
      .update({ status: "upcoming", result: null })
      .eq("id", matchId);

    // Reset all markets to open, clear correct_option_id
    await supabase
      .from("markets")
      .update({ status: "open", correct_option_id: null })
      .eq("match_id", matchId);

    // Reset predictions: clear coins_won and ssr_earned
    const { data: markets } = await supabase
      .from("markets")
      .select("id")
      .eq("match_id", matchId);

    if (markets) {
      for (const market of markets) {
        await supabase
          .from("predictions")
          .update({ coins_won: null, ssr_earned: 0 })
          .eq("market_id", market.id);
      }
    }

    setMsg("Match reset to upcoming. Note: user coin balances were NOT reverted — do that manually if needed.");
    loadData();
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-400">Access denied.</div>;

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-white">Manage Matches</h1>
              <p className="text-sm text-gray-500">{matches.length} total matches</p>
            </div>
            <a
              href="/admin"
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Back to Admin
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-10">

      {msg && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm p-3 rounded-lg mb-4">
          {msg}
        </div>
      )}

      {/* Add Match */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Add Match</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Team A</option>
            {IPL_TEAMS.map((t) => (
              <option key={t.short} value={t.short}>
                {t.short} - {t.name}
              </option>
            ))}
          </select>
          <select
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Team B</option>
            {IPL_TEAMS.map((t) => (
              <option key={t.short} value={t.short}>
                {t.short} - {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="time"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
          />
        </div>
        <button
          onClick={handleAddMatch}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add Match
        </button>
      </div>

      {/* Add Market */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Add Market to Match</h2>
        <select
          value={selectedMatchId}
          onChange={(e) => setSelectedMatchId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-3"
        >
          <option value="">Select Match</option>
          {matches
            .filter((m) => m.status !== "completed")
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.team_a_short} vs {m.team_b_short} —{" "}
                {new Date(m.match_date).toLocaleDateString("en-IN")}
              </option>
            ))}
        </select>
        {/* Quick Templates */}
        {selectedMatchId && (
          <div className="mb-3">
            <p className="text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">Quick Templates</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {getTemplatesForMatch(selectedMatchId).map((t) => (
                <button
                  key={t.name}
                  onClick={() => {
                    setMarketQuestion(t.question);
                    setMarketOptions(t.options.map((o) => ({ label: o.label, odds: o.odds })));
                  }}
                  className="text-[11px] bg-gray-800 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleCreateAllTemplates(selectedMatchId)}
              disabled={creatingTemplates}
              className="text-[11px] bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {creatingTemplates ? "Creating..." : "Create All 4 Templates at Once"}
            </button>
          </div>
        )}

        {/* Tier Selector */}
        <div className="mb-3">
          <p className="text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">Market Tier</p>
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as MarketTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setMarketTier(tier);
                  // Auto-suggest odds based on tier
                  const defaultOdds = tier === "easy" ? 1.8 : tier === "medium" ? 3 : 8;
                  setMarketOptions((prev) =>
                    prev.map((o) => ({ ...o, odds: defaultOdds }))
                  );
                }}
                className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                  marketTier === tier
                    ? tier === "easy"
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : tier === "medium"
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                        : "bg-red-500/20 border-red-500/50 text-red-400"
                    : "bg-gray-800 border-gray-700 text-gray-500"
                }`}
              >
                <div>{TIER_LABELS[tier].name}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{TIER_LABELS[tier].range}</div>
                <div className="text-[10px] opacity-70">+{SSR_REWARDS[tier]} SSR</div>
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder='Question (e.g. "Who will win?")'
          value={marketQuestion}
          onChange={(e) => setMarketQuestion(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 mb-3"
        />
        <div className="space-y-2 mb-3">
          {marketOptions.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt.label}
                onChange={(e) => {
                  const updated = [...marketOptions];
                  updated[i].label = e.target.value;
                  setMarketOptions(updated);
                }}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
              />
              <input
                type="number"
                step="0.1"
                min="1"
                value={opt.odds}
                onChange={(e) => {
                  const updated = [...marketOptions];
                  updated[i].odds = parseFloat(e.target.value) || 1;
                  setMarketOptions(updated);
                }}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setMarketOptions([...marketOptions, { label: "", odds: 2 }])
            }
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            + Add Option
          </button>
          {marketOptions.length > 2 && (
            <button
              onClick={() => setMarketOptions(marketOptions.slice(0, -1))}
              className="text-xs text-red-400 hover:text-red-300"
            >
              - Remove
            </button>
          )}
        </div>
        <button
          onClick={handleAddMarket}
          className="mt-3 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add Market
        </button>
      </div>

      {/* Existing Matches */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        All Matches
      </h2>
      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-white">
                {match.team_a_short} vs {match.team_b_short}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(match.match_date).toLocaleString("en-IN")} •{" "}
                {match.venue}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  match.status === "upcoming"
                    ? "bg-blue-500/10 text-blue-400"
                    : match.status === "live"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-gray-500/10 text-gray-400"
                }`}
              >
                {match.status}
              </span>
              {match.status === "upcoming" && (
                <button
                  onClick={() => handleUpdateStatus(match.id, "live")}
                  className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded"
                >
                  Go Live
                </button>
              )}
              {match.status === "live" && (
                <button
                  onClick={() => handleUpdateStatus(match.id, "completed")}
                  className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
                >
                  Complete
                </button>
              )}
              {(match.status === "live" || match.status === "completed") && (
                <button
                  onClick={() => handleResetMatch(match.id)}
                  className="text-xs bg-red-600/80 hover:bg-red-500 text-white px-2 py-1 rounded"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
