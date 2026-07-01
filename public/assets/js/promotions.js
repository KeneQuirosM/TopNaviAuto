import { PromotionsAPI } from '@/api.js';
import { UI } from './ui.js';

const PromotionsModule = (() => {
  const BANNER_SELECTOR = '[data-js="promo-banner"]';
  const TITLE_SELECTOR = '[data-js="promo-title"]';
  const COUNTDOWN_SELECTOR = '[data-js="promo-countdown"]';
  const CTA_SELECTOR = '[data-js="promo-cta"]';
  const DEFAULT_CTA_HREF = '#promociones';

  let intervalId = null;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function formatCountdown(msRemaining) {
    const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function stopCountdown() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function startCountdown(banner, countdownEl, endsAt) {
    const endTime = new Date(endsAt).getTime();

    function tick() {
      const remaining = endTime - Date.now();

      if (remaining <= 0) {
        stopCountdown();
        UI.hide(banner);
        return;
      }

      UI.setText(countdownEl, formatCountdown(remaining));
    }

    tick();
    intervalId = setInterval(tick, 1000);
  }

  async function init() {
    const banner = UI.qs(BANNER_SELECTOR);
    if (!banner) return;

    try {
      const promotion = await PromotionsAPI.getActive();

      if (!promotion) {
        UI.hide(banner);
        return;
      }

      const titleEl = UI.qs(TITLE_SELECTOR, banner);
      const countdownEl = UI.qs(COUNTDOWN_SELECTOR, banner);
      const ctaEl = UI.qs(CTA_SELECTOR, banner);

      if (titleEl) UI.setText(titleEl, promotion.title);
      if (ctaEl) ctaEl.setAttribute('href', promotion.cta_url || DEFAULT_CTA_HREF);
      if (countdownEl && promotion.ends_at) {
        startCountdown(banner, countdownEl, promotion.ends_at);
      }

      UI.show(banner);
    } catch (error) {
      console.error('[promotions.init]', error);
      UI.hide(banner);
    }
  }

  return { init };
})();

export default PromotionsModule;
