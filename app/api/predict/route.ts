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

  if (coins_wagered < 10 || coins_wagered > 500) {
    return NextResponse.json(
      { error: "Wager must be between 10 and 500" },
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
  // Seed each option proportionally to its initial odds (implied probability)
  const TOTAL_SEED = 1000;
  const { data: allMarketPreds } = await supabase
    .from("predictions")
    .select("selected_option_id, coins_wagered")
    .eq("market_id", market_id);

  const pools: Record<string, number> = {};
  allMarketPreds?.forEach((p: { selected_option_id: string; coins_wagered: number }) => {
    pools[p.selected_option_id] = (pools[p.selected_option_id] || 0) + p.coins_wagered;
  });

  // Seed proportional to implied probability (1/odds)
  const totalImpliedProb = market.options.reduce(
    (sum: number, o: { id: string; odds: number }) => sum + 1 / o.odds,
    0
  );
  function getOptionSeed(o: { odds: number }): number {
    return Math.round(((1 / o.odds) / totalImpliedProb) * TOTAL_SEED);
  }

  const totalEffectivePool = market.options.reduce(
    (sum: number, o: { id: string; odds: number }) => sum + (pools[o.id] || 0) + getOptionSeed(o),
    0
  );
  const selectedOpt = market.options.find((o: { id: string }) => o.id === selected_option_id);
  const selectedPool = (pools[selected_option_id] || 0) + getOptionSeed(selectedOpt || { odds: 2 });
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
