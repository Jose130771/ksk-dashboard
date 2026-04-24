REEMPLAZADO// src/branding/theme.js
// Tokens de diseño corporativos KSK Transport International
// Inspirados en la identidad visual oficial (logo rojo sobre fondo claro/oscuro)

export const kskTheme = {
  // Colores corporativos
  colors: {
    // Rojo KSK (aprox. tono ferrari/racing red del logo oficial)
    brandRed: "#C8102E",
    brandRedDark: "#9B0C22",
    brandRedLight: "#E63946",

    // Neutros
    white: "#FFFFFF",
    black: "#0A0A0A",
    bgDark: "#0F172A",      // fondo oscuro dashboard
    bgPanel: "#1E293B",     // paneles
    bgElevated: "#263449",  // hover/elevado
    border: "#334155",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",

    // Semánticos
    success: "#10B981",
    warning: "#F59E0B",
    danger:  "#EF4444",
    info:    "#3B82F6",

    // Estados de flota
    truckMoving:  "#10B981",
    truckIdle:    "#F59E0B",
    truckOffline: "#6B7280",
    truckAlert:   "#EF4444",
  },

  // Tipografía
  fonts: {
    sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    mono: `"SF Mono", Menlo, Monaco, Consolas, "Courier New", monospace`,
  },

  fontSize: {
    xs:  "0.75rem",
    sm:  "0.875rem",
    md:  "1rem",
    lg:  "1.125rem",
    xl:  "1.25rem",
    "2xl":"1.5rem",
    "3xl":"1.875rem",
    "4xl":"2.25rem",
  },

  // Espaciados
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
  },

  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    pill: "999px",
  },

  shadow: {
    sm: "0 1px 2px rgba(0,0,0,0.25)",
    md: "0 4px 12px rgba(0,0,0,0.35)",
    lg: "0 10px 30px rgba(0,0,0,0.45)",
    brand: "0 6px 20px rgba(200,16,46,0.35)",
  },

  // Info de empresa (para footer, cabeceras, emails)
  company: {
    name: "KSK Transport International",
    legalForm: "SAS",
    address: "Rue François Arago",
    zip: "39800",
    city: "Poligny",
    country: "France",
    web: "ksk-transport.com",
    fleet: {
      tractorBrands: ["Renault", "Scania", "DAF"],
      tractorCabType: "Cabina alta",
      bodybuilder: "Kässbohrer",
      bodyModels: ["Metago Pro", "Supertrans Pro"],
      telematics: "Trimble Truck4U",
      tachograph: "Renault Trucks (smart tachograph v2)",
    },
  },
};

export default kskTheme;
