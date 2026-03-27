import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-7xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent mb-4">
          404
        </p>
        <h1 className="text-xl font-bold text-white mb-2">
          Bowled Out!
        </h1>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          This page doesn&apos;t exist. Maybe it was a wide ball — let&apos;s
          get you back on the pitch.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-gradient-to-r from-orange-600 to-pink-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
          <Link
            href="/schedule"
            className="bg-gray-800/50 text-gray-300 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700/50"
          >
            View Schedule
          </Link>
        </div>
      </div>
    </div>
  );
}
