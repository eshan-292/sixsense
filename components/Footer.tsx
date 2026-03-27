import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800/50 bg-gray-950/50 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏏</span>
            <span className="text-xs font-semibold text-gray-500">
              Six<span className="text-gray-400">Sense</span>
            </span>
            <span className="text-[10px] text-gray-700">
              &middot; IPL 2026 Predictions
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/schedule"
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Schedule
            </Link>
            <Link
              href="/leaderboard"
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/how-to-play"
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              How to Play
            </Link>
            <span className="text-[10px] text-gray-700">
              Not real gambling &middot; Virtual coins only
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
