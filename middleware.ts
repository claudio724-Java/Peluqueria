import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as Record<string, any> | null;
    const pathname = req.nextUrl.pathname;

    if (token?.role === "STAFF") {
      const allowed = pathname.startsWith("/citas") || pathname.startsWith("/api/appointments");
      if (!allowed) {
        return NextResponse.redirect(new URL("/citas", req.url));
      }
    }

    if (pathname.startsWith("/admin") && token?.role !== "MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

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
    "/api/appointments/:path*",
  ],
};
