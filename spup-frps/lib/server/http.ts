import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiAuthError } from '@/lib/server/auth'
import { ApiClientError } from '@/lib/server/errors'
import { formatZodError } from '@/lib/server/request-validation'

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof ApiClientError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed.',
        details: formatZodError(error),
      },
      { status: 400 }
    )
  }

  console.error('Unexpected API error:', error)

  return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
}
