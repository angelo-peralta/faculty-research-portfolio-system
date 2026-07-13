import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'

function createDefaultQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        gcTime: 10 * 60 * 1000,
        staleTime: 5 * 60 * 1000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export function createServerQueryClient() {
  return createDefaultQueryClient()
}

export function ServerHydrationBoundary({
  queryClient,
  children,
}: {
  queryClient: QueryClient
  children: ReactNode
}) {
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>
}
