export type InstallGuidePlatform = 'ios' | 'android' | 'desktop' | 'unknown'
export type InstallGuideBrowser =
  | 'safari'
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'samsung-internet'
  | 'other'
export type InstallGuideAction =
  | 'native-install'
  | 'try-chrome'
  | 'manual-safari'
  | 'manual-android'
  | 'installed'
export type ManualInstallGuideKey = 'android' | 'ios'

export interface ManualInstallGuide {
  key: ManualInstallGuideKey
  label: string
  title: string
  description: string
  steps: string[]
}

export interface InstallGuide {
  platform: InstallGuidePlatform
  browser: InstallGuideBrowser
  isMobile: boolean
  manualGuideKey: ManualInstallGuideKey
  recommendedAction: InstallGuideAction
  title: string
  description: string
  steps: string[]
  primaryButtonLabel?: string
  primaryHref?: string
  detectedLabel: string
  platformLabel: string
  browserLabel: string
  currentUrl: string
}

interface GetInstallGuideOptions {
  userAgent: string
  maxTouchPoints?: number
  currentUrl: string
  canInstall: boolean
  isInstalled: boolean
}

export const INSTALL_MANUAL_GUIDES = {
  android: {
    key: 'android',
    label: 'Android',
    title: 'Install with Chrome',
    description:
      'Use Chrome on Android for the most reliable Add to Home screen or Install app flow.',
    steps: [
      'Open the FRP website in Chrome.',
      'Tap the browser menu in the top-right corner.',
      'Select Install app or Add to Home screen.',
      'Confirm to place the app on your device.',
    ],
  },
  ios: {
    key: 'ios',
    label: 'iPhone',
    title: 'Install with Safari',
    description:
      'Use Safari on iPhone or iPad to add the app to your Home Screen and launch it like a web app.',
    steps: [
      'Open the FRP website in Safari.',
      'Tap the Share button.',
      'Choose Add to Home Screen.',
      'If Safari shows an Open as Web App option, keep it enabled, then tap Add.',
    ],
  },
} satisfies Record<ManualInstallGuideKey, ManualInstallGuide>

const BROWSER_LABELS: Record<InstallGuideBrowser, string> = {
  safari: 'Safari',
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  'samsung-internet': 'Samsung Internet',
  other: 'browser',
}

const PLATFORM_LABELS: Record<InstallGuidePlatform, string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  desktop: 'Desktop',
  unknown: 'Mobile',
}

function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallGuidePlatform {
  if (/Android/i.test(userAgent)) {
    return 'android'
  }

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios'
  }

  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) {
    return 'ios'
  }

  if (/Mobi|Mobile/i.test(userAgent)) {
    return 'unknown'
  }

  return 'desktop'
}

function detectBrowser(userAgent: string): InstallGuideBrowser {
  if (/SamsungBrowser/i.test(userAgent)) {
    return 'samsung-internet'
  }

  if (/EdgA|EdgiOS|Edg\//i.test(userAgent)) {
    return 'edge'
  }

  if (/FxiOS|Firefox\//i.test(userAgent)) {
    return 'firefox'
  }

  if (/CriOS|Chrome\//i.test(userAgent) && !/Edg|SamsungBrowser|OPR|Opera/i.test(userAgent)) {
    return 'chrome'
  }

  if (
    /Safari\//i.test(userAgent) &&
    !/CriOS|Chrome|Edg|FxiOS|Firefox|OPR|Opera|SamsungBrowser/i.test(userAgent)
  ) {
    return 'safari'
  }

  return 'other'
}

function buildChromeIntentUrl(currentUrl: string) {
  try {
    const url = new URL(currentUrl)
    const scheme = url.protocol.replace(':', '') || 'https'
    const intentTarget = `${url.host}${url.pathname}${url.search}${url.hash}`

    return `intent://${intentTarget}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.toString())};end`
  } catch {
    return undefined
  }
}

function getDetectedLabel(
  platform: InstallGuidePlatform,
  browser: InstallGuideBrowser,
  isMobile: boolean
) {
  if (!isMobile) {
    return 'Desktop browser'
  }

  const platformLabel = PLATFORM_LABELS[platform]
  const browserLabel = BROWSER_LABELS[browser]

  if (browser === 'other') {
    return `Detected: ${platformLabel}`
  }

  return `Detected: ${platformLabel} in ${browserLabel}`
}

export function getInstallGuide({
  userAgent,
  maxTouchPoints = 0,
  currentUrl,
  canInstall,
  isInstalled,
}: GetInstallGuideOptions): InstallGuide {
  const platform = detectPlatform(userAgent, maxTouchPoints)
  const browser = detectBrowser(userAgent)
  const isMobile = platform === 'android' || platform === 'ios' || platform === 'unknown'
  const manualGuideKey: ManualInstallGuideKey = platform === 'ios' ? 'ios' : 'android'
  const platformLabel = PLATFORM_LABELS[platform]
  const browserLabel = BROWSER_LABELS[browser]
  const detectedLabel = getDetectedLabel(platform, browser, isMobile)

  if (isInstalled) {
    return {
      platform,
      browser,
      isMobile,
      manualGuideKey,
      recommendedAction: 'installed',
      title: 'Already installed on this device',
      description:
        'Open the Faculty Research Portfolio from your Home Screen or app list the next time you need it.',
      steps: [
        'Find Faculty Research Portfolio on your Home Screen or app list.',
        'Open it directly from there for the app-like experience.',
      ],
      detectedLabel,
      platformLabel,
      browserLabel,
      currentUrl,
    }
  }

  if (canInstall) {
    return {
      platform,
      browser,
      isMobile,
      manualGuideKey,
      recommendedAction: 'native-install',
      title: 'Install the app directly',
      description:
        'This browser is already offering the install flow, so you can save the app without switching browsers.',
      steps: [
        'Tap Install App below.',
        'Confirm the browser prompt.',
        'Open the new app from your Home Screen after the browser finishes adding it.',
      ],
      primaryButtonLabel: 'Install App',
      detectedLabel,
      platformLabel,
      browserLabel,
      currentUrl,
    }
  }

  if (platform === 'android') {
    if (browser === 'chrome') {
      return {
        platform,
        browser,
        isMobile,
        manualGuideKey: 'android',
        recommendedAction: 'manual-android',
        title: 'Install with Chrome',
        description:
          'Chrome is the preferred Android path when the install prompt is not already visible.',
        steps: INSTALL_MANUAL_GUIDES.android.steps,
        detectedLabel,
        platformLabel,
        browserLabel,
        currentUrl,
      }
    }

    return {
      platform,
      browser,
      isMobile,
      manualGuideKey: 'android',
      recommendedAction: 'try-chrome',
      title: 'Try opening this page in Chrome',
      description:
        'If this browser does not expose an install option, opening the same page in Chrome usually gives the smoothest Android install flow.',
      steps: INSTALL_MANUAL_GUIDES.android.steps,
      primaryButtonLabel: 'Try Chrome',
      primaryHref: buildChromeIntentUrl(currentUrl),
      detectedLabel,
      platformLabel,
      browserLabel,
      currentUrl,
    }
  }

  if (platform === 'ios') {
    if (browser === 'safari') {
      return {
        platform,
        browser,
        isMobile,
        manualGuideKey: 'ios',
        recommendedAction: 'manual-safari',
        title: 'Add it from Safari',
        description:
          'Safari is the clearest way to save the app to your Home Screen on iPhone or iPad.',
        steps: INSTALL_MANUAL_GUIDES.ios.steps,
        detectedLabel,
        platformLabel,
        browserLabel,
        currentUrl,
      }
    }

    return {
      platform,
      browser,
      isMobile,
      manualGuideKey: 'ios',
      recommendedAction: 'manual-safari',
      title: 'Open this page in Safari',
      description:
        'For iPhone and iPad, copy this page link, open Safari, then follow the install steps below.',
      steps: INSTALL_MANUAL_GUIDES.ios.steps,
      primaryButtonLabel: 'Copy Link',
      detectedLabel,
      platformLabel,
      browserLabel,
      currentUrl,
    }
  }

  return {
    platform,
    browser,
    isMobile,
    manualGuideKey,
    recommendedAction: 'manual-android',
    title: 'Use the guide that matches your phone',
    description:
      'We could not identify the exact mobile browser, so use the Android or iPhone steps below.',
    steps: [
      'If your browser shows an Install or Add to Home screen option, you can use it.',
      'Otherwise, switch to the Android or iPhone guide below and follow those steps.',
    ],
    detectedLabel,
    platformLabel,
    browserLabel,
    currentUrl,
  }
}
