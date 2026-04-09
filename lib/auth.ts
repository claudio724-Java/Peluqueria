import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            staffProfile: {
              select: { id: true, isActive: true },
            },
          },
        });
        if (!user || !user.isActive) return null;
        if (user.role === "STAFF" && user.staffProfile && !user.staffProfile.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          salonId: user.salonId ?? null,
          role: user.role,
          staffId: user.staffProfile?.id ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.salonId = (user as any).salonId;
        token.role = (user as any).role;
        token.staffId = (user as any).staffId;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user.id = token.uid;
      (session as any).user.salonId = token.salonId;
      (session as any).user.role = token.role;
      (session as any).user.staffId = token.staffId;
      return session;
    },
  },
};
