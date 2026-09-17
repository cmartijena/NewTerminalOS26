import { supabase } from "./client";

// Same bucket v1 already uploads to (index.html ~line 5154, subirFotoStorage) — existing
// agencia photos already visible across the app came from here, so this reuses the same
// bucket/path convention rather than introducing a second one.
const AGENCIAS_FOTOS_BUCKET = "agencias-fotos";

export async function uploadAgenciaFoto(file: File, agenciaId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${agenciaId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(AGENCIAS_FOTOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.warn("Storage error:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(AGENCIAS_FOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
