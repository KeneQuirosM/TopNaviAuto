import { ContactAPI } from '@/api.js';
import { showToast } from './admin-main.js';

const AdminContactsModule = (() => {
  const MESSAGE_TRUNCATE_LENGTH = 60;

  const SELECTORS = {
    tableBody: '[data-js="contacts-table-body"]',
    filters: '[data-js="contacts-filter"]',
  };

  const STATUS_LABELS = {
    pending: 'Pendiente',
    read: 'Leído',
    replied: 'Respondido',
  };

  const INQUIRY_TYPE_LABELS = {
    general: 'Consulta general',
    cotizacion: 'Cotización',
    distribuidor: 'Distribuidor',
    garantia: 'Garantía/Soporte',
  };

  const dateFormatter = new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let _contacts = [];
  const _rowRefs = new Map();

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}…`;
  }

  function buildStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `status-badge status-badge--${status}`;
    badge.textContent = STATUS_LABELS[status] || status;
    return badge;
  }

  function buildActionsCell(contact) {
    const wrapper = document.createElement('div');
    wrapper.className = 'data-table__actions';

    if (contact.status === 'pending') {
      const readBtn = document.createElement('button');
      readBtn.type = 'button';
      readBtn.className = 'admin-btn admin-btn--ghost admin-btn--sm';
      readBtn.dataset.js = 'mark-read';
      readBtn.textContent = 'Marcar como leído';
      readBtn.addEventListener('click', () => handleUpdateStatus(contact.id, 'read'));
      wrapper.appendChild(readBtn);
    }

    if (contact.status !== 'replied') {
      const repliedBtn = document.createElement('button');
      repliedBtn.type = 'button';
      repliedBtn.className = 'admin-btn admin-btn--ghost admin-btn--sm';
      repliedBtn.dataset.js = 'mark-replied';
      repliedBtn.textContent = 'Marcar como respondido';
      repliedBtn.addEventListener('click', () => handleUpdateStatus(contact.id, 'replied'));
      wrapper.appendChild(repliedBtn);
    }

    return wrapper;
  }

  function buildContactRow(contact, index) {
    const row = document.createElement('tr');
    row.className = index % 2 === 1 ? 'data-table__row data-table__row--alt' : 'data-table__row';

    const nameCell = document.createElement('td');
    nameCell.className = 'data-table__cell';
    nameCell.textContent = contact.name;

    const phoneCell = document.createElement('td');
    phoneCell.className = 'data-table__cell';
    phoneCell.textContent = contact.phone;

    const typeCell = document.createElement('td');
    typeCell.className = 'data-table__cell';
    typeCell.textContent = INQUIRY_TYPE_LABELS[contact.inquiry_type] || contact.inquiry_type || '—';

    const vehicleCell = document.createElement('td');
    vehicleCell.className = 'data-table__cell';
    vehicleCell.textContent = contact.vehicle_model || '—';

    const messageCell = document.createElement('td');
    messageCell.className = 'data-table__cell';
    const messageText = contact.message || '';
    messageCell.textContent = truncateText(messageText, MESSAGE_TRUNCATE_LENGTH);
    messageCell.setAttribute('title', messageText);

    const statusCell = document.createElement('td');
    statusCell.className = 'data-table__cell';
    statusCell.appendChild(buildStatusBadge(contact.status));

    const dateCell = document.createElement('td');
    dateCell.className = 'data-table__cell';
    dateCell.textContent = dateFormatter.format(new Date(contact.created_at));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'data-table__cell';
    actionsCell.appendChild(buildActionsCell(contact));

    row.appendChild(nameCell);
    row.appendChild(phoneCell);
    row.appendChild(typeCell);
    row.appendChild(vehicleCell);
    row.appendChild(messageCell);
    row.appendChild(statusCell);
    row.appendChild(dateCell);
    row.appendChild(actionsCell);

    _rowRefs.set(contact.id, { statusCell, actionsCell });

    return row;
  }

  function renderTable() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (!tbody) return;

    clearNode(tbody);
    _rowRefs.clear();

    if (_contacts.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.className = 'data-table__cell';
      emptyCell.colSpan = 8;
      emptyCell.textContent = 'No hay solicitudes registradas para este filtro.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      _contacts.forEach((contact, index) => {
        tbody.appendChild(buildContactRow(contact, index));
      });
    }
  }

  function renderLoadError() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (!tbody) return;

    clearNode(tbody);
    _rowRefs.clear();

    const errorRow = document.createElement('tr');
    const errorCell = document.createElement('td');
    errorCell.className = 'data-table__cell';
    errorCell.colSpan = 8;
    errorCell.setAttribute('role', 'alert');
    errorCell.textContent = 'No pudimos cargar las solicitudes de contacto. Intenta de nuevo más tarde.';
    errorRow.appendChild(errorCell);
    tbody.appendChild(errorRow);
  }

  async function loadContacts(filter = 'all') {
    try {
      const contacts = await ContactAPI.getAll();
      _contacts = filter === 'all' ? contacts : contacts.filter((contact) => contact.status === filter);
      renderTable();
    } catch (error) {
      console.error('[admin-contacts.loadContacts]', error);
      showToast('No pudimos cargar las solicitudes de contacto.', 'error');
      renderLoadError();
    }
  }

  async function handleUpdateStatus(id, newStatus) {
    try {
      await ContactAPI.updateStatus(id, newStatus);

      const contact = _contacts.find((item) => item.id === id);
      if (contact) contact.status = newStatus;

      const refs = _rowRefs.get(id);
      if (contact && refs) {
        clearNode(refs.statusCell);
        refs.statusCell.appendChild(buildStatusBadge(contact.status));

        clearNode(refs.actionsCell);
        refs.actionsCell.appendChild(buildActionsCell(contact));
      }

      showToast('Estado actualizado', 'success');
    } catch (error) {
      console.error('[admin-contacts.handleUpdateStatus]', error);
      showToast(error.message, 'error');
    }
  }

  function initFilters() {
    const buttons = document.querySelectorAll(SELECTORS.filters);

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');
        loadContacts(button.dataset.filter);
      });
    });
  }

  function init() {
    const tbody = document.querySelector(SELECTORS.tableBody);
    if (!tbody) return;

    initFilters();
    loadContacts('all');
  }

  init();

  return { init };
})();

export default AdminContactsModule;
