import { supabase } from './supabase-client.js';

export const ProductsAPI = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[ProductsAPI.getAll] ${error.message}`);
    }
  },

  async getActive() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[ProductsAPI.getActive] ${error.message}`);
    }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[ProductsAPI.getById] ${error.message}`);
    }
  },

  async create(data) {
    try {
      const { data: created, error } = await supabase
        .from('products')
        .insert(data)
        .select();

      if (error) throw error;
      return created;
    } catch (error) {
      throw new Error(`[ProductsAPI.create] ${error.message}`);
    }
  },

  async update(id, data) {
    try {
      const { data: updated, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select();

      if (error) throw error;
      return updated;
    } catch (error) {
      throw new Error(`[ProductsAPI.update] ${error.message}`);
    }
  },

  async toggleActive(id, currentState) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ is_active: !currentState })
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[ProductsAPI.toggleActive] ${error.message}`);
    }
  },

  async deleteById(id) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`[ProductsAPI.deleteById] ${error.message}`);
    }
  },
};

export const PromotionsAPI = {
  async getActive() {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[PromotionsAPI.getActive] ${error.message}`);
    }
  },

  async getAll() {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[PromotionsAPI.getAll] ${error.message}`);
    }
  },

  async create(data) {
    try {
      const { data: created, error } = await supabase
        .from('promotions')
        .insert(data)
        .select();

      if (error) throw error;
      return created;
    } catch (error) {
      throw new Error(`[PromotionsAPI.create] ${error.message}`);
    }
  },

  async update(id, data) {
    try {
      const { data: updated, error } = await supabase
        .from('promotions')
        .update(data)
        .eq('id', id)
        .select();

      if (error) throw error;
      return updated;
    } catch (error) {
      throw new Error(`[PromotionsAPI.update] ${error.message}`);
    }
  },

  async deleteById(id) {
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error(`[PromotionsAPI.deleteById] ${error.message}`);
    }
  },
};

export const ContactAPI = {
  async submit(data) {
    try {
      const { name, phone, inquiry_type, vehicle_model, message, ip_hash } = data;
      const { data: created, error } = await supabase
        .from('contact_requests')
        .insert({ name, phone, inquiry_type, vehicle_model, message, ip_hash })
        .select();

      if (error) throw error;
      return created;
    } catch (error) {
      throw new Error(`[ContactAPI.submit] ${error.message}`);
    }
  },

  async getAll() {
    try {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[ContactAPI.getAll] ${error.message}`);
    }
  },

  async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('contact_requests')
        .update({ status })
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[ContactAPI.updateStatus] ${error.message}`);
    }
  },
};

export const CompatibilityAPI = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('compatibility')
        .select('*')
        .order('brand', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`[CompatibilityAPI.getAll] ${error.message}`);
    }
  },
};
