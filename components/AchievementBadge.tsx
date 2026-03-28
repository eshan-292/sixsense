"use client";

import { useState } from "react";
import type { Achievement, AchievementTier } from "@/lib/achievements";
import { TIER_COLORS } from "@/lib/achievements";

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  size?: "sm" | "md" | "lg";
  unlockedAt?: string | null;
}

const SIZE_MAP = {
  sm: { container: "w-6 h-6", icon: "text-xs", lock: "text-[8px]" },
  md: { container: "w-9 h-9", icon: "text-base", lock: "text-xs" },
  lg: { container: "w-12 h-12", icon: "text-xl", lock: "text-sm" },
};

export default function AchievementBadge({
  achievement,
  earned,
  size = "md",
  unlockedAt,
}: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const sizeStyles = SIZE_MAP[size];
  const colors = TIER_COLORS[achievement.tier];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip((v) => !v)}
    >
      <div
        className={`${sizeStyles.container} rounded-full flex items-center justify-center border transition-all ${
          earned
            ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
            : "bg-gray-800/40 border-gray-700/50 opacity-50 grayscale"
        }`}
      >
        {earned ? (
          <span className={sizeStyles.icon}>{achievement.icon}</span>
        ) : (
          <span className={`${sizeStyles.lock} text-gray-600`}>
            {"\u{1F512}"}
          </span>
        )}
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-center whitespace-nowrap shadow-xl">
            <p className={`text-xs font-semibold ${earned ? colors.text : "text-gray-400"}`}>
              {achievement.name}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {achievement.description}
            </p>
            {earned && unlockedAt && (
              <p className="text-[9px] text-gray-600 mt-1">
                Unlocked{" "}
                {new Date(unlockedAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
            {!earned && (
              <p className="text-[9px] text-gray-600 mt-1 italic">Locked</p>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}
