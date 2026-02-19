import { requireSession } from "@/lib/require-session";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  return Response.json({ ok: true, user: session!.user });
}
