/* ═══════════════════════════════════════════════════════════
   HelveX · Client Portal · Supabase auth integration
   - Initializes a single Supabase client (window.HX.supabase)
   - Exposes auth helpers (signUp, verify, signIn, OAuth, reset)
   - Mounts a session guard + logout for every authenticated page
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://yjmpallrtpeinpdilptj.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vx5tD4mUizuspej5-g3XlQ_PnbjXSeR';

  // Public pages that should never trigger an auth redirect.
  var PUBLIC_PATHS = [
    '/', '/index', '/index.html',
    '/signup', '/signup.html',
    '/verify', '/verify.html',
    '/forgot-password', '/forgot-password.html',
    '/reset-password', '/reset-password.html'
  ];

  function loadSdk(cb) {
    if (window.supabase && window.supabase.createClient) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = cb;
    s.onerror = function () { console.error('[HelveX] failed to load Supabase SDK'); };
    document.head.appendChild(s);
  }

  function init() {
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'helvex.auth'
      }
    });

    var HX = (window.HX = window.HX || {});
    HX.supabase = sb;

    /* ---------- helpers ----------
       All flows go through Supabase JS directly. That means the OTP that
       Supabase mails out is the SAME token that verifyOtp checks against —
       no second code generated anywhere. The OTP length (6 digits) is set
       at the project level under Authentication → Providers → Email. */

    function clean(s) { return String(s || '').trim().toLowerCase(); }

    // Normalises Supabase native { data, error } responses into a uniform
    // shape that the existing pages already understand:
    //   - 200 + body  → success
    //   - non-200 + body.error  → error
    function asResponse(supabaseResult) {
      var err = supabaseResult && supabaseResult.error;
      if (err) {
        var status = err.status || (typeof err.code === 'number' ? err.code : 400);
        return { status: status, body: { error: errorCode(err) } };
      }
      return { status: 200, body: { ok: true, data: supabaseResult && supabaseResult.data } };
    }

    function errorCode(err) {
      var raw = (err && err.message) ? String(err.message).toLowerCase() : '';
      if (/already\s*registered|user\s*already/.test(raw)) return 'user_already_exists';
      if (/email\s*not\s*confirmed/.test(raw))             return 'email_not_confirmed';
      if (/invalid\s*login\s*credentials/.test(raw))       return 'invalid_credentials';
      if (/expired/.test(raw))                              return 'expired';
      if (/token|otp/.test(raw) && /invalid|incorrect/.test(raw)) return 'mismatch';
      if (/rate\s*limit/.test(raw))                         return 'too_many_attempts';
      if (/password.*at\s*least|password.*characters/.test(raw)) return 'password_too_short';
      if (/email.*invalid/.test(raw))                       return 'invalid_email';
      return raw || 'unknown_error';
    }

    HX.auth = {
      // Send the signup confirmation email. Supabase generates the OTP,
      // stores its hash, and emails it via the "Confirm signup" template.
      signUp: function (email, password, meta) {
        return sb.auth.signUp({
          email: clean(email),
          password: password,
          options: {
            data: meta || {},
            emailRedirectTo: window.location.origin + '/verify?email=' +
              encodeURIComponent(clean(email))
          }
        }).then(asResponse);
      },

      // Verify the 6-digit code from the signup email. Returns the session
      // when successful — Supabase JS automatically persists it.
      verifySignup: function (email, code) {
        return sb.auth.verifyOtp({
          email: clean(email),
          token: String(code || '').replace(/\D+/g, ''),
          type: 'signup'
        }).then(asResponse);
      },

      // Resend the signup confirmation OTP through Supabase.
      resendSignup: function (email) {
        var clean_email = clean(email);
        return sb.auth.resend({
          type: 'signup',
          email: clean_email,
          options: {
            emailRedirectTo: window.location.origin + '/verify?email=' +
              encodeURIComponent(clean_email)
          }
        }).then(asResponse);
      },

      // Email + password sign-in (after verification has completed).
      signInPassword: function (email, password) {
        return sb.auth.signInWithPassword({ email: clean(email), password: password });
      },

      // Social sign-in (Google / Apple / GitHub).
      signInOAuth: function (provider) {
        return sb.auth.signInWithOAuth({
          provider: provider,
          options: { redirectTo: window.location.origin + '/dashboard' }
        });
      },

      // Send the 6-digit password-reset code via Supabase.
      requestPasswordReset: function (email) {
        var clean_email = clean(email);
        return sb.auth.resetPasswordForEmail(clean_email, {
          redirectTo: window.location.origin + '/reset-password?email=' +
            encodeURIComponent(clean_email)
        }).then(asResponse);
      },

      // Verify the 6-digit recovery code; success establishes a session
      // that lets us call updateUser({ password }).
      verifyRecovery: function (email, code) {
        return sb.auth.verifyOtp({
          email: clean(email),
          token: String(code || '').replace(/\D+/g, ''),
          type: 'recovery'
        }).then(asResponse);
      },

      // Set the new password for the currently authenticated (recovery) user.
      updatePassword: function (newPassword) {
        return sb.auth.updateUser({ password: newPassword }).then(asResponse);
      },

      session: function () { return sb.auth.getSession(); },
      user:    function () { return sb.auth.getUser(); },

      signOut: function () {
        return sb.auth.signOut().then(function () {
          window.location.replace('/signup');
        });
      }
    };

    /* ---------- session guard ---------- */
    var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    var isPublic = PUBLIC_PATHS.indexOf(path) !== -1;

    sb.auth.getSession().then(function (res) {
      var session = res && res.data ? res.data.session : null;
      // Authenticated user landing on /signup → bounce to /dashboard
      if (session && (path === '/signup' || path === '/signup.html')) {
        window.location.replace('/dashboard');
        return;
      }
      // Unauthenticated user on a protected page → bounce to /signup
      if (!session && !isPublic) {
        window.location.replace('/signup');
      }
    });

    // Wire the sidebar logout button (rendered by platform.js)
    function wireLogout() {
      document.querySelectorAll('[data-action="signout"], .hx-user-action[title="Sign out"]').forEach(function (el) {
        if (el.__hxBound) return;
        el.__hxBound = true;
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          HX.auth.signOut();
        });
      });
    }
    wireLogout();
    // re-wire after platform.js injects the shell
    setTimeout(wireLogout, 0);
    setTimeout(wireLogout, 250);

    document.dispatchEvent(new CustomEvent('hx:auth-ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { loadSdk(init); });
  } else {
    loadSdk(init);
  }
})();
