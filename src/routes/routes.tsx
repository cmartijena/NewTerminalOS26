import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { TerminalesPage } from "@/features/terminales/TerminalesPage";
import { AgenciasPage } from "@/features/agencias/AgenciasPage";
import { MapaPage } from "@/features/mapa/MapaPage";
import { EmpresasPage } from "@/features/empresas/EmpresasPage";
import { SolicitudesPage } from "@/features/solicitudes/SolicitudesPage";
import { HistorialPage } from "@/features/historial/HistorialPage";
import { UsuariosEgmPage } from "@/features/usuarios-egm/UsuariosEgmPage";
import { UsuariosSistemaPage } from "@/features/usuarios-sistema/UsuariosSistemaPage";
import { BaseGeneralPage } from "@/features/base-general/BaseGeneralPage";
import { ReportesPage } from "@/features/reportes/ReportesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "terminales", element: <TerminalesPage /> },
      { path: "mapa", element: <MapaPage /> },
      { path: "agencias", element: <AgenciasPage /> },
      { path: "empresas", element: <EmpresasPage /> },
      { path: "solicitudes", element: <SolicitudesPage /> },
      { path: "historial", element: <HistorialPage /> },
      { path: "usuarios-egm", element: <UsuariosEgmPage /> },
      { path: "usuarios-sistema", element: <UsuariosSistemaPage /> },
      { path: "base-general", element: <BaseGeneralPage /> },
      { path: "reportes", element: <ReportesPage /> },
    ],
  },
]);
