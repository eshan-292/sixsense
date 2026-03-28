export default function Loading() {
  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-8 text-center">
          {/* Badge skeleton */}
          <div className="inline-block w-48 h-7 rounded-full bg-gray-800/50 shimmer mb-4" />
          {/* Title skeleton */}
          <div className="w-56 h-12 rounded-lg bg-gray-800/50 shimmer mx-auto mb-3" />
          {/* Subtitle skeleton */}
          <div className="w-72 h-5 rounded bg-gray-800/50 shimmer mx-auto mb-6" />
          {/* Stats skeleton */}
          <div className="flex items-center justify-center gap-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-8 rounded bg-gray-800/50 shimmer mx-auto mb-1" />
                <div className="w-16 h-3 rounded bg-gray-800/50 shimmer mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Match card skeletons */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gray-800/30" />
          <div className="w-20 h-4 rounded bg-gray-800/50 shimmer" />
          <div className="h-px flex-1 bg-gray-800/30" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card rounded-xl p-4 mb-3"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-32 h-3 rounded bg-gray-800/50 shimmer" />
              <div className="w-16 h-5 rounded-full bg-gray-800/50 shimmer" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-800/50 shimmer" />
                <div className="w-24 h-4 rounded bg-gray-800/50 shimmer" />
              </div>
              <div className="w-8 h-5 rounded bg-gray-800/50 shimmer" />
              <div className="flex items-center gap-3">
                <div className="w-24 h-4 rounded bg-gray-800/50 shimmer" />
                <div className="w-11 h-11 rounded-full bg-gray-800/50 shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
