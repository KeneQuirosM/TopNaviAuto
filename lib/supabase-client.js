import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase-client] Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // sessionStorage en vez del localStorage por defecto del SDK: la sesión
    // sigue disponible al navegar entre las páginas del admin (necesario en
    // esta app multi-página, no es una SPA), pero se borra al cerrar la
    // pestaña/navegador en vez de persistir indefinidamente en disco.
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
