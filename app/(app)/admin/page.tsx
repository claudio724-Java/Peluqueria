import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { UsersAdminClient } from "@/components/admin/users-admin-client";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel, isOwner } from "@/lib/permissions";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (!canAccessAdminPanel(role)) {
    redirect("/dashboard");
  }

  return <UsersAdminClient canAssignOwner={isOwner(role)} />;
}
