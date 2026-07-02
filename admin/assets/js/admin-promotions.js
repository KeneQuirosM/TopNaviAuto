import { PromotionsAPI, ProductsAPI } from '@/api.js';
import { validatePromotion } from '@/validators.js';
import { showToast } from './admin-main.js';

const AdminPromotionsModule = (() => {
  const SELECTORS = {
    tableBody: '[data-js="promotions-table-body"]',
    openPromotionForm: '[data-js="open-promotion-form"]',
    closePromotionForm: '[data-js="close-promotion-form"]',
    promotionModal: '[data-js="promotion-modal"]',
    modalTitle: '[data-js="promotion-modal-title"]',
    promotionForm: '[data-js="promotion-form"]',
    saveButton: '[data-js="save-promotion"]',
    confirmModal: '[data-js="confirm-modal"]',
    confirmMessage: '[data-js="confirm-modal-message"]',
    confirmAccept: '[data-js="confirm-modal-accept"]',
    confirmCancel: '[data-js="confirm-modal-cancel"]',
  };

  const FIELD_SELECTORS = {
    title: '[data-js="promotion-title"]',
    description: '[data-js="promotion-description"]',
    discount: '[data-js="promotion-discount"]',
    product: '[data-js="promotion-product"]',
    startsAt: '[data-js="promotion-starts-at"]',
    endsAt: '[data-js="promotion-ends-at"]',
    ctaText: '[data-js="promotion-cta-text"]',
    showCountdown: '[data-js="promotion-show-countdown"]',
  };

  const STATUS_BADGE_CLASS = {
    VIGENTE: 'status-badge--live',
    VENCIDA: 'status-badge--inactive',
    PRÓXIMA: 'status-badge--upcoming',
  };

  const dateFormatter = new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  let _promotions = [];
  let _products = [];
  let _editingId = null;

  function getField(name) {
    return document.querySelector(FIELD_SELECTORS[name]);
  }

  function openModal(selector) {
    const modal = document.querySelector(selector);
    if (modal) modal.classList.remove('is-hidden');
  }

  function closeModal(selector) {
    const modal = document.querySelector(selector);
    if (modal) modal.classList.add('is-hidden');
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function getPromotionStatus(promo) {
    const now = Date.now();
    const startsAt = new Date(promo.starts_at).getTime();
    const endsAt = new Date(promo.ends_at).getTime();

    if (endsAt < now) return 'VENCIDA';
    if (startsAt > now) return 'PRÓXIMA';
    return 'VIGENTE';
  }

  function findProductName(productId) {
    if (!productId) return 'Global';
    const product = _products.find((item) => item.id === productId);
    return product ? product.name : 'Global';
  }

  function buildPromotionStatusBadge(promo) {
    const status = getPromotionStatus(promo);
    const badge = document.createElement('span');
    badge.className = `status-badge ${STATUS_BADGE_CLASS[status]}`;
    badge.textContent = status;
    return badge;
  }

  function buildActionsCell(promo) {
    const wrapper = document.createElement('div');
    wrapper.className = 'data-table__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'admin-btn admin-btn--ghost admin-btn--sm';
    editBtn.dataset.js = 'edit-promotion';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => openEditForm(promo));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'admin-btn admin-btn--danger admin-btn--sm';
    deleteBtn.dataset.js = 'delete-promotion';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', () => handleDelete(promo.id));

    wrapper.appendChild(editBtn);
    wrapper.appendChild(deleteBtn);
    return wrapper;
  }

  function buildPromotionRow(promo, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 1 ? 'data-table__row data-table__row--alt' : 'data-table__row';

    const titleCell = document.createElement('td');
    titleCell.className = 'data-table__cell';
    titleCell.textContent = promo.title;

    const productCell = document.createElement('td');
    productCell.className = 'data-table__cell';
    productCell.textContent = findProductName(promo.product_id);

    const discountCell = document.createElement('td');
    discountCell.className = 'data-table__cell';
    discountCell.textContent = `${promo.discount_pct}%`;

    const startsCell = document.createElement('td');
    startsCell.className = 'data-table__cell';
    startsCell.textContent = dateFormatter.format(new Date(promo.starts_at));

    const endsCell = document.createElement('td');
    endsCell.className = 'data-table__cell';
    endsCell.textContent = dateFormatter.format(new Date(promo.ends_at));

    const statusCell = document.createElement('td');
    statusCell.className = 'data-table__cell';
    statusCell.appendChild(buildPromotionStatusBadge(promo));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'data-table__cell';
    actionsCell.appendChild(buildActionsCell(promo));

    row.appendChild(titleCell);
    row.appendChild(productCell);
    row.appendChild(discountCell);
    row.appendChild(startsCell);
    row.appendChild(endsCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
  }

  function renderTable() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (!tbody) return;

    clearNode(tbody);

    if (_promotions.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.className = 'data-table__cell';
      emptyCell.colSpan = 7;
      emptyCell.textContent = 'No hay promociones registradas todavía.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      _promotions.forEach((promo, index) => {
        tbody.appendChild(buildPromotionRow(promo, index));
      });
    }
  }

  function renderLoadError() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (!tbody) return;

    clearNode(tbody);
    const errorRow = document.createElement('tr');
    const errorCell = document.createElement('td');
    errorCell.className = 'data-table__cell';
    errorCell.colSpan = 7;
    errorCell.setAttribute('role', 'alert');
    errorCell.textContent = 'No pudimos cargar las promociones. Intenta de nuevo más tarde.';
    errorRow.appendChild(errorCell);
    tbody.appendChild(errorRow);
  }

  async function loadPromotions() {
    try {
      const [promotions, products] = await Promise.all([PromotionsAPI.getAll(), ProductsAPI.getActive()]);
      _promotions = promotions;
      _products = products;
      renderTable();
    } catch (error) {
      console.error('[admin-promotions.loadPromotions]', error);
      showToast('No pudimos cargar las promociones.', 'error');
      renderLoadError();
    }
  }

  function populateProductSelect(selectedProductId) {
    const select = getField('product');
    if (!select) return;

    clearNode(select);

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'Aplica a todos los productos';
    select.appendChild(noneOption);

    _products.forEach((product) => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      select.appendChild(option);
    });

    select.value = selectedProductId || '';
  }

  function toDatetimeLocalValue(dateInput) {
    const date = new Date(dateInput);
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function resetForm() {
    getField('title').value = '';
    getField('description').value = '';
    getField('discount').value = '';
    getField('startsAt').value = '';
    getField('startsAt').min = '';
    getField('endsAt').value = '';
    getField('ctaText').value = '';
    getField('showCountdown').checked = false;
    populateProductSelect('');
  }

  function openCreateForm() {
    resetForm();
    _editingId = null;

    const title = document.querySelector(SELECTORS.modalTitle);
    if (title) title.textContent = 'Agregar promoción';

    getField('startsAt').min = toDatetimeLocalValue(new Date());

    openModal(SELECTORS.promotionModal);
  }

  function openEditForm(promo) {
    resetForm();
    _editingId = promo.id;

    const title = document.querySelector(SELECTORS.modalTitle);
    if (title) title.textContent = 'Editar promoción';

    getField('title').value = promo.title || '';
    getField('description').value = promo.description || '';
    getField('discount').value = promo.discount_pct ?? '';
    getField('startsAt').value = toDatetimeLocalValue(promo.starts_at);
    getField('endsAt').value = toDatetimeLocalValue(promo.ends_at);
    getField('ctaText').value = promo.cta_text || '';
    getField('showCountdown').checked = Boolean(promo.show_countdown);
    populateProductSelect(promo.product_id);

    openModal(SELECTORS.promotionModal);
  }

  function showConfirm(message, onAccept) {
    const messageEl = document.querySelector(SELECTORS.confirmMessage);
    const acceptBtn = document.querySelector(SELECTORS.confirmAccept);
    const cancelBtn = document.querySelector(SELECTORS.confirmCancel);
    if (!acceptBtn || !cancelBtn) return;

    if (messageEl) messageEl.textContent = message;

    function cleanup() {
      acceptBtn.removeEventListener('click', onAcceptHandler);
      cancelBtn.removeEventListener('click', onCancelHandler);
      closeModal(SELECTORS.confirmModal);
    }

    function onAcceptHandler() {
      cleanup();
      onAccept();
    }

    function onCancelHandler() {
      cleanup();
    }

    acceptBtn.addEventListener('click', onAcceptHandler);
    cancelBtn.addEventListener('click', onCancelHandler);

    openModal(SELECTORS.confirmModal);
  }

  function handleDelete(id) {
    showConfirm(
      'Esta acción no se puede deshacer. ¿Seguro que deseas eliminar esta promoción?',
      async () => {
        try {
          await PromotionsAPI.deleteById(id);
          showToast('Promoción eliminada', 'success');
          await loadPromotions();
        } catch (error) {
          console.error('[admin-promotions.handleDelete]', error);
          showToast(error.message, 'error');
        }
      }
    );
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.querySelector(SELECTORS.saveButton);

    const startsAtValue = getField('startsAt').value;
    const endsAtValue = getField('endsAt').value;

    const data = {
      title: getField('title').value.trim(),
      description: getField('description').value.trim(),
      discount_pct: Number(getField('discount').value),
      product_id: getField('product').value || null,
      starts_at: startsAtValue ? new Date(startsAtValue).toISOString() : '',
      ends_at: endsAtValue ? new Date(endsAtValue).toISOString() : '',
      cta_text: getField('ctaText').value.trim() || null,
      show_countdown: getField('showCountdown').checked,
      is_active: true,
    };

    const { valid, error } = validatePromotion(data);
    if (!valid) {
      showToast(error, 'error');
      return;
    }

    submitBtn.disabled = true;

    try {
      if (_editingId === null) {
        await PromotionsAPI.create(data);
      } else {
        await PromotionsAPI.update(_editingId, data);
      }

      showToast('Promoción guardada', 'success');
      closeModal(SELECTORS.promotionModal);
      await loadPromotions();
    } catch (submitError) {
      console.error('[admin-promotions.handleFormSubmit]', submitError);
      showToast(submitError.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  function init() {
    const openBtn = document.querySelector(SELECTORS.openPromotionForm);
    if (!openBtn) return;

    openBtn.addEventListener('click', openCreateForm);

    const closeBtn = document.querySelector(SELECTORS.closePromotionForm);
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(SELECTORS.promotionModal));

    const form = document.querySelector(SELECTORS.promotionForm);
    if (form) form.addEventListener('submit', handleFormSubmit);

    loadPromotions();
  }

  init();

  return { init };
})();

export default AdminPromotionsModule;
