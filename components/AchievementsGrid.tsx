"use client";

import { useState } from "react";
import type { Achievement, AchievementCategory } from "@/lib/achievements";
import { ACHIEVEMENTS, TIER_COLORS } from "@/lib/achievements";
import AchievementBadge from "@/components/AchievementBadge";

interface AchievementsGridProps {
  earnedIds: Set<string>;
}

const CATEGORIES: { key: AchievementCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "prediction", label: "Predictions" },
  { key: "streak", label: "Streaks" },
  { key: "earnings", label: "Earnings" },
  { key: "social", label: "Social" },
  { key: "special", label: "Special" },
];

export default function AchievementsGrid({ earnedIds }: AchievementsGridProps) {
  const [filter, setFilter] = useState<AchievementCategory | "all">("all");

  const filtered =
    filter === "all"
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter((a) => a.category === filter);

  const earnedCount = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id)).length;

  return (
    <div>
      {/* Progress counter */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Achievements</h3>
        <span className="text-xs text-gray-400">
          {earnedCount}/{ACHIEVEMENTS.length} Unlocked
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
              filter === cat.key
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "bg-gray-800/40 text-gray-500 border border-gray-700/30 hover:text-gray-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
        {filtered.map((achievement) => {
          const earned = earnedIds.has(achievement.id);
          const colors = TIER_COLORS[achievement.tier];
          return (
            <div
              key={achievement.id}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                earned
                  ? `bg-gray-800/30 ${colors.border}`
                  : "bg-gray-800/20 border-gray-800/30"
              }`}
            >
              <AchievementBadge
                achievement={achievement}
                earned={earned}
                size="lg"
              />
              <p
                className={`text-[11px] font-medium text-center leading-tight ${
                  earned ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {achievement.name}
              </p>
              <span
                className={`text-[11px] capitalize ${
                  earned ? colors.text : "text-gray-700"
                }`}
              >
                {achievement.tier}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
