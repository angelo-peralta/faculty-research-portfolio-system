"use client"

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  Bell,
  Info,
  Download,
  FileArchive,
  FileJson,
  LogOut,
  Shield,
  Smartphone,
  User,
  WifiOff,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeModeSelector } from "@/components/shared/theme-mode-selector"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { TopHeader } from "@/components/layout/top-header"
import { FacultyPreferenceFieldList } from "@/components/faculty/preference-field-list"
import { usePwa } from "@/components/pwa/pwa-provider"
import { useAuth } from "@/lib/auth-context"
import {
  APP_DEVELOPER_EMAIL,
  APP_DEVELOPER_NAME,
  APP_VERSION,
} from "@/lib/app-meta"
import { getSignedOutEntryPath } from "@/lib/pwa/navigation"
import { setFacultyWorkspacePreferences, useFacultyWorkspaceQuery } from "@/lib/query/workspace"
import { ProfileService } from "@/lib/services/profile-service"
import type { UserPreferences } from "@/lib/types"

const defaultPreferences: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  deadlineReminders: true,
  systemUpdates: false,
  initial_prompt_seen_at: null,
  created_at: "",
  updated_at: "",
}

type PreferenceKey = keyof Pick<
  UserPreferences,
  "emailNotifications" | "pushNotifications" | "deadlineReminders" | "systemUpdates"
>

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const {
    hasResolvedDisplayMode,
    canInstall,
    installApp,
    isInstalled,
    isPushSubscribed,
    isPushSupported,
    notificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePwa()
  const workspaceQuery = useFacultyWorkspaceQuery(Boolean(user))
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null)
  const [isPushBusy, setIsPushBusy] = useState(false)
  const [isExporting, setIsExporting] = useState<"json" | "csv" | null>(null)
  const preferences = useMemo(
    () => workspaceQuery.data?.preferences ?? defaultPreferences,
    [workspaceQuery.data?.preferences]
  )

  const handlePreferenceToggle = async (
    key: PreferenceKey,
    checked: boolean
  ) => {
    const previousValue = preferences[key]
    setFacultyWorkspacePreferences(queryClient, {
      ...preferences,
      [key]: checked,
    })
    setSavingKey(key)

    try {
      const nextPreferences = await ProfileService.updateMyPreferences({ [key]: checked })
      setFacultyWorkspacePreferences(queryClient, nextPreferences)
      toast.success("Preference saved.")
    } catch (error) {
      setFacultyWorkspacePreferences(queryClient, {
        ...preferences,
        [key]: previousValue,
      })
      toast.error(error instanceof Error ? error.message : "Unable to save your preference.")
    } finally {
      setSavingKey(null)
    }
  }

  const handleInstall = async () => {
    const outcome = await installApp()

    if (outcome === "accepted") {
      toast.success("App installation started.")
      return
    }

    if (outcome === "dismissed") {
      toast.message("Installation was dismissed.")
      return
    }

    toast.message("Install prompt is not available on this device.")
  }

  const handlePushToggle = async () => {
    setIsPushBusy(true)

    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush()
        toast.success("Push notifications disabled for this device.")
      } else {
        await subscribeToPush()
        toast.success("Push notifications enabled for this device.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update push notifications.")
    } finally {
      setIsPushBusy(false)
    }
  }

  const handleExport = async (format: "json" | "csv") => {
    setIsExporting(format)

    try {
      if (format === "json") {
        await ProfileService.downloadMyJsonExport()
      } else {
        await ProfileService.downloadMyCsvExport()
      }

      toast.success(`Your ${format.toUpperCase()} export is downloading.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export your data.")
    } finally {
      setIsExporting(null)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace(
      getSignedOutEntryPath({
        hasResolvedDisplayMode,
        isInstalled,
      })
    )
  }

  if (workspaceQuery.isLoading && !workspaceQuery.data) {
    return (
      <div className="min-h-screen">
        <TopHeader title="Settings" subtitle="Manage your account, exports, and delivery preferences" />
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <TopHeader title="Settings" subtitle="Manage your account, exports, and delivery preferences" />

      <div className="p-6 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                  <CardDescription>Your basic account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={user?.name ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account ID</Label>
                  <Input value={user?.id ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Available Roles</Label>
                  <Input value={user?.roles.join(", ") ?? ""} disabled />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Contact a main administrator if your account details or roles need to change.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Authentication</CardTitle>
                  <CardDescription>Institutional Microsoft authentication via Microsoft Entra ID</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Password, MFA, and account recovery are managed by your institutional Microsoft account. This app does not store a local password.
              </p>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">OAuth callback configured</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign-in flows through Microsoft Entra ID and returns you to the correct workspace after login.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Appearance</CardTitle>
                  <CardDescription>Choose how the app looks on this device</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ThemeModeSelector />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <CardDescription>Saved to your account across sessions and devices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FacultyPreferenceFieldList
                preferences={preferences}
                disabledKey={savingKey}
                onToggle={(key, checked) => {
                  void handlePreferenceToggle(key, checked)
                }}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Push Delivery</CardTitle>
                  <CardDescription>Browser-level push subscription for this device</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Permission: {notificationPermission === "unsupported" ? "Unsupported" : notificationPermission}
                </Badge>
                <Badge variant={isPushSubscribed ? "default" : "secondary"}>
                  {isPushSubscribed ? "Subscribed" : "Not subscribed"}
                </Badge>
                <Badge variant="secondary">
                  {preferences.pushNotifications && preferences.systemUpdates
                    ? "Broadcasts enabled"
                    : "Broadcasts blocked by preferences"}
                </Badge>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
                Admin broadcasts are delivered only when this device is subscribed and both Push Notifications and System Updates are enabled above.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handlePushToggle()}
                  disabled={!isPushSupported || isPushBusy}
                >
                  {isPushBusy ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {isPushSubscribed ? "Disable for This Device" : "Enable for This Device"}
                </Button>
                {!isPushSupported && (
                  <Badge variant="outline" className="gap-2 px-3 py-1.5">
                    <WifiOff className="h-3.5 w-3.5" />
                    Push is unavailable in this browser or VAPID keys are not configured.
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Mobile App</CardTitle>
                  <CardDescription>Install the app and keep the last loaded portfolio data available offline</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                    <span className="text-lg font-semibold text-primary-foreground">FRP</span>
                  </div>
                  <div>
                    <p className="font-medium">Faculty Research Portfolio</p>
                    <p className="text-sm text-muted-foreground">
                      {isInstalled
                        ? "Already installed on this device"
                        : canInstall
                          ? "Install is available now"
                          : "Install prompt not currently available"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInstalled || !canInstall}
                  onClick={() => void handleInstall()}
                >
                  {isInstalled ? "Installed" : "Install"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                The PWA caches the app shell and the last successful faculty reads for offline viewing. Editing still requires a network connection.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">App Information</CardTitle>
                  <CardDescription>Current release details and support contact</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Version</p>
                  <p className="text-sm text-muted-foreground">{APP_VERSION}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Developer</p>
                  <p className="text-sm text-muted-foreground">{APP_DEVELOPER_NAME}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Contact</p>
                  <a
                    href={`mailto:${APP_DEVELOPER_EMAIL}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {APP_DEVELOPER_EMAIL}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Data Export</CardTitle>
                  <CardDescription>Download your live portfolio data in structured or spreadsheet-friendly formats</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="justify-between"
                disabled={isExporting !== null}
                onClick={() => void handleExport("json")}
              >
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Download JSON
                </span>
                {isExporting === "json" && <Spinner className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className="justify-between"
                disabled={isExporting !== null}
                onClick={() => void handleExport("csv")}
              >
                <span className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  Download CSV ZIP
                </span>
                {isExporting === "csv" && <Spinner className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>Session-level actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="gap-2" onClick={() => void handleSignOut()}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
