import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { formatCurrency } from "@/utils/formatters";
import { downloadCsv, toCsv } from "@/utils/csv";
import { usePorPos } from "./usePorPos";
import { normalizarFilas, type TicketRow } from "./ticketsWam";
import { printReport } from "./printReport";
import { EmpresaChipSelector } from "./EmpresaChipSelector";

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

type OrdenKey = "cashIn" | "spins" | "grossNet";
const ORDEN_LABEL: Record<OrdenKey, string> = {
  cashIn: "Cash In",
  spins: "Spins",
  grossNet: "Gross Net",
};

interface Props {
  desde: string;
  hasta: string;
}

// "Ranking Tiendas" — which POS (agencia/local) move the most money, and which barely
// move anything. Same por_pos source as Tickets WAM, just re-framed as a ranking instead
// of a plain detail table — mirrors v1's Ranking Juegos tab's top/bottom-N pattern
// (index.html ~line 6985+), applied to tiendas instead of juegos since v1 has no
// equivalent "ranking de tiendas" tab of its own. desde/hasta come from the shared shell
// (see TicketsWamPanel's note on the same 2026-09-12 restructure).
export function RankingTiendasPanel({ desde, hasta }: Props) {
  const [orden, setOrden] = useState<OrdenKey>("cashIn");
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = usePorPos(desde, hasta);
  const todasLasFilas = useMemo(() => (data ? normalizarFilas(data.filas) : []), [data]);
  const empresas = useMemo(() => [...new Set(todasLasFilas.map((r) => r.empresa))].sort(), [todasLasFilas]);
  const rows = useMemo(
    () =>
      empresasSeleccionadas.size > 0
        ? todasLasFilas.filter((r) => empresasSeleccionadas.has(r.empresa))
        : todasLasFilas,
    [todasLasFilas, empresasSeleccionadas],
  );
  const ordenadas = useMemo(() => [...rows].sort((a, b) => b[orden] - a[orden]), [rows, orden]);

  const top10 = ordenadas.slice(0, 10);
  const bottom10 = useMemo(() => [...ordenadas].slice(-10).reverse(), [ordenadas]);
  const maxValor = Math.max(1, ...ordenadas.map((r) => Math.abs(r[orden])));

  const totales = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ cashIn: acc.cashIn + r.cashIn, spins: acc.spins + r.spins }),
        { cashIn: 0, spins: 0 },
      ),
    [rows],
  );

  function formatValor(v: number) {
    return orden === "spins" ? v.toLocaleString("es-PE") : formatCurrency(v);
  }

  function handleExportCsv() {
    const csv = toCsv<TicketRow>(ordenadas, [
      { key: "empresa", label: "EMPRESA" },
      { key: "local", label: "SUCURSAL" },
      { key: "pos", label: "PUNTO DE VENTA" },
      { key: "cashIn", label: "CASH IN" },
      { key: "spins", label: "SPINS" },
      { key: "grossNet", label: "GROSS NET" },
      { key: "rtp", label: "RTP" },
    ]);
    downloadCsv(`ranking_tiendas_${desde}_${hasta}.csv`, csv);
  }

  function handleExportPdf() {
    const alcance = empresasSeleccionadas.size > 0 ? [...empresasSeleccionadas].join(", ") : "Todas las empresas";
    printReport({
      title: "Ranking de Tiendas",
      subtitle: `Del ${desde} al ${hasta} · Ordenado por ${ORDEN_LABEL[orden]} · ${alcance}`,
      kpis: [
        { label: "Cash In Total", value: formatCurrency(totales.cashIn) },
        { label: "Tiendas activas", value: String(ordenadas.length) },
        { label: "Spins Total", value: totales.spins.toLocaleString("es-PE") },
      ],
      sections: [
        {
          heading: "Ranking completo",
          columns: [
            { label: "#", align: "right" },
            { label: "Empresa" },
            { label: "Punto de venta" },
            { label: "Cash In", align: "right" },
            { label: "Spins", align: "right" },
            { label: "Gross Net", align: "right" },
            { label: "RTP", align: "right" },
          ],
          rows: ordenadas.map((r, i) => [
            i + 1,
            r.empresa,
            r.pos,
            formatCurrency(r.cashIn),
            r.spins.toLocaleString("es-PE"),
            formatCurrency(r.grossNet),
            r.rtp,
          ]),
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[12px] font-semibold text-t3">Ordenar por</span>
        <Select value={orden} onChange={(e) => setOrden(e.target.value as OrdenKey)}>
          <option value="cashIn">Cash In</option>
          <option value="spins">Spins</option>
          <option value="grossNet">Gross Net</option>
        </Select>
        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="secondary" onClick={handleExportCsv} disabled={ordenadas.length === 0}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="secondary" onClick={handleExportPdf} disabled={ordenadas.length === 0}>
            <Printer size={14} />
            PDF {empresasSeleccionadas.size > 0 ? `(${empresasSeleccionadas.size})` : "(todas)"}
          </Button>
        </div>
      </div>

      <EmpresaChipSelector
        empresas={empresas}
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiCard
              badgeBg="bg-positive-tint"
              badgeColor="text-positive"
              label="Cash In Total"
              isLoading={isLoading}
              isError={false}
              value={formatCurrency(totales.cashIn)}
              valueColor="text-positive"
              sub="todas las tiendas"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-blue-tint"
              badgeColor="text-blue"
              label="Tiendas activas"
              isLoading={isLoading}
              isError={false}
              value={ordenadas.length}
              valueColor="text-blue"
              sub="con movimiento en el período"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-accent-tint"
              badgeColor="text-accent"
              label="Spins Total"
              isLoading={isLoading}
              isError={false}
              value={totales.spins.toLocaleString("es-PE")}
              sub="todas las tiendas"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="8" rx="2" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
              <div className="mb-3 text-[13px] font-bold text-positive">Top 10 · más movimiento</div>
              <div className="flex flex-col gap-2.5">
                {top10.map((r, i) => (
                  <div key={r.pos}>
                    <div className="mb-1 flex items-center gap-2 text-[12px]">
                      <span className="w-4 flex-none font-mono text-t3">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold text-t1">{r.pos}</span>
                      <span className="font-mono text-t2">{formatValor(r[orden])}</span>
                    </div>
                    <div className="ml-6 h-[5px] overflow-hidden rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full bg-positive"
                        style={{ width: `${(Math.abs(r[orden]) / maxValor) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {top10.length === 0 && <div className="text-sm text-t3">Sin datos</div>}
              </div>
            </div>

            <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
              <div className="mb-3 text-[13px] font-bold text-negative">Bottom 10 · menos movimiento</div>
              <div className="flex flex-col gap-2.5">
                {bottom10.map((r, i) => (
                  <div key={r.pos}>
                    <div className="mb-1 flex items-center gap-2 text-[12px]">
                      <span className="w-4 flex-none font-mono text-t3">{ordenadas.length - i}</span>
                      <span className="flex-1 truncate font-semibold text-t1">{r.pos}</span>
                      <span className="font-mono text-t2">{formatValor(r[orden])}</span>
                    </div>
                    <div className="ml-6 h-[5px] overflow-hidden rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full bg-negative"
                        style={{ width: `${(Math.abs(r[orden]) / maxValor) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {bottom10.length === 0 && <div className="text-sm text-t3">Sin datos</div>}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Punto de venta</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Cash In</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Spins</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Gross Net</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">RTP</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-t3">
                      Cargando…
                    </td>
                  </tr>
                ) : ordenadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-t3">
                      Sin datos para el rango seleccionado
                    </td>
                  </tr>
                ) : (
                  ordenadas.map((r, i) => (
                    <tr key={r.pos} className="border-t border-border">
                      <td className="px-3 py-2.5 font-mono text-t3">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-t2">{r.empresa}</td>
                      <td className="px-3 py-2.5 font-semibold text-t1">{r.pos}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-positive">
                        {formatCurrency(r.cashIn)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t2">
                        {r.spins.toLocaleString("es-PE")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t1">
                        {formatCurrency(r.grossNet)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t3">{r.rtp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
