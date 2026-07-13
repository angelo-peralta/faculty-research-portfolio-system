import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const packageMetadata = require('./package.json')
const appBuildId =
  process.env.NEXT_PUBLIC_APP_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  packageMetadata.version

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://192.168.0.208:3000'],
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

export default nextConfig
