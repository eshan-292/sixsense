import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import MatchDetailClient from "./MatchDetailClient";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return <MatchDetailClient match={match} initialMarkets={markets || []} />;
}
