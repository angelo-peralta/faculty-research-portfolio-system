import { cn } from '@/lib/utils'

interface WorkspaceLoadingStateProps {
  fullscreen?: boolean
  className?: string
}

export function WorkspaceLoadingState({
  fullscreen = false,
  className,
}: WorkspaceLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background',
        fullscreen ? 'h-screen' : 'min-h-[50vh]',
        className
      )}
    >
      <div className="w-full max-w-32">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}

export const AdminLoadingState = WorkspaceLoadingState
