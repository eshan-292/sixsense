"use client";

import { useEffect, useState } from "react";

export default function NextMatchCountdown({
  matchDate,
  teamA,
  teamB,
}: {
  matchDate: string;
  teamA: string;
  teamB: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(matchDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(matchDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [matchDate]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className="glass-card rounded-xl p-4 mb-4 gradient-border">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 text-center">
        Next Match — {teamA} vs {teamB}
      </p>
      <div className="flex items-center justify-center gap-3">
        <TimeBlock value={timeLeft.days} label="Days" />
        <span className="text-gray-600 text-lg font-light">:</span>
        <TimeBlock value={timeLeft.hours} label="Hrs" />
        <span className="text-gray-600 text-lg font-light">:</span>
        <TimeBlock value={timeLeft.minutes} label="Min" />
        <span className="text-gray-600 text-lg font-light">:</span>
        <TimeBlock value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center min-w-[44px]">
      <p className="text-xl sm:text-2xl font-bold font-mono text-white">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[9px] text-gray-500 uppercase">{label}</p>
    </div>
  );
}

function getTimeLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}
