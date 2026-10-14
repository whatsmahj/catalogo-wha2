# Catalogo Wha

Catálogo online + WhatsApp. Tus clientes ven los productos, arman su pedido y te
lo envían por WhatsApp en un solo mensaje.

**Stack:** HTML/CSS/JS estático (sin build) · Supabase (auth + base de datos + almacenamiento) · Vercel (hosting) · GitHub (código).

**Contacto:** contact@clickpubli.com · WhatsApp [+212 6 90 15 70 92](https://wa.me/212690157092)

---

## ✨ Funcionalidades incluidas

| Área | Qué incluye |
|---|---|
| **Landing** | Hero, problema/solución, pasos, funciones, precios, FAQ, CTA final, footer |
| **Cuentas** | Registro e inicio de sesión (Supabase Auth), creación automática del negocio |
| **Panel** | Inicio, Pedidos, Productos (con formulario), Categorías, Biblioteca, Configuración |
| **Configuración** | Negocio, WhatsApp, Marca, Moneda, Enlace, Presentación, **Entrega**, **Formas de pago**, **SEO y compartir** — con filtros por categoría (Todo / General / Catálogo / Publicación / Ventas) |
| **Catálogo público** | Enlace propio `?b=slug`, filtros por categoría, buscador, carrito, pedido por WhatsApp |
| **Biblioteca de imágenes** | Subida, listado, **eliminación** y reutilización en productos/categorías/marca |
| **Multiidioma** | 🇪🇸 Español · 🇫🇷 Français · 🇸🇦 العربية (con soporte **RTL**) |
| **Chatbot** | Responde el procedimiento y **envía la conversación por WhatsApp** con **negrita nativa** (`*texto*`), sin iconos incompatibles |
| **PWA** | Instalable en móvil, con service worker y funcionamiento offline básico |
| **Sesión visible** | La landing muestra «Mi panel» / «Ver catálogo» y el correo del usuario cuando hay sesión; el panel muestra avatar, negocio y correo |
| **SEO** | Metas por idioma, Open Graph/Twitter, `hreflang`, canonical, JSON-LD, `robots.txt` y `sitemap.xml` |
| **Imágenes** | Hero, ejemplos (restaurante, moda, materiales) y banner para compartir en `assets/img/` |
| **Menú móvil** | Logo + hamburguesa; incluye banderas de idioma, Iniciar sesión y Crear mi catálogo |
| **Tipografía** | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` con pesos 750 |

---

## 🚀 Puesta en marcha (3 pasos)

### 1) Supabase

1. Crea un proyecto en <https://supabase.com>.
2. Abre **SQL Editor** y ejecuta todo el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   - Crea las tablas `businesses`, `categories`, `products`, `orders`, `library`.
   - Activa **Row Level Security** y políticas.
   - Crea el bucket público `catalog-images` para las imágenes.
   - Instala el trigger que **crea el negocio al registrarse**.
3. En **Project Settings → API** copia:
   - `Project URL` → `supabaseUrl`
   - `anon public` key → `supabaseAnonKey`
4. Pégalas en [`assets/js/config.js`](assets/js/config.js).

> 💡 **Modo demo:** si dejas `supabaseUrl` y `supabaseAnonKey` vacíos, la app
> funciona igual usando `localStorage` (ideal para previsualizar). El catálogo de
> ejemplo está en `/catalogo.html?b=demo`.

### 2) GitHub

```bash
git init
git add .
git commit -m "Catalogo Wha"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/catalogo-wha.git
git push -u origin main
```

### 3) Vercel

1. En <https://vercel.com> → **Add New → Project** → importa el repositorio.
2. Framework preset: **Other**. Build command: *(vacío)*. Output: *(vacío, raíz)*.
3. **Deploy**.
4. Cuando tengas el dominio (p. ej. `catalogo-wha.vercel.app`), ponlo en
   `publicDomain` dentro de `assets/js/config.js` para que los enlaces de catálogo
   se generen con tu dominio.

---

## 📁 Estructura

```
.
├── index.html              # Landing pública
├── login.html              # Registro / inicio de sesión
├── dashboard.html          # Panel del negocio (SPA por hash)
├── catalogo.html           # Catálogo público + carrito
├── manifest.webmanifest    # PWA
├── sw.js                   # Service Worker
├── robots.txt              # Directivas para buscadores
├── sitemap.xml             # Mapa del sitio (SEO)
├── vercel.json             # Configuración de despliegue
├── assets/
│   ├── css/styles.css      # Estilos globales
│   ├── img/                # Iconos + hero + ejemplos + og-image
│   └── js/
│       ├── config.js       # ← TU configuración (Supabase, contacto)
│       ├── i18n.js         # Traducciones ES / FR / AR
│       ├── store.js        # Capa de datos (Supabase o demo)
│       ├── common.js       # Menú, idiomas, chatbot, PWA
│       ├── auth.js         # Login / registro
│       ├── dashboard.js    # Panel
│       └── catalog.js      # Catálogo público
└── supabase/schema.sql     # Esquema completo de base de datos
```

---

## 🌍 Idiomas

Todas las cadenas están en `assets/js/i18n.js`. Para editar un texto, busca su
clave (p. ej. `"hero.title1"`) en los bloques `es`, `fr` y `ar`. El idioma se
detecta del navegador, se guarda en `localStorage` y el árabe activa `dir="rtl"`.

## 🔍 SEO (multiidioma)

Ya viene configurado en `index.html` y `catalogo.html`:

- **Título y descripción por idioma** (`data-i18n` sobre `<title>`, `meta[name=description]`,
  `og:title`, `og:description`): al cambiar de idioma se actualizan solos.
- **`hreflang`** para `es`, `fr`, `ar` y `x-default` + **canonical** con `?lang=xx`.
- **Open Graph y Twitter Card** para que el enlace se vea bien al compartirlo.
- **Datos estructurados JSON-LD**: `SoftwareApplication` en la landing y `Store` en cada catálogo.
- **Idioma en la URL**: `?lang=es|fr|ar` (se guarda en `localStorage`).

### Antes de publicar

1. Sustituye `TU-DOMINIO` en **`robots.txt`** y **`sitemap.xml`** por tu dominio real.
2. En `assets/js/config.js`, pon tu dominio en `publicDomain` (así el enlace del catálogo y
   las imágenes de compartir se generan con URL absoluta).
3. En `index.html` y `catalogo.html`, si quieres previsualizaciones perfectas en WhatsApp/Facebook,
   cambia `content="assets/img/og-image.png"` por la URL absoluta de tu `og-image.png`.
4. Añade una entrada `<url>` en `sitemap.xml` por cada catálogo público (`?b=tu-slug`).
5. En Google Search Console, envía `https://TU-DOMINIO/sitemap.xml`.

## 💬 Chatbot

Definido en `assets/js/common.js` (objeto `CHAT_KB`). Cada respuesta usa
`**negrita**`; al enviar por WhatsApp se convierte a `*negrita*` (formato nativo).
Los mensajes no usan iconos que WhatsApp no muestre correctamente.

## 🚚 Entrega, pagos y SEO del negocio

Cada negocio configura desde el panel (se guardan en Supabase):

| Sección | Campos |
|---|---|
| **Entrega** | métodos (`pickup`, `local`, `shipping`, `meetup`), `delivery_fee`, `delivery_time`, `delivery_notes` |
| **Formas de pago** | métodos (`cash`, `transfer`, `card`, `online`, `wallet`), `payment_notes` |
| **SEO y compartir** | `seo_title`, `seo_description`, `seo_keywords`, `seo_image` |

La sección **Entrega** y **Formas de pago** también se muestran en el catálogo público y se
incluyen en el mensaje del pedido por WhatsApp.

> Si ya tenías la base de datos creada, vuelve a ejecutar `supabase/schema.sql`: incluye
> `alter table ... add column if not exists` para añadir estas columnas sin perder datos.

## 📱 PWA

Ya incluye `manifest.webmanifest`, `sw.js` e iconos 192/512. Para que aparezca el
botón «Instalar», el sitio debe servirse por **HTTPS** (Vercel lo hace
automáticamente).

---

## 🔒 Seguridad

- La `anon key` de Supabase es pública por diseño; la protección real son las
  políticas **RLS** del `schema.sql`.
- Nunca subas tu `service_role key` al repositorio.
- Los pedidos pueden crearse sin sesión (para clientes) pero solo el dueño del
  negocio puede leerlos o gestionarlos.

---

## ⭐ Ser administrador de todas las cuentas

El panel de administración permite ver y gestionar **todas** las cuentas:
listado con propietario, enlace, número de productos / categorías / pedidos /
imágenes, buscador, detalle de cada cuenta y eliminación.

### Con Supabase (recomendado)

1. Ejecuta de nuevo `supabase/schema.sql` (la sección **9) ADMINISTRACIÓN**).
   Crea la tabla `public.admins`, la función `public.is_admin()` y las políticas
   RLS que dan acceso global **solo** a los administradores.
2. Regístrate primero en la web con **tu** correo (así existes en `auth.users`).
3. En el **SQL Editor** de Supabase ejecuta, cambiando el correo por el tuyo:

   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'tu-correo@ejemplo.com'
   on conflict (user_id) do nothing;
   ```

4. Recarga el panel: aparecerá la sección **★ Administración** en el menú.

Para añadir o quitar administradores, inserta o borra filas de `public.admins`.

### En modo demo (sin Supabase)

Añade tu correo en `assets/js/config.js`:

```js
adminEmails: ["tu-correo@ejemplo.com"],
```

### ⚠️ Importante

- El permiso real vive en **RLS + la tabla `admins`**, nunca en el navegador.
  Ocultar el menú es solo cosmético: sin la fila en `public.admins` la base de
  datos rechaza cualquier acceso a datos de otras cuentas.
- No incluyas `service_role` en el frontend para «hacerte admin»: no hace falta
  y expondría toda la base de datos.
- El panel de administración **no permite iniciar sesión como otro usuario**
  (suplantación): eso requeriría la clave de servicio y no se incluye a propósito.
