'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function ThemeModeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )

  const selectedTheme = useMemo(() => {
    if (!mounted) {
      return ''
    }

    if (theme === 'system') {
      return resolvedTheme ?? 'light'
    }

    return theme ?? 'light'
  }, [mounted, resolvedTheme, theme])

  const helperText = useMemo(() => {
    if (!mounted) {
      return 'Loading appearance settings...'
    }

    if (theme === 'system') {
      return `Currently matching your device preference (${selectedTheme === 'dark' ? 'Dark' : 'Light'}).`
    }

    return `Using your saved ${selectedTheme === 'dark' ? 'Dark' : 'Light'} appearance on this device.`
  }, [mounted, selectedTheme, theme])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        By default, the app follows your device appearance. Choose Light or Dark here to save an
        override on this device.
      </p>
      <ToggleGroup
        type="single"
        value={selectedTheme}
        onValueChange={(value) => {
          if (value === 'light' || value === 'dark') {
            setTheme(value)
          }
        }}
        variant="outline"
        className="grid w-full grid-cols-2"
      >
        <ToggleGroupItem
          value="light"
          aria-label="Use light mode"
          className="h-11 justify-center gap-2"
          disabled={!mounted}
        >
          <Sun className="h-4 w-4" />
          Light
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dark"
          aria-label="Use dark mode"
          className="h-11 justify-center gap-2"
          disabled={!mounted}
        >
          <Moon className="h-4 w-4" />
          Dark
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  )
}
