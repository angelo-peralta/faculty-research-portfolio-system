import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, 'app')
const PAGES_DIR = path.join(ROOT, 'pages')
const REPORT_JSON = path.join(ROOT, 'performance-report.json')
const REPORT_MD = path.join(ROOT, 'performance-report.md')
const DEFAULT_BASE_URL = 'http://localhost:3000'
const STATIC_ASSET_RE = /\.(css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|json)$/i
const PAGE_IMPORT_RE = /import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"]/g
const require = createRequire(import.meta.url)

const publicRoutes = new Set([
  '/',
  '/login',
  '/manifest.webmanifest',
  '/onboarding',
])

const routeLabels = {
  '/': 'Root redirect',
  '/login': 'Login page',
  '/onboarding': 'Onboarding page',
  '/select-role': 'Role selector',
  '/admin/dashboard': 'Admin dashboard',
  '/admin/faculty': 'Admin faculty list',
  '/admin/faculty/[id]': 'Admin faculty detail',
  '/admin/publications': 'Admin publications list',
  '/admin/engagements': 'Admin engagements list',
  '/admin/research': 'Admin research list',
  '/admin/analytics': 'Admin analytics',
  '/admin/decision-support': 'Decision support',
  '/admin/departments': 'Departments',
  '/admin/departments/[department]': 'Department detail',
  '/admin/notifications': 'Admin notifications',
  '/admin/settings': 'Admin settings',
  '/faculty/dashboard': 'Faculty dashboard',
  '/faculty/profile': 'Faculty profile',
  '/faculty/education': 'Faculty education',
  '/faculty/publications': 'Faculty publications',
  '/faculty/engagements': 'Faculty engagements',
  '/faculty/research': 'Faculty research',
  '/faculty/research-titles': 'Faculty research titles',
  '/faculty/notifications': 'Faculty notifications',
  '/faculty/settings': 'Faculty settings',
}

function nowIso() {
  return new Date().toISOString()
}

function normalizePathForReport(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/')
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadEnvFile(fileName = '.env.local') {
  const envPath = path.join(ROOT, fileName)
  if (!(await exists(envPath))) {
    return
  }

  const text = await fs.readFile(envPath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separator = line.indexOf('=')
    if (separator === -1) {
      continue
    }

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function walk(dir) {
  if (!(await exists(dir))) {
    return []
  }

  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath))
    } else {
      files.push(fullPath)
    }
  }

  return files
}

function segmentToPathSegment(segment) {
  if (segment.startsWith('(') && segment.endsWith(')')) {
    return null
  }

  if (segment === 'page.tsx' || segment === 'page.ts' || segment === 'route.ts') {
    return null
  }

  return segment
}

function appFileToRoute(filePath) {
  const rel = path.relative(APP_DIR, filePath).split(path.sep)
  const segments = rel
    .map(segmentToPathSegment)
    .filter(Boolean)

  const last = rel.at(-1)
  if (last === 'manifest.ts') {
    return '/manifest.webmanifest'
  }

  return `/${segments.join('/')}`.replace(/\/+/g, '/') || '/'
}

function classifyVisibility(route, kind) {
  if (kind === 'api') {
    if (route === '/api/auth/microsoft' || route === '/api/version' || route === '/api/publications/lookup') {
      return 'public'
    }

    return route.startsWith('/api/') ? 'protected' : 'public'
  }

  if (publicRoutes.has(route)) {
    return 'public'
  }

  if (route.startsWith('/admin') || route.startsWith('/faculty') || route === '/select-role') {
    return 'protected'
  }

  return 'public'
}

function routeMode(route) {
  return route.includes('[') ? 'dynamic' : 'static'
}

function hasDynamicSegment(route) {
  return route.includes('[')
}

function pageKindFromFile(filePath) {
  if (filePath.endsWith('route.ts')) {
    return filePath.includes(`${path.sep}api${path.sep}`) || filePath.includes(`${path.sep}auth${path.sep}`)
      ? 'api'
      : 'route-handler'
  }

  if (filePath.endsWith('manifest.ts')) {
    return 'metadata'
  }

  return 'page'
}

async function readRelatedRouteFiles(filePath) {
  const files = [filePath]
  const dir = path.dirname(filePath)
  const pageText = await fs.readFile(filePath, 'utf8')
  const matches = [...pageText.matchAll(PAGE_IMPORT_RE)]

  for (const match of matches) {
    const importPath = match[2]
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      continue
    }

    const resolvedBase = importPath.startsWith('@/')
      ? path.join(ROOT, importPath.slice(2))
      : path.resolve(dir, importPath)
    const candidates = [
      resolvedBase,
      `${resolvedBase}.tsx`,
      `${resolvedBase}.ts`,
      path.join(resolvedBase, 'index.tsx'),
      path.join(resolvedBase, 'index.ts'),
    ]

    for (const candidate of candidates) {
      if (await exists(candidate)) {
        files.push(candidate)
        break
      }
    }
  }

  const uniqueFiles = Array.from(new Set(files))
  const contents = await Promise.all(
    uniqueFiles.map(async candidate => {
      try {
        return await fs.readFile(candidate, 'utf8')
      } catch {
        return ''
      }
    })
  )

  return contents.join('\n')
}

function inferFeatures(route, kind, content) {
  const lower = content.toLowerCase()
  const dataLoading =
    kind === 'api' ||
    /DataService|Service\.|queryRows|execute\(|transaction\(|use[A-Za-z0-9]+Query|fetchJson|request<|\.get\('/.test(content)
  const hasTablesOrLists =
    /<Table|table|DataTable|columns|items\.map|\.map\(|ListPage|pagination|page_size/.test(content) ||
    /faculty|publication|engagement|research|notification|department/.test(route)
  const hasChartsOrStats =
    /recharts|Chart|LineChart|BarChart|PieChart|AreaChart|analytics|dashboard|statistics|metrics|decision/i.test(content) ||
    /dashboard|analytics|decision-support/.test(route)
  const hasForms =
    /useForm|<form|FormField|FormItem|Input|Textarea|Select|Dialog|AlertDialog|Invite|Settings|preferences/i.test(content) ||
    /settings|login|profile|education|publications|engagements|research/.test(route)

  const likelyBlocking =
    /await\s+(AdminDataService|FacultyDataService|FacultySettingsService|getCached|NotificationService|getCurrentAppUser|requireAdmin)/.test(content)

  const suspiciousPatterns = []
  if (/Promise\.all/.test(content)) suspiciousPatterns.push('parallel data fetch')
  if (/await\s+.*DataService/.test(content)) suspiciousPatterns.push('server data wait')
  if (/listAdminUsers|settings\/bootstrap|getCachedAdminSettingsBootstrap/.test(content)) suspiciousPatterns.push('settings bootstrap')
  if (/page_size:\s*(50|100)|limit:\s*(50|100)/.test(content)) suspiciousPatterns.push('large page size')
  if (/dashboard|analytics|decision-support/.test(route)) suspiciousPatterns.push('aggregate/dashboard data')
  if (lower.includes('linechart') || lower.includes('barchart') || lower.includes('recharts')) suspiciousPatterns.push('chart rendering')

  return {
    dataLoading,
    hasTablesOrLists,
    hasChartsOrStats,
    hasForms,
    likelyBlocking,
    suspiciousPatterns,
  }
}

async function discoverRoutes() {
  const files = await walk(APP_DIR)
  const pagesFiles = await walk(PAGES_DIR)
  const appRoutes = []

  for (const filePath of files) {
    const fileName = path.basename(filePath)
    const isRouteFile = ['page.tsx', 'page.ts', 'route.ts', 'manifest.ts'].includes(fileName)
    if (!isRouteFile) {
      continue
    }

    const kind = pageKindFromFile(filePath)
    const route = appFileToRoute(filePath)
    const content = await readRelatedRouteFiles(filePath)
    const features = inferFeatures(route, kind, content)
    appRoutes.push({
      route,
      label: routeLabels[route] ?? '',
      filePath: normalizePathForReport(filePath),
      kind,
      visibility: classifyVisibility(route, kind),
      dataLoading: features.dataLoading,
      hasTablesOrLists: features.hasTablesOrLists,
      hasChartsOrStats: features.hasChartsOrStats,
      hasForms: features.hasForms,
      dynamic: routeMode(route),
      requiresSampleData: hasDynamicSegment(route),
      likelyBlocking: features.likelyBlocking,
      suspiciousPatterns: features.suspiciousPatterns,
    })
  }

  const pageRoutes = appRoutes
    .filter(route => route.kind === 'page' || route.kind === 'metadata')
    .sort((a, b) => a.route.localeCompare(b.route))
  const apiRoutes = appRoutes
    .filter(route => route.kind === 'api' || route.kind === 'route-handler')
    .sort((a, b) => a.route.localeCompare(b.route))

  return {
    pageRoutes,
    apiRoutes,
    pagesDirectoryPresent: pagesFiles.length > 0,
  }
}

async function getMysqlSamples() {
  const samples = {
    facultyId: null,
    facultyName: null,
    department: null,
    source: 'not checked',
    error: null,
  }

  if (!process.env.DATABASE_URL) {
    samples.source = 'missing DATABASE_URL'
    return samples
  }

  try {
    const mysql = await import('mysql2/promise')
    const connection = await mysql.createConnection(process.env.DATABASE_URL)

    try {
      const [facultyRows] = await connection.query(`
        SELECT u.id, u.name
        FROM users AS u
        INNER JOIN user_role_assignments AS ura ON ura.user_id = u.id
        WHERE ura.role = 'faculty'
        ORDER BY u.name ASC
        LIMIT 1
      `)

      if (facultyRows[0]) {
        samples.facultyId = facultyRows[0].id
        samples.facultyName = facultyRows[0].name
      }
    } catch (error) {
      samples.error = `faculty sample failed: ${error.message}`
    }

    try {
      const [departmentRows] = await connection.query(`
        SELECT department, COUNT(*) AS count
        FROM faculty_profiles
        WHERE department IS NOT NULL
        GROUP BY department
        ORDER BY count DESC, department ASC
        LIMIT 1
      `)

      if (departmentRows[0]) {
        samples.department = departmentRows[0].department
      }
    } catch (error) {
      samples.error = samples.error ?? `department sample failed: ${error.message}`
    }

    await connection.end()
    samples.source = 'mysql'
  } catch (error) {
    samples.source = 'mysql failed'
    samples.error = error.message
  }

  return samples
}

function materializeRoute(route, samples) {
  if (route === '/admin/faculty/[id]' && samples.facultyId) {
    return {
      testRoute: `/admin/faculty/${encodeURIComponent(samples.facultyId)}`,
      sampleNote: `faculty user: ${samples.facultyName ?? samples.facultyId}`,
    }
  }

  if (route === '/admin/departments/[department]' && samples.department) {
    return {
      testRoute: `/admin/departments/${encodeURIComponent(samples.department)}`,
      sampleNote: `department: ${samples.department}`,
    }
  }

  if (hasDynamicSegment(route)) {
    return {
      testRoute: null,
      sampleNote: 'not testable: missing sample data or unsupported dynamic route pattern',
    }
  }

  return {
    testRoute: route,
    sampleNote: '',
  }
}

function getResponseRequestTiming(request) {
  try {
    const timing = request.timing()
    if (!timing || timing.responseEnd < 0) {
      return null
    }

    return Math.round(timing.responseEnd - timing.startTime)
  } catch {
    return null
  }
}

async function collectBrowserTiming(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map(entry => [entry.name, Math.round(entry.startTime)])
    )
    const resources = performance.getEntriesByType('resource')
    const transferSize = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)

    return {
      navigation: nav
        ? {
            name: nav.name,
            duration: Math.round(nav.duration),
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
            loadEventEnd: Math.round(nav.loadEventEnd),
            responseEnd: Math.round(nav.responseEnd),
            transferSize: nav.transferSize || 0,
          }
        : null,
      paints,
      transferSize,
      resourceCount: resources.length,
      resources: resources.map(entry => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize || 0,
      })),
    }
  }).catch(() => ({
    navigation: null,
    paints: {},
    transferSize: 0,
    resourceCount: 0,
    resources: [],
  }))
}

async function waitForMainContent(page) {
  const start = Date.now()
  try {
    await page.locator('main, [role="main"], h1, h2, form, button, section, [data-slot="card"]').first().waitFor({
      state: 'visible',
      timeout: 2_500,
    })

    return Date.now() - start
  } catch {
    try {
      await page.locator('body').waitFor({ state: 'visible', timeout: 500 })
      return Date.now() - start
    } catch {
      return null
    }
  }
}

async function measureLoad(browser, baseUrl, routeInfo, runLabel, storageStatePath) {
  const contextOptions = {
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  }

  if (storageStatePath && await exists(storageStatePath)) {
    contextOptions.storageState = storageStatePath
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const requests = []
  const failedRequests = []
  const consoleErrors = []

  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    })
  })
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText ?? 'request failed',
    })
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  const responses = []
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      timingMs: getResponseRequestTiming(response.request()),
      contentLength: Number(response.headers()['content-length'] ?? 0),
    })
  })

  const url = new URL(routeInfo.testRoute, baseUrl).toString()
  const startedAt = Date.now()
  let response = null
  let error = null
  let networkIdleReached = false
  let contentVisibleMs = null

  try {
    response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 35_000,
    })
    const contentType = response?.headers()['content-type'] ?? ''
    if (contentType.includes('text/html')) {
      contentVisibleMs = await waitForMainContent(page)
    }
    try {
      await page.waitForLoadState('networkidle', { timeout: 6_000 })
      networkIdleReached = true
    } catch {
      networkIdleReached = false
    }
  } catch (loadError) {
    error = loadError.message
  }

  const totalMs = Date.now() - startedAt
  const timing = await collectBrowserTiming(page)
  const finalUrl = page.url()
  const apiResponses = responses.filter(item => new URL(item.url).pathname.startsWith('/api/'))
  const timedResources = [
    timing.navigation
      ? {
          url,
          method: 'GET',
          resourceType: 'document',
          timingMs: timing.navigation.duration,
          contentLength: timing.navigation.transferSize,
        }
      : null,
    ...timing.resources.map(resource => ({
      url: resource.name,
      method: 'GET',
      resourceType: resource.initiatorType,
      timingMs: resource.duration,
      contentLength: resource.transferSize,
    })),
  ].filter(Boolean)
  const nonStaticResponses = timedResources.filter(item => {
    const pathname = new URL(item.url).pathname
    return !STATIC_ASSET_RE.test(pathname)
  })
  const timedApiResponses = timedResources.filter(item => new URL(item.url).pathname.startsWith('/api/'))
  const slowestRequest = [...nonStaticResponses]
    .sort((a, b) => (b.timingMs ?? 0) - (a.timingMs ?? 0))[0] ?? null
  const slowestApiRequest = [...timedApiResponses, ...apiResponses]
    .sort((a, b) => (b.timingMs ?? 0) - (a.timingMs ?? 0))[0] ?? null
  const unauthenticatedProtectedRun = routeInfo.visibility === 'protected' && !storageStatePath
  const redirectedToLogin = routeInfo.visibility === 'protected' && new URL(finalUrl).pathname === '/login'

  await context.close()

  return {
    runLabel,
    route: routeInfo.route,
    testRoute: routeInfo.testRoute,
    url,
    finalUrl,
    httpStatus: response?.status() ?? null,
    redirectedToLogin,
    authBlocked: redirectedToLogin || unauthenticatedProtectedRun,
    totalMs,
    contentVisibleMs,
    networkIdleReached,
    requestCount: requests.length,
    responseCount: responses.length,
    apiRequestCount: apiResponses.length,
    failedRequests,
    consoleErrors,
    slowestRequest,
    slowestApiRequest,
    browserTiming: timing,
    error,
  }
}

async function measureClientNavigation(browser, baseUrl, sourceRoute, targetRoute, storageStatePath) {
  if (!sourceRoute?.testRoute || !targetRoute?.testRoute) {
    return null
  }

  const contextOptions = {
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  }

  if (storageStatePath && await exists(storageStatePath)) {
    contextOptions.storageState = storageStatePath
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const failedRequests = []
  const consoleErrors = []
  const responses = []

  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText ?? 'request failed',
    })
  })
  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      timingMs: getResponseRequestTiming(response.request()),
      contentLength: Number(response.headers()['content-length'] ?? 0),
    })
  })

  try {
    await page.goto(new URL(sourceRoute.testRoute, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    const targetPath = targetRoute.testRoute
    const link = page.locator(`a[href="${targetPath}"], a[href^="${targetPath}?"]`).first()
    if (await link.count() === 0) {
      await context.close()
      return {
        from: sourceRoute.testRoute,
        to: targetRoute.testRoute,
        status: 'not measured',
        reason: 'no visible matching link',
      }
    }

    const startedAt = Date.now()
    await Promise.all([
      page.waitForURL(url => url.pathname === targetPath, { timeout: 20_000 }).catch(() => undefined),
      link.click(),
    ])
    const mainMs = await waitForMainContent(page)
    try {
      await page.waitForLoadState('networkidle', { timeout: 5_000 })
    } catch {
      // Network idle is useful but not required for client navigation timing.
    }

    const totalMs = Date.now() - startedAt
    const apiResponses = responses.filter(item => new URL(item.url).pathname.startsWith('/api/'))
    const slowestApiRequest = [...apiResponses]
      .sort((a, b) => (b.timingMs ?? 0) - (a.timingMs ?? 0))[0] ?? null

    await context.close()
    return {
      from: sourceRoute.testRoute,
      to: targetRoute.testRoute,
      status: 'measured',
      totalMs,
      contentVisibleMs: mainMs,
      failedRequests,
      consoleErrors,
      slowestApiRequest,
    }
  } catch (error) {
    await context.close()
    return {
      from: sourceRoute.testRoute,
      to: targetRoute.testRoute,
      status: 'failed',
      error: error.message,
      failedRequests,
      consoleErrors,
    }
  }
}

function summarizeRuns(routeInfo, cold, warm, clientNavigation) {
  const status =
    !routeInfo.testRoute
      ? 'not testable'
      : cold.authBlocked
        ? 'auth blocked'
        : cold.error
          ? 'failed'
          : 'tested'

  return {
    route: routeInfo.route,
    testRoute: routeInfo.testRoute,
    filePath: routeInfo.filePath,
    visibility: routeInfo.visibility,
    dataLoading: routeInfo.dataLoading,
    dynamic: routeInfo.dynamic,
    requiresSampleData: routeInfo.requiresSampleData,
    sampleNote: routeInfo.sampleNote,
    coldLoadMs: cold?.totalMs ?? null,
    warmLoadMs: warm?.totalMs ?? null,
    coldContentVisibleMs: cold?.contentVisibleMs ?? null,
    warmContentVisibleMs: warm?.contentVisibleMs ?? null,
    clientNavigationMs: clientNavigation?.totalMs ?? null,
    requestCount: cold?.requestCount ?? null,
    apiRequestCount: cold?.apiRequestCount ?? null,
    slowestRequest: cold?.slowestRequest ?? null,
    slowestApiRequest: cold?.slowestApiRequest ?? null,
    consoleErrors: Array.from(new Set([...(cold?.consoleErrors ?? []), ...(warm?.consoleErrors ?? [])])),
    failedRequests: [...(cold?.failedRequests ?? []), ...(warm?.failedRequests ?? [])],
    status,
    finalUrl: cold?.finalUrl ?? null,
    notes: [
      routeInfo.likelyBlocking ? 'code scan: route may block render on server data' : null,
      routeInfo.suspiciousPatterns.length ? `code scan: ${routeInfo.suspiciousPatterns.join(', ')}` : null,
      cold?.authBlocked ? 'measurement: redirected to /login without authenticated browser session' : null,
      cold?.error ? `measurement error: ${cold.error}` : null,
    ].filter(Boolean),
  }
}

function formatMs(value) {
  return typeof value === 'number' ? `${Math.round(value)} ms` : 'N/A'
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' |')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(cell => String(cell ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n')
}

function slowestName(request) {
  if (!request) {
    return 'N/A'
  }

  const url = new URL(request.url)
  return `${request.method} ${url.pathname} (${formatMs(request.timingMs)})`
}

function buildMarkdownReport(report) {
  const pageRows = report.routeInventory.pageRoutes.map(route => [
    route.route,
    route.filePath,
    route.visibility,
    route.dataLoading ? 'yes' : 'no',
    route.dynamic,
    route.tested ?? 'pending',
    route.notes?.join('; ') ?? '',
  ])

  const resultRows = report.pageResults.map(result => [
    result.route,
    formatMs(result.coldLoadMs),
    formatMs(result.warmLoadMs),
    formatMs(result.clientNavigationMs),
    result.requestCount ?? 'N/A',
    slowestName(result.slowestRequest),
    result.consoleErrors.length,
    result.status,
  ])

  const slowestRows = report.pageResults
    .filter(result => result.status === 'tested')
    .sort((a, b) => (b.coldLoadMs ?? 0) - (a.coldLoadMs ?? 0))
    .map((result, index) => [
      index + 1,
      result.route,
      formatMs(result.coldLoadMs),
      formatMs(result.warmLoadMs),
      result.notes.join('; ') || 'Measured page load',
      slowestName(result.slowestApiRequest),
    ])

  const apiRows = report.apiFindings.map(item => [
    item.pageRoute,
    item.apiRoute,
    formatMs(item.responseTimeMs),
    item.problem,
    item.recommendedFix,
  ])

  const priorityRows = report.priorityOptimizations.map(item => [
    item.priority,
    item.filePath,
    item.route,
    item.problem,
    item.recommendedFix,
    item.expectedImprovement,
    item.risk,
  ])

  return `# Performance Baseline Report

## A. Test Environment

- Date/time: ${report.environment.testedAt}
- Machine/environment: ${report.environment.platform} ${report.environment.arch}, Node ${report.environment.nodeVersion}
- Mode tested: ${report.environment.mode}
- Browser: ${report.environment.browser}
- Database: ${report.environment.database}
- Authentication status: ${report.environment.authentication}
- Base URL: ${report.environment.baseUrl}
- Limitations: ${report.environment.limitations.join('; ')}

## B. Route Inventory

${markdownTable(['Route', 'File path', 'Public/protected', 'Data loading', 'Dynamic/static', 'Tested?', 'Notes'], pageRows)}

## API Route Inventory

${markdownTable(['Route', 'File path', 'Public/protected', 'Data loading', 'Dynamic/static', 'Notes'], report.routeInventory.apiRoutes.map(route => [
  route.route,
  route.filePath,
  route.visibility,
  route.dataLoading ? 'yes' : 'no',
  route.dynamic,
  route.suspiciousPatterns.join('; '),
]))}

## C. Page Speed Results

${markdownTable(['Route', 'Cold load', 'Warm load', 'Client navigation', 'Requests', 'Slowest request', 'Console errors', 'Status'], resultRows)}

## D. Slowest Pages Ranked

${slowestRows.length ? markdownTable(['Rank', 'Route', 'Cold load', 'Warm load', 'Main suspected cause', 'Blocking/API call'], slowestRows) : 'No protected application pages were fully testable without authentication. Public/redirect pages are listed above.'}

## E. Navigation Performance Issues

${report.navigationIssues.map(issue => `- ${issue}`).join('\n') || '- No client-side navigation issues could be confirmed without an authenticated session.'}

## F. API And Data Loading Issues

${apiRows.length ? markdownTable(['Page route', 'API route', 'Response time', 'Problem', 'Recommended fix'], apiRows) : 'No slow authenticated API calls were measurable without an authenticated session. Code scan findings are reflected in the priority list.'}

## G. Frontend Loading Issues

${report.frontendIssues.map(issue => `- ${issue}`).join('\n') || '- No frontend loading issue was confirmed by measurement.'}

## H. Priority Optimization List

${markdownTable(['Priority', 'File path', 'Route affected', 'Problem', 'Recommended fix', 'Expected improvement', 'Risk'], priorityRows)}

## I. Performance Baseline Summary

- Fastest tested page: ${report.summary.fastestPage}
- Slowest tested page: ${report.summary.slowestPage}
- Average cold load: ${formatMs(report.summary.averageColdLoadMs)}
- Average warm load: ${formatMs(report.summary.averageWarmLoadMs)}
- Average navigation time: ${formatMs(report.summary.averageNavigationMs)}
- Most common bottleneck: ${report.summary.mostCommonBottleneck}
- Biggest quick win: ${report.summary.biggestQuickWin}

## J. Next Optimization Plan

1. Stage 1: Fix the slowest authenticated navigation blockers after running this same script with an authenticated storage state.
2. Stage 2: Optimize database queries and pagination for the measured slow API/page pairs.
3. Stage 3: Add or tune loading states, Suspense, and streaming where measured blank or skeleton time is high.
4. Stage 4: Reduce client bundle and heavy chart/table components where measured transfer or render cost is high.
5. Stage 5: Add caching and production hardening for repeated dashboard/settings/bootstrap reads.
`
}

function computeSummary(pageResults) {
  const tested = pageResults.filter(result => result.status === 'tested')
  const average = (values) => {
    const usable = values.filter(value => typeof value === 'number')
    if (!usable.length) return null
    return usable.reduce((sum, value) => sum + value, 0) / usable.length
  }

  const sorted = [...tested].sort((a, b) => (a.coldLoadMs ?? 0) - (b.coldLoadMs ?? 0))
  return {
    fastestPage: sorted[0] ? `${sorted[0].route} (${formatMs(sorted[0].coldLoadMs)})` : 'N/A',
    slowestPage: sorted.at(-1) ? `${sorted.at(-1).route} (${formatMs(sorted.at(-1).coldLoadMs)})` : 'N/A',
    averageColdLoadMs: average(tested.map(result => result.coldLoadMs)),
    averageWarmLoadMs: average(tested.map(result => result.warmLoadMs)),
    averageNavigationMs: average(tested.map(result => result.clientNavigationMs)),
    mostCommonBottleneck: tested.length
      ? 'Measured route timing; see slowest request column'
      : 'Authentication blocked protected pages; code scan points to server data waits on dashboard/settings/detail routes',
    biggestQuickWin: tested.length
      ? 'Optimize the slowest measured authenticated page first'
      : 'Run the benchmark with an authenticated browser storage state, then optimize the slowest confirmed route',
  }
}

function deriveFindings(pageResults, routeInventory) {
  const apiFindings = []
  const frontendIssues = []
  const navigationIssues = []
  const priorityOptimizations = []

  for (const result of pageResults) {
    if (result.slowestApiRequest?.timingMs && result.slowestApiRequest.timingMs > 500) {
      apiFindings.push({
        pageRoute: result.route,
        apiRoute: new URL(result.slowestApiRequest.url).pathname,
        responseTimeMs: result.slowestApiRequest.timingMs,
        problem: 'Slow page-load API response',
        recommendedFix: 'Inspect SQL timing, payload size, duplicate calls, and pagination for this endpoint.',
      })
    }

    if (result.status === 'auth blocked' && result.visibility === 'protected') {
      navigationIssues.push(`${result.route}: protected page redirected to /login during unauthenticated baseline; authenticated timing still needed.`)
    }

    if (result.consoleErrors.length) {
      frontendIssues.push(`${result.route}: console errors observed: ${result.consoleErrors.slice(0, 2).join(' | ')}`)
    }
  }

  const priorityRoutes = [
    '/admin/settings',
    '/admin/faculty/[id]',
    '/admin/dashboard',
    '/admin/analytics',
    '/admin/decision-support',
    '/faculty/dashboard',
    '/faculty/settings',
  ]

  for (const route of priorityRoutes) {
    const inventory = routeInventory.pageRoutes.find(item => item.route === route)
    if (!inventory) continue

    priorityOptimizations.push({
      priority: route === '/admin/settings' || route === '/admin/faculty/[id]' ? 'Priority 1' : 'Priority 2',
      filePath: inventory.filePath,
      route,
      problem: inventory.likelyBlocking
        ? 'Code scan indicates server data can block route render.'
        : 'High-value protected route likely loads dashboard/settings/detail data.',
      recommendedFix: 'Benchmark authenticated load first, then split shell render from data fetch or stream expensive sections if confirmed slow.',
      expectedImprovement: 'Faster perceived navigation; exact gain requires authenticated timing.',
      risk: route.includes('[id]') || route.includes('settings') ? 'medium' : 'low-medium',
    })
  }

  return {
    apiFindings,
    frontendIssues,
    navigationIssues,
    priorityOptimizations,
  }
}

async function main() {
  await loadEnvFile()

  const baseUrl = process.env.AUDIT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? DEFAULT_BASE_URL
  const mode = process.env.AUDIT_MODE ?? 'production-like'
  const storageStatePath = process.env.AUDIT_STORAGE_STATE
    ? path.resolve(ROOT, process.env.AUDIT_STORAGE_STATE)
    : null
  const { pageRoutes, apiRoutes, pagesDirectoryPresent } = await discoverRoutes()
  const samples = await getMysqlSamples()
  const routeInventory = {
    pageRoutes: pageRoutes.map(route => ({
      ...route,
      ...materializeRoute(route.route, samples),
    })),
    apiRoutes,
    pagesDirectoryPresent,
  }

  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    try {
      ;({ chromium } = require('playwright'))
    } catch {
      const message = [
        'Playwright is not installed in this project or exposed through NODE_PATH.',
        'Run this audit with a temporary Playwright package, for example:',
        '$pw = npx --yes --package=playwright -c "where playwright.cmd" | Select-Object -First 1',
        '$env:NODE_PATH = Split-Path (Split-Path $pw -Parent) -Parent',
        'node scripts/performance-audit.mjs',
      ].join('\n')
      console.error(message)
      process.exitCode = 1
      return
    }
  }

  const browser = await chromium.launch({ headless: true })
  const pageResults = []
  const measurableRoutes = routeInventory.pageRoutes
    .filter(route => route.kind === 'page' || route.kind === 'metadata')
    .filter(route => route.testRoute)
    .sort((a, b) => {
      if (a.visibility !== b.visibility) {
        return a.visibility === 'public' ? -1 : 1
      }

      return a.route.localeCompare(b.route)
    })

  for (const route of measurableRoutes) {
    console.log(`[audit] measuring ${route.route} -> ${route.testRoute}`)
    const cold = await measureLoad(browser, baseUrl, route, 'cold', storageStatePath)
    const warm = await measureLoad(browser, baseUrl, route, 'warm', storageStatePath)
    const sourceRoute = routeInventory.pageRoutes.find(item => item.route === '/' && item.testRoute)
    const clientNavigation =
      sourceRoute && route.visibility === 'public' && route.route !== '/'
        ? await measureClientNavigation(browser, baseUrl, sourceRoute, route, storageStatePath)
        : null
    pageResults.push(summarizeRuns(route, cold, warm, clientNavigation))
  }

  await browser.close()

  const pageResultMap = new Map(pageResults.map(result => [result.route, result]))
  for (const route of routeInventory.pageRoutes) {
    const result = pageResultMap.get(route.route)
    route.tested = result?.status ?? (route.testRoute ? 'not run' : 'not testable')
    route.notes = [
      route.sampleNote,
      route.likelyBlocking ? 'may block on server data' : null,
      route.hasTablesOrLists ? 'tables/lists' : null,
      route.hasChartsOrStats ? 'charts/stats' : null,
      route.hasForms ? 'forms' : null,
    ].filter(Boolean)
  }

  const findings = deriveFindings(pageResults, routeInventory)
  const report = {
    environment: {
      testedAt: nowIso(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      mode,
      browser: 'Playwright Chromium',
      database: samples.source === 'mysql'
        ? `MySQL via DATABASE_URL (${samples.error ? `sample warning: ${samples.error}` : 'sample lookup ok'})`
        : `MySQL sample lookup unavailable (${samples.error ?? samples.source})`,
      authentication: storageStatePath
        ? `storage state supplied: ${normalizePathForReport(storageStatePath)}`
        : 'no authenticated Playwright storage state supplied; protected pages expected to redirect to /login',
      baseUrl,
      limitations: [
        storageStatePath ? null : 'Authenticated admin/faculty pages cannot be fully timed without an authenticated browser storage state.',
        'Client-side navigation timing requires an authenticated shell with visible links; this unauthenticated run records cold/warm loads only.',
      ].filter(Boolean),
    },
    samples,
    routeInventory,
    pageResults,
    ...findings,
    summary: computeSummary(pageResults),
  }

  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`)
  await fs.writeFile(REPORT_MD, buildMarkdownReport(report))
  console.log(`[audit] wrote ${normalizePathForReport(REPORT_JSON)}`)
  console.log(`[audit] wrote ${normalizePathForReport(REPORT_MD)}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
