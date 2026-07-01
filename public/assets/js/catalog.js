import { ProductsAPI } from '@/api.js';
import { UI } from './ui.js';

const CatalogModule = (() => {
  const GRID_SELECTOR = '[data-js="catalog-grid"]';
  const SKELETON_COUNT = 3;
  const PLACEHOLDER_IMAGE = '/public/assets/img/placeholder.webp';
  const BADGE_LABELS = { new: 'Nuevo', bestseller: 'Best seller' };
  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  function clearGrid(grid) {
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
  }

  function renderSkeletons(grid) {
    clearGrid(grid);

    for (let i = 0; i < SKELETON_COUNT; i += 1) {
      const card = UI.createElement('article', 'product-card product-card--skeleton');
      card.setAttribute('aria-hidden', 'true');

      const image = UI.createElement('div', 'product-card__image');
      const body = UI.createElement('div', 'product-card__body');
      const name = UI.createElement('p', 'product-card__name');
      const price = UI.createElement('p', 'product-card__price');

      body.appendChild(name);
      body.appendChild(price);
      card.appendChild(image);
      card.appendChild(body);
      grid.appendChild(card);
    }
  }

  function renderMessage(grid, message) {
    clearGrid(grid);
    const messageEl = UI.createElement('p', 'catalog-section__message', message);
    messageEl.setAttribute('role', 'alert');
    grid.appendChild(messageEl);
  }

  function buildBadge(badgeKey) {
    const isKnownBadge = Object.prototype.hasOwnProperty.call(BADGE_LABELS, badgeKey);
    const modifier = isKnownBadge ? badgeKey : 'new';
    const label = isKnownBadge ? BADGE_LABELS[badgeKey] : badgeKey;
    return UI.createElement('span', `product-card__badge badge badge--${modifier}`, label);
  }

  function buildProductCard(product) {
    const card = UI.createElement('article', 'product-card reveal');
    card.setAttribute('data-js', 'reveal');

    const imageWrap = UI.createElement('div', 'product-card__image');

    if (product.badge) {
      imageWrap.appendChild(buildBadge(product.badge));
    }

    const img = document.createElement('img');
    img.src = product.image_url;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener(
      'error',
      () => {
        img.src = PLACEHOLDER_IMAGE;
      },
      { once: true }
    );
    imageWrap.appendChild(img);

    const body = UI.createElement('div', 'product-card__body');
    const name = UI.createElement('h3', 'product-card__name', product.name);
    const price = UI.createElement('p', 'product-card__price', currencyFormatter.format(product.price));

    body.appendChild(name);
    body.appendChild(price);

    if (Array.isArray(product.tags) && product.tags.length > 0) {
      const tagsWrap = UI.createElement('div', 'product-card__tags');
      product.tags.forEach((tag) => {
        tagsWrap.appendChild(UI.createElement('span', 'tag', tag));
      });
      body.appendChild(tagsWrap);
    }

    card.appendChild(imageWrap);
    card.appendChild(body);

    return card;
  }

  async function init() {
    const grid = UI.qs(GRID_SELECTOR);
    if (!grid) return;

    renderSkeletons(grid);

    try {
      const products = await ProductsAPI.getActive();
      clearGrid(grid);

      if (!products || products.length === 0) {
        renderMessage(grid, 'No hay productos disponibles en este momento.');
        return;
      }

      products.forEach((product) => {
        grid.appendChild(buildProductCard(product));
      });
    } catch (error) {
      console.error('[catalog.init]', error);
      renderMessage(grid, 'No pudimos cargar el catálogo. Intenta de nuevo más tarde.');
    }
  }

  return { init };
})();

export default CatalogModule;
