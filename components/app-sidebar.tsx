"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Users,
  Scissors,
  UserCog,
  Settings,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda", href: "/agenda", icon: CalendarDays },
  { name: "Citas", href: "/citas", icon: CalendarCheck },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Servicios", href: "/servicios", icon: Scissors },
  { name: "Empleados", href: "/empleados", icon: UserCog },
  { name: "Ajustes", href: "/ajustes", icon: Settings },
]

const staffNavigation = [
  { name: "Citas", href: "/citas", icon: CalendarCheck },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const isManager = role === "MANAGER"
  const isStaff = role === "STAFF"
  const navigation = isStaff
    ? staffNavigation
    : isManager
      ? [...baseNavigation, { name: "Administración", href: "/admin", icon: Shield }]
      : baseNavigation

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Scissors className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
          SalonPro
        </span>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1" role="list">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
