import type { Metadata, Viewport } from 'next'
import { Inter, Source_Sans_3 } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { getConfiguredAppOrigin } from '@/lib/app-origin'
import {
  APP_DESCRIPTION,
  APP_DEVELOPER_EMAIL,
  APP_DEVELOPER_NAME,
  APP_NAME,
  APP_PUBLISHER,
  APP_SHORT_NAME,
  APP_THEME_COLOR,
  APP_THEME_COLOR_DARK,
} from '@/lib/app-meta'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const sourceSans = Source_Sans_3({ 
  subsets: ['latin'],
  variable: '--font-source-sans',
})
const enableVercelInsights = process.env.NODE_ENV === 'production'

export const metadata: Metadata = {
  metadataBase: new URL(getConfiguredAppOrigin()),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: APP_DEVELOPER_NAME, url: `mailto:${APP_DEVELOPER_EMAIL}` }],
  creator: APP_DEVELOPER_NAME,
  publisher: APP_PUBLISHER,
  keywords: [
    'SPUP',
    'faculty research portfolio',
    'research management',
    'publications',
    'academic engagements',
    'faculty reporting',
  ],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/frp-logo.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_SHORT_NAME,
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    creator: APP_DEVELOPER_NAME,
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: APP_THEME_COLOR },
    { media: '(prefers-color-scheme: dark)', color: APP_THEME_COLOR_DARK },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {process.env.NODE_ENV !== 'production' ? (
          <Script
            id="frp-dev-sw-reset"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  try {
                    if (typeof window === 'undefined') return;
                    var reloadKey = '__frp_dev_sw_reset__';
                    if (sessionStorage.getItem(reloadKey) === 'done') return;

                    Promise.all([
                      'serviceWorker' in navigator
                        ? navigator.serviceWorker.getRegistrations().then(function (registrations) {
                            return Promise.all(registrations.map(function (registration) {
                              return registration.unregister();
                            })).then(function (results) {
                              return results.some(Boolean);
                            });
                          })
                        : Promise.resolve(false),
                      'caches' in window
                        ? caches.keys().then(function (keys) {
                            var matchingKeys = keys.filter(function (key) { return key.indexOf('frp-') === 0; });

                            return Promise.all(
                              matchingKeys.map(function (key) { return caches.delete(key); })
                            ).then(function () {
                              return matchingKeys.length > 0;
                            });
                          })
                        : Promise.resolve(false)
                    ]).then(function (results) {
                      sessionStorage.setItem(reloadKey, 'done');

                      if (results.some(Boolean)) {
                        window.location.reload();
                      }
                    });
                  } catch (error) {
                    console.error('Failed to clear development service worker state:', error);
                  }
                })();
              `,
            }}
          />
        ) : null}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          enableColorScheme
          disableTransitionOnChange
          storageKey="frp-theme"
          themes={['light', 'dark', 'system']}
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
        {enableVercelInsights ? (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        ) : null}
      </body>
    </html>
  )
}
