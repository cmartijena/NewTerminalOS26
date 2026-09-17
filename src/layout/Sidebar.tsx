import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/auth/AuthContext";
import { ROL_LABEL, type Rol } from "@/auth/types";

interface SectionDef {
  label: string;
  path: string;
  enabled: boolean;
  icon: React.ReactNode;
  // Ported from v1's applyRoleRestrictions() HIDE map (index.html ~line 2968) — roles
  // that should never see this section at all, not even as "próximamente".
  hiddenForRoles?: Rol[];
}

const iconProps = {
  viewBox: "0 0 24 24",
  className: "icon",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// All 12 v1 sections, for navigational parity. Only screens with an approved mockup are
// real routes — the rest render disabled until they're designed and built.
const SECTIONS: SectionDef[] = [
  {
    label: "Dashboard",
    path: "/",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    label: "Terminales",
    path: "/terminales",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
  {
    label: "Mapa",
    path: "/mapa",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </svg>
    ),
  },
  {
    label: "Reportes",
    path: "/reportes",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <line x1="7" y1="20" x2="7" y2="11" />
        <line x1="12" y1="20" x2="12" y2="5" />
        <line x1="17" y1="20" x2="17" y2="14" />
      </svg>
    ),
  },
  {
    label: "Empresas",
    path: "/empresas",
    enabled: true,
    hiddenForRoles: ["TECNICO"],
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <rect x="7.2" y="7" width="2.6" height="2.6" />
        <rect x="14.2" y="7" width="2.6" height="2.6" />
        <rect x="7.2" y="13" width="2.6" height="2.6" />
        <rect x="14.2" y="13" width="2.6" height="2.6" />
      </svg>
    ),
  },
  {
    label: "Agencias",
    path: "/agencias",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 1 0 5 9.5C5 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.3" />
      </svg>
    ),
  },
  {
    label: "Base General",
    path: "/base-general",
    enabled: true,
    hiddenForRoles: ["FRANQUICIADO", "TECNICO"],
    icon: (
      <svg {...iconProps}>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
    ),
  },
  {
    label: "Usuarios Sistema",
    path: "/usuarios-sistema",
    enabled: true,
    hiddenForRoles: ["DIRECTIVO", "FRANQUICIADO", "TECNICO"],
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" />
      </svg>
    ),
  },
  {
    label: "Usuarios EGM",
    path: "/usuarios-egm",
    enabled: true,
    hiddenForRoles: ["DIRECTIVO", "FRANQUICIADO", "TECNICO"],
    icon: (
      <svg {...iconProps}>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <circle cx="12" cy="10" r="2.4" />
        <path d="M8.3 16.5c.6-2 2-3 3.7-3s3.1 1 3.7 3" />
        <line x1="9" y1="6.2" x2="15" y2="6.2" />
      </svg>
    ),
  },
  {
    label: "Solicitudes",
    path: "/solicitudes",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <path d="M4 13h4.2l1.4 2.4h4.8L15.8 13H20" />
        <path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
        <path d="M4 13v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      </svg>
    ),
  },
  {
    label: "Historial",
    path: "/historial",
    enabled: true,
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    label: "Asistente IA",
    path: "/asistente",
    enabled: false,
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { currentUser, logout } = useAuth();
  const rol = currentUser?.rol;
  const sections = SECTIONS.filter((s) => !rol || !s.hiddenForRoles?.includes(rol));

  return (
    <aside className="flex w-[272px] flex-none flex-col border-r border-border bg-surface p-[18px]">
      <div className="mb-[26px] flex items-center gap-[11px] px-2">
        <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-xl bg-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M4 7h16" />
            <path d="M4 12h10" />
            <path d="M4 17h16" />
          </svg>
        </div>
        <span className="text-[17px] font-extrabold text-t1">TerminalOS</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {sections.map((section) =>
          section.enabled ? (
            <NavLink
              key={section.path}
              to={section.path}
              end={section.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-[13px] rounded-full px-4 py-[11px] text-sm font-medium text-t2 [&_svg]:h-[19px] [&_svg]:w-[19px] [&_svg]:text-t3",
                  isActive && "bg-accent font-bold text-white [&_svg]:text-white",
                )
              }
            >
              {section.icon}
              <span>{section.label}</span>
            </NavLink>
          ) : (
            <span
              key={section.path}
              className="flex cursor-not-allowed items-center gap-[13px] rounded-full px-4 py-[11px] text-sm font-medium text-t3 [&_svg]:h-[19px] [&_svg]:w-[19px] [&_svg]:text-t3"
              title="Próximamente"
            >
              {section.icon}
              <span>{section.label}</span>
            </span>
          ),
        )}
      </nav>

      {currentUser && (
        <div className="flex items-center gap-2.5 border-t border-border px-2 pt-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-tint text-sm font-bold text-accent">
            {currentUser.nombre[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-t1">{currentUser.nombre}</div>
            <div className="truncate text-[11px] text-t3">{ROL_LABEL[currentUser.rol]}</div>
          </div>
          <button
            type="button"
            title="Cerrar sesión"
            onClick={logout}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-negative"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}
