import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";

export const ADMIN_ROLES = ["OWNER", "MANAGER"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function canAccessAdminPanel(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as AdminRole);
}

export function isOwner(role?: string | null) {
  return role === "OWNER";
}

export async function requireAdminSession() {
  const { session, response } = await requireSession();
  if (response) {
    return { session: null, response };
  }

  const role = (session!.user as any).role as string | undefined;
  if (!canAccessAdminPanel(role)) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  return { session, response: null };
}
