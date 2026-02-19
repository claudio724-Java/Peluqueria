import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), { status: 401 }) };
  }
  return { session, response: null };
}
