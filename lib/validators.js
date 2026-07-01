const PRODUCT_NAME_MAX = 100;
const MODEL_CODE_MAX = 50;
const MODEL_CODE_PATTERN = /^[a-zA-Z0-9-]+$/;
const CONTACT_NAME_MAX = 80;
const MESSAGE_MAX = 500;
const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;

const HTML_ENTITIES = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
};

export function validateProduct(data) {
  if (!data?.name?.trim()) {
    return { valid: false, error: '[validators.validateProduct] El nombre es requerido.' };
  }

  if (data.name.length > PRODUCT_NAME_MAX) {
    return {
      valid: false,
      error: `[validators.validateProduct] El nombre no puede superar ${PRODUCT_NAME_MAX} caracteres.`,
    };
  }

  if (!data.model_code?.trim()) {
    return { valid: false, error: '[validators.validateProduct] El código de modelo es requerido.' };
  }

  if (data.model_code.length > MODEL_CODE_MAX) {
    return {
      valid: false,
      error: `[validators.validateProduct] El código de modelo no puede superar ${MODEL_CODE_MAX} caracteres.`,
    };
  }

  if (!MODEL_CODE_PATTERN.test(data.model_code)) {
    return {
      valid: false,
      error: '[validators.validateProduct] El código de modelo solo admite letras, números y guiones.',
    };
  }

  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    return { valid: false, error: '[validators.validateProduct] El precio debe ser un número positivo.' };
  }

  if (!data.category?.trim()) {
    return { valid: false, error: '[validators.validateProduct] La categoría es requerida.' };
  }

  return { valid: true, error: null };
}

export function validatePromotion(data) {
  if (!data?.title?.trim()) {
    return { valid: false, error: '[validators.validatePromotion] El título es requerido.' };
  }

  const startsAt = new Date(data.starts_at);
  const endsAt = new Date(data.ends_at);

  if (Number.isNaN(startsAt.getTime())) {
    return { valid: false, error: '[validators.validatePromotion] La fecha de inicio no es válida.' };
  }

  if (Number.isNaN(endsAt.getTime())) {
    return { valid: false, error: '[validators.validatePromotion] La fecha de fin no es válida.' };
  }

  if (endsAt <= startsAt) {
    return {
      valid: false,
      error: '[validators.validatePromotion] La fecha de fin debe ser posterior a la fecha de inicio.',
    };
  }

  const discountPct = Number(data.discount_pct);
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    return { valid: false, error: '[validators.validatePromotion] El descuento debe estar entre 0 y 100.' };
  }

  return { valid: true, error: null };
}

export function validateContactForm(data) {
  if (!data?.name?.trim()) {
    return { valid: false, error: '[validators.validateContactForm] El nombre es requerido.' };
  }

  if (data.name.length > CONTACT_NAME_MAX) {
    return {
      valid: false,
      error: `[validators.validateContactForm] El nombre no puede superar ${CONTACT_NAME_MAX} caracteres.`,
    };
  }

  if (!data.phone?.trim()) {
    return { valid: false, error: '[validators.validateContactForm] El teléfono es requerido.' };
  }

  if (!PHONE_PATTERN.test(data.phone.trim())) {
    return { valid: false, error: '[validators.validateContactForm] El teléfono no tiene un formato válido.' };
  }

  if (data.message && data.message.length > MESSAGE_MAX) {
    return {
      valid: false,
      error: `[validators.validateContactForm] El mensaje no puede superar ${MESSAGE_MAX} caracteres.`,
    };
  }

  return { valid: true, error: null };
}

export function sanitizeText(str) {
  return str.trim().replace(/[<>&"']/g, (char) => HTML_ENTITIES[char]);
}
