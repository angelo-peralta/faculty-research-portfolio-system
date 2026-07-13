'use client'

import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

interface SignInPanelProps {
  isLoading: boolean
  isSigningIn: boolean
  onSignIn: () => Promise<void>
  variant?: 'panel' | 'compact'
}

export function SignInPanel({
  isLoading,
  isSigningIn,
  onSignIn,
  variant = 'panel',
}: SignInPanelProps) {
  const isCompact = variant === 'compact'

  return (
    <Card className="border-0 shadow-xl shadow-primary/5">
      <CardContent className="space-y-5 p-5 sm:space-y-6 sm:p-8">
        {!isCompact ? (
          <>
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Welcome Back</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Sign in with your institutional Microsoft account
              </p>
            </div>
          </>
        ) : null}

        <Button
          onClick={() => void onSignIn()}
          disabled={isLoading || isSigningIn}
          className="h-12 w-full text-sm font-medium gradient-primary transition-opacity hover:opacity-90 sm:text-base"
        >
          {isSigningIn ? (
            <>
              <Spinner className="mr-2" />
              Redirecting...
            </>
          ) : (
            <>
              <svg className="mr-3 h-5 w-5" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Sign in with Microsoft
            </>
          )}
        </Button>

        {!isCompact ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Institutional SSO Required</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-center text-xs text-muted-foreground">
            Use your SPUP Microsoft account to access this app.
          </div>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-secondary bg-secondary/50 p-4">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Secure Authentication</p>
            <p className="text-xs text-muted-foreground">
              This system uses Microsoft Entra ID. Only authorized faculty
              and staff can access the platform.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
