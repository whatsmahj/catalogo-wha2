/* ===========================================================
   Catalogo Wha — Panel de control
   Router por hash + vistas: Inicio, Pedidos, Productos,
   Categorías, Biblioteca, Configuración del negocio.
   =========================================================== */
(function () {
  const S = CW.store;
  const U = CW.util;
  const t = (k) => I18n.t(k);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const state = { business: null, user: null, meta: {}, categories: [], products: [], orders: [], library: [], route: "home" };
  let ready = false;

  /* Estado del asistente de configuración */
  const SETUP_TOTAL = 5;
  let setupStep = 0;
  let setupDraft = null;
  let setupLogo = "";

  /* ---------- Toast ---------- */
  function toast(msg, kind) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.cssText = "position:fixed;bottom:20px;inset-inline-start:50%;transform:translateX(-50%);z-index:200;padding:12px 20px;border-radius:12px;font-weight:600;box-shadow:var(--shadow-lg);font-family:var(--font);font-size:.9rem";
      document.body.appendChild(el);
    }
    el.style.background = kind === "error" ? "var(--danger)" : "var(--ink)";
    el.style.color = "#fff";
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.style.display = "none"), 2600);
  }

  /* ---------- Modal ---------- */
  function openModal(title, bodyHtml) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    $("#modal").classList.add("open");
  }
  function closeModal() { $("#modal").classList.remove("open"); }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  /* ---------- Selector de imágenes (biblioteca + subir) ---------- */
  function pickImages(opts) {
    opts = opts || {};
    const multiple = !!opts.multiple;
    const max = opts.max || 5;
    const selected = [];
    render();

    function render() {
      const grid = state.library.length
        ? '<div class="library-grid">' + state.library.map((it) =>
            `<div class="lib-item"><img src="${U.escapeHtml(it.url)}" alt=""><div class="meta">${U.escapeHtml(it.name || "")}</div>
             <button class="pick" data-pick="${it.id}" title="${t("lib.pick")}"></button></div>`).join("") + "</div>"
        : `<div class="empty"><div class="ico">🖼️</div><p>${t("lib.empty")}</p><p class="small">${t("lib.emptySub")}</p></div>`;

      openModal(t("lib.pickTitle"), `
        <div class="uploader" id="libUp">
          <div style="font-size:1.6rem">⬆️</div>
          <strong>${t("lib.upload")}</strong>
          <div class="small muted">${t("lib.uploadHint")}</div>
          <input type="file" id="libFile" accept="image/*" multiple hidden>
        </div>
        <div class="mt-3">${grid}</div>
        <div class="mt-3 row"><div class="spacer"></div>
          <button class="btn btn-ghost" data-close>${t("common.cancel")}</button>
          ${multiple ? `<button class="btn btn-primary" id="libConfirm">${t("common.save")} (${selected.length})</button>` : ""}
        </div>`);

      $("#libUp").addEventListener("click", () => $("#libFile").click());
      $("#libFile").addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []);
        for (const f of files) { try { await S.uploadImage(state.business.id, f); } catch (err) { toast(t("common.error"), "error"); } }
        state.library = await S.listLibrary(state.business.id);
        render();
      });
      $$("[data-pick]").forEach((b) => b.addEventListener("click", () => {
        const item = state.library.find((x) => x.id === b.getAttribute("data-pick"));
        if (!item) return;
        if (multiple) {
          const i = selected.findIndex((s) => s.id === item.id);
          if (i >= 0) selected.splice(i, 1);
          else if (selected.length < max) selected.push(item);
          else toast("Máx. " + max);
          render();
        } else {
          closeModal();
          opts.onPick && opts.onPick([item]);
        }
      }));
      const confirm = $("#libConfirm");
      if (confirm) confirm.addEventListener("click", () => { closeModal(); opts.onPick && opts.onPick(selected); });
    }
  }

  /* ---------- Router ---------- */
  function go(route) {
    location.hash = route;
  }
  function parseRoute() {
    const h = (location.hash || "#home").slice(1);
    return h.split("/");
  }

  async function refresh() {
    state.categories = await S.listCategories(state.business.id);
    state.products = await S.listProducts(state.business.id);
    state.orders = await S.listOrders(state.business.id);
    state.library = await S.listLibrary(state.business.id);
  }

  async function route() {
    if (!ready) return;
    const parts = parseRoute();
    state.route = parts[0] || "home";
    $$(".side-link[data-route]").forEach((b) =>
      b.classList.toggle("active", b.getAttribute("data-route") === state.route));
    const view = $("#view");
    try {
      switch (parts[0]) {
        case "orders": view.innerHTML = viewOrders(); bindOrders(); break;
        case "products": view.innerHTML = viewProducts(); bindProducts(); break;
        case "product": view.innerHTML = viewProductForm(parts[1]); bindProductForm(parts[1]); break;
        case "categories": view.innerHTML = viewCategories(); bindCategories(); break;
        case "category": view.innerHTML = viewCategoryForm(parts[1]); bindCategoryForm(parts[1]); break;
        case "library": view.innerHTML = viewLibrary(); bindLibrary(); break;
        case "config": view.innerHTML = viewConfig(); bindConfig(); break;
        case "config-business": view.innerHTML = viewConfigBusiness(); bindConfigBusiness(); break;
        case "config-whatsapp": view.innerHTML = viewConfigWhatsapp(); bindConfigWhatsapp(); break;
        case "config-brand": view.innerHTML = viewConfigBrand(); bindConfigBrand(); break;
        case "config-currency": view.innerHTML = viewConfigCurrency(); bindConfigCurrency(); break;
        case "config-link": view.innerHTML = viewConfigLink(); bindConfigLink(); break;
        case "config-presentation": view.innerHTML = viewConfigPresentation(); bindConfigPresentation(); break;
        case "config-delivery": view.innerHTML = viewConfigDelivery(); bindConfigDelivery(); break;
        case "config-payments": view.innerHTML = viewConfigPayments(); bindConfigPayments(); break;
        case "config-seo": view.innerHTML = viewConfigSeo(); bindConfigSeo(); break;
        case "account": view.innerHTML = viewAccount(); bindAccount(); break;
        case "setup": view.innerHTML = viewSetup(); bindSetup(); break;
        default: view.innerHTML = viewHome(); bindHome();
      }
    } catch (e) { console.error(e); view.innerHTML = `<div class="alert alert-error">${U.escapeHtml(e.message || t("common.error"))}</div>`; }
    I18n.apply(view);
    window.scrollTo(0, 0);
  }

  /* ==================== VISTA: INICIO ==================== */
  function viewHome() {
    const b = state.business;
    const url = U.catalogUrl(b.slug);
    const activeProducts = state.products.filter((p) => p.active !== false).length;
    return `
      <div class="page-head">
        <span class="badge info">● ${t("dash.catalogOnline")}</span>
        <h1 class="mt-1">${U.escapeHtml(b.name)}</h1>
        <p>${t("dash.published")}</p>
        <div class="row wrap mt-2">
          <a class="btn btn-primary" href="#product/new">+ ${t("dash.addProduct")}</a>
          <a class="btn btn-ghost" href="#orders">${t("dash.viewOrders")}</a>
        </div>
      </div>

      <div class="grid cols-2 mb-3 dash-2col">
        <div class="card">
          <div class="row"><div>
            <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("dash.yourCatalog")}</div>
            <h3>${t("dash.catalogPublished")}</h3>
            <p class="small">${t("dash.catalogPublishedSub")}</p>
          </div><div class="spacer"></div><span class="badge ok">● ${t("dash.catalogOnline")}</span></div>
          <div class="row" style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-top:8px">
            <span class="small" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.escapeHtml(url)}</span>
          </div>
          <div class="row wrap mt-2">
            <button class="btn btn-primary btn-sm" id="copyLink">${t("dash.copyLink")}</button>
            <a class="btn btn-ghost btn-sm" target="_blank" href="${U.escapeHtml(url)}">${t("dash.openCatalog")} ↗</a>
          </div>
        </div>
        <div class="card">
          <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("dash.summary")}</div>
          <h3>${t("dash.quickView")}</h3>
          <p class="small">${t("dash.summarySub")}</p>
          <div class="grid cols-3" style="gap:10px;margin-top:10px">
            <div class="center"><div style="font-size:1.6rem;font-weight:750">${state.products.length}</div><div class="small muted">${t("dash.statProducts")}</div></div>
            <div class="center"><div style="font-size:1.6rem;font-weight:750">${state.categories.length}</div><div class="small muted">${t("dash.statCategories")}</div></div>
            <div class="center"><div style="font-size:1.6rem;font-weight:750">${state.orders.length}</div><div class="small muted">${t("dash.statOrders")}</div></div>
          </div>
        </div>
      </div>

      <h3 class="mb-2">${t("dash.quick")}</h3>
      <div class="tiles mb-3">
        <div class="tile" data-nav="#product/new"><div class="ico">📦</div><h3>${t("dash.newProduct")}</h3><p>${t("dash.newProductSub")}</p></div>
        <div class="tile" data-nav="#orders"><div class="ico">🧾</div><h3>${t("dash.viewOrders")}</h3><p>${t("dash.viewOrdersSub")}</p></div>
        <div class="tile" data-nav="#config"><div class="ico">⚙️</div><h3>${t("dash.configBusiness")}</h3><p>${t("dash.configBusinessSub")}</p></div>
        <div class="tile" id="shareTile"><div class="ico">🔗</div><h3>${t("dash.shareCatalog")}</h3><p>${t("dash.shareCatalogSub")}</p></div>
      </div>

      <div class="table-wrap">
        <div class="head"><div><div class="small muted" style="text-transform:uppercase;font-weight:700">${t("dash.activity")}</div><h3>${t("dash.lastEvents")}</h3><p class="small" style="margin:0">${t("dash.lastEventsSub")}</p></div></div>
        <div style="padding:18px 20px" class="row"><span class="badge info">📩</span><div><div>${t("dash.welcome")}</div><div class="small muted">${new Date().toLocaleString()}</div></div></div>
      </div>`;
  }
  function bindHome() {
    const copy = $("#copyLink");
    if (copy) copy.addEventListener("click", () => { navigator.clipboard.writeText(U.catalogUrl(state.business.slug)); toast(t("common.copied")); });
    const share = $("#shareTile");
    if (share) share.addEventListener("click", () => {
      const url = U.catalogUrl(state.business.slug);
      window.open(U.waLink(state.business.whatsapp, state.business.name + "\n" + url), "_blank");
    });
    $$("[data-nav]").forEach((el) => el.addEventListener("click", () => go(el.getAttribute("data-nav").slice(1))));
  }

  /* ==================== VISTA: PEDIDOS ==================== */
  function viewOrders() {
    return `
      <div class="page-head"><div class="small muted">${t("dash.home")} / ${t("ord.title")}</div><h1>${t("ord.title")}</h1><p>${t("ord.sub")}</p></div>
      <div class="card mb-3">
        <div class="grid cols-3" style="align-items:end">
          <div class="field" style="margin:0"><label>${t("ord.code")}</label><input class="input" id="ordCode" placeholder="${t("ord.codePh")}"></div>
          <div class="field" style="margin:0"><label>${t("ord.status")}</label>
            <select class="select" id="ordStatus">
              <option value="">${t("ord.allStatus")}</option>
              <option value="new">${t("ord.status.new")}</option>
              <option value="confirmed">${t("ord.status.confirmed")}</option>
              <option value="delivered">${t("ord.status.delivered")}</option>
              <option value="cancelled">${t("ord.status.cancelled")}</option>
            </select></div>
          <button class="btn btn-primary" id="ordSearch">${t("ord.search")}</button>
        </div>
      </div>
      <div class="table-wrap">
        <div class="head"><div><h3>${t("ord.list")}</h3><p class="small muted" style="margin:0"><span id="ordCount">${state.orders.length}</span> ${t("ord.found")}</p></div></div>
        <div id="ordBody">${ordersTable(state.orders)}</div>
      </div>`;
  }
  function ordersTable(list) {
    if (!list.length) return `<div class="empty"><div class="ico">🧾</div><h3>${t("ord.empty")}</h3><p>${t("ord.emptySub")}</p></div>`;
    return `<div style="overflow-x:auto"><table><thead><tr>
      <th>${t("ord.code")}</th><th>${t("ord.customer")}</th><th>${t("ord.total")}</th><th>${t("ord.date")}</th><th>${t("ord.status")}</th><th>${t("prod.actions")}</th>
    </tr></thead><tbody>${list.map((o) => `
      <tr>
        <td><strong>${U.escapeHtml(o.code)}</strong></td>
        <td>${U.escapeHtml(o.customer_name || "—")}</td>
        <td>${U.currency(o.total, state.business.currency)}</td>
        <td class="small muted">${new Date(o.created_at).toLocaleString()}</td>
        <td><span class="badge ${o.status === "new" ? "info" : o.status === "delivered" ? "ok" : o.status === "cancelled" ? "warn" : "ok"}">${t("ord.status." + (o.status || "new"))}</span></td>
        <td><button class="btn btn-ghost btn-sm" data-order="${o.id}">${t("prod.edit")}</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }
  function bindOrders() {
    $("#ordSearch").addEventListener("click", () => {
      const code = $("#ordCode").value.trim().toLowerCase();
      const st = $("#ordStatus").value;
      const list = state.orders.filter((o) =>
        (!code || (o.code || "").toLowerCase().includes(code)) && (!st || o.status === st));
      $("#ordBody").innerHTML = ordersTable(list);
      $("#ordCount").textContent = list.length;
      bindOrderRows();
    });
    bindOrderRows();
  }
  function bindOrderRows() {
    $$("[data-order]").forEach((b) => b.addEventListener("click", () => {
      const o = state.orders.find((x) => x.id === b.getAttribute("data-order"));
      if (!o) return;
      openModal(t("ord.title") + " " + o.code, `
        <p><strong>${t("ord.customer")}:</strong> ${U.escapeHtml(o.customer_name || "—")}</p>
        <p><strong>${t("catalog.note")}:</strong> ${U.escapeHtml(o.note || "—")}</p>
        <table style="margin:12px 0">${(o.items || []).map((i) => `<tr><td>${U.escapeHtml(i.name)} × ${i.qty}</td><td style="text-align:end">${U.currency(i.price * i.qty, state.business.currency)}</td></tr>`).join("")}</table>
        <p style="text-align:end"><strong>${t("catalog.subtotal")}: ${U.currency(o.total, state.business.currency)}</strong></p>
        <div class="field"><label>${t("ord.status")}</label>
          <select class="select" id="stSel">
            ${["new", "confirmed", "delivered", "cancelled"].map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${t("ord.status." + s)}</option>`).join("")}
          </select></div>
        <button class="btn btn-primary btn-block" id="stSave">${t("common.save")}</button>`);
      $("#stSave").addEventListener("click", async () => {
        await S.updateOrderStatus(o.id, $("#stSel").value);
        o.status = $("#stSel").value;
        closeModal(); toast(t("common.saved")); route();
      });
    }));
  }

  /* ==================== VISTA: PRODUCTOS ==================== */
  function viewProducts() {
    const total = state.products.length;
    const active = state.products.filter((p) => p.active !== false).length;
    return `
      <div class="page-head" style="display:flex;align-items:center;gap:16px">
        <div><div class="small muted">${t("dash.home")} / ${t("prod.title")}</div><h1>${t("prod.title")}</h1><p>${t("prod.sub")}</p></div>
        <div class="spacer"></div>
        <a class="btn btn-primary" href="#product/new">+ ${t("prod.new")}</a>
      </div>
      <div class="grid cols-4 mb-3">
        <div class="stat"><div class="label">${t("prod.total")}</div><div class="value">${total}</div><div class="sub">${t("prod.totalSub")}</div></div>
        <div class="stat accent"><div class="label">${t("prod.active")}</div><div class="value">${active}</div><div class="sub">${t("prod.activeSub")}</div></div>
        <div class="stat"><div class="label">${t("prod.inactive")}</div><div class="value">${total - active}</div><div class="sub">${t("prod.inactiveSub")}</div></div>
        <div class="stat"><div class="label">${t("cat.categories")}</div><div class="value">${state.categories.length}</div><div class="sub">${t("prod.category")}</div></div>
      </div>
      <div class="table-wrap">
        <div class="head"><div><h3>${t("prod.list")}</h3><p class="small muted" style="margin:0">${t("prod.listSub")}</p></div><div class="spacer"></div><span class="badge info">${state.business.currency}</span></div>
        ${productsTable()}
      </div>`;
  }
  function productsTable() {
    if (!state.products.length) return `<div class="empty"><div class="ico">📦</div><h3>${t("prod.noProducts")}</h3><p>${t("prod.noProductsSub")}</p><a class="btn btn-primary mt-2" href="#product/new">+ ${t("prod.new")}</a></div>`;
    return `<div style="overflow-x:auto"><table><thead><tr>
      <th>${t("prod.image")}</th><th>${t("prod.product")}</th><th>${t("prod.category")}</th><th>${t("prod.price")}</th><th>${t("prod.status")}</th><th>${t("prod.order")}</th><th>${t("prod.actions")}</th>
    </tr></thead><tbody>${state.products.map((p) => {
      const cat = state.categories.find((c) => c.id === p.category_id);
      const img = (p.images && p.images[0]) || "";
      return `<tr>
        <td>${img ? `<img class="thumb-sm" src="${U.escapeHtml(img)}" alt="">` : `<div class="thumb-sm"></div>`}</td>
        <td><strong>${U.escapeHtml(p.name)}</strong><div class="small muted">/${U.escapeHtml(p.slug)}</div></td>
        <td>${cat ? U.escapeHtml(cat.name) : "—"}</td>
        <td>${U.currency(p.promo_price || p.price, state.business.currency)}${p.promo_price ? `<div class="small muted"><s>${U.currency(p.price, state.business.currency)}</s></div>` : ""}</td>
        <td><span class="badge ${p.active !== false ? "ok" : "off"}">${p.active !== false ? t("prod.active") : t("prod.inactive")}</span></td>
        <td>${p.sort_order || 0}</td>
        <td><div class="row" style="gap:6px">
          <a class="btn btn-ghost btn-sm" href="#product/${p.id}">${t("prod.edit")}</a>
          <button class="btn btn-ghost btn-sm" data-toggle="${p.id}">${p.active !== false ? t("prod.deactivate") : t("prod.activate")}</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">${t("prod.delete")}</button>
        </div></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function bindProducts() {
    $$("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
      const p = state.products.find((x) => x.id === b.getAttribute("data-toggle"));
      await S.saveProduct({ id: p.id, active: p.active === false });
      await refresh(); route();
    }));
    $$("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(t("common.confirmDelete"))) return;
      await S.deleteProduct(b.getAttribute("data-del"));
      await refresh(); route(); toast(t("common.saved"));
    }));
  }

  /* ==================== FORM PRODUCTO ==================== */
  let productDraft = null;
  function viewProductForm(id) {
    const isNew = !id || id === "new";
    const p = isNew ? { name: "", slug: "", category_id: "", description: "", sort_order: 0, price: "", promo_price: "", images: [], active: true } : state.products.find((x) => x.id === id);
    if (!p) return `<div class="alert alert-error">404</div>`;
    productDraft = {
      id: isNew ? null : p.id,
      name: p.name || "", slug: p.slug || "", category_id: p.category_id || "",
      description: p.description || "", sort_order: p.sort_order || 0,
      price: p.price === undefined ? "" : p.price, promo_price: p.promo_price || "",
      images: (p.images || []).slice(0, 5)
    };
    return `
      <div class="page-head" style="display:flex;align-items:center;gap:16px">
        <div><div class="small muted">${t("prod.title")} / ${isNew ? t("prod.new") : t("prod.edit")}</div>
          <h1>${isNew ? t("prod.new") : t("prod.edit")}</h1><p>${t("prod.newSub")}</p></div>
        <div class="spacer"></div>
        <a class="btn btn-ghost" href="#products">← ${t("prod.back")}</a>
      </div>
      <div class="grid" style="grid-template-columns:2fr 1fr;align-items:start">
        <div>
          <div class="card mb-3">
            <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("prod.info")}</div>
            <h3>${t("prod.infoSub")}</h3><p class="small">${t("prod.infoSub2")}</p>
            <div class="field"><label>${t("prod.name")}</label><input class="input" id="pName" value="${U.escapeHtml(p.name)}" placeholder="${t("prod.namePh")}"></div>
            <div class="field"><label>${t("prod.url")}</label><input class="input" id="pSlug" value="${U.escapeHtml(p.slug)}"><div class="hint">${t("prod.urlHint")}</div></div>
            <div class="field"><label>${t("prod.category")}</label>
              <select class="select" id="pCat"><option value="">${t("prod.categoryPh")}</option>
              ${state.categories.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? "selected" : ""}>${U.escapeHtml(c.name)}</option>`).join("")}
              </select></div>
            <div class="field"><label>${t("prod.desc")} (${t("common.optional")})</label>
              <textarea class="textarea" id="pDesc" placeholder="${t("prod.descPh")}">${U.escapeHtml(p.description || "")}</textarea>
              <div class="hint">${t("prod.descHint")}</div></div>
            <div class="field"><label>${t("prod.sortOrder")}</label><input class="input" id="pOrder" type="number" value="${p.sort_order || 0}"><div class="hint">${t("prod.sortHint")}</div></div>
          </div>

          <div class="card mb-3">
            <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("prod.priceTitle")}</div>
            <h3>${t("prod.priceCurrent")}: ${state.business.currency}</h3>
            <div class="grid cols-2">
              <div class="field"><label>${t("prod.regular")} (${state.business.currency})</label><input class="input" id="pPrice" type="number" step="0.01" value="${p.price}"></div>
              <div class="field"><label>${t("prod.promo")} (${t("common.optional")})</label><input class="input" id="pPromo" type="number" step="0.01" value="${p.promo_price || ""}"><div class="hint">${t("prod.promoHint")}</div></div>
            </div>
          </div>

          <div class="card mb-3">
            <div class="row"><div><div class="small muted" style="text-transform:uppercase;font-weight:700">${t("prod.images")}</div><h3>${t("prod.imagesSub")}</h3></div><div class="spacer"></div><span class="badge info" id="imgCount">0 / 5</span></div>
            <div class="row wrap mt-2">
              <button class="btn btn-soft btn-sm" id="addFromLib">+ ${t("prod.fromLibrary")}</button>
            </div>
            <div class="grid cols-4 mt-2" id="imgSlots" style="grid-template-columns:repeat(5,1fr)"></div>
          </div>

          <div class="row" style="justify-content:flex-end">
            <a class="btn btn-ghost" href="#products">${t("prod.cancel")}</a>
            <button class="btn btn-primary" id="saveProduct">✓ ${t("prod.save")}</button>
          </div>
        </div>

        <div>
          <div class="card mb-3" style="background:var(--brand-050);border-color:var(--brand-500)">
            <h3>💡 ${t("prod.tipTitle")}</h3>
            <ul style="padding-inline-start:18px;color:var(--ink-2);font-size:.9rem">
              <li>${t("prod.tip1")}</li><li>${t("prod.tip2")}</li><li>${t("prod.tip3")}</li>
            </ul>
          </div>
          <div class="card">
            <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("prod.currency")}</div>
            <h3>${state.business.currency}</h3><p class="small">${t("prod.currencySub")}</p>
          </div>
        </div>
      </div>`;
  }

  function renderProductSlots() {
    const slots = $("#imgSlots");
    if (!slots || !productDraft) return;
    slots.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const img = productDraft.images[i];
      const div = document.createElement("div");
      div.className = "img-slot";
      div.innerHTML = img
        ? `<img src="${U.escapeHtml(img)}" alt=""><button class="rm" data-i="${i}">✕</button>`
        : `<button class="btn btn-ghost btn-sm" data-add="1">+</button>`;
      slots.appendChild(div);
    }
    $("#imgCount").textContent = productDraft.images.length + " / 5";
    $$("[data-add]", slots).forEach((b) => b.addEventListener("click", () =>
      pickImages({ multiple: true, max: 5 - productDraft.images.length, onPick: (items) => {
        productDraft.images = productDraft.images.concat(items.map((x) => x.url)).slice(0, 5);
        renderProductSlots();
      } })));
    $$(".rm", slots).forEach((b) => b.addEventListener("click", () => {
      productDraft.images.splice(+b.getAttribute("data-i"), 1);
      renderProductSlots();
    }));
  }

  function bindProductForm(id) {
    const nameEl = $("#pName");
    if (nameEl) nameEl.addEventListener("input", () => { $("#pSlug").value = S.slugify(nameEl.value); });
    const fromLib = $("#addFromLib");
    if (fromLib) fromLib.addEventListener("click", () =>
      pickImages({ multiple: true, max: 5 - productDraft.images.length, onPick: (items) => {
        productDraft.images = productDraft.images.concat(items.map((x) => x.url)).slice(0, 5);
        renderProductSlots();
      } }));
    renderProductSlots();

    $("#saveProduct").addEventListener("click", async () => {
      const payload = {
        id: productDraft.id || undefined,
        business_id: state.business.id,
        name: $("#pName").value.trim(),
        slug: $("#pSlug").value.trim() || S.slugify($("#pName").value),
        category_id: $("#pCat").value || null,
        description: $("#pDesc").value.trim(),
        sort_order: parseInt($("#pOrder").value || "0", 10),
        price: parseFloat($("#pPrice").value || "0"),
        promo_price: $("#pPromo").value ? parseFloat($("#pPromo").value) : null,
        active: true,
        images: productDraft.images
      };
      if (!payload.name) { toast(t("common.required"), "error"); return; }
      try {
        await S.saveProduct(payload);
        await refresh();
        toast(t("common.saved"));
        go("products");
      } catch (e) { toast(e.message || t("common.error"), "error"); }
    });
  }

  /* ==================== VISTA: CATEGORÍAS ==================== */
  function viewCategories() {
    return `
      <div class="page-head" style="display:flex;align-items:center;gap:16px">
        <div><div class="small muted">${t("dash.home")} / ${t("cat.title")}</div><h1>${t("cat.title")}</h1><p>${t("cat.sub")}</p></div>
        <div class="spacer"></div><a class="btn btn-primary" href="#category/new">+ ${t("cat.add")}</a>
      </div>
      <div class="grid cols-3 mb-3">
        <div class="stat"><div class="label">${t("cat.categories")}</div><div class="value">${state.categories.length}</div><div class="sub">${t("cat.listSub")}</div></div>
        <div class="stat"><div class="label">${t("cat.organized")}</div><div class="value">${state.products.filter((p) => p.category_id).length}</div><div class="sub">${t("prod.totalSub")}</div></div>
        <div class="stat accent"><div class="label">${t("cat.default")}</div><div class="value" style="font-size:1.3rem">—</div><div class="sub">${t("cat.defaultSub")}</div></div>
      </div>
      <div class="table-wrap">
        <div class="head"><div><h3>${t("cat.list")}</h3><p class="small muted" style="margin:0">${t("cat.listSub")}</p></div></div>
        ${categoriesTable()}
      </div>`;
  }
  function categoriesTable() {
    if (!state.categories.length) return `<div class="empty"><div class="ico">🗂️</div><h3>${t("cat.noCategories")}</h3><p>${t("cat.noCategoriesSub")}</p><a class="btn btn-primary mt-2" href="#category/new">+ ${t("cat.add")}</a></div>`;
    return `<div style="overflow-x:auto"><table><thead><tr>
      <th>${t("cat.category")}</th><th>${t("cat.order")}</th><th>${t("cat.products")}</th><th>${t("cat.action")}</th>
    </tr></thead><tbody>${state.categories.map((c) => {
      const count = state.products.filter((p) => p.category_id === c.id).length;
      return `<tr>
        <td class="row">${c.image_url ? `<img class="thumb-sm" src="${U.escapeHtml(c.image_url)}" alt="">` : `<div class="thumb-sm"></div>`}<div><strong>${U.escapeHtml(c.name)}</strong><div class="small muted">/${U.escapeHtml(c.slug)}</div></div></td>
        <td>${c.sort_order || 0}</td><td>${count}</td>
        <td><div class="row" style="gap:6px"><a class="btn btn-ghost btn-sm" href="#category/${c.id}">${t("prod.edit")}</a><button class="btn btn-danger btn-sm" data-delcat="${c.id}">${t("prod.delete")}</button></div></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function bindCategories() {
    $$("[data-delcat]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(t("common.confirmDelete"))) return;
      await S.deleteCategory(b.getAttribute("data-delcat"));
      await refresh(); route(); toast(t("common.saved"));
    }));
  }

  /* ==================== FORM CATEGORÍA ==================== */
  function viewCategoryForm(id) {
    const isNew = !id || id === "new";
    const c = isNew ? { name: "", slug: "", sort_order: 0, image_url: "", alt: "" } : state.categories.find((x) => x.id === id);
    if (!c) return `<div class="alert alert-error">404</div>`;
    return `
      <div class="page-head" style="display:flex;align-items:center;gap:16px">
        <div><div class="small muted">${t("cat.title")} / ${isNew ? t("cat.new") : t("prod.edit")}</div><h1>${isNew ? t("cat.new") : t("prod.edit")}</h1><p>${t("cat.newSub")}</p></div>
        <div class="spacer"></div><a class="btn btn-ghost" href="#categories">← ${t("cfg.back")}</a>
      </div>
      <div class="card mb-3" style="max-width:820px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cat.info")}</div>
        <h3>${t("cat.infoSub")}</h3>
        <div class="field"><label>${t("cat.name")}</label><input class="input" id="cName" value="${U.escapeHtml(c.name)}" placeholder="${t("cat.namePh")}"></div>
        <div class="field"><label>${t("cat.slug")}</label><input class="input" id="cSlug" value="${U.escapeHtml(c.slug)}"><div class="hint">${t("cat.slugHint")}</div></div>
        <div class="field"><label>${t("cat.order")}</label><input class="input" id="cOrder" type="number" value="${c.sort_order || 0}"></div>
      </div>
      <div class="card mb-3" style="max-width:820px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cat.image")}</div>
        <h3>${t("cat.imageSub")}</h3>
        <div class="grid cols-2" style="align-items:center">
          <div class="img-slot" id="catPreview" style="max-width:200px">${c.image_url ? `<img src="${U.escapeHtml(c.image_url)}" alt="">` : `<div class="muted small">${t("cat.image")}</div>`}</div>
          <div>
            <button class="btn btn-soft btn-sm" id="catPick">${t("cat.pickLibrary")}</button>
            <div class="field mt-2"><label>${t("cat.alt")} (${t("common.optional")})</label><input class="input" id="cAlt" value="${U.escapeHtml(c.alt || "")}" placeholder="${t("cat.altPh")}"></div>
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;max-width:820px">
        <a class="btn btn-ghost" href="#categories">${t("cfg.cancel")}</a>
        <button class="btn btn-primary" id="saveCat">✓ ${t("cat.save")}</button>
      </div>`;
  }
  function bindCategoryForm(id) {
    const isNew = !id || id === "new";
    let image = isNew ? "" : (state.categories.find((x) => x.id === id) || {}).image_url || "";
    $("#cName").addEventListener("input", () => { $("#cSlug").value = S.slugify($("#cName").value); });
    $("#catPick").addEventListener("click", () => pickImages({ onPick: (items) => {
      if (!items.length) return;
      image = items[0].url;
      $("#catPreview").innerHTML = `<img src="${U.escapeHtml(image)}" alt="">`;
    } }));
    $("#saveCat").addEventListener("click", async () => {
      const payload = {
        id: isNew ? undefined : id,
        business_id: state.business.id,
        name: $("#cName").value.trim(),
        slug: $("#cSlug").value.trim(),
        sort_order: parseInt($("#cOrder").value || "0", 10),
        image_url: image,
        alt: $("#cAlt").value.trim()
      };
      if (!payload.name) { toast(t("common.required"), "error"); return; }
      await S.saveCategory(payload);
      await refresh(); toast(t("common.saved")); go("categories");
    });
  }

  /* ==================== VISTA: BIBLIOTECA ==================== */
  function viewLibrary() {
    return `
      <div class="page-head"><div class="small muted">${t("dash.home")} / ${t("lib.title")}</div><h1>${t("lib.title")}</h1><p>${t("lib.sub")}</p></div>
      <div class="uploader mb-3" id="libUploader">
        <div style="font-size:1.8rem">⬆️</div>
        <strong>${t("lib.upload")}</strong>
        <div class="small muted">${t("lib.uploadHint")}</div>
        <input type="file" id="libInput" accept="image/*" multiple hidden>
      </div>
      <div id="libGridWrap">${libraryGrid()}</div>`;
  }
  function libraryGrid() {
    if (!state.library.length) return `<div class="table-wrap"><div class="empty"><div class="ico">🖼️</div><h3>${t("lib.empty")}</h3><p>${t("lib.emptySub")}</p></div></div>`;
    return `<div class="library-grid">${state.library.map((it) => `
      <div class="lib-item">
        <img src="${U.escapeHtml(it.url)}" alt="">
        <button class="del" data-delimg="${it.id}" title="${t("lib.delete")}">✕</button>
        <div class="meta">${U.escapeHtml(it.name || "")}</div>
      </div>`).join("")}</div>`;
  }
  function bindLibrary() {
    const up = $("#libUploader");
    const input = $("#libInput");
    up.addEventListener("click", () => input.click());
    ["dragover", "dragenter"].forEach((ev) => up.addEventListener(ev, (e) => { e.preventDefault(); up.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => up.addEventListener(ev, (e) => { e.preventDefault(); up.classList.remove("drag"); }));
    up.addEventListener("drop", async (e) => {
      for (const f of Array.from(e.dataTransfer.files || [])) { try { await S.uploadImage(state.business.id, f); } catch (err) { toast(t("common.error"), "error"); } }
      state.library = await S.listLibrary(state.business.id); $("#libGridWrap").innerHTML = libraryGrid(); bindLibDelete();
    });
    input.addEventListener("change", async (e) => {
      for (const f of Array.from(e.target.files || [])) { try { await S.uploadImage(state.business.id, f); } catch (err) { toast(t("common.error"), "error"); } }
      state.library = await S.listLibrary(state.business.id); $("#libGridWrap").innerHTML = libraryGrid(); bindLibDelete();
    });
    bindLibDelete();
  }
  function bindLibDelete() {
    $$("[data-delimg]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(t("common.confirmDelete"))) return;
      const item = state.library.find((x) => x.id === b.getAttribute("data-delimg"));
      await S.deleteImage(item);
      state.library = await S.listLibrary(state.business.id);
      $("#libGridWrap").innerHTML = libraryGrid(); bindLibDelete();
      toast(t("common.saved"));
    }));
  }

  /* ==================== VISTA: CONFIGURACIÓN ==================== */
  function viewConfig() {
    const b = state.business;
    const card = (route, groups, ico, title, sub, label, status) => `
      <div class="card config-card" data-groups="${groups}">
        <div class="row"><div class="ico" style="margin:0">${ico}</div><div class="spacer"></div>${status}</div>
        <div class="small muted mt-2" style="text-transform:uppercase;font-weight:700">${title}</div>
        <h3>${sub}</h3>
        <a class="btn btn-soft btn-sm mt-2" href="#${route}">${label} ›</a>
      </div>`;
    const done = `<span class="badge ok">✓ ${t("cfg.configured")}</span>`;
    const opt = `<span class="badge off">○ ${t("cfg.optional")}</span>`;
    const tabs = [
      { key: "all", label: t("cfg.tabAll") },
      { key: "general", label: t("cfg.tabGeneral") },
      { key: "catalog", label: t("cfg.tabCatalog") },
      { key: "publish", label: t("cfg.tabPublish") },
      { key: "sales", label: t("cfg.tabSales") }
    ];
    return `
      <div class="page-head"><h1>${t("cfg.title")}</h1><p>${t("cfg.sub")}</p></div>
      <div class="row wrap mb-3" id="cfgTabs">
        ${tabs.map((tb) => `<button class="chip ${tb.key === "all" ? "active" : ""}" data-filter="${tb.key}">${tb.label}</button>`).join("")}
      </div>
      <div class="grid cols-3" id="cfgGrid">
        ${card("config-business", "general", "📄", t("cfg.businessInfo"), t("cfg.businessInfoSub"), t("cfg.configure"), done)}
        ${card("config-whatsapp", "general,sales", "💬", t("cfg.whatsapp"), t("cfg.whatsappSub"), t("cfg.changeNumber"), done)}
        ${card("config-brand", "catalog,publish", "🎨", t("cfg.brand"), t("cfg.brandSub"), t("cfg.personalize"), b.logo_url ? done : opt)}
        ${card("config-currency", "general,sales", "💱", t("cfg.currency"), t("cfg.currencySub"), t("cfg.changeCurrency"), done)}
        ${card("config-link", "catalog,publish", "🔗", t("cfg.link"), t("cfg.linkSub"), t("cfg.changeLink"), done)}
        ${card("config-presentation", "catalog,publish", "🖼️", t("cfg.presentation"), t("cfg.presentationSub"), t("cfg.personalize"), b.hero_enabled ? done : opt)}
        ${card("config-delivery", "sales", "🚚", t("cfg.delivery"), t("cfg.deliverySub"), t("cfg.configure"), b.delivery ? done : opt)}
        ${card("config-payments", "sales", "💳", t("cfg.payments"), t("cfg.paymentsSub"), t("cfg.configure"), b.payments ? done : opt)}
        ${card("config-seo", "publish", "🔍", t("cfg.seo"), t("cfg.seoSub"), t("cfg.configure"), b.seo_title ? done : opt)}
      </div>
      <div class="empty hidden" id="cfgEmpty"><div class="ico">🗂️</div><p>${t("cfg.emptyFilter")}</p></div>`;
  }
  function bindConfig() {
    const tabs = $$("#cfgTabs .chip");
    const cards = $$("#cfgGrid .config-card");
    const empty = $("#cfgEmpty");
    tabs.forEach((chip) => chip.addEventListener("click", () => {
      const f = chip.getAttribute("data-filter");
      tabs.forEach((c) => c.classList.toggle("active", c === chip));
      let visible = 0;
      cards.forEach((c) => {
        const groups = (c.getAttribute("data-groups") || "").split(",");
        const show = f === "all" || groups.indexOf(f) >= 0;
        c.classList.toggle("hidden", !show);
        if (show) visible++;
      });
      if (empty) empty.classList.toggle("hidden", visible > 0);
    }));
  }

  function configHead(title, sub) {
    return `<div class="page-head"><div class="small muted">${t("cfg.title")} / ${title}</div><h1>${title}</h1><p>${sub}</p></div>
      <a class="btn btn-ghost btn-sm mb-3" href="#config">‹ ${t("cfg.back")}</a>`;
  }

  /* ---- Info del negocio ---- */
  function viewConfigBusiness() {
    const b = state.business;
    const countries = ["Marruecos", "España", "Francia", "Argelia", "Túnez", "Mauritania", "Senegal", "Otro"];
    const zones = ["Africa/Casablanca", "Africa/El_Aaiun", "Europe/Madrid", "Europe/Paris", "Africa/Algiers", "Africa/Tunis", "UTC"];
    return configHead(t("cfg.businessInfo"), t("cfg.businessInfoSub")) + `
      <div class="card mb-3" style="max-width:900px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.bizIdentity")}</div>
        <h3>${t("cfg.bizCommercial")}</h3>
        <div class="field"><label>${t("cfg.bizName")}</label><input class="input" id="bName" value="${U.escapeHtml(b.name)}"></div>
        <div class="field"><label>${t("cfg.bizDesc")}</label><textarea class="textarea" id="bDesc" placeholder="${t("cfg.bizDescPh")}">${U.escapeHtml(b.description || "")}</textarea></div>
      </div>
      <div class="card mb-3" style="max-width:900px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.location")}</div>
        <h3>${t("cfg.operation")}</h3><p class="small">${t("cfg.operationSub")}</p>
        <div class="grid cols-2">
          <div class="field"><label>${t("cfg.country")}</label><select class="select" id="bCountry">${countries.map((c) => `<option ${b.country === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>${t("cfg.currencyLabel")}</label><input class="input" value="${U.escapeHtml(b.currency)}" disabled><div class="hint"><a href="#config-currency">${t("cfg.changeCurrency")}</a></div></div>
          <div class="field"><label>${t("cfg.region")}</label><input class="input" id="bRegion" value="${U.escapeHtml(b.region || "")}"></div>
          <div class="field"><label>${t("cfg.city")}</label><input class="input" id="bCity" value="${U.escapeHtml(b.city || "")}"></div>
          <div class="field"><label>${t("cfg.address")}</label><input class="input" id="bAddress" value="${U.escapeHtml(b.address || "")}"></div>
          <div class="field"><label>${t("cfg.zip")}</label><input class="input" id="bZip" value="${U.escapeHtml(b.zip || "")}"></div>
          <div class="field"><label>${t("cfg.timezone")}</label><select class="select" id="bTz">${zones.map((z) => `<option ${b.timezone === z ? "selected" : ""}>${z}</option>`).join("")}</select></div>
        </div>
      </div>
      <div class="row" style="justify-content:flex-end;max-width:900px">
        <a class="btn btn-ghost" href="#config">${t("cfg.cancel")}</a>
        <button class="btn btn-primary" id="saveBiz">${t("cfg.save")}</button>
      </div>`;
  }
  function bindConfigBusiness() {
    $("#saveBiz").addEventListener("click", async () => {
      await S.updateBusiness(state.business.id, {
        name: $("#bName").value.trim(), description: $("#bDesc").value.trim(),
        country: $("#bCountry").value, region: $("#bRegion").value, city: $("#bCity").value,
        address: $("#bAddress").value, zip: $("#bZip").value, timezone: $("#bTz").value
      });
      await loadBusiness(); toast(t("cfg.saved")); route();
    });
  }

  /* ---- WhatsApp ---- */
  function viewConfigWhatsapp() {
    const b = state.business;
    return configHead(t("cfg.whatsapp"), t("cfg.whatsappSub")) + `
      <div class="grid" style="grid-template-columns:1.4fr 1fr;align-items:start;max-width:900px">
        <div class="card">
          <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.waNumber")}</div>
          <h3>${t("cfg.changeNumber")}</h3>
          <div class="field"><label>${t("cfg.waCountry")}</label><select class="select" id="waCountry">
            <option value="212">Marruecos (+212)</option><option value="34">España (+34)</option>
            <option value="33">France (+33)</option><option value="213">Algérie (+213)</option>
            <option value="216">Tunisie (+216)</option><option value="222">Mauritanie (+222)</option>
            <option value="221">Sénégal (+221)</option></select></div>
          <div class="field"><label>${t("cfg.waNumberLabel")}</label><input class="input" id="waNumber" value="${U.escapeHtml((b.whatsapp || "").replace(/^212/, ""))}" placeholder="6 90 15 70 92"><div class="hint">${t("cfg.waHint")}</div></div>
          <button class="btn btn-primary btn-block" id="saveWa">${t("cfg.waReview")}</button>
        </div>
        <div>
          <div class="card mb-3" style="border-color:var(--wa)">
            <div class="small" style="color:var(--wa-dark);text-transform:uppercase;font-weight:700">${t("cfg.waCurrent")}</div>
            <h3 id="waShown">+${U.escapeHtml(b.whatsapp || "")}</h3>
          </div>
          <div class="card mb-3"><h3>${t("cfg.waTest")}</h3><p class="small">${t("cfg.waTestSub")}</p>
            <button class="btn btn-ghost btn-sm" id="testWa">${t("cfg.waTest")} ↗</button></div>
          <div class="card"><strong>ℹ️ ${t("cfg.waNote")}</strong><p class="small">${t("cfg.waNoteText")}</p></div>
        </div>
      </div>`;
  }
  function bindConfigWhatsapp() {
    $("#testWa").addEventListener("click", () => window.open(U.waLink(state.business.whatsapp, state.business.name), "_blank"));
    $("#saveWa").addEventListener("click", async () => {
      const cc = $("#waCountry").value;
      const num = $("#waNumber").value.replace(/\D/g, "");
      if (!num) { toast(t("common.required"), "error"); return; }
      await S.updateBusiness(state.business.id, { whatsapp: cc + num });
      await loadBusiness(); toast(t("cfg.saved")); route();
    });
  }

  /* ---- Marca ---- */
  function viewConfigBrand() {
    const b = state.business;
    return configHead(t("cfg.brand"), t("cfg.brandSub")) + `
      <div class="card mb-3" style="max-width:900px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.bizIdentity")}</div>
        <h3>${t("cfg.brandLogo")}</h3><p class="small">${t("cfg.brandLogoSub")}</p>
        <div class="center" style="background:var(--bg);border-radius:14px;padding:26px;margin:12px 0">
          ${b.logo_url ? `<img src="${U.escapeHtml(b.logo_url)}" alt="" style="max-height:70px;margin:0 auto">` : `<div style="width:64px;height:64px;border-radius:16px;background:var(--brand-100);color:var(--brand);display:grid;place-items:center;font-size:1.6rem;font-weight:750;margin:0 auto">${U.escapeHtml((b.name || "C").charAt(0).toUpperCase())}</div>`}
        </div>
        <div class="row wrap"><button class="btn btn-soft btn-sm" id="pickLogo">${t("cfg.brandAdd")}</button><button class="btn btn-primary btn-sm" id="saveLogo">${t("cfg.brandSave")}</button></div>
        <div class="hint">JPG, PNG o WebP. Máx. 5 MB.</div>
      </div>
      <div class="card mb-3" style="max-width:900px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.bizIdentity")}</div>
        <h3>${t("cfg.brandColor")}</h3><p class="small">${t("cfg.brandColorSub")}</p>
        <div class="field" style="max-width:320px"><label>${t("cfg.hex")}</label>
          <input class="input" id="brandColor" type="color" value="${U.escapeHtml(b.brand_color || window.APP_CONFIG.defaultBrandColor)}" style="height:52px;padding:6px"></div>
        <button class="btn btn-primary btn-sm" id="saveColor">${t("common.save")}</button>
      </div>`;
  }
  function bindConfigBrand() {
    let logo = state.business.logo_url || "";
    $("#pickLogo").addEventListener("click", () => pickImages({ onPick: (items) => { if (items.length) logo = items[0].url; } }));
    $("#saveLogo").addEventListener("click", async () => { await S.updateBusiness(state.business.id, { logo_url: logo }); await loadBusiness(); toast(t("cfg.saved")); route(); });
    $("#saveColor").addEventListener("click", async () => { await S.updateBusiness(state.business.id, { brand_color: $("#brandColor").value }); await loadBusiness(); toast(t("cfg.saved")); });
  }

  /* ---- Moneda ---- */
  function viewConfigCurrency() {
    const b = state.business;
    const cur = ["MAD", "EUR", "USD", "DZD", "TND", "MRU", "XOF", "SAR", "AED"];
    return configHead(t("cfg.currency"), t("cfg.currencySub")) + `
      <div class="alert alert-info">⚠️ ${t("cfg.confirmChange")}</div>
      <div class="card mb-3" style="max-width:700px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.currencyCurrent")}</div>
        <h2>${U.escapeHtml(b.currency)}</h2>
        <div class="field"><label>${t("cfg.newCurrency")}</label>
          <select class="select" id="newCur">${cur.map((c) => `<option ${b.currency === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" id="confirmCur"> ${t("cfg.confirmChange")}</label>
        <div class="row mt-3" style="justify-content:flex-end">
          <a class="btn btn-ghost" href="#config">${t("cfg.cancel")}</a>
          <button class="btn btn-primary" id="saveCur">${t("cfg.changeCurrencyBtn")}</button>
        </div>
      </div>`;
  }
  function bindConfigCurrency() {
    $("#saveCur").addEventListener("click", async () => {
      if (!$("#confirmCur").checked) { toast(t("common.required"), "error"); return; }
      await S.updateBusiness(state.business.id, { currency: $("#newCur").value });
      await loadBusiness(); toast(t("cfg.saved")); go("config");
    });
  }

  /* ---- Enlace ---- */
  function viewConfigLink() {
    const b = state.business;
    const url = U.catalogUrl(b.slug);
    return configHead(t("cfg.link"), t("cfg.linkSub")) + `
      <div class="card mb-3" style="max-width:800px">
        <div class="row"><div class="ico" style="margin:0">🔗</div><div><strong>${t("cfg.linkCurrent")}</strong><div class="small muted">${U.escapeHtml(url)}</div></div></div>
        <div class="field mt-3"><label>${t("cfg.linkName")}</label>
          <div class="row" style="gap:0">
            <span class="input" style="width:auto;border-radius:10px 0 0 10px;background:var(--bg);color:var(--ink-3)">${U.escapeHtml((window.APP_CONFIG.publicDomain || location.host))}${U.escapeHtml(window.APP_CONFIG.catalogPath)}?b=</span>
            <input class="input" id="slugInput" value="${U.escapeHtml(b.slug)}" style="border-radius:0 10px 10px 0;border-inline-start:0">
          </div>
          <div class="hint">${t("cfg.linkHint")}</div></div>
        <button class="btn btn-primary" id="saveSlug">${t("cfg.reviewConfirm")}</button>
      </div>`;
  }
  function bindConfigLink() {
    $("#slugInput").addEventListener("input", (e) => { e.target.value = S.slugify(e.target.value); });
    $("#saveSlug").addEventListener("click", async () => {
      const slug = $("#slugInput").value.trim();
      if (!slug) { toast(t("common.required"), "error"); return; }
      const ok = await S.slugAvailable(slug);
      if (!ok && slug !== state.business.slug) { toast("Enlace en uso", "error"); return; }
      await S.updateBusiness(state.business.id, { slug });
      await loadBusiness(); toast(t("cfg.saved")); go("config");
    });
  }

  /* ---- Presentación ---- */
  function viewConfigPresentation() {
    const b = state.business;
    return configHead(t("cfg.presentation"), t("cfg.presentationSub")) + `
      <div class="card mb-3" style="max-width:900px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.publicCatalog")}</div>
        <h3>${t("cfg.heroVisual")}</h3><p class="small">${t("cfg.heroVisualSub")}</p>
        <label class="row" style="gap:8px;font-size:.92rem;margin-bottom:12px"><input type="checkbox" id="heroEnabled" ${b.hero_enabled ? "checked" : ""}> ${t("cfg.showHero")}</label>
        <div class="field"><label>${t("cfg.heroTitle")}</label><input class="input" id="heroTitle" value="${U.escapeHtml(b.hero_title || "")}"></div>
        <div class="field"><label>${t("cfg.heroDesc")}</label><textarea class="textarea" id="heroDesc">${U.escapeHtml(b.hero_desc || "")}</textarea></div>
        <div class="field"><label>${t("cfg.heroImage")}</label>
          <div style="border-radius:14px;overflow:hidden;background:var(--brand-050);min-height:120px;display:grid;place-items:center" id="heroPreview">
            ${b.hero_image ? `<img src="${U.escapeHtml(b.hero_image)}" alt="" style="width:100%;max-height:260px;object-fit:cover">` : `<span class="muted small">${t("cfg.heroImage")}</span>`}
          </div>
          <div class="row wrap mt-2"><button class="btn btn-soft btn-sm" id="pickHero">${t("prod.fromLibrary")}</button><button class="btn btn-danger btn-sm" id="rmHero">${t("cfg.removeImage")}</button></div>
        </div>
        <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" id="saveHero">${t("cfg.saveHero")}</button></div>
      </div>`;
  }
  function bindConfigPresentation() {
    let hero = state.business.hero_image || "";
    $("#pickHero").addEventListener("click", () => pickImages({ onPick: (items) => { if (items.length) { hero = items[0].url; $("#heroPreview").innerHTML = `<img src="${U.escapeHtml(hero)}" alt="" style="width:100%;max-height:260px;object-fit:cover">`; } } }));
    $("#rmHero").addEventListener("click", () => { hero = ""; $("#heroPreview").innerHTML = `<span class="muted small">${t("cfg.heroImage")}</span>`; });
    $("#saveHero").addEventListener("click", async () => {
      await S.updateBusiness(state.business.id, {
        hero_enabled: $("#heroEnabled").checked,
        hero_title: $("#heroTitle").value.trim(),
        hero_desc: $("#heroDesc").value.trim(),
        hero_image: hero
      });
      await loadBusiness(); toast(t("cfg.saved")); route();
    });
  }

  /* ---- Entrega ---- */
  function viewConfigDelivery() {
    const b = state.business;
    const d = (b.delivery || "");
    const has = (k) => d.indexOf("[" + k + "]") >= 0;
    const method = (k, ico, label) => `
      <label class="opt-row"><input type="checkbox" class="dlvMethod" value="${k}" ${has(k) ? "checked" : ""}>
        <span class="opt-ico">${ico}</span><span>${label}</span></label>`;
    return configHead(t("cfg.delivery"), t("cfg.deliverySub")) + `
      <div class="card mb-3" style="max-width:820px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.deliveryMethods")}</div>
        <h3>${t("cfg.deliveryHow")}</h3><p class="small">${t("cfg.deliveryHowSub")}</p>
        <div class="opt-list">
          ${method("pickup", "🏬", t("cfg.pickup"))}
          ${method("local", "🛵", t("cfg.localDelivery"))}
          ${method("shipping", "📦", t("cfg.shipping"))}
          ${method("meetup", "🤝", t("cfg.meetup"))}
        </div>
        <div class="grid cols-2 mt-3">
          <div class="field"><label>${t("cfg.deliveryFee")} (${b.currency})</label>
            <input class="input" id="dlvFee" type="number" step="0.01" value="${U.escapeHtml(String(b.delivery_fee || ""))}"></div>
          <div class="field"><label>${t("cfg.deliveryTime")}</label>
            <input class="input" id="dlvTime" value="${U.escapeHtml(b.delivery_time || "")}" placeholder="${t("cfg.deliveryTimePh")}"></div>
        </div>
        <div class="field"><label>${t("cfg.deliveryNotes")}</label>
          <textarea class="textarea" id="dlvNotes" placeholder="${t("cfg.deliveryNotesPh")}">${U.escapeHtml(b.delivery_notes || "")}</textarea></div>
        <div class="row" style="justify-content:flex-end">
          <a class="btn btn-ghost" href="#config">${t("cfg.cancel")}</a>
          <button class="btn btn-primary" id="saveDelivery">${t("cfg.save")}</button>
        </div>
      </div>
      <div class="card" style="max-width:820px;background:var(--brand-050);border-color:var(--brand-500)">
        <h3>💡 ${t("cfg.tipTitle")}</h3><p class="small">${t("cfg.deliveryTip")}</p>
      </div>`;
  }
  function bindConfigDelivery() {
    $("#saveDelivery").addEventListener("click", async () => {
      const methods = $$(".dlvMethod:checked").map((c) => "[" + c.value + "]").join("");
      await S.updateBusiness(state.business.id, {
        delivery: methods,
        delivery_fee: parseFloat($("#dlvFee").value || "0"),
        delivery_time: $("#dlvTime").value.trim(),
        delivery_notes: $("#dlvNotes").value.trim()
      });
      await loadBusiness(); toast(t("cfg.saved")); route();
    });
  }

  /* ---- Formas de pago ---- */
  function viewConfigPayments() {
    const b = state.business;
    const p = (b.payments || "");
    const has = (k) => p.indexOf("[" + k + "]") >= 0;
    const method = (k, ico, label) => `
      <label class="opt-row"><input type="checkbox" class="payMethod" value="${k}" ${has(k) ? "checked" : ""}>
        <span class="opt-ico">${ico}</span><span>${label}</span></label>`;
    return configHead(t("cfg.payments"), t("cfg.paymentsSub")) + `
      <div class="card mb-3" style="max-width:820px">
        <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.paymentMethods")}</div>
        <h3>${t("cfg.paymentHow")}</h3><p class="small">${t("cfg.paymentHowSub")}</p>
        <div class="opt-list">
          ${method("cash", "💵", t("cfg.cash"))}
          ${method("transfer", "🏦", t("cfg.bankTransfer"))}
          ${method("card", "💳", t("cfg.cardOnDelivery"))}
          ${method("online", "🌐", t("cfg.onlinePayment"))}
          ${method("wallet", "📱", t("cfg.mobileWallet"))}
        </div>
        <div class="field mt-3"><label>${t("cfg.paymentNotes")}</label>
          <textarea class="textarea" id="payNotes" placeholder="${t("cfg.paymentNotesPh")}">${U.escapeHtml(b.payment_notes || "")}</textarea></div>
        <div class="row" style="justify-content:flex-end">
          <a class="btn btn-ghost" href="#config">${t("cfg.cancel")}</a>
          <button class="btn btn-primary" id="savePayments">${t("cfg.save")}</button>
        </div>
      </div>
      <div class="card" style="max-width:820px;background:var(--brand-050);border-color:var(--brand-500)">
        <h3>🔒 ${t("cfg.secureTitle")}</h3><p class="small">${t("cfg.paymentTip")}</p>
      </div>`;
  }
  function bindConfigPayments() {
    $("#savePayments").addEventListener("click", async () => {
      const methods = $$(".payMethod:checked").map((c) => "[" + c.value + "]").join("");
      await S.updateBusiness(state.business.id, {
        payments: methods,
        payment_notes: $("#payNotes").value.trim()
      });
      await loadBusiness(); toast(t("cfg.saved")); route();
    });
  }

  /* ---- SEO y compartir ---- */
  function viewConfigSeo() {
    const b = state.business;
    const title = b.seo_title || (b.name + " — " + (b.description || ""));
    const desc = b.seo_description || b.description || "";
    const url = U.catalogUrl(b.slug);
    const img = b.seo_image || b.hero_image || b.logo_url || "";
    return configHead(t("cfg.seo"), t("cfg.seoSub")) + `
      <div class="grid" style="grid-template-columns:1.3fr 1fr;align-items:start;max-width:1000px">
        <div class="card">
          <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.seoBasic")}</div>
          <h3>${t("cfg.seoHint")}</h3>
          <div class="field"><label>${t("cfg.seoTitle")}</label>
            <input class="input" id="seoTitle" maxlength="60" value="${U.escapeHtml(b.seo_title || "")}" placeholder="${U.escapeHtml(b.name)}">
            <div class="hint">${t("cfg.seoTitleHint")}</div></div>
          <div class="field"><label>${t("cfg.seoDescription")}</label>
            <textarea class="textarea" id="seoDesc" maxlength="160" placeholder="${U.escapeHtml(b.description || "")}">${U.escapeHtml(b.seo_description || "")}</textarea>
            <div class="hint">${t("cfg.seoDescHint")}</div></div>
          <div class="field"><label>${t("cfg.seoKeywords")}</label>
            <input class="input" id="seoKeywords" value="${U.escapeHtml(b.seo_keywords || "")}" placeholder="${t("cfg.seoKeywordsPh")}"></div>
          <div class="field"><label>${t("cfg.ogImage")}</label>
            <div style="border-radius:12px;overflow:hidden;background:var(--brand-050);min-height:100px;display:grid;place-items:center" id="seoPreviewImg">
              ${img ? `<img src="${U.escapeHtml(img)}" alt="" style="width:100%;max-height:200px;object-fit:cover">` : `<span class="muted small">${t("cfg.ogImage")}</span>`}
            </div>
            <div class="row wrap mt-2"><button class="btn btn-soft btn-sm" id="seoPick">${t("prod.fromLibrary")}</button>
            <button class="btn btn-danger btn-sm" id="seoRm">${t("cfg.removeImage")}</button></div>
          </div>
          <div class="row" style="justify-content:flex-end">
            <a class="btn btn-ghost" href="#config">${t("cfg.cancel")}</a>
            <button class="btn btn-primary" id="saveSeo">${t("cfg.save")}</button>
          </div>
        </div>
        <div>
          <div class="card mb-3">
            <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("cfg.seoPreview")}</div>
            <div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:10px">
              <div style="height:120px;background:var(--brand-050)" id="seoCardImg">${img ? `<img src="${U.escapeHtml(img)}" style="width:100%;height:120px;object-fit:cover">` : ""}</div>
              <div style="padding:12px">
                <div class="small muted">${U.escapeHtml((window.APP_CONFIG.publicDomain || location.host))}</div>
                <strong id="seoCardTitle">${U.escapeHtml(title)}</strong>
                <div class="small muted" id="seoCardDesc">${U.escapeHtml(desc)}</div>
              </div>
            </div>
          </div>
          <div class="card"><h3>🔍 ${t("cfg.seoAuto")}</h3><p class="small">${t("cfg.seoAutoSub")}</p>
            <div class="small muted" style="word-break:break-all">${U.escapeHtml(url)}</div></div>
        </div>
      </div>`;
  }
  function bindConfigSeo() {
    let img = state.business.seo_image || state.business.hero_image || state.business.logo_url || "";
    const sync = () => {
      $("#seoCardTitle").textContent = $("#seoTitle").value || state.business.name;
      $("#seoCardDesc").textContent = $("#seoDesc").value || state.business.description || "";
    };
    $("#seoTitle").addEventListener("input", sync);
    $("#seoDesc").addEventListener("input", sync);
    $("#seoPick").addEventListener("click", () => pickImages({ onPick: (items) => {
      if (!items.length) return;
      img = items[0].url;
      $("#seoPreviewImg").innerHTML = `<img src="${U.escapeHtml(img)}" style="width:100%;max-height:200px;object-fit:cover">`;
      $("#seoCardImg").innerHTML = `<img src="${U.escapeHtml(img)}" style="width:100%;height:120px;object-fit:cover">`;
    } }));
    $("#seoRm").addEventListener("click", () => {
      img = "";
      $("#seoPreviewImg").innerHTML = `<span class="muted small">${t("cfg.ogImage")}</span>`;
      $("#seoCardImg").innerHTML = "";
    });
    $("#saveSeo").addEventListener("click", async () => {
      await S.updateBusiness(state.business.id, {
        seo_title: $("#seoTitle").value.trim(),
        seo_description: $("#seoDesc").value.trim(),
        seo_keywords: $("#seoKeywords").value.trim(),
        seo_image: img
      });
      await loadBusiness(); toast(t("cfg.saved")); route();
    });
  }

  /* ==================== VISTA: MI CUENTA ==================== */
  function viewAccount() {
    const u = state.user || {};
    const m = state.meta || {};
    const email = u.email || "";
    const created = u.created_at ? new Date(u.created_at).toLocaleDateString() : "—";
    const name = m.full_name || state.business.name || "";
    const initial = (name.charAt(0) || email.charAt(0) || "U").toUpperCase();
    return `
      <div class="page-head"><h1>${t("acc.title")}</h1><p>${t("acc.sub")}</p></div>

      <div class="grid cols-2 acc-grid">
        <div class="card">
          <div class="row" style="gap:16px;align-items:center">
            <div class="acc-avatar">${U.escapeHtml(initial)}</div>
            <div style="min-width:0">
              <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("acc.profile")}</div>
              <h3 style="margin:2px 0">${U.escapeHtml(name || "—")}</h3>
              <div class="small muted" style="word-break:break-all">${U.escapeHtml(email)}</div>
            </div>
          </div>
          <p class="small muted mt-2">${t("acc.profileSub")}</p>
          <div class="field"><label>${t("acc.name")}</label>
            <input class="input" id="accName" value="${U.escapeHtml(name)}" placeholder="${t("acc.namePh")}"></div>
          <button class="btn btn-primary btn-block" id="accSaveProfile">${t("acc.saveProfile")}</button>
        </div>

        <div class="card">
          <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("acc.security")}</div>
          <h3>${t("acc.security")}</h3>
          <p class="small">${t("acc.securitySub")}</p>

          <div class="field"><label>${t("acc.email")}</label>
            <input class="input" id="accEmail" type="email" value="${U.escapeHtml(email)}" placeholder="${t("acc.emailPh")}">
            <div class="hint">${t("acc.changeEmailHint")}</div></div>
          <div class="row wrap">
            <button class="btn btn-soft btn-sm" id="accSaveEmail">${t("acc.changeEmail")}</button>
            <button class="btn btn-ghost btn-sm" id="accForgot">${t("acc.forgotSend")}</button>
          </div>

          <div style="height:1px;background:var(--line);margin:20px 0"></div>

          <div class="field"><label>${t("acc.newPassword")}</label>
            <input class="input" id="accPass1" type="password" autocomplete="new-password" placeholder="${t("acc.newPasswordPh")}"></div>
          <div class="field"><label>${t("acc.repeatPassword")}</label>
            <input class="input" id="accPass2" type="password" autocomplete="new-password" placeholder="${t("acc.repeatPassword")}"></div>
          <button class="btn btn-primary btn-block" id="accSavePass">${t("acc.changePassword")}</button>
        </div>

        <div class="card">
          <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("acc.plan")}</div>
          <h3>${t("acc.plan")}</h3>
          <p class="small">${t("acc.planSub")}</p>
          <div class="acc-row"><span class="muted">${t("acc.planName")}</span><span class="badge ok">${t("acc.planFree")}</span></div>
          <div class="acc-row"><span class="muted">${t("acc.memberSince")}</span><strong>${U.escapeHtml(created)}</strong></div>
          <div class="acc-row"><span class="muted">${t("acc.dataCount")}</span><strong>${state.products.length} · ${state.categories.length} · ${state.orders.length}</strong></div>
          <div class="acc-row"><span class="muted">${t("acc.dataCountSub")}</span></div>
          <p class="small muted mt-2">${t("acc.exportSub")}</p>
          <button class="btn btn-soft btn-block" id="accExport">${t("acc.export")}</button>
        </div>

        <div class="card" style="border-color:var(--danger)">
          <div class="small" style="text-transform:uppercase;font-weight:700;color:var(--danger)">${t("acc.danger")}</div>
          <h3 style="color:var(--danger)">${t("acc.deleteTitle")}</h3>
          <p class="small">${t("acc.deleteText")}</p>
          <button class="btn btn-danger btn-block" id="accDelete">${t("acc.deleteBtn")}</button>
          <button class="btn btn-ghost btn-block mt-2" id="accSignOut">${t("acc.signOut")}</button>
        </div>
      </div>`;
  }

  function bindAccount() {
    const u = state.user || {};

    $("#accSaveProfile").addEventListener("click", async () => {
      const name = $("#accName").value.trim();
      if (!name) return toast(t("common.required"), "error");
      try {
        state.meta = await S.updateProfile({ full_name: name });
        const top = $("#topUserName");
        if (top) top.textContent = name;
        toast(t("acc.saved"));
      } catch (e) { toast((e && e.message) || t("common.error"), "error"); }
    });

    $("#accSaveEmail").addEventListener("click", async () => {
      const email = $("#accEmail").value.trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast(t("common.required"), "error");
      if (email === u.email) return toast(t("acc.emailChanged"));
      try {
        const r = await S.updateEmail(email);
        toast(r && r.pending ? t("acc.emailPending") : t("acc.emailChanged"));
      } catch (e) { toast((e && e.message) || t("common.error"), "error"); }
    });

    $("#accForgot").addEventListener("click", async () => {
      try { await S.sendPasswordReset(u.email || $("#accEmail").value.trim()); toast(t("acc.forgotSent")); }
      catch (e) { toast((e && e.message) || t("common.error"), "error"); }
    });

    $("#accSavePass").addEventListener("click", async () => {
      const a = $("#accPass1").value, b = $("#accPass2").value;
      if (a.length < 6) return toast(t("acc.passwordShort"), "error");
      if (a !== b) return toast(t("acc.passwordMismatch"), "error");
      try {
        await S.updatePassword(a);
        $("#accPass1").value = ""; $("#accPass2").value = "";
        toast(t("acc.passwordChanged"));
      } catch (e) { toast((e && e.message) || t("common.error"), "error"); }
    });

    $("#accExport").addEventListener("click", async () => {
      try {
        const data = await S.exportData(state.business.id);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "catalogo-wha-" + (state.business.slug || "datos") + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast(t("acc.saved"));
      } catch (e) { toast((e && e.message) || t("common.error"), "error"); }
    });

    $("#accDelete").addEventListener("click", () => {
      openModal(t("acc.deleteConfirmTitle"), `
        <p>${t("acc.deleteConfirmText")}</p>
        <div class="field"><input class="input" id="delWord" placeholder="${t("acc.deleteConfirmPh")}"></div>
        <div class="row" style="justify-content:flex-end">
          <button class="btn btn-ghost" data-close>${t("common.cancel")}</button>
          <button class="btn btn-danger" id="delGo">${t("acc.deleteBtn")}</button>
        </div>`);
      $("#delGo").addEventListener("click", async () => {
        const expected = t("acc.deleteConfirmPh");
        if (($("#delWord").value || "").trim().toUpperCase() !== expected.toUpperCase()) {
          return toast(t("acc.deleteConfirmText"), "error");
        }
        try {
          await S.deleteBusinessData(state.business.id);
          closeModal();
          toast(t("acc.deleteDone"));
          setTimeout(async () => { await S.signOut(); location.href = "/index.html"; }, 900);
        } catch (e) { toast((e && e.message) || t("common.error"), "error"); }
      });
    });

    $("#accSignOut").addEventListener("click", async () => {
      if (!confirm(t("common.logoutConfirm"))) return;
      await S.signOut();
      location.href = "/index.html";
    });
  }

  /* ==================== VISTA: ASISTENTE DE CONFIGURACIÓN ==================== */
  const WA_CODES = ["212", "213", "216", "221", "222", "971", "966", "20", "90", "34", "33", "32", "39", "49", "44", "1"];

  function splitWa(num) {
    const digits = (num || "").replace(/\D/g, "");
    for (const c of WA_CODES) if (digits.startsWith(c) && digits.length > c.length) return { cc: c, rest: digits.slice(c.length) };
    return { cc: "212", rest: digits };
  }

  function setupInit() {
    const b = state.business;
    const w = splitWa(b.whatsapp);
    setupDraft = {
      name: b.name || "", description: b.description || "", country: b.country || "", city: b.city || "",
      waCountry: w.cc, waNumber: w.rest,
      brandColor: b.brand_color || window.APP_CONFIG.defaultBrandColor,
      slug: b.slug || "", delivery: b.delivery || "", payments: b.payments || ""
    };
    setupLogo = b.logo_url || "";
    setupStep = 0;
  }

  function setupPatch() {
    if (setupStep === 0) return { name: setupDraft.name, description: setupDraft.description, country: setupDraft.country, city: setupDraft.city };
    if (setupStep === 1) return { whatsapp: setupDraft.waCountry + setupDraft.waNumber.replace(/\D/g, "") };
    if (setupStep === 2) return { brand_color: setupDraft.brandColor, logo_url: setupLogo };
    if (setupStep === 3) return { slug: setupDraft.slug };
    if (setupStep === 4) return { delivery: setupDraft.delivery, payments: setupDraft.payments };
    return null;
  }

  async function markOnboardingDone() {
    try { state.meta = await S.updateProfile({ onboarding_done: true }); }
    catch (e) { state.meta = Object.assign({}, state.meta, { onboarding_done: true }); }
  }

  function setupStepBusiness() {
    return `
      <div class="field"><label>${t("setup.s1.name")}</label>
        <input class="input" id="stName" value="${U.escapeHtml(setupDraft.name)}" placeholder="${t("setup.s1.namePh")}"></div>
      <div class="field"><label>${t("setup.s1.desc")}</label>
        <textarea class="textarea" id="stDesc" placeholder="${t("setup.s1.descPh")}">${U.escapeHtml(setupDraft.description)}</textarea></div>
      <div class="grid cols-2">
        <div class="field"><label>${t("setup.s1.country")}</label>
          <input class="input" id="stCountry" value="${U.escapeHtml(setupDraft.country)}"></div>
        <div class="field"><label>${t("setup.s1.city")}</label>
          <input class="input" id="stCity" value="${U.escapeHtml(setupDraft.city)}"></div>
      </div>`;
  }

  function setupStepWhatsapp() {
    const codes = [["212", "Marruecos +212"], ["213", "Algérie +213"], ["216", "Tunisie +216"],
      ["221", "Sénégal +221"], ["222", "Mauritanie +222"], ["34", "España +34"], ["33", "France +33"],
      ["32", "Belgique +32"], ["39", "Italia +39"], ["49", "Deutschland +49"], ["44", "UK +44"],
      ["1", "US / CA +1"], ["20", "مصر +20"], ["966", "السعودية +966"], ["971", "الإمارات +971"], ["90", "Türkiye +90"]];
    return `
      <div class="grid cols-2">
        <div class="field"><label>${t("setup.s2.country")}</label><select class="select" id="stWaCc">
          ${codes.map(([v, l]) => `<option value="${v}" ${setupDraft.waCountry === v ? "selected" : ""}>${l}</option>`).join("")}
        </select></div>
        <div class="field"><label>${t("setup.s2.number")}</label>
          <input class="input" id="stWaNum" value="${U.escapeHtml(setupDraft.waNumber)}" placeholder="${t("setup.s2.numberPh")}"></div>
      </div>
      <div class="card" style="border-color:var(--wa);margin-top:6px">
        <div class="small" style="color:var(--wa-dark);text-transform:uppercase;font-weight:700">${t("setup.s2.preview")}</div>
        <h3 id="stWaShown">+${U.escapeHtml(setupDraft.waCountry + setupDraft.waNumber.replace(/\D/g, ""))}</h3>
      </div>`;
  }

  function setupStepBrand() {
    const initial = (setupDraft.name || "C").charAt(0).toUpperCase();
    return `
      <div class="row" style="gap:18px;align-items:center">
        <div class="setup-logo" id="stLogoBox">${setupLogo
          ? `<img src="${U.escapeHtml(setupLogo)}" alt="">`
          : `<span>${U.escapeHtml(initial)}</span>`}</div>
        <div style="min-width:0">
          <label style="font-weight:650;font-size:.9rem">${t("setup.s3.logo")}</label>
          <div class="row wrap mt-1">
            <button class="btn btn-soft btn-sm" id="stLogoPick">${t("setup.s3.logoPick")}</button>
            <button class="btn btn-ghost btn-sm" id="stLogoRm">${t("setup.s3.logoRemove")}</button>
          </div>
          <div class="hint">${t("setup.s3.logoHint")}</div>
        </div>
      </div>
      <div class="field mt-3" style="max-width:280px"><label>${t("setup.s3.color")}</label>
        <input class="input" id="stColor" type="color" value="${U.escapeHtml(setupDraft.brandColor)}" style="height:52px;padding:6px"></div>`;
  }

  function setupStepLink() {
    const base = (window.APP_CONFIG.publicDomain || location.host).replace(/^https?:\/\//, "");
    return `
      <div class="field"><label>${t("setup.s4.slug")}</label>
        <div class="row" style="gap:0;flex-wrap:nowrap">
          <span class="input setup-slug-prefix">${U.escapeHtml(base + (window.APP_CONFIG.catalogPath || "/catalogo.html") + "?b=")}</span>
          <input class="input setup-slug-input" id="stSlug" value="${U.escapeHtml(setupDraft.slug)}">
        </div>
        <div class="hint" id="stSlugMsg"></div>
      </div>`;
  }

  function setupStepSales() {
    const dHas = (k) => (setupDraft.delivery || "").indexOf("[" + k + "]") >= 0;
    const pHas = (k) => (setupDraft.payments || "").indexOf("[" + k + "]") >= 0;
    const opt = (cls, k, ico, label, on) =>
      `<label class="opt-row"><input type="checkbox" class="${cls}" value="${k}" ${on ? "checked" : ""}>
        <span class="opt-ico">${ico}</span><span>${label}</span></label>`;
    return `
      <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("setup.s5.delivery")}</div>
      <div class="opt-list mt-1 mb-3">
        ${opt("stDlv", "pickup", "🏬", t("cfg.pickup"), dHas("pickup"))}
        ${opt("stDlv", "local", "🛵", t("cfg.localDelivery"), dHas("local"))}
        ${opt("stDlv", "shipping", "📦", t("cfg.shipping"), dHas("shipping"))}
        ${opt("stDlv", "meetup", "🤝", t("cfg.meetup"), dHas("meetup"))}
      </div>
      <div class="small muted" style="text-transform:uppercase;font-weight:700">${t("setup.s5.payments")}</div>
      <div class="opt-list mt-1">
        ${opt("stPay", "cash", "💵", t("cfg.cash"), pHas("cash"))}
        ${opt("stPay", "transfer", "🏦", t("cfg.bankTransfer"), pHas("transfer"))}
        ${opt("stPay", "card", "💳", t("cfg.cardOnDelivery"), pHas("card"))}
        ${opt("stPay", "online", "🌐", t("cfg.onlinePayment"), pHas("online"))}
        ${opt("stPay", "wallet", "📱", t("cfg.mobileWallet"), pHas("wallet"))}
      </div>`;
  }

  function viewSetupDone() {
    const url = U.catalogUrl(state.business.slug);
    return `
      <div class="setup-wrap">
        <div class="setup-card center">
          <div class="setup-done-ico">✓</div>
          <h2>${t("setup.done.title")}</h2>
          <p class="small muted" style="margin-top:8px">${t("setup.done.sub")}</p>
          <div class="row wrap mt-3" style="justify-content:center">
            <a class="btn btn-primary" href="#product/new">+ ${t("setup.done.product")}</a>
            <a class="btn btn-soft" target="_blank" href="${U.escapeHtml(url)}">${t("setup.done.catalog")} ↗</a>
            <a class="btn btn-ghost" href="#home">${t("setup.done.panel")}</a>
          </div>
        </div>
      </div>`;
  }

  function viewSetup() {
    if (!setupDraft) setupInit();
    if (setupStep >= SETUP_TOTAL) return viewSetupDone();

    const steps = [
      { ico: "🏪", title: t("setup.s1.title"), sub: t("setup.s1.sub"), html: setupStepBusiness() },
      { ico: "💬", title: t("setup.s2.title"), sub: t("setup.s2.sub"), html: setupStepWhatsapp() },
      { ico: "🎨", title: t("setup.s3.title"), sub: t("setup.s3.sub"), html: setupStepBrand() },
      { ico: "🔗", title: t("setup.s4.title"), sub: t("setup.s4.sub"), html: setupStepLink() },
      { ico: "🚚", title: t("setup.s5.title"), sub: t("setup.s5.sub"), html: setupStepSales() }
    ];
    const cur = steps[setupStep];
    const isLast = setupStep === steps.length - 1;
    const bars = steps.map((s, i) =>
      `<i class="${i < setupStep ? "done" : i === setupStep ? "active" : ""}"></i>`).join("");

    return `
      <div class="setup-wrap">
        <div class="page-head center" style="text-align:center">
          <h1>${t("setup.title")}</h1><p>${t("setup.sub")}</p>
        </div>
        <div class="setup-bar" role="progressbar" aria-label="${t("setup.progress")}">${bars}</div>
        <div class="small muted center mb-2">${t("setup.step").replace("{n}", setupStep + 1).replace("{total}", steps.length)}</div>

        <div class="setup-card">
          <div class="setup-ico">${cur.ico}</div>
          <h2>${cur.title}</h2>
          <p class="small muted" style="margin-top:6px">${cur.sub}</p>
          <div class="mt-3">${cur.html}</div>
          <div class="setup-actions">
            ${setupStep > 0 ? `<button class="btn btn-ghost" id="stBack">‹ ${t("setup.back")}</button>` : ""}
            <button class="btn btn-ghost btn-sm" id="stSkip">${t("setup.skip")}</button>
            <div class="spacer"></div>
            <button class="btn btn-primary" id="stNext">${isLast ? t("setup.finish") : t("setup.next")} →</button>
          </div>
        </div>
      </div>`;
  }

  function bindSetup() {
    if (setupStep >= SETUP_TOTAL) return;

    function capture() {
      const val = (id) => { const el = $("#" + id); return el ? el.value : null; };
      if ($("#stName")) setupDraft.name = val("stName").trim();
      if ($("#stDesc")) setupDraft.description = val("stDesc").trim();
      if ($("#stCountry")) setupDraft.country = val("stCountry").trim();
      if ($("#stCity")) setupDraft.city = val("stCity").trim();
      if ($("#stWaCc")) setupDraft.waCountry = val("stWaCc");
      if ($("#stWaNum")) setupDraft.waNumber = val("stWaNum").replace(/[^\d\s]/g, "");
      if ($("#stColor")) setupDraft.brandColor = val("stColor");
      if ($("#stSlug")) setupDraft.slug = val("stSlug").trim();
      if ($(".stDlv")) setupDraft.delivery = $$(".stDlv:checked").map((c) => "[" + c.value + "]").join("");
      if ($(".stPay")) setupDraft.payments = $$(".stPay:checked").map((c) => "[" + c.value + "]").join("");
    }

    const cc = $("#stWaCc"), num = $("#stWaNum"), shown = $("#stWaShown");
    if (cc && num && shown) {
      const sync = () => { shown.textContent = "+" + cc.value + num.value.replace(/\D/g, ""); };
      cc.addEventListener("change", sync);
      num.addEventListener("input", sync);
    }

    const lp = $("#stLogoPick");
    if (lp) lp.addEventListener("click", () => pickImages({ onPick: (items) => {
      if (!items.length) return;
      setupLogo = items[0].url;
      $("#stLogoBox").innerHTML = `<img src="${U.escapeHtml(setupLogo)}" alt="">`;
    } }));

    const lr = $("#stLogoRm");
    if (lr) lr.addEventListener("click", () => {
      setupLogo = "";
      $("#stLogoBox").innerHTML = `<span>${U.escapeHtml((setupDraft.name || "C").charAt(0).toUpperCase())}</span>`;
    });

    const slug = $("#stSlug");
    if (slug) {
      const msg = $("#stSlugMsg");
      let timer;
      slug.addEventListener("input", () => {
        slug.value = S.slugify(slug.value);
        msg.textContent = t("setup.s4.checking");
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (!slug.value) { msg.textContent = ""; return; }
          if (slug.value === state.business.slug) { msg.textContent = "✓ " + t("setup.s4.free"); return; }
          try {
            const ok = await S.slugAvailable(slug.value);
            msg.textContent = ok ? "✓ " + t("setup.s4.free") : t("setup.s4.taken");
          } catch (e) { msg.textContent = ""; }
        }, 420);
      });
    }

    $("#stNext").addEventListener("click", async () => {
      capture();
      if (setupStep === 0 && !setupDraft.name) return toast(t("common.required"), "error");
      if (setupStep === 3 && !setupDraft.slug) return toast(t("common.required"), "error");
      if (setupStep === 3 && setupDraft.slug !== state.business.slug) {
        try {
          const ok = await S.slugAvailable(setupDraft.slug);
          if (!ok) return toast(t("setup.s4.taken"), "error");
        } catch (e) { /* continuar */ }
      }
      const patch = setupPatch();
      if (patch) {
        try { await S.updateBusiness(state.business.id, patch); await loadBusiness(); }
        catch (e) { return toast((e && e.message) || t("common.error"), "error"); }
      }
      if (setupStep < SETUP_TOTAL - 1) { setupStep++; route(); }
      else { await markOnboardingDone(); setupStep = SETUP_TOTAL; route(); }
    });

    const back = $("#stBack");
    if (back) back.addEventListener("click", () => { capture(); setupStep--; route(); });

    $("#stSkip").addEventListener("click", async () => {
      if (!confirm(t("setup.skipConfirm"))) return;
      await markOnboardingDone();
      toast(t("acc.saved"));
      go("home");
    });
  }

  /* ==================== ARRANQUE ==================== */
  async function loadBusiness() {
    state.business = await S.myBusiness();
  }

  async function boot() {
    const user = await S.currentUser();
    if (!user) { location.href = "/login.html"; return; }
    await loadBusiness();
    if (!state.business) { location.href = "/login.html"; return; }
    state.user = user;
    try { state.meta = (await S.userMeta()) || {}; } catch (e) { state.meta = {}; }
    ready = true;

    const email = (user && user.email) || "";
    $("#sideBizName").textContent = state.business.name;
    const sideEmail = $("#sideUserEmail");
    if (sideEmail) sideEmail.textContent = email;
    $("#topBizName").textContent = state.business.name;
    $("#topUserName").textContent = state.meta.full_name || email || state.business.name;
    const av = $("#topAvatar");
    if (av) av.textContent = (email.charAt(0) || "U").toUpperCase();
    const viewBtn = $("#viewCatalogBtn");
    viewBtn.href = U.catalogUrl(state.business.slug);

    await refresh();

    $("#logoutBtn").addEventListener("click", async () => {
      if (!confirm(t("common.logoutConfirm"))) return;
      await S.signOut();
      location.href = "/index.html";
    });

    // Navegación del menú lateral
    $$(".side-link[data-route]").forEach((b) =>
      b.addEventListener("click", () => {
        const r = b.getAttribute("data-route");
        // Abrir el asistente desde el menú reinicia el recorrido
        if (r === "setup") { setupDraft = null; setupStep = 0; }
        go(r);
        if (window.innerWidth <= 980) $("#sidebar").classList.remove("open");
      })
    );

    const toggle = $("#sideToggle");
    function syncToggle() { toggle.style.display = window.innerWidth <= 980 ? "inline-flex" : "none"; }
    syncToggle();
    window.addEventListener("resize", syncToggle);
    toggle.addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    document.addEventListener("click", (e) => {
      const sb = $("#sidebar");
      if (window.innerWidth <= 980 && sb.classList.contains("open") && !sb.contains(e.target) && e.target !== toggle) sb.classList.remove("open");
    });

    window.addEventListener("hashchange", route);
    document.addEventListener("langchange", () => {
      $$(".side-link[data-route]").forEach(() => {});
      route();
    });

    // Primer acceso: abrir el asistente de configuración si no se ha completado
    const parts = parseRoute();
    if (state.meta.onboarding_done !== true && (!parts[0] || parts[0] === "home")) {
      location.hash = "setup";
    }
    route();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
