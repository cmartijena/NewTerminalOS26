import emailjs from "@emailjs/browser";

// Real EmailJS account already in production use by v1 (index.html ~line 6391-6440,
// `enviarCorreoWAM()`) — same service/template/public key, just read from env here
// instead of hardcoded. EmailJS's "public key" is designed to be embedded client-side
// (that's the whole point of the @emailjs/browser SDK), so this is not a secret-exposure
// concern the way a real API secret would be.
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_WAM = import.meta.env.VITE_EMAILJS_TEMPLATE_WAM;
const TEMPLATE_WELCOME = import.meta.env.VITE_EMAILJS_TEMPLATE_WELCOME;
const TEMPLATE_OTP = import.meta.env.VITE_EMAILJS_TEMPLATE_OTP;

let initialized = false;
function ensureInit(): boolean {
  if (!PUBLIC_KEY) return false;
  if (!initialized) {
    emailjs.init({ publicKey: PUBLIC_KEY });
    initialized = true;
  }
  return true;
}

export interface EnviarCorreoWamParams {
  cliente: string;
  usuario: string;
  password: string;
  correo: string;
  urlWam: string | null;
  empresa: string | null;
}

// Mirrors v1's enviarCorreoWAM() exactly — same template param names
// (to_email/to_name/email/usuario_wam/password_wam/url_wam/empresa) so the EmailJS
// template already configured for this account renders correctly unchanged.
export async function enviarCorreoWam(params: EnviarCorreoWamParams): Promise<void> {
  if (!params.correo) return;
  if (!ensureInit() || !SERVICE_ID || !TEMPLATE_WAM) {
    throw new Error("EmailJS no está configurado (faltan variables VITE_EMAILJS_* en .env).");
  }
  await emailjs.send(SERVICE_ID, TEMPLATE_WAM, {
    to_email: params.correo,
    to_name: params.cliente,
    email: params.correo,
    usuario_wam: params.usuario,
    password_wam: params.password,
    url_wam: params.urlWam || "https://wam.solutions.vsslots.com",
    empresa: params.empresa || "",
  });
}

export interface EnviarCorreoBienvenidaParams {
  nombre: string;
  usuario: string;
  password: string;
  correo: string;
}

// Mirrors v1's enviarCorreoBienvenida() (index.html ~line 6403-6417) — same template
// (template_yojrm8m) and param names (to_email/nombre/usuario/password). v1 only used
// this for Usuarios Sistema (not built yet in V2); here it's reused for the two places an
// agencia's own EGM usuario/password get (re)issued — see useAgenciaMutations.ts and
// useSolicitudMutations.ts.
export async function enviarCorreoBienvenida(params: EnviarCorreoBienvenidaParams): Promise<void> {
  if (!params.correo) return;
  if (!ensureInit() || !SERVICE_ID || !TEMPLATE_WELCOME) {
    throw new Error("EmailJS no está configurado (faltan variables VITE_EMAILJS_* en .env).");
  }
  await emailjs.send(SERVICE_ID, TEMPLATE_WELCOME, {
    to_email: params.correo,
    nombre: params.nombre,
    usuario: params.usuario,
    password: params.password,
  });
}

export interface EnviarCorreoOtpParams {
  nombre: string;
  correo: string;
  codigo: string;
}

// New template (2026-09-17), not ported from v1 — v1 has no 2FA at all. Requires a
// template configured on the EmailJS dashboard with exactly these params
// (to_email/nombre/codigo) — see VITE_EMAILJS_TEMPLATE_OTP in .env.
export async function enviarCorreoOtp(params: EnviarCorreoOtpParams): Promise<void> {
  if (!params.correo) return;
  if (!ensureInit() || !SERVICE_ID || !TEMPLATE_OTP) {
    throw new Error("EmailJS no está configurado (falta VITE_EMAILJS_TEMPLATE_OTP en .env).");
  }
  await emailjs.send(SERVICE_ID, TEMPLATE_OTP, {
    to_email: params.correo,
    nombre: params.nombre,
    codigo: params.codigo,
  });
}
