/* ===========================================================
   Catalogo Wha — Configuración
   =========================================================== */
window.APP_CONFIG = {
  // --- Supabase ---
  supabaseUrl: "https://anhibmtcirtvjwjtykdjc.supabase.co",
  supabaseAnonKey: "sb_publishable_VQh74mm6IJdf3mbIv6J5fg_52fbK1k-",

  // --- Administradores (super admin) ---
  adminEmails: [
    // "tu-correo@ejemplo.com"
  ],

  // --- Marca y contacto ---
  brandName: "Catalogo Wha",
  supportWhatsApp: "212690157092",
  supportWhatsAppDisplay: "+212 6 90 15 70 92",
  supportEmail: "contact@clickpubli.com",

  // Dominio público (vacío = se detecta solo)
  publicDomain: "",

  // Ruta de la página pública del catálogo
  catalogPath: "/catalogo.html",

  // Color de marca por defecto
  defaultBrandColor: "#6d28d9",

  // Moneda por defecto
  defaultCurrency: "MAD",

  // Demo: si no hay Supabase, sembrar un catálogo de ejemplo
  seedDemoCatalog: true
};

// Detección automática del dominio público
if (!window.APP_CONFIG.publicDomain) {
  window.APP_CONFIG.publicDomain = window.location.host || "catalogowha.app";
}

window.CW = window.CW || {};
CW.isConfigured = () =>
  !!(window.APP_CONFIG.supabaseUrl && window.APP_CONFIG.supabaseAnonKey);
