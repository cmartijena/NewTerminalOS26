import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { Camera, Eye, EyeOff, MapPin, RotateCw, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { AGENCIA_ESTADOS, EGM_ROLES, type AgenciaEstado, type AgenciaRow } from "@/lib/supabase/types";
import { useVisibleEmpresas as useEmpresas } from "@/auth/useVisibleEmpresas";
import { useAgencias } from "@/hooks/useAgencias";
import { generatePassword, generateUsuario } from "@/utils/credentials";
import { isGoogleMapsUrl, parseCoords, resolveGoogleMapsUrl } from "@/utils/ubicacion";
import { fechaToSortable } from "@/utils/fecha";
import { uploadAgenciaFoto } from "@/lib/supabase/storage";
import { EstadoPill } from "@/components/domain/EstadoPill";
import { useTerminales } from "@/features/terminales/hooks/useTerminales";
import { useBulkAsignarAgencia } from "@/features/terminales/hooks/useTerminalMutations";
import {
  useCreateAgencia,
  useSetAgenciaFoto,
  useUpdateAgencia,
  type AgenciaFormValues,
} from "../hooks/useAgenciaMutations";

const agenciaSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  empresa_id: z.string().min(1, "Requerido"),
  departamento: z.string(),
  direccion: z.string(),
  encargado: z.string(),
  celular: z.string(),
  correo: z.string(),
  pos: z.string(),
  estado: z.enum(AGENCIA_ESTADOS),
  lat: z.string(),
  lng: z.string(),
  fecha_inicio: z.string(),
  fecha_pausa: z.string(),
  fecha_baja: z.string(),
});

type FormState = z.infer<typeof agenciaSchema>;

function emptyForm(): FormState {
  return {
    nombre: "",
    empresa_id: "",
    departamento: "",
    direccion: "",
    encargado: "",
    celular: "",
    correo: "",
    pos: "",
    estado: "PENDIENTE",
    lat: "",
    lng: "",
    fecha_inicio: "",
    fecha_pausa: "",
    fecha_baja: "",
  };
}

function toFormState(a: AgenciaRow): FormState {
  return {
    nombre: a.nombre,
    empresa_id: a.empresa_id ?? "",
    departamento: a.departamento ?? "",
    direccion: a.direccion ?? "",
    encargado: a.encargado ?? "",
    celular: a.celular ?? "",
    correo: a.correo ?? "",
    pos: a.pos ?? "",
    estado: a.estado,
    lat: a.lat != null ? String(a.lat) : "",
    lng: a.lng != null ? String(a.lng) : "",
    fecha_inicio: fechaToSortable(a.fecha_inicio) ?? "",
    fecha_pausa: fechaToSortable(a.fecha_pausa) ?? "",
    fecha_baja: fechaToSortable(a.fecha_baja) ?? "",
  };
}

// A select of existing values (sucursal or nombre de agencia) with a trailing "+ Agregar
// nueva..." option that swaps to a free-text input — mirrors v1's ca-suc-sel/ca-sub-sel
// cascade (index.html ~line 5308-5357): pick an existing sucursal/subagencia so typos
// don't fork a name that should be the same one, or add a new one when it's genuinely new.
function SelectOrNewField({
  label,
  options,
  value,
  mode,
  onModeChange,
  onValueChange,
  placeholder,
  disabledHint,
}: {
  label: string;
  options: string[];
  value: string;
  mode: "select" | "new";
  onModeChange: (mode: "select" | "new") => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabledHint?: string;
}) {
  const showSelect = mode === "select" && options.length > 0;

  return (
    <div>
      <Label>{label}</Label>
      {showSelect ? (
        <Select
          value={value}
          onChange={(e) => {
            if (e.target.value === "__NUEVA__") {
              onModeChange("new");
              onValueChange("");
            } else {
              onValueChange(e.target.value);
            }
          }}
          className="w-full !rounded-lg"
        >
          <option value="">Selecciona...</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="__NUEVA__">+ Agregar nueva...</option>
        </Select>
      ) : (
        <div className="flex gap-1.5">
          <Input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={disabledHint ?? placeholder}
            disabled={!!disabledHint}
            className="w-full !rounded-lg"
          />
          {options.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onModeChange("select");
                onValueChange("");
              }}
              className="flex-none whitespace-nowrap text-[11px] font-semibold text-blue"
            >
              usar existente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  agencia?: AgenciaRow;
  trigger: ReactNode;
}

export function AgenciaFormDialog({ agencia, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Only used in create mode — see SelectOrNewField above.
  const [sucursalMode, setSucursalMode] = useState<"select" | "new">("new");
  const [nombreMode, setNombreMode] = useState<"select" | "new">("new");
  // "Sin correo" opt-out — create mode only, mirrors v1's ca-nocorreo checkbox
  // (index.html ~line 1791/5422). Not a DB column, purely relaxes the required-field
  // check in handleSubmit below.
  const [sinCorreo, setSinCorreo] = useState(false);
  // WAM/EGM access credentials — used in both modes, but with different meaning:
  // create auto-generates and always sends both; edit prefills usuario/rol from the real
  // agencia and only ever sends `password` if "Regenerar" was clicked this session (an
  // empty `password` in edit mode means "leave the current one untouched" — it can never
  // be read back to begin with, see useAgenciaMutations.ts).
  const [usuario, setUsuario] = useState("");
  const [rol, setRol] = useState<string>(EGM_ROLES[0]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Edit mode only — true once "Regenerar" has been clicked this session, so the UI can
  // tell "showing the real current password" apart from "showing a fresh one about to
  // replace it" (both render in the same `password` field now that it's readable).
  const [passwordRegenerated, setPasswordRegenerated] = useState(false);
  // "Ubicación" convenience field — paste a Google Maps link (or raw "lat,lng") and it
  // fills Latitud/Longitud below. Not itself persisted; see src/utils/ubicacion.ts.
  const [ubicacion, setUbicacion] = useState("");
  const [ubicacionStatus, setUbicacionStatus] = useState<{
    type: "ok" | "error" | "hint";
    message: string;
  } | null>(null);
  const [resolvingUbicacion, setResolvingUbicacion] = useState(false);
  // Photo — file picked locally (create and edit), previewed via FileReader before it's
  // ever uploaded. Upload itself only happens in handleSubmit, after the row exists (see
  // useCreateAgencia's comment for why create needs the row's real id first).
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [fotoRemoved, setFotoRemoved] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  // "Terminales a asignar" picker — create mode only, mirrors v1's ca-t-search/ca-t-list
  // (index.html ~line 1848-1859, filterCaTerminales()/caTermToggle()).
  const [terminalSearch, setTerminalSearch] = useState("");
  const [selectedTerminalIds, setSelectedTerminalIds] = useState<Set<string>>(new Set());

  const { data: empresas } = useEmpresas();
  const { data: allAgencias } = useAgencias();
  const { data: terminales } = useTerminales();
  const createAgencia = useCreateAgencia();
  const updateAgencia = useUpdateAgencia();
  const setAgenciaFoto = useSetAgenciaFoto();
  const bulkAsignarAgencia = useBulkAsignarAgencia();
  const isPending = createAgencia.isPending || updateAgencia.isPending || uploadingFoto;

  useEffect(() => {
    if (open) {
      setForm(agencia ? toFormState(agencia) : emptyForm());
      setErrors({});
      setSucursalMode("new");
      setNombreMode("new");
      setSinCorreo(false);
      setUsuario(agencia?.usuario ?? "");
      setRol(agencia?.rol ?? EGM_ROLES[0]);
      setPassword(agencia?.password ?? "");
      setShowPassword(false);
      setPasswordRegenerated(false);
      setUbicacion("");
      setUbicacionStatus(null);
      setResolvingUbicacion(false);
      setFotoFile(null);
      setFotoPreviewUrl(agencia?.foto_url ?? null);
      setFotoRemoved(false);
      setUploadingFoto(false);
      setTerminalSearch("");
      setSelectedTerminalIds(new Set());
    }
  }, [open, agencia]);

  // Only free terminales (unassigned + DISPONIBLE/ALMACEN) are offered — matches v1's
  // filterCaTerminales() exactly (index.html ~line 5170-5172).
  const availableTerminales = useMemo(() => {
    const q = terminalSearch.trim().toLowerCase();
    return (terminales ?? []).filter((t) => {
      if (t.agenciaId) return false;
      if (t.estado !== "DISPONIBLE" && t.estado !== "ALMACEN") return false;
      if (!q) return true;
      return t.codigo.toLowerCase().includes(q) || (t.modelo ?? "").toLowerCase().includes(q);
    });
  }, [terminales, terminalSearch]);

  function toggleTerminal(id: string) {
    setSelectedTerminalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setFotoPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleFotoRemove() {
    setFotoFile(null);
    setFotoPreviewUrl(null);
    setFotoRemoved(true);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  }

  function handleUbicacionChange(value: string) {
    setUbicacion(value);
    const coords = parseCoords(value);
    if (coords) {
      setForm((f) => ({ ...f, lat: coords[0].toFixed(6), lng: coords[1].toFixed(6) }));
      setUbicacionStatus({ type: "ok", message: `✓ ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` });
    } else if (isGoogleMapsUrl(value)) {
      setUbicacionStatus({ type: "hint", message: "Link detectado — click Detectar para resolverlo" });
    } else {
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
      setForm((f) => ({ ...f, lat: direct[0].toFixed(6), lng: direct[1].toFixed(6) }));
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
        setForm((f) => ({ ...f, lat: resolved[0].toFixed(6), lng: resolved[1].toFixed(6) }));
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

  // Auto-generate POS as "EMPRESA SUCURSAL - AG## - NOMBRE" once empresa/sucursal/nombre
  // are all set — mirrors v1's updIdSub() (index.html ~line 5404-5421), including that it
  // keeps recomputing (and so overwrites any manual edit) whenever one of those three
  // changes. Create mode only; editing an existing agencia never touches its own POS.
  //
  // DADA DE BAJA gets its own correlativo sequence, separate from every other estado —
  // user request 2026-09-07: a new agencia created already DADA DE BAJA shouldn't consume
  // the next number in the active lineup (PENDIENTE/EN PRODUCCION/INACTIVA), since it was
  // never really part of it. Also depends on form.estado now, so switching the estado
  // dropdown before saving recomputes which pool it counts against.
  useEffect(() => {
    if (agencia || !open) return;
    if (!form.empresa_id || !form.departamento || !form.nombre) return;
    const empresaNombre = empresas?.find((e) => e.id === form.empresa_id)?.nombre ?? "";
    const mismoGrupo = form.estado === "DADA DE BAJA" ? (e: AgenciaEstado) => e === "DADA DE BAJA" : (e: AgenciaEstado) => e !== "DADA DE BAJA";
    const existing = (allAgencias ?? []).filter(
      (a) => a.empresa_id === form.empresa_id && a.departamento === form.departamento && mismoGrupo(a.estado),
    ).length;
    const correlativo = String(existing + 1).padStart(2, "0");
    const pos = `${empresaNombre} ${form.departamento} - AG${correlativo} - ${form.nombre}`;
    setForm((f) => (f.pos === pos ? f : { ...f, pos }));
  }, [agencia, open, form.empresa_id, form.departamento, form.nombre, form.estado, empresas, allAgencias]);

  // Auto-fill USUARIO the first time empresa/sucursal/nombre are all set — only if still
  // empty, so it never clobbers a manual edit (mirrors v1's updIdSub(), which does the
  // same "if empty" guard for ca-usr, unlike POS which always recomputes). PASSWORD is
  // deliberately NOT auto-filled here — v1 only generates it via the "Regenerar" button or
  // at submit time if still blank (see handleSubmit).
  useEffect(() => {
    if (agencia || !open || usuario) return;
    if (!form.empresa_id || !form.departamento || !form.nombre) return;
    const empresaNombre = empresas?.find((e) => e.id === form.empresa_id)?.nombre ?? "";
    setUsuario(generateUsuario(empresaNombre, form.departamento, form.nombre));
  }, [agencia, open, usuario, form.empresa_id, form.departamento, form.nombre, empresas]);

  function handleRegenerarAcceso() {
    const empresaNombre = empresas?.find((e) => e.id === form.empresa_id)?.nombre ?? "";
    setUsuario(generateUsuario(empresaNombre, form.departamento, form.nombre));
    setPassword(generatePassword());
  }

  // password is readable now (see AgenciaRow), but regenerating is still offered as a
  // quick way to rotate it — generates a brand-new one client-side and reveals it
  // immediately.
  function handleRegenerarPasswordEdit() {
    setPassword(generatePassword());
    setShowPassword(true);
    setPasswordRegenerated(true);
  }

  const sucursalOptions = useMemo(() => {
    if (!form.empresa_id) return [];
    const set = new Set(
      (allAgencias ?? [])
        .filter((a) => a.empresa_id === form.empresa_id && a.departamento)
        .map((a) => a.departamento as string),
    );
    return [...set].sort();
  }, [allAgencias, form.empresa_id]);

  const nombreOptions = useMemo(() => {
    if (!form.empresa_id || !form.departamento) return [];
    const set = new Set(
      (allAgencias ?? [])
        .filter((a) => a.empresa_id === form.empresa_id && a.departamento === form.departamento)
        .map((a) => a.nombre),
    );
    return [...set].sort();
  }, [allAgencias, form.empresa_id, form.departamento]);

  function handleEmpresaChange(empresaId: string) {
    setForm({ ...form, empresa_id: empresaId, departamento: "", nombre: "" });
    const hasExisting = (allAgencias ?? []).some((a) => a.empresa_id === empresaId && a.departamento);
    setSucursalMode(hasExisting ? "select" : "new");
    setNombreMode("new");
  }

  function handleSucursalValueChange(departamento: string) {
    setForm({ ...form, departamento, nombre: "" });
    const hasExisting = (allAgencias ?? []).some(
      (a) => a.empresa_id === form.empresa_id && a.departamento === departamento,
    );
    setNombreMode(hasExisting ? "select" : "new");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = agenciaSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    // Correo is required on create unless "Sin correo" is checked — mirrors v1's
    // crearAgencia() guard (index.html ~line 5440-5444).
    if (!agencia && !sinCorreo && !result.data.correo.trim()) {
      setErrors({ correo: 'El correo es obligatorio. Activa "Sin correo" si el local no lo tiene.' });
      return;
    }
    // usuario is NOT NULL on agencias — editing can't clear it (same constraint create
    // already respects by always sending a real value).
    if (agencia && !usuario.trim()) {
      setErrors({ usuario: "El usuario de acceso EGM no puede quedar vacío." });
      return;
    }
    setErrors({});

    const values: AgenciaFormValues = {
      nombre: result.data.nombre.trim().toUpperCase(),
      empresa_id: result.data.empresa_id,
      departamento: result.data.departamento.trim().toUpperCase(),
      direccion: result.data.direccion.trim(),
      encargado: result.data.encargado.trim(),
      celular: result.data.celular.trim(),
      correo: result.data.correo.trim(),
      pos: result.data.pos.trim().toUpperCase(),
      estado: result.data.estado,
      lat: result.data.lat.trim() ? Number(result.data.lat) : null,
      lng: result.data.lng.trim() ? Number(result.data.lng) : null,
      fecha_inicio: result.data.fecha_inicio,
      fecha_pausa: result.data.fecha_pausa,
      fecha_baja: result.data.fecha_baja,
    };

    let agenciaId: string;
    if (agencia) {
      await updateAgencia.mutateAsync({
        id: agencia.id,
        values,
        estadoAnterior: agencia.estado,
        credentials: { usuario: usuario.trim().toUpperCase(), rol, password: password || undefined },
      });
      agenciaId = agencia.id;
    } else {
      // Mirrors v1's crearAgencia(): fall back to a fresh value at submit time if the
      // field was left blank (index.html ~line 5446-5447).
      const empresaNombre = empresas?.find((e) => e.id === values.empresa_id)?.nombre ?? "";
      agenciaId = await createAgencia.mutateAsync({
        ...values,
        usuario: usuario.trim() || generateUsuario(empresaNombre, values.departamento, values.nombre),
        password: password || generatePassword(),
      });
    }

    // Mirrors v1's two-step photo flow (index.html ~line 5154/5502-5505): the row needs
    // to exist first so the storage path can use its real id, then a small follow-up
    // update sets foto_url. Only touch it if something about the photo actually changed.
    if (fotoFile) {
      setUploadingFoto(true);
      try {
        const fotoUrl = await uploadAgenciaFoto(fotoFile, agenciaId);
        if (fotoUrl) await setAgenciaFoto.mutateAsync({ id: agenciaId, fotoUrl });
      } finally {
        setUploadingFoto(false);
      }
    } else if (agencia && fotoRemoved) {
      await setAgenciaFoto.mutateAsync({ id: agenciaId, fotoUrl: null });
    }

    // Mirrors v1's crearAgencia() terminal assignment (index.html ~line 5468-5474) —
    // create mode only, and only if the picker below actually has a selection.
    if (!agencia && selectedTerminalIds.size > 0) {
      await bulkAsignarAgencia.mutateAsync({
        ids: [...selectedTerminalIds],
        agenciaId,
        estado: values.estado === "EN PRODUCCION" ? "EN PRODUCCION" : "ASIGNADO",
      });
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={agencia ? "Editar agencia" : "Nueva agencia"}
        className={agencia ? "max-w-3xl" : "max-w-6xl"}
      >
        <form onSubmit={handleSubmit}>
          <div className={`grid grid-cols-1 gap-x-5 gap-y-3 ${agencia ? "md:grid-cols-2" : "md:grid-cols-[1fr_1fr_1.1fr]"}`}>
            {/* Left column: identity, sucursal/estado, location, photo */}
            <div className="space-y-3">
              {!agencia && (
                <div>
                  <Label htmlFor="ag-empresa">Empresa</Label>
                  <Select
                    id="ag-empresa"
                    value={form.empresa_id}
                    onChange={(e) => handleEmpresaChange(e.target.value)}
                    className="w-full !rounded-lg"
                    autoFocus
                  >
                    <option value="">Selecciona...</option>
                    {empresas?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </Select>
                  {errors.empresa_id && <p className="mt-1 text-xs text-negative">{errors.empresa_id}</p>}
                </div>
              )}

              {agencia && (
                <div>
                  <Label htmlFor="ag-nombre">Nombre</Label>
                  <Input
                    id="ag-nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full !rounded-lg"
                    autoFocus
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-negative">{errors.nombre}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {agencia ? (
                  <div>
                    <Label htmlFor="ag-empresa">Empresa</Label>
                    <Select
                      id="ag-empresa"
                      value={form.empresa_id}
                      onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                      className="w-full !rounded-lg"
                    >
                      <option value="">Selecciona...</option>
                      {empresas?.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </option>
                      ))}
                    </Select>
                    {errors.empresa_id && <p className="mt-1 text-xs text-negative">{errors.empresa_id}</p>}
                  </div>
                ) : (
                  <SelectOrNewField
                    label="Sucursal"
                    options={sucursalOptions}
                    value={form.departamento}
                    mode={sucursalMode}
                    onModeChange={setSucursalMode}
                    onValueChange={handleSucursalValueChange}
                    placeholder="Nombre de la nueva sucursal"
                    disabledHint={!form.empresa_id ? "Selecciona una empresa primero" : undefined}
                  />
                )}
                <div>
                  <Label htmlFor="ag-estado">Estado</Label>
                  <Select
                    id="ag-estado"
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as FormState["estado"] })}
                    className="w-full !rounded-lg"
                  >
                    {AGENCIA_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {!agencia && (
                <SelectOrNewField
                  label="Nombre de la agencia"
                  options={nombreOptions}
                  value={form.nombre}
                  mode={nombreMode}
                  onModeChange={setNombreMode}
                  onValueChange={(nombre) => setForm({ ...form, nombre })}
                  placeholder="Nombre de la nueva agencia"
                  disabledHint={!form.departamento ? "Selecciona una sucursal primero" : undefined}
                />
              )}
              {!agencia && errors.nombre && <p className="-mt-2 text-xs text-negative">{errors.nombre}</p>}

              <div className="grid grid-cols-2 gap-3">
                {agencia && (
                  <div>
                    <Label htmlFor="ag-departamento">Sucursal</Label>
                    <Input
                      id="ag-departamento"
                      value={form.departamento}
                      onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                      className="w-full !rounded-lg"
                    />
                  </div>
                )}
                <div className={agencia ? undefined : "col-span-2"}>
                  <Label htmlFor="ag-pos">POS / N° local</Label>
                  <Input
                    id="ag-pos"
                    value={form.pos}
                    onChange={(e) => setForm({ ...form, pos: e.target.value })}
                    placeholder="Ej: TINBET LIMA - AG06-ALISOS"
                    className="w-full !rounded-lg"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ag-direccion">Dirección</Label>
                <Input
                  id="ag-direccion"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full !rounded-lg"
                />
              </div>

              {/* Auto-stamped by estadoFechaPatch on the estado transition that matches
                  each one (EN PRODUCCION/INACTIVA/DADA DE BAJA), but also manually
                  editable here — mirrors v1's editable "ea-fi" input for fecha_inicio.
                  Edit mode only, matching v1 (a brand-new agencia has no history yet). */}
              {agencia && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="ag-fecha-inicio">Fecha inicio</Label>
                    <Input
                      id="ag-fecha-inicio"
                      type="date"
                      value={form.fecha_inicio}
                      onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                      className="w-full !rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ag-fecha-pausa">Fecha pausa</Label>
                    <Input
                      id="ag-fecha-pausa"
                      type="date"
                      value={form.fecha_pausa}
                      onChange={(e) => setForm({ ...form, fecha_pausa: e.target.value })}
                      className="w-full !rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ag-fecha-baja">Fecha dada de baja</Label>
                    <Input
                      id="ag-fecha-baja"
                      type="date"
                      value={form.fecha_baja}
                      onChange={(e) => setForm({ ...form, fecha_baja: e.target.value })}
                      className="w-full !rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>
                  Foto de la agencia <span className="font-normal normal-case text-t3">(opcional)</span>
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex h-[60px] w-20 flex-none items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-bg">
                    {fotoPreviewUrl ? (
                      <img src={fotoPreviewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Camera size={20} className="text-t3" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fotoInputRef.current?.click()}
                      className="!h-8 !px-3 !text-xs"
                    >
                      <Camera size={13} /> {fotoPreviewUrl ? "Cambiar foto" : "Seleccionar foto"}
                    </Button>
                    {fotoPreviewUrl && (
                      <button
                        type="button"
                        onClick={handleFotoRemove}
                        className="flex items-center gap-1 text-[11px] font-semibold text-negative"
                      >
                        <X size={12} /> Quitar
                      </button>
                    )}
                  </div>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Right column: contact, location convenience, coordinates, access */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ag-encargado">Agente</Label>
                  <Input
                    id="ag-encargado"
                    value={form.encargado}
                    onChange={(e) => setForm({ ...form, encargado: e.target.value })}
                    placeholder="Nombre completo"
                    className="w-full !rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="ag-correo" className="flex items-center justify-between">
                    <span>
                      Correo {!agencia && <span className="text-negative">*</span>}
                    </span>
                    {!agencia && (
                      <label className="flex items-center gap-1.5 text-[11px] font-normal normal-case text-t2">
                        <input
                          type="checkbox"
                          checked={sinCorreo}
                          onChange={(e) => {
                            setSinCorreo(e.target.checked);
                            if (e.target.checked) {
                              setForm({ ...form, correo: "" });
                              setErrors((prev) => ({ ...prev, correo: "" }));
                            }
                          }}
                        />
                        Sin correo
                      </label>
                    )}
                  </Label>
                  <Input
                    id="ag-correo"
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    placeholder={sinCorreo ? "Sin correo (local inactivo)" : "correo@empresa.com"}
                    disabled={sinCorreo}
                    className="w-full !rounded-lg"
                  />
                  {errors.correo && <p className="mt-1 text-xs text-negative">{errors.correo}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="ag-celular">Celular</Label>
                <Input
                  id="ag-celular"
                  type="tel"
                  value={form.celular}
                  onChange={(e) => setForm({ ...form, celular: e.target.value })}
                  placeholder="999 999 999"
                  className="w-full !rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="ag-ubicacion">Ubicación (link de Google Maps)</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="ag-ubicacion"
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ag-lat">Latitud</Label>
                  <Input
                    id="ag-lat"
                    inputMode="decimal"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    placeholder="-12.0464"
                    className="w-full !rounded-lg font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="ag-lng">Longitud</Label>
                  <Input
                    id="ag-lng"
                    inputMode="decimal"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    placeholder="-77.0428"
                    className="w-full !rounded-lg font-mono"
                  />
                </div>
              </div>

              {!agencia && (
                <div className="rounded-lg border border-accent/20 bg-accent-tint/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-t2">
                      Acceso (auto-generado)
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerarAcceso}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue"
                    >
                      <RotateCw size={12} /> Regenerar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ag-usuario">Usuario</Label>
                      <Input
                        id="ag-usuario"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value.toUpperCase())}
                        placeholder="auto-generado"
                        className="w-full !rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ag-password">Contraseña</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          id="ag-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="auto-generada"
                          className="w-full !rounded-lg font-mono"
                        />
                        <button
                          type="button"
                          title={showPassword ? "Ocultar" : "Mostrar"}
                          onClick={() => setShowPassword((v) => !v)}
                          className="flex h-[42px] w-[34px] flex-none items-center justify-center text-t3 hover:text-t1"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {agencia && (
                <div className="rounded-lg border border-accent/20 bg-accent-tint/30 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-t2">Acceso EGM</span>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ag-egm-usuario">Usuario</Label>
                      <Input
                        id="ag-egm-usuario"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value.toUpperCase())}
                        className="w-full !rounded-lg font-mono"
                      />
                      {errors.usuario && <p className="mt-1 text-xs text-negative">{errors.usuario}</p>}
                    </div>
                    <div>
                      <Label htmlFor="ag-egm-rol">Rol EGM</Label>
                      <Select
                        id="ag-egm-rol"
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="w-full !rounded-lg"
                      >
                        {EGM_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="flex items-center justify-between">
                      <span>Contraseña</span>
                      <button
                        type="button"
                        onClick={handleRegenerarPasswordEdit}
                        className="flex items-center gap-1 text-[11px] font-normal normal-case text-blue"
                      >
                        <RotateCw size={12} /> Regenerar
                      </button>
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full !rounded-lg font-mono"
                      />
                      <button
                        type="button"
                        title={showPassword ? "Ocultar" : "Mostrar"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="flex h-[42px] w-[34px] flex-none items-center justify-center text-t3 hover:text-t1"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {passwordRegenerated && (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-[11px] text-amber">Nueva contraseña — cópiala ahora.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setPassword(agencia?.password ?? "");
                            setPasswordRegenerated(false);
                          }}
                          className="flex-none text-[11px] font-semibold text-t3"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Third column: assign existing free terminales to this agencia — create
                mode only (mirrors v1's "TERMINALES A ASIGNAR", index.html ~line 1848). */}
            {!agencia && (
              <div>
                <Label className="flex items-center justify-between">
                  <span>Terminales a asignar (opcional)</span>
                  {selectedTerminalIds.size > 0 && (
                    <span className="font-mono text-[11px] font-bold text-accent">
                      {selectedTerminalIds.size} seleccionada(s)
                    </span>
                  )}
                </Label>
                <Input
                  value={terminalSearch}
                  onChange={(e) => setTerminalSearch(e.target.value)}
                  placeholder="Buscar por código o modelo..."
                  className="mb-2 w-full !rounded-lg"
                />
                <div className="max-h-[380px] overflow-y-auto rounded-lg border border-border">
                  {availableTerminales.length === 0 ? (
                    <div className="p-4 text-center text-xs text-t3">
                      Sin terminales disponibles o en almacén
                    </div>
                  ) : (
                    availableTerminales.map((t) => (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0 hover:bg-bg"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTerminalIds.has(t.id)}
                          onChange={() => toggleTerminal(t.id)}
                          className="h-4 w-4 flex-none rounded"
                        />
                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-t1">{t.codigo}</span>
                        <span className="flex-none text-[11px] text-t3">{t.modelo}</span>
                        <EstadoPill estado={t.estado} />
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {uploadingFoto ? "Subiendo foto..." : isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
