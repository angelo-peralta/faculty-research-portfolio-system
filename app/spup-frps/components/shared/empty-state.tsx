import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode | {
    label: string
    onClick: () => void
  }
  className?: string
}

function isActionConfig(
  action: EmptyStateProps['action']
): action is { label: string; onClick: () => void } {
  return Boolean(
    action &&
    typeof action === 'object' &&
    !Array.isArray(action) &&
    'label' in action &&
    'onClick' in action
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action
        ? isActionConfig(action)
          ? (
            <Button onClick={action.onClick} className="gradient-primary">
              {action.label}
            </Button>
          )
          : action
        : null}
    </div>
  )
}
