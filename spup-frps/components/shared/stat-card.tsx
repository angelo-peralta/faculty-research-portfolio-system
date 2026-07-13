import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'primary' | 'accent' | 'glass'
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 hover:shadow-lg',
        variant === 'glass' && 'glass-card border-white/20',
        variant === 'primary' && 'bg-primary text-primary-foreground border-primary',
        variant === 'accent' && 'bg-accent text-accent-foreground border-accent',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-medium',
                variant === 'default' && 'text-muted-foreground',
                variant === 'primary' && 'text-primary-foreground/80',
                variant === 'accent' && 'text-accent-foreground/80',
                variant === 'glass' && 'text-muted-foreground'
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                'text-3xl font-bold tracking-tight',
                variant === 'default' && 'text-foreground',
                variant === 'primary' && 'text-primary-foreground',
                variant === 'accent' && 'text-accent-foreground',
                variant === 'glass' && 'text-foreground'
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p
                className={cn(
                  'text-xs',
                  variant === 'default' && 'text-muted-foreground',
                  variant === 'primary' && 'text-primary-foreground/70',
                  variant === 'accent' && 'text-accent-foreground/70',
                  variant === 'glass' && 'text-muted-foreground'
                )}
              >
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'font-medium',
                    trend.value > 0 && 'text-green-600',
                    trend.value < 0 && 'text-red-600',
                    trend.value === 0 && 'text-muted-foreground'
                  )}
                >
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              variant === 'default' && (iconBg ?? 'bg-primary/10'),
              variant === 'primary' && 'bg-white/20',
              variant === 'accent' && 'bg-black/10',
              variant === 'glass' && 'bg-primary/10'
            )}
          >
            <Icon
              className={cn(
                'w-6 h-6',
                variant === 'default' && (iconColor ?? 'text-primary'),
                variant === 'primary' && 'text-white',
                variant === 'accent' && 'text-accent-foreground',
                variant === 'glass' && 'text-primary'
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
