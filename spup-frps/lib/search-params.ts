export type BasicSearchParams = {
  search?: string | string[]
}

export function readSearchParam(searchParams: BasicSearchParams | undefined) {
  const value = Array.isArray(searchParams?.search) ? searchParams.search[0] : searchParams?.search

  return typeof value === 'string' ? value.trim() : ''
}
