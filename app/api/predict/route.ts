import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { market_id, selected_option_id, coins_wagered } = await request.json();

  if (!market_id || !selected_option_id || !coins_wagered) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (coins_wagered < 100 || coins_wagered > 1000) {
    return NextResponse.json(
      { error: "Wager must be between 100 and 1000" },
      { status: 400 }
    );
  }

  // Check market is open
  const { data: market } = await supabase
    .from("markets")
    .select("*")
    .eq("id", market_id)
    .single();

  if (!market || market.status !== "open") {
    return NextResponse.json(
      { error: "Market is not open for predictions" },
      { status: 400 }
    );
  }

  // Check user has enough coins
  const { data: profile } = await supabase
    .from("profiles")
    .select("coins, total_predictions, last_daily_bonus")
    .eq("id", user.id)
    .single();

  if (!profile || profile.coins < coins_wagered) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
  }

  // Check hasn't already predicted
  const { data: existing } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user.id)
    .eq("market_id", market_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Already predicted on this market" },
      { status: 400 }
    );
  }

  // Validate option exists
  const validOption = market.options.some(
    (opt: { id: string }) => opt.id === selected_option_id
  );
  if (!validOption) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  // Calculate live odds from current prediction pools
  const BASE_LIQUIDITY = 500;
  const { data: allMarketPreds } = await supabase
    .from("predictions")
    .select("selected_option_id, coins_wagered")
    .eq("market_id", market_id);

  const pools: Record<string, number> = {};
  allMarketPreds?.forEach((p: { selected_option_id: string; coins_wagered: number }) => {
    pools[p.selected_option_id] = (pools[p.selected_option_id] || 0) + p.coins_wagered;
  });

  // Calculate current odds for the selected option (pre-bet)
  // All options start with equal base liquidity — crowd shifts the odds
  const totalEffectivePool = market.options.reduce(
    (sum: number, o: { id: string }) => sum + (pools[o.id] || 0) + BASE_LIQUIDITY,
    0
  );
  const selectedPool = (pools[selected_option_id] || 0) + BASE_LIQUIDITY;
  const locked_odds = Math.round((totalEffectivePool / selectedPool) * 100) / 100;

  // Daily bonus: 500 coins for first prediction of the day
  let dailyBonusGranted = false;
  let bonusAmount = 0;
  const now = new Date();
  const lastBonus = profile.last_daily_bonus ? new Date(profile.last_daily_bonus) : null;
  const isNewDay =
    !lastBonus ||
    now.getDate() !== lastBonus.getDate() ||
    now.getMonth() !== lastBonus.getMonth() ||
    now.getFullYear() !== lastBonus.getFullYear();

  if (isNewDay) {
    dailyBonusGranted = true;
    bonusAmount = 500;
  }

  let newCoins = profile.coins - coins_wagered + bonusAmount;

  // Safety net: if user drops below 1,000 coins, auto-refill to 2,000
  let safetyNetApplied = false;
  if (newCoins < 1000) {
    const refill = 2000 - newCoins;
    newCoins = 2000;
    safetyNetApplied = true;
    bonusAmount += refill;
  }

  // Deduct coins and create prediction
  const updateData: Record<string, unknown> = {
    coins: newCoins,
    total_predictions: profile.total_predictions + 1,
  };
  if (dailyBonusGranted) {
    updateData.last_daily_bonus = now.toISOString();
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to deduct coins" }, { status: 500 });
  }

  const { error: predError } = await supabase.from("predictions").insert({
    user_id: user.id,
    market_id,
    selected_option_id,
    coins_wagered,
    locked_odds,
  });

  if (predError) {
    // Refund coins on failure
    await supabase
      .from("profiles")
      .update({ coins: profile.coins })
      .eq("id", user.id);
    return NextResponse.json({ error: "Failed to place prediction" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    daily_bonus: dailyBonusGranted ? 500 : 0,
    safety_net: safetyNetApplied,
    new_balance: newCoins,
    locked_odds,
  });
}
