# TOP NAVI AUTO

Sitio web y panel de administración de **TOP NAVI AUTO**, marca propia de radios y
pantallas para vehículos con producción propia desde China. Incluye catálogo
público, promociones con countdown, formulario de contacto, compatibilidad de
vehículos y un panel de administración completo (productos, promociones y
solicitudes de contacto) sobre Supabase.

## 1. Descripción del proyecto

- **Sitio público** (`index.html`): landing con catálogo dinámico, banner de
  promoción con countdown, sección de compatibilidad de vehículos y formulario
  de contacto.
- **Panel admin** (`admin/`): login protegido, dashboard con estadísticas,
  CRUD de productos (con subida de imágenes), CRUD de promociones y bandeja de
  solicitudes de contacto con filtros por estado.
- **Backend**: Supabase (Postgres + Auth + Storage), sin servidor propio. Todo
  el frontend habla directo con Supabase a través de la capa `lib/`.

## 2. Stack tecnológico

- HTML5 semántico + CSS3 en archivos separados (sin frameworks CSS)
- Vanilla JavaScript ES6+ con módulos ESM (sin frameworks frontend)
- [Vite](https://vitejs.dev/) como bundler y servidor de desarrollo
- [Supabase](https://supabase.com/) (Postgres, Auth, Storage) como backend
- Despliegue en [Vercel](https://vercel.com/), con deploy automático en cada push

## 3. Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior y npm
- Una cuenta de [Supabase](https://supabase.com/) y un proyecto creado
- Git

## 4. Setup local paso a paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/KeneQuirosM/TopNaviAuto.git
cd TopNaviAuto

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env y completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
# (Project Settings > API en tu proyecto de Supabase)
```

4. **Ejecutar el esquema de base de datos**: abre el **SQL Editor** de tu
   proyecto de Supabase, pega el contenido completo de
   [`supabase/schema.sql`](./supabase/schema.sql) y ejecútalo. Esto crea las
   tablas (`products`, `promotions`, `compatibility`, `contact_requests`), las
   políticas de seguridad (RLS), el bucket de Storage `product-images` y datos
   de ejemplo.

5. **Crear el usuario administrador**: en el dashboard de Supabase, ve a
   **Authentication > Users > Add user** y crea un usuario con el email y
   contraseña que usarás para entrar al panel admin (por ejemplo,
   `admin@topnaviauto.com`).

6. **Asignarle el rol de administrador**: en el **SQL Editor**, abre
   [`supabase/set-admin-role.sql`](./supabase/set-admin-role.sql), reemplaza el
   email por el del usuario que acabas de crear y ejecútalo. Sin este paso el
   usuario puede iniciar sesión pero el panel lo redirigirá de vuelta al login
   (`requireAuth()` en `lib/auth.js` exige `app_metadata.role === 'admin'`).

```bash
# 7. Levantar el entorno de desarrollo
npm run dev
```

El sitio público queda en `http://localhost:5173/` y el panel admin en
`http://localhost:5173/admin/`.

## 5. Estructura del proyecto

```
TopNaviAuto/
├── index.html                    # Landing pública (entry point principal)
├── public/
│   └── assets/
│       ├── css/                  # base, layout, components, sections, animations
│       ├── js/                   # main, ui, catalog, promotions, contact
│       └── img/
├── admin/
│   ├── index.html                # Login del panel
│   ├── dashboard.html            # Estadísticas
│   ├── products.html             # CRUD de productos
│   ├── promotions.html           # CRUD de promociones
│   ├── contacts.html             # Bandeja de solicitudes de contacto
│   └── assets/
│       ├── css/                  # admin-base, admin-components
│       └── js/                   # admin-main, admin-products, admin-promotions,
│                                  # admin-contacts, admin-upload
├── lib/                           # Capa de servicios, compartida por sitio y admin
│   ├── supabase-client.js        # Cliente único de Supabase
│   ├── api.js                    # ProductsAPI, PromotionsAPI, ContactAPI, CompatibilityAPI
│   ├── auth.js                   # signIn, signOut, requireAuth, isAdmin
│   ├── storage.js                # Subida/validación de imágenes de producto
│   └── validators.js             # Validaciones puras de formularios
├── supabase/
│   ├── schema.sql                # Esquema completo + RLS + seed
│   └── set-admin-role.sql        # Asigna app_metadata.role = 'admin'
├── vite.config.js                # Multi-entry: index.html + admin/*.html
├── .env.example
└── package.json
```

## 6. Variables de entorno requeridas

Definidas en `.env` (nunca se commitea; ver `.env.example`):

| Variable                    | Descripción                                              |
| ---------------------------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`          | URL del proyecto de Supabase (Project Settings > API)     |
| `VITE_SUPABASE_ANON_KEY`     | Clave pública **anon** del proyecto (Project Settings > API) |

Ambas deben tener el prefijo `VITE_` para que Vite las exponga al bundle del
cliente (`import.meta.env`). `lib/supabase-client.js` lanza un error explícito
al arrancar si falta alguna.

## 7. Cómo agregar un producto (desde el panel admin)

1. Entra a `/admin/index.html` e inicia sesión con tu usuario admin.
2. En el menú lateral, ve a **Productos**.
3. Haz clic en **Agregar producto**.
4. Completa el formulario: nombre, código de modelo (único), precio,
   categoría, tags separados por coma, badge (opcional: Nuevo / Más vendido),
   descripción y stock.
5. Sube una imagen (JPEG, PNG o WEBP, máx. 5MB) arrastrándola o haciendo clic
   en la zona punteada — verás una previsualización antes de guardar.
6. Haz clic en **Guardar producto**. El producto queda **activo** por defecto
   y aparece de inmediato en el catálogo público (`ProductsAPI.getActive()`).
7. Desde la tabla puedes **Editar**, **Activar/Desactivar** (lo oculta del
   sitio público sin borrarlo) o **Eliminar** (con confirmación, acción
   irreversible) cualquier producto existente.

## 8. Cómo hacer deploy

El repositorio ya está conectado a Vercel: **cada push a la rama configurada
dispara un deploy automático**, no se requiere ningún paso manual adicional.

Configuración que usa Vercel (ya aplicada, documentada aquí por si se
reconfigura el proyecto desde cero):

- **Build command**: `npm run build` (ejecuta `vite build`)
- **Output directory**: `dist`
- **Variables de entorno**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
  deben configurarse en Vercel (Project Settings > Environment Variables) con
  los mismos valores que en tu `.env` local — Vercel no lee el `.env` del
  repo.

Para generar un build de producción manualmente (por ejemplo, para probarlo
localmente o subirlo a otro hosting estático):

```bash
npm run build      # genera dist/index.html, dist/admin/*.html y dist/assets/
npm run preview     # sirve dist/ localmente para verificar el build
```

`dist/` está en `.gitignore` — no se commitea, se genera en cada build.

## 9. Seguridad: qué hacer y qué no hacer con las API keys

- **`VITE_SUPABASE_ANON_KEY` es pública por diseño.** Termina embebida en el
  JavaScript que se sirve al navegador de cualquier visitante — eso es
  esperado y seguro **siempre que las políticas de Row Level Security (RLS)
  en `supabase/schema.sql`** sean la única línea de defensa real, no la clave
  en sí. Nunca asumas que "está en una variable de entorno" la hace secreta.
- **Nunca uses ni expongas la `service_role` key en el frontend.** Esa clave
  ignora todas las políticas RLS. Este proyecto no la usa en ningún archivo de
  `lib/`, `public/` ni `admin/`, y así debe mantenerse. Si en el futuro se
  necesita una tarea que requiera privilegios elevados (por ejemplo, un cron
  job), debe ejecutarse en un entorno servidor (Supabase Edge Function,
  backend propio), nunca en código que llegue al navegador.
- **Nunca commitees el archivo `.env`.** Ya está en `.gitignore`; solo
  `.env.example` (con valores de ejemplo, no reales) debe subirse al repo.
- **El rol de administrador vive en `app_metadata`, no en `user_metadata`.**
  `app_metadata` solo puede modificarse con la `service_role` key (por eso
  `set-admin-role.sql` se corre desde el SQL Editor de Supabase, no desde la
  app) — un usuario nunca puede auto-otorgarse el rol admin editando su propio
  perfil.
- **El JWT de sesión nunca se guarda manualmente** en `localStorage` ni
  `sessionStorage` desde el código de la app; se accede siempre vía
  `supabase.auth.getSession()` (ver `lib/auth.js`), delegando la persistencia
  al SDK oficial de Supabase.
- Si sospechas que la `anon key` o cualquier credencial se filtró de forma
  anómala (por ejemplo, junto con la `service_role` key en un commit), **rota
  las claves desde Project Settings > API** en Supabase de inmediato.
