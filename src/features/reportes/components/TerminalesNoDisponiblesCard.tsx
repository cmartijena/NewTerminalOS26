import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import type { TerminalListItem } from "@/features/terminales/hooks/useTerminales";

interface Props {
  terminales: TerminalListItem[];
  empresaNombreById: Map<string, string>;
}

// Mirrors v1's Reportes → Sistema → "Terminales No Disponibles" (index.html ~line
// 4559-4560) — the one genuinely actionable piece of this tab (everything else is a
// read-only breakdown already covered, in part, by Dashboard).
export function TerminalesNoDisponiblesCard({ terminales, empresaNombreById }: Props) {
  const noDisponibles = terminales.filter((t) => t.estado === "NO DISPONIBLE");

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 text-[13px] font-bold text-t2">
        Terminales no disponibles
      </div>
      {noDisponibles.length === 0 ? (
        <div className="p-6 text-center text-sm text-t3">Sin terminales no disponibles ✓</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
            <thead>
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Código</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Modelo</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Empresa</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-t3">Agencia</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-t3">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {noDisponibles.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-accent">{t.codigo}</td>
                  <td className="px-4 py-2.5 text-t2">{t.modelo ?? "—"}</td>
                  <td className="px-4 py-2.5 text-t2">
                    {t.empresaId ? (empresaNombreById.get(t.empresaId) ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-t2">{t.agenciaNombre ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to="/terminales" className="text-[12px] font-semibold text-blue hover:underline">
                      Gestionar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
