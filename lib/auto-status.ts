import { createAdminClient } from "./supabase/admin";
import { autoSettleCompletedMatches } from "./auto-settle";

/**
 * Auto-transition matches based on scheduled time:
 * - If match_date has passed and status is "upcoming" → set to "live" + lock markets
 * - If match has been live for 3.5+ hours → check Cricbuzz for result and auto-settle
 * Called on server-side page loads (home page, match page).
 */

// Debounce auto-settle: only run once every 5 minutes across all page loads
let lastSettleRun = 0;
const SETTLE_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes
let settleRunning = false;

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
      await admin
        .from("matches")
        .update({ status: "live" })
        .eq("id", match.id);

      await admin
        .from("markets")
        .update({ status: "locked" })
        .eq("match_id", match.id)
        .eq("status", "open");
    }
  }

  // Auto-settle: debounced to run at most once every 5 minutes
  const nowMs = Date.now();
  if (nowMs - lastSettleRun < SETTLE_DEBOUNCE_MS || settleRunning) return;

  lastSettleRun = nowMs;
  settleRunning = true;

  autoSettleCompletedMatches()
    .catch(() => {
      // Silently fail — will retry next debounce window
    })
    .finally(() => {
      settleRunning = false;
    });
}
