import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { enviarCorreoOtp } from "@/lib/emailjs";
import { ROLES, type CurrentUser, type Rol } from "./types";

const SESSION_KEY = "terminalos_v2_session";
const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3h — matches v1's own session timeout

interface StoredSession {
  user: CurrentUser;
  ts: number;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  isReady: boolean; // false while restoring a session from localStorage
  // Step 1: verify usuario/password. On success this does NOT log the user in yet — it
  // also issues a fresh 2FA code (server-side, see verify_login()'s SQL) and emails it,
  // returning the pending user for the caller to hold onto until verifyOtp() succeeds.
  login: (usuario: string, password: string) => Promise<{ ok: true; user: CurrentUser } | { ok: false; error: string }>;
  // Re-runs step 1 to issue a brand-new code — deliberately re-checks the password
  // rather than trusting a client-held "pending" flag, so every code the server ever
  // hands out is still gated behind a real credential check (see project memory: the
  // first draft of this RPC handed back a code to anyone who merely knew a real
  // usuario_id, with no password check at all — fixed before it ever shipped).
  resendOtp: (usuario: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  // Step 2: verify the 6-digit code: finalizes the session only on a real match.
  verifyOtp: (user: CurrentUser, code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { user, ts } = JSON.parse(raw) as StoredSession;
    if (Date.now() - ts > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(user: CurrentUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, ts: Date.now() } satisfies StoredSession));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setCurrentUser(readSession());
    setIsReady(true);
  }, []);

  // v1's doLogin() (index.html ~line 2896) compares usuario/password directly from the
  // browser via a plain SELECT — the same query V2 used until 2026-09-14, which sent
  // the password in plaintext as a URL filter on every attempt and required
  // usuarios_sistema.password to stay openly readable by anon (same exposure agencias/
  // accesos_wam had before their own lockdowns). Replaced with a SECURITY DEFINER
  // Postgres RPC that does the comparison server-side and returns only the safe fields
  // — see project memory for the SQL. Since 2026-09-17 the same RPC also issues a fresh
  // 2FA code as an atomic side effect of a successful password check (never as a
  // separate, unauthenticated step — see the AuthContextValue comment on resendOtp for
  // why that matters). Returns jsonb (a single object, or null on no match) rather than
  // a typed table, since supabase-js can't otherwise know the shape at compile time.
  async function verificarCredenciales(usuario: string, password: string) {
    const { data, error } = await supabase.rpc("verify_login", {
      p_usuario: usuario,
      p_password: password,
    });

    if (error) return { ok: false, error: error.message } as const;
    if (!data) return { ok: false, error: "Usuario o contraseña incorrectos." } as const;
    if (!ROLES.includes(data.rol as Rol)) {
      return { ok: false, error: `Rol desconocido: ${data.rol}` } as const;
    }
    if (!data.email) {
      return {
        ok: false,
        error: "Esta cuenta no tiene un correo registrado — no se puede enviar el código de verificación. Pide a un administrador que agregue uno.",
      } as const;
    }

    const user: CurrentUser = {
      id: data.id,
      usuario: data.usuario,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol as Rol,
      empresas: data.empresas ?? [],
    };

    try {
      await enviarCorreoOtp({ nombre: user.nombre, correo: user.email!, codigo: data.otp_code });
    } catch (emailError) {
      console.error("No se pudo enviar el código de verificación:", emailError);
      return { ok: false, error: "No se pudo enviar el código de verificación por correo. Intenta de nuevo." } as const;
    }

    return { ok: true, user } as const;
  }

  async function login(usuario: string, password: string) {
    return verificarCredenciales(usuario, password);
  }

  async function resendOtp(usuario: string, password: string) {
    const result = await verificarCredenciales(usuario, password);
    return result.ok ? ({ ok: true } as const) : result;
  }

  async function verifyOtp(user: CurrentUser, code: string) {
    const { data, error } = await supabase.rpc("verify_login_otp", {
      p_usuario_id: user.id,
      p_code: code.trim(),
    });
    if (error) return { ok: false, error: error.message } as const;
    if (!data) return { ok: false, error: "Código incorrecto o expirado." } as const;

    writeSession(user);
    setCurrentUser(user);
    return { ok: true } as const;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, isReady, login, resendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
