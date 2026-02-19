export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/agenda/:path*", "/citas/:path*", "/clientes/:path*", "/servicios/:path*", "/empleados/:path*", "/ajustes/:path*"],
};
