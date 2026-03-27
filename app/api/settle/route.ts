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

  const { market_id, correct_option_id } = await request.json();

  if (!market_id || !correct_option_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get market
  const { data: market } = await admin
    .from("markets")
    .select("*")
    .eq("id", market_id)
    .single();

  if (!market || market.status === "settled") {
    return NextResponse.json(
      { error: "Market not found or already settled" },
      { status: 400 }
    );
  }

  // Get the winning option's odds
  const winningOption = market.options.find(
    (opt: { id: string }) => opt.id === correct_option_id
  );
  if (!winningOption) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  // Get all predictions for this market
  const { data: predictions } = await admin
    .from("predictions")
    .select("*")
    .eq("market_id", market_id);

  if (predictions) {
    for (const pred of predictions) {
      const isWinner = pred.selected_option_id === correct_option_id;
      const coinsWon = isWinner
        ? Math.floor(pred.coins_wagered * winningOption.odds)
        : 0;

      // Update prediction with result
      await admin
        .from("predictions")
        .update({ coins_won: coinsWon })
        .eq("id", pred.id);

      // Update user coins and stats
      const { data: userProfile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", pred.user_id)
        .single();

      if (userProfile) {
        const newStreak = isWinner ? userProfile.win_streak + 1 : 0;
        await admin
          .from("profiles")
          .update({
            coins: userProfile.coins + coinsWon,
            total_wins: userProfile.total_wins + (isWinner ? 1 : 0),
            total_losses: userProfile.total_losses + (isWinner ? 0 : 1),
            win_streak: newStreak,
            best_streak: Math.max(userProfile.best_streak, newStreak),
          })
          .eq("id", pred.user_id);
      }
    }
  }

  // Mark market as settled
  await admin
    .from("markets")
    .update({ status: "settled", correct_option_id })
    .eq("id", market_id);

  return NextResponse.json({
    success: true,
    predictions_settled: predictions?.length || 0,
  });
}
