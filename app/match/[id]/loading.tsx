export default function MatchLoading() {
  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="w-40 h-3 rounded bg-gray-800/50 shimmer mb-1.5" />
                <div className="w-24 h-3 rounded bg-gray-800/50 shimmer" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-20 h-20 rounded-full bg-gray-800/50 shimmer" />
                <div className="w-28 h-4 rounded bg-gray-800/50 shimmer" />
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-800/30 shimmer" />
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-20 h-20 rounded-full bg-gray-800/50 shimmer" />
                <div className="w-28 h-4 rounded bg-gray-800/50 shimmer" />
              </div>
            </div>
            <div className="w-48 h-3 rounded bg-gray-800/50 shimmer mx-auto mt-5" />
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-center gap-2 mb-4 mt-2">
          <div className="h-px flex-1 bg-gray-800/30" />
          <div className="w-36 h-4 rounded bg-gray-800/50 shimmer" />
          <div className="h-px flex-1 bg-gray-800/30" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card rounded-xl p-4 mb-3">
            <div className="w-48 h-4 rounded bg-gray-800/50 shimmer mb-3" />
            <div className="space-y-2">
              <div className="w-full h-12 rounded-lg bg-gray-800/30 shimmer" />
              <div className="w-full h-12 rounded-lg bg-gray-800/30 shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
