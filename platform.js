/* ═══════════════════════════════════════════════════════════
   HelveX · Client Portal · shared sidebar + topbar injector
   Each platform page sets <body data-active="dashboard"> (etc.)
   to highlight the current item in the nav.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var NAV_GROUPS = [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard',     href: '/dashboard.html',     label: 'Dashboard',    icon: 'home' },
        { id: 'projects',      href: '/projects.html',      label: 'Projects',     icon: 'folder' },
        { id: 'services',      href: '/services.html',      label: 'Services',     icon: 'grid' }
      ]
    },
    {
      label: 'Billing',
      items: [
        { id: 'credits',       href: '/credits.html',       label: 'Credits',      icon: 'coin', badge: '2,400' },
        { id: 'pricing',       href: '/pricing.html',       label: 'Pricing',      icon: 'tag' },
        { id: 'subscriptions', href: '/subscriptions.html', label: 'Subscriptions', icon: 'refresh' },
        { id: 'invoices',      href: '/invoices.html',      label: 'Invoices',     icon: 'doc' },
        { id: 'orders',        href: '/orders.html',        label: 'Orders',       icon: 'box' },
        { id: 'billing',       href: '/billing.html',       label: 'Billing',      icon: 'card' }
      ]
    },
    {
      label: 'Account',
      items: [
        { id: 'profile',       href: '/profile.html',       label: 'Profile',      icon: 'user' },
        { id: 'settings',      href: '/settings.html',      label: 'Settings',     icon: 'cog' },
        { id: 'support',       href: '/support.html',       label: 'Support',      icon: 'help' }
      ]
    }
  ];

  var ICONS = {
    home:    '<path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
    folder:  '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    grid:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    coin:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h4"/>',
    tag:     '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    doc:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
    box:     '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    card:    '<rect x="2" y="6" width="20" height="14" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/><line x1="6" y1="16" x2="10" y2="16"/>',
    user:    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    cog:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    help:    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    logout:  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  function buildSidebar(activeId) {
    var html = '';
    html += '<div class="hx-sidebar-brand"><img src="/helvex-logo.png" alt="HelveX" /></div>';
    NAV_GROUPS.forEach(function (group) {
      html += '<div class="hx-nav-section">';
      html += '<div class="hx-nav-label">' + group.label + '</div>';
      group.items.forEach(function (item) {
        var activeClass = (item.id === activeId) ? ' active' : '';
        var badge = item.badge ? '<span class="hx-nav-badge">' + item.badge + '</span>' : '';
        html += '<a href="' + item.href + '" class="hx-nav-item' + activeClass + '">' + svg(item.icon) + '<span>' + item.label + '</span>' + badge + '</a>';
      });
      html += '</div>';
    });
    html += '<div class="hx-sidebar-foot">';
    html += '<div class="hx-user-card" id="hx-user-card">';
    html += '<div class="hx-user-avatar" id="hx-user-avatar">·</div>';
    html += '<div class="hx-user-meta"><div class="hx-user-name" id="hx-user-name">Loading…</div><div class="hx-user-email" id="hx-user-email">&nbsp;</div></div>';
    html += '<button type="button" class="hx-user-action" title="Sign out" data-action="signout" aria-label="Sign out">' + svg('logout') + '</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function buildTopbar() {
    return ''
      + '<button type="button" class="hx-menu-toggle" aria-label="Open menu" id="hx-menu-toggle">'
      +   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'
      + '</button>'
      + '<a href="/" class="hx-sidebar-brand" style="margin:0;padding:0;"><img src="/helvex-logo.png" alt="HelveX" style="height:32px;" /></a>'
      + '<div style="width:38px"></div>';
  }

  function loadAuthScript() {
    if (window.HX && window.HX.auth) return;
    if (document.querySelector('script[data-hx-auth]')) return;
    var s = document.createElement('script');
    s.src = '/auth.js';
    s.setAttribute('data-hx-auth', '1');
    document.head.appendChild(s);
  }

  function initials(first, last, email) {
    var a = (first || '').trim();
    var b = (last || '').trim();
    if (a || b) return ((a[0] || '') + (b[0] || '')).toUpperCase();
    var e = (email || '').trim();
    return e ? e[0].toUpperCase() : '·';
  }

  function hydrateUserCard() {
    var sb = window.HX && window.HX.supabase;
    if (!sb) return;
    sb.auth.getUser().then(function (res) {
      var user = res && res.data ? res.data.user : null;
      if (!user) return;
      var meta = user.user_metadata || {};
      var nameEl = document.getElementById('hx-user-name');
      var mailEl = document.getElementById('hx-user-email');
      var avEl   = document.getElementById('hx-user-avatar');
      var fullName = (meta.first_name || '').trim() + ' ' + (meta.last_name || '').trim();
      fullName = fullName.trim() || (user.email ? user.email.split('@')[0] : 'Account');
      if (nameEl) nameEl.textContent = fullName;
      if (mailEl) mailEl.textContent = user.email || '';
      if (avEl)   avEl.textContent   = initials(meta.first_name, meta.last_name, user.email);
    });
  }

  function injectShell() {
    var body = document.body;
    if (!body) return;
    var activeId = body.getAttribute('data-active') || '';

    var sidebar = document.querySelector('.hx-sidebar');
    if (sidebar) sidebar.innerHTML = buildSidebar(activeId);

    var topbar = document.querySelector('.hx-topbar');
    if (topbar) topbar.innerHTML = buildTopbar();

    var toggle = document.getElementById('hx-menu-toggle');
    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
    }
    // Click outside sidebar (mobile) closes it
    if (sidebar) {
      document.addEventListener('click', function (e) {
        if (window.innerWidth > 900) return;
        if (!sidebar.classList.contains('open')) return;
        if (sidebar.contains(e.target) || (toggle && toggle.contains(e.target))) return;
        sidebar.classList.remove('open');
      });
    }

    // Boot Supabase auth (session guard, signout, user hydration)
    loadAuthScript();
    if (window.HX && window.HX.auth) hydrateUserCard();
    else document.addEventListener('hx:auth-ready', hydrateUserCard, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectShell);
  } else {
    injectShell();
  }
})();
