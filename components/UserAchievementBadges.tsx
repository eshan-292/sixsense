"use client";

import type { Profile, Prediction, Market, Parlay } from "@/lib/types";
import { computeEarnedAchievements } from "@/lib/achievements";
import type { UserStats } from "@/lib/achievements";
import AchievementBadge from "@/components/AchievementBadge";

interface UserAchievementBadgesProps {
  profile: Profile;
  predictions: (Prediction & { market?: Market })[];
  parlays: Parlay[];
}

export default function UserAchievementBadges({
  profile,
  predictions,
  parlays,
}: UserAchievementBadgesProps) {
  const stats: UserStats = { profile, predictions, parlays };
  const results = computeEarnedAchievements(stats);
  const earned = results.filter((r) => r.earned);

  if (earned.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/30">
      <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-medium">
        Badges
      </p>
      <div className="flex flex-wrap gap-2">
        {earned.map(({ achievement }) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            earned={true}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
