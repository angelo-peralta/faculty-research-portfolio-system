import AdminPublicationsPage from '@/app/admin/publications/publications-client'
import { readSearchParam, type BasicSearchParams } from '@/lib/search-params'

type AdminPublicationsRouteProps = {
  searchParams?: Promise<BasicSearchParams>
}

export default async function AdminPublicationsRoute({ searchParams }: AdminPublicationsRouteProps) {
  const initialSearch = readSearchParam(await searchParams)

  return <AdminPublicationsPage initialSearch={initialSearch} />
}
