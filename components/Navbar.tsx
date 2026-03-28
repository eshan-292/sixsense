"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0f1923] border-b border-[#243040]">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-white tracking-tight">
            Six<span className="text-[#e63946]">Sense</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              {/* Coins */}
              <div className="flex items-center gap-1.5 bg-[#f5a623]/10 border border-[#f5a623]/25 rounded-full px-3 py-1.5">
                <span className="text-xs">🪙</span>
                <span className="text-sm font-bold text-[#f5a623]">
                  {formatCoins(profile.coins)}
                </span>
              </div>
              {/* Avatar */}
              <Link href="/profile">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-[#243040]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#e63946] flex items-center justify-center text-sm font-bold text-white">
                    {profile.display_name?.[0] || "?"}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
