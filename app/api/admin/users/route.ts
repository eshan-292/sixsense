import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user : null;
}

// PATCH: Update user (grant coins, toggle admin, reset stats)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const adminUser = await checkAdmin(supabase);
  if (!adminUser) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { user_id, action, value } = await request.json();
  if (!user_id || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (action === "grant_coins") {
    const amount = parseInt(value) || 0;
    if (amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: "Invalid amount (1-100,000)" }, { status: 400 });
    }
    const { data: profile } = await admin.from("profiles").select("coins").eq("id", user_id).single();
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await admin.from("profiles").update({ coins: profile.coins + amount }).eq("id", user_id);
    return NextResponse.json({ success: true, new_coins: profile.coins + amount });
  }

  if (action === "toggle_admin") {
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user_id).single();
    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await admin.from("profiles").update({ is_admin: !profile.is_admin }).eq("id", user_id);
    return NextResponse.json({ success: true, is_admin: !profile.is_admin });
  }

  if (action === "reset_coins") {
    await admin.from("profiles").update({ coins: 10000 }).eq("id", user_id);
    return NextResponse.json({ success: true });
  }

  if (action === "delete_user") {
    // Prevent deleting yourself
    if (user_id === adminUser.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Delete predictions, parlays, then profile, then auth user
    await admin.from("predictions").delete().eq("user_id", user_id);
    await admin.from("parlays").delete().eq("user_id", user_id);
    await admin.from("parlay_legs").delete().eq("user_id", user_id);
    await admin.from("profiles").delete().eq("id", user_id);

    // Delete from Supabase Auth
    const { error: authError } = await admin.auth.admin.deleteUser(user_id);
    if (authError) {
      return NextResponse.json({
        success: true,
        warning: "Profile deleted but auth user removal failed: " + authError.message,
      });
    }

    return NextResponse.json({ success: true, deleted: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
