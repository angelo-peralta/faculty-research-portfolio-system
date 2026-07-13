import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

interface CompletionSection {
  key: string
  label: string
  completed: boolean
  href?: string
}

interface CompletionProgressProps {
  score: number
  sections: CompletionSection[]
  variant?: 'card' | 'inline'
  className?: string
}

export function CompletionProgress({
  score,
  sections,
  variant = 'card',
  className,
}: CompletionProgressProps) {
  const getScoreColor = (score: number) => {
    if (score === 100) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score === 100) return 'bg-green-500'
    if (score >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Progress
          value={score}
          className="flex-1 h-2"
          style={{
            ['--progress-background' as string]: score === 100 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444',
          }}
        />
        <span className={cn('text-sm font-medium', getScoreColor(score))}>
          {score}%
        </span>
      </div>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Profile Completion</h3>
            <p className="text-sm text-muted-foreground">
              {score === 100
                ? 'Your profile is complete!'
                : 'Complete your profile to showcase your research'}
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-3xl font-bold', getScoreColor(score))}>{score}%</p>
          </div>
        </div>

        <div className="relative pt-1">
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getProgressColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section.key}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                !section.completed && 'bg-muted/50'
              )}
            >
              {section.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm flex-1',
                  section.completed ? 'text-muted-foreground' : 'text-foreground font-medium'
                )}
              >
                {section.label}
              </span>
              {!section.completed && (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
