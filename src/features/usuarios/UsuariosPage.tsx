import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, EyeOff, Mail, Pencil, Plus, Power, Search, Trash2, X } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CopyButton";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/auth/AuthContext";
import { ROL_LABEL, type Rol } from "@/auth/types";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useResponsivePageSize } from "@/hooks/useResponsivePageSize";
import { enviarCorreoBienvenida, enviarCorreoWam } from "@/lib/email";
import { generatePassword } from "@/utils/credentials";
import { localNumberFromPos, localNumberValue } from "@/utils/agencia";
import { cn } from "@/utils/cn";
import type { AccesoWamRow, AgenciaRow } from "@/lib/supabase/types";
import { AgenciaFormDialog } from "@/features/agencias/components/AgenciaFormDialog";
import { useRegenerarPasswordAgencia, useToggleAgenciaActivo } from "@/features/agencias/hooks/useAgenciaMutations";
import { UsuarioSistemaFormDialog } from "@/features/usuarios-sistema/components/UsuarioSistemaFormDialog";
import { useUsuariosSistema, type UsuarioSistemaListRow } from "@/features/usuarios-sistema/hooks/useUsuariosSistema";
import {
  useDeleteUsuarioSistema,
  useRegenerarPasswordUsuarioSistema,
  useToggleUsuarioActivo,
} from "@/features/usuarios-sistema/hooks/useUsuarioSistemaMutations";
import { AccesoWamFormDialog } from "@/features/usuarios-egm/components/AccesoWamFormDialog";
import { useAccesosWam } from "@/features/usuarios-egm/hooks/useAccesosWam";
import { useDeleteAccesoWam } from "@/features/usuarios-egm/hooks/useAccesoWamMutations";

const ROW_HEIGHT = 58;
const RESERVED_BELOW_TABLE_TOP = 132;

type Tipo = "SISTEMA" | "LOCAL" | "WAM";

type Item =
  | { tipo: "SISTEMA"; key: string; u: UsuarioSistemaListRow }
  | { tipo: "LOCAL"; key: string; a: AgenciaRow }
  | { tipo: "WAM"; key: string; w: AccesoWamRow };

const TIPO_LABEL: Record<Tipo, string> = { SISTEMA: "Sistema", LOCAL: "Local", WAM: "WAM" };
const TIPO_CHIP_LABEL: Record<Tipo, string> = { SISTEMA: "Sistema", LOCAL: "Locales", WAM: "Acceso WAM" };
const TIPO_STYLE: Record<Tipo, string> = {
  SISTEMA: "bg-accent-tint text-accent",
  LOCAL: "bg-amber-tint text-amber",
  WAM: "bg-positive-tint text-positive",
};
const TIPO_ORDER: Record<Tipo, number> = { SISTEMA: 0, WAM: 1, LOCAL: 2 };

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ADMINISTRADOR-only (same gate the two pages this replaces had, via the sidebar's
// hiddenForRoles). Unifies three different kinds of access that used to live in two
// pages: people who log into TerminalOS (usuarios_sistema), each local's own EGM login
// (columns on `agencias`), and external clients' WAM credentials (accesos_wam).
export function UsuariosPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.rol === "ADMINISTRADOR";

  const sistemaQ = useUsuariosSistema();
  const wamQ = useAccesosWam();
  const agenciasQ = useVisibleAgencias();
  const { data: empresas } = useVisibleEmpresas();

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<"" | Tipo>("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [page, setPage] = useState(1);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [resultByKey, setResultByKey] = useState<Record<string, "ok" | "error" | undefined>>({});
  const tableAnchorRef = useRef<HTMLDivElement>(null);
  const pageSize = useResponsivePageSize(tableAnchorRef, ROW_HEIGHT, RESERVED_BELOW_TABLE_TOP);

  const toggleSistemaActivo = useToggleUsuarioActivo();
  const deleteSistema = useDeleteUsuarioSistema();
  const regenerarSistema = useRegenerarPasswordUsuarioSistema();
  const toggleLocalActivo = useToggleAgenciaActivo();
  const regenerarLocal = useRegenerarPasswordAgencia();
  const deleteWam = useDeleteAccesoWam();

  const empresaNombreById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e.nombre])), [empresas]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const u of sistemaQ.data ?? []) out.push({ tipo: "SISTEMA", key: `s-${u.id}`, u });
    for (const w of wamQ.data ?? []) out.push({ tipo: "WAM", key: `w-${w.id}`, w });
    for (const a of agenciasQ.data ?? []) if (a.usuario) out.push({ tipo: "LOCAL", key: `l-${a.id}`, a });
    return out;
  }, [sistemaQ.data, wamQ.data, agenciasQ.data]);

  function view(it: Item) {
    if (it.tipo === "SISTEMA") {
      const u = it.u;
      return {
        nombre: u.nombre,
        sub: u.email ?? "",
        usuario: u.usuario,
        empresa: u.empresas.length ? u.empresas.join(", ") : "Todas",
        rol: ROL_LABEL[u.rol as Rol] ?? u.rol,
        correo: u.email,
        password: null as string | null,
        activo: u.activo,
        estado: u.activo ? "ACTIVO" : "INACTIVO",
      };
    }
    if (it.tipo === "LOCAL") {
      const a = it.a;
      const emp = a.empresa_id ? (empresaNombreById.get(a.empresa_id) ?? "") : "";
      const activo = a.estado !== "DADA DE BAJA";
      return {
        nombre: a.nombre,
        sub: [a.departamento, localNumberFromPos(a.pos)].filter(Boolean).join(" · "),
        usuario: a.usuario ?? "",
        empresa: emp || "—",
        rol: a.rol ?? "—",
        correo: a.correo,
        password: a.password,
        activo,
        estado: activo ? "ACTIVO" : "INACTIVO",
      };
    }
    const w = it.w;
    return {
      nombre: w.cliente,
      sub: w.correo ?? "",
      usuario: w.usuario,
      empresa: w.empresa ?? "—",
      rol: "Acceso WAM",
      correo: w.correo,
      password: w.password,
      activo: w.estado === "ACTIVO",
      estado: w.estado,
    };
  }

  // Everything the one search box looks at — name, user, empresa, role, email, sucursal,
  // N° local — so there's a single place to type, whatever kind of account it is.
  const searched = useMemo(() => {
    const q = norm(search.trim());
    return items.filter((it) => {
      const v = view(it);
      if (empresaNombre) {
        const e = norm(empresaNombre);
        if (it.tipo === "SISTEMA") {
          if (it.u.empresas.length && !it.u.empresas.some((x) => norm(x) === e)) return false;
        } else if (!norm(v.empresa).includes(e)) return false;
      }
      if (!q) return true;
      const hay = norm(`${v.nombre} ${v.sub} ${v.usuario} ${v.empresa} ${v.rol} ${v.correo ?? ""}`);
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
    // view() only depends on empresaNombreById.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, empresaNombre, empresaNombreById]);

  const counts = useMemo(() => {
    const c: Record<Tipo, number> = { SISTEMA: 0, LOCAL: 0, WAM: 0 };
    for (const it of searched) c[it.tipo]++;
    return c;
  }, [searched]);

  const filtered = useMemo(() => {
    const list = tipo ? searched.filter((it) => it.tipo === tipo) : searched;
    return [...list].sort((x, y) => {
      if (TIPO_ORDER[x.tipo] !== TIPO_ORDER[y.tipo]) return TIPO_ORDER[x.tipo] - TIPO_ORDER[y.tipo];
      const vx = view(x);
      const vy = view(y);
      const e = vx.empresa.localeCompare(vy.empresa, "es");
      if (e !== 0) return e;
      if (x.tipo === "LOCAL" && y.tipo === "LOCAL") {
        const s = (x.a.departamento ?? "").localeCompare(y.a.departamento ?? "", "es");
        if (s !== 0) return s;
        return localNumberValue(x.a.pos) - localNumberValue(y.a.pos);
      }
      return vx.nombre.localeCompare(vy.nombre, "es");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, tipo, empresaNombreById]);

  useEffect(() => {
    setPage(1);
  }, [search, tipo, empresaNombre, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const isLoading = sistemaQ.isLoading || wamQ.isLoading || agenciasQ.isLoading;
  const isError = sistemaQ.isError || wamQ.isError || agenciasQ.isError;

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Re-send credentials. Sistema and Local rotate to a brand-new password first (the
  // current one can't be resent as-is for Sistema; for Local it's a deliberate choice
  // kept from Usuarios EGM). WAM accesos resend the stored password unchanged.
  async function handleReenviar(it: Item) {
    const v = view(it);
    if (!v.correo) return;
    if (it.tipo !== "WAM" && !confirm(`¿Generar una nueva contraseña para "${v.nombre}" y enviarla a ${v.correo}?`)) return;
    setSendingKey(it.key);
    setResultByKey((p) => ({ ...p, [it.key]: undefined }));
    try {
      if (it.tipo === "SISTEMA") {
        const password = generatePassword();
        await regenerarSistema.mutateAsync({ id: it.u.id, password });
        await enviarCorreoBienvenida({ nombre: it.u.nombre, usuario: it.u.usuario, password, correo: v.correo });
      } else if (it.tipo === "LOCAL") {
        const password = generatePassword();
        await regenerarLocal.mutateAsync({ id: it.a.id, password });
        await enviarCorreoBienvenida({
          nombre: it.a.encargado || it.a.nombre,
          usuario: it.a.usuario ?? "",
          password,
          correo: v.correo,
        });
      } else {
        await enviarCorreoWam({
          cliente: it.w.cliente,
          usuario: it.w.usuario,
          password: it.w.password,
          correo: v.correo,
          urlWam: it.w.url_wam,
          empresa: it.w.empresa,
        });
      }
      setResultByKey((p) => ({ ...p, [it.key]: "ok" }));
    } catch (err) {
      console.error("Reenviar credenciales error:", err);
      setResultByKey((p) => ({ ...p, [it.key]: "error" }));
    } finally {
      setSendingKey(null);
      setTimeout(() => setResultByKey((p) => ({ ...p, [it.key]: undefined })), 4000);
    }
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Usuarios" />
        <div className="p-[22px_16px] sm:p-[22px_38px]">
          <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
            Esta sección es solo para administradores.
          </div>
        </div>
      </>
    );
  }

  const chips: { key: "" | Tipo; label: string; count: number }[] = [
    { key: "", label: "Todos", count: searched.length },
    { key: "SISTEMA", label: TIPO_CHIP_LABEL.SISTEMA, count: counts.SISTEMA },
    { key: "LOCAL", label: TIPO_CHIP_LABEL.LOCAL, count: counts.LOCAL },
    { key: "WAM", label: TIPO_CHIP_LABEL.WAM, count: counts.WAM },
  ];

  const iconBtn = "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-t3 hover:bg-bg";

  return (
    <>
      <PageHeader
        title="Usuarios"
        meta={
          <>
            <b className="font-mono text-t2">{filtered.length}</b>
            {filtered.length !== items.length && (
              <> de <b className="font-mono text-t2">{items.length}</b></>
            )}{" "}
            cuenta(s)
          </>
        }
        actions={
          <>
            <AccesoWamFormDialog
              otros={wamQ.data ?? []}
              trigger={
                <Button variant="secondary">
                  <Plus size={14} /> Acceso WAM
                </Button>
              }
            />
            <UsuarioSistemaFormDialog
              otros={sistemaQ.data ?? []}
              trigger={
                <Button variant="primary">
                  <Plus size={14} /> Usuario del sistema
                </Button>
              }
            />
          </>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_16px] sm:p-[22px_38px_38px]">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-t3" />
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, usuario, correo, empresa o local…"
            className="h-[52px] w-full rounded-full border border-border bg-surface pl-12 pr-5 text-[15px] text-t1 outline-none placeholder:text-t3 focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setTipo(c.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
                tipo === c.key
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-t2 hover:border-t3",
              )}
            >
              {c.label} <span className="font-mono opacity-80">{c.count}</span>
            </button>
          ))}
          <Select value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} className="ml-auto">
            <option value="">Todas las empresas</option>
            {empresas?.map((e) => (
              <option key={e.id} value={e.nombre}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div ref={tableAnchorRef}>
          {isError ? (
            <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
              Error al cargar usuarios
            </div>
          ) : isLoading ? (
            <div className="space-y-2 rounded-[20px] border border-border bg-surface p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-t3">
              {search ? `Sin resultados para "${search}".` : "Sin usuarios."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13.5px]">
                <thead>
                  <tr>
                    {["Tipo", "Nombre", "Usuario", "Contraseña", "Empresa", "Rol", "Estado"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">
                        {h}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((it) => {
                    const v = view(it);
                    const esUnoMismo = it.tipo === "SISTEMA" && it.u.id === currentUser?.id;
                    const shown = revealed.has(it.key);
                    return (
                      <tr key={it.key} className="border-t border-border">
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", TIPO_STYLE[it.tipo])}>
                            {TIPO_LABEL[it.tipo]}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-t1">
                            {v.nombre}
                            {esUnoMismo && <span className="ml-1.5 text-[10px] font-normal text-t3">(tú)</span>}
                          </div>
                          {v.sub && <div className="text-[11.5px] text-t3">{v.sub}</div>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-blue">{v.usuario}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {it.tipo === "SISTEMA" ? (
                            <span className="font-mono text-[12px] text-t3">••••••••</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[12px] text-t2">
                                {shown ? (v.password ?? "—") : "••••••••"}
                              </span>
                              <button
                                type="button"
                                title={shown ? "Ocultar" : "Mostrar"}
                                onClick={() => toggleReveal(it.key)}
                                className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-t1"
                              >
                                {shown ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <CopyButton
                                title="Copiar usuario y contraseña"
                                text={`Usuario: ${v.usuario}\nContraseña: ${v.password ?? ""}`}
                              />
                            </div>
                          )}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-3 text-t2" title={v.empresa}>
                          {v.empresa}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="rounded-md bg-bg px-2 py-0.5 text-[11px] font-semibold text-t2">{v.rol}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-[11px] font-bold",
                              v.activo ? "bg-positive-tint text-positive" : "bg-negative-tint text-negative",
                            )}
                          >
                            {v.estado}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-0.5">
                            {it.tipo === "SISTEMA" && (
                              <UsuarioSistemaFormDialog
                                usuario={it.u}
                                otros={(sistemaQ.data ?? []).filter((o) => o.id !== it.u.id)}
                                trigger={
                                  <button type="button" title="Editar" className={iconBtn}>
                                    <Pencil size={15} />
                                  </button>
                                }
                              />
                            )}
                            {it.tipo === "LOCAL" && (
                              <AgenciaFormDialog
                                agencia={it.a}
                                trigger={
                                  <button type="button" title="Editar" className={iconBtn}>
                                    <Pencil size={15} />
                                  </button>
                                }
                              />
                            )}
                            {it.tipo === "WAM" && (
                              <AccesoWamFormDialog
                                acceso={it.w}
                                otros={(wamQ.data ?? []).filter((o) => o.id !== it.w.id)}
                                trigger={
                                  <button type="button" title="Editar" className={iconBtn}>
                                    <Pencil size={15} />
                                  </button>
                                }
                              />
                            )}
                            {v.correo && (
                              <button
                                type="button"
                                title="Reenviar credenciales por correo"
                                disabled={sendingKey === it.key}
                                onClick={() => handleReenviar(it)}
                                className={cn(iconBtn, "hover:text-blue disabled:opacity-50")}
                              >
                                {resultByKey[it.key] === "ok" ? (
                                  <Check size={15} className="text-positive" />
                                ) : resultByKey[it.key] === "error" ? (
                                  <X size={15} className="text-negative" />
                                ) : (
                                  <Mail size={15} />
                                )}
                              </button>
                            )}
                            {it.tipo === "SISTEMA" && (
                              <button
                                type="button"
                                title={esUnoMismo ? "No puedes desactivar tu propia cuenta" : v.activo ? "Desactivar" : "Activar"}
                                disabled={esUnoMismo || toggleSistemaActivo.isPending}
                                onClick={() => toggleSistemaActivo.mutate({ id: it.u.id, activo: !it.u.activo })}
                                className={cn(iconBtn, "disabled:pointer-events-none disabled:opacity-30", v.activo ? "hover:text-negative" : "hover:text-positive")}
                              >
                                <Power size={15} />
                              </button>
                            )}
                            {it.tipo === "LOCAL" && (
                              <button
                                type="button"
                                title={v.activo ? "Desactivar" : "Activar"}
                                disabled={toggleLocalActivo.isPending}
                                onClick={() => toggleLocalActivo.mutate({ id: it.a.id, activar: !v.activo })}
                                className={cn(iconBtn, v.activo ? "hover:text-negative" : "hover:text-positive")}
                              >
                                <Power size={15} />
                              </button>
                            )}
                            {it.tipo === "SISTEMA" && (
                              <button
                                type="button"
                                title={esUnoMismo ? "No puedes eliminar tu propia cuenta" : "Eliminar"}
                                disabled={esUnoMismo}
                                onClick={() => {
                                  if (confirm(`¿Eliminar el usuario "${it.u.nombre}" (${it.u.usuario})? Esta acción no se puede deshacer.`)) {
                                    deleteSistema.mutate(it.u.id);
                                  }
                                }}
                                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-negative hover:bg-negative-tint disabled:pointer-events-none disabled:opacity-30"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                            {it.tipo === "WAM" && (
                              <button
                                type="button"
                                title="Eliminar"
                                onClick={() => {
                                  if (confirm(`¿Eliminar el acceso WAM de "${it.w.cliente}"? Esta acción no se puede deshacer.`)) {
                                    deleteWam.mutate(it.w.id);
                                  }
                                }}
                                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-negative hover:bg-negative-tint"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
        <p className="text-[11.5px] text-t3">
          Los usuarios de cada local se crean junto con la agencia (Agencias → Nueva agencia); aquí se editan.
        </p>
      </div>
    </>
  );
}
