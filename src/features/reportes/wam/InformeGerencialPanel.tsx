import { useMemo } from "react";
import { Building2, MapPin, Package, Printer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { formatCurrency } from "@/utils/formatters";
import { useTerminalesOverview } from "@/hooks/useTerminalesOverview";
import { useVisibleAgencias } from "@/auth/useVisibleAgencias";
import { useVisibleEmpresas } from "@/auth/useVisibleEmpresas";
import { useCompanyDistribution } from "@/features/dashboard/hooks/useCompanyDistribution";
import { usePorPos } from "./usePorPos";
import { usePorJuego } from "./usePorJuego";
import { useReporteOperador } from "./useReporteOperador";
import { normalizarFilas, type TicketRow } from "./ticketsWam";
import { normalizarJuegos } from "./rankingJuegos";
import { todayIso, firstOfMonth, lastOfMonth, firstOfYear, sameDayYearsAgo } from "./peruDate";
import { printReport } from "./printReport";

// Real monthly Money In for this whole business has run in the tens/low hundreds of
// thousands of soles (verified live 2026-09) — a report figure in the tens of trillions
// is WAM's own source data corrupted for that period, not a real number (confirmed live
// 2026-09-13: /api/reporte for a specific 2025 range returned "Money in:
// $88,756,800,000,071,456.00" straight from WAM's own page, reproduced even with
// nocache=1, so it's not a stale cache on our side either). Refusing to display or feed
// a number this size into a % comparison beats fabricating a "corrected" one.
const MONEY_IN_RAZONABLE_MAX = 50_000_000;
function esRazonable(v: number): boolean {
  return Number.isFinite(v) && Math.abs(v) < MONEY_IN_RAZONABLE_MAX;
}

function varPct(actual: number, anterior: number): number | null {
  if (anterior === 0 || !esRazonable(actual) || !esRazonable(anterior)) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function VarBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="font-mono text-[11px] text-t3">— sin base</span>;
  const positivo = value >= 0;
  return (
    <span className={`font-mono text-[11px] font-bold ${positivo ? "text-positive" : "text-negative"}`}>
      {positivo ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function PeriodoCard({
  titulo,
  cashIn,
  grossNet,
  spins,
  isLoading,
  detalleError,
  variacion,
  variacionLabel,
}: {
  titulo: string;
  cashIn: number | undefined;
  grossNet: number;
  spins: number;
  isLoading: boolean;
  detalleError?: boolean;
  variacion?: number | null;
  variacionLabel?: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-[16px_18px]">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-bold uppercase tracking-wide text-t3">{titulo}</div>
        {variacion !== undefined && (
          <div className="flex items-center gap-1 text-[10.5px] text-t3">
            {variacionLabel}
            <VarBadge value={variacion} />
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-bg" />
      ) : cashIn != null && !esRazonable(cashIn) ? (
        <div className="mt-1 text-[13px] font-semibold text-negative">Dato no confiable (WAM)</div>
      ) : (
        <div className="mt-1 font-mono text-[22px] font-bold text-positive">{formatCurrency(cashIn ?? 0)}</div>
      )}
      <div className="mt-2 flex gap-3 text-[11.5px] text-t3">
        {detalleError ? (
          <span className="text-negative">GGR/Spins no disponibles para este rango</span>
        ) : (
          <>
            <span>
              GGR <span className={`font-mono ${grossNet < 0 ? "text-negative" : "text-t2"}`}>{formatCurrency(grossNet)}</span>
            </span>
            <span>
              Spins <span className="font-mono text-t2">{spins.toLocaleString("es-PE")}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Mirrors v1's Informe Gerencial (index.html ~line 7572-7960) — the one Reportes tab with
// no date picker: it always computes 5 fixed periods itself (hoy / mes actual / año
// actual / mes anterior / año anterior "a la fecha") and reports on those, not whatever
// range is selected elsewhere on the page. Money In/Out use the authoritative
// /api/reporte?grouping=operator per period (not summed por_pos — see TicketsWamPanel's
// note on why those two don't reconcile); GGR/spins/RTP promedio (weighted by
// amount_played/amount_won, matching how RTP is actually defined) come from por_pos since
// operator-grouping has no such fields. Deliberately NOT ported: v1's day-by-day trend
// chart — building it needs one por_pos call per day of the month, too expensive for what
// it's worth here; the 5-period comparison already covers the "how are we trending" need.
export function InformeGerencialPanel() {
  const hoy = todayIso();
  const mesDesde = firstOfMonth(0);
  const anioDesde = firstOfYear(0);
  const mesAntDesde = firstOfMonth(1);
  const mesAntHasta = lastOfMonth(1);
  const anioAntDesde = firstOfYear(1);
  const anioAntHasta = sameDayYearsAgo(1);

  const repHoy = useReporteOperador(hoy, hoy);
  const repMes = useReporteOperador(mesDesde, hoy);
  const repAnio = useReporteOperador(anioDesde, hoy);
  const repMesAnt = useReporteOperador(mesAntDesde, mesAntHasta);
  const repAnioAnt = useReporteOperador(anioAntDesde, anioAntHasta);

  const posHoy = usePorPos(hoy, hoy);
  const posMes = usePorPos(mesDesde, hoy);
  const posAnio = usePorPos(anioDesde, hoy);
  const juegosMes = usePorJuego(mesDesde, hoy);

  const overview = useTerminalesOverview();
  const { data: agencias } = useVisibleAgencias();
  const { data: empresas } = useVisibleEmpresas();
  const distribucion = useCompanyDistribution();

  const filasHoy = useMemo(() => (posHoy.data ? normalizarFilas(posHoy.data.filas) : []), [posHoy.data]);
  const filasMes = useMemo(() => (posMes.data ? normalizarFilas(posMes.data.filas) : []), [posMes.data]);
  const filasAnio = useMemo(() => (posAnio.data ? normalizarFilas(posAnio.data.filas) : []), [posAnio.data]);
  const juegosMesRows = useMemo(() => (juegosMes.data ? normalizarJuegos(juegosMes.data.juegos) : []), [juegosMes.data]);

  const mesTotales = useMemo(() => {
    const acc = filasMes.reduce(
      (a, r) => ({
        grossNet: a.grossNet + r.grossNet,
        spins: a.spins + r.spins,
        amountPlayed: a.amountPlayed + r.amountPlayed,
        amountWon: a.amountWon + r.amountWon,
      }),
      { grossNet: 0, spins: 0, amountPlayed: 0, amountWon: 0 },
    );
    const rtpPromedio = acc.amountPlayed > 0 ? (acc.amountWon / acc.amountPlayed) * 100 : null;
    return { ...acc, rtpPromedio };
  }, [filasMes]);

  function sumGrossSpins(filas: TicketRow[]) {
    return filas.reduce((a, r) => ({ grossNet: a.grossNet + r.grossNet, spins: a.spins + r.spins }), { grossNet: 0, spins: 0 });
  }
  const hoyTotales = useMemo(() => sumGrossSpins(filasHoy), [filasHoy]);
  const anioTotales = useMemo(() => sumGrossSpins(filasAnio), [filasAnio]);

  const ordenadasMes = useMemo(() => [...filasMes].sort((a, b) => b.cashIn - a.cashIn), [filasMes]);
  const top5Agencias = ordenadasMes.slice(0, 5);
  const bottom5Agencias = useMemo(() => [...ordenadasMes].slice(-5).reverse(), [ordenadasMes]);
  const top5Juegos = useMemo(() => [...juegosMesRows].sort((a, b) => b.spins - a.spins).slice(0, 5), [juegosMesRows]);

  const cashInPorEmpresa = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filasMes) map.set(r.empresa, (map.get(r.empresa) ?? 0) + r.cashIn);
    return map;
  }, [filasMes]);

  const cobertura = useMemo(() => {
    const agenciasPorEmpresa = new Map<string, number>();
    for (const a of agencias ?? []) {
      if (!a.empresa_id) continue;
      agenciasPorEmpresa.set(a.empresa_id, (agenciasPorEmpresa.get(a.empresa_id) ?? 0) + 1);
    }
    return (distribucion.data ?? [])
      .map((d) => ({
        nombre: d.nombre,
        agencias: agenciasPorEmpresa.get(d.empresaId) ?? 0,
        terminales: d.terminales,
        cashIn: cashInPorEmpresa.get(d.nombre) ?? 0,
      }))
      .sort((a, b) => b.cashIn - a.cashIn);
  }, [distribucion.data, agencias, cashInPorEmpresa]);

  const varMes = varPct(repMes.data?.total_in ?? 0, repMesAnt.data?.total_in ?? 0);
  const varAnio = varPct(repAnio.data?.total_in ?? 0, repAnioAnt.data?.total_in ?? 0);

  function handleExportPdf() {
    printReport({
      title: "Informe Gerencial",
      subtitle: `Generado ${hoy} · Electric Line Perú S.A.C.`,
      kpis: [
        { label: "Empresas", value: String(empresas?.length ?? 0) },
        { label: "Agencias", value: String(agencias?.length ?? 0) },
        { label: "Terminales", value: String(overview.data?.total ?? 0) },
        { label: "En Producción", value: String(overview.data?.enProduccion ?? 0) },
        { label: "Money In Hoy", value: formatCurrency(repHoy.data?.total_in ?? 0) },
        { label: "Money In Mes", value: formatCurrency(repMes.data?.total_in ?? 0) },
        { label: "Money In Año", value: formatCurrency(repAnio.data?.total_in ?? 0) },
        { label: "RTP Promedio (mes)", value: mesTotales.rtpPromedio != null ? `${mesTotales.rtpPromedio.toFixed(2)} %` : "—" },
      ],
      sections: [
        {
          heading: "Cobertura por empresa (mes actual)",
          columns: [
            { label: "Empresa" },
            { label: "Agencias", align: "right" },
            { label: "Terminales", align: "right" },
            { label: "Cash In del mes", align: "right" },
          ],
          rows: cobertura.map((c) => [c.nombre, c.agencias, c.terminales, formatCurrency(c.cashIn)]),
        },
        {
          heading: "Top 5 agencias · mes actual",
          columns: [{ label: "Punto de venta" }, { label: "Cash In", align: "right" }],
          rows: top5Agencias.map((r) => [r.pos, formatCurrency(r.cashIn)]),
        },
        {
          heading: "Bottom 5 agencias · mes actual",
          columns: [{ label: "Punto de venta" }, { label: "Cash In", align: "right" }],
          rows: bottom5Agencias.map((r) => [r.pos, formatCurrency(r.cashIn)]),
        },
        {
          heading: "Top 5 juegos · mes actual",
          columns: [{ label: "Juego" }, { label: "Spins", align: "right" }],
          rows: top5Juegos.map((r) => [r.nombre, r.spins.toLocaleString("es-PE")]),
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="secondary" onClick={handleExportPdf}>
          <Printer size={14} /> Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          badgeBg="bg-accent-tint"
          badgeColor="text-accent"
          label="Empresas"
          isLoading={!empresas}
          isError={false}
          value={empresas?.length ?? 0}
          sub="operadoras activas"
          icon={<Building2 size={19} />}
        />
        <KpiCard
          badgeBg="bg-blue-tint"
          badgeColor="text-blue"
          label="Agencias"
          isLoading={!agencias}
          isError={false}
          value={agencias?.length ?? 0}
          valueColor="text-blue"
          sub="puntos de venta"
          icon={<MapPin size={19} />}
        />
        <KpiCard
          badgeBg="bg-purple-tint"
          badgeColor="text-purple"
          label="Terminales"
          isLoading={overview.isLoading}
          isError={overview.isError}
          value={overview.data?.total ?? 0}
          sub="en el sistema"
          icon={<Package size={19} />}
        />
        <KpiCard
          badgeBg="bg-positive-tint"
          badgeColor="text-positive"
          label="En Producción"
          isLoading={overview.isLoading}
          isError={overview.isError}
          value={overview.data?.enProduccion ?? 0}
          valueColor="text-positive"
          sub="generando ingresos"
          icon={<TrendingUp size={19} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <PeriodoCard
          titulo="Hoy"
          cashIn={repHoy.data?.total_in}
          grossNet={hoyTotales.grossNet}
          spins={hoyTotales.spins}
          isLoading={repHoy.isLoading || posHoy.isLoading}
        />
        <PeriodoCard
          titulo="Mes actual"
          cashIn={repMes.data?.total_in}
          grossNet={mesTotales.grossNet}
          spins={mesTotales.spins}
          isLoading={repMes.isLoading || posMes.isLoading}
          variacion={varMes}
          variacionLabel="vs. mes anterior"
        />
        <PeriodoCard
          titulo="Año actual"
          cashIn={repAnio.data?.total_in}
          grossNet={anioTotales.grossNet}
          spins={anioTotales.spins}
          isLoading={repAnio.isLoading || (posAnio.isLoading && !posAnio.isError)}
          detalleError={posAnio.isError}
          variacion={varAnio}
          variacionLabel="vs. año anterior"
        />
      </div>

      {mesTotales.rtpPromedio != null && (
        <div className="rounded-[16px] border border-border bg-bg p-[10px_16px] text-[12.5px] text-t2">
          RTP promedio del mes:{" "}
          <span className="font-mono font-bold text-t1">{mesTotales.rtpPromedio.toFixed(2)} %</span>
        </div>
      )}

      <div className="rounded-[20px] border border-border bg-surface p-2">
        <div className="p-[10px_14px] text-[13px] font-bold text-t2">Cobertura por empresa · mes actual</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Agencias</th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Terminales</th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Cash In del mes</th>
              </tr>
            </thead>
            <tbody>
              {cobertura.map((c) => (
                <tr key={c.nombre} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold text-t1">{c.nombre}</td>
                  <td className="px-3 py-2 text-right font-mono text-t2">{c.agencias}</td>
                  <td className="px-3 py-2 text-right font-mono text-t2">{c.terminales}</td>
                  <td className="px-3 py-2 text-right font-mono text-positive">{formatCurrency(c.cashIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
          <div className="mb-3 text-[13px] font-bold text-positive">Top 5 · agencias del mes</div>
          <div className="flex flex-col gap-2">
            {top5Agencias.map((r: TicketRow) => (
              <div key={r.pos} className="flex items-center justify-between text-[12px]">
                <span className="truncate font-semibold text-t1">{r.pos}</span>
                <span className="flex-none font-mono text-t2">{formatCurrency(r.cashIn)}</span>
              </div>
            ))}
            {top5Agencias.length === 0 && <div className="text-sm text-t3">Sin datos</div>}
          </div>
        </div>
        <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
          <div className="mb-3 text-[13px] font-bold text-negative">Bottom 5 · agencias del mes</div>
          <div className="flex flex-col gap-2">
            {bottom5Agencias.map((r: TicketRow) => (
              <div key={r.pos} className="flex items-center justify-between text-[12px]">
                <span className="truncate font-semibold text-t1">{r.pos}</span>
                <span className="flex-none font-mono text-t2">{formatCurrency(r.cashIn)}</span>
              </div>
            ))}
            {bottom5Agencias.length === 0 && <div className="text-sm text-t3">Sin datos</div>}
          </div>
        </div>
        <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
          <div className="mb-3 text-[13px] font-bold text-accent">Top 5 · juegos del mes</div>
          <div className="flex flex-col gap-2">
            {top5Juegos.map((r) => (
              <div key={r.codigo} className="flex items-center justify-between text-[12px]">
                <span className="truncate font-semibold text-t1">{r.nombre}</span>
                <span className="flex-none font-mono text-t2">{r.spins.toLocaleString("es-PE")}</span>
              </div>
            ))}
            {top5Juegos.length === 0 && <div className="text-sm text-t3">Sin datos</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
