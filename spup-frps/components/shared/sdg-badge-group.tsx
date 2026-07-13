import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SDG_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SDGBadgeGroupProps {
  sdgs?: string[]
  goals?: string[]
  maxDisplay?: number
  size?: 'sm' | 'md'
  className?: string
}

const sdgColors: Record<string, string> = {
  SDG1: 'bg-red-500',
  SDG2: 'bg-amber-600',
  SDG3: 'bg-green-500',
  SDG4: 'bg-red-600',
  SDG5: 'bg-orange-500',
  SDG6: 'bg-cyan-500',
  SDG7: 'bg-yellow-500',
  SDG8: 'bg-rose-600',
  SDG9: 'bg-orange-600',
  SDG10: 'bg-pink-500',
  SDG11: 'bg-amber-500',
  SDG12: 'bg-yellow-600',
  SDG13: 'bg-green-600',
  SDG14: 'bg-blue-500',
  SDG15: 'bg-green-700',
  SDG16: 'bg-blue-600',
  SDG17: 'bg-blue-800',
}

export function SDGBadgeGroup({
  sdgs,
  goals,
  maxDisplay = 3,
  size = 'sm',
  className,
}: SDGBadgeGroupProps) {
  const items = sdgs ?? goals ?? []

  if (items.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">No SDGs linked</span>
    )
  }

  const displayedSdgs = items.slice(0, maxDisplay)
  const remainingCount = items.length - maxDisplay

  const getSDGLabel = (sdg: string) => {
    const option = SDG_OPTIONS.find((o) => o.value === sdg)
    return option?.label || sdg
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        {displayedSdgs.map((sdg) => (
          <Tooltip key={sdg}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'text-white font-medium border-0',
                  sdgColors[sdg] || 'bg-gray-500',
                  size === 'sm' && 'text-xs px-1.5 py-0',
                  size === 'md' && 'text-xs px-2 py-0.5'
                )}
              >
                {sdg.replace('SDG', '')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getSDGLabel(sdg)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'text-muted-foreground',
                  size === 'sm' && 'text-xs px-1.5 py-0',
                  size === 'md' && 'text-xs px-2 py-0.5'
                )}
              >
                +{remainingCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {items.slice(maxDisplay).map((sdg) => (
                  <p key={sdg} className="text-xs">
                    {getSDGLabel(sdg)}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
