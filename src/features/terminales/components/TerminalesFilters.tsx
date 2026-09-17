import { Input, Select } from "@/components/ui/Input";
import { TERMINAL_ESTADOS } from "@/lib/supabase/types";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";

export interface TerminalesFilterState {
  empresaId: string;
  estado: string;
  modelo: string;
  search: string;
}

interface Props {
  value: TerminalesFilterState;
  onChange: (value: TerminalesFilterState) => void;
}

export function TerminalesFilters({ value, onChange }: Props) {
  const { data: empresas } = useEmpresas();

  return (
    <div className="flex flex-wrap gap-2.5">
      <Input
        placeholder="Código, modelo, empresa, estado..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="min-w-[260px] flex-1"
      />
      <Select
        value={value.empresaId}
        onChange={(e) => onChange({ ...value, empresaId: e.target.value })}
      >
        <option value="">Todas las empresas</option>
        {empresas?.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </Select>
      <Select value={value.estado} onChange={(e) => onChange({ ...value, estado: e.target.value })}>
        <option value="">Todos los estados</option>
        {TERMINAL_ESTADOS.map((estado) => (
          <option key={estado} value={estado}>
            {estado}
          </option>
        ))}
      </Select>
    </div>
  );
}
