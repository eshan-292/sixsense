"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match, Market, MarketOption } from "@/lib/types";

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
  const [marketOptions, setMarketOptions] = useState<
    { label: string; odds: number }[]
  >([
    { label: "", odds: 2 },
    { label: "", odds: 2 },
  ]);

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
    });

    if (error) { setMsg(`Error: ${error.message}`); return; }
    setMsg("Market added!");
    setMarketQuestion("");
    setMarketOptions([
      { label: "", odds: 2 },
      { label: "", odds: 2 },
    ]);
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

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-400">Access denied.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Manage Matches</h1>

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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
