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
  const [menuOpen, setMenuOpen] = useState(false);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">🏏</span>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Six</span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Sense</span>
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/schedule"
            className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800/50 transition-all"
          >
            Schedule
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800/50 transition-all"
          >
            Leaderboard
          </Link>
          {user && (
            <Link
              href="/profile"
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800/50 transition-all"
            >
              Profile
            </Link>
          )}
          {profile?.is_admin && (
            <Link
              href="/admin"
              className="text-sm text-orange-400 hover:text-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-500/10 transition-all"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 py-1">
                <span className="text-xs">🪙</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {formatCoins(profile.coins)}
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="relative group"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-gray-700 group-hover:border-indigo-500 transition-colors"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {profile.display_name?.[0] || "?"}
                  </div>
                )}
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute top-14 right-4 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1.5 min-w-[180px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-800">
                      <p className="text-sm font-medium text-white truncate">
                        {profile.display_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        🪙 {formatCoins(profile.coins)} coins
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800/50 sm:hidden"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/schedule"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800/50 sm:hidden"
                    >
                      Schedule
                    </Link>
                    <Link
                      href="/leaderboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800/50 sm:hidden"
                    >
                      Leaderboard
                    </Link>
                    {profile.is_admin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-orange-400 hover:bg-gray-800/50 sm:hidden"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800/50"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 rounded-full px-4 py-1.5 text-sm font-medium transition-all shadow-lg shadow-white/5 hover:shadow-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
