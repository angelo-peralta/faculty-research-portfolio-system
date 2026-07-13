import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shimContents = `export type {
  AppRouteHandlerRoutes,
  AppRoutes,
  LayoutRoutes,
  ParamMap,
} from './routes'
`

for (const relativeDir of ['.next/types', '.next/dev/types']) {
  const routesDeclarationPath = join(process.cwd(), relativeDir, 'routes.d.ts')

  if (!existsSync(routesDeclarationPath)) {
    continue
  }

  const routesShimPath = join(process.cwd(), relativeDir, 'routes.js.d.ts')
  writeFileSync(routesShimPath, shimContents)
}

const tsconfigPath = join(process.cwd(), 'tsconfig.json')

if (existsSync(tsconfigPath)) {
  const rawTsconfig = readFileSync(tsconfigPath, 'utf8')
  const parsedTsconfig = JSON.parse(rawTsconfig)

  if (Array.isArray(parsedTsconfig.include)) {
    parsedTsconfig.include = parsedTsconfig.include.filter(
      (entry) => entry !== '.next/dev/types/**/*.ts'
    )
    writeFileSync(tsconfigPath, `${JSON.stringify(parsedTsconfig, null, 2)}\n`)
  }
}
