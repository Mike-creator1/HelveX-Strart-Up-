/*!
 * CreateX Sidebar — shared navigation component
 * Mounts into the first .sidebar / #sidebar / #app-sidebar element found.
 * Active state is inferred from window.location.pathname.
 * Injects its own scoped CSS so it works in any page regardless of existing styles.
 */
(function (w, d) {
  'use strict';

  /* ─── icon paths (Heroicons outline 24×24) ─── */
  var P = {
    overview:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    model:       'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    agent:       'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
    website:     'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
    app:         'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    workflow:    'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
    knowledge:   'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    templates:   'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    deploy:      'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
    analytics:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    marketplace: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    billing:     'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    settings:    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    settings2:   'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    help:        'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    signout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    person:      'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    globe:       'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    upgrade:     'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    feedback:    'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    learn:       'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    chevron:     'M9 5l7 7-7 7',
  };

  function ico(k, s) {
    s = s || 16;
    var extra = k === 'settings' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="' + P.settings2 + '"/>' : '';
    return '<svg width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style="flex-shrink:0;display:block">'
      + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="' + P[k] + '"/>'
      + extra + '</svg>';
  }

  /* ─── navigation structure ─── */
  var NAV = [
    { section: 'WORKSPACE', items: [
      { label: 'Overview',          href: 'dashboard.html',        file: 'dashboard',       icon: 'overview'   },
    ]},
    { section: 'BUILD', items: [
      { label: 'Model Builder',     href: 'model-builder.html',    file: 'model-builder',   icon: 'model',      badge: 'NEW' },
      { label: 'Agent Builder',     href: 'agents.html',           file: 'agents',           icon: 'agent'      },
      { label: 'Website Builder',   href: 'website-builder.html',  file: 'website-builder', icon: 'website'    },
      { label: 'App Builder',       href: 'app-builder.html',      file: 'app-builder',     icon: 'app'        },
      { label: 'Workflow Builder',  href: 'workflow-builder.html', file: 'workflow-builder',icon: 'workflow',   badge: 'NEW' },
      { label: 'Knowledge Base',    href: 'knowledge-base.html',   file: 'knowledge-base',  icon: 'knowledge',  badge: 'NEW' },
      { label: 'AI Template Hub',   href: 'templates.html',        file: 'templates',       icon: 'templates'  },
    ]},
    { section: 'MANAGE', items: [
      { label: 'Deployments',       href: 'deployments.html',      file: 'deployments',     icon: 'deploy',     badge: 'NEW' },
      { label: 'Analytics',         href: 'analytics.html',        file: 'analytics',       icon: 'analytics',  badge: 'NEW' },
      { label: 'Marketplace',       href: 'marketplace.html',      file: 'marketplace',     icon: 'marketplace',badge: 'NEW' },
    ]},
  ];

  /* ─── scoped CSS injected once ─── */
  var CSS_ID = 'cx-sidebar-style';
  function injectCSS() {
    if (d.getElementById(CSS_ID)) return;
    var s = d.createElement('style');
    s.id = CSS_ID;
    s.textContent = [
      /* Brand */
      '.cx-sb-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#fff;padding:6px 8px 18px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:14px}',
      '.cx-sb-brand strong{font-size:19px;font-weight:900;font-family:Inter,sans-serif}',
      '.cx-sb-brand small{display:block;font-size:9px;font-weight:900;letter-spacing:.18em;color:#18d7ff;text-transform:uppercase;margin-top:3px;font-family:Inter,sans-serif}',
      '.cx-sb-logo{width:34px;height:34px;border-radius:9px;background:rgba(24,215,255,.1);border:1px solid rgba(24,215,255,.22);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      /* Nav */
      '.cx-sb-section{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.3);padding:14px 10px 6px;font-family:Inter,sans-serif}',
      '.cx-sb-link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;text-decoration:none;color:rgba(255,255,255,.58);font-size:12.5px;font-weight:700;transition:.18s ease;border:1px solid transparent;font-family:Inter,sans-serif;letter-spacing:-.01em;line-height:1}',
      '.cx-sb-link:hover{color:#fff;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.07)}',
      '.cx-sb-link.cx-active{color:#fff;background:linear-gradient(135deg,rgba(24,215,255,.13),rgba(124,61,255,.09));border-color:rgba(24,215,255,.26);box-shadow:0 8px 24px rgba(24,215,255,.07)}',
      '.cx-sb-badge{margin-left:auto;font-size:8.5px;font-weight:900;background:rgba(57,245,138,.1);color:#6dffa7;border:1px solid rgba(57,245,138,.2);border-radius:999px;padding:2px 6px;letter-spacing:.06em;text-transform:uppercase;font-family:Inter,sans-serif}',
      /* Footer / Profile button */
      '.cx-sb-footer{margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}',
      '.cx-sb-profile-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:10px;background:none;border:1px solid transparent;color:rgba(255,255,255,.7);cursor:pointer;font-family:Inter,sans-serif;transition:.18s ease;text-align:left}',
      '.cx-sb-profile-btn:hover{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.08);color:#fff}',
      '.cx-sb-profile-btn.cx-pop-open{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.08)}',
      '.cx-sb-avatar{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,rgba(24,215,255,.15),rgba(124,61,255,.15));border:1px solid rgba(24,215,255,.22);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#18d7ff}',
      '.cx-sb-prof-info{flex:1;min-width:0;text-align:left}',
      '.cx-sb-prof-name{font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:Inter,sans-serif;line-height:1.2}',
      '.cx-sb-prof-email{font-size:10px;color:rgba(255,255,255,.36);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;font-family:Inter,sans-serif;margin-top:2px;line-height:1}',
      /* Popup */
      '@keyframes cxPopUp{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '.cx-sb-popup{position:fixed;background:#0c0e15;border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 0 0 1px rgba(255,255,255,.04),0 24px 60px rgba(0,0,0,.6),0 8px 24px rgba(0,0,0,.4);z-index:99999;overflow:hidden;animation:cxPopUp .16s cubic-bezier(.16,1,.3,1)}',
      '.cx-sb-pop-head{padding:13px 14px 11px;border-bottom:1px solid rgba(255,255,255,.07)}',
      '.cx-sb-pop-head-email{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.4);font-family:Inter,sans-serif;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.cx-sb-pop-section{padding:5px 0}',
      '.cx-sb-pop-item{display:flex;align-items:center;gap:9px;width:100%;padding:8px 12px;background:none;border:none;color:rgba(255,255,255,.68);font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;text-align:left;transition:background .13s,color .13s;text-decoration:none;box-sizing:border-box;line-height:1.3}',
      '.cx-sb-pop-item:hover{background:rgba(255,255,255,.07);color:#fff}',
      '.cx-sb-pop-item.cx-danger{color:rgba(255,80,80,.78)}',
      '.cx-sb-pop-item.cx-danger:hover{background:rgba(239,68,68,.09);color:#ff6b6b}',
      '.cx-sb-pop-right{margin-left:auto;font-size:10.5px;color:rgba(255,255,255,.22);font-weight:700;font-family:Inter,sans-serif;flex-shrink:0;letter-spacing:.01em}',
      '.cx-sb-pop-div{height:1px;background:rgba(255,255,255,.07)}',
    ].join('');
    (d.head || d.documentElement).appendChild(s);
  }

  /* ─── determine active page ─── */
  function activeFile() {
    var p = (w.location.pathname || '').split('/').pop() || 'dashboard.html';
    return p.replace(/\.html$/i, '');
  }

  /* ─── build popup item HTML ─── */
  function popItem(iconKey, label, right, onclick, danger) {
    var cls = 'cx-sb-pop-item' + (danger ? ' cx-danger' : '');
    var rightHtml = right ? '<span class="cx-sb-pop-right">' + right + '</span>' : '';
    return '<button class="' + cls + '" onclick="' + onclick + '">'
      + ico(iconKey, 14)
      + '<span style="flex:1">' + label + '</span>'
      + rightHtml
      + '</button>';
  }

  /* ─── build and mount sidebar ─── */
  function render() {
    var target = d.getElementById('app-sidebar') || d.getElementById('sidebar') || d.querySelector('.sidebar');
    if (!target) return;

    var af = activeFile();

    var logo = '<div class="cx-sb-logo">'
      + '<svg width="18" height="18" viewBox="0 0 36 36" fill="none">'
      + '<defs><linearGradient id="cxSbG" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0%" stop-color="#18d7ff"/><stop offset="100%" stop-color="#7c3dff"/></linearGradient></defs>'
      + '<path d="M8 8L28 28M28 8L8 28" stroke="url(#cxSbG)" stroke-width="3.5" stroke-linecap="round"/>'
      + '</svg></div>';

    var html = '<a href="dashboard.html" class="cx-sb-brand">'
      + logo
      + '<div><strong>CreateX</strong><small>AI Platform</small></div>'
      + '</a>';

    for (var g = 0; g < NAV.length; g++) {
      var grp = NAV[g];
      html += '<div class="cx-sb-section">' + grp.section + '</div>';
      for (var i = 0; i < grp.items.length; i++) {
        var item = grp.items[i];
        var isActive = item.file === af;
        var badge = item.badge ? '<span class="cx-sb-badge">' + item.badge + '</span>' : '';
        html += '<a href="' + item.href + '" class="cx-sb-link' + (isActive ? ' cx-active' : '') + '">'
          + ico(item.icon)
          + '<span style="flex:1">' + item.label + '</span>'
          + badge
          + '</a>';
      }
    }

    /* ─── Profile footer ─── */
    html += '<div class="cx-sb-footer">'
      + '<button class="cx-sb-profile-btn" id="cx-sb-profile-btn" onclick="cxTogglePopup()">'
      + '<div class="cx-sb-avatar">' + ico('person', 14) + '</div>'
      + '<div class="cx-sb-prof-info">'
      + '<div class="cx-sb-prof-name" id="cx-prof-name">Account</div>'
      + '<div class="cx-sb-prof-email" id="cx-prof-email">Loading\u2026</div>'
      + '</div>'
      + '</button>'
      + '</div>';

    target.innerHTML = html;

    /* ─── Inject popup into body (once) ─── */
    if (!d.getElementById('cx-sb-popup')) {
      var pop = d.createElement('div');
      pop.id = 'cx-sb-popup';
      pop.className = 'cx-sb-popup';
      pop.style.display = 'none';
      pop.innerHTML =
        '<div class="cx-sb-pop-head">'
        + '<span class="cx-sb-pop-head-email" id="cx-pop-email">Loading\u2026</span>'
        + '</div>'
        + '<div class="cx-sb-pop-section">'
        + popItem('settings', 'Settings', 'Ctrl+,', "cxPopGo('settings.html')")
        + popItem('globe',    'Language',  '&#8250;',  'cxClosePopup()')
        + popItem('help',     'Get Help',  '',         "cxPopGo('help.html')")
        + '</div>'
        + '<div class="cx-sb-pop-div"></div>'
        + '<div class="cx-sb-pop-section">'
        + popItem('upgrade',  'Upgrade Plan',   '', "cxPopGo('billing.html')")
        + popItem('feedback', 'Give Feedback',  '', 'cxClosePopup()')
        + popItem('learn',    'Learn More',     '&#8250;', 'cxClosePopup()')
        + '</div>'
        + '<div class="cx-sb-pop-div"></div>'
        + '<div class="cx-sb-pop-section">'
        + popItem('signout',  'Log Out', '', 'cxSignOut()', true)
        + '</div>';
      d.body.appendChild(pop);
    }
  }

  /* ─── popup: toggle, position, close ─── */
  w.cxTogglePopup = function () {
    var pop = d.getElementById('cx-sb-popup');
    var btn = d.getElementById('cx-sb-profile-btn');
    if (!pop) return;

    if (pop.style.display !== 'none') {
      cxClosePopup();
      return;
    }

    /* Position fixed above the profile button */
    if (btn) {
      var rect = btn.getBoundingClientRect();
      var popW = rect.width;
      pop.style.width  = popW + 'px';
      pop.style.left   = rect.left + 'px';
      pop.style.top    = '';
      pop.style.bottom = (w.innerHeight - rect.top + 8) + 'px';
    }

    pop.style.display = 'block';
    if (btn) btn.classList.add('cx-pop-open');

    /* Close on outside click (deferred so this click doesn't immediately close) */
    setTimeout(function () {
      d.addEventListener('click', cxOutsideClick);
    }, 0);
  };

  function cxOutsideClick(e) {
    var pop = d.getElementById('cx-sb-popup');
    var btn = d.getElementById('cx-sb-profile-btn');
    if (pop && !pop.contains(e.target) && btn && !btn.contains(e.target)) {
      cxClosePopup();
    }
  }

  w.cxClosePopup = function () {
    var pop = d.getElementById('cx-sb-popup');
    var btn = d.getElementById('cx-sb-profile-btn');
    if (pop) pop.style.display = 'none';
    if (btn) btn.classList.remove('cx-pop-open');
    d.removeEventListener('click', cxOutsideClick);
  };

  w.cxPopGo = function (href) {
    w.cxClosePopup();
    w.location.href = href;
  };

  w.cxSignOut = function () {
    w.cxClosePopup();
    if (typeof w.handleSignOut === 'function') {
      w.handleSignOut();
    } else if (w.sb) {
      w.sb.auth.signOut().finally(function () { w.location.href = 'index.html'; });
    } else {
      w.location.href = 'index.html';
    }
  };

  /* ─── patch profile display once auth is ready ─── */
  function patchUser(n) {
    n = n || 0;
    if (!w.sb) { if (n < 80) setTimeout(function () { patchUser(n + 1); }, 150); return; }
    w.sb.auth.getSession().then(function (r) {
      var u = r && r.data && r.data.session && r.data.session.user;
      if (!u) return;
      var meta    = u.user_metadata || {};
      var name    = meta.full_name || meta.name || '';
      var email   = u.email || '';
      var display = name || (email ? email.split('@')[0] : '') || 'Account';

      var nameEl  = d.getElementById('cx-prof-name');
      var emailEl = d.getElementById('cx-prof-email');
      var popEl   = d.getElementById('cx-pop-email');

      if (nameEl)  nameEl.textContent  = display;
      if (emailEl) emailEl.textContent = email;
      if (popEl)   popEl.textContent   = email;
    }).catch(function () {});
  }

  /* ─── strip duplicate top-right email + Sign out from every topbar ─── */
  function stripTopbarDuplicates() {
    var sels = [
      '#topbar-user', '#topbar-username', '#topbar-email',
      '.t-user', '.topbar-user', '.topbar-username',
      '.topbar-right', '.topbar-r'
    ];
    sels.forEach(function (q) {
      d.querySelectorAll(q).forEach(function (el) {
        if (el.closest('#cx-sb-popup, .cx-sb-popup, #app-sidebar, .sidebar')) return;
        el.remove();
      });
    });
    /* Catch any leftover Sign out / handleSignOut buttons in headers/topbars */
    d.querySelectorAll('header button, .topbar button, .main-topbar button, [class*="topbar"] button').forEach(function (b) {
      if (b.closest('#cx-sb-popup, .cx-sb-popup, #app-sidebar, .sidebar')) return;
      var oc = b.getAttribute('onclick') || '';
      var tx = (b.textContent || '').trim().toLowerCase();
      if (oc.indexOf('handleSignOut') !== -1 || tx === 'sign out' || tx === 'log out') b.remove();
    });
  }

  /* ─── auto-load shared mock-interactions layer ─── */
  function loadMockLayer() {
    if (d.getElementById('cx-mock-loader') || w.__cxMockInit) return;
    var sc = d.createElement('script');
    sc.id = 'cx-mock-loader';
    sc.src = 'mock-interactions.js';
    sc.async = true;
    (d.body || d.documentElement).appendChild(sc);
  }

  /* ─── auto-load analytics tracker (writes to Supabase) ─── */
  function loadTracker() {
    if (d.getElementById('cx-tracker-loader') || w.__cxAnalyticsInit) return;
    var sc = d.createElement('script');
    sc.id = 'cx-tracker-loader';
    sc.src = 'analytics-tracker.js';
    sc.async = true;
    (d.body || d.documentElement).appendChild(sc);
  }

  /* ─── auto-load template loader on builder pages ─── */
  function loadTemplateLoader() {
    if (d.getElementById('cx-tpl-script') || w.__cxTplLoaderInit) return;
    var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    var BUILDERS = { agents:1, 'website-builder':1, 'app-builder':1, 'workflow-builder':1, 'model-builder':1 };
    if (!BUILDERS[page]) return;
    var sc = d.createElement('script');
    sc.id = 'cx-tpl-script';
    sc.src = 'template-loader.js';
    sc.async = true;
    (d.body || d.documentElement).appendChild(sc);
  }

  function init() { injectCSS(); render(); patchUser(); stripTopbarDuplicates(); loadMockLayer(); loadTracker(); loadTemplateLoader(); }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window, document));
