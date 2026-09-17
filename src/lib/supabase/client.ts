import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase env vars are missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "Copy .env.example to .env and fill in real values.",
  );
}

// createClient() throws synchronously if the URL isn't well-formed, which would crash
// the whole app before any widget gets a chance to render its own error state. Fall back
// to a syntactically valid placeholder so construction always succeeds — actual requests
// then fail per-query (network error), which TanStack Query surfaces as isError on each
// widget individually, matching how a real outage should degrade.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
);
