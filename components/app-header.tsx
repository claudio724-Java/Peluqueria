"use client";

import { ChevronDown, LogOut, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { apiGet } from "@/lib/client-api";

type Salon = { id: string; name: string };

export function AppHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { data: session } = useSession();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<string>("");

  useEffect(() => {
    apiGet<{ ok: true; items: Salon[] }>("/api/salons")
      .then((d) => {
        setSalons(d.items);
        const sid = (session?.user as any)?.salonId ?? d.items[0]?.id ?? "";
        setSelectedSalon(sid);
      })
      .catch(() => {});
  }, [session?.user]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedSalon} onValueChange={setSelectedSalon}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Peluquería" />
          </SelectTrigger>
          <SelectContent>
            {salons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {action}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ChevronDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {(session?.user?.name as string) ?? "Cuenta"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/ajustes">Ajustes</Link>
            </DropdownMenuItem>
            {((session?.user as any)?.role === "OWNER" || (session?.user as any)?.role === "MANAGER") ? (
              <DropdownMenuItem asChild>
                <Link href="/admin">Administración</Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
