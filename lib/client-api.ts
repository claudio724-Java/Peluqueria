async function readError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data?.error ? String(data.error) : fallback;
  } catch {
    return fallback;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res, `GET ${path} failed`));
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, `POST ${path} failed`));
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, `PATCH ${path} failed`));
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res, `DELETE ${path} failed`));
  return (await res.json()) as T;
}