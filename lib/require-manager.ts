import { requireSession } from "@/lib/require-session";

export async function requireManager() {
  const { session, response } = await requireSession();
  if (response) return { session: null, response };

  const role = (session!.user as any)?.role;
  if (role !== "MANAGER") {
    return {
      session: null,
      response: new Response(JSON.stringify({ ok: false, error: "FORBIDDEN" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { session, response: null };
}
