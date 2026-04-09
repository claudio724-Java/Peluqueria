import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      salonId?: string | null;
      role?: string;
      staffId?: string | null;
    };
  }
}
