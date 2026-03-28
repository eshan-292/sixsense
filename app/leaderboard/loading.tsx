export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          <div className="w-48 h-9 rounded-lg bg-gray-800/50 shimmer mx-auto mb-2" />
          <div className="w-40 h-4 rounded bg-gray-800/50 shimmer mx-auto mb-6" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="card rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gray-800/50 shimmer" />
                <div className="w-7 h-7 rounded-full bg-gray-800/50 shimmer" />
                <div className="w-24 h-4 rounded bg-gray-800/50 shimmer" />
              </div>
              <div className="w-16 h-4 rounded bg-gray-800/50 shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
