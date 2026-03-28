"use client";

import ActivityFeed from "./ActivityFeed";

export default function LiveActivitySection() {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
        <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live Predictions
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-green-500/50 to-transparent" />
      </div>
      <ActivityFeed />
    </section>
  );
}
