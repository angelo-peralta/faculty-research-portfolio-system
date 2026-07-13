import type { PublicationDoiLookupResult } from '@/lib/types'

export class PublicationLookupError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const PublicationLookupService = {
  async lookupByDoi(doi: string): Promise<PublicationDoiLookupResult> {
    const params = new URLSearchParams({ doi })
    const response = await fetch(`/api/publications/lookup?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new PublicationLookupError(response.status, body.error ?? `Request failed: ${response.status}`)
    }

    return response.json() as Promise<PublicationDoiLookupResult>
  },
}
