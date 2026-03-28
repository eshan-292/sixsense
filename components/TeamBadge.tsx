"use client";

import { getTeamColor, getTeamLogo } from "@/lib/utils";
import { useState } from "react";

export default function TeamBadge({
  shortName,
  size = "md",
}: {
  shortName: string;
  size?: "sm" | "md" | "lg";
}) {
  const logo = getTeamLogo(shortName);
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-[11px]",
    lg: "w-14 h-14 text-xs",
  };

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={shortName}
        className={`${sizeClasses[size]} rounded-full object-cover bg-[#1a2332]`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${getTeamColor(shortName)} flex items-center justify-center font-bold team-badge shrink-0`}
    >
      {shortName}
    </div>
  );
}
