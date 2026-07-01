import { ContactAPI } from '@/api.js';
import { validateContactForm, sanitizeText } from '@/validators.js';
import { UI } from './ui.js';

const ContactModule = (() => {
  const FORM_SELECTOR = '[data-js="contact-form"]';

  const FIELD_ERROR_TARGETS = {
    nombre: 'contact-name-error',
    'teléfono': 'contact-phone-error',
    mensaje: 'contact-message-error',
  };

  function computeIpHash() {
    const raw = `${Date.now()}:${navigator.userAgent}`;
    let hash = 0;

    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash).toString(16);
  }

  function clearFeedback(form) {
    Object.values(FIELD_ERROR_TARGETS).forEach((errorKey) => {
      const errorEl = UI.qs(`[data-js="${errorKey}"]`, form);
      if (errorEl) UI.setText(errorEl, '');
    });

    const feedbackEl = UI.qs('[data-js="contact-feedback"]', form);
    if (feedbackEl) UI.setText(feedbackEl, '');
  }

  function showValidationError(form, message) {
    const matchedKeyword = Object.keys(FIELD_ERROR_TARGETS).find((keyword) => message.includes(keyword));

    if (matchedKeyword) {
      const errorEl = UI.qs(`[data-js="${FIELD_ERROR_TARGETS[matchedKeyword]}"]`, form);
      if (errorEl) {
        UI.setText(errorEl, message);
        return;
      }
    }

    const feedbackEl = UI.qs('[data-js="contact-feedback"]', form);
    if (feedbackEl) UI.setText(feedbackEl, message);
  }

  function setSubmitting(button, isSubmitting) {
    button.disabled = isSubmitting;
    button.classList.toggle('btn--loading', isSubmitting);
  }

  function readFormData(form) {
    return {
      name: UI.qs('[data-js="contact-name"]', form).value.trim(),
      phone: UI.qs('[data-js="contact-phone"]', form).value.trim(),
      inquiry_type: UI.qs('[data-js="contact-inquiry-type"]', form).value,
      vehicle_model: UI.qs('[data-js="contact-vehicle-model"]', form).value.trim(),
      message: UI.qs('[data-js="contact-message"]', form).value.trim(),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = UI.qs('[data-js="contact-submit"]', form);
    const feedbackEl = UI.qs('[data-js="contact-feedback"]', form);

    clearFeedback(form);

    const formData = readFormData(form);
    const { valid, error } = validateContactForm(formData);

    if (!valid) {
      showValidationError(form, error);
      return;
    }

    setSubmitting(submitBtn, true);

    try {
      await ContactAPI.submit({
        name: sanitizeText(formData.name),
        phone: formData.phone,
        inquiry_type: formData.inquiry_type,
        vehicle_model: sanitizeText(formData.vehicle_model),
        message: sanitizeText(formData.message),
        ip_hash: computeIpHash(),
      });

      form.reset();
      if (feedbackEl) UI.setText(feedbackEl, '¡Gracias! Te contactaremos muy pronto.');
    } catch (submitError) {
      console.error('[contact.handleSubmit]', submitError);
      if (feedbackEl) {
        UI.setText(feedbackEl, 'No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos.');
      }
    } finally {
      setSubmitting(submitBtn, false);
    }
  }

  function init() {
    const form = UI.qs(FORM_SELECTOR);
    if (!form) return;

    UI.on(form, 'submit', handleSubmit);
  }

  return { init };
})();

export default ContactModule;
