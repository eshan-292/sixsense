"use client";

import { useState } from "react";
import LeaderboardTable from "./LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/types";

type TabId = "ssr" | "coins" | "streak" | "today";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "ssr", label: "Top Predictors", icon: "\u{1F3AF}" },
  { id: "coins", label: "Richest", icon: "\u{1FA99}" },
  { id: "streak", label: "Hot Streak", icon: "\u{1F525}" },
  { id: "today", label: "Today's Best", icon: "\u{2B50}" },
];

export default function LeaderboardTabs({
  ssrLeaders,
  coinLeaders,
  streakLeaders,
  todayLeaders,
  currentUserId,
}: {
  ssrLeaders: LeaderboardEntry[];
  coinLeaders: LeaderboardEntry[];
  streakLeaders: LeaderboardEntry[];
  todayLeaders: LeaderboardEntry[];
  currentUserId?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("ssr");

  const getLeaders = () => {
    switch (activeTab) {
      case "ssr":
        return ssrLeaders;
      case "coins":
        return coinLeaders;
      case "streak":
        return streakLeaders;
      case "today":
        return todayLeaders;
    }
  };

  const getPrimaryMetric = (): "ssr" | "coins" | "streak" | "today" => activeTab;

  // Podium for current tab
  const leaders = getLeaders();
  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

  const getPodiumValue = (leader: LeaderboardEntry) => {
    switch (activeTab) {
      case "ssr":
        return `${leader.ssr ?? 0} SSR`;
      case "coins":
        return `${(leader.coins ?? 0).toLocaleString("en-IN")} coins`;
      case "streak":
        return `${leader.current_streak ?? 0} streak`;
      case "today":
        return `${leader.ssr_today ?? 0} SSR today`;
    }
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900/50 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs font-medium px-2 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {leaders && leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-6">
          {[1, 0, 2].map((idx) => {
            const leader = leaders[idx];
            const podiumH = idx === 0 ? "h-24" : idx === 1 ? "h-16" : "h-12";
            const avatarSize = idx === 0 ? "w-14 h-14" : "w-11 h-11";
            const borderColor =
              idx === 0
                ? "border-yellow-400 shadow-yellow-500/30"
                : idx === 1
                  ? "border-gray-300 shadow-gray-400/20"
                  : "border-amber-600 shadow-amber-500/20";

            return (
              <a key={leader.id} href={`/user/${leader.id}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="text-2xl mb-1">{medals[idx]}</div>
                {leader.avatar_url ? (
                  <img
                    src={leader.avatar_url}
                    alt=""
                    className={`${avatarSize} rounded-full border-2 ${borderColor} shadow-lg mb-1`}
                  />
                ) : (
                  <div
                    className={`${avatarSize} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white mb-1 border-2 ${borderColor} shadow-lg`}
                  >
                    {leader.display_name?.[0] || "?"}
                  </div>
                )}
                <p className="text-xs font-medium text-white truncate max-w-[80px] text-center">
                  {leader.display_name}
                </p>
                <p className="text-[11px] text-purple-400 font-semibold">
                  {getPodiumValue(leader)}
                </p>
                <div
                  className={`${podiumH} w-20 bg-gradient-to-t from-indigo-600/20 to-transparent rounded-t-lg mt-2 border-t-2 border-indigo-500/50`}
                />
              </a>
            );
          })}
        </div>
      )}

      <LeaderboardTable
        leaders={leaders || []}
        currentUserId={currentUserId}
        primaryMetric={getPrimaryMetric()}
      />
    </>
  );
}
