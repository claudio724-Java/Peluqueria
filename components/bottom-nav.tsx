"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Users,
  Settings,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mobileNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda", href: "/agenda", icon: CalendarDays },
  { name: "Citas", href: "/citas", icon: CalendarCheck },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Ajustes", href: "/ajustes", icon: Settings },
  { name: "Admin", href: "/admin", icon: ShieldCheck, adminOnly: true },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden" role="navigation" aria-label="Navegacion principal">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNav.filter((item) => !item.adminOnly || role === "OWNER" || role === "MANAGER").map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors rounded-lg",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
