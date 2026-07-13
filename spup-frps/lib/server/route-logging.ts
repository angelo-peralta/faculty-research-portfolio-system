type RouteLogValue = string | number | boolean | null | undefined

type RouteLogShape = {
  level: 'info' | 'error'
  msg: string
  route: string
  requestId?: string | null
  ms: number
  error?: string
} & Record<string, RouteLogValue>

type RouteLogArgs = {
  msg: string
  route: string
  requestId?: string | null
  ms: number
} & Record<string, RouteLogValue>

function emitLog(payload: RouteLogShape) {
  console[payload.level === 'error' ? 'error' : 'log'](JSON.stringify({
    ...payload,
    requestId: payload.requestId ?? null,
    region: process.env.VERCEL_REGION ?? 'local',
  }))
}

export function getRequestId(request: Request) {
  return request.headers.get('x-vercel-id')
}

export function logRouteSuccess({
  msg,
  route,
  requestId,
  ms,
  ...rest
}: RouteLogArgs) {
  emitLog({
    level: 'info',
    msg,
    route,
    requestId,
    ms,
    ...rest,
  })
}

export function logRouteError(args: RouteLogArgs) {
  emitLog({
    level: 'error',
    ...args,
  })
}
