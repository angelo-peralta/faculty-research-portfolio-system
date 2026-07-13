import { NextResponse } from 'next/server'

import { APP_BUILD_ID, APP_VERSION } from '@/lib/app-meta'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function GET() {
  return NextResponse.json(
    {
      buildId: APP_BUILD_ID,
      version: APP_VERSION,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
