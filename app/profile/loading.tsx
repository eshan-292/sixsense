export default function ProfileLoading() {
  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gray-800/50 shimmer mx-auto mb-3" />
          {/* Name */}
          <div className="w-36 h-6 rounded-lg bg-gray-800/50 shimmer mx-auto mb-2" />
          {/* Coins */}
          <div className="w-28 h-5 rounded bg-gray-800/50 shimmer mx-auto mb-4" />
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-7 rounded bg-gray-800/50 shimmer mx-auto mb-1" />
                <div className="w-14 h-3 rounded bg-gray-800/50 shimmer mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Daily bonus skeleton */}
        <div className="card rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="w-32 h-4 rounded bg-gray-800/50 shimmer mb-1.5" />
              <div className="w-48 h-3 rounded bg-gray-800/50 shimmer" />
            </div>
            <div className="w-24 h-9 rounded-lg bg-gray-800/50 shimmer" />
          </div>
        </div>
        {/* P&L skeleton */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card rounded-xl p-3">
            <div className="w-20 h-3 rounded bg-gray-800/50 shimmer mb-2" />
            <div className="w-16 h-6 rounded bg-gray-800/50 shimmer" />
          </div>
          <div className="card rounded-xl p-3">
            <div className="w-20 h-3 rounded bg-gray-800/50 shimmer mb-2" />
            <div className="w-16 h-6 rounded bg-gray-800/50 shimmer" />
          </div>
        </div>
        {/* Prediction history skeleton */}
        <div className="w-36 h-4 rounded bg-gray-800/50 shimmer mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card rounded-xl p-4 mb-3">
            <div className="w-40 h-4 rounded bg-gray-800/50 shimmer mb-2" />
            <div className="flex items-center justify-between">
              <div className="w-24 h-3 rounded bg-gray-800/50 shimmer" />
              <div className="w-16 h-3 rounded bg-gray-800/50 shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
