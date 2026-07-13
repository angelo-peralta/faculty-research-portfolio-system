import { NextResponse } from 'next/server'
import { DEPARTMENTS } from '@/lib/constants'
import { requireAdminUser } from '@/lib/server/auth'
import { AdminDataService } from '@/lib/server/admin-data'
import { toErrorResponse } from '@/lib/server/http'
import type { Department } from '@/lib/types'

const VALID_EXPORT_KINDS = new Set(['faculty', 'publications', 'engagements', 'research'])
const VALID_DEPARTMENTS = new Set(DEPARTMENTS.map((department) => department.value))

export async function GET(
  request: Request,
  context: {
    params: Promise<{ kind: string }>
  }
) {
  try {
    await requireAdminUser()
    const { kind } = await context.params
    const { searchParams } = new URL(request.url)
    const requestedDepartment = searchParams.get('department')

    if (!VALID_EXPORT_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Unsupported export kind.' }, { status: 404 })
    }

    if (requestedDepartment && !VALID_DEPARTMENTS.has(requestedDepartment as Department)) {
      return NextResponse.json({ error: 'Unsupported department filter.' }, { status: 400 })
    }

    const rows = await AdminDataService.getExportRows(
      kind as 'faculty' | 'publications' | 'engagements' | 'research',
      {
        department: (requestedDepartment as Department | null) ?? null,
      }
    )
    const csv = AdminDataService.toCsv(rows)
    const filenameSuffix = requestedDepartment ? `-${requestedDepartment}` : ''

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${kind}${filenameSuffix}-export.csv"`,
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
