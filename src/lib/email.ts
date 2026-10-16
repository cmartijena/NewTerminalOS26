import { wamFetch } from "@/lib/wamApi/client";

// Transactional email (login 2FA code, new-user / resend credentials). Sent by wam-api
// through Brevo — see /api/email/send in wam_api.py. Replaced EmailJS (2026-10), whose
// free quota ran out and, because the 2FA code also went through it, blocked every
// login. The backend holds the API key and the HTML templates; this only passes data.
// Same function names/params as the EmailJS version so no caller had to change.

function enviar(body: Record<string, unknown>) {
  return wamFetch<{ ok: true }>("/api/email/send", { method: "POST", body });
}

export interface EnviarCorreoWamParams {
  cliente: string;
  usuario: string;
  password: string;
  correo: string;
  urlWam: string | null;
  empresa: string | null;
}

export async function enviarCorreoWam(params: EnviarCorreoWamParams): Promise<void> {
  if (!params.correo) return;
  await enviar({
    tipo: "wam",
    to: params.correo,
    nombre: params.cliente,
    usuario: params.usuario,
    password: params.password,
    url: params.urlWam ?? "",
    empresa: params.empresa ?? "",
  });
}

export interface EnviarCorreoBienvenidaParams {
  nombre: string;
  usuario: string;
  password: string;
  correo: string;
}

export async function enviarCorreoBienvenida(params: EnviarCorreoBienvenidaParams): Promise<void> {
  if (!params.correo) return;
  await enviar({
    tipo: "bienvenida",
    to: params.correo,
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

export async function enviarCorreoOtp(params: EnviarCorreoOtpParams): Promise<void> {
  if (!params.correo) return;
  await enviar({ tipo: "otp", to: params.correo, nombre: params.nombre, codigo: params.codigo });
}
