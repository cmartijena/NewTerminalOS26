import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { MapPin } from "lucide-react";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";
import { isGoogleMapsUrl, parseCoords, resolveGoogleMapsUrl } from "@/utils/ubicacion";
import { TERMINAL_MODELOS } from "@/lib/supabase/types";
import { useCreateSolicitud } from "../hooks/useSolicitudMutations";
import { useAvailableTerminalesByModelo } from "../hooks/useAvailableTerminalesByModelo";

interface Props {
  trigger: ReactNode;
}

// FRANQUICIADO/TECNICO can't create agencias directly, so a new one always starts as a
// request — see NuevaAgenciaData in src/lib/supabase/types.ts and the NUEVA_AGENCIA
// branch of useResponderSolicitud, which is what actually creates the row on approval.
// All fields here are required by the user's own request ("todos los campos
// obligatorios") — this form doesn't offer the select-existing-sucursal cascade
// AgenciaFormDialog has, since a franquiciado requesting a genuinely new location
// doesn't need to browse siblings first; plain text is simpler and sufficient here.
export function SolicitarNuevaAgenciaDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [nombre, setNombre] = useState("");
  const [encargado, setEncargado] = useState("");
  const [celular, setCelular] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cantidadPorModelo, setCantidadPorModelo] = useState<Record<string, string>>({});
  const [ubicacion, setUbicacion] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [ubicacionStatus, setUbicacionStatus] = useState<{ type: "ok" | "error" | "hint"; message: string } | null>(
    null,
  );
  const [resolvingUbicacion, setResolvingUbicacion] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: empresas } = useEmpresas();
  const { data: availableByModelo } = useAvailableTerminalesByModelo();
  const createSolicitud = useCreateSolicitud();

  useEffect(() => {
    if (open) {
      setEmpresaId(empresas?.length === 1 ? empresas[0].id : "");
      setSucursal("");
      setNombre("");
      setEncargado("");
      setCelular("");
      setDireccion("");
      setCantidadPorModelo({});
      setUbicacion("");
      setLat(null);
      setLng(null);
      setUbicacionStatus(null);
      setResolvingUbicacion(false);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleUbicacionChange(value: string) {
    setUbicacion(value);
    const coords = parseCoords(value);
    if (coords) {
      setLat(coords[0]);
      setLng(coords[1]);
      setUbicacionStatus({ type: "ok", message: `✓ ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` });
    } else if (isGoogleMapsUrl(value)) {
      setUbicacionStatus({ type: "hint", message: "Link detectado — click Detectar para resolverlo" });
    } else {
      setLat(null);
      setLng(null);
      setUbicacionStatus(null);
    }
  }

  async function handleDetectarUbicacion() {
    const value = ubicacion.trim();
    if (!value) {
      setUbicacionStatus({ type: "error", message: "Pega un link de Google Maps o coordenadas lat,lng" });
      return;
    }
    const direct = parseCoords(value);
    if (direct) {
      setLat(direct[0]);
      setLng(direct[1]);
      setUbicacionStatus({ type: "ok", message: `✓ ${direct[0].toFixed(6)}, ${direct[1].toFixed(6)}` });
      return;
    }
    if (!isGoogleMapsUrl(value)) {
      setUbicacionStatus({ type: "error", message: "No se reconoce como link de Google Maps ni coordenadas" });
      return;
    }
    setResolvingUbicacion(true);
    try {
      const resolved = await resolveGoogleMapsUrl(value);
      if (resolved) {
        setLat(resolved[0]);
        setLng(resolved[1]);
        setUbicacion(`${resolved[0].toFixed(6)},${resolved[1].toFixed(6)}`);
        setUbicacionStatus({ type: "ok", message: `✓ ${resolved[0].toFixed(6)}, ${resolved[1].toFixed(6)}` });
      } else {
        setUbicacionStatus({
          type: "error",
          message: "No se pudo resolver el link. Copia las coordenadas lat,lng directamente desde Google Maps.",
        });
      }
    } catch {
      setUbicacionStatus({
        type: "error",
        message: "No se pudo resolver el link. Copia las coordenadas lat,lng directamente desde Google Maps.",
      });
    } finally {
      setResolvingUbicacion(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!empresaId) fieldErrors.empresaId = "Requerido";
    if (!sucursal.trim()) fieldErrors.sucursal = "Requerido";
    if (!nombre.trim()) fieldErrors.nombre = "Requerido";
    if (!encargado.trim()) fieldErrors.encargado = "Requerido";
    if (!celular.trim()) fieldErrors.celular = "Requerido";
    if (!direccion.trim()) fieldErrors.direccion = "Requerido";
    if (lat === null || lng === null) fieldErrors.ubicacion = "Detecta la ubicación antes de continuar";

    const terminalesSolicitados = TERMINAL_MODELOS.map((modelo) => ({
      modelo,
      cantidad: parseInt(cantidadPorModelo[modelo] || "0", 10) || 0,
    })).filter((t) => t.cantidad > 0);
    if (terminalesSolicitados.length === 0) {
      fieldErrors.terminales = "Elige al menos un modelo y cantidad";
    }
    for (const t of terminalesSolicitados) {
      const disponibles = availableByModelo?.get(t.modelo) ?? 0;
      if (t.cantidad > disponibles) {
        fieldErrors.terminales = `Solo hay ${disponibles} ${t.modelo} disponible(s)`;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const empresaNombre = empresas?.find((e) => e.id === empresaId)?.nombre ?? "";
    const terminalesDesc = terminalesSolicitados.map((t) => `${t.cantidad}x ${t.modelo}`).join(", ");
    const mensaje = `Nueva agencia "${nombre.trim()}" en ${sucursal.trim().toUpperCase()} (${empresaNombre}) — ${terminalesDesc} | Contacto: ${encargado.trim()} (${celular.trim()})`;

    await createSolicitud.mutateAsync({
      tipo: "NUEVA_AGENCIA",
      mensaje,
      empresa_id: empresaId,
      data: {
        empresa_id: empresaId,
        departamento: sucursal.trim().toUpperCase(),
        nombre: nombre.trim().toUpperCase(),
        encargado: encargado.trim(),
        celular: celular.trim(),
        direccion: direccion.trim(),
        lat,
        lng,
        terminales_solicitados: terminalesSolicitados,
      },
    });

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Solicitar nueva agencia">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sna-empresa">Empresa</Label>
              <Select
                id="sna-empresa"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full !rounded-lg"
              >
                <option value="">Selecciona...</option>
                {empresas?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
              </Select>
              {errors.empresaId && <p className="mt-1 text-xs text-negative">{errors.empresaId}</p>}
            </div>
            <div>
              <Label htmlFor="sna-sucursal">Sucursal</Label>
              <Input
                id="sna-sucursal"
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
                placeholder="Ej: LIMA"
                className="w-full !rounded-lg"
              />
              {errors.sucursal && <p className="mt-1 text-xs text-negative">{errors.sucursal}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="sna-nombre">Nombre de la agencia</Label>
            <Input
              id="sna-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full !rounded-lg"
            />
            {errors.nombre && <p className="mt-1 text-xs text-negative">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sna-encargado">Contacto de la agencia</Label>
              <Input
                id="sna-encargado"
                value={encargado}
                onChange={(e) => setEncargado(e.target.value)}
                placeholder="Nombre completo"
                className="w-full !rounded-lg"
              />
              {errors.encargado && <p className="mt-1 text-xs text-negative">{errors.encargado}</p>}
            </div>
            <div>
              <Label htmlFor="sna-celular">Celular</Label>
              <Input
                id="sna-celular"
                type="tel"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="999 999 999"
                className="w-full !rounded-lg"
              />
              {errors.celular && <p className="mt-1 text-xs text-negative">{errors.celular}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="sna-direccion">Dirección</Label>
            <Input
              id="sna-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full !rounded-lg"
            />
            {errors.direccion && <p className="mt-1 text-xs text-negative">{errors.direccion}</p>}
          </div>

          <div>
            <Label htmlFor="sna-ubicacion">Ubicación (link de Google Maps)</Label>
            <div className="flex gap-1.5">
              <Input
                id="sna-ubicacion"
                value={ubicacion}
                onChange={(e) => handleUbicacionChange(e.target.value)}
                placeholder="Pega el link de Google Maps o lat,lng"
                className="w-full !rounded-lg"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleDetectarUbicacion}
                disabled={resolvingUbicacion}
                className="!h-[42px] flex-none !px-3"
              >
                <MapPin size={14} /> {resolvingUbicacion ? "..." : "Detectar"}
              </Button>
            </div>
            {ubicacionStatus && (
              <p
                className={`mt-1 text-xs ${
                  ubicacionStatus.type === "ok"
                    ? "text-positive"
                    : ubicacionStatus.type === "error"
                      ? "text-negative"
                      : "text-amber"
                }`}
              >
                {ubicacionStatus.message}
              </p>
            )}
            {errors.ubicacion && <p className="mt-1 text-xs text-negative">{errors.ubicacion}</p>}
          </div>

          <div>
            <Label>Terminales solicitadas</Label>
            <div className="overflow-hidden rounded-lg border border-border">
              {TERMINAL_MODELOS.map((modelo, i) => {
                const disponibles = availableByModelo?.get(modelo) ?? 0;
                const hayDisponibles = disponibles > 0;
                return (
                  <div
                    key={modelo}
                    className={`flex items-center justify-between gap-3 px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-t1">{modelo}</div>
                      <div className={`text-[11px] ${hayDisponibles ? "text-t3" : "text-negative"}`}>
                        {hayDisponibles ? `${disponibles} disponible(s)` : "No hay actualmente"}
                      </div>
                    </div>
                    {hayDisponibles && (
                      <Input
                        type="number"
                        min={0}
                        max={disponibles}
                        value={cantidadPorModelo[modelo] ?? ""}
                        onChange={(e) =>
                          setCantidadPorModelo((prev) => ({ ...prev, [modelo]: e.target.value }))
                        }
                        placeholder="0"
                        className="!h-9 w-20 flex-none !rounded-lg text-center"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {errors.terminales && <p className="mt-1 text-xs text-negative">{errors.terminales}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={createSolicitud.isPending}>
              {createSolicitud.isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
