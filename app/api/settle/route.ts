import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketTier } from "@/lib/types";

const SSR_REWARDS: Record<MarketTier, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

const SSR_PENALTY = 3;

function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

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

  // Validate the winning option exists
  const winningOption = market.options.find(
    (opt: { id: string }) => opt.id === correct_option_id
  );
  if (!winningOption) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  const tier: MarketTier = market.tier || "easy";
  const baseSSR = SSR_REWARDS[tier];

  // Get all predictions for this market
  const { data: predictions } = await admin
    .from("predictions")
    .select("*")
    .eq("market_id", market_id);

  let totalPaidOut = 0;

  if (predictions) {
    for (const pred of predictions) {
      const isWinner = pred.selected_option_id === correct_option_id;
      // Use locked_odds if available (dynamic odds), fall back to static market odds
      const payoutOdds = pred.locked_odds || winningOption.odds;
      const coinsWon = isWinner
        ? Math.floor(pred.coins_wagered * payoutOdds)
        : 0;
      totalPaidOut += coinsWon;

      // Get user profile for streak calculations
      const { data: userProfile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", pred.user_id)
        .single();

      if (!userProfile) continue;

      // Calculate SSR
      let ssrEarned = 0;
      const newStreak = isWinner ? (userProfile.current_streak || 0) + 1 : 0;
      const newWinStreak = isWinner ? userProfile.win_streak + 1 : 0;

      if (isWinner) {
        const streakMultiplier = getStreakMultiplier(newStreak);
        ssrEarned = Math.floor(baseSSR * streakMultiplier);
      } else {
        ssrEarned = -SSR_PENALTY;
      }

      const newSSR = Math.max(0, (userProfile.ssr || 0) + ssrEarned);
      const newSSRToday = (userProfile.ssr_today || 0) + (isWinner ? ssrEarned : 0);

      // Update prediction with result and SSR
      await admin
        .from("predictions")
        .update({ coins_won: coinsWon, ssr_earned: isWinner ? ssrEarned : -SSR_PENALTY })
        .eq("id", pred.id);

      // Update user coins, stats, SSR, and streaks
      await admin
        .from("profiles")
        .update({
          coins: userProfile.coins + coinsWon,
          total_wins: userProfile.total_wins + (isWinner ? 1 : 0),
          total_losses: userProfile.total_losses + (isWinner ? 0 : 1),
          win_streak: newWinStreak,
          best_streak: Math.max(userProfile.best_streak, newWinStreak),
          ssr: newSSR,
          ssr_today: newSSRToday,
          current_streak: newStreak,
        })
        .eq("id", pred.user_id);
    }
  }

  // Mark market as settled
  await admin
    .from("markets")
    .update({ status: "settled", correct_option_id })
    .eq("id", market_id);

  // Check for parlay resolution
  // Get all active parlays that include this market
  const { data: activeParlays } = await admin
    .from("parlays")
    .select("*")
    .eq("status", "active");

  if (activeParlays) {
    for (const parlay of activeParlays) {
      const parlayPreds = parlay.predictions as { market_id: string; selected_option_id: string }[];
      const includesThisMarket = parlayPreds.some((p) => p.market_id === market_id);
      if (!includesThisMarket) continue;

      // Check if all markets in this parlay are settled
      const parlayMarketIds = parlayPreds.map((p) => p.market_id);
      const { data: parlayMarkets } = await admin
        .from("markets")
        .select("id, status, correct_option_id")
        .in("id", parlayMarketIds);

      if (!parlayMarkets) continue;

      const allSettled = parlayMarkets.every((m) => m.status === "settled");
      if (!allSettled) continue;

      // All settled — resolve the parlay
      let allCorrect = true;
      for (const pp of parlayPreds) {
        const settledMarket = parlayMarkets.find((m) => m.id === pp.market_id);
        if (!settledMarket || settledMarket.correct_option_id !== pp.selected_option_id) {
          allCorrect = false;
          break;
        }
      }

      const parlayCoinsWon = allCorrect
        ? Math.floor(parlay.coins_wagered * parlay.combined_odds)
        : 0;
      const parlaySSR = allCorrect
        ? parlayPreds.length * 25 // Bonus SSR for parlays
        : 0;

      await admin
        .from("parlays")
        .update({
          status: allCorrect ? "won" : "lost",
          coins_won: parlayCoinsWon,
          ssr_earned: parlaySSR,
        })
        .eq("id", parlay.id);

      // Credit user for parlay win
      if (allCorrect) {
        const { data: parlayUser } = await admin
          .from("profiles")
          .select("coins, ssr, ssr_today")
          .eq("id", parlay.user_id)
          .single();

        if (parlayUser) {
          await admin
            .from("profiles")
            .update({
              coins: parlayUser.coins + parlayCoinsWon,
              ssr: (parlayUser.ssr || 0) + parlaySSR,
              ssr_today: (parlayUser.ssr_today || 0) + parlaySSR,
            })
            .eq("id", parlay.user_id);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    predictions_settled: predictions?.length || 0,
    total_paid_out: totalPaidOut,
  });
}
