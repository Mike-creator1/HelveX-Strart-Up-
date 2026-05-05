/*! CreateX — Mock interactions layer
 *  Auto-attaches realistic simulated handlers to every dead button/link/card
 *  across the platform. Existing onclick/addEventListener handlers are
 *  preserved; this only fires when nothing else is wired.
 *  Provides: cxToast, cxLoading, cxModal, cxConfirm — usable from any page.
 */
(function () {
  if (window.__cxMockInit) return;
  window.__cxMockInit = true;

  /* ── Styles ────────────────────────────────────────────────── */
  var CSS = ''
    + '.cx-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(18px);background:rgba(13,17,24,.97);border:1px solid rgba(57,245,138,.28);border-radius:12px;padding:13px 22px;font:800 13px Inter,sans-serif;color:#6dffa7;z-index:100000;backdrop-filter:blur(16px);box-shadow:0 24px 60px rgba(0,0,0,.55);opacity:0;transition:opacity .22s,transform .22s;pointer-events:none;max-width:90vw;text-align:center}'
    + '.cx-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}'
    + '.cx-toast.warn{color:#ffb347;border-color:rgba(255,179,71,.32)}'
    + '.cx-toast.err{color:#ff7a7a;border-color:rgba(255,80,80,.32)}'
    + '.cx-toast.info{color:#65efff;border-color:rgba(24,215,255,.32)}'
    + '.cx-load{position:fixed;inset:0;background:rgba(5,7,11,.72);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:99998;opacity:0;transition:.18s;pointer-events:none}'
    + '.cx-load.show{opacity:1;pointer-events:auto}'
    + '.cx-load .sp{width:46px;height:46px;border:3px solid rgba(255,255,255,.08);border-top-color:#18d7ff;border-right-color:#7c3dff;border-radius:50%;animation:cxSp .9s linear infinite}'
    + '@keyframes cxSp{to{transform:rotate(360deg)}}'
    + '.cx-load-msg{font:700 13px Inter,sans-serif;color:rgba(255,255,255,.72);letter-spacing:.01em}'
    + '.cx-modal{position:fixed;inset:0;background:rgba(0,0,0,.74);display:flex;align-items:center;justify-content:center;z-index:99997;padding:20px;opacity:0;pointer-events:none;transition:.22s;backdrop-filter:blur(6px)}'
    + '.cx-modal.show{opacity:1;pointer-events:auto}'
    + '.cx-modal-box{background:#0c0e15;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:460px;padding:26px 28px;box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04);font-family:Inter,sans-serif;animation:cxMIn .2s cubic-bezier(.16,1,.3,1)}'
    + '@keyframes cxMIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}'
    + '.cx-modal-title{font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}'
    + '.cx-modal-icon{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,rgba(24,215,255,.18),rgba(124,61,255,.14));border:1px solid rgba(24,215,255,.25);display:flex;align-items:center;justify-content:center;color:#65efff;flex-shrink:0}'
    + '.cx-modal-text{font-size:13.5px;color:rgba(255,255,255,.62);line-height:1.65;font-weight:600;margin-bottom:22px}'
    + '.cx-modal-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}'
    + '.cx-mb-1{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.72);padding:10px 18px;border-radius:9px;font:700 12.5px Inter,sans-serif;cursor:pointer;transition:.18s}'
    + '.cx-mb-1:hover{background:rgba(255,255,255,.09);color:#fff;border-color:rgba(255,255,255,.18)}'
    + '.cx-mb-2{background:linear-gradient(135deg,#19c9ff,#4d7dff,#7c3dff);background-size:190% auto;color:#fff;padding:10px 22px;border:0;border-radius:9px;font:800 12.5px Inter,sans-serif;cursor:pointer;box-shadow:0 10px 28px rgba(45,141,255,.22);transition:.22s}'
    + '.cx-mb-2:hover{background-position:right center;transform:translateY(-1px)}';

  var style = document.createElement('style');
  style.id = 'cx-mock-style';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  /* ── Toast ─────────────────────────────────────────────────── */
  function toast(msg, type) {
    var t = document.getElementById('cx-mock-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cx-mock-toast';
      t.className = 'cx-toast';
      document.body.appendChild(t);
    }
    t.className = 'cx-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('show'); });
    clearTimeout(t.__h);
    t.__h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  window.cxToast = toast;

  /* ── Loading overlay ───────────────────────────────────────── */
  function loading(msg, ms, cb) {
    var l = document.getElementById('cx-mock-load');
    if (!l) {
      l = document.createElement('div');
      l.id = 'cx-mock-load';
      l.className = 'cx-load';
      l.innerHTML = '<div class="sp"></div><div class="cx-load-msg"></div>';
      document.body.appendChild(l);
    }
    l.querySelector('.cx-load-msg').textContent = msg || 'Working…';
    l.classList.add('show');
    setTimeout(function () { l.classList.remove('show'); if (cb) cb(); }, ms || 1100);
  }
  window.cxLoading = loading;

  /* ── Modal ────────────────────────────────────────────────── */
  function modal(opts) {
    opts = opts || {};
    var m = document.getElementById('cx-mock-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'cx-mock-modal';
      m.className = 'cx-modal';
      document.body.appendChild(m);
    }
    var icon = opts.icon !== false
      ? '<span class="cx-modal-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + (opts.iconPath || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z') + '"/></svg></span>'
      : '';
    m.innerHTML =
      '<div class="cx-modal-box">'
      + '<div class="cx-modal-title">' + icon + (opts.title || 'Notice') + '</div>'
      + '<div class="cx-modal-text">' + (opts.text || '') + '</div>'
      + '<div class="cx-modal-actions">'
      + (opts.cancel === false ? '' : '<button class="cx-mb-1" id="cx-mb-cancel">' + (opts.cancelText || 'Close') + '</button>')
      + '<button class="cx-mb-2" id="cx-mb-ok">' + (opts.okText || 'Got it') + '</button>'
      + '</div></div>';
    requestAnimationFrame(function () { m.classList.add('show'); });
    var close = function () { m.classList.remove('show'); };
    m.onclick = function (e) { if (e.target === m) close(); };
    var ok = m.querySelector('#cx-mb-ok'); if (ok) ok.onclick = function () { close(); if (opts.onOk) opts.onOk(); };
    var cn = m.querySelector('#cx-mb-cancel'); if (cn) cn.onclick = function () { close(); if (opts.onCancel) opts.onCancel(); };
  }
  window.cxModal = modal;
  window.cxConfirm = function (title, text, onOk) {
    modal({ title: title, text: text, okText: 'Confirm', onOk: onOk });
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('cx-mock-modal');
      if (m && m.classList.contains('show')) m.classList.remove('show');
    }
  });

  /* ── Smart click — fires only if nothing else handles the element ── */
  function smartClick(el, e) {
    var txt = (el.textContent || '').trim();
    var lower = txt.toLowerCase();
    e.preventDefault();
    e.stopPropagation();

    if (/upgrade|subscribe|go pro|buy|purchase/i.test(lower)) {
      modal({ title: 'Upgrade to Pro', text: 'Payment processing isn\'t connected yet in this preview build. Once enabled you\'ll be able to upgrade for $29/month with unlimited generations, priority models, and team features.', okText: 'Notify me' });
    } else if (/^connect/i.test(lower) || /authorize|link account/i.test(lower)) {
      loading('Connecting…', 1100, function () { toast('Connected successfully'); el.textContent = el.textContent.replace(/connect/i, 'Disconnect'); });
    } else if (/^disconnect|unlink/i.test(lower)) {
      toast('Disconnected', 'warn'); el.textContent = el.textContent.replace(/disconnect/i, 'Connect');
    } else if (/^(save|update|apply|confirm changes)/i.test(lower)) {
      loading('Saving…', 700, function () { toast('Changes saved'); });
    } else if (/^(delete|remove|destroy|clear)/i.test(lower)) {
      window.cxConfirm('Confirm action', 'Are you sure you want to ' + lower + '? This cannot be undone.', function () { toast(txt + ' completed', 'err'); });
    } else if (/export|download/i.test(lower)) {
      loading('Preparing download…', 1000, function () { toast('Download ready'); });
    } else if (/^(send|invite|share|publish)/i.test(lower)) {
      loading('Sending…', 700, function () { toast('Sent successfully'); });
    } else if (/^(try|test|preview|demo)/i.test(lower)) {
      toast('Demo mode — preview only', 'info');
    } else if (/^(create|generate|build|launch|deploy|new)/i.test(lower)) {
      var verb = lower.split(/\s+/)[0];
      loading(verb.charAt(0).toUpperCase() + verb.slice(1) + 'ing…', 1500, function () { toast(verb.charAt(0).toUpperCase() + verb.slice(1) + ' completed'); });
    } else if (/copy/i.test(lower)) {
      toast('Copied to clipboard');
    } else if (/refresh|reload|sync|update list/i.test(lower)) {
      loading('Syncing…', 800, function () { toast('Up to date'); });
    } else if (/contact|support/i.test(lower)) {
      modal({ title: 'Contact support', text: 'Open a support ticket via the in-app help center, or email <strong>support@createx.app</strong>. Average response time under 4 hours.', okText: 'Open ticket', onOk: function () { toast('Support ticket draft opened'); } });
    } else if (/^view|^open|^manage|^configure|^edit/i.test(lower)) {
      modal({ title: txt || 'Detail view', text: 'This panel shows full details. In the production build, this opens a dedicated workspace for the selected item.', okText: 'OK' });
    } else if (/learn more|read more|docs|documentation/i.test(lower)) {
      modal({ title: 'Documentation', text: 'Full documentation lives in the CreateX docs portal. The link will be active once the docs site is published.', okText: 'OK' });
    } else if (txt) {
      toast(txt + ' — coming soon', 'info');
    } else {
      toast('Action triggered');
    }
  }

  /* ── Decide whether an element is a "dead" interactive ── */
  function shouldBind(el) {
    if (el.dataset.cxBound) return false;
    if (el.dataset.noMock) return false;
    if (el.disabled) return false;
    if (el.type === 'submit' || el.type === 'reset') return false;
    if (el.getAttribute('onclick')) return false;
    if (el.tagName === 'A') {
      var href = el.getAttribute('href') || '';
      if (href && href !== '#' && !/^javascript:/i.test(href)) return false;
    }
    /* Skip critical interactive containers */
    if (el.closest('#cx-sb-popup,.cx-sb-popup,#app-sidebar,.cx-dd,.cx-dd-menu,.composer,.ctrl-bar,.chat-area,.attach-bar,.settings-nav,.toggle-wrap,.radio-card,.swatch')) return false;
    /* Skip buttons that are children of <label> (toggle wrappers) */
    if (el.closest('label')) return false;
    /* Skip explicit framework patterns */
    if (el.closest('[data-section],[data-theme],[data-density],[data-fs],[data-accent]')) return false;
    return true;
  }

  function bindAll(root) {
    (root || document).querySelectorAll('button, a').forEach(function (el) {
      if (!shouldBind(el)) { el.dataset.cxBound = '1'; return; }
      el.dataset.cxBound = '1';
      el.addEventListener('click', function (e) { smartClick(el, e); });
    });
    /* Make placeholder cards interactive (cards with no anchor inside) */
    (root || document).querySelectorAll('.card,.feature-card,.quick-card,.plan-card,.stat-card').forEach(function (c) {
      if (c.dataset.cxBound) return;
      c.dataset.cxBound = '1';
      if (c.querySelector('button,a,input,textarea,select')) return; /* already interactive */
      c.style.cursor = 'pointer';
      c.addEventListener('click', function () {
        var t = (c.querySelector('h1,h2,h3,h4,.feature-title,.quick-card-title') || {}).textContent || 'Item';
        modal({ title: t.trim(), text: 'Detailed view for this card opens here. In the production build, clicking takes you to the full configuration screen.', okText: 'OK' });
      });
    });
  }

  /* Initial pass + observe future DOM */
  function init() {
    bindAll();
    var pending = false;
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; bindAll(); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
