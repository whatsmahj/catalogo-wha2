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
| **Catálogo público** | Enlace propio `?b=slug`, filtros por categoría, buscador, carrito, pedido por WhatsApp |
| **Biblioteca de imágenes** | Subida, listado, **eliminación** y reutilización en productos/categorías/marca |
| **Multiidioma** | 🇪🇸 Español · 🇫🇷 Français · 🇸🇦 العربية (con soporte **RTL**) |
| **Chatbot** | Responde el procedimiento y **envía la conversación por WhatsApp** con **negrita nativa** (`*texto*`), sin iconos incompatibles |
| **PWA** | Instalable en móvil, con service worker y funcionamiento offline básico |
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
├── vercel.json             # Configuración de despliegue
├── assets/
│   ├── css/styles.css      # Estilos globales
│   ├── img/                # Iconos (svg + png)
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

## 💬 Chatbot

Definido en `assets/js/common.js` (objeto `CHAT_KB`). Cada respuesta usa
`**negrita**`; al enviar por WhatsApp se convierte a `*negrita*` (formato nativo).
Los mensajes no usan iconos que WhatsApp no muestre correctamente.

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
