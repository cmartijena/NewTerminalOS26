export interface PrintColumn {
  label: string;
  align?: "left" | "right";
}

export interface PrintSection {
  heading: string;
  columns: PrintColumn[];
  rows: (string | number)[][];
  // Highlights the row visually (e.g. a totals row) — rendered bold with a top border.
  totalRowIndex?: number;
}

export interface PrintKpi {
  label: string;
  value: string;
}

export interface PrintReportOptions {
  title: string;
  subtitle: string;
  kpis?: PrintKpi[];
  sections: PrintSection[];
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Print-to-PDF pattern (matches v1's own "Exportar PDF" buttons, index.html): build a
// standalone branded HTML document and open it in a new tab with a print button — the
// user picks "Guardar como PDF" in the browser's own print dialog. No PDF library
// dependency, and the browser handles pagination/page breaks correctly for free.
export function printReport({ title, subtitle, kpis = [], sections }: PrintReportOptions): void {
  const generado = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });

  const kpisHtml = kpis.length
    ? `<div class="kpis">${kpis
        .map((k) => `<div class="kpi"><div class="kpi-label">${escapeHtml(k.label)}</div><div class="kpi-value">${escapeHtml(k.value)}</div></div>`)
        .join("")}</div>`
    : "";

  const sectionsHtml = sections
    .map((s) => {
      const thead = s.columns
        .map((c) => `<th style="text-align:${c.align ?? "left"}">${escapeHtml(c.label)}</th>`)
        .join("");
      const tbody = s.rows
        .map((row, i) => {
          const isTotal = i === s.totalRowIndex;
          const tds = row
            .map((cell, j) => `<td style="text-align:${s.columns[j]?.align ?? "left"}">${escapeHtml(cell)}</td>`)
            .join("");
          return `<tr class="${isTotal ? "total-row" : ""}">${tds}</tr>`;
        })
        .join("");
      return `
        <div class="section">
          <h2>${escapeHtml(s.heading)}</h2>
          <table>
            <thead><tr>${thead}</tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #26201a; margin: 0; padding: 0; background: #fff; }
  .toolbar { position: sticky; top: 0; background: #26201a; padding: 12px 24px; display: flex; gap: 10px; z-index: 10; }
  .toolbar button { background: #d9622b; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .toolbar button.secondary { background: #4a4038; }
  .page { max-width: 900px; margin: 0 auto; padding: 28px 32px 60px; }
  .header { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 3px solid #d9622b; padding-bottom: 14px; margin-bottom: 6px; }
  .header h1 { font-size: 20px; margin: 0; }
  .company { font-size: 12px; color: #6b5f52; font-weight: 700; letter-spacing: .03em; }
  .subtitle { font-size: 13px; color: #6b5f52; margin: 4px 0 20px; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 22px; }
  .kpi { border: 1px solid #e5dcd1; border-radius: 10px; padding: 10px 12px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color: #8a7c6c; font-weight: 700; }
  .kpi-value { font-family: "Courier New", monospace; font-size: 17px; font-weight: 700; margin-top: 2px; }
  .section { margin-bottom: 26px; }
  .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .03em; color: #d9622b; border-bottom: 1px solid #e5dcd1; padding-bottom: 6px; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #f5efe7; font-size: 10px; text-transform: uppercase; letter-spacing: .02em; color: #6b5f52; padding: 7px 8px; border-bottom: 2px solid #e5dcd1; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0eae1; font-family: "Courier New", monospace; }
  tr.total-row td { font-weight: 700; border-top: 2px solid #26201a; border-bottom: none; }
  .footer { margin-top: 30px; font-size: 10px; color: #a89a89; text-align: right; }
  @media print {
    .toolbar { display: none; }
    .page { padding: 0; max-width: none; }
    /* A whole .section can be much taller than one page (e.g. 90+ rows for one
       empresa) — forcing the entire section to avoid breaking just pushes it onto
       the next page as a block, leaving the previous page mostly blank without
       actually preventing the split (the table is still too tall to fit on one
       page either way). Break at the row level instead: keep individual rows
       intact and repeat the column header on every page the table spans. */
    table { page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    <button class="secondary" onclick="window.close()">Cerrar</button>
  </div>
  <div class="page">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      <div class="company">ELECTRIC LINE PERU S.A.C.</div>
    </div>
    <div class="subtitle">${escapeHtml(subtitle)}</div>
    ${kpisHtml}
    ${sectionsHtml}
    <div class="footer">Generado el ${escapeHtml(generado)} · TerminalOS</div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes e intentá de nuevo.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
