import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "MANAGER") redirect("/dashboard");

  return (
    <div className="space-y-6 p-6">
      <AppHeader
        title="Administración"
        subtitle="Solo los managers pueden crear, editar, suspender o borrar cuentas."
      />
      <AdminPanel />
    </div>
  );
}
