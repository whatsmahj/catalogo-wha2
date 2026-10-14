/* ===========================================================
   Catalogo Wha — Capa de datos
   -----------------------------------------------------------
   Funciona en dos modos:
   - SUPABASE: si APP_CONFIG.supabaseUrl / anonKey están definidos.
   - DEMO: si no, usa localStorage (para previsualizar sin backend).
   =========================================================== */
(function () {
  const LS = "cw_demo_db_v1";
  const SES = "cw_demo_session_v1";
  const BUCKET = "catalog-images";
  let sb = null;

  /* ---------- helpers ---------- */
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const slugify = (s) =>
    (s || "")
      .toString()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);

  function loadDb() {
    try { return JSON.parse(localStorage.getItem(LS)) || null; } catch (e) { return null; }
  }
  function saveDb(db) { localStorage.setItem(LS, JSON.stringify(db)); }

  function seed() {
    const bid = "biz_demo";
    const c1 = uid(), c2 = uid(), c3 = uid();
    const db = {
      user: null,
      businesses: [{
        id: bid, owner_id: "demo", name: "Mi Negocio Demo", slug: "demo",
        description: "Catálogo de demostración de Catalogo Wha.",
        whatsapp: window.APP_CONFIG.supportWhatsApp,
        country: "Marruecos", currency: window.APP_CONFIG.defaultCurrency,
        timezone: "Africa/Casablanca", brand_color: window.APP_CONFIG.defaultBrandColor,
        logo_url: "", hero_enabled: true, hero_title: "Bienvenido a mi catálogo",
        hero_desc: "Productos de calidad, pedidos fáciles por WhatsApp.",
        hero_image: "", delivery: "", payments: "", published: true,
        created_at: new Date().toISOString()
      }],
      categories: [
        { id: c1, business_id: bid, name: "Granitos", slug: "granitos", sort_order: 0, image_url: "", alt: "" },
        { id: c2, business_id: bid, name: "Mármoles", slug: "marmoles", sort_order: 1, image_url: "", alt: "" },
        { id: c3, business_id: bid, name: "Otros", slug: "otros", sort_order: 2, image_url: "", alt: "" }
      ],
      products: [
        { id: uid(), business_id: bid, category_id: c1, name: "Granito Rosa", slug: "granito-rosa",
          description: "Granito de alta calidad para encimeras y suelos.", price: 10, promo_price: null,
          sort_order: 0, active: true, images: [], created_at: new Date().toISOString() },
        { id: uid(), business_id: bid, category_id: c2, name: "Mármol Blanco", slug: "marmol-blanco",
          description: "Mármol natural pulido, ideal para interiores.", price: 15, promo_price: 12,
          sort_order: 1, active: true, images: [], created_at: new Date().toISOString() }
      ],
      orders: [],
      library: []
    };
    saveDb(db);
    return db;
  }

  function db() {
    let d = loadDb();
    if (!d) d = seed();
    return d;
  }

  /* ---------- Supabase init ---------- */
  function init() {
    if (CW.isConfigured() && window.supabase && !sb) {
      sb = window.supabase.createClient(
        window.APP_CONFIG.supabaseUrl,
        window.APP_CONFIG.supabaseAnonKey
      );
    }
    return sb;
  }

  const isDemo = () => !CW.isConfigured();

  /* ---------- AUTH ---------- */
  async function signUp({ email, password, business, slug }) {
    if (isDemo()) {
      const d = db();
      d.user = { id: "demo", email, created_at: (d.user && d.user.created_at) || new Date().toISOString() };
      saveDemoMeta({ full_name: business, onboarding_done: false });
      if (!d.businesses.some((b) => b.slug === slug)) {
        d.businesses.push({
          id: "biz_" + uid(), owner_id: "demo", name: business, slug,
          description: "", whatsapp: window.APP_CONFIG.supportWhatsApp,
          country: "Marruecos", currency: window.APP_CONFIG.defaultCurrency,
          timezone: "Africa/Casablanca", brand_color: window.APP_CONFIG.defaultBrandColor,
          logo_url: "", hero_enabled: false, hero_title: "", hero_desc: "", hero_image: "",
          delivery: "", payments: "", published: true, created_at: new Date().toISOString()
        });
      }
      saveDb(d);
      localStorage.setItem(SES, "demo");
      return { user: d.user };
    }
    init();
    // Los metadatos alimentan el trigger handle_new_user() en Supabase,
    // que crea el negocio automáticamente (aunque la confirmación por correo esté activa).
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { business_name: business, slug, full_name: business, onboarding_done: false } }
    });
    if (error) throw error;
    // Respaldo: si el trigger no estuviera instalado y hay sesión, crear aquí.
    if (data && data.session && data.user) {
      try {
        const { data: existing } = await sb.from("businesses").select("id").eq("owner_id", data.user.id).maybeSingle();
        if (!existing) {
          await sb.from("businesses").insert({
            owner_id: data.user.id, name: business, slug,
            whatsapp: window.APP_CONFIG.supportWhatsApp,
            currency: window.APP_CONFIG.defaultCurrency,
            timezone: "Africa/Casablanca",
            brand_color: window.APP_CONFIG.defaultBrandColor,
            published: true
          });
        }
      } catch (e) { /* el trigger ya lo creó */ }
    }
    return data;
  }

  async function signIn(email, password) {
    if (isDemo()) {
      const d = db();
      d.user = { id: "demo", email };
      saveDb(d);
      localStorage.setItem(SES, "demo");
      return { user: d.user };
    }
    init();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (isDemo()) { localStorage.removeItem(SES); return; }
    init();
    await sb.auth.signOut();
  }

  async function currentUser() {
    if (isDemo()) {
      if (!localStorage.getItem(SES)) return null;
      return db().user || { id: "demo", email: "demo@catalogowha.app" };
    }
    init();
    const { data } = await sb.auth.getUser();
    return data ? data.user : null;
  }

  /* ---------- BUSINESS ---------- */
  async function myBusiness() {
    if (isDemo()) {
      const d = db();
      return d.businesses[d.businesses.length - 1] || null;
    }
    init();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from("businesses").select("*").eq("owner_id", user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateBusiness(id, patch) {
    if (isDemo()) {
      const d = db();
      const i = d.businesses.findIndex((b) => b.id === id);
      if (i >= 0) d.businesses[i] = Object.assign({}, d.businesses[i], patch);
      saveDb(d);
      return d.businesses[i];
    }
    init();
    const { data, error } = await sb.from("businesses").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }

  async function businessBySlug(slug) {
    if (isDemo()) {
      const d = db();
      return d.businesses.find((b) => b.slug === slug && b.published !== false) || null;
    }
    init();
    const { data, error } = await sb.from("businesses").select("*").eq("slug", slug).eq("published", true).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function slugAvailable(slug) {
    if (isDemo()) return !db().businesses.some((b) => b.slug === slug);
    init();
    const { data } = await sb.from("businesses").select("id").eq("slug", slug).maybeSingle();
    return !data;
  }

  /* ---------- CATEGORIES ---------- */
  async function listCategories(businessId) {
    if (isDemo()) return db().categories.filter((c) => c.business_id === businessId).sort((a, b) => a.sort_order - b.sort_order);
    init();
    const { data, error } = await sb.from("categories").select("*").eq("business_id", businessId).order("sort_order");
    if (error) throw error;
    return data;
  }
  async function saveCategory(cat) {
    if (isDemo()) {
      const d = db();
      if (cat.id) {
        const i = d.categories.findIndex((c) => c.id === cat.id);
        d.categories[i] = Object.assign({}, d.categories[i], cat);
      } else {
        cat.id = uid();
        d.categories.push(cat);
      }
      saveDb(d);
      return cat;
    }
    init();
    if (cat.id) {
      const { data, error } = await sb.from("categories").update(cat).eq("id", cat.id).select().single();
      if (error) throw error; return data;
    }
    const { data, error } = await sb.from("categories").insert(cat).select().single();
    if (error) throw error; return data;
  }
  async function deleteCategory(id) {
    if (isDemo()) { const d = db(); d.categories = d.categories.filter((c) => c.id !== id); saveDb(d); return; }
    init();
    const { error } = await sb.from("categories").delete().eq("id", id);
    if (error) throw error;
  }

  /* ---------- PRODUCTS ---------- */
  async function listProducts(businessId) {
    if (isDemo()) return db().products.filter((p) => p.business_id === businessId).sort((a, b) => a.sort_order - b.sort_order);
    init();
    const { data, error } = await sb.from("products").select("*").eq("business_id", businessId).order("sort_order");
    if (error) throw error;
    return data;
  }
  async function saveProduct(p) {
    if (isDemo()) {
      const d = db();
      if (p.id) {
        const i = d.products.findIndex((x) => x.id === p.id);
        d.products[i] = Object.assign({}, d.products[i], p);
        saveDb(d); return d.products[i];
      }
      p.id = uid(); p.created_at = new Date().toISOString();
      d.products.push(p); saveDb(d); return p;
    }
    init();
    if (p.id) {
      const { data, error } = await sb.from("products").update(p).eq("id", p.id).select().single();
      if (error) throw error; return data;
    }
    const { data, error } = await sb.from("products").insert(p).select().single();
    if (error) throw error; return data;
  }
  async function deleteProduct(id) {
    if (isDemo()) { const d = db(); d.products = d.products.filter((p) => p.id !== id); saveDb(d); return; }
    init();
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) throw error;
  }

  /* ---------- ORDERS ---------- */
  async function listOrders(businessId) {
    if (isDemo()) return db().orders.filter((o) => o.business_id === businessId).sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    init();
    const { data, error } = await sb.from("orders").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  async function createOrder(order) {
    order.code = order.code || "CW-" + uid().slice(0, 6).toUpperCase();
    if (isDemo()) {
      const d = db(); order.id = uid(); order.created_at = new Date().toISOString();
      d.orders.push(order); saveDb(d); return order;
    }
    init();
    const { data, error } = await sb.from("orders").insert(order).select().single();
    if (error) throw error; return data;
  }
  async function updateOrderStatus(id, status) {
    if (isDemo()) { const d = db(); const o = d.orders.find((x) => x.id === id); if (o) o.status = status; saveDb(d); return; }
    init();
    const { error } = await sb.from("orders").update({ status }).eq("id", id);
    if (error) throw error;
  }

  /* ---------- LIBRARY (imágenes) ---------- */
  async function listLibrary(businessId) {
    if (isDemo()) return db().library.filter((l) => l.business_id === businessId).sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    init();
    const { data, error } = await sb.from("library").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  async function uploadImage(businessId, file) {
    if (isDemo()) {
      const url = await fileToDataUrl(file);
      const d = db();
      const item = { id: uid(), business_id: businessId, url, name: file.name, created_at: new Date().toISOString() };
      d.library.push(item); saveDb(d); return item;
    }
    init();
    const path = `${businessId}/${uid()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    const item = { business_id: businessId, url: pub.publicUrl, name: file.name };
    const { data, error } = await sb.from("library").insert(item).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteImage(item) {
    if (isDemo()) { const d = db(); d.library = d.library.filter((l) => l.id !== item.id); saveDb(d); return; }
    init();
    try {
      const marker = `/${BUCKET}/`;
      const idx = item.url.indexOf(marker);
      if (idx >= 0) await sb.storage.from(BUCKET).remove([item.url.slice(idx + marker.length)]);
    } catch (e) { /* ignore */ }
    const { error } = await sb.from("library").delete().eq("id", item.id);
    if (error) throw error;
  }

  /* ---------- CUENTA (perfil, seguridad, datos) ---------- */
  const META = "cw_demo_meta_v1";
  function demoMeta() { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { return {}; } }
  function saveDemoMeta(m) { localStorage.setItem(META, JSON.stringify(m)); }

  async function userMeta() {
    if (isDemo()) return demoMeta();
    init();
    const { data } = await sb.auth.getUser();
    return (data && data.user && data.user.user_metadata) || {};
  }

  async function updateProfile(patch) {
    if (isDemo()) { const m = Object.assign(demoMeta(), patch); saveDemoMeta(m); return m; }
    init();
    const { data, error } = await sb.auth.updateUser({ data: patch });
    if (error) throw error;
    return (data.user && data.user.user_metadata) || {};
  }

  async function updateEmail(email) {
    if (isDemo()) {
      const d = db();
      if (d.user) d.user.email = email;
      saveDb(d);
      return { pending: false };
    }
    init();
    const { data, error } = await sb.auth.updateUser({ email });
    if (error) throw error;
    // Con la confirmación por correo activa, Supabase envía un email de verificación
    // y el correo no cambia hasta que el usuario lo confirma.
    const pending = !!(data.user && data.user.email !== email);
    return { pending: true, user: data.user };
  }

  async function updatePassword(password) {
    if (isDemo()) return true;
    init();
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    return true;
  }

  async function sendPasswordReset(email) {
    if (isDemo()) return true;
    init();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/login.html" });
    if (error) throw error;
    return true;
  }

  async function deleteBusinessData(businessId) {
    if (isDemo()) {
      const d = db();
      d.businesses = d.businesses.filter((b) => b.id !== businessId);
      d.categories = d.categories.filter((c) => c.business_id !== businessId);
      d.products = d.products.filter((p) => p.business_id !== businessId);
      d.orders = d.orders.filter((o) => o.business_id !== businessId);
      d.library = d.library.filter((l) => l.business_id !== businessId);
      saveDb(d);
      return true;
    }
    init();
    // El borrado del negocio arrastra categorías, productos, pedidos y biblioteca (ON DELETE CASCADE).
    const { error } = await sb.from("businesses").delete().eq("id", businessId);
    if (error) throw error;
    return true;
  }

  async function exportData(businessId) {
    const out = { app: "Catalogo Wha", exported_at: new Date().toISOString(),
      account: null, business: null, categories: [], products: [], orders: [], library: [] };
    if (isDemo()) {
      const d = db();
      out.account = d.user || null;
      out.business = d.businesses.find((b) => b.id === businessId) || null;
      out.categories = d.categories.filter((x) => x.business_id === businessId);
      out.products = d.products.filter((x) => x.business_id === businessId);
      out.orders = d.orders.filter((x) => x.business_id === businessId);
      out.library = d.library.filter((x) => x.business_id === businessId);
      return out;
    }
    init();
    const { data: u } = await sb.auth.getUser();
    if (u && u.user) out.account = { id: u.user.id, email: u.user.email, created_at: u.user.created_at };
    const [biz, c, p, o, l] = await Promise.all([
      sb.from("businesses").select("*").eq("id", businessId).maybeSingle(),
      sb.from("categories").select("*").eq("business_id", businessId),
      sb.from("products").select("*").eq("business_id", businessId),
      sb.from("orders").select("*").eq("business_id", businessId),
      sb.from("library").select("*").eq("business_id", businessId)
    ]);
    out.business = (biz && biz.data) || null;
    out.categories = (c && c.data) || [];
    out.products = (p && p.data) || [];
    out.orders = (o && o.data) || [];
    out.library = (l && l.data) || [];
    return out;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ---------- ADMINISTRACIÓN (super admin) ---------- */
  async function isAdmin() {
    if (isDemo()) {
      const u = db().user;
      const list = (window.APP_CONFIG.adminEmails || []).map((e) => String(e).toLowerCase().trim());
      return !!(u && u.email && list.indexOf(String(u.email).toLowerCase().trim()) >= 0);
    }
    init();
    try {
      const { data, error } = await sb.rpc("is_admin");
      if (error) return false;
      return data === true;
    } catch (e) { return false; }
  }

  async function adminOverview() {
    init();
    if (isDemo()) {
      const d = db();
      const mine = (d.user && d.user.email) || "";
      return d.businesses.map((b) => ({
        ...b,
        owner_email: b.owner_email || mine,
        counts: {
          products: d.products.filter((p) => p.business_id === b.id).length,
          categories: d.categories.filter((c) => c.business_id === b.id).length,
          orders: d.orders.filter((o) => o.business_id === b.id).length,
          library: d.library.filter((l) => l.business_id === b.id).length
        }
      })).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }
    const { data, error } = await sb
      .from("businesses")
      .select("*, products(count), categories(count), orders(count), library(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const one = (v) => (v && v[0] && v[0].count) || 0;
    return (data || []).map((b) => ({
      ...b,
      counts: {
        products: one(b.products), categories: one(b.categories),
        orders: one(b.orders), library: one(b.library)
      }
    }));
  }

  async function adminBusinessDetail(id) {
    init();
    if (isDemo()) {
      const d = db();
      const b = d.businesses.find((x) => x.id === id) || null;
      const by = (arr) => arr.filter((x) => x.business_id === id);
      return {
        business: b ? { ...b, owner_email: b.owner_email || (d.user && d.user.email) || "" } : null,
        categories: by(d.categories), products: by(d.products), orders: by(d.orders), library: by(d.library)
      };
    }
    const { data: business, error } = await sb.from("businesses").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    const [c, p, o, l] = await Promise.all([
      sb.from("categories").select("*").eq("business_id", id),
      sb.from("products").select("*").eq("business_id", id).order("created_at", { ascending: false }),
      sb.from("orders").select("*").eq("business_id", id).order("created_at", { ascending: false }),
      sb.from("library").select("*").eq("business_id", id)
    ]);
    return {
      business,
      categories: c.data || [], products: p.data || [], orders: o.data || [], library: l.data || []
    };
  }

  async function adminDeleteBusiness(id) {
    return deleteBusinessData(id);
  }

  window.CW.store = {
    init, isDemo, uid, slugify,
    signUp, signIn, signOut, currentUser,
    myBusiness, updateBusiness, businessBySlug, slugAvailable,
    userMeta, updateProfile, updateEmail, updatePassword, sendPasswordReset,
    deleteBusinessData, exportData,
    listCategories, saveCategory, deleteCategory,
    listProducts, saveProduct, deleteProduct,
    listOrders, createOrder, updateOrderStatus,
    listLibrary, uploadImage, deleteImage, fileToDataUrl,
    isAdmin, adminOverview, adminBusinessDetail, adminDeleteBusiness
  };
})();
