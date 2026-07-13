'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  User,
  GraduationCap,
  BookOpen,
  Users,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'

interface MobileNavItem {
  href: string
  title: string
  icon: LucideIcon
}

const mobileNavItems: MobileNavItem[] = [
  {
    title: 'Profile',
    href: '/faculty/profile',
    icon: User,
  },
  {
    title: 'Education',
    href: '/faculty/education',
    icon: GraduationCap,
  },
  {
    title: 'Publications',
    href: '/faculty/publications',
    icon: BookOpen,
  },
  {
    title: 'Engagements',
    href: '/faculty/engagements',
    icon: Users,
  },
  {
    title: 'Research',
    href: '/faculty/research',
    icon: FlaskConical,
  },
]

interface MobileNavProps {
  items?: MobileNavItem[]
}

export function MobileNav({ items = mobileNavItems }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className={cn('text-xs', isActive && 'font-medium')}>
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
