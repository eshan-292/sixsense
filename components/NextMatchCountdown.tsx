"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NextMatchCountdown({
  matchDate,
  matchId,
  teamA,
  teamB,
}: {
  matchDate: string;
  matchId?: string;
  teamA: string;
  teamB: string;
}) {
  const [timeStr, setTimeStr] = useState(() => formatTimeLeft(matchDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStr(formatTimeLeft(matchDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [matchDate]);

  if (!timeStr) return null;

  const inner = (
    <div className="flex items-center justify-between bg-[#e63946]/10 border border-[#e63946]/20 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#e63946] animate-pulse" />
        <span className="text-sm text-white font-medium">
          {teamA} vs {teamB}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-[#e63946] font-mono">{timeStr}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );

  if (matchId) {
    return <Link href={`/match/${matchId}`}>{inner}</Link>;
  }
  return inner;
}

function formatTimeLeft(date: string): string | null {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
