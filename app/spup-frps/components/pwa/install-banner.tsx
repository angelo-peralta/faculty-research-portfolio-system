'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Download, Smartphone, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePwa } from '@/components/pwa/pwa-provider'

interface InstallBannerProps {
  variant?: 'banner' | 'card'
  className?: string
}

export function InstallBanner({ variant = 'banner', className }: InstallBannerProps) {
  const { canInstall, installApp, isInstalled } = usePwa()
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const dismissedAt = localStorage.getItem('pwa-banner-dismissed')

    if (!dismissedAt) {
      return true
    }

    return (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24) >= 7
  })

  const handleInstall = async () => {
    const outcome = await installApp()

    if (outcome === 'accepted') {
      setIsVisible(false)
    }
  }

  const handleDismiss = () => {
    const nextDismissedAt = new Date().toISOString()
    setIsVisible(false)
    localStorage.setItem('pwa-banner-dismissed', nextDismissedAt)
  }

  if (!isVisible || isInstalled || !canInstall) return null

  if (variant === 'card') {
    return (
      <Card className={cn('overflow-hidden border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5', className)}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">Install FRP App</h3>
                  <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add the Faculty Research Portfolio to this phone for faster access and offline support.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  Not Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('glass-card rounded-2xl p-4', className)}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">
            Install the FRP app?
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Add it to this phone for faster access
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Install
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
