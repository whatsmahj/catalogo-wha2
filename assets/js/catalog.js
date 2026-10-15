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
  let filterProd = "";
  let filterServ = "";
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

    const selP = $("#catSelectProd");
    if (selP) selP.addEventListener("change", (e) => { filterProd = e.target.value; renderProducts(); });
    const selS = $("#catSelectServ");
    if (selS) selS.addEventListener("change", (e) => { filterServ = e.target.value; renderProducts(); });
    const dIn = $("#custDate");
    if (dIn) dIn.addEventListener("change", checkWorkDay);
    $("#sortSelect").addEventListener("change", (e) => { sortBy = e.target.value; renderProducts(); });
    $("#catSearch").addEventListener("input", (e) => { search = e.target.value.toLowerCase(); renderProducts(); });
    $("#cartFab").addEventListener("click", () => $("#cartDrawer").classList.add("open"));
    $$("[data-pd-close]").forEach((b) => b.addEventListener("click", closeProductDetail));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#pdModal").classList.contains("hidden")) closeProductDetail();
    });
    $$("[data-cart-close]").forEach((b) => b.addEventListener("click", () => $("#cartDrawer").classList.remove("open")));
    $("#sendOrder").addEventListener("click", sendOrder);
    document.addEventListener("langchange", () => {
      renderChips(); renderProducts(); renderCart();
      /* Si la ficha está abierta, se repinta en el idioma nuevo. */
      if (pdCurrent && !$("#pdModal").classList.contains("hidden")) openProductDetail(pdCurrent);
    });
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
  /* Dos selectores independientes: uno de categorías de productos y otro
     de categorías de servicios. Si una categoría tiene productos de los dos
     tipos, aparece en los dos. */
  function renderChips() {
    const prod = categories.filter((c) => (c.kind || "product") === "product");
    const serv = categories.filter((c) => c.kind === "service");
    const countFor = (id) => products.filter((p) => p.category_id === id).length;
    const opt = (c) => `<option value="${U.escapeHtml(c.id)}">${U.escapeHtml(c.name)} (${countFor(c.id)})</option>`;
    const all = `<option value="">${t("catalog.all")} (${products.length})</option>`;

    const selP = $("#catSelectProd");
    if (selP) {
      selP.innerHTML = all + prod.map(opt).join("");
      selP.value = filterProd;
      if (selP.value !== filterProd) { filterProd = ""; selP.value = ""; }
    }
    const selS = $("#catSelectServ");
    if (selS) {
      selS.innerHTML = all + serv.map(opt).join("");
      selS.value = filterServ;
      if (selS.value !== filterServ) { filterServ = ""; selS.value = ""; }
    }

    /* El selector solo se muestra si el negocio tiene categorías de ese tipo. */
    const fp = $("#catFilterProd"), fs = $("#catFilterServ");
    if (fp) fp.classList.toggle("hidden", prod.length === 0);
    if (fs) fs.classList.toggle("hidden", serv.length === 0);
  }

  /* Filas de datos de la tarjeta. Son DISTINTAS para productos y servicios:
     un servicio no tiene "oferta" ni "ahorro", pero sí duración y modalidad. */
  function metaRowsHtml(p, cat) {
    const isService = p.kind === "service";
    const price = Number(p.price) || 0;
    const hasPromo = Number(p.promo_price) > 0 && Number(p.promo_price) < price;
    const savePct = hasPromo ? Math.round((1 - Number(p.promo_price) / price) * 100) : 0;
    const money = (v) => (Number(v) > 0 ? U.currency(v, business.currency) : t("catalog.priceOnRequest"));
    const li = (ic, label, val, cls) =>
      `<li${cls ? ` class="${cls}"` : ""}><span class="pc-ic">${ic}</span><span>${label}: <b>${val}</b></span></li>`;

    const rows = [li("🏷️", t("catalog.cat"), U.escapeHtml(cat ? cat.name : "—"))];
    rows.push(li("💰", t("catalog.price"), money(p.price)));

    if (isService) {
      if (p.duration) rows.push(li("⏱", t("catalog.duration"), U.escapeHtml(p.duration)));
      if (p.modality) rows.push(li("📍", t("catalog.modality"), U.escapeHtml(p.modality)));
      rows.push(`<li class="pc-ok"><span class="pc-ic">✅</span><span><b>${t("catalog.available")}</b></span></li>`);
    } else if (hasPromo) {
      rows.push(li("🎁", t("catalog.offer"), money(p.promo_price)));
      rows.push(`<li class="pc-ok"><span class="pc-ic">✅</span><span>${t("catalog.save")}: <b>${savePct}%</b></span></li>`);
    } else {
      rows.push(`<li class="pc-ok"><span class="pc-ic">✅</span><span><b>${t("catalog.available")}</b></span></li>`);
    }
    return rows.join("");
  }

  /* ---------- Productos ---------- */
  function renderProducts() {
    let list = products.slice();
    /* Si eliges una categoría, se muestra SOLO ese tipo (productos o servicios),
       nunca los dos mezclados. Con los dos selectores en "Todos" se ve todo. */
    if (filterProd || filterServ) {
      list = list.filter((p) => {
        const isService = p.kind === "service";
        if (isService) return filterServ ? p.category_id === filterServ : false;
        return filterProd ? p.category_id === filterProd : false;
      });
    }
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
      const isService = p.kind === "service";
      const addLabel = isService ? (p.bookable ? t("catalog.book") : t("catalog.request")) : t("catalog.addToCart");
      const hasPromo = Number(p.promo_price) > 0 && Number(p.promo_price) < Number(p.price);
      const savePct = hasPromo ? Math.round((1 - Number(p.promo_price) / Number(p.price)) * 100) : 0;
      const inCart = cart.some((i) => i.id === p.id);
      return `<article class="product-card" data-pid="${p.id}">
        <div class="pc-media">
          ${img ? `<img class="pc-img" src="${U.escapeHtml(img)}" alt="${U.escapeHtml(p.name)}" loading="lazy" decoding="async">` : `<div class="pc-img pc-noimg">📦</div>`}
          ${isService ? `<span class="pc-type">${t("catalog.service")}</span>` : ""}
          ${cat ? `<span class="pc-badge">${U.escapeHtml(cat.name)}</span>` : ""}
          ${inCart ? `<button class="pc-x" data-remove="${p.id}" title="${t("catalog.removeFromOrder")}" aria-label="${t("catalog.removeFromOrder")}">✕</button>` : ""}
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${U.escapeHtml(p.name)}</h3>
          <ul class="pc-meta">${metaRowsHtml(p, cat)}</ul>
          <div class="pc-actions">
            <button class="btn btn-primary btn-sm pc-add" data-add="${p.id}" data-label="${U.escapeHtml(addLabel)}">+ ${addLabel}</button>
            <button class="btn btn-soft btn-sm pc-detail" data-detail="${p.id}">${t("catalog.details")}</button>
          </div>
        </div>
      </article>`;
    }).join("")}</div>`;

    $$("[data-add]").forEach((b) => b.addEventListener("click", () => {
      const p = products.find((x) => x.id === b.getAttribute("data-add"));
      if (!p) return;
      addToCart(p);
      const label = b.getAttribute("data-label") || t("catalog.addToCart");
      b.textContent = "✓ " + label;
      setTimeout(() => { b.textContent = "+ " + label; }, 900);
      addRemoveButton(p.id);
    }));

    $$("[data-remove]").forEach((b) => b.addEventListener("click", () => removeFromOrder(b.getAttribute("data-remove"), b)));
    $$("[data-detail]").forEach((b) => b.addEventListener("click", () => openProductDetail(b.getAttribute("data-detail"))));

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

  /* Comparte el producto por WhatsApp con un texto útil:
     nombre, precio (con la rebaja), descripción, datos según el tipo,
     contacto del negocio y enlace directo al catálogo. */
  function shareProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const cat = categories.find((c) => c.id === p.category_id);
    const isService = p.kind === "service";
    const price = Number(p.price) || 0;
    const hasPromo = Number(p.promo_price) > 0 && Number(p.promo_price) < price;
    const savePct = hasPromo ? Math.round((1 - Number(p.promo_price) / price) * 100) : 0;
    const url = location.origin + location.pathname + "?b=" + encodeURIComponent(business.slug);
    const L = [];

    // Título y precio
    L.push("*" + p.name + "*");
    if (hasPromo) {
      L.push(U.currency(p.promo_price, business.currency) +
        " (" + t("catalog.before") + " " + U.currency(price, business.currency) + " · -" + savePct + "%)");
    } else if (price > 0) {
      L.push(U.currency(price, business.currency));
    } else {
      L.push(t("catalog.priceOnRequest"));
    }

    // Descripción (recortada para no hacer un mensaje enorme)
    const desc = (p.description || "").trim();
    if (desc) {
      L.push("");
      L.push(desc.length > 220 ? desc.slice(0, 220).trim() + "…" : desc);
    }

    // Datos relevantes según sea producto o servicio
    const datos = [];
    if (cat) datos.push(t("catalog.cat") + ": " + cat.name);
    if (isService) {
      if (p.duration) datos.push(t("catalog.duration") + ": " + p.duration);
      if (p.modality) datos.push(t("catalog.modality") + ": " + p.modality);
    } else if (hasPromo) {
      datos.push(t("catalog.save") + ": " + savePct + "%");
    }
    if (datos.length) { L.push(""); datos.forEach((d) => L.push(d)); }

    // Negocio, contacto y enlace
    L.push("");
    L.push("*" + business.name + "*");
    const wa = String(business.whatsapp || "").replace(/\D/g, "");
    if (wa) L.push(t("order.phone") + ": +" + wa);
    L.push(url);

    window.open(U.waLink("", L.join("\n")), "_blank");
  }

  /* ---------- Ficha de producto ---------- */
  let pdList = [];
  let pdCurrent = null;

  function openProductDetail(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    pdCurrent = id;
    const cat = categories.find((c) => c.id === p.category_id);
    const price = Number(p.price) || 0;
    const hasPromo = Number(p.promo_price) > 0 && Number(p.promo_price) < price;
    const savePct = hasPromo ? Math.round((1 - Number(p.promo_price) / price) * 100) : 0;
    const isService = p.kind === "service";
    const money = (v) => (Number(v) > 0 ? U.currency(v, business.currency) : t("catalog.priceOnRequest"));

    const badge = $("#pdBadge");
    badge.textContent = cat ? cat.name : "";
    badge.classList.toggle("hidden", !cat);

    const kindEl = $("#pdKind");
    kindEl.textContent = isService ? t("catalog.service") : "";
    kindEl.classList.toggle("hidden", !isService);

    $("#pdName").textContent = p.name;
    $("#pdPrice").innerHTML = hasPromo
      ? `<span class="now">${money(p.promo_price)}</span><span class="old">${money(price)}</span><span class="save">-${savePct}%</span>`
      : `<span class="now">${money(price)}</span>`;

    const desc = (p.description || "").trim();
    const dEl = $("#pdDesc");
    dEl.textContent = desc || t("catalog.noDescription");
    dEl.classList.toggle("muted", !desc);

    $("#pdMeta").innerHTML = metaRowsHtml(p, cat);

    renderPdImages((p.images || []).filter(Boolean), p.name);

    const addBtn = $("#pdAdd");
    const addLabel = isService ? (p.bookable ? t("catalog.book") : t("catalog.request")) : t("catalog.addToCart");
    addBtn.textContent = "+ " + addLabel;
    addBtn.onclick = () => {
      addToCart(p);
      addRemoveButton(p.id);
      addBtn.textContent = "✓ " + addLabel;
      setTimeout(() => { addBtn.textContent = "+ " + addLabel; }, 900);
    };
    $("#pdShare").textContent = t("catalog.share");
    $("#pdShare").onclick = () => shareProduct(p.id);

    $("#pdModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function renderPdImages(imgs, name) {
    pdList = imgs;
    const main = $("#pdImg"), noimg = $("#pdNoImg"), thumbs = $("#pdThumbs");
    if (!imgs.length) {
      main.hidden = true;
      noimg.hidden = false;
      thumbs.innerHTML = "";
      return;
    }
    main.hidden = false;
    noimg.hidden = true;
    main.src = imgs[0];
    main.alt = name;
    thumbs.innerHTML = imgs.length > 1
      ? imgs.map((u, i) => `<button class="pd-thumb${i === 0 ? " active" : ""}" data-pd-thumb="${i}" aria-label="${i + 1}"><img src="${U.escapeHtml(u)}" alt=""></button>`).join("")
      : "";
    $$("[data-pd-thumb]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.getAttribute("data-pd-thumb"));
      if (!pdList[i]) return;
      main.src = pdList[i];
      $$("[data-pd-thumb]").forEach((x) => x.classList.toggle("active", x === b));
    }));
  }

  function closeProductDetail() {
    pdCurrent = null;
    $("#pdModal").classList.add("hidden");
    document.body.style.overflow = "";
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
    else cart.push({ id: p.id, name: p.name, price: Number(price), qty: 1, image: (p.images && p.images[0]) || "", kind: p.kind || "product", bookable: !!p.bookable });
    saveCart();
  }

  /* ---------- Horarios disponibles para las citas ---------- */
  const toMin = (s) => { const p = String(s || "").split(":"); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); };
  const fmtMin = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

  function buildSlots() {
    const open = business.open_time || "09:00";
    const close = business.close_time || "18:00";
    const step = Number(business.slot_minutes) || 30;
    const out = [];
    for (let t = toMin(open); t <= toMin(close) && out.length < 96; t += step) out.push(fmtMin(t));
    return out.length ? out : ["09:00"];
  }

  function workDays() { return business.work_days || "[1][2][3][4][5][6]"; }

  function fillSlots() {
    const sel = $("#custTime");
    if (!sel) return;
    const prev = sel.value;
    const slots = buildSlots();
    sel.innerHTML = slots.map((s) => `<option value="${s}">${s}</option>`).join("");
    if (prev && slots.indexOf(prev) >= 0) sel.value = prev;
  }

  /* Avisa si el día elegido no es laborable. */
  function checkWorkDay() {
    const dEl = $("#custDate"), hint = $("#apptHint");
    if (!dEl || !hint) return true;
    if (!dEl.value) { hint.textContent = t("order.apptHint"); hint.style.color = ""; return true; }
    const dow = new Date(dEl.value + "T12:00:00").getDay();
    const iso = dow === 0 ? 7 : dow;
    if (workDays().indexOf("[" + iso + "]") < 0) {
      hint.textContent = t("order.closedDay");
      hint.style.color = "var(--danger)";
      return false;
    }
    hint.textContent = t("order.apptHint");
    hint.style.color = "";
    return true;
  }

  function renderCart() {
    const fab = $("#cartFab");
    fab.classList.toggle("hidden", cart.length === 0);
    $("#cartCount").textContent = cartCount();
    $("#cartTotal").textContent = U.currency(cartTotal(), business ? business.currency : "");

    /* Los campos de cita solo salen si el pedido lleva algún servicio reservable. */
    const af = $("#apptFields");
    if (af) {
      const needs = cart.some((i) => i.bookable);
      af.classList.toggle("hidden", !needs);
      if (needs) {
        fillSlots();
        const dEl = $("#custDate");
        if (dEl && !dEl.min) {
          const h = new Date();
          dEl.min = h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") + "-" + String(h.getDate()).padStart(2, "0");
        }
      }
    }

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
    const phone = $("#custPhone").value.trim();
    const address = $("#custAddress").value.trim();
    const city = $("#custCity").value.trim();
    const note = $("#custNote").value.trim();
    const needsAppt = cart.some((i) => i.bookable);
    const date = ($("#custDate") || {}).value || "";
    const time = ($("#custTime") || {}).value || "";

    /* Nombre y teléfono son obligatorios. Si hay un servicio reservable,
       también hay que elegir el día de la cita. */
    const faltan = [];
    if (!name) { faltan.push($("#custName")); }
    if (!phone) { faltan.push($("#custPhone")); }
    if (needsAppt && !date) { faltan.push($("#custDate")); }
    if (needsAppt && date && !checkWorkDay()) { faltan.push($("#custDate")); }
    if (faltan.length) {
      faltan.forEach((el) => { el.style.outline = "2px solid var(--danger)"; });
      faltan[0].focus();
      return;
    }
    ["#custName", "#custPhone", "#custDate"].forEach((s) => { $(s).style.outline = ""; });

    const code = "CW-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const apptAt = needsAppt && date ? new Date(date + "T" + (time || "09:00") + ":00") : null;
    const cur = business.currency;
    const sub = cartTotal();
    const fee = Number(business.delivery_fee) > 0 ? Number(business.delivery_fee) : 0;
    const total = sub + fee;
    const dlv = parseTags(business.delivery).map((k) => t(DLV_LABEL[k] || k));
    const pay = parseTags(business.payments).map((k) => t(PAY_LABEL[k] || k));

    /* Mensaje por bloques, con negrita nativa de WhatsApp (*texto*)
       y SIN iconos ni emojis (no todos los dispositivos los muestran bien). */
    const L = [];
    const sep = "--------------------------------";
    const campo = (label, valor) => { if (valor) L.push(label + ": " + valor); };

    // 1) Cabecera
    L.push("*" + t("order.title") + "*");
    L.push(business.name);
    L.push(t("ord.code") + ": *" + code + "*");
    L.push(sep);

    // 2) Datos del cliente
    L.push("*" + t("order.customer") + "*");
    campo(t("order.name"), name);
    campo(t("order.phone"), phone);
    campo(t("order.address"), address);
    campo(t("order.city"), city);
    campo(t("order.note"), note);

    // 2b) Cita (solo si el pedido lleva algún servicio reservable)
    if (apptAt) {
      L.push(sep);
      L.push("*" + t("order.appointment") + "*");
      L.push(t("order.date") + ": " + apptAt.toLocaleDateString());
      if (time) L.push(t("order.hour") + ": " + time);
    }
    L.push(sep);

    // 3) Artículos (productos y servicios)
    L.push("*" + t("order.items") + "*");
    cart.forEach((i, n) => {
      L.push((n + 1) + ". " + i.name + (i.kind === "service" ? " (" + t("catalog.service") + ")" : ""));
      if (Number(i.price) > 0) {
        L.push("    " + i.qty + " x " + U.currency(i.price, cur) + " = " + U.currency(i.price * i.qty, cur));
      } else {
        L.push("    " + i.qty + " x " + t("catalog.priceOnRequest"));
      }
    });
    L.push(sep);

    // 4) Resumen de importes
    L.push("*" + t("order.summary") + "*");
    if (fee > 0) {
      L.push(t("order.subtotal") + ": " + U.currency(sub, cur));
      L.push(t("order.deliveryFee") + ": +" + U.currency(fee, cur));
    }
    L.push(t("order.total") + ": *" + U.currency(total, cur) + "*");

    // 5) Entrega
    const dlvLines = [];
    if (dlv.length) dlvLines.push(dlv.join(", "));
    if (business.delivery_time) dlvLines.push(t("order.time") + ": " + business.delivery_time);
    if (dlvLines.length) {
      L.push(sep);
      L.push("*" + t("order.deliverySection") + "*");
      dlvLines.forEach((x) => L.push(x));
    }

    // 6) Forma de pago
    if (pay.length) {
      L.push(sep);
      L.push("*" + t("order.paymentSection") + "*");
      L.push(pay.join(", "));
    }

    L.push(sep);
    L.push(t("catalog.poweredBy"));
    const msg = L.join("\n");

    // Guardar el pedido en el panel del negocio
    try {
      await S.createOrder({
        business_id: business.id, code,
        customer_name: name, note,
        customer_phone: phone, customer_address: address, customer_city: city,
        appointment_at: apptAt ? apptAt.toISOString() : null,
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, kind: i.kind || "product" })),
        total, status: "new"
      });
    } catch (e) { /* el pedido igual se envía por WhatsApp */ }

    window.open(U.waLink(business.whatsapp, msg), "_blank");
    cart = [];
    saveCart();
    $("#cartDrawer").classList.remove("open");
    ["#custName", "#custPhone", "#custAddress", "#custCity", "#custNote", "#custDate", "#custTime"].forEach((s) => { const el = $(s); if (el) el.value = ""; });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
