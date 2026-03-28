import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { match_id } = await request.json();
  if (!match_id) {
    return NextResponse.json({ error: "Missing match_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get all markets for this match
  const { data: markets } = await admin
    .from("markets")
    .select("id")
    .eq("match_id", match_id);

  if (!markets || markets.length === 0) {
    return NextResponse.json({ error: "No markets found" }, { status: 404 });
  }

  const marketIds = markets.map((m) => m.id);

  // Get all predictions for these markets
  const { data: predictions } = await admin
    .from("predictions")
    .select("id, user_id, coins_wagered, coins_won")
    .in("market_id", marketIds);

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ message: "No predictions to clear", cleared: 0 });
  }

  // Calculate refunds per user
  const userRefunds: Record<string, number> = {};
  const userPredCounts: Record<string, number> = {};
  const userWinCounts: Record<string, number> = {};
  const userLossCounts: Record<string, number> = {};

  for (const pred of predictions) {
    // Refund = wagered coins minus any winnings already paid out
    const refund = pred.coins_wagered - (pred.coins_won || 0);
    userRefunds[pred.user_id] = (userRefunds[pred.user_id] || 0) + refund;
    userPredCounts[pred.user_id] = (userPredCounts[pred.user_id] || 0) + 1;
    if (pred.coins_won !== null && pred.coins_won > 0) {
      userWinCounts[pred.user_id] = (userWinCounts[pred.user_id] || 0) + 1;
    } else if (pred.coins_won !== null) {
      userLossCounts[pred.user_id] = (userLossCounts[pred.user_id] || 0) + 1;
    }
  }

  // Apply refunds and revert stats
  for (const [userId, refund] of Object.entries(userRefunds)) {
    const { data: userProfile } = await admin
      .from("profiles")
      .select("coins, total_predictions, total_wins, total_losses")
      .eq("id", userId)
      .single();

    if (userProfile) {
      await admin
        .from("profiles")
        .update({
          coins: userProfile.coins + refund,
          total_predictions: Math.max(0, userProfile.total_predictions - (userPredCounts[userId] || 0)),
          total_wins: Math.max(0, userProfile.total_wins - (userWinCounts[userId] || 0)),
          total_losses: Math.max(0, userProfile.total_losses - (userLossCounts[userId] || 0)),
        })
        .eq("id", userId);
    }
  }

  // Delete all predictions for these markets
  for (const marketId of marketIds) {
    await admin
      .from("predictions")
      .delete()
      .eq("market_id", marketId);
  }

  // Delete parlays for this match
  await admin
    .from("parlays")
    .delete()
    .eq("match_id", match_id);

  return NextResponse.json({
    success: true,
    cleared: predictions.length,
    users_refunded: Object.keys(userRefunds).length,
    markets: markets.length,
  });
}
