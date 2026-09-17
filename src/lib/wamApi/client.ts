import { normalizeWamResponse } from "./errors";

const BASE_URL = import.meta.env.VITE_WAM_API_BASE_URL;
const SECRET = import.meta.env.VITE_WAM_API_SECRET;

interface WamFetchOptions {
  params?: Record<string, string | number | boolean | undefined>;
  // /api/reporte/por_juego and /api/reporte/debug_juegos only accept ?secret=, not the
  // X-API-Secret header — a real quirk in the deployed backend, not an oversight here.
  useQuerySecret?: boolean;
}

export async function wamFetch<T>(path: string, options: WamFetchOptions = {}): Promise<T> {
  if (!BASE_URL || !SECRET) {
    console.warn(
      "WAM API env vars are missing (VITE_WAM_API_BASE_URL / VITE_WAM_API_SECRET). " +
        "Copy .env.example to .env and fill in real values.",
    );
  }

  const url = new URL(path, BASE_URL || "http://localhost");
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  if (options.useQuerySecret) {
    url.searchParams.set("secret", SECRET ?? "");
  }

  const res = await fetch(url, {
    headers: options.useQuerySecret ? {} : { "X-API-Secret": SECRET ?? "" },
  });

  const body = await res.json().catch(() => null);
  return normalizeWamResponse<T>(res.status, body);
}
