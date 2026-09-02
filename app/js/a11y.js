/* =====================================================================
   KBI — accessibility layer
   ---------------------------------------------------------------------
   The navigation is built from <div> elements, which are invisible to
   keyboard and screen-reader users. Rather than rewrite the markup (and
   risk the existing click handlers), the tab semantics are applied here:
   roles, tabindex, aria-selected, arrow-key movement and a skip link.
   ===================================================================== */
(function () {
  'use strict';

  function enhance() {
    var nav = document.querySelector('.nav-inner');
    var items = [].slice.call(document.querySelectorAll('.nav-item'));
    if (!nav || !items.length) return;

    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Dashboard sections');

    items.forEach(function (item) {
      var mod = item.dataset ? item.dataset.mod : item.getAttribute('data-mod');
      var panel = document.getElementById('mod-' + mod);
      var id = 'tab-' + mod;

      item.setAttribute('role', 'tab');
      item.id = id;
      item.setAttribute('tabindex', item.classList.contains('active') ? '0' : '-1');
      item.setAttribute('aria-selected', item.classList.contains('active') ? 'true' : 'false');

      if (panel) {
        item.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', id);
        panel.setAttribute('tabindex', '0');
      }

      // Enter and Space must activate, as they would for a real button
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          item.click();
        }
      });
    });

    // Arrow keys move between tabs, Home/End jump to the ends
    nav.addEventListener('keydown', function (e) {
      var current = document.activeElement;
      var i = items.indexOf(current);
      if (i < 0) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = items[(i + 1) % items.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = items[(i - 1 + items.length) % items.length];
      else if (e.key === 'Home') next = items[0];
      else if (e.key === 'End') next = items[items.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.click();
    });

    // keep ARIA state in step with the existing click handler
    function syncState() {
      items.forEach(function (item) {
        var on = item.classList.contains('active');
        item.setAttribute('aria-selected', on ? 'true' : 'false');
        item.setAttribute('tabindex', on ? '0' : '-1');
      });
    }
    items.forEach(function (item) {
      item.addEventListener('click', function () { setTimeout(syncState, 0); });
    });

    // skip link to the main content
    var main = document.querySelector('.main');
    if (main && !document.getElementById('kbi-skip')) {
      if (!main.id) main.id = 'kbi-main';
      var skip = document.createElement('a');
      skip.id = 'kbi-skip';
      skip.href = '#' + main.id;
      skip.textContent = 'Skip to content';
      skip.style.cssText =
        'position:absolute;left:-9999px;top:0;z-index:100;padding:8px 14px;' +
        'background:#0f172a;color:#fff;font-size:12px;border-radius:0 0 4px 0';
      skip.addEventListener('focus', function () { skip.style.left = '0'; });
      skip.addEventListener('blur', function () { skip.style.left = '-9999px'; });
      document.body.insertBefore(skip, document.body.firstChild);
    }

    // charts are decorative duplicates of the tables beneath them
    [].slice.call(document.querySelectorAll('canvas')).forEach(function (c) {
      if (!c.getAttribute('role')) {
        c.setAttribute('role', 'img');
        var card = c.closest ? c.closest('.ccard') : null;
        var title = card && card.querySelector('h3');
        c.setAttribute('aria-label', title ? title.textContent : 'Chart');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
  window.KBI = window.KBI || {};
  window.KBI.A11y = { enhance: enhance };
})();
