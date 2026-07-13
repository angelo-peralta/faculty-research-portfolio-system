'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  UserRound,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { DEPARTMENTS } from '@/lib/constants'
import { useAdminFacultyListQuery } from '@/lib/query/admin'
import type { AdminFacultyListItem } from '@/lib/types'
import { cn } from '@/lib/utils'

type AdminSearchItem = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  keywords?: string
  mainAdminOnly?: boolean
}

const adminDestinations: AdminSearchItem[] = [
  {
    title: 'Dashboard',
    description: 'Open workspace overview and activity summaries.',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    keywords: 'home overview metrics activity',
  },
  {
    title: 'Faculty List',
    description: 'Browse accounts, invitations, roles, and readiness.',
    href: '/admin/faculty',
    icon: Users,
    keywords: 'people roster profiles invites accounts',
  },
  {
    title: 'Publications',
    description: 'Review faculty publication records and indexing.',
    href: '/admin/publications',
    icon: BookOpen,
    keywords: 'papers journals articles indexing citations',
  },
  {
    title: 'Engagements',
    description: 'Open community and external engagement records.',
    href: '/admin/engagements',
    icon: Briefcase,
    keywords: 'extension outreach trainings beneficiaries',
  },
  {
    title: 'Research',
    description: 'Review research titles, funding, and progress.',
    href: '/admin/research',
    icon: FileText,
    keywords: 'projects proposals studies funding',
  },
  {
    title: 'Analytics',
    description: 'Inspect portfolio trends and department performance.',
    href: '/admin/analytics',
    icon: BarChart3,
    keywords: 'reports charts trends performance',
  },
  {
    title: 'Compliance Analytics',
    description: 'Find readiness risks and suggested interventions.',
    href: '/admin/decision-support',
    icon: Target,
    keywords: 'decision support readiness risk compliance',
  },
  {
    title: 'Departments',
    description: 'Open department-level faculty and portfolio views.',
    href: '/admin/departments',
    icon: Building2,
    keywords: 'schools units colleges',
  },
  {
    title: 'Notifications',
    description: 'Review recent faculty and system notifications.',
    href: '/admin/notifications',
    icon: Bell,
    keywords: 'alerts updates messages activity',
  },
  {
    title: 'Settings',
    description: 'Manage admins, invites, broadcasts, and thresholds.',
    href: '/admin/settings',
    icon: Settings,
    keywords: 'configuration users preferences',
  },
]

const recordSearchTargets: AdminSearchItem[] = [
  {
    title: 'Search faculty',
    description: 'Find faculty by name, email, or department.',
    href: '/admin/faculty',
    icon: Users,
  },
  {
    title: 'Search publications',
    description: 'Find publications by title, venue, or faculty owner.',
    href: '/admin/publications',
    icon: BookOpen,
  },
  {
    title: 'Search engagements',
    description: 'Find engagements by title, organization, or faculty owner.',
    href: '/admin/engagements',
    icon: Briefcase,
  },
  {
    title: 'Search research',
    description: 'Find research by title, researcher, or faculty owner.',
    href: '/admin/research',
    icon: FileText,
  },
]

function buildSearchHref(href: string, query: string) {
  return `${href}?search=${encodeURIComponent(query)}`
}

function getDepartmentLabel(department: AdminFacultyListItem['department']) {
  if (!department) {
    return 'No department'
  }

  return DEPARTMENTS.find((item) => item.value === department)?.label ?? department
}

function SearchResultItem({
  item,
  onSelect,
  shortcut,
  value,
}: {
  item: AdminSearchItem
  onSelect: (href: string) => void
  shortcut?: string
  value?: string
}) {
  const Icon = item.icon

  return (
    <CommandItem
      value={value ?? `${item.title} ${item.description} ${item.keywords ?? ''}`}
      onSelect={() => onSelect(item.href)}
      className="gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
      </div>
      {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
    </CommandItem>
  )
}

function FacultySearchResultItem({
  faculty,
  onSelect,
}: {
  faculty: AdminFacultyListItem
  onSelect: (href: string) => void
}) {
  const title = faculty.name ?? faculty.email
  const departmentLabel = getDepartmentLabel(faculty.department)
  const statusLabel = faculty.access_status === 'inactive' ? 'Inactive' : 'Active'

  return (
    <CommandItem
      value={`${title} ${faculty.email} ${departmentLabel}`}
      onSelect={() => onSelect(`/admin/faculty/${faculty.id}`)}
      className="gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UserRound className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {departmentLabel} - {faculty.email}
        </p>
      </div>
      <CommandShortcut>{statusLabel}</CommandShortcut>
    </CommandItem>
  )
}

export function AdminGlobalSearch({ isMainAdmin }: { isMainAdmin: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const trimmedSearch = search.trim()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setDebouncedSearch('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(trimmedSearch)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [open, trimmedSearch])

  const visibleDestinations = useMemo(
    () => adminDestinations.filter((item) => !item.mainAdminOnly || isMainAdmin),
    [isMainAdmin]
  )

  const departmentItems = useMemo<AdminSearchItem[]>(
    () =>
      DEPARTMENTS.map((department) => ({
        title: department.value,
        description: department.label,
        href: `/admin/departments/${department.value}`,
        icon: Building2,
        keywords: `department school ${department.label}`,
      })),
    []
  )

  const recordSearchItems = useMemo(
    () =>
      trimmedSearch
        ? recordSearchTargets.map((item) => ({
            item: {
              ...item,
              href: buildSearchHref(item.href, trimmedSearch),
            },
            value: `${item.title} ${item.description} ${trimmedSearch}`,
          }))
        : [],
    [trimmedSearch]
  )
  const shouldSearchFaculty = open && debouncedSearch.length >= 2
  const facultySearchQuery = useAdminFacultyListQuery(
    {
      search: debouncedSearch,
      status: 'all',
      page: 1,
      page_size: 10,
    },
    shouldSearchFaculty
  )
  const facultyResults = useMemo(
    () =>
      shouldSearchFaculty
        ? (facultySearchQuery.data?.items ?? [])
            .filter((item) => item.recordType === 'user')
            .slice(0, 6)
        : [],
    [facultySearchQuery.data?.items, shouldSearchFaculty]
  )
  const isFacultySearchLoading =
    shouldSearchFaculty && facultySearchQuery.isFetching && facultyResults.length === 0

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setSearch('')
      setDebouncedSearch('')
    }
  }

  const handleSelect = (href: string) => {
    setOpen(false)
    setSearch('')
    router.push(href)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label="Open global search"
        className={cn(
          'h-10 w-full max-w-xl justify-between rounded-lg px-3 text-left shadow-none',
          'border-admin-shell-border bg-admin-shell-content text-admin-shell-muted',
          'hover:bg-admin-shell-accent hover:text-admin-shell-accent-foreground'
        )}
        onClick={() => setOpen(true)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search admin workspace...</span>
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd className="bg-admin-shell-accent text-admin-shell-muted">Ctrl</Kbd>
          <Kbd className="bg-admin-shell-accent text-admin-shell-muted">K</Kbd>
        </span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search admin workspace"
        description="Search admin pages, departments, and records."
        className="max-w-[calc(100vw-2rem)] sm:max-w-2xl"
      >
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search pages, departments, or records..."
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No results found.</CommandEmpty>

          {shouldSearchFaculty ? (
            <>
              <CommandGroup heading="Faculty Profiles">
                {isFacultySearchLoading ? (
                  <CommandItem disabled value="Searching faculty profiles" className="gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">Searching faculty profiles...</p>
                      <p className="truncate text-xs text-muted-foreground">Looking up matching faculty names.</p>
                    </div>
                  </CommandItem>
                ) : null}

                {!isFacultySearchLoading && facultySearchQuery.isError ? (
                  <CommandItem disabled value="Unable to search faculty profiles" className="gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">Unable to search faculty profiles</p>
                      <p className="truncate text-xs text-muted-foreground">Open the faculty list and try again.</p>
                    </div>
                  </CommandItem>
                ) : null}

                {!isFacultySearchLoading && !facultySearchQuery.isError && facultyResults.length === 0 ? (
                  <CommandItem disabled value="No matching faculty profiles" className="gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">No matching faculty profiles</p>
                      <p className="truncate text-xs text-muted-foreground">Try a name, email, or department.</p>
                    </div>
                  </CommandItem>
                ) : null}

                {facultyResults.map((faculty) => (
                  <FacultySearchResultItem
                    key={faculty.id}
                    faculty={faculty}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          {recordSearchItems.length > 0 ? (
            <>
              <CommandGroup heading="Search Records">
                {recordSearchItems.map(({ item, value }) => (
                  <SearchResultItem
                    key={item.title}
                    item={item}
                    value={value}
                    shortcut="Enter"
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          <CommandGroup heading="Pages">
            {visibleDestinations.map((item) => (
              <SearchResultItem key={item.href} item={item} shortcut="Open" onSelect={handleSelect} />
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Departments">
            {departmentItems.map((item) => (
              <SearchResultItem key={item.href} item={item} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
