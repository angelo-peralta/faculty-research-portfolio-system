function LoadingLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-admin-shell-border/70 ${className}`} />
}

export default function AdminRouteLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <LoadingLine className="h-8 w-56" />
          <LoadingLine className="h-4 w-80 max-w-full" />
        </div>
        <LoadingLine className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-2 gap-5 border-y border-admin-shell-border/70 py-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <LoadingLine className="h-3 w-24" />
            <LoadingLine className="h-8 w-16" />
            <LoadingLine className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 border-y border-admin-shell-border/70 py-4 lg:flex-row">
          <LoadingLine className="h-10 flex-1" />
          <div className="flex flex-wrap gap-2">
            <LoadingLine className="h-10 w-40" />
            <LoadingLine className="h-10 w-32" />
          </div>
        </div>

        <div className="space-y-3 border-y border-admin-shell-border/70 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingLine key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
