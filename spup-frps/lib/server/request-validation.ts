import { type ZodType } from 'zod'
import { ApiClientError } from '@/lib/server/errors'

const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024
const MAX_MULTIPART_BODY_BYTES = 30 * 1024 * 1024

function assertBodySize(request: Request, maxBytes: number) {
  const contentLength = request.headers.get('content-length')

  if (!contentLength) {
    return
  }

  const size = Number(contentLength)

  if (Number.isFinite(size) && size > maxBytes) {
    throw new ApiClientError('Request body is too large.', 413)
  }
}

async function parseMultipartBody<T>(
  request: Request,
  schema: ZodType<T>,
  fileFieldName?: string
): Promise<{ payload: T; file: File | null }> {
  assertBodySize(request, MAX_MULTIPART_BODY_BYTES)

  const formData = await request.formData()
  const rawPayload = formData.get('payload')

  if (typeof rawPayload !== 'string') {
    throw new ApiClientError('Missing payload.')
  }

  let parsedPayload: unknown

  try {
    parsedPayload = JSON.parse(rawPayload)
  } catch {
    throw new ApiClientError('Payload must be valid JSON.')
  }

  const payload = schema.parse(parsedPayload)
  const candidateFile = fileFieldName ? formData.get(fileFieldName) : null

  return {
    payload,
    file: candidateFile instanceof File && candidateFile.size > 0 ? candidateFile : null,
  }
}

export async function parseValidatedJson<T>(request: Request, schema: ZodType<T>) {
  assertBodySize(request, MAX_JSON_BODY_BYTES)

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    throw new ApiClientError('Request body must be valid JSON.')
  }

  return schema.parse(payload)
}

export async function parseValidatedJsonOrMultipart<T>(
  request: Request,
  schema: ZodType<T>,
  fileFieldName?: string
) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    return parseMultipartBody(request, schema, fileFieldName)
  }

  const payload = await parseValidatedJson(request, schema)

  return {
    payload,
    file: null,
  }
}

export function formatZodError(error: { issues: Array<{ path: (string | number)[]; message: string }> }) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'root',
    message: issue.message,
  }))
}
