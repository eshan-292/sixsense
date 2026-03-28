import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { market_id } = await request.json();
  if (!market_id) return NextResponse.json({ error: "Missing market_id" }, { status: 400 });

  const admin = createAdminClient();

  // Get market
  const { data: market } = await admin.from("markets").select("*").eq("id", market_id).single();
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  if (market.status === "settled") {
    return NextResponse.json({ error: "Cannot cancel a settled market" }, { status: 400 });
  }

  // Refund all predictions
  const { data: predictions } = await admin.from("predictions").select("*").eq("market_id", market_id);
  let refunded = 0;

  if (predictions) {
    for (const pred of predictions) {
      // Refund coins
      const { data: userProfile } = await admin.from("profiles").select("coins, total_predictions").eq("id", pred.user_id).single();
      if (userProfile) {
        await admin.from("profiles").update({
          coins: userProfile.coins + pred.coins_wagered,
          total_predictions: Math.max(0, userProfile.total_predictions - 1),
        }).eq("id", pred.user_id);
      }
      refunded++;
    }

    // Delete predictions
    await admin.from("predictions").delete().eq("market_id", market_id);
  }

  // Delete the market
  await admin.from("markets").delete().eq("id", market_id);

  return NextResponse.json({
    success: true,
    predictions_refunded: refunded,
    total_refunded: predictions?.reduce((s, p) => s + p.coins_wagered, 0) || 0,
  });
}
