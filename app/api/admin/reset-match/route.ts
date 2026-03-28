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

  // Reset match to upcoming
  await admin
    .from("matches")
    .update({ status: "upcoming", result: null })
    .eq("id", match_id);

  // Reset all markets to open, clear correct_option_id
  await admin
    .from("markets")
    .update({ status: "open", correct_option_id: null })
    .eq("match_id", match_id);

  // Reset predictions: clear coins_won and ssr_earned
  const { data: markets } = await admin
    .from("markets")
    .select("id")
    .eq("match_id", match_id);

  if (markets) {
    for (const market of markets) {
      await admin
        .from("predictions")
        .update({ coins_won: null, ssr_earned: 0 })
        .eq("market_id", market.id);
    }
  }

  return NextResponse.json({
    success: true,
    markets_reset: markets?.length || 0,
  });
}
