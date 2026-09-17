import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { formatCurrency } from "@/utils/formatters";
import { downloadCsv, toCsv } from "@/utils/csv";
import { usePorPos } from "./usePorPos";
import { useReporteOperador } from "./useReporteOperador";
import { normalizarFilas, type TicketRow } from "./ticketsWam";
import { printReport } from "./printReport";
import { EmpresaChipSelector } from "./EmpresaChipSelector";

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const BAR_COLORS = ["var(--accent-strong)", "var(--blue)", "var(--purple)", "var(--amber)", "var(--negative)"];

interface Props {
  desde: string;
  hasta: string;
}

// Mirrors v1's Tickets WAM tab (index.html ~line 6715-6871) — a per-POS breakdown for a
// date range, sourced entirely from /api/reporte/por_pos. v1 also has a print-window PDF
// export alongside CSV; that's deliberately not ported here (a much lower-value, hacky
// pattern) — CSV covers the same "get this data out" need.
//
// desde/hasta now come from the shared shell (ReportesPage) instead of local state —
// restructured 2026-09-12 so the date range persists across areas instead of resetting
// every time the user switches what they're looking at.
export function TicketsWamPanel({ desde, hasta }: Props) {
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = usePorPos(desde, hasta);
  const rows = useMemo(() => (data ? normalizarFilas(data.filas) : []), [data]);

  const empresas = useMemo(() => [...new Set(rows.map((r) => r.empresa))].sort(), [rows]);
  const filtradas = useMemo(
    () => (empresasSeleccionadas.size > 0 ? rows.filter((r) => empresasSeleccionadas.has(r.empresa)) : rows),
    [rows, empresasSeleccionadas],
  );
  const ordenadas = useMemo(() => [...filtradas].sort((a, b) => b.cashIn - a.cashIn), [filtradas]);

  // Authoritative Money in/out/Cash balance/Paid tickets for the KPI row — deliberately
  // NOT derived by summing por_pos rows. Verified live 2026-09-09 against the real WAM
  // admin UI: summing por_pos's Cash In matches Money in exactly, but summing its
  // Ticket out/Gross net does NOT match this report's Money out/Cash balance — WAM's two
  // report groupings (por_pos vs operator) just don't reconcile 1:1 on those fields. This
  // is what the per-empresa/per-POS breakdown below is for instead (real operational
  // detail, not meant to re-derive this summary).
  const operador = useReporteOperador(desde, hasta);
  const paidTickets = operador.data?.filas[0]?.["Paid tickets"];
  const paidTicketsNum = typeof paidTickets === "string" ? Number(paidTickets) : undefined;

  const porEmpresa = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtradas) map.set(r.empresa, (map.get(r.empresa) ?? 0) + r.cashIn);
    const max = Math.max(1, ...map.values());
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([empresa, cashIn]) => ({ empresa, cashIn, pct: Math.round((cashIn / max) * 100) }));
  }, [filtradas]);

  function handleExportCsv() {
    const csv = toCsv<TicketRow>(ordenadas, [
      { key: "empresa", label: "EMPRESA" },
      { key: "local", label: "SUCURSAL" },
      { key: "pos", label: "PUNTO DE VENTA" },
      { key: "cashIn", label: "CASH IN" },
      { key: "spins", label: "SPINS" },
      { key: "ticketOut", label: "TICKET OUT" },
      { key: "grossIn", label: "GROSS IN" },
      { key: "grossOut", label: "GROSS OUT" },
      { key: "grossNet", label: "GROSS NET" },
      { key: "rtp", label: "RTP" },
    ]);
    downloadCsv(`tickets_wam_${desde}_${hasta}.csv`, csv);
  }

  function handleExportPdf() {
    const alcance = empresasSeleccionadas.size > 0 ? [...empresasSeleccionadas].join(", ") : "Todas las empresas";
    printReport({
      title: "Tickets WAM",
      subtitle: `Del ${desde} al ${hasta} · ${alcance}`,
      kpis: [
        { label: "Money In", value: operador.data ? formatCurrency(operador.data.total_in) : "—" },
        { label: "Money Out", value: operador.data ? formatCurrency(operador.data.total_out) : "—" },
        { label: "Cash Balance", value: operador.data ? formatCurrency(operador.data.balance) : "—" },
        { label: "Paid Tickets", value: paidTicketsNum != null ? String(paidTicketsNum) : "—" },
      ],
      sections: [
        {
          heading: "Detalle por punto de venta",
          columns: [
            { label: "Empresa" },
            { label: "Sucursal" },
            { label: "Punto de venta" },
            { label: "Cash In", align: "right" },
            { label: "Spins", align: "right" },
            { label: "Ticket Out", align: "right" },
            { label: "Gross Net", align: "right" },
            { label: "RTP", align: "right" },
          ],
          rows: ordenadas.map((r) => [
            r.empresa,
            r.local,
            r.pos,
            formatCurrency(r.cashIn),
            r.spins.toLocaleString("es-PE"),
            formatCurrency(r.ticketOut),
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
        <EmpresaChipSelector
          empresas={empresas}
          seleccionadas={empresasSeleccionadas}
          onToggle={(e) => setEmpresasSeleccionadas((prev) => toggleInSet(prev, e))}
          onClear={() => setEmpresasSeleccionadas(new Set())}
        />
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
              label="Money In"
              isLoading={operador.isLoading || !operador.data}
              isError={operador.isError}
              value={operador.data ? formatCurrency(operador.data.total_in) : undefined}
              valueColor="text-positive"
              sub="ingresos del período"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-negative-tint"
              badgeColor="text-negative"
              label="Money Out"
              isLoading={operador.isLoading || !operador.data}
              isError={operador.isError}
              value={operador.data ? formatCurrency(operador.data.total_out) : undefined}
              valueColor="text-negative"
              sub="pagado en el período"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-accent-tint"
              badgeColor="text-accent"
              label="Cash Balance"
              isLoading={operador.isLoading || !operador.data}
              isError={operador.isError}
              value={operador.data ? formatCurrency(operador.data.balance) : undefined}
              valueColor={operador.data && operador.data.balance < 0 ? "text-negative" : "text-t1"}
              sub="resultado neto"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              }
            />
            <KpiCard
              badgeBg="bg-blue-tint"
              badgeColor="text-blue"
              label="Paid Tickets"
              isLoading={operador.isLoading || !operador.data}
              isError={operador.isError}
              value={paidTicketsNum ?? "—"}
              valueColor="text-blue"
              sub="tickets pagados"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="8" width="18" height="8" rx="2" />
                </svg>
              }
            />
          </div>

          {porEmpresa.length > 0 && (
            <div className="rounded-[20px] border border-border bg-surface p-[18px_20px]">
              <div className="mb-3 text-[13px] font-bold text-t2">Cash In por empresa</div>
              <div className="flex flex-col gap-3">
                {porEmpresa.map((e, i) => (
                  <div key={e.empresa}>
                    <div className="mb-1 flex items-center gap-2 text-[12.5px]">
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                      <span className="flex-1 font-semibold text-t1">{e.empresa}</span>
                      <span className="font-mono text-t2">{formatCurrency(e.cashIn)}</span>
                    </div>
                    <div className="ml-4 h-[6px] overflow-hidden rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${e.pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-[20px] border border-border bg-surface p-2">
            <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Sucursal</th>
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Punto de venta</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Cash In</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Spins</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Ticket Out</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">Gross Net</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">RTP</th>
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
                  ordenadas.map((r) => (
                    <tr key={r.pos} className="border-t border-border">
                      <td className="whitespace-nowrap px-3 py-2.5 text-t2">{r.empresa}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-t2">{r.local}</td>
                      <td className="px-3 py-2.5 font-semibold text-t1">{r.pos}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-positive">
                        {formatCurrency(r.cashIn)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-t2">
                        {r.spins.toLocaleString("es-PE")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-negative">
                        {formatCurrency(r.ticketOut)}
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
