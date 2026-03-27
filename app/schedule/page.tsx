import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IPL 2026 Schedule — All 70 Matches",
  description:
    "Complete IPL 2026 schedule with all 70 league matches. See fixtures, venues, and match times.",
};

export default async function SchedulePage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  const allMatches = matches || [];
  const totalMatches = allMatches.length;
  const completedMatches = allMatches.filter((m) => m.status === "completed").length;
  const liveMatches = allMatches.filter((m) => m.status === "live").length;

  return (
    <div className="min-h-screen">
      <div className="hero-gradient">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">
            IPL 2026 Schedule
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Complete fixtures list &middot; {totalMatches} matches
          </p>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{completedMatches}</p>
              <p className="text-[10px] text-gray-500">Completed</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-400">{liveMatches}</p>
              <p className="text-[10px] text-gray-500">Live</p>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <p className="text-xl font-bold text-blue-400">
                {totalMatches - completedMatches - liveMatches}
              </p>
              <p className="text-[10px] text-gray-500">Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        <ScheduleClient matches={allMatches} />
      </div>
    </div>
  );
}
