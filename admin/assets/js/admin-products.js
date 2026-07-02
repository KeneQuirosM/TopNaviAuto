import { ProductsAPI } from '@/api.js';
import { validateProduct } from '@/validators.js';
import { uploadProductImage, validateImageFile } from '@/storage.js';
import { showToast } from './admin-main.js';

const AdminProductsModule = (() => {
  const PAGE_SIZE = 10;
  const PLACEHOLDER_IMAGE = '/public/assets/img/placeholder.webp';

  const SELECTORS = {
    tableBody: '[data-js="products-table-body"]',
    pagination: '[data-js="products-pagination"]',
    openProductForm: '[data-js="open-product-form"]',
    closeProductForm: '[data-js="close-product-form"]',
    productModal: '[data-js="product-modal"]',
    modalTitle: '[data-js="product-modal-title"]',
    productForm: '[data-js="product-form"]',
    saveButton: '[data-js="save-product"]',
    imageUploader: '[data-js="product-image-uploader"]',
    imageInput: '[data-js="product-image-input"]',
    imagePreview: '[data-js="product-image-preview"]',
    imagePlaceholder: '[data-js="product-image-placeholder"]',
    confirmModal: '[data-js="confirm-modal"]',
    confirmMessage: '[data-js="confirm-modal-message"]',
    confirmAccept: '[data-js="confirm-modal-accept"]',
    confirmCancel: '[data-js="confirm-modal-cancel"]',
  };

  const FIELD_SELECTORS = {
    name: '[data-js="product-name"]',
    modelCode: '[data-js="product-model-code"]',
    price: '[data-js="product-price"]',
    stock: '[data-js="product-stock"]',
    category: '[data-js="product-category"]',
    badge: '[data-js="product-badge"]',
    tags: '[data-js="product-tags"]',
    description: '[data-js="product-description"]',
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  let _products = [];
  let _editingId = null;
  let _currentPage = 1;
  let _pendingImageFile = null;
  let _previewObjectUrl = null;

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

  function buildStatusBadge(isActive) {
    const badge = document.createElement('span');
    badge.className = `status-badge ${isActive ? 'status-badge--active' : 'status-badge--inactive'}`;
    badge.textContent = isActive ? 'Activo' : 'Inactivo';
    return badge;
  }

  function buildActionsCell(product) {
    const wrapper = document.createElement('div');
    wrapper.className = 'data-table__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'admin-btn admin-btn--ghost admin-btn--sm';
    editBtn.dataset.js = 'edit-product';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => openEditForm(product));

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'admin-btn admin-btn--ghost admin-btn--sm';
    toggleBtn.dataset.js = 'toggle-product';
    toggleBtn.textContent = product.is_active ? 'Desactivar' : 'Activar';
    toggleBtn.addEventListener('click', () => handleToggleActive(product.id, product.is_active));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'admin-btn admin-btn--danger admin-btn--sm';
    deleteBtn.dataset.js = 'delete-product';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', () => handleDelete(product.id));

    wrapper.appendChild(editBtn);
    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(deleteBtn);
    return wrapper;
  }

  function buildProductRow(product, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 1 ? 'data-table__row data-table__row--alt' : 'data-table__row';

    const imageCell = document.createElement('td');
    imageCell.className = 'data-table__cell';
    const img = document.createElement('img');
    img.className = 'data-table__thumb';
    img.src = product.image_url || PLACEHOLDER_IMAGE;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener(
      'error',
      () => {
        img.src = PLACEHOLDER_IMAGE;
      },
      { once: true }
    );
    imageCell.appendChild(img);

    const nameCell = document.createElement('td');
    nameCell.className = 'data-table__cell';
    nameCell.textContent = product.name;

    const codeCell = document.createElement('td');
    codeCell.className = 'data-table__cell';
    codeCell.textContent = product.model_code;

    const priceCell = document.createElement('td');
    priceCell.className = 'data-table__cell';
    priceCell.textContent = currencyFormatter.format(product.price);

    const statusCell = document.createElement('td');
    statusCell.className = 'data-table__cell';
    statusCell.appendChild(buildStatusBadge(product.is_active));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'data-table__cell';
    actionsCell.appendChild(buildActionsCell(product));

    row.appendChild(imageCell);
    row.appendChild(nameCell);
    row.appendChild(codeCell);
    row.appendChild(priceCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
  }

  function updatePagination(totalItems) {
    const container = document.querySelector(SELECTORS.pagination);
    if (!container) return;

    clearNode(container);

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (_currentPage > totalPages) _currentPage = totalPages;

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'pagination__btn';
    prevBtn.textContent = '‹';
    prevBtn.disabled = _currentPage <= 1;
    prevBtn.addEventListener('click', () => {
      if (_currentPage > 1) {
        _currentPage -= 1;
        renderTable();
      }
    });
    container.appendChild(prevBtn);

    for (let page = 1; page <= totalPages; page += 1) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.className =
        page === _currentPage ? 'pagination__btn pagination__btn--active' : 'pagination__btn';
      pageBtn.textContent = String(page);
      pageBtn.addEventListener('click', () => {
        _currentPage = page;
        renderTable();
      });
      container.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pagination__btn';
    nextBtn.textContent = '›';
    nextBtn.disabled = _currentPage >= totalPages;
    nextBtn.addEventListener('click', () => {
      if (_currentPage < totalPages) {
        _currentPage += 1;
        renderTable();
      }
    });
    container.appendChild(nextBtn);
  }

  function renderTable() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (!tbody) return;

    clearNode(tbody);

    const start = (_currentPage - 1) * PAGE_SIZE;
    const pageItems = _products.slice(start, start + PAGE_SIZE);

    if (pageItems.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.className = 'data-table__cell';
      emptyCell.colSpan = 6;
      emptyCell.textContent = 'No hay productos registrados todavía.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      pageItems.forEach((product, index) => {
        tbody.appendChild(buildProductRow(product, index));
      });
    }

    updatePagination(_products.length);
  }

  function renderLoadError() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (tbody) {
      clearNode(tbody);
      const errorRow = document.createElement('tr');
      const errorCell = document.createElement('td');
      errorCell.className = 'data-table__cell';
      errorCell.colSpan = 6;
      errorCell.setAttribute('role', 'alert');
      errorCell.textContent = 'No pudimos cargar los productos. Intenta de nuevo más tarde.';
      errorRow.appendChild(errorCell);
      tbody.appendChild(errorRow);
    }

    const pagination = document.querySelector(SELECTORS.pagination);
    if (pagination) clearNode(pagination);
  }

  async function loadProducts() {
    try {
      _products = await ProductsAPI.getAll();
      renderTable();
    } catch (error) {
      console.error('[admin-products.loadProducts]', error);
      showToast('No pudimos cargar los productos.', 'error');
      renderLoadError();
    }
  }

  function resetForm() {
    Object.keys(FIELD_SELECTORS).forEach((key) => {
      const field = getField(key);
      if (field) field.value = '';
    });

    _pendingImageFile = null;

    if (_previewObjectUrl) {
      URL.revokeObjectURL(_previewObjectUrl);
      _previewObjectUrl = null;
    }

    const preview = document.querySelector(SELECTORS.imagePreview);
    const placeholder = document.querySelector(SELECTORS.imagePlaceholder);
    if (preview) {
      preview.src = '';
      preview.classList.add('is-hidden');
    }
    if (placeholder) placeholder.classList.remove('is-hidden');
  }

  function openCreateForm() {
    resetForm();
    _editingId = null;

    const title = document.querySelector(SELECTORS.modalTitle);
    if (title) title.textContent = 'Agregar producto';

    openModal(SELECTORS.productModal);
  }

  function openEditForm(product) {
    resetForm();
    _editingId = product.id;

    const title = document.querySelector(SELECTORS.modalTitle);
    if (title) title.textContent = 'Editar producto';

    getField('name').value = product.name || '';
    getField('modelCode').value = product.model_code || '';
    getField('price').value = product.price ?? '';
    getField('stock').value = product.stock ?? '';
    getField('category').value = product.category || '';
    getField('badge').value = product.badge || '';
    getField('tags').value = Array.isArray(product.tags) ? product.tags.join(', ') : '';
    getField('description').value = product.description || '';

    if (product.image_url) {
      const preview = document.querySelector(SELECTORS.imagePreview);
      const placeholder = document.querySelector(SELECTORS.imagePlaceholder);
      if (preview) {
        preview.src = product.image_url;
        preview.classList.remove('is-hidden');
      }
      if (placeholder) placeholder.classList.add('is-hidden');
    }

    openModal(SELECTORS.productModal);
  }

  function handleImageSelect(file) {
    const { valid, error } = validateImageFile(file);

    if (!valid) {
      showToast(error, 'error');
      return;
    }

    _pendingImageFile = file;

    if (_previewObjectUrl) {
      URL.revokeObjectURL(_previewObjectUrl);
    }
    _previewObjectUrl = URL.createObjectURL(file);

    const preview = document.querySelector(SELECTORS.imagePreview);
    const placeholder = document.querySelector(SELECTORS.imagePlaceholder);

    if (preview) {
      preview.src = _previewObjectUrl;
      preview.classList.remove('is-hidden');
    }
    if (placeholder) placeholder.classList.add('is-hidden');
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

  function handleToggleActive(id, currentState) {
    const message = currentState
      ? '¿Deseas desactivar este producto?'
      : '¿Deseas activar este producto?';

    showConfirm(message, async () => {
      try {
        await ProductsAPI.toggleActive(id, currentState);
        showToast('Estado actualizado', 'success');
        await loadProducts();
      } catch (error) {
        console.error('[admin-products.handleToggleActive]', error);
        showToast(error.message, 'error');
      }
    });
  }

  function handleDelete(id) {
    showConfirm(
      'Esta acción no se puede deshacer. ¿Seguro que deseas eliminar este producto?',
      async () => {
        try {
          await ProductsAPI.deleteById(id);
          showToast('Producto eliminado', 'success');
          await loadProducts();
        } catch (error) {
          console.error('[admin-products.handleDelete]', error);
          showToast(error.message, 'error');
        }
      }
    );
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.querySelector(SELECTORS.saveButton);

    const data = {
      name: getField('name').value.trim(),
      model_code: getField('modelCode').value.trim(),
      price: Number(getField('price').value),
      category: getField('category').value,
      stock: getField('stock').value ? Number(getField('stock').value) : null,
      badge: getField('badge').value || null,
      tags: getField('tags')
        .value.split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      description: getField('description').value.trim(),
    };

    const { valid, error } = validateProduct(data);
    if (!valid) {
      showToast(error, 'error');
      return;
    }

    submitBtn.disabled = true;

    try {
      let savedProduct;

      if (_editingId === null) {
        const [created] = await ProductsAPI.create(data);
        savedProduct = created;
      } else {
        const [updated] = await ProductsAPI.update(_editingId, data);
        savedProduct = updated;
      }

      if (_pendingImageFile && savedProduct) {
        const { url } = await uploadProductImage(_pendingImageFile, savedProduct.id);
        await ProductsAPI.update(savedProduct.id, { image_url: url });
      }

      showToast('Producto guardado', 'success');
      closeModal(SELECTORS.productModal);
      await loadProducts();
    } catch (submitError) {
      console.error('[admin-products.handleFormSubmit]', submitError);
      showToast(submitError.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  function init() {
    const openBtn = document.querySelector(SELECTORS.openProductForm);
    if (!openBtn) return;

    openBtn.addEventListener('click', openCreateForm);

    const closeBtn = document.querySelector(SELECTORS.closeProductForm);
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(SELECTORS.productModal));

    const form = document.querySelector(SELECTORS.productForm);
    if (form) form.addEventListener('submit', handleFormSubmit);

    const imageInput = document.querySelector(SELECTORS.imageInput);
    if (imageInput) {
      imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) handleImageSelect(file);
      });
    }

    loadProducts();
  }

  init();

  return { init };
})();

export default AdminProductsModule;
