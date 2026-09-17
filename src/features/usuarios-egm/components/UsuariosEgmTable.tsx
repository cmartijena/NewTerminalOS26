import { useState } from "react";
import { Check, Eye, EyeOff, Mail, Pencil, Power, X } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { AgenciaFormDialog } from "@/features/agencias/components/AgenciaFormDialog";
import { useToggleAgenciaActivo, useRegenerarPasswordAgencia } from "@/features/agencias/hooks/useAgenciaMutations";
import { enviarCorreoBienvenida } from "@/lib/emailjs";
import { generatePassword } from "@/utils/credentials";
import type { AgenciaRow, EmpresaRow } from "@/lib/supabase/types";
import { localNumberFromPos } from "@/utils/agencia";

interface Props {
  agencias: AgenciaRow[];
  isLoading: boolean;
  isError: boolean;
  empresasById: Map<string, EmpresaRow>;
  canEdit: boolean;
}

export function UsuariosEgmTable({ agencias, isLoading, isError, empresasById, canEdit }: Props) {
  const toggleActivo = useToggleAgenciaActivo();
  const regenerarPassword = useRegenerarPasswordAgencia();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resultById, setResultById] = useState<Record<string, "ok" | "error" | undefined>>({});
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // "Reenviar credenciales" issues a brand-new password rather than resending the current
  // one, even though the current one is readable now too — see the note on
  // useRegenerarPasswordAgencia in useAgenciaMutations.ts. Confirms first since it
  // invalidates whatever password is currently in use for that agencia's EGM login.
  async function handleReenviar(a: AgenciaRow) {
    if (
      !confirm(`¿Generar una nueva contraseña para "${a.nombre}" y enviarla a ${a.correo}?`)
    ) {
      return;
    }
    setSendingId(a.id);
    setResultById((prev) => ({ ...prev, [a.id]: undefined }));
    try {
      const password = generatePassword();
      await regenerarPassword.mutateAsync({ id: a.id, password });
      await enviarCorreoBienvenida({
        nombre: a.encargado || a.nombre,
        usuario: a.usuario ?? "",
        password,
        correo: a.correo ?? "",
      });
      setResultById((prev) => ({ ...prev, [a.id]: "ok" }));
    } catch (err) {
      console.error("Reenviar credenciales EGM error:", err);
      setResultById((prev) => ({ ...prev, [a.id]: "error" }));
    } finally {
      setSendingId(null);
      setTimeout(() => setResultById((prev) => ({ ...prev, [a.id]: undefined })), 4000);
    }
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
        Error al cargar usuarios EGM
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (agencias.length === 0) {
    return (
      <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
        Sin usuarios EGM
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
      <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Sucursal</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Agencia</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Rol</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Usuario</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Contraseña</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">N° local</th>
            <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Estado</th>
            <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {agencias.map((a) => {
            const empresa = a.empresa_id ? empresasById.get(a.empresa_id) : undefined;
            const activo = a.estado !== "DADA DE BAJA";
            return (
              <tr key={a.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-3 text-t2">{empresa?.nombre ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-t2">{a.departamento ?? "—"}</td>
                <td className="px-3 py-3 font-semibold text-t1">{a.nombre}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="rounded-md bg-bg px-2 py-0.5 text-[11px] text-t2">{a.rol ?? "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-blue">
                  {a.usuario ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-t2">
                      {revealedIds.has(a.id) ? (a.password ?? "—") : "••••••••"}
                    </span>
                    <button
                      type="button"
                      title={revealedIds.has(a.id) ? "Ocultar" : "Mostrar"}
                      onClick={() => toggleReveal(a.id)}
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-t1"
                    >
                      {revealedIds.has(a.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {a.usuario && (
                      <CopyButton
                        title="Copiar usuario y contraseña"
                        text={`Usuario: ${a.usuario}\nContraseña: ${a.password ?? ""}`}
                      />
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="rounded-md border border-purple/20 bg-purple/10 px-2 py-0.5 font-mono text-[11px] text-purple">
                    {localNumberFromPos(a.pos) ?? "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      activo ? "bg-positive-tint text-positive" : "bg-negative-tint text-negative"
                    }`}
                  >
                    {activo ? "ACTIVO" : "INACTIVO"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {canEdit && (
                    <div className="flex justify-end gap-0.5">
                      <AgenciaFormDialog
                        agencia={a}
                        trigger={
                          <button
                            type="button"
                            title="Editar"
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg"
                          >
                            <Pencil size={15} />
                          </button>
                        }
                      />
                      {a.correo && (
                        <button
                          type="button"
                          title="Reenviar credenciales por correo"
                          disabled={sendingId === a.id}
                          onClick={() => handleReenviar(a)}
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-blue disabled:opacity-50"
                        >
                          {resultById[a.id] === "ok" ? (
                            <Check size={15} className="text-positive" />
                          ) : resultById[a.id] === "error" ? (
                            <X size={15} className="text-negative" />
                          ) : (
                            <Mail size={15} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        title={activo ? "Desactivar" : "Activar"}
                        disabled={toggleActivo.isPending}
                        onClick={() => toggleActivo.mutate({ id: a.id, activar: !activo })}
                        className={`flex h-[30px] w-[30px] items-center justify-center rounded-full hover:bg-bg ${
                          activo ? "text-t3 hover:text-negative" : "text-t3 hover:text-positive"
                        }`}
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
