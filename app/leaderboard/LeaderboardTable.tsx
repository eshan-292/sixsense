"use client";

import { useState } from "react";
import { formatCoins } from "@/lib/utils";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";

const medals = ["🥇", "🥈", "🥉"];

export default function LeaderboardTable({
  leaders,
  currentUserId,
}: {
  leaders: LeaderboardEntry[];
  currentUserId?: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? leaders.filter((l) =>
        l.display_name?.toLowerCase().includes(search.toLowerCase())
      )
    : leaders;

  return (
    <>
      {/* Search input */}
      {leaders.length > 5 && (
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-[10px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left text-[10px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider">
                Player
              </th>
              <th className="text-right text-[10px] text-gray-500 font-medium py-3 px-4 uppercase tracking-wider">
                Coins
              </th>
              <th className="text-right text-[10px] text-gray-500 font-medium py-3 px-4 hidden sm:table-cell uppercase tracking-wider">
                Record
              </th>
              <th className="text-right text-[10px] text-gray-500 font-medium py-3 px-4 hidden sm:table-cell uppercase tracking-wider">
                Streak
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((leader, idx) => {
              const isCurrentUser = leader.id === currentUserId;
              // Find original rank (not filtered rank)
              const originalIdx = leaders.indexOf(leader);
              return (
                <tr
                  key={leader.id}
                  className={`border-b border-gray-800/30 transition-colors ${
                    isCurrentUser
                      ? "bg-indigo-500/10"
                      : "hover:bg-gray-800/30"
                  }`}
                >
                  <td className="py-3 px-4 text-sm">
                    {originalIdx < 3 ? (
                      <span className="text-lg">{medals[originalIdx]}</span>
                    ) : (
                      <span className="text-gray-500 font-mono text-xs">
                        {originalIdx + 1}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/user/${leader.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      {leader.avatar_url ? (
                        <img
                          src={leader.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full border border-gray-700"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white">
                          {leader.display_name?.[0] || "?"}
                        </div>
                      )}
                      <span className="text-sm text-white font-medium truncate max-w-[140px]">
                        {leader.display_name}
                        {isCurrentUser && (
                          <span className="text-indigo-400 text-xs ml-1.5">
                            (You)
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-semibold text-yellow-400">
                      🪙 {formatCoins(leader.coins)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs hidden sm:table-cell">
                    <span className="text-green-400 font-medium">
                      {leader.total_wins}W
                    </span>
                    <span className="text-gray-600 mx-0.5">/</span>
                    <span className="text-red-400 font-medium">
                      {(leader.total_predictions ?? 0) - (leader.total_wins ?? 0)}L
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-xs hidden sm:table-cell">
                    {leader.win_streak > 0 ? (
                      <span className="text-orange-400 font-medium">
                        🔥 {leader.win_streak}
                      </span>
                    ) : (
                      <span className="text-gray-700">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            {search ? (
              <>
                <p className="text-gray-400 text-sm">No players matching &quot;{search}&quot;</p>
                <button
                  onClick={() => setSearch("")}
                  className="text-xs text-indigo-400 mt-2 hover:text-indigo-300"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">🏆</p>
                <p className="text-gray-400">No players yet.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Sign up and start predicting!
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
