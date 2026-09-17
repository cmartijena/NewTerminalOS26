import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { useTerminalesOnline } from "@/features/dashboard/hooks/useTerminalesOnline";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { downloadCsv, toCsv } from "@/utils/csv";
import { estadoLabel, normalizarActividad, type TerminalActividadRow } from "./terminalesActividad";
import { printReport } from "./printReport";
import { EmpresaChipSelector } from "./EmpresaChipSelector";

const ESTADO_STYLE: Record<string, string> = {
  Activa: "bg-positive-tint text-positive",
  Inactiva: "bg-amber-tint text-amber",
  Apagada: "bg-negative-tint text-negative",
};

const DIAS_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "nunca", label: "Nunca conectada" },
  { value: "7", label: "+7 días apagada" },
  { value: "30", label: "+30 días apagada" },
  { value: "90", label: "+90 días apagada" },
  { value: "180", label: "+180 días apagada" },
];

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// No date range here — /api/terminales/online is a live snapshot ("right now"), not a
// date-range report like the other 3 tabs. Ranks by días sin conexión instead of money
// (WAM only exposes movement aggregated per POS, not per individual terminal — see the
// 2026-09-10 conversation with the user for why this metric was chosen over money/spins).
//
// Restructured 2026-09-12 into a 2-level Empresa → Agencia accordion, collapsed by
// default — the previous flat "one row per agencia" table still put 65 group headers on
// screen at once. The same empresa selection now drives both what's shown on screen AND
// what "Exportar PDF" includes (none selected = todas).
export function TerminalesActividadPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useTerminalesOnline();
  const { data: empresas } = useVisibleEmpresas();
  const [search, setSearch] = useState("");
  // "Días apagada" only makes sense for terminales that are actually off — selecting a
  // threshold here implicitly excludes anything currently online, "nunca" isolates the
  // ones that have no last_conn at all rather than a numeric día count.
  const [diasFiltro, setDiasFiltro] = useState("");
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState<Set<string>>(new Set());
  const [empresasAbiertas, setEmpresasAbiertas] = useState<Set<string>>(new Set());
  const [agenciasAbiertas, setAgenciasAbiertas] = useState<Set<string>>(new Set());

  const empresaNombres = useMemo(() => (empresas ?? []).map((e) => e.nombre), [empresas]);
  const rows = useMemo(
    () => (data ? normalizarActividad(data.terminales, empresaNombres) : []),
    [data, empresaNombres],
  );
  const empresaBuckets = useMemo(() => [...new Set(rows.map((r) => r.empresa))].sort(), [rows]);

  const filtradas = useMemo(() => {
    let out = rows;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => r.alias.toLowerCase().includes(q) || r.pos.toLowerCase().includes(q));
    }
    if (empresasSeleccionadas.size > 0) out = out.filter((r) => empresasSeleccionadas.has(r.empresa));
    if (diasFiltro === "nunca") {
      out = out.filter((r) => !r.online && r.diasSinConexion == null);
    } else if (diasFiltro) {
      const min = Number(diasFiltro);
      out = out.filter((r) => !r.online && r.diasSinConexion != null && r.diasSinConexion >= min);
    }
    return out;
  }, [rows, search, empresasSeleccionadas, diasFiltro]);

  // Any active filter narrows the result enough that auto-revealing matches is more
  // useful than making the user manually expand every group to find them.
  const forzarAbierto = !!search || !!diasFiltro;

  const porEmpresa = useMemo(() => {
    const map = new Map<string, Map<string, TerminalActividadRow[]>>();
    for (const r of filtradas) {
      const agenciaMap = map.get(r.empresa) ?? new Map<string, TerminalActividadRow[]>();
      const arr = agenciaMap.get(r.pos) ?? [];
      arr.push(r);
      agenciaMap.set(r.pos, arr);
      map.set(r.empresa, agenciaMap);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([empresa, agenciaMap]) => ({
        empresa,
        agencias: [...agenciaMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([pos, terminales]) => ({
            pos,
            terminales: [...terminales].sort((a, b) => (b.diasSinConexion ?? Infinity) - (a.diasSinConexion ?? Infinity)),
          })),
      }));
  }, [filtradas]);

  // Nunca conectadas (diasSinConexion === null) van al final de "menos usadas" — son un
  // caso más extremo que "n días apagada", no un empate en 0.
  const menosUsadas = useMemo(
    () =>
      [...filtradas]
        .filter((r) => !r.online)
        .sort((a, b) => (b.diasSinConexion ?? Infinity) - (a.diasSinConexion ?? Infinity))
        .slice(0, 10),
    [filtradas],
  );
  const masUsadas = useMemo(
    () => [...filtradas].filter((r) => r.online).sort((a, b) => (a.diasSinConexion ?? 0) - (b.diasSinConexion ?? 0)),
    [filtradas],
  );

  const activas = rows.filter((r) => r.status === "active").length;
  const inactivas = rows.filter((r) => r.online && r.status !== "active").length;
  const apagadas = rows.filter((r) => !r.online).length;

  function handleExportCsv() {
    const csv = toCsv<TerminalActividadRow & { estado: string; diasTexto: string }>(
      filtradas.map((r) => ({ ...r, estado: estadoLabel(r.status, r.online), diasTexto: r.diasSinConexion == null ? "Nunca" : String(r.diasSinConexion) })),
      [
        { key: "empresa", label: "EMPRESA" },
        { key: "alias", label: "TERMINAL" },
        { key: "pos", label: "PUNTO DE VENTA" },
        { key: "estado", label: "ESTADO" },
        { key: "diasTexto", label: "DIAS SIN CONEXION" },
      ],
    );
    downloadCsv(`terminales_actividad_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function handleExportPdf() {
    const alcance = empresasSeleccionadas.size > 0 ? [...empresasSeleccionadas].join(", ") : "Todas las empresas";
    printReport({
      title: "Terminales por Actividad",
      subtitle: `Estado en vivo · ${data?.fecha_peru ?? ""} · ${alcance}`,
      kpis: [
        { label: "Activas", value: String(filtradas.filter((r) => r.status === "active").length) },
        { label: "Inactivas", value: String(filtradas.filter((r) => r.online && r.status !== "active").length) },
        { label: "Apagadas", value: String(filtradas.filter((r) => !r.online).length) },
        { label: "Total", value: String(filtradas.length) },
      ],
      sections: porEmpresa.map((grupo) => ({
        heading: grupo.empresa,
        columns: [
          { label: "Terminal" },
          { label: "Punto de venta" },
          { label: "Estado" },
          { label: "Días sin conexión", align: "right" },
        ],
        rows: grupo.agencias.flatMap((ag) =>
          ag.terminales.map((r) => [
            r.alias,
            r.pos,
            estadoLabel(r.status, r.online),
            r.diasSinConexion == null ? "Nunca" : r.online ? "—" : r.diasSinConexion,
          ]),
        ),
      })),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          type="search"
          placeholder="Buscar terminal o punto de venta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1"
        />
        <Select value={diasFiltro} onChange={(e) => setDiasFiltro(e.target.value)}>
          {DIAS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} /> Actualizar
        </Button>
        <Button variant="secondary" onClick={handleExportCsv} disabled={filtradas.length === 0}>
          <Download size={14} /> CSV
        </Button>
        <Button variant="secondary" onClick={handleExportPdf} disabled={filtradas.length === 0}>
          <Printer size={14} />
          PDF {empresasSeleccionadas.size > 0 ? `(${empresasSeleccionadas.size})` : "(todas)"}
        </Button>
      </div>

      <EmpresaChipSelector
        empresas={empresaBuckets}
        seleccionadas={empresasSeleccionadas}
        onToggle={(e) => setEmpresasSeleccionadas((prev) => toggleInSet(prev, e))}
        onClear={() => setEmpresasSeleccionadas(new Set())}
      />

      {isError ? (
        <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
          Error al consultar WAM
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              badgeBg="bg-positive-tint"
              badgeColor="text-positive"
              label="Activas"
              isLoading={isLoading}
              isError={false}
              value={activas}
              valueColor="text-positive"
              sub="en uso ahora"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>}
            />
            <KpiCard
              badgeBg="bg-amber-tint"
              badgeColor="text-amber"
              label="Inactivas"
              isLoading={isLoading}
              isError={false}
              value={inactivas}
              sub="conectadas, sin uso"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 12h6" /></svg>}
            />
            <KpiCard
              badgeBg="bg-negative-tint"
              badgeColor="text-negative"
              label="Apagadas"
              isLoading={isLoading}
              isError={false}
              value={apagadas}
              valueColor="text-negative"
              sub="desconectadas"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>}
            />
            <KpiCard
              badgeBg="bg-blue-tint"
              badgeColor="text-blue"
              label="Total"
              isLoading={isLoading}
              isError={false}
              value={rows.length}
              valueColor="text-blue"
              sub="terminales en producción"
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
              <div className="mb-3 text-[13px] font-bold text-positive">Conectadas ahora</div>
              <div className="flex flex-col gap-2">
                {masUsadas.slice(0, 10).map((r) => (
                  <div key={r.alias} className="flex items-center justify-between text-[12.5px]">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-t1">{r.alias}</div>
                      <div className="truncate text-[11px] text-t3">{r.pos}</div>
                    </div>
                    <span className={`flex-none rounded-full px-2.5 py-1 text-[10.5px] font-bold ${ESTADO_STYLE[estadoLabel(r.status, r.online)]}`}>
                      {estadoLabel(r.status, r.online)}
                    </span>
                  </div>
                ))}
                {masUsadas.length === 0 && <div className="text-sm text-t3">Ninguna terminal conectada ahora</div>}
              </div>
            </div>

            <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
              <div className="mb-3 text-[13px] font-bold text-negative">Top 10 · más tiempo apagadas</div>
              <div className="flex flex-col gap-2">
                {menosUsadas.map((r) => (
                  <div key={r.alias} className="flex items-center justify-between text-[12.5px]">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-t1">{r.alias}</div>
                      <div className="truncate text-[11px] text-t3">{r.pos}</div>
                    </div>
                    <span className="flex-none font-mono text-[11.5px] text-negative">
                      {r.diasSinConexion == null ? "Nunca conectada" : `${r.diasSinConexion} días`}
                    </span>
                  </div>
                ))}
                {menosUsadas.length === 0 && <div className="text-sm text-t3">Todas conectadas</div>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="rounded-[20px] border border-border bg-surface p-6 text-center text-sm text-t3">
                Cargando…
              </div>
            ) : porEmpresa.length === 0 ? (
              <div className="rounded-[20px] border border-border bg-surface p-6 text-center text-sm text-t3">
                Sin terminales
              </div>
            ) : (
              porEmpresa.map((grupo) => {
                const totalTerminales = grupo.agencias.reduce((n, a) => n + a.terminales.length, 0);
                const activasEmp = grupo.agencias.reduce((n, a) => n + a.terminales.filter((t) => t.status === "active").length, 0);
                const apagadasEmp = grupo.agencias.reduce((n, a) => n + a.terminales.filter((t) => !t.online).length, 0);
                const abierta = forzarAbierto || empresasAbiertas.has(grupo.empresa) || empresasSeleccionadas.has(grupo.empresa);
                return (
                  <div key={grupo.empresa} className="overflow-hidden rounded-[16px] border border-border bg-surface">
                    <button
                      type="button"
                      onClick={() => setEmpresasAbiertas((prev) => toggleInSet(prev, grupo.empresa))}
                      className="flex w-full items-center gap-2 p-[12px_16px] text-left hover:bg-bg"
                    >
                      {abierta ? <ChevronDown size={15} className="text-t3" /> : <ChevronRight size={15} className="text-t3" />}
                      <span className="text-[13px] font-bold text-t1">{grupo.empresa}</span>
                      <span className="ml-auto font-mono text-[11px] text-t3">
                        {grupo.agencias.length} agencia{grupo.agencias.length === 1 ? "" : "s"} · {totalTerminales} term. ·{" "}
                        <span className="text-positive">{activasEmp} activas</span> · <span className="text-negative">{apagadasEmp} apagadas</span>
                      </span>
                    </button>

                    {abierta && (
                      <div className="border-t border-border">
                        {grupo.agencias.map((ag) => {
                          const agAbierta = forzarAbierto || agenciasAbiertas.has(ag.pos);
                          const agActivas = ag.terminales.filter((t) => t.status === "active").length;
                          const agApagadas = ag.terminales.filter((t) => !t.online).length;
                          return (
                            <div key={ag.pos} className="border-t border-border/60 first:border-t-0">
                              <button
                                type="button"
                                onClick={() => setAgenciasAbiertas((prev) => toggleInSet(prev, ag.pos))}
                                className="flex w-full items-center gap-2 p-[9px_16px_9px_34px] text-left hover:bg-bg"
                              >
                                {agAbierta ? <ChevronDown size={13} className="text-t3" /> : <ChevronRight size={13} className="text-t3" />}
                                <span className="text-[12px] font-semibold text-t2">{ag.pos}</span>
                                <span className="ml-auto font-mono text-[10.5px] text-t3">
                                  {ag.terminales.length} term. · {agActivas} activas · {agApagadas} apagadas
                                </span>
                              </button>
                              {agAbierta && (
                                <table className="w-full min-w-[480px] border-collapse text-left text-[12.5px]">
                                  <tbody>
                                    {ag.terminales.map((r) => (
                                      <tr key={r.alias} className="border-t border-border/40">
                                        <td className="whitespace-nowrap px-3 py-1.5 pl-14 font-mono font-semibold text-t1">{r.alias}</td>
                                        <td className="whitespace-nowrap px-3 py-1.5">
                                          <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${ESTADO_STYLE[estadoLabel(r.status, r.online)]}`}>
                                            {estadoLabel(r.status, r.online)}
                                          </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-t2">
                                          {r.diasSinConexion == null ? "Nunca" : r.online ? "—" : r.diasSinConexion}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
