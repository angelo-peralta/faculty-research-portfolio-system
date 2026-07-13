import AdminResearchPage from '@/app/admin/research/research-client'
import { readSearchParam, type BasicSearchParams } from '@/lib/search-params'

type AdminResearchRouteProps = {
  searchParams?: Promise<BasicSearchParams>
}

export default async function AdminResearchRoute({ searchParams }: AdminResearchRouteProps) {
  const initialSearch = readSearchParam(await searchParams)

  return <AdminResearchPage initialSearch={initialSearch} />
}
