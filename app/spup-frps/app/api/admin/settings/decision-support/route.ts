import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireAdminUser } from '@/lib/server/auth'
import { DecisionSupportService } from '@/lib/server/decision-support'
import { toErrorResponse } from '@/lib/server/http'
import { parseValidatedJson } from '@/lib/server/request-validation'
import { decisionSupportConfigSchema } from '@/lib/validation/decision-support'

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdminUser({ mainAdminOnly: true })
    const payload = await parseValidatedJson(request, decisionSupportConfigSchema)
    const config = await DecisionSupportService.updateConfig(user.id, payload)
    revalidateTag('decision-support', 'max')
    revalidateTag('admin-dashboard', 'max')

    return NextResponse.json(config)
  } catch (error) {
    return toErrorResponse(error)
  }
}
