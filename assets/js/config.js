/* ===========================================================
   Catalogo Wha — Configuración
   -----------------------------------------------------------
   1) Crea un proyecto en https://supabase.com
   2) Project Settings -> API: copia la URL y la "anon public key"
   3) Pégalas aquí abajo.
   4) Ejecuta supabase/schema.sql en el SQL Editor de Supabase.

   Mientras estén vacías, la app funciona en MODO DEMO
   (datos guardados en el navegador con localStorage).
   =========================================================== */
window.APP_CONFIG = {
  // --- Supabase (obligatorio para multiusuario real) ---
  supabaseUrl: "",      // ej. "https://xxxxxxxx.supabase.co"
  supabaseAnonKey: "",  // ej. "eyJhbGciOi..."

  // --- Marca y contacto ---
  brandName: "Catalogo Wha",
  // Número de WhatsApp de soporte (formato internacional, solo dígitos)
  supportWhatsApp: "212690157092",
  supportWhatsAppDisplay: "+212 6 90 15 70 92",
  supportEmail: "contact@clickpubli.com",

  // Dominio público usado para construir el enlace del catálogo
  // En Vercel será tu dominio (ej. "catalogowha.vercel.app").
  // Se detecta automáticamente si está vacío.
  publicDomain: "",

  // Ruta de la página pública del catálogo
  catalogPath: "/catalogo.html",

  // Color de marca por defecto del catálogo público
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
