import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { AccesoWamEstado } from "@/lib/supabase/types";

function useInvalidateAccesosWam() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["accesos-wam"] });
  };
}

// password is a plain, directly editable field here — unlike agencias' credentials, the
// user explicitly asked to see/edit it freely so it can be shared with the client by
// email (see the note on AccesoWamRow in types.ts).
export interface AccesoWamFormValues {
  cliente: string;
  empresa: string;
  usuario: string;
  password: string;
  correo: string;
  url_wam: string;
  notas: string;
  estado: AccesoWamEstado;
}

function toRow(values: AccesoWamFormValues) {
  return {
    cliente: values.cliente,
    empresa: values.empresa || null,
    usuario: values.usuario,
    password: values.password,
    correo: values.correo || null,
    url_wam: values.url_wam || null,
    notas: values.notas || null,
    estado: values.estado,
  };
}

export function useCreateAccesoWam() {
  const invalidate = useInvalidateAccesosWam();
  return useMutation({
    mutationFn: async (values: AccesoWamFormValues) => {
      const { error } = await supabase.from("accesos_wam").insert(toRow(values));
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateAccesoWam() {
  const invalidate = useInvalidateAccesosWam();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AccesoWamFormValues }) => {
      const { error } = await supabase.from("accesos_wam").update(toRow(values)).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAccesoWam() {
  const invalidate = useInvalidateAccesosWam();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accesos_wam").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
}
