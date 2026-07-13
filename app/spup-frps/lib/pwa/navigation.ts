export function getSignedOutEntryPath(options: {
  hasResolvedDisplayMode: boolean
  isInstalled: boolean
}) {
  if (options.hasResolvedDisplayMode && options.isInstalled) {
    return '/login'
  }

  return '/'
}
