import { requireAuth, signOut } from '@/auth.js';
import { ProductsAPI, PromotionsAPI, ContactAPI } from '@/api.js';

const TOAST_DURATION_MS = 3000;

export function showToast(message, type = 'success') {
  const toast = document.createElement('p');
  toast.className = `alert alert--${type} alert--toast`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, TOAST_DURATION_MS);
}

function initLogout() {
  const logoutBtn = document.querySelector('[data-js="logout-btn"]');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('[admin-main.logout]', error);
    } finally {
      window.location.href = '/admin/index.html';
    }
  });
}

function showUsername(session) {
  const usernameEl = document.querySelector('[data-js="admin-username"]');
  if (!usernameEl) return;

  const displayName = session.user?.user_metadata?.full_name || session.user?.email || 'Administrador';
  usernameEl.textContent = displayName;
}

async function loadDashboardStats() {
  const totalEl = document.querySelector('[data-js="stat-total-products"]');
  if (!totalEl) return;

  const activeEl = document.querySelector('[data-js="stat-active-products"]');
  const promotionsEl = document.querySelector('[data-js="stat-active-promotions"]');
  const contactsEl = document.querySelector('[data-js="stat-pending-contacts"]');

  try {
    const [products, promotions, contacts] = await Promise.all([
      ProductsAPI.getAll(),
      PromotionsAPI.getAll(),
      ContactAPI.getAll(),
    ]);

    const now = Date.now();
    const activeProductsCount = products.filter((product) => product.is_active).length;
    const activePromotionsCount = promotions.filter(
      (promotion) => promotion.is_active && new Date(promotion.ends_at).getTime() >= now
    ).length;
    const pendingContactsCount = contacts.filter((contact) => contact.status === 'pending').length;

    totalEl.textContent = String(products.length);
    if (activeEl) activeEl.textContent = String(activeProductsCount);
    if (promotionsEl) promotionsEl.textContent = String(activePromotionsCount);
    if (contactsEl) contactsEl.textContent = String(pendingContactsCount);
  } catch (error) {
    console.error('[admin-main.loadDashboardStats]', error);
    showToast('No pudimos cargar las estadísticas del dashboard.', 'error');
  }
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  showUsername(session);
  initLogout();
  await loadDashboardStats();
}

init();
