import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ACCION_CUENTA_LABEL, useLogCuentas, type AccionCuenta } from "@/lib/supabase/logCuentas";
import { ROL_LABEL, type Rol } from "@/auth/types";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 20;

const ACCION_STYLE: Record<AccionCuenta, string> = {
  PASSWORD_CAMBIADA: "bg-positive-tint text-positive",
  PASSWORD_RESTABLECIDA: "bg-amber-tint text-amber",
  PASSWORD_VISTA: "bg-accent-tint text-accent",
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" });
}

// Admin-only view of who viewed / changed whose password (log_cuentas).
export function ActividadCuentas() {
  const { data, isLoading, isError } = useLogCuentas(true);
  const [search, setSearch] = useState("");
  const [accion, setAccion] = useState<"" | AccionCuenta>("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    return (data ?? []).filter((r) => {
      if (accion && r.accion !== accion) return false;
      if (!q) return true;
      const hay = norm(`${r.actor_nombre} ${r.objetivo_nombre ?? ""} ${r.detalle ?? ""} ${ACCION_CUENTA_LABEL[r.accion]}`);
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [data, search, accion]);

  useEffect(() => {
    setPage(1);
  }, [search, accion]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const chips: { key: "" | AccionCuenta; label: string }[] = [
    { key: "", label: "Todo" },
    { key: "PASSWORD_VISTA", label: "Vistas" },
    { key: "PASSWORD_CAMBIADA", label: "Cambios propios" },
    { key: "PASSWORD_RESTABLECIDA", label: "Restablecidas" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por quién hizo el cambio o por la cuenta afectada…"
        className="h-[46px] w-full rounded-full border border-border bg-surface px-5 text-[14px] text-t1 outline-none placeholder:text-t3 focus:border-accent"
      />
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setAccion(c.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
              accion === c.key ? "border-accent bg-accent text-white" : "border-border bg-surface text-t2 hover:border-t3",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isError ? (
        <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
          No se pudo cargar la actividad. ¿Ya se creó la tabla <code>log_cuentas</code>?
        </div>
      ) : isLoading ? (
        <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">Sin actividad registrada.</div>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr>
                {["Fecha", "Quién", "Acción", "Cuenta afectada", "Detalle"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-t2">{formatFecha(r.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-t1">{r.actor_nombre}</div>
                    {r.actor_rol && <div className="text-[11.5px] text-t3">{ROL_LABEL[r.actor_rol as Rol] ?? r.actor_rol}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", ACCION_STYLE[r.accion])}>
                      {ACCION_CUENTA_LABEL[r.accion] ?? r.accion}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-t1">{r.objetivo_nombre ?? "—"}</td>
                  <td className="px-3 py-3 text-t2">{r.detalle ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
