import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminSectionHeader({
  title,
  description,
  meta,
  action,
  className,
}: {
  title: string
  description: string
  meta?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {meta}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function AdminSummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  className,
}: {
  label: string
  value: string | number
  detail?: string
  icon: LucideIcon
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

export function AdminSummaryStrip({
  items,
  columnsClassName = "sm:grid-cols-2 xl:grid-cols-4",
  className,
}: {
  items: Array<{
    label: string
    value: string | number
    detail?: string
    icon: LucideIcon
  }>
  columnsClassName?: string
  className?: string
}) {
  return (
    <section className={cn("border-y border-border/60 py-4", className)}>
      <div className={cn("grid gap-5", columnsClassName)}>
        {items.map((item) => (
          <AdminSummaryMetric
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
            icon={item.icon}
          />
        ))}
      </div>
    </section>
  )
}
