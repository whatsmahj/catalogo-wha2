/* ===========================================================
   Catalogo Wha — Autenticación (login / registro)
   =========================================================== */
(function () {
  const t = (k) => I18n.t(k);
  const $ = (s) => document.querySelector(s);

  let mode = location.hash === "#registro" ? "register" : "login";

  const els = {
    tabLogin: $("#tabLogin"),
    tabRegister: $("#tabRegister"),
    title: $("#authTitle"),
    sub: $("#authSub"),
    form: $("#authForm"),
    business: $("#business"),
    slug: $("#slug"),
    email: $("#email"),
    password: $("#password"),
    submit: $("#submitBtn"),
    fieldBusiness: $("#fieldBusiness"),
    fieldSlug: $("#fieldSlug"),
    alert: $("#authAlert"),
    switchText: $("#switchText"),
    switchLink: $("#switchLink"),
    forgot: $("#forgot"),
    slugPrefix: $("#slugPrefix")
  };

  // Prefijo del enlace (dominio real)
  if (els.slugPrefix) {
    const base = (window.APP_CONFIG.publicDomain || location.host).replace(/^https?:\/\//, "");
    els.slugPrefix.textContent = base + (window.APP_CONFIG.catalogPath || "/catalogo.html") + "?b=";
  }

  function setMode(m) {
    mode = m;
    const isReg = m === "register";
    els.tabLogin.classList.toggle("active", !isReg);
    els.tabRegister.classList.toggle("active", isReg);
    els.fieldBusiness.style.display = isReg ? "block" : "none";
    els.fieldSlug.style.display = isReg ? "block" : "none";
    els.title.setAttribute("data-i18n", isReg ? "auth.register.title" : "auth.login.title");
    els.sub.setAttribute("data-i18n", isReg ? "auth.register.sub" : "auth.login.sub");
    els.submit.setAttribute("data-i18n", isReg ? "auth.submit.register" : "auth.submit.login");
    els.switchText.setAttribute("data-i18n", isReg ? "auth.hasAccount" : "auth.noAccount");
    els.switchLink.setAttribute("data-i18n", isReg ? "auth.signIn" : "auth.createFree");
    els.forgot.style.display = isReg ? "none" : "inline";
    els.password.setAttribute("autocomplete", isReg ? "new-password" : "current-password");
    els.alert.classList.add("hidden");
    I18n.apply(els.form.parentElement);
    location.hash = isReg ? "#registro" : "";
  }

  els.tabLogin.addEventListener("click", () => setMode("login"));
  els.tabRegister.addEventListener("click", () => setMode("register"));
  els.switchLink.addEventListener("click", (e) => {
    e.preventDefault();
    setMode(mode === "register" ? "login" : "register");
  });
  els.forgot.addEventListener("click", (e) => {
    e.preventDefault();
    showAlert(t("auth.forgot") + " → contact@clickpubli.com", "info");
  });

  // Autocompletar slug desde el nombre del negocio
  els.business.addEventListener("input", () => {
    if (document.activeElement === els.business || !els.slug.value) {
      els.slug.value = CW.store.slugify(els.business.value);
    }
  });
  els.slug.addEventListener("input", () => {
    els.slug.value = CW.store.slugify(els.slug.value);
  });

  function showAlert(msg, kind) {
    els.alert.className = "alert alert-" + (kind || "error");
    els.alert.textContent = msg;
  }

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.alert.classList.add("hidden");
    const email = els.email.value.trim();
    const password = els.password.value;
    if (!email || !password) { showAlert(t("common.required")); return; }

    els.submit.disabled = true;
    const original = els.submit.textContent;
    els.submit.textContent = t("common.loading");

    try {
      if (mode === "register") {
        const business = els.business.value.trim();
        let slug = els.slug.value.trim();
        if (!business || !slug) { showAlert(t("common.required")); els.submit.disabled = false; els.submit.textContent = original; return; }
        const ok = await CW.store.slugAvailable(slug);
        if (!ok) { showAlert("El enlace ya está en uso. Prueba otro."); els.submit.disabled = false; els.submit.textContent = original; return; }
        await CW.store.signUp({ email, password, business, slug });
        location.href = "/dashboard.html";
      } else {
        await CW.store.signIn(email, password);
        location.href = "/dashboard.html";
      }
    } catch (err) {
      showAlert((err && err.message) || t("common.error"));
      els.submit.disabled = false;
      els.submit.textContent = original;
    }
  });

  // Si ya hay sesión, ir al panel
  CW.store.currentUser().then((u) => { if (u) location.href = "/dashboard.html"; });

  document.addEventListener("DOMContentLoaded", () => setMode(mode));
})();
