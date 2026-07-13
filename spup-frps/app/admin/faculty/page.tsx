import AdminFacultyListPage from '@/app/admin/faculty/faculty-list-client'
import { readSearchParam, type BasicSearchParams } from '@/lib/search-params'

type AdminFacultyListRouteProps = {
  searchParams?: Promise<BasicSearchParams>
}

export default async function AdminFacultyListRoute({ searchParams }: AdminFacultyListRouteProps) {
  const initialSearch = readSearchParam(await searchParams)

  return <AdminFacultyListPage initialSearch={initialSearch} />
}
