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
    if (business.logo_url) {
      $("#heroLogo").innerHTML = `<img src="${U.escapeHtml(business.logo_url)}" alt="" style="height:64px;border-radius:14px;background:#fff;padding:6px">`;
      $("#catLogo").outerHTML = `<img id="catLogo" src="${U.escapeHtml(business.logo_url)}" alt="" style="height:34px;width:34px;object-fit:cover;border-radius:10px">`;
    }
    $("#catWaTop").href = U.waLink(business.whatsapp, business.name);
    $("#year").textContent = new Date().getFullYear();

    loadCart();

    categories = await S.listCategories(business.id);
    products = (await S.listProducts(business.id)).filter((p) => p.active !== false);

    renderChips();
    renderProducts();
    renderCart();

    $("#catSearch").addEventListener("input", (e) => { search = e.target.value.toLowerCase(); renderProducts(); });
    $("#cartFab").addEventListener("click", () => $("#cartDrawer").classList.add("open"));
    $$("[data-cart-close]").forEach((b) => b.addEventListener("click", () => $("#cartDrawer").classList.remove("open")));
    $("#sendOrder").addEventListener("click", sendOrder);
    document.addEventListener("langchange", () => { renderChips(); renderProducts(); renderCart(); });
  }

  /* ---------- Chips de categorías ---------- */
  function renderChips() {
    const chips = $("#catChips");
    const items = [{ id: "", name: t("catalog.all") }].concat(categories);
    chips.innerHTML = items.map((c) =>
      `<button class="chip ${filterCat === c.id ? "active" : ""}" data-cat="${c.id}">${U.escapeHtml(c.name)}</button>`).join("");
    $$("[data-cat]", chips).forEach((b) => b.addEventListener("click", () => {
      filterCat = b.getAttribute("data-cat");
      renderChips(); renderProducts();
    }));
  }

  /* ---------- Productos ---------- */
  function renderProducts() {
    let list = products.slice();
    if (filterCat) list = list.filter((p) => p.category_id === filterCat);
    if (search) list = list.filter((p) => (p.name || "").toLowerCase().includes(search) || (p.description || "").toLowerCase().includes(search));
    list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (!list.length) {
      $("#catalogBody").innerHTML = `<div class="empty"><div class="ico">📦</div><h3>${t("catalog.noProducts")}</h3></div>`;
      return;
    }
    $("#catalogBody").innerHTML = `<div class="product-grid">${list.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      const img = (p.images && p.images[0]) || "";
      const price = p.promo_price || p.price;
      return `<article class="product-card">
        ${img ? `<img class="ph" src="${U.escapeHtml(img)}" alt="${U.escapeHtml(p.name)}">` : `<div class="ph"></div>`}
        <div class="body">
          ${cat ? `<div class="cat">${U.escapeHtml(cat.name)}</div>` : ""}
          <h3>${U.escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="small" style="flex:1">${U.escapeHtml(p.description).slice(0, 90)}</p>` : ""}
          <div class="price">${U.currency(price, business.currency)}${p.promo_price ? `<span class="old">${U.currency(p.price, business.currency)}</span>` : ""}</div>
          <button class="btn btn-primary btn-block mt-2" data-add="${p.id}">+ ${t("catalog.addToCart")}</button>
        </div>
      </article>`;
    }).join("")}</div>`;

    $$("[data-add]").forEach((b) => b.addEventListener("click", () => {
      const p = products.find((x) => x.id === b.getAttribute("data-add"));
      addToCart(p);
      b.textContent = "✓ " + t("catalog.addToCart");
      setTimeout(() => { b.textContent = "+ " + t("catalog.addToCart"); }, 900);
    }));
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
