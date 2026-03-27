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
    .select("coins")
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

  // Deduct coins and create prediction
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      coins: profile.coins - coins_wagered,
      total_predictions: (profile as any).total_predictions + 1,
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to deduct coins" }, { status: 500 });
  }

  const { error: predError } = await supabase.from("predictions").insert({
    user_id: user.id,
    market_id,
    selected_option_id,
    coins_wagered,
  });

  if (predError) {
    // Refund coins on failure
    await supabase
      .from("profiles")
      .update({ coins: profile.coins })
      .eq("id", user.id);
    return NextResponse.json({ error: "Failed to place prediction" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
