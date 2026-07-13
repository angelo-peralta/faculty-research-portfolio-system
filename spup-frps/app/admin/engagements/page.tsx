import AdminEngagementsPage from '@/app/admin/engagements/engagements-client'
import { readSearchParam, type BasicSearchParams } from '@/lib/search-params'

type AdminEngagementsRouteProps = {
  searchParams?: Promise<BasicSearchParams>
}

export default async function AdminEngagementsRoute({ searchParams }: AdminEngagementsRouteProps) {
  const initialSearch = readSearchParam(await searchParams)

  return <AdminEngagementsPage initialSearch={initialSearch} />
}
