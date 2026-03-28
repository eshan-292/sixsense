import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import MatchDetailClient from "./MatchDetailClient";
import { autoUpdateMatchStatuses } from "@/lib/auto-status";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("team_a_short, team_b_short, venue, match_date")
    .eq("id", id)
    .single();

  if (!match) return { title: "Match | SixSense" };

  const dateStr = new Date(match.match_date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    title: `${match.team_a_short} vs ${match.team_b_short} - ${dateStr} | SixSense`,
    description: `Predict the outcome of ${match.team_a_short} vs ${match.team_b_short} at ${match.venue} on ${dateStr}. Place your prediction and compete on the leaderboard!`,
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auto-transition matches past their scheduled time
  await autoUpdateMatchStatuses();

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (!match) notFound();

  const { data: markets } = await supabase
    .from("markets")
    .select("*")
    .eq("match_id", id)
    .order("created_at", { ascending: true });

  // Determine if betting is allowed on this match
  // Only the next upcoming match (or a live match) allows betting
  // All other future matches are locked
  let bettingOpen = false;
  if (match.status === "live") {
    // Live matches have locked markets (already locked when going live)
    bettingOpen = false;
  } else if (match.status === "completed") {
    bettingOpen = false;
  } else {
    // Check if this is the next upcoming match (earliest match_date with status "upcoming")
    const { data: nextMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "upcoming")
      .order("match_date", { ascending: true })
      .limit(1)
      .single();
    bettingOpen = nextMatch?.id === match.id;
  }

  return <MatchDetailClient match={match} initialMarkets={markets || []} bettingOpen={bettingOpen} />;
}
