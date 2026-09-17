import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { formatCurrency } from "@/utils/formatters";
import { downloadCsv, toCsv } from "@/utils/csv";
import { usePorJuego } from "./usePorJuego";
import { normalizarJuegos, type JuegoRow } from "./rankingJuegos";
import { printReport } from "./printReport";

type OrdenKey = "spins" | "cashIn" | "grossNet";
const ORDEN_LABEL: Record<OrdenKey, string> = { spins: "Spins", cashIn: "Cash In", grossNet: "Gross Net" };

interface Props {
  desde: string;
  hasta: string;
}

// Mirrors v1's Ranking Juegos tab (index.html ~line 6985-7100+) — a per-game snapshot for
// a date range from /api/reporte/por_juego. Same top/bottom-10 + full table shape as v1;
// the "Actividad" column is always scaled by spins specifically (v1's own choice),
// independent of whatever "ordenar por" the user picked. desde/hasta come from the shared
// shell (see TicketsWamPanel's note on the same 2026-09-12 restructure).
export function RankingJuegosPanel({ desde, hasta }: Props) {
  const [orden, setOrden] = useState<OrdenKey>("spins");

  const { data, isLoading, isError } = usePorJuego(desde, hasta);
  const rows = useMemo(() => (data ? normalizarJuegos(data.juegos) : []), [data]);
  const ordenadas = useMemo(() => [...rows].sort((a, b) => b[orden] - a[orden]), [rows, orden]);

  const top10 = ordenadas.slice(0, 10);
  const bottom10 = useMemo(() => [...ordenadas].slice(-10).reverse(), [ordenadas]);
  const maxValor = Math.max(1, ...ordenadas.map((r) => Math.abs(r[orden])));
  const maxSpins = Math.max(1, ...rows.map((r) => r.spins));

  const totales = useMemo(
    () => rows.reduce((acc, r) => ({ spins: acc.spins + r.spins, grossNet: acc.grossNet + r.grossNet }), { spins: 0, grossNet: 0 }),
    [rows],
  );

  function formatValor(v: number) {
    return orden === "cashIn" || orden === "grossNet" ? formatCurrency(v) : v.toLocaleString("es-PE");
  }

  function handleExportCsv() {
    const csv = toCsv<JuegoRow>(ordenadas, [
      { key: "nombre", label: "JUEGO" },
      { key: "codigo", label: "CODIGO WAM" },
      { key: "spins", label: "SPINS" },
      { key: "cashIn", label: "CASH IN" },
      { key: "grossNet", label: "GROSS NET" },
      { key: "rtp", label: "RTP" },
    ]);
    downloadCsv(`ranking_juegos_${desde}_${hasta}.csv`, csv);
  }

  function handleExportPdf() {
    printReport({
      title: "Ranking de Juegos",
      subtitle: `Del ${desde} al ${hasta} · Ordenado por ${ORDEN_LABEL[orden]}`,
      kpis: [
        { label: "Total Spins", value: totales.spins.toLocaleString("es-PE") },
        { label: "Juegos activos", value: String(ordenadas.length) },
        { label: "Gross Net Total", value: formatCurrency(totales.grossNet) },
      ],
      sections: [
        {
          heading: "Ranking completo",
          columns: [
            { label: "#", align: "right" },
            { label: "Juego" },
            { label: "Código WAM" },
            { label: "Spins", align: "right" },
            { label: "Cash In", align: "right" },
            { label: "Gross Net", align: "right" },
            { label: "RTP", align: "right" },
          ],
          rows: ordenadas.map((r, i) => [
            i + 1,
            r.nombre,
            r.codigo,
            r.spins.toLocaleString("es-PE"),
            formatCurrency(r.cashIn),
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
          <option value="spins">Spins</option>
          <option value="cashIn">Cash In</option>
          <option value="grossNet">Gross Net</option>
        </Select>
        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="secondary" onClick={handleExportCsv} disabled={ordenadas.length === 0}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="secondary" onClick={handleExportPdf} disabled={ordenadas.length === 0}>
            <Printer size={14} /> PDF
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-[20px] border border-border bg-surface p-6 text-sm text-negative">
          Error al consultar WAM
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiCard
              badgeBg="bg-blue-tint"
              badgeColor="text-blue"
              label="Total Spins"
              isLoading={isLoading}
              isError={false}
              value={totales.spins.toLocaleString("es-PE")}
              valueColor="text-blue"
              sub="todos los juegos"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="8" rx="2" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-purple-tint"
              badgeColor="text-purple"
              label="Juegos activos"
              isLoading={isLoading}
              isError={false}
              value={ordenadas.length}
              sub="con spins en el período"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-accent-tint"
              badgeColor="text-accent"
              label="Gross Net Total"
              isLoading={isLoading}
              isError={false}
              value={formatCurrency(totales.grossNet)}
              valueColor={totales.grossNet < 0 ? "text-negative" : "text-t1"}
              sub="todos los juegos"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
              <div className="mb-3 text-[13px] font-bold text-positive">Top 10 · más jugados</div>
              <div className="flex flex-col gap-2.5">
                {top10.map((r, i) => (
                  <div key={r.codigo}>
                    <div className="mb-1 flex items-center gap-2 text-[12px]">
                      <span className="w-4 flex-none font-mono text-t3">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold text-t1">{r.nombre}</span>
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
              <div className="mb-3 text-[13px] font-bold text-negative">Bottom 10 · menos utilizados</div>
              <div className="flex flex-col gap-2.5">
                {bottom10.map((r, i) => (
                  <div key={r.codigo}>
                    <div className="mb-1 flex items-center gap-2 text-[12px]">
                      <span className="w-4 flex-none font-mono text-t3">{ordenadas.length - i}</span>
                      <span className="flex-1 truncate font-semibold text-t1">{r.nombre}</span>
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
            <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">#</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Juego</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Código WAM</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Spins</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Cash In</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Gross Net</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">RTP</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Actividad</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-t3">
                      Cargando…
                    </td>
                  </tr>
                ) : ordenadas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-t3">
                      Sin datos para el rango seleccionado
                    </td>
                  </tr>
                ) : (
                  ordenadas.map((r, i) => (
                    <tr key={r.codigo} className="border-t border-border">
                      <td className="px-3 py-2.5 font-mono text-t3">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-t1">{r.nombre}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-t3">{r.codigo}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t2">
                        {r.spins.toLocaleString("es-PE")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-positive">
                        {formatCurrency(r.cashIn)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t1">
                        {formatCurrency(r.grossNet)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t3">{r.rtp}</td>
                      <td className="px-3 py-2.5">
                        <div className="h-[6px] w-24 overflow-hidden rounded-full bg-border/50">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${(r.spins / maxSpins) * 100}%` }}
                          />
                        </div>
                      </td>
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
