/* ===========================================================
   Catalogo Wha — Comportamiento común
   Menú móvil · Selector de idioma · Chatbot · PWA · Utilidades
   =========================================================== */
(function () {
  const CFG = window.APP_CONFIG;
  const t = (k) => (window.I18n ? I18n.t(k) : k);

  /* ---------- Utilidades ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // **negrita** -> <b>negrita</b>
  function mdToHtml(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  }
  // **negrita** -> *negrita* (formato nativo de WhatsApp)
  function mdToWa(s) {
    return String(s || "").replace(/\*\*(.+?)\*\*/g, "*$1*");
  }
  function currency(v, cur) {
    const n = Number(v || 0);
    const f = n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return f + " " + (cur || CFG.defaultCurrency);
  }
  function waLink(number, text) {
    const num = String(number || "").replace(/\D/g, "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(text || "");
  }
  function catalogUrl(slug) {
    const base = (CFG.publicDomain || location.host).replace(/^https?:\/\//, "");
    return location.protocol + "//" + base + (CFG.catalogPath || "/catalogo.html") + "?b=" + encodeURIComponent(slug);
  }
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  CW.util = { escapeHtml, mdToHtml, mdToWa, currency, waLink, catalogUrl, qs };

  /* ---------- Selector de idioma ---------- */
  function buildLangSelector() {
    const FLAGS = { es: "🇪🇸", fr: "🇫🇷", ar: "🇸🇦" };
    document.querySelectorAll("[data-lang-root]").forEach((root) => {
      root.innerHTML =
        '<button class="lang-btn" aria-haspopup="true" aria-expanded="false">' +
        '<span class="flag">' + FLAGS[I18n.get()] + '</span>' +
        '<span data-lang-label>' + escapeHtml(t("lang." + I18n.get())) + '</span>' +
        '<span aria-hidden="true">▾</span></button>' +
        '<div class="lang-menu" role="menu"></div>';
      const btn = root.querySelector(".lang-btn");
      const menu = root.querySelector(".lang-menu");
      I18n.languages.forEach((lg) => {
        const b = document.createElement("button");
        b.setAttribute("data-lang-btn", lg);
        b.innerHTML = '<span class="flag">' + FLAGS[lg] + '</span><span>' + escapeHtml(t("lang." + lg)) + "</span>";
        b.addEventListener("click", () => { I18n.set(lg); menu.classList.remove("open"); });
        menu.appendChild(b);
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("open");
        btn.setAttribute("aria-expanded", menu.classList.contains("open"));
      });
      document.addEventListener("click", () => menu.classList.remove("open"));
    });
  }

  function buildInlineLang() {
    const FLAGS = { es: "🇪🇸", fr: "🇫🇷", ar: "🇸🇦" };
    document.querySelectorAll("[data-lang-inline]").forEach((root) => {
      root.innerHTML = "";
      I18n.languages.forEach((lg) => {
        const b = document.createElement("button");
        b.setAttribute("data-lang-btn", lg);
        b.innerHTML = FLAGS[lg] + " " + escapeHtml(t("lang." + lg));
        b.addEventListener("click", () => I18n.set(lg));
        root.appendChild(b);
      });
    });
  }

  function refreshLangUI() {
    document.querySelectorAll("[data-lang-label]").forEach((el) => {
      el.textContent = t("lang." + I18n.get());
    });
    document.querySelectorAll("[data-lang-root] .lang-btn .flag").forEach((el) => {
      el.textContent = { es: "🇪🇸", fr: "🇫🇷", ar: "🇸🇦" }[I18n.get()];
    });
    document.querySelectorAll("[data-lang-btn]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-lang-btn") === I18n.get());
    });
  }

  /* ---------- Menú móvil ---------- */
  function initMobileMenu() {
    const burger = document.querySelector(".burger");
    const menu = document.getElementById("mobileMenu");
    if (!burger || !menu) return;
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        burger.classList.remove("open");
        document.body.style.overflow = "";
      })
    );
  }

  /* ---------- Chatbot ---------- */
  const CHAT_KB = {
    create: {
      es: "**Crear tu catálogo** es muy fácil:\n1. Pulsa **Crear mi catálogo**.\n2. Regístrate con tu correo y el **nombre de tu negocio**.\n3. En el panel, ve a **Productos** y agrega los tuyos con foto y precio.\n4. Crea **Categorías** para organizarlos.\n5. Copia tu **enlace** y compártelo por WhatsApp.\n\nTus clientes eligen y te envían el pedido ya armado.",
      fr: "**Créer votre catalogue** est très simple :\n1. Cliquez sur **Créer mon catalogue**.\n2. Inscrivez-vous avec votre e-mail et le **nom de votre commerce**.\n3. Dans l'espace, allez à **Produits** et ajoutez les vôtres avec photo et prix.\n4. Créez des **Catégories** pour les organiser.\n5. Copiez votre **lien** et partagez-le sur WhatsApp.\n\nVos clients choisissent et vous envoient la commande prête.",
      ar: "**إنشاء كتالوجك** سهل جدًا:\n1. اضغط **أنشئ كتالوجي**.\n2. سجّل ببريدك و**اسم متجرك**.\n3. في اللوحة، انتقل إلى **المنتجات** وأضف منتجاتك بصورة وسعر.\n4. أنشئ **تصنيفات** لتنظيمها.\n5. انسخ **رابطك** وشاركه على واتساب.\n\nيختار عملاؤك ويرسلون الطلب جاهزًا."
    },
    price: {
      es: "El **plan inicial es gratis** y sin tarjeta de crédito.\nIncluye **productos ilimitados**, categorías, **biblioteca de imágenes**, pedidos por **WhatsApp**, enlace propio, **multidioma** (ES/FR/AR) y **app instalable**.\n\nPuedes empezar hoy mismo.",
      fr: "L'**offre de départ est gratuite** et sans carte bancaire.\nElle inclut des **produits illimités**, des catégories, une **bibliothèque d'images**, des commandes **WhatsApp**, un lien personnalisé, le **multilingue** (ES/FR/AR) et une **app installable**.\n\nVous pouvez commencer aujourd'hui.",
      ar: "**الخطة المبدئية مجانية** وبدون بطاقة بنكية.\nتشمل **منتجات غير محدودة** وتصنيفات و**مكتبة صور** وطلبات **واتساب** ورابطًا خاصًا و**تعدد اللغات** (ES/FR/AR) و**تطبيقًا قابلًا للتثبيت**.\n\nيمكنك البدء اليوم."
    },
    orders: {
      es: "**Recibir pedidos** funciona así:\n1. Compartes tu **enlace de catálogo**.\n2. El cliente elige productos y arma su **pedido**.\n3. Al enviarlo, se abre **WhatsApp** con el mensaje completo: productos, cantidades y **total**.\n4. Tú lo recibes y lo gestionas desde **Pedidos** en tu panel.",
      fr: "**Recevoir des commandes** fonctionne ainsi :\n1. Vous partagez votre **lien de catalogue**.\n2. Le client choisit et prépare sa **commande**.\n3. À l'envoi, **WhatsApp** s'ouvre avec le message complet : produits, quantités et **total**.\n4. Vous le recevez et le gérez depuis **Commandes**.",
      ar: "**استقبال الطلبات** يعمل هكذا:\n1. تشارك **رابط الكتالوج**.\n2. يختار العميل المنتجات ويجهّز **طلبه**.\n3. عند الإرسال يُفتح **واتساب** برسالة كاملة: المنتجات والكميات و**المجموع**.\n4. تستقبله وتديره من **الطلبات** في لوحتك."
    },
    app: {
      es: "Puedes **instalar Catalogo Wha en tu móvil** como una app (PWA):\nEn **Android/Chrome**: menú ⋮ → **Instalar aplicación**.\nEn **iPhone/Safari**: Compartir → **Añadir a pantalla de inicio**.\n\nAsí tendrás acceso directo sin abrir el navegador.",
      fr: "Vous pouvez **installer Catalogo Wha sur votre mobile** comme une app (PWA) :\nSur **Android/Chrome** : menu ⋮ → **Installer l'application**.\nSur **iPhone/Safari** : Partager → **Sur l'écran d'accueil**.\n\nVous aurez un accès direct sans ouvrir le navigateur.",
      ar: "يمكنك **تثبيت Catalogo Wha على هاتفك** كتطبيق (PWA):\nعلى **أندرويد/كروم**: القائمة ⋮ → **تثبيت التطبيق**.\nعلى **آيفون/سفاري**: مشاركة → **إضافة إلى الشاشة الرئيسية**.\n\nوبذلك تصل إليه مباشرة دون فتح المتصفح."
    },
    human: {
      es: "Con gusto te ayudamos.\nPuedes escribirnos a **contact@clickpubli.com** o por **WhatsApp** al **+212 6 90 15 70 92**.\n\nPulsa **Enviar por WhatsApp** y te llevamos toda la información de esta conversación.",
      fr: "Avec plaisir.\nÉcrivez-nous à **contact@clickpubli.com** ou sur **WhatsApp** au **+212 6 90 15 70 92**.\n\nCliquez sur **Envoyer sur WhatsApp** et nous transmettons toute la conversation.",
      ar: "يسعدنا مساعدتك.\nراسلنا على **contact@clickpubli.com** أو عبر **واتساب** على **+212 6 90 15 70 92**.\n\nاضغط **إرسال على واتساب** وسننقل لك كل معلومات هذه المحادثة."
    },
    start: {
      es: "¡Hola! Soy el asistente de **Catalogo Wha**.\nPuedo explicarte cómo **crear tu catálogo**, **recibir pedidos por WhatsApp** o **instalar la app**.\n\n¿Sobre qué quieres informarte?",
      fr: "Bonjour ! Je suis l'assistant de **Catalogo Wha**.\nJe peux vous expliquer comment **créer votre catalogue**, **recevoir des commandes WhatsApp** ou **installer l'app**.\n\nSur quoi voulez-vous des informations ?",
      ar: "مرحبًا! أنا مساعد **Catalogo Wha**.\nيمكنني شرح كيفية **إنشاء كتالوجك** و**استقبال الطلبات على واتساب** و**تثبيت التطبيق**.\n\nعن أي شيء تريد معلومات؟"
    }
  };

  function detectTopic(text) {
    const s = (text || "").toLowerCase();
    if (/precio|cost|tarif|prix|سعر|تكلفة|أسعار/.test(s)) return "price";
    if (/pedido|command|orden|طلب|طلبات/.test(s)) return "orders";
    if (/app|instal|pwa|تطبيق|تثبيت/.test(s)) return "app";
    if (/persona|human|contact|ayuda|aide|شخص|تواصل|مساعدة/.test(s)) return "human";
    if (/crear|crea|registr|catalog|créer|كتالوج|إنشاء/.test(s)) return "create";
    return "create";
  }

  function initChatbot() {
    const panel = document.getElementById("chatPanel");
    const fab = document.getElementById("chatFab");
    if (!panel || !fab) return;
    const body = panel.querySelector(".chat-body");
    const quick = panel.querySelector(".chat-quick");
    const input = panel.querySelector(".chat-input");
    const sendBtn = panel.querySelector(".chat-send");
    const history = []; // {role, text}

    function addMsg(role, text) {
      const div = document.createElement("div");
      div.className = "msg " + (role === "user" ? "user" : "bot");
      div.innerHTML = mdToHtml(text);
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      history.push({ role, text });
    }

    function buildQuick() {
      quick.innerHTML = "";
      const items = [
        { key: "chat.q1", topic: "create" },
        { key: "chat.q2", topic: "price" },
        { key: "chat.q3", topic: "orders" },
        { key: "chat.q4", topic: "human" }
      ];
      items.forEach((it) => {
        const b = document.createElement("button");
        b.textContent = t(it.key);
        b.addEventListener("click", () => ask(t(it.key), it.topic));
        quick.appendChild(b);
      });
      const wa = document.createElement("button");
      wa.style.background = "var(--wa)";
      wa.style.borderColor = "var(--wa)";
      wa.style.color = "#fff";
      wa.textContent = t("chat.sendWa");
      wa.addEventListener("click", sendToWhatsApp);
      quick.appendChild(wa);
    }

    function ask(question, topic) {
      addMsg("user", question);
      const lg = I18n.get();
      const key = topic || detectTopic(question);
      const ans = (CHAT_KB[key] && CHAT_KB[key][lg]) || CHAT_KB[key].es;
      setTimeout(() => addMsg("bot", ans), 350);
    }

    function sendToWhatsApp() {
      const lg = I18n.get();
      let out = "**" + t("chat.title") + "**\n\n";
      history.forEach((h) => {
        if (h.role === "user") out += "**" + h.text + "**\n";
        else out += h.text + "\n";
      });
      out += "\n" + (lg === "fr" ? "Merci de me contacter." : lg === "ar" ? "شكرًا لتواصلك معي." : "Gracias por contactarme.");
      window.open(waLink(CFG.supportWhatsApp, mdToWa(out)), "_blank");
    }

    function openPanel() {
      panel.classList.add("open");
      if (!history.length) {
        addMsg("bot", CHAT_KB.start[I18n.get()] || CHAT_KB.start.es);
        buildQuick();
      }
      input.focus();
    }

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) openPanel();
    });
    sendBtn.addEventListener("click", () => {
      if (input.value.trim()) { ask(input.value.trim()); input.value = ""; }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) { ask(input.value.trim()); input.value = ""; }
    });

    document.addEventListener("langchange", () => {
      panel.querySelector(".chat-title").textContent = t("chat.title");
      panel.querySelector(".chat-sub").textContent = t("chat.online");
      input.setAttribute("placeholder", t("chat.placeholder"));
      if (history.length) buildQuick();
    });
  }

  /* ---------- PWA ---------- */
  let deferredPrompt = null;
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
    const banner = document.getElementById("pwaBanner");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (banner && !localStorage.getItem("cw_pwa_dismissed")) banner.classList.add("show");
    });
    if (banner) {
      banner.querySelector(".pwa-install").addEventListener("click", async () => {
        banner.classList.remove("show");
        if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
        else alert(t("pwa.installText"));
      });
      banner.querySelector(".pwa-later").addEventListener("click", () => {
        banner.classList.remove("show");
        localStorage.setItem("cw_pwa_dismissed", "1");
      });
    }
  }

  /* ---------- Header dinámico según sesión ---------- */
  async function refreshSessionUI() {
    const user = await CW.store.currentUser();
    document.querySelectorAll("[data-auth='in']").forEach((el) => el.classList.toggle("hidden", !user));
    document.querySelectorAll("[data-auth='out']").forEach((el) => el.classList.toggle("hidden", !!user));
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    CW.store.init();
    buildLangSelector();
    buildInlineLang();
    initMobileMenu();
    initChatbot();
    initPWA();
    refreshLangUI();
    refreshSessionUI();
    document.addEventListener("langchange", refreshLangUI);
  });
})();
