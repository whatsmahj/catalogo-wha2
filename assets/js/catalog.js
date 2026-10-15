/* ===========================================================
   Catalogo Wha — Catálogo público
   Lee ?b=<slug>, muestra productos, arma el pedido y lo envía
   por WhatsApp.
   =========================================================== */
(function () {
  const S = CW.store;
  const U = CW.util;
  const t = (k) => I18n.t(k);
  const $ = (s) => document.querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const CART_KEY = "cw_cart_";
  let business = null, categories = [], products = [];
  let cart = []; // {id, name, price, qty, image}
  let filterCat = "";
  let search = "";
  let sortBy = "default";
  /* Precio efectivo (el que paga el cliente): oferta si la hay. */
  const effPrice = (p) => Number(p.promo_price || p.price) || 0;

  function cartKey() { return CART_KEY + (business ? business.slug : "x"); }
  function loadCart() { try { cart = JSON.parse(localStorage.getItem(cartKey())) || []; } catch (e) { cart = []; } }
  function saveCart() { localStorage.setItem(cartKey(), JSON.stringify(cart)); renderCart(); }
  function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
  function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

  /* ---------- Carga ---------- */
  async function boot() {
    const slug = U.qs("b") || "demo";
    business = await S.businessBySlug(slug);

    if (!business) {
      $("#catalogBody").innerHTML = `<div class="empty"><div class="ico">🔍</div><h3>${t("catalog.notFound")}</h3><p>${t("catalog.notFoundSub")}</p><a class="btn btn-primary mt-2" href="/index.html">${t("nav.home")}</a></div>`;
      $("#catalogHero").classList.add("hidden");
      $(".catalog-toolbar").classList.add("hidden");
      return;
    }

    // Branding
    document.title = business.name + " — Catalogo Wha";
    if (business.brand_color) document.documentElement.style.setProperty("--brand-600", business.brand_color);
    $("#catBrandName").textContent = business.name;
    $("#footBiz").textContent = business.name;
    $("#heroName").textContent = business.name;
    $("#heroDesc").textContent = business.hero_enabled ? (business.hero_desc || business.description || "") : (business.description || "");
    if (business.hero_enabled && business.hero_title) $("#heroName").textContent = business.hero_title;
    if (business.hero_image) {
      $("#catalogHero").style.backgroundImage = `linear-gradient(rgba(20,10,35,.55),rgba(20,10,35,.55)),url(${business.hero_image})`;
      $("#catalogHero").style.backgroundSize = "cover";
      $("#catalogHero").style.backgroundPosition = "center";
    }
    applyBusinessSeo();
    renderBusinessInfo();
    if (business.logo_url) {
      $("#heroLogo").innerHTML = `<img src="${U.escapeHtml(business.logo_url)}" alt="" style="height:64px;border-radius:14px;background:#fff;padding:6px">`;
      $("#catLogo").outerHTML = `<img id="catLogo" src="${U.escapeHtml(business.logo_url)}" alt="" style="height:34px;width:34px;object-fit:cover;border-radius:10px">`;
    }
    $("#catWaTop").href = U.waLink(business.whatsapp, business.name);
    $("#year").textContent = new Date().getFullYear();

    loadCart();
    updateJsonLd();

    categories = await S.listCategories(business.id);
    products = (await S.listProducts(business.id)).filter((p) => p.active !== false);

    renderChips();
    renderProducts();
    renderCart();

    $("#catSelect").addEventListener("change", (e) => { filterCat = e.target.value; renderProducts(); });
    $("#sortSelect").addEventListener("change", (e) => { sortBy = e.target.value; renderProducts(); });
    $("#catSearch").addEventListener("input", (e) => { search = e.target.value.toLowerCase(); renderProducts(); });
    $("#cartFab").addEventListener("click", () => $("#cartDrawer").classList.add("open"));
    $$("[data-cart-close]").forEach((b) => b.addEventListener("click", () => $("#cartDrawer").classList.remove("open")));
    $("#sendOrder").addEventListener("click", sendOrder);
    document.addEventListener("langchange", () => { renderChips(); renderProducts(); renderCart(); });
  }

  /* ---------- SEO dinámico del negocio ---------- */
  function applyBusinessSeo() {
    const title = business.seo_title || (business.name + " — " + (business.hero_title || business.description || "Catálogo online"));
    const desc = business.seo_description || business.hero_desc || business.description || (business.name + " — catálogo online, pedidos por WhatsApp.");
    const img = business.seo_image || business.hero_image || business.logo_url || "assets/img/og-image.png";
    const url = U.catalogUrl(business.slug);

    document.title = title;
    const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
    set('meta[name="description"]', "content", desc);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", desc);
    set('meta[property="og:image"]', "content", img);
    set('meta[property="og:url"]', "content", url);
    set('meta[name="twitter:title"]', "content", title);
    set('meta[name="twitter:description"]', "content", desc);
    set('meta[name="twitter:image"]', "content", img);
    if (business.seo_keywords) set('meta[name="keywords"]', "content", business.seo_keywords);
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) { canon.setAttribute("data-base", url); canon.setAttribute("href", url); }
  }

  function updateJsonLd() {
    const old = document.getElementById("bizJsonLd");
    if (old) old.remove();
    const data = {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": business.name,
      "description": business.seo_description || business.description || "",
      "url": U.catalogUrl(business.slug),
      "telephone": "+" + String(business.whatsapp || "").replace(/\D/g, ""),
      "image": business.seo_image || business.hero_image || business.logo_url || undefined,
      "address": business.city ? { "@type": "PostalAddress", "addressLocality": business.city, "addressCountry": business.country || "" } : undefined,
      "currenciesAccepted": business.currency,
      "paymentAccepted": (business.payments || "").replace(/\[(\w+)\]/g, "$1 ").trim() || undefined
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "bizJsonLd";
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ---------- Info de entrega y pago ---------- */
  const DLV_LABEL = { pickup: "cfg.pickup", local: "cfg.localDelivery", shipping: "cfg.shipping", meetup: "cfg.meetup" };
  const DLV_ICO = { pickup: "🏬", local: "🛵", shipping: "📦", meetup: "🤝" };
  const PAY_LABEL = { cash: "cfg.cash", transfer: "cfg.bankTransfer", card: "cfg.cardOnDelivery", online: "cfg.onlinePayment", wallet: "cfg.mobileWallet" };
  const PAY_ICO = { cash: "💵", transfer: "🏦", card: "💳", online: "🌐", wallet: "📱" };

  function parseTags(v) {
    const out = [];
    String(v || "").replace(/\[(\w+)\]/g, (m, k) => { out.push(k); return ""; });
    return out;
  }

  function renderBusinessInfo() {
    const box = $("#catInfo");
    if (!box) return;
    const dlv = parseTags(business.delivery);
    const pay = parseTags(business.payments);
    if (!dlv.length && !pay.length && !business.delivery_notes && !business.payment_notes) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="grid cols-2" style="gap:16px">
        ${dlv.length || business.delivery_notes ? `<div class="card"><h3>${t("cfg.delivery")}</h3>
          <div class="row wrap" style="gap:8px">${dlv.map((k) => `<span class="badge info">${DLV_ICO[k] || ""} ${t(DLV_LABEL[k] || k)}</span>`).join("")}</div>
          ${business.delivery_fee ? `<p class="small mt-2">${t("cfg.deliveryFee")}: <strong>${U.currency(business.delivery_fee, business.currency)}</strong></p>` : ""}
          ${business.delivery_time ? `<p class="small">${t("cfg.deliveryTime")}: <strong>${U.escapeHtml(business.delivery_time)}</strong></p>` : ""}
          ${business.delivery_notes ? `<p class="small muted">${U.escapeHtml(business.delivery_notes)}</p>` : ""}</div>` : ""}
        ${pay.length || business.payment_notes ? `<div class="card"><h3>${t("cfg.payments")}</h3>
          <div class="row wrap" style="gap:8px">${pay.map((k) => `<span class="badge ok">${PAY_ICO[k] || ""} ${t(PAY_LABEL[k] || k)}</span>`).join("")}</div>
          ${business.payment_notes ? `<p class="small muted mt-2">${U.escapeHtml(business.payment_notes)}</p>` : ""}</div>` : ""}
      </div>`;
  }

  /* ---------- Chips de categorías ---------- */
  /* Filtro de categorías: un desplegable compacto (sin fila deslizable). */
  function renderChips() {
    const sel = $("#catSelect");
    if (!sel) return;
    /* Número de productos de cada categoría: «Ropa (12)». */
    const countFor = (id) => (id ? products.filter((p) => p.category_id === id).length : products.length);
    const items = [{ id: "", name: t("catalog.all") }].concat(categories);
    sel.innerHTML = items.map((c) =>
      `<option value="${U.escapeHtml(c.id)}">${U.escapeHtml(c.name)} (${countFor(c.id)})</option>`).join("");
    sel.value = filterCat || "";
  }

  /* ---------- Productos ---------- */
  function renderProducts() {
    let list = products.slice();
    if (filterCat) list = list.filter((p) => p.category_id === filterCat);
    if (search) list = list.filter((p) => (p.name || "").toLowerCase().includes(search) || (p.description || "").toLowerCase().includes(search));
    if (sortBy === "price-asc") list.sort((a, b) => effPrice(a) - effPrice(b) || (a.sort_order || 0) - (b.sort_order || 0));
    else if (sortBy === "price-desc") list.sort((a, b) => effPrice(b) - effPrice(a) || (a.sort_order || 0) - (b.sort_order || 0));
    else if (sortBy === "new") list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    else list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (!list.length) {
      $("#catalogBody").innerHTML = `<div class="empty"><div class="ico">📦</div><h3>${t("catalog.noProducts")}</h3></div>`;
      return;
    }
    $("#catalogBody").innerHTML = `<div class="product-grid">${list.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      const img = (p.images && p.images[0]) || "";
      const hasPromo = Number(p.promo_price) > 0 && Number(p.promo_price) < Number(p.price);
      const savePct = hasPromo ? Math.round((1 - Number(p.promo_price) / Number(p.price)) * 100) : 0;
      const inCart = cart.some((i) => i.id === p.id);
      return `<article class="product-card" data-pid="${p.id}">
        <div class="pc-media">
          ${img ? `<img class="pc-img" src="${U.escapeHtml(img)}" alt="${U.escapeHtml(p.name)}" loading="lazy" decoding="async">` : `<div class="pc-img pc-noimg">📦</div>`}
          ${cat ? `<span class="pc-badge">${U.escapeHtml(cat.name)}</span>` : ""}
          ${inCart ? `<button class="pc-x" data-remove="${p.id}" title="${t("catalog.removeFromOrder")}" aria-label="${t("catalog.removeFromOrder")}">✕</button>` : ""}
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${U.escapeHtml(p.name)}</h3>
          <ul class="pc-meta">
            <li><span class="pc-ic">🏷️</span><span>${t("catalog.cat")}: <b>${U.escapeHtml(cat ? cat.name : "—")}</b></span></li>
            <li><span class="pc-ic">💰</span><span>${t("catalog.price")}: <b>${U.currency(p.price, business.currency)}</b></span></li>
            ${hasPromo
              ? `<li><span class="pc-ic">🎁</span><span>${t("catalog.offer")}: <b>${U.currency(p.promo_price, business.currency)}</b></span></li>
                 <li class="pc-ok"><span class="pc-ic">✅</span><span>${t("catalog.save")}: <b>${savePct}%</b></span></li>`
              : `<li><span class="pc-ic">🎁</span><span>${t("catalog.offer")}: <b>—</b></span></li>
                 <li class="pc-ok"><span class="pc-ic">✅</span><span><b>${t("catalog.available")}</b></span></li>`}
          </ul>
          <div class="pc-actions">
            <button class="btn btn-primary btn-sm pc-add" data-add="${p.id}">+ ${t("catalog.addToCart")}</button>
            <button class="btn btn-soft btn-sm pc-share" data-share="${p.id}">${t("catalog.share")}</button>
          </div>
        </div>
      </article>`;
    }).join("")}</div>`;

    $$("[data-add]").forEach((b) => b.addEventListener("click", () => {
      const p = products.find((x) => x.id === b.getAttribute("data-add"));
      if (!p) return;
      addToCart(p);
      b.textContent = "✓ " + t("catalog.addToCart");
      setTimeout(() => { b.textContent = "+ " + t("catalog.addToCart"); }, 900);
      addRemoveButton(p.id);
    }));

    $$("[data-remove]").forEach((b) => b.addEventListener("click", () => removeFromOrder(b.getAttribute("data-remove"), b)));
    $$("[data-share]").forEach((b) => b.addEventListener("click", () => shareProduct(b.getAttribute("data-share"))));

    trackViews();
  }

  /* Añade la ✕ de "quitar del pedido" a la tarjeta, sin repintar la rejilla. */
  function addRemoveButton(id) {
    const card = document.querySelector(`.product-card[data-pid="${id}"]`);
    const media = card && card.querySelector(".pc-media");
    if (!media || media.querySelector(".pc-x")) return;
    const x = document.createElement("button");
    x.className = "pc-x";
    x.setAttribute("data-remove", id);
    x.setAttribute("title", t("catalog.removeFromOrder"));
    x.setAttribute("aria-label", t("catalog.removeFromOrder"));
    x.textContent = "✕";
    x.addEventListener("click", () => removeFromOrder(id, x));
    media.appendChild(x);
  }

  function removeFromOrder(id, btn) {
    cart = cart.filter((i) => i.id !== id);
    saveCart();
    if (btn) btn.remove();
  }

  /* Comparte el producto por WhatsApp (sin destinatario: abre el selector). */
  function shareProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const url = location.origin + location.pathname + "?b=" + encodeURIComponent(business.slug);
    const msg = "*" + p.name + "*\n" + U.currency(effPrice(p), business.currency) + "\n" + url;
    window.open(U.waLink("", msg), "_blank");
  }

  /* Registra una visita por producto y sesión ("productos más vistos"). */
  const SEEN_KEY = "cw_seen_views_v1";
  function seenViews() { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch (e) { return {}; } }
  function trackViews() {
    if (!("IntersectionObserver" in window) || !window.CW.store || !window.CW.store.trackProductView) return;
    const seen = seenViews();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const id = el.getAttribute("data-pid");
        io.unobserve(el);
        if (!id || seen[id]) return;
        seen[id] = 1;
        const keys = Object.keys(seen);
        if (keys.length > 500) delete seen[keys[0]];
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) { /* sin espacio */ }
        window.CW.store.trackProductView(id);
      });
    }, { threshold: 0.5 });
    $$("[data-pid]").forEach((el) => io.observe(el));
  }

  /* ---------- Carrito ---------- */
  function addToCart(p) {
    const price = p.promo_price || p.price;
    const found = cart.find((i) => i.id === p.id);
    if (found) found.qty += 1;
    else cart.push({ id: p.id, name: p.name, price: Number(price), qty: 1, image: (p.images && p.images[0]) || "" });
    saveCart();
  }

  function renderCart() {
    const fab = $("#cartFab");
    fab.classList.toggle("hidden", cart.length === 0);
    $("#cartCount").textContent = cartCount();
    $("#cartTotal").textContent = U.currency(cartTotal(), business ? business.currency : "");
    const c = $("#cartContent");
    if (!cart.length) {
      c.innerHTML = `<div class="empty"><div class="ico">🛒</div><h3>${t("catalog.emptyCart")}</h3><p>${t("catalog.emptyCartSub")}</p></div>`;
      return;
    }
    c.innerHTML = cart.map((i, idx) => `
      <div class="cart-line">
        ${i.image ? `<img src="${U.escapeHtml(i.image)}" alt="">` : `<div style="width:54px;height:54px;border-radius:10px;background:var(--brand-050)"></div>`}
        <div style="flex:1">
          <div><strong>${U.escapeHtml(i.name)}</strong></div>
          <div class="small muted">${U.currency(i.price, business.currency)}</div>
          <div class="qty mt-1">
            <button data-dec="${idx}">−</button><span>${i.qty}</span><button data-inc="${idx}">+</button>
          </div>
        </div>
        <div style="text-align:end"><strong>${U.currency(i.price * i.qty, business.currency)}</strong>
          <div><button class="btn btn-danger btn-sm" data-rm="${idx}">✕</button></div></div>
      </div>`).join("");
    $$("[data-inc]").forEach((b) => b.addEventListener("click", () => { cart[+b.getAttribute("data-inc")].qty++; saveCart(); }));
    $$("[data-dec]").forEach((b) => b.addEventListener("click", () => { const i = +b.getAttribute("data-dec"); cart[i].qty--; if (cart[i].qty <= 0) cart.splice(i, 1); saveCart(); }));
    $$("[data-rm]").forEach((b) => b.addEventListener("click", () => { cart.splice(+b.getAttribute("data-rm"), 1); saveCart(); }));
  }

  /* ---------- Enviar pedido por WhatsApp ---------- */
  async function sendOrder() {
    if (!cart.length) return;
    const name = $("#custName").value.trim();
    const note = $("#custNote").value.trim();
    if (!name) { $("#custName").focus(); $("#custName").style.outline = "2px solid var(--danger)"; return; }

    const code = "CW-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    // Mensaje con negrita nativa de WhatsApp (*texto*), sin iconos incompatibles
    let msg = "*" + t("catalog.orderFor") + " " + business.name + "*\n";
    msg += "*" + t("ord.code") + ":* " + code + "\n";
    msg += "*" + t("catalog.name") + ":* " + name + "\n\n";
    msg += "*" + t("catalog.products") + ":*\n";
    cart.forEach((i) => {
      msg += "• " + i.name + " x" + i.qty + " = " + U.currency(i.price * i.qty, business.currency) + "\n";
    });
    msg += "\n*" + t("catalog.subtotal") + ":* " + U.currency(cartTotal(), business.currency) + "\n";
    if (note) msg += "\n*" + t("catalog.note") + ":* " + note + "\n";

    // Entrega y formas de pago configuradas por el negocio
    const dlv = parseTags(business.delivery).map((k) => t(DLV_LABEL[k] || k));
    const pay = parseTags(business.payments).map((k) => t(PAY_LABEL[k] || k));
    if (dlv.length || business.delivery_time || business.delivery_fee) {
      msg += "\n*" + t("cfg.delivery") + ":* " + (dlv.join(", ") || "—");
      if (business.delivery_time) msg += " (" + business.delivery_time + ")";
      if (business.delivery_fee) msg += " — " + U.currency(business.delivery_fee, business.currency);
      msg += "\n";
    }
    if (pay.length) msg += "*" + t("cfg.payments") + ":* " + pay.join(", ") + "\n";

    msg += "\n" + t("catalog.poweredBy");

    // Guardar el pedido en el panel del negocio
    try {
      await S.createOrder({
        business_id: business.id, code, customer_name: name, note,
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        total: cartTotal(), status: "new"
      });
    } catch (e) { /* el pedido igual se envía por WhatsApp */ }

    window.open(U.waLink(business.whatsapp, msg), "_blank");
    cart = [];
    saveCart();
    $("#cartDrawer").classList.remove("open");
    $("#custName").value = "";
    $("#custNote").value = "";
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
