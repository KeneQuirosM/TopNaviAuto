-- ============================================================================
-- TOP NAVI AUTO — Esquema completo de Supabase
-- ============================================================================
-- Ejecutar de una sola vez en el SQL Editor de Supabase (Project > SQL Editor).
-- El script es seguro de re-ejecutar: usa IF NOT EXISTS / OR REPLACE / DROP...
-- IF EXISTS antes de crear políticas y triggers.
--
-- NOTA IMPORTANTE sobre roles de administrador:
-- Las policies de este archivo verifican el rol de administrador leyendo
--   auth.jwt() -> 'app_metadata' ->> 'role'
-- y NO
--   auth.jwt() ->> 'role'
-- Esta segunda forma es un error común: el claim top-level "role" del JWT de
-- Supabase es el rol de Postgres (siempre 'authenticated' o 'anon'), no tu
-- claim personalizado. Usar auth.jwt()->>'role' dejaría el panel admin sin
-- poder escribir NUNCA, incluso después de correr set-admin-role.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLA: products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  name         TEXT NOT NULL,
  model_code   TEXT NOT NULL UNIQUE,
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  category     TEXT NOT NULL,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  image_url    TEXT,
  image_path   TEXT,
  -- 'new' / 'bestseller' coinciden con los valores reales que envía
  -- admin/products.html (select "Badge") y que consume public catalog.js
  -- para mapear a las etiquetas visuales "Nuevo" / "Best seller".
  badge        TEXT CHECK (badge IN ('new', 'bestseller') OR badge IS NULL),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  stock        INTEGER DEFAULT 0 CHECK (stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);

-- ----------------------------------------------------------------------------
-- 3. TABLA: promotions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  title           TEXT NOT NULL,
  description     TEXT,
  discount_pct    INTEGER CHECK (discount_pct BETWEEN 0 AND 100),
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  show_countdown  BOOLEAN NOT NULL DEFAULT true,
  -- Texto del botón CTA del banner (admin/promotions.html: campo "Texto CTA").
  cta_text        TEXT NOT NULL DEFAULT 'Ver oferta',
  -- URL opcional a la que apunta el CTA del banner público
  -- (public/assets/js/promotions.js lee promotion.cta_url; si es NULL cae al
  -- href por defecto "#promociones").
  cta_url         TEXT,
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_promotions_is_active_dates
  ON public.promotions (is_active, starts_at, ends_at);

-- ----------------------------------------------------------------------------
-- 4. TABLA: compatibility
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compatibility (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand       TEXT NOT NULL UNIQUE,
  models      TEXT[] NOT NULL DEFAULT '{}',
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: contact_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  -- Coincide con las <option value="..."> reales del formulario público
  -- (index.html #contact-inquiry-type).
  inquiry_type   TEXT NOT NULL CHECK (
                   inquiry_type IN ('general', 'cotizacion', 'distribuidor', 'garantia')
                 ),
  vehicle_model  TEXT,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied')),
  ip_hash        TEXT
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests (status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_ip_hash_created_at
  ON public.contact_requests (ip_hash, created_at);

-- ----------------------------------------------------------------------------
-- 6. TRIGGER: auto-actualizar updated_at en products
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 7. FUNCIÓN: rate limiting de contacto
-- ----------------------------------------------------------------------------
-- Retorna TRUE si p_ip_hash TODAVÍA PUEDE enviar una nueva solicitud (no ha
-- superado 3 envíos en los últimos 10 minutos); FALSE si debe bloquearse.
-- SECURITY DEFINER: el remitente anónimo solo tiene permiso de INSERT sobre
-- contact_requests (ver policy "public_insert" más abajo), así que la función
-- necesita privilegios elevados para poder contar filas existentes.
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit(p_ip_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM public.contact_requests
  WHERE ip_hash = p_ip_hash
    AND created_at >= now() - INTERVAL '10 minutes';

  RETURN recent_count < 3;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- products ---------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active" ON public.products;
CREATE POLICY "public_read_active" ON public.products
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "admin_all" ON public.products;
CREATE POLICY "admin_all" ON public.products
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- promotions ---------------------------------------------------------------
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active" ON public.promotions;
CREATE POLICY "public_read_active" ON public.promotions
  FOR SELECT
  TO anon
  USING (is_active = true AND starts_at <= now() AND ends_at >= now());

DROP POLICY IF EXISTS "admin_all" ON public.promotions;
CREATE POLICY "admin_all" ON public.promotions
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- compatibility --------------------------------------------------------------
ALTER TABLE public.compatibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON public.compatibility;
CREATE POLICY "public_read" ON public.compatibility
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "admin_all" ON public.compatibility;
CREATE POLICY "admin_all" ON public.compatibility
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- contact_requests -------------------------------------------------------
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert" ON public.contact_requests;
CREATE POLICY "public_insert" ON public.contact_requests
  FOR INSERT
  TO anon
  WITH CHECK (ip_hash IS NULL OR public.check_contact_rate_limit(ip_hash));

DROP POLICY IF EXISTS "admin_read" ON public.contact_requests;
CREATE POLICY "admin_read" ON public.contact_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "admin_update" ON public.contact_requests;
CREATE POLICY "admin_update" ON public.contact_requests
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 9. STORAGE BUCKET: product-images
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- storage.objects ya tiene RLS activado por defecto en Supabase.
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "admin_upload_product_images" ON storage.objects;
CREATE POLICY "admin_upload_product_images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- uploadProductImage() en lib/storage.js sube con { upsert: true }, lo que
-- requiere permiso de UPDATE además de INSERT.
DROP POLICY IF EXISTS "admin_update_product_images" ON storage.objects;
CREATE POLICY "admin_update_product_images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "admin_delete_product_images" ON storage.objects;
CREATE POLICY "admin_delete_product_images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- 10. DATOS INICIALES (seed)
-- ----------------------------------------------------------------------------

-- Productos de ejemplo (IDs fijos para poder referenciarlos desde promotions).
INSERT INTO public.products (id, name, model_code, description, price, category, tags, badge, is_active, sort_order, stock)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'TN-9 Pro Android 13',
    'TN-9-PRO',
    'Pantalla Android 13 de 9 pulgadas con procesador octa-core, CarPlay/Android Auto inalámbrico y GPS integrado.',
    189.99,
    'android',
    ARRAY['CarPlay', 'Android Auto', 'GPS', '4G'],
    'new',
    true,
    1,
    25
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'TN-7 GPS CarPlay',
    'TN-7-GPS',
    'Pantalla de 7 pulgadas con CarPlay inalámbrico y navegación GPS integrada, ideal para instalación universal.',
    149.99,
    'carplay',
    ARRAY['CarPlay', 'GPS'],
    NULL,
    true,
    2,
    40
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'TN-10 Ultra QLED',
    'TN-10-ULTRA',
    'Pantalla QLED de 10.1 pulgadas de alta definición, la más vendida de la línea TOP NAVI, con cámara de reversa incluida.',
    249.99,
    'android',
    ARRAY['CarPlay', 'Android Auto', 'GPS', '4G', 'Cámara'],
    'bestseller',
    true,
    0,
    15
  )
ON CONFLICT (id) DO NOTHING;

-- Compatibilidad de marcas.
INSERT INTO public.compatibility (brand, models)
VALUES
  ('Toyota', ARRAY['Corolla', 'Hilux', 'RAV4', 'Yaris', 'Land Cruiser']),
  ('Hyundai', ARRAY['Tucson', 'Elantra', 'Santa Fe', 'Accent', 'Creta']),
  ('KIA', ARRAY['Rio', 'Sportage', 'Sorento', 'Picanto', 'Soul']),
  ('Nissan', ARRAY['Sentra', 'Versa', 'X-Trail', 'Frontier', 'Kicks']),
  ('Suzuki', ARRAY['Swift', 'Vitara', 'Grand Vitara', 'Baleno']),
  ('Honda', ARRAY['Civic', 'CR-V', 'HR-V', 'Fit', 'Accord']),
  ('Mitsubishi', ARRAY['Montero Sport', 'L200', 'Outlander', 'Mirage']),
  ('Mazda', ARRAY['Mazda 3', 'CX-5', 'CX-30', 'BT-50']),
  ('Ford', ARRAY['Ranger', 'Escape', 'EcoSport', 'Explorer'])
ON CONFLICT (brand) DO NOTHING;

-- Promoción de ejemplo, vigente por 7 días desde que se ejecuta este script.
INSERT INTO public.promotions (title, description, discount_pct, product_id, starts_at, ends_at, is_active, show_countdown, cta_text)
VALUES (
  'Lanzamiento TN-9 Pro',
  'Aprovecha un descuento especial de lanzamiento en la nueva TN-9 Pro Android 13, disponible por tiempo limitado.',
  20,
  '11111111-1111-1111-1111-111111111111',
  now(),
  now() + INTERVAL '7 days',
  true,
  true,
  'Aprovechar oferta'
);
