import { supabase } from './supabase-client.js';

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`[auth.signIn] ${error.message}`);
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    throw new Error(`[auth.signOut] ${error.message}`);
  }
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    throw new Error(`[auth.getSession] ${error.message}`);
  }
}

export function isAdmin(session) {
  return session?.user?.app_metadata?.role === 'admin';
}

export async function requireAuth() {
  const session = await getSession().catch(() => null);

  if (!session || !isAdmin(session)) {
    await signOut().catch(() => {});
    window.location.href = '/admin/index.html';
    return null;
  }

  return session;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
