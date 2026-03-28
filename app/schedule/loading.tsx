export default function ScheduleLoading() {
  return (
    <div className="min-h-screen">
      <div >
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-4 text-center">
          <div className="w-64 h-9 rounded-lg bg-gray-800/50 shimmer mx-auto mb-2" />
          <div className="w-44 h-4 rounded bg-gray-800/50 shimmer mx-auto mb-4" />
          <div className="flex items-center justify-center gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-7 rounded bg-gray-800/50 shimmer mx-auto mb-1" />
                <div className="w-14 h-3 rounded bg-gray-800/50 shimmer mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pb-10">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-4">
            <div className="flex items-center justify-center my-3">
              <div className="w-40 h-3 rounded bg-gray-800/30 shimmer" />
            </div>
            <div className="card rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gray-800/50 shimmer" />
                  <div className="w-10 h-4 rounded bg-gray-800/50 shimmer" />
                </div>
                <div className="w-12 h-3 rounded bg-gray-800/50 shimmer" />
                <div className="flex items-center gap-2">
                  <div className="w-10 h-4 rounded bg-gray-800/50 shimmer" />
                  <div className="w-9 h-9 rounded-full bg-gray-800/50 shimmer" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
