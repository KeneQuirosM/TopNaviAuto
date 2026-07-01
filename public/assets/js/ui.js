const UIModule = (() => {
  function qs(selector, ctx = document) {
    return ctx.querySelector(selector);
  }

  function qsa(selector, ctx = document) {
    return ctx.querySelectorAll(selector);
  }

  function on(el, event, fn) {
    el.addEventListener(event, fn);
  }

  function show(el) {
    el.classList.remove('is-hidden');
  }

  function hide(el) {
    el.classList.add('is-hidden');
  }

  function setText(el, text) {
    el.textContent = text;
  }

  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  return { qs, qsa, on, show, hide, setText, createElement };
})();

export const UI = UIModule;
export default UIModule;
