import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Building2, Download, MapPin, Package, Printer } from "lucide-react";
import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTerminales } from "@/features/terminales/hooks/useTerminales";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useTerminalesOnline } from "@/features/dashboard/hooks/useTerminalesOnline";
import { CompanyDistribution } from "@/features/dashboard/components/CompanyDistribution";
import { downloadCsv, toCsv } from "@/utils/csv";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import { EstadosTerminalesCard } from "./components/EstadosTerminalesCard";
import { TerminalesNoDisponiblesCard } from "./components/TerminalesNoDisponiblesCard";
import { TicketsWamPanel } from "./wam/TicketsWamPanel";
import { RankingTiendasPanel } from "./wam/RankingTiendasPanel";
import { RankingJuegosPanel } from "./wam/RankingJuegosPanel";
import { TerminalesActividadPanel } from "./wam/TerminalesActividadPanel";
import { InformeGerencialPanel } from "./wam/InformeGerencialPanel";
import { ReportesSummaryStrip } from "./wam/ReportesSummaryStrip";
import { WamDateRangeFilter } from "./wam/WamDateRangeFilter";
import { usePorPos } from "./wam/usePorPos";
import { usePorJuego } from "./wam/usePorJuego";
import { useReporteOperador } from "./wam/useReporteOperador";
import { normalizarFilas } from "./wam/ticketsWam";
import { normalizarJuegos } from "./wam/rankingJuegos";
import { normalizarActividad } from "./wam/terminalesActividad";
import { printReport } from "./wam/printReport";
import { todayIso } from "./wam/peruDate";

const AREAS = [
  { key: "sistema", label: "📦 Sistema", available: true },
  { key: "dinero", label: "💰 Dinero", available: true },
  { key: "ranking-tiendas", label: "🏪 Ranking Tiendas", available: true },
  { key: "ranking-juegos", label: "🎮 Ranking Juegos", available: true },
  { key: "terminales", label: "📡 Terminales", available: true },
  { key: "gerencial", label: "📊 Informe Gerencial", available: true },
] as const;
type AreaKey = (typeof AREAS)[number]["key"];

// Restructured 2026-09-12 into a master-detail shell per the user's request to centralize
// reports instead of spreading them across independent tabs: a summary strip (always
// visible, whichever area is open) + a side nav (not horizontal tabs) + the selected
// area's full detail. One shared date filter lives here and never resets when switching
// areas — previously each WAM panel (Tickets WAM/Ranking Tiendas/Ranking Juegos) kept its
// own desde/hasta state, so switching lost your selection. "Sistema" and "Terminales"
// don't take a date range (live snapshots), so the filter simply doesn't apply to them.
export function ReportesPage() {
  const [area, setArea] = useState<AreaKey>("sistema");
  const [desde, setDesde] = useState(todayIso());
  const [hasta, setHasta] = useState(todayIso());

  const { data: terminales, isLoading, isError } = useTerminales();
  const { data: agencias } = useVisibleAgencias();
  const { data: empresas } = useVisibleEmpresas();
  const empresaNombreById = useMemo(() => new Map((empresas ?? []).map((e) => [e.id, e.nombre])), [empresas]);

  const noDisponibles = (terminales ?? []).filter((t) => t.estado === "NO DISPONIBLE").length;
  const agenciasPendientes = (agencias ?? []).filter((a) => a.estado === "PENDIENTE").length;

  // Combined export reuses the same queryKeys as each area's own panel — React Query
  // dedupes these against whatever's already cached, so this doesn't trigger extra
  // requests beyond whichever areas haven't been opened yet this session.
  const operador = useReporteOperador(desde, hasta);
  const porPos = usePorPos(desde, hasta);
  const porJuego = usePorJuego(desde, hasta);
  const online = useTerminalesOnline();

  function handleExportCsv() {
    const T = terminales ?? [];
    const A = agencias ?? [];
    const rows = [
      { metrica: "Exportado", valor: new Date().toLocaleString("es-PE") },
      { metrica: "", valor: "" },
      { metrica: "── TERMINALES ──", valor: "" },
      { metrica: "Total", valor: T.length },
      { metrica: "Disponibles", valor: T.filter((t) => t.estado === "DISPONIBLE").length },
      { metrica: "Asignadas", valor: T.filter((t) => t.estado === "ASIGNADO").length },
      { metrica: "En Producción", valor: T.filter((t) => t.estado === "EN PRODUCCION").length },
      { metrica: "No Disponibles", valor: T.filter((t) => t.estado === "NO DISPONIBLE").length },
      { metrica: "En Almacén", valor: T.filter((t) => t.estado === "ALMACEN").length },
      { metrica: "En Traslado", valor: T.filter((t) => t.estado === "EN TRASLADO").length },
      { metrica: "", valor: "" },
      { metrica: "── AGENCIAS ──", valor: "" },
      { metrica: "Total", valor: A.length },
      { metrica: "En Producción", valor: A.filter((a) => a.estado === "EN PRODUCCION").length },
      { metrica: "Pendientes", valor: A.filter((a) => a.estado === "PENDIENTE").length },
      { metrica: "Inactivas", valor: A.filter((a) => a.estado === "INACTIVA").length },
    ];
    const csv = toCsv(rows, [
      { key: "metrica", label: "MÉTRICA" },
      { key: "valor", label: "VALOR" },
    ]);
    downloadCsv(`reporte_sistema_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function handleExportTodoPdf() {
    const tiendas = [...(porPos.data ? normalizarFilas(porPos.data.filas) : [])].sort((a, b) => b.cashIn - a.cashIn);
    const juegos = [...(porJuego.data ? normalizarJuegos(porJuego.data.juegos) : [])].sort((a, b) => b.spins - a.spins);
    const terms = online.data
      ? normalizarActividad(online.data.terminales, (empresas ?? []).map((e) => e.nombre))
      : [];
    const paidTickets = operador.data?.filas[0]?.["Paid tickets"];

    printReport({
      title: "Informe WAM Completo",
      subtitle: `Del ${desde} al ${hasta}`,
      kpis: [
        { label: "Money In", value: operador.data ? formatCurrency(operador.data.total_in) : "—" },
        { label: "Money Out", value: operador.data ? formatCurrency(operador.data.total_out) : "—" },
        { label: "Cash Balance", value: operador.data ? formatCurrency(operador.data.balance) : "—" },
        { label: "Paid Tickets", value: typeof paidTickets === "string" ? paidTickets : "—" },
      ],
      sections: [
        {
          heading: "Ranking Tiendas (top 15)",
          columns: [
            { label: "#", align: "right" },
            { label: "Empresa" },
            { label: "Punto de venta" },
            { label: "Cash In", align: "right" },
            { label: "Spins", align: "right" },
          ],
          rows: tiendas
            .slice(0, 15)
            .map((r, i) => [i + 1, r.empresa, r.pos, formatCurrency(r.cashIn), r.spins.toLocaleString("es-PE")]),
        },
        {
          heading: "Ranking Juegos (top 15)",
          columns: [
            { label: "#", align: "right" },
            { label: "Juego" },
            { label: "Spins", align: "right" },
            { label: "Gross Net", align: "right" },
            { label: "RTP", align: "right" },
          ],
          rows: juegos
            .slice(0, 15)
            .map((r, i) => [i + 1, r.nombre, r.spins.toLocaleString("es-PE"), formatCurrency(r.grossNet), r.rtp]),
        },
        {
          heading: "Terminales — resumen de actividad",
          columns: [
            { label: "Estado" },
            { label: "Cantidad", align: "right" },
          ],
          rows: [
            ["Activas", terms.filter((t) => t.status === "active").length],
            ["Inactivas", terms.filter((t) => t.online && t.status !== "active").length],
            ["Apagadas", terms.filter((t) => !t.online).length],
            ["Total", terms.length],
          ],
        },
      ],
    });
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        meta="Análisis operativo y métricas"
        actions={
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download size={14} /> CSV Sistema
          </Button>
        }
      />

      <div className="flex flex-col gap-4 p-[22px_38px_38px]">
        <WamDateRangeFilter desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }}>
          <Button variant="secondary" onClick={handleExportTodoPdf}>
            <Printer size={14} /> Exportar todo (PDF)
          </Button>
        </WamDateRangeFilter>

        <ReportesSummaryStrip desde={desde} hasta={hasta} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[190px_1fr]">
          <nav className="flex flex-row gap-1 self-start overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
            {AREAS.map((a) => (
              <button
                key={a.key}
                type="button"
                disabled={!a.available}
                title={a.available ? undefined : "Próximamente — requiere la API de WAM (no configurada)"}
                onClick={() => setArea(a.key)}
                className={cn(
                  "flex-none whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-[13px] font-bold transition-colors",
                  !a.available && "cursor-not-allowed text-t3/60",
                  a.available && area === a.key && "bg-accent-tint text-accent",
                  a.available && area !== a.key && "text-t2 hover:bg-bg",
                )}
              >
                {a.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0">
            {area === "sistema" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Link to="/terminales">
                    <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:border-accent/40">
                      <Package className="text-accent" size={20} />
                      <div className="text-[13px] font-bold text-t1">Inventario</div>
                      <div className="text-[11.5px] text-t3">Stock por modelo y estado</div>
                    </Card>
                  </Link>
                  <Link to="/agencias">
                    <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:border-accent/40">
                      <MapPin className="text-accent" size={20} />
                      <div className="text-[13px] font-bold text-t1">Agencias</div>
                      <div className="text-[11.5px] text-t3">Activas, pendientes y bajas</div>
                    </Card>
                  </Link>
                  <Link to="/empresas">
                    <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:border-accent/40">
                      <Building2 className="text-accent" size={20} />
                      <div className="text-[13px] font-bold text-t1">Empresas</div>
                      <div className="text-[11.5px] text-t3">Cobertura por empresa</div>
                    </Card>
                  </Link>
                  <Card className="flex h-full flex-col gap-2 p-4">
                    <AlertTriangle className="text-amber" size={20} />
                    <div className="text-[13px] font-bold text-t1">Alertas</div>
                    <div className="text-[11.5px] text-t3">
                      {noDisponibles} no funcionales · {agenciasPendientes} agencias pendientes
                    </div>
                  </Card>
                </div>

                {isError ? (
                  <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
                    Error al cargar datos
                  </div>
                ) : isLoading ? (
                  <div className="text-sm text-t3">Cargando…</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <EstadosTerminalesCard terminales={terminales ?? []} />
                      <CompanyDistribution />
                    </div>
                    <TerminalesNoDisponiblesCard terminales={terminales ?? []} empresaNombreById={empresaNombreById} />
                  </>
                )}
              </div>
            )}

            {area === "dinero" && <TicketsWamPanel desde={desde} hasta={hasta} />}
            {area === "ranking-tiendas" && <RankingTiendasPanel desde={desde} hasta={hasta} />}
            {area === "ranking-juegos" && <RankingJuegosPanel desde={desde} hasta={hasta} />}
            {area === "terminales" && <TerminalesActividadPanel />}
            {area === "gerencial" && <InformeGerencialPanel />}
          </div>
        </div>
      </div>
    </>
  );
}
