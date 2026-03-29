import { autoSettleCompletedMatches } from "@/lib/auto-settle";

/**
 * GET /api/auto-settle
 * Trigger auto-settlement of completed matches.
 * Can be called by a cron job (e.g. Vercel Cron, external cron service).
 * Also runs automatically on page loads via autoUpdateMatchStatuses().
 */
export async function GET() {
  try {
    await autoSettleCompletedMatches();
    return Response.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
