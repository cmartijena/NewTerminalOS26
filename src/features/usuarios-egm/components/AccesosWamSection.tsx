import { useState } from "react";
import { Check, Eye, EyeOff, Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { enviarCorreoWam } from "@/lib/emailjs";
import type { AccesoWamRow } from "@/lib/supabase/types";
import { useAccesosWam } from "../hooks/useAccesosWam";
import { useDeleteAccesoWam } from "../hooks/useAccesoWamMutations";
import { AccesoWamFormDialog } from "./AccesoWamFormDialog";

const ESTADO_STYLE: Record<string, string> = {
  ACTIVO: "bg-positive-tint text-positive",
  SUSPENDIDO: "bg-amber-tint text-amber",
  INACTIVO: "bg-negative-tint text-negative",
};

// Mirrors v1's "Accesos WAM Personalizados" sub-section, nested at the bottom of the same
// Usuarios EGM page (index.html ~line 1099-1112) — standalone client credentials, not
// tied to any agencia. ADMINISTRADOR-only (see egmIniciarVista()); the caller
// (UsuariosEgmPage) is responsible for only rendering this for that role.
export function AccesosWamSection() {
  const { data: accesos, isLoading, isError } = useAccesosWam();
  const deleteAcceso = useDeleteAccesoWam();
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resultById, setResultById] = useState<Record<string, "ok" | "error">>({});

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleReenviar(a: AccesoWamRow) {
    setSendingId(a.id);
    setResultById((prev) => ({ ...prev, [a.id]: undefined as never }));
    try {
      await enviarCorreoWam({
        cliente: a.cliente,
        usuario: a.usuario,
        password: a.password,
        correo: a.correo ?? "",
        urlWam: a.url_wam,
        empresa: a.empresa,
      });
      setResultById((prev) => ({ ...prev, [a.id]: "ok" }));
    } catch (err) {
      console.error("EmailJS WAM error:", err);
      setResultById((prev) => ({ ...prev, [a.id]: "error" }));
    } finally {
      setSendingId(null);
      setTimeout(() => setResultById((prev) => ({ ...prev, [a.id]: undefined as never })), 4000);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-t1">Accesos WAM Personalizados</h3>
          <p className="mt-0.5 font-mono text-[11px] text-t3">Credenciales de clientes para acceso directo a WAM</p>
        </div>
        <AccesoWamFormDialog
          otros={accesos ?? []}
          trigger={
            <Button variant="primary">
              <Plus size={14} /> Acceso WAM
            </Button>
          }
        />
      </div>

      {isError ? (
        <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
          Error al cargar accesos WAM
        </div>
      ) : isLoading ? (
        <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !accesos || accesos.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
          Sin accesos WAM registrados
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Cliente</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">
                  Empresa / operadora
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Usuario WAM</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Correo</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Contraseña</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">URL WAM</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Estado</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-3 font-semibold text-t1">{a.cliente}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-t2">{a.empresa ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-blue">{a.usuario}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-t2">
                    {a.correo ? (
                      <a href={`mailto:${a.correo}`} className="text-t2 hover:underline">
                        {a.correo}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[12px] text-t2">
                        {revealedIds.has(a.id) ? a.password : "••••••••"}
                      </span>
                      <button
                        type="button"
                        title={revealedIds.has(a.id) ? "Ocultar" : "Mostrar"}
                        onClick={() => toggleReveal(a.id)}
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-t1"
                      >
                        {revealedIds.has(a.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <CopyButton
                        title="Copiar usuario y contraseña"
                        text={`Usuario: ${a.usuario}\nContraseña: ${a.password}`}
                      />
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate whitespace-nowrap px-3 py-3 font-mono text-[12px]">
                    {a.url_wam ? (
                      <a href={a.url_wam} target="_blank" rel="noreferrer" className="text-blue hover:underline">
                        {a.url_wam.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${ESTADO_STYLE[a.estado] ?? ESTADO_STYLE.INACTIVO}`}
                    >
                      {a.estado}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-0.5">
                      <AccesoWamFormDialog
                        acceso={a}
                        otros={(accesos ?? []).filter((o) => o.id !== a.id)}
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
                        title="Eliminar"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-negative hover:bg-negative-tint"
                        onClick={() => {
                          if (confirm(`¿Eliminar el acceso WAM de "${a.cliente}"? Esta acción no se puede deshacer.`)) {
                            deleteAcceso.mutate(a.id);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
