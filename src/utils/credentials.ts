// Ported from v1's genAutoUser()/genAutoPass() (index.html ~line 2835-2852). v1 also
// loops to avoid colliding with an already-loaded usuario/password. `usuario` is actually
// readable on every one of these tables (agencias/accesos_wam/usuarios_sistema — only
// `password` stays DB-blocked, and only on agencias/accesos_wam... except accesos_wam's
// password was later reversed to be readable too, see useAccesosWam.ts). generateUsuario()
// below doesn't take existing usuarios (out of scope so far — nothing has asked for it);
// generateUsuarioWam() and generateUsuarioSistema() do.

function initials(value: string, length = 3): string {
  return value
    .replace(/[^A-Za-z]/g, "")
    .slice(0, length)
    .toUpperCase();
}

export function generateUsuario(empresa: string, sucursal: string, nombre: string): string {
  return initials(empresa) + initials(sucursal) + initials(nombre);
}

// Accesos WAM Personalizados has no sucursal — just cliente + empresa/operadora. Unlike
// generateUsuario()'s 3-letter initials (fine for an internal agencia code), this is a
// real login a client sees, so it keeps the whole name instead of trimming both down to
// 6 characters total: full cliente name (letters/digits only, spaces stripped, up to 16
// chars) + full empresa name (up to 12 chars), joined with "." (matches the real style
// already seen in this table, e.g. "A.RamirezTnb").
//
// accesos_wam.usuario (unlike agencias'/generateUsuario()'s target) is fully readable —
// the user explicitly reversed that lockdown for this table — so, like
// generateUsuarioSistema(), this can and should actually avoid colliding with a real
// existing usuario instead of just guessing.
function condensed(value: string, maxLength: number): string {
  return value.replace(/[^A-Za-z0-9]/g, "").slice(0, maxLength);
}

export function generateUsuarioWam(cliente: string, empresa: string, existingUsuarios: string[] = []): string {
  const clienteName = condensed(cliente, 16);
  const empresaName = condensed(empresa, 12);
  if (!clienteName) return "";
  const base = empresaName ? `${clienteName}.${empresaName}` : clienteName;
  const existing = new Set(existingUsuarios);
  let usr = base;
  let n = 2;
  while (existing.has(usr)) {
    usr = `${base}${n}`;
    n++;
  }
  return usr;
}

// Usuarios Sistema — mirrors v1's autoSuggestUser() (index.html ~line 6360-6371)
// verbatim, including the real uniqueness loop: unlike generateUsuario()/
// generateUsuarioWam() above, usuarios_sistema.usuario is fully readable (see
// AuthContext.tsx — login() already depends on it), so the caller can actually pass in
// every existing usuario and get a real collision-free suggestion, not just a best guess.
export function generateUsuarioSistema(nombre: string, existingUsuarios: string[]): string {
  const parts = nombre.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let base = (parts[0] ?? "").slice(0, 6) + (parts[1] ? "_" + parts[1].slice(0, 3) : "");
  base = base.replace(/[^a-z0-9_]/g, "");
  if (!base) return "";
  const existing = new Set(existingUsuarios);
  let usr = base;
  let n = 2;
  while (existing.has(usr)) {
    usr = base + n;
    n++;
  }
  return usr;
}

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@!$%&*()-_=+";
const PASSWORD_SPECIALS = "@!$%&*()-_=+";

export function generatePassword(): string {
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  return (
    pwd.slice(0, 8) +
    PASSWORD_SPECIALS[Math.floor(Math.random() * PASSWORD_SPECIALS.length)] +
    PASSWORD_CHARS[Math.floor(Math.random() * 52)]
  );
}
