import PromotionsModule from './promotions.js';
import CatalogModule from './catalog.js';
import ContactModule from './contact.js';
import { UI } from './ui.js';

const MainModule = (() => {
  const WHATSAPP_NUMBER = '50000000000';
  const WHATSAPP_MESSAGE = 'Hola, quiero más información sobre los productos TOP NAVI AUTO.';
  const REVEAL_SELECTOR = '[data-js="reveal"]';
  const NAV_LINKS_SELECTOR = '[data-js="nav-links"]';

  function setupWhatsApp() {
    const button = UI.qs('[data-js="whatsapp-float"]');
    if (!button) return;

    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    button.setAttribute('href', `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`);
  }

  function initScrollReveal() {
    const revealEls = UI.qsa(REVEAL_SELECTOR);
    if (!revealEls.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.remove('reveal');
        entry.target.classList.add('animate-fade-in-up');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    revealEls.forEach((el) => observer.observe(el));
  }

  function initSmoothScroll() {
    const navLinksContainer = UI.qs(NAV_LINKS_SELECTOR);
    if (!navLinksContainer) return;

    const links = UI.qsa('a[href^="#"]', navLinksContainer);

    links.forEach((link) => {
      UI.on(link, 'click', (event) => {
        const targetId = link.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        event.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  async function init() {
    try {
      await PromotionsModule.init();
    } catch (error) {
      console.error('[main.init:promotions]', error);
    }

    try {
      await CatalogModule.init();
    } catch (error) {
      console.error('[main.init:catalog]', error);
    }

    try {
      ContactModule.init();
    } catch (error) {
      console.error('[main.init:contact]', error);
    }

    setupWhatsApp();
    initScrollReveal();
    initSmoothScroll();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  MainModule.init();
});

export default MainModule;
