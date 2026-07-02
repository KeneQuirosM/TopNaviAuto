import { signIn, isAdmin, signOut } from '@/auth.js';

const AdminLoginModule = (() => {
  const SELECTORS = {
    form: '[data-js="login-form"]',
    email: '[data-js="login-email"]',
    password: '[data-js="login-password"]',
    submit: '[data-js="login-submit"]',
    error: '[data-js="login-error"]',
  };

  const DASHBOARD_URL = '/admin/dashboard.html';

  function showError(message) {
    const errorEl = document.querySelector(SELECTORS.error);
    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.classList.remove('is-hidden');
  }

  function clearError() {
    const errorEl = document.querySelector(SELECTORS.error);
    if (!errorEl) return;

    errorEl.textContent = '';
    errorEl.classList.add('is-hidden');
  }

  function setSubmitting(button, isSubmitting) {
    button.disabled = isSubmitting;
    button.classList.toggle('btn--loading', isSubmitting);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn = document.querySelector(SELECTORS.submit);
    const emailField = document.querySelector(SELECTORS.email);
    const passwordField = document.querySelector(SELECTORS.password);

    clearError();

    const email = emailField.value.trim();
    const password = passwordField.value;

    if (!email || !password) {
      showError('Ingresa tu correo y contraseña.');
      return;
    }

    setSubmitting(submitBtn, true);

    try {
      const { session } = await signIn(email, password);

      if (!isAdmin(session)) {
        await signOut().catch(() => {});
        showError('Esta cuenta no tiene permisos de administrador.');
        return;
      }

      window.location.href = DASHBOARD_URL;
    } catch (error) {
      console.error('[admin-login.handleSubmit]', error);
      showError('Correo o contraseña incorrectos.');
    } finally {
      setSubmitting(submitBtn, false);
    }
  }

  function init() {
    const form = document.querySelector(SELECTORS.form);
    if (!form) return;

    form.addEventListener('submit', handleSubmit);
  }

  init();

  return { init };
})();

export default AdminLoginModule;
