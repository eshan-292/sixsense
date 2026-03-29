import { createAdminClient } from "./supabase/admin";
import { autoSettleCompletedMatches } from "./auto-settle";

/**
 * Auto-transition matches based on scheduled time:
 * - If match_date has passed and status is "upcoming" → set to "live" + lock markets
 * - If match has been live for 3.5+ hours → check Cricbuzz for result and auto-settle
 * Called on server-side page loads (home page, match page).
 */
export async function autoUpdateMatchStatuses() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Find upcoming matches whose match_date has passed
  const { data: overdueMatches } = await admin
    .from("matches")
    .select("id")
    .eq("status", "upcoming")
    .lt("match_date", now);

  if (overdueMatches && overdueMatches.length > 0) {
    for (const match of overdueMatches) {
      // Set match to live
      await admin
        .from("matches")
        .update({ status: "live" })
        .eq("id", match.id);

      // Lock all open markets for this match
      await admin
        .from("markets")
        .update({ status: "locked" })
        .eq("match_id", match.id)
        .eq("status", "open");
    }
  }

  // Auto-settle completed matches (runs in background, doesn't block page load)
  autoSettleCompletedMatches().catch(() => {
    // Silently fail — settlement will retry on next page load
  });
}
