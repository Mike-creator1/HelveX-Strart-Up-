/* ═══════════════════════════════════════════════════════════════════════
   HelveX · Workbench client module
   ─────────────────────────────────────────────────────────────────────
   Shared by chat.html (capture side) and workbench.html (browse side).
   Exposes a single namespace `window.HX.workbench` with:

     classify(text)       → { kind, language, title }
     shouldSave(text)     → boolean
     autoCapture(opts)    → Promise<{id} | null>
     smartSearch(q, list) → ranked subset of artifacts
     seedChat(artifact)   → opens /chat.html with this artifact preloaded
     readSeed()           → returns a pending seed (used by chat.html on load)

   The split is deliberate: capture stays out of workbench.html (it never
   needs to capture anything; it only renders what's already there), and
   browse stays out of chat.html (it never needs to render the catalog).
   ═════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  window.HX = window.HX || {};
  if (window.HX.workbench) return; // idempotent — safe to include on every page

  // ─── 1. Classification ───────────────────────────────────────────
  // Look at the shape of the assistant's reply and pick the most useful
  // bucket. Order matters: the first match wins, so more specific
  // detectors come first. Worst case we return { kind: 'note' }.

  // Match the *biggest* fenced block first, so a reply with three
  // 2-line snippets + one 60-line code block reads as Code, not Snippet.
  function biggestFence(text) {
    var re = /```([a-zA-Z0-9_+-]*)\s*\n([\s\S]*?)```/g;
    var best = null;
    var m;
    while ((m = re.exec(text)) !== null) {
      var body = m[2] || '';
      if (!best || body.length > best.body.length) {
        best = { lang: (m[1] || '').toLowerCase(), body: body };
      }
    }
    return best;
  }

  function countMarkdownHeadings(text) {
    var m = text.match(/^#{1,3}\s+\S/gm);
    return m ? m.length : 0;
  }

  function looksLikeConfig(body, lang) {
    if (lang === 'yaml' || lang === 'yml' || lang === 'toml' || lang === 'ini' || lang === 'env' || lang === 'dotenv') return true;
    if (lang === 'json' && /^[\s{[]/.test(body.trim())) return true;
    // Heuristic: many `KEY: value` or `KEY=value` lines
    var lines = body.split('\n').filter(Boolean);
    if (lines.length < 4) return false;
    var hits = lines.filter(function (l) { return /^\s*[A-Za-z_][A-Za-z0-9_.-]*\s*[:=]/.test(l); }).length;
    return hits / lines.length > 0.6;
  }

  function looksLikePrompt(body) {
    return /^\s*(You are|You're|Act as|Imagine you are|System:|Role:|Persona:)/i.test(body);
  }

  // Pull a usable title out of free-form text. Priority order:
  //   1. First markdown H1/H2/H3
  //   2. First sentence of any prose that sits OUTSIDE fenced blocks
  //   3. First meaningful line of code body (function/class declaration)
  //   4. Kind-derived fallback like "Snippet from chat"
  //
  // Code-fence delimiters (```js, ```, etc) are explicitly skipped — the
  // earlier implementation used them as titles, which produced garbage
  // like "```javascript".
  function deriveTitle(text, kindFallback) {
    var heading = text.match(/^#{1,3}\s+(.+)$/m);
    if (heading && heading[1].trim().length >= 3) return clampTitle(heading[1].trim());

    // Strip fenced blocks so we can hunt for a sentence in the prose
    // wrapper around them ("Here's the handler:" \n ``` ... ``` \n).
    var prose = text.replace(/```[\s\S]*?```/g, ' ').trim();
    var sentence = pickSentence(prose);
    if (sentence) return clampTitle(sentence);

    // No usable prose → look inside the first fenced block for a
    // signature line that reads like a title.
    var fence = text.match(/```[a-zA-Z0-9_+-]*\s*\n([\s\S]*?)```/);
    if (fence) {
      var codeLine = fence[1].split('\n').find(function (l) {
        var t = l.trim();
        if (!t) return false;
        // Skip pure-symbol / closing brace lines.
        if (/^[{}\[\]();,]+$/.test(t)) return false;
        return true;
      });
      if (codeLine) return clampTitle(codeLine.trim());
    }

    return (kindFallback || 'note').replace(/^./, function (c) { return c.toUpperCase(); }) + ' from chat';
  }

  // Take a chunk of prose, drop markdown decoration off the first line,
  // and return at most one sentence. Returns null if nothing usable
  // (length under 3 chars after cleaning).
  function pickSentence(prose) {
    if (!prose) return null;
    var firstLine = prose.split('\n').find(function (l) { return l.trim().length > 0; }) || '';
    firstLine = firstLine.replace(/^[#>*\-\s]+/, '').trim();
    if (firstLine.length < 3) return null;
    // Cut at the first sentence boundary (. ! ; — Greek-aware) so the
    // title doesn't run on. Bounded so a wall-of-text reply doesn't
    // produce a title longer than the card.
    var m = firstLine.match(/^(.{8,140}?[.!?؟؛])\s/);
    if (m) return m[1];
    return firstLine;
  }

  function clampTitle(s) {
    s = (s || '').trim();
    if (s.length <= 80) return s;
    return s.slice(0, 78).replace(/\s+\S*$/, '') + '…';
  }

  function classify(text) {
    var t = (text || '').trim();
    if (!t) return { kind: 'note', language: null, title: 'Untitled' };

    var fence = biggestFence(t);
    var headingCount = countMarkdownHeadings(t);

    // 1. Fenced block dominates the reply — bucket on what's inside it.
    if (fence) {
      var lang = fence.lang || null;
      var body = fence.body;
      // Prompts are written as fenced text most of the time, so check
      // that *before* settling on code/config.
      if (looksLikePrompt(body)) {
        return { kind: 'prompt', language: lang, title: deriveTitle(t, 'prompt') };
      }
      if (looksLikeConfig(body, lang)) {
        return { kind: 'config', language: lang || 'yaml', title: deriveTitle(t, 'config') };
      }
      // Tiny one-liners stay as snippets so the user can scan them fast.
      var lineCount = body.split('\n').filter(function (l) { return l.trim().length > 0; }).length;
      if (lineCount <= 4 && body.length < 240) {
        return { kind: 'snippet', language: lang, title: deriveTitle(t, 'snippet') };
      }
      return { kind: 'code', language: lang, title: deriveTitle(t, 'code') };
    }

    // 2. No fence — multi-section markdown reads as a Document.
    if (headingCount >= 2) {
      return { kind: 'document', language: null, title: deriveTitle(t, 'document') };
    }

    // 3. Plain text starting with role framing → Prompt.
    if (looksLikePrompt(t)) {
      return { kind: 'prompt', language: null, title: deriveTitle(t, 'prompt') };
    }

    // 4. Default: note.
    return { kind: 'note', language: null, title: deriveTitle(t, 'note') };
  }

  // ─── 2. Save-worth heuristic ─────────────────────────────────────
  // Conversational chatter (clarifying questions, "got it!", retries)
  // shouldn't pollute the workbench. Save anything that looks like real
  // output — anything substantial, anything with a code block, anything
  // multi-section.

  function shouldSave(text) {
    var t = (text || '').trim();
    if (!t) return false;
    if (t.length < 200) {
      // Short replies are usually conversational — keep only if they
      // contain at least one fenced block (the user explicitly asked
      // for a snippet).
      return /```[\s\S]+```/.test(t);
    }
    // Reply that ends in an open question is almost always a clarifying
    // follow-up, not finished output.
    if (/[?؟？]\s*$/.test(t) && t.length < 600) return false;
    // Skip pure refusal / can't-help patterns.
    if (/^(sorry|i\s+can(?:not|'t)|unfortunately,?\s+i)/i.test(t) && t.length < 400) return false;
    return true;
  }

  // ─── 3. Auto-capture ─────────────────────────────────────────────
  // Persists one assistant message as an artifact. Idempotent on
  // (owner_id, source_message_id) via the unique index from the
  // workbench_auto_capture_metadata migration — calling twice with the
  // same message_id is a no-op rather than a 2nd row.

  async function autoCapture(opts) {
    opts = opts || {};
    var sb = opts.supabase || (window.HX && window.HX.supabase);
    if (!sb) return null;
    var text = opts.text || '';
    if (!shouldSave(text)) return null;

    var owner = opts.ownerId;
    if (!owner) {
      try { owner = (await sb.auth.getUser()).data.user.id; } catch (e) { return null; }
    }
    if (!owner) return null;

    var c = classify(text);
    var convTitle = opts.conversationTitle ? String(opts.conversationTitle).slice(0, 60) : null;
    var title = c.title;
    if (convTitle && !/from chat$/i.test(title)) {
      title = title; // keep derived title untouched; conversation lives in meta
    }

    var row = {
      owner_id: owner,
      kind: c.kind,
      title: title,
      content: text,
      language: c.language || null,
      source: opts.conversationId ? ('chat:' + opts.conversationId) : 'chat',
      source_conversation_id: opts.conversationId || null,
      source_message_id:      opts.messageId      || null,
      auto_captured: true,
      meta: {
        conversation_title: convTitle,
        captured_at: new Date().toISOString(),
        model: opts.model || null,
      },
    };

    // upsert on (owner_id, source_message_id) — if the SSE retries and
    // delivers the same message twice, we don't duplicate.
    var ins = await sb.from('artifacts').insert(row).select('id,kind,title').single();
    if (ins.error) {
      // 23505 = unique_violation → the row already exists for this message.
      if (ins.error.code === '23505') return null;
      console.warn('[workbench] auto-capture failed:', ins.error.message);
      return null;
    }
    return ins.data || null;
  }

  // ─── 4. Smart search ─────────────────────────────────────────────
  // Two-stage: a Postgres FTS query against the GIN index for ranked
  // semantic-ish matches; fallback to client-side substring + fuzzy
  // scoring against the loaded list so single-character / typo queries
  // still surface something.

  async function searchServer(supabase, query, limit) {
    if (!supabase || !query) return null;
    try {
      var r = await supabase.rpc('search_artifacts', { q: query, lim: limit || 50 });
      if (r.error) throw r.error;
      return r.data || [];
    } catch (_) {
      return null; // RPC not deployed → fall back to client-only ranking
    }
  }

  function tokenize(s) {
    return (s || '').toLowerCase().split(/[\s,.;:!?()\[\]{}<>"'`/\\|]+/).filter(Boolean);
  }

  function clientRank(query, artifacts) {
    var q = (query || '').trim().toLowerCase();
    if (!q) return artifacts.slice();
    var qTokens = tokenize(q);
    var scored = artifacts.map(function (a) {
      var title = (a.title || '').toLowerCase();
      var body  = (a.content || '').toLowerCase();
      var hay   = title + '\n' + body;

      // Relevance score — only counts actual textual matches. Recency
      // and pinned bonuses are added later, and only on artifacts that
      // already have at least one match, so "nothing matches" really
      // returns nothing instead of leaking every recent/pinned row.
      var relevance = 0;
      if (title.includes(q)) relevance += 100;
      qTokens.forEach(function (t) { if (title.includes(t)) relevance += 15; });
      var bodyHits = 0;
      qTokens.forEach(function (t) {
        var n = 0, i = 0;
        while ((i = hay.indexOf(t, i)) !== -1) { n++; i += t.length; if (n > 8) break; }
        bodyHits += Math.min(n, 8);
      });
      relevance += Math.min(bodyHits, 40);

      if (relevance === 0) return { a: a, score: 0 };

      // Tie-breakers only apply to already-relevant artifacts.
      var score = relevance;
      score += (a.updated_at ? Math.max(0, 8 - daysAgo(a.updated_at)) : 0);
      if (a.pinned) score += 4;
      return { a: a, score: score };
    });
    scored.sort(function (x, y) { return y.score - x.score; });
    return scored.filter(function (s) { return s.score > 0; }).map(function (s) { return s.a; });
  }

  function daysAgo(iso) {
    try { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }
    catch (_) { return 999; }
  }

  // Public entry point. If `supabase` is supplied, tries server-side
  // FTS first and falls back; otherwise pure client-side.
  async function smartSearch(query, artifacts, supabase) {
    if (!query) return artifacts || [];
    var server = supabase ? await searchServer(supabase, query, 50) : null;
    if (server && server.length) {
      // Server returned ids — preserve its order, fall back to client if
      // the server result is suspiciously empty for a non-trivial query.
      var byId = Object.create(null);
      (artifacts || []).forEach(function (a) { byId[a.id] = a; });
      var ordered = server.map(function (r) { return byId[r.id] || r; }).filter(Boolean);
      if (ordered.length) return ordered;
    }
    return clientRank(query, artifacts || []);
  }

  // ─── 5. Reuse: seed a new chat with an artifact ──────────────────
  // The chat page reads the seed on load and pre-fills its composer.
  // We use sessionStorage so the seed survives the page transition but
  // doesn't linger across browser sessions.

  var SEED_KEY = 'hx.workbench.seed';

  function seedChat(artifact) {
    if (!artifact) return;
    var payload = {
      kind: artifact.kind,
      title: artifact.title,
      content: artifact.content,
      language: artifact.language || null,
      artifact_id: artifact.id,
      ts: Date.now(),
    };
    try { sessionStorage.setItem(SEED_KEY, JSON.stringify(payload)); } catch (_) {}
    window.location.href = '/chat.html?seed=' + encodeURIComponent(artifact.id);
  }

  function readSeed() {
    try {
      var raw = sessionStorage.getItem(SEED_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(SEED_KEY);
      var p = JSON.parse(raw);
      // Stale guard: ignore seeds older than 60s — almost certainly a
      // leftover from a previous navigation the user abandoned.
      if (!p || (Date.now() - (p.ts || 0)) > 60000) return null;
      return p;
    } catch (_) { return null; }
  }

  // ─── Compose the seed into a useful first user message ───────────
  // The artifact comes in raw; we wrap it in a tiny preamble so the
  // model knows the user wants to *continue* on it, not re-explain it.
  function composeSeedPrompt(seed) {
    if (!seed) return '';
    var headline = seed.title ? ('"' + seed.title + '"') : 'this saved artifact';
    var fence = seed.language ? '```' + seed.language + '\n' : '```\n';
    return 'Picking up from ' + headline + ' in my workbench. Continue from here:\n\n'
      + fence + (seed.content || '') + '\n```';
  }

  window.HX.workbench = {
    classify: classify,
    shouldSave: shouldSave,
    autoCapture: autoCapture,
    smartSearch: smartSearch,
    seedChat: seedChat,
    readSeed: readSeed,
    composeSeedPrompt: composeSeedPrompt,
  };
})();
