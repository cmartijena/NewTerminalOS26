import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

function useInvalidateEmpresas() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["empresas"] });
  };
}

export function useCreateEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: async (nombre: string) => {
      // v1 (index.html ~line 2570) writes the same value to both name columns on
      // creation and never diverges them again — mirrored here, not just on insert.
      // Unlike v1, `activo` must be set explicitly: the real column is NOT NULL with no
      // default (confirmed by a failed insert during testing), so v1's own insert would
      // fail against this schema too if it ever tried it for real.
      const { error } = await supabase
        .from("empresas")
        .insert({ razon_social: nombre, nombre_comercial: nombre, activo: true });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const { error } = await supabase
        .from("empresas")
        .update({ razon_social: nombre, nombre_comercial: nombre })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

// Soft-delete: agencias/terminales carry an empresa_id FK, so a hard DELETE risks
// orphaning them. Matches the `activo` flag useEmpresas() already filters on.
export function useDeactivateEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("empresas").update({ activo: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
