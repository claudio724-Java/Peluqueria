import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export default function middleware(req: NextRequest) {
  // withAuth devuelve una Response o undefined; si es undefined seguimos
  return (authMiddleware as any)(req) ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/citas/:path*",
    "/clientes/:path*",
    "/servicios/:path*",
    "/empleados/:path*",
    "/ajustes/:path*",
    "/admin/:path*",
  ],
};