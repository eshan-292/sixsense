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

  const { match_id, predictions, coins_wagered } = await request.json();

  if (!match_id || !predictions || !coins_wagered) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!Array.isArray(predictions) || predictions.length < 2 || predictions.length > 4) {
    return NextResponse.json(
      { error: "Parlay must include 2-4 predictions" },
      { status: 400 }
    );
  }

  if (coins_wagered < 100 || coins_wagered > 2000) {
    return NextResponse.json(
      { error: "Wager must be between 100 and 2,000" },
      { status: 400 }
    );
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("coins")
    .eq("id", user.id)
    .single();

  if (!profile || profile.coins < coins_wagered) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
  }

  // Get all markets for this match
  const marketIds = predictions.map((p: { market_id: string }) => p.market_id);
  const uniqueMarketIds = [...new Set(marketIds)];

  if (uniqueMarketIds.length !== predictions.length) {
    return NextResponse.json(
      { error: "Cannot select the same market twice" },
      { status: 400 }
    );
  }

  const { data: markets } = await supabase
    .from("markets")
    .select("*")
    .in("id", uniqueMarketIds);

  if (!markets || markets.length !== uniqueMarketIds.length) {
    return NextResponse.json({ error: "Invalid markets" }, { status: 400 });
  }

  // Validate all markets belong to the same match and are open
  for (const market of markets) {
    if (market.match_id !== match_id) {
      return NextResponse.json(
        { error: "All markets must belong to the same match" },
        { status: 400 }
      );
    }
    if (market.status !== "open") {
      return NextResponse.json(
        { error: `Market "${market.question}" is not open` },
        { status: 400 }
      );
    }
  }

  // Validate options and calculate combined odds
  let combinedOdds = 1;
  for (const pred of predictions as { market_id: string; selected_option_id: string }[]) {
    const market = markets.find((m) => m.id === pred.market_id);
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 400 });
    }
    const option = market.options.find(
      (o: { id: string; odds: number }) => o.id === pred.selected_option_id
    );
    if (!option) {
      return NextResponse.json({ error: "Invalid option selected" }, { status: 400 });
    }
    combinedOdds *= option.odds;
  }

  // Round combined odds to 2 decimal places
  combinedOdds = Math.round(combinedOdds * 100) / 100;

  // Deduct coins
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ coins: profile.coins - coins_wagered })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to deduct coins" }, { status: 500 });
  }

  // Insert parlay
  const { data: parlay, error: parlayError } = await supabase
    .from("parlays")
    .insert({
      user_id: user.id,
      match_id,
      predictions,
      coins_wagered,
      combined_odds: combinedOdds,
      status: "active",
    })
    .select()
    .single();

  if (parlayError) {
    // Refund coins on failure
    await supabase
      .from("profiles")
      .update({ coins: profile.coins })
      .eq("id", user.id);
    return NextResponse.json({ error: "Failed to create parlay" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    parlay_id: parlay.id,
    combined_odds: combinedOdds,
    potential_payout: Math.floor(coins_wagered * combinedOdds),
  });
}
