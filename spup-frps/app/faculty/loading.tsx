function LoadingLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export default function FacultyRouteLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <LoadingLine className="h-8 w-56" />
          <LoadingLine className="h-4 w-80 max-w-full" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border/70 p-4">
              <LoadingLine className="h-4 w-24" />
              <LoadingLine className="h-8 w-16" />
              <LoadingLine className="h-3 w-32" />
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-lg border border-border/70 p-4">
          <LoadingLine className="h-6 w-44" />
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingLine key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
