export function SkeletonGrid() {
  return (
    <div aria-hidden="true" className="border-b border-kitchen-line">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="border-t border-kitchen-line py-7 motion-safe:animate-pulse"
        >
          <div className="flex justify-between gap-6">
            <div className="w-full space-y-3">
              <div className="h-6 w-1/3 rounded-sm bg-kitchen-surface-2" />
              <div className="h-4 w-1/2 rounded-sm bg-kitchen-surface-2" />
              <div className="h-3 w-2/3 rounded-sm bg-kitchen-surface-2" />
            </div>
            <div className="h-12 w-16 shrink-0 rounded-sm bg-kitchen-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
