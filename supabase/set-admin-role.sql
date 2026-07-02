-- ============================================================================
-- TOP NAVI AUTO — Asignar rol admin a un usuario existente
-- ============================================================================
-- Prerrequisito: el usuario ya debe existir en Authentication > Users del
-- dashboard de Supabase (créalo ahí primero con su email y contraseña).
--
-- Este script actualiza su app_metadata para incluir { "role": "admin" },
-- que es exactamente lo que:
--   - lib/auth.js#isAdmin() verifica en el cliente
--     (session.user.app_metadata.role === 'admin')
--   - las policies RLS de supabase/schema.sql verifican en el servidor
--     (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
--
-- Reemplaza el email de abajo por el del usuario que quieres hacer admin.
-- ============================================================================

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@topnaviauto.com';

-- Verificación: confirma que el usuario ahora tiene el claim "role": "admin".
SELECT id, email, raw_app_meta_data
FROM auth.users
WHERE email = 'admin@topnaviauto.com';
