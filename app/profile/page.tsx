"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";
import type { Profile, Prediction, Market } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [predictions, setPredictions] = useState<
    (Prediction & { market?: Market })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p);

      const { data: preds } = await supabase
        .from("predictions")
        .select("*, market:markets(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setPredictions(preds || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400">Sign in to see your profile.</p>
      </div>
    );
  }

  const winRate =
    profile.total_predictions > 0
      ? ((profile.total_wins / profile.total_predictions) * 100).toFixed(1)
      : "0";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full border-2 border-gray-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
              {profile.display_name?.[0] || "?"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {profile.display_name}
            </h1>
            <p className="text-sm text-gray-400">
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-yellow-400">
              🪙 {formatCoins(profile.coins)}
            </p>
            <p className="text-xs text-gray-500">Coins</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-indigo-400">
              {profile.total_predictions}
            </p>
            <p className="text-xs text-gray-500">Predictions</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-400">{winRate}%</p>
            <p className="text-xs text-gray-500">Win Rate</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-orange-400">
              🔥 {profile.best_streak}
            </p>
            <p className="text-xs text-gray-500">Best Streak</p>
          </div>
        </div>
      </div>

      {/* Recent Predictions */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Recent Predictions
      </h2>

      {predictions.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-gray-500">No predictions yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Start predicting on matches!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {predictions.map((pred) => {
            const market = pred.market as Market | undefined;
            const selectedLabel =
              market?.options.find(
                (o: { id: string }) => o.id === pred.selected_option_id
              )?.label || pred.selected_option_id;

            return (
              <div
                key={pred.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {market?.question || "Unknown market"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Picked: <span className="text-gray-300">{selectedLabel}</span>
                    {" • "}Wagered: 🪙 {formatCoins(pred.coins_wagered)}
                  </p>
                </div>
                <div className="shrink-0 ml-3">
                  {pred.coins_won === null ? (
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  ) : pred.coins_won > 0 ? (
                    <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
                      +🪙 {formatCoins(pred.coins_won)}
                    </span>
                  ) : (
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
                      Lost
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
