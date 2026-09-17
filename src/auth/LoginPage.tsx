import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "./AuthContext";
import type { CurrentUser } from "./types";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const RESEND_COOLDOWN_S = 30;

function Logo() {
  return (
    <div className="mb-6 flex flex-col items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M4 7h16" />
          <path d="M4 12h10" />
          <path d="M4 17h16" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-lg font-extrabold text-t1">TerminalOS</div>
        <div className="text-xs text-t3">Electric Line Peru S.A.C.</div>
      </div>
    </div>
  );
}

// Step 1: usuario/password. On success the account has a real code waiting in its inbox
// (see AuthContext's login()) but is NOT logged in yet — the parent switches to the OTP
// step instead of finishing here.
function CredentialsStep({ onVerified }: { onVerified: (user: CurrentUser) => void }) {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await login(usuario.trim(), password);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onVerified(result.user);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="usuario">Usuario</Label>
        <Input
          id="usuario"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="w-full"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <div className="flex items-center gap-1">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            required
          />
          <button
            type="button"
            title={showPassword ? "Ocultar" : "Mostrar"}
            onClick={() => setShowPassword((v) => !v)}
            className="flex h-[42px] w-[34px] flex-none items-center justify-center text-t3 hover:text-t1"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-negative">{error}</p>}
      <Button type="submit" variant="primary" className="w-full justify-center" disabled={isSubmitting}>
        {isSubmitting ? "Verificando..." : "Ingresar"}
      </Button>
    </form>
  );
}

// Step 2: the 6-digit code just emailed to the account's real address. "Reenviar" and
// "Volver" both re-collect the password — a fresh code is never issued without a real
// credential check (see AuthContext's resendOtp comment for why).
function OtpStep({
  user,
  onBack,
}: {
  user: CurrentUser;
  onBack: () => void;
}) {
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendPassword, setResendPassword] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await verifyOtp(user, code.trim());
    setIsSubmitting(false);
    if (!result.ok) setError(result.error);
  }

  async function handleResend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResendState("sending");
    const result = await resendOtp(user.usuario, resendPassword);
    if (result.ok) {
      setResendState("sent");
      setShowResend(false);
      setResendPassword("");
      setCooldown(RESEND_COOLDOWN_S);
    } else {
      setResendState("idle");
      setError(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-t2">
        Enviamos un código de 6 dígitos a <b className="text-t1">{user.email}</b>. Ingrésalo para completar el
        ingreso.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="otp">Código de verificación</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full text-center font-mono text-lg tracking-[0.3em]"
            placeholder="000000"
            autoFocus
            required
          />
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
        {resendState === "sent" && !error && (
          <p className="text-xs text-positive">Nuevo código enviado.</p>
        )}
        <Button type="submit" variant="primary" className="w-full justify-center" disabled={isSubmitting || code.length !== 6}>
          {isSubmitting ? "Verificando..." : "Verificar e ingresar"}
        </Button>
      </form>

      {showResend ? (
        <form onSubmit={handleResend} className="space-y-2 border-t border-border pt-4">
          <Label htmlFor="resend-password">Confirma tu contraseña para reenviar el código</Label>
          <Input
            id="resend-password"
            type="password"
            autoComplete="current-password"
            value={resendPassword}
            onChange={(e) => setResendPassword(e.target.value)}
            className="w-full"
            required
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" className="flex-1 justify-center" disabled={resendState === "sending"}>
              {resendState === "sending" ? "Enviando..." : "Reenviar código"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowResend(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
          <button
            type="button"
            onClick={onBack}
            className="font-semibold text-t3 hover:text-t1"
          >
            ← Volver
          </button>
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={() => setShowResend(true)}
            className="font-semibold text-blue hover:underline disabled:pointer-events-none disabled:text-t3"
          >
            {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "¿No te llegó? Reenviar código"}
          </button>
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const [pendingUser, setPendingUser] = useState<CurrentUser | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-[22px] border border-border bg-surface p-8 shadow-lg">
        <Logo />
        {pendingUser ? (
          <OtpStep user={pendingUser} onBack={() => setPendingUser(null)} />
        ) : (
          <CredentialsStep onVerified={setPendingUser} />
        )}
      </div>
    </div>
  );
}
