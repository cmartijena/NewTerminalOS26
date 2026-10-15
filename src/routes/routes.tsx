import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { TerminalesPage } from "@/features/terminales/TerminalesPage";
import { AgenciasPage } from "@/features/agencias/AgenciasPage";
import { MapaPage } from "@/features/mapa/MapaPage";
import { EmpresasPage } from "@/features/empresas/EmpresasPage";
import { SolicitudesPage } from "@/features/solicitudes/SolicitudesPage";
import { HistorialPage } from "@/features/historial/HistorialPage";
import { UsuariosPage } from "@/features/usuarios/UsuariosPage";
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
      { path: "usuarios", element: <UsuariosPage /> },
      // The two pages this replaced — kept as redirects so old bookmarks/links still land
      // somewhere sensible instead of a 404.
      { path: "usuarios-egm", element: <Navigate to="/usuarios" replace /> },
      { path: "usuarios-sistema", element: <Navigate to="/usuarios" replace /> },
      { path: "base-general", element: <BaseGeneralPage /> },
      { path: "reportes", element: <ReportesPage /> },
    ],
  },
]);
