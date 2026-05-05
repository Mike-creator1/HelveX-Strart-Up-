/*! CreateX · Template loader
 *  Runs on every builder page. If the user clicked "Use Template" in the
 *  AI Template Hub, this picks up the seed from localStorage and:
 *   - Pre-fills the composer with the template's starter prompt
 *   - Overrides the builder's CFG.system with the template's system prompt
 *   - Replaces the welcome screen with a template-aware briefing
 *     (capabilities, personality, suggested test questions for agents)
 *   - Renders a "Template Applied" banner with Details / Change / Remove
 *   - Tracks template_applied via cxTrack
 */
(function () {
  if (window.__cxTplLoaderInit) return;
  window.__cxTplLoaderInit = true;

  var BUILDER_PAGES = ['agents','website-builder','app-builder','workflow-builder','model-builder'];
  var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  if (BUILDER_PAGES.indexOf(page) === -1) return;

  /* ── Read seed ── */
  var tpl = null;
  try { tpl = JSON.parse(localStorage.getItem('createx_template_seed') || 'null'); } catch (e) {}
  if (!tpl || tpl.builder !== page) return;
  window.__cxTpl = tpl;

  /* ── Helpers ── */
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function $(id){return document.getElementById(id)}

  /* ── Styles ── */
  var CSS = ''
    + '@keyframes cxTplIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}'
    + '@keyframes cxTplFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
    + '.cx-tpl-banner{margin:14px 24px 0;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(124,61,255,.1),rgba(24,215,255,.05));border:1px solid rgba(124,61,255,.28);display:flex;gap:14px;align-items:center;animation:cxTplIn .3s ease;font-family:Inter,sans-serif;flex-wrap:wrap}'
    + '.cx-tpl-banner-icon{width:34px;height:34px;border-radius:9px;background:rgba(124,61,255,.16);border:1px solid rgba(124,61,255,.32);color:#b489ff;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
    + '.cx-tpl-banner-info{flex:1;min-width:140px}'
    + '.cx-tpl-banner-l{font:900 9px Inter,sans-serif;letter-spacing:.12em;color:#b489ff;text-transform:uppercase;margin-bottom:2px}'
    + '.cx-tpl-banner-n{font:800 13px Inter,sans-serif;color:#fff;letter-spacing:-.005em}'
    + '.cx-tpl-banner-actions{display:flex;gap:6px;flex-wrap:wrap}'
    + '.cx-tpl-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.72);padding:6px 11px;border-radius:7px;font:700 11px Inter,sans-serif;cursor:pointer;transition:.16s;font-family:inherit}'
    + '.cx-tpl-btn:hover{background:rgba(255,255,255,.09);color:#fff;border-color:rgba(255,255,255,.2)}'
    + '.cx-tpl-btn.danger:hover{background:rgba(255,90,90,.1);color:#ff7a7a;border-color:rgba(255,90,90,.32)}'
    + '.cx-tpl-btn.primary{background:linear-gradient(135deg,#19c9ff,#7c3dff);color:#fff;border-color:transparent}'
    + '.cx-tpl-modal{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:.22s;backdrop-filter:blur(8px)}'
    + '.cx-tpl-modal.open{opacity:1;pointer-events:auto}'
    + '.cx-tpl-modal-box{background:#0c0e15;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 40px 100px rgba(0,0,0,.7);font-family:Inter,sans-serif;animation:cxTplFade .2s ease}'
    + '.cx-tpl-modal-h{padding:22px 26px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;gap:14px;align-items:flex-start}'
    + '.cx-tpl-modal-c{padding:18px 26px;overflow-y:auto;flex:1}'
    + '.cx-tpl-modal-f{padding:14px 26px 20px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}'
    + '.cx-tpl-modal-x{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-left:auto;font-family:inherit}'
    + '.cx-tpl-modal-x:hover{background:rgba(255,255,255,.1);color:#fff}'
    + '.cx-tpl-section{margin-bottom:18px}'
    + '.cx-tpl-section-l{font:900 10px Inter,sans-serif;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}'
    + '.cx-tpl-pre{background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:13px 15px;font:600 11.5px ui-monospace,monospace;color:#c9d1d9;line-height:1.6;max-height:200px;overflow-y:auto;white-space:pre-wrap}'
    + '.cx-tpl-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}'
    + '.cx-tpl-list li{font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72);padding-left:18px;position:relative;line-height:1.55}'
    + '.cx-tpl-list li::before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%;background:#65efff}'
    + '.cx-tpl-welcome{display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 24px 16px;animation:cxTplFade .45s ease both}'
    + '.cx-tpl-w-icon{width:62px;height:62px;border-radius:18px;background:rgba(124,61,255,.12);border:1px solid rgba(124,61,255,.32);display:flex;align-items:center;justify-content:center;margin-bottom:18px;color:#b489ff}'
    + '.cx-tpl-w-eyebrow{font:900 10px Inter,sans-serif;color:#b489ff;text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px}'
    + '.cx-tpl-w-name{font:900 24px Inter,sans-serif;color:#fff;letter-spacing:-.025em;margin-bottom:8px}'
    + '.cx-tpl-w-desc{font:600 13.5px Inter,sans-serif;color:rgba(255,255,255,.55);max-width:480px;line-height:1.6;margin:0 auto}'
    + '.cx-tpl-grid{max-width:540px;margin:24px auto 16px;padding:0 24px;width:100%;font-family:Inter,sans-serif;animation:cxTplFade .55s ease both}'
    + '.cx-tpl-block{margin-bottom:16px}'
    + '.cx-tpl-block-l{font:900 9.5px Inter,sans-serif;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px}'
    + '.cx-tpl-pers{font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72);line-height:1.55;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:11px 14px}'
    + '.cx-tpl-chips{display:flex;flex-wrap:wrap;gap:6px}'
    + '.cx-tpl-chip{font:700 10.5px Inter,sans-serif;color:#65efff;background:rgba(24,215,255,.07);border:1px solid rgba(24,215,255,.22);padding:4px 10px;border-radius:6px}'
    + '.cx-tpl-chip.violet{color:#b489ff;background:rgba(124,61,255,.07);border-color:rgba(124,61,255,.24)}'
    + '.cx-tpl-chip.green{color:#6dffa7;background:rgba(57,245,138,.07);border-color:rgba(57,245,138,.22)}'
    + '.cx-tpl-quick{display:flex;flex-direction:column;gap:6px}'
    + '.cx-tpl-quick button{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.78);padding:9px 13px;border-radius:9px;font:600 12.5px Inter,sans-serif;cursor:pointer;text-align:left;transition:.16s;font-family:inherit;line-height:1.45}'
    + '.cx-tpl-quick button:hover{background:rgba(24,215,255,.06);border-color:rgba(24,215,255,.28);color:#fff}';

  function injectCSS(){if(document.getElementById('cx-tpl-style'))return;var s=document.createElement('style');s.id='cx-tpl-style';s.textContent=CSS;document.head.appendChild(s)}

  /* ── Override system prompt as soon as CFG appears ── */
  function applySystemPrompt(){
    if (!window.CFG) return false;
    if (tpl.payload && tpl.payload.systemPrompt) window.CFG.system = tpl.payload.systemPrompt;
    return true;
  }

  /* ── Render template-aware welcome (replaces builder's default) ── */
  function renderWelcome(){
    var msgs = $('chat-messages'); if (!msgs) return;
    var p = tpl.payload || {};
    var a = p.agent, w = p.website, ap = p.app, wf = p.workflow, ct = p.content;

    var html = ''
      + '<div class="cx-tpl-welcome">'
      +   '<div class="cx-tpl-w-icon"><svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg></div>'
      +   '<div class="cx-tpl-w-eyebrow">Template Applied</div>'
      +   '<div class="cx-tpl-w-name">'+esc(tpl.name)+'</div>'
      +   '<div class="cx-tpl-w-desc">'+esc(tpl.description)+'</div>'
      + '</div>'
      + '<div class="cx-tpl-grid">';

    if (a) {
      if (a.name)        html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Agent name</div><div class="cx-tpl-pers">'+esc(a.name)+'</div></div>';
      if (a.personality) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Personality &amp; tone</div><div class="cx-tpl-pers">'+esc(a.personality)+'</div></div>';
      if (a.capabilities && a.capabilities.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Capabilities</div><div class="cx-tpl-chips">'+a.capabilities.map(function(x){return '<span class="cx-tpl-chip">'+esc(x)+'</span>'}).join('')+'</div></div>';
      if (a.tools && a.tools.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Tools / actions</div><div class="cx-tpl-chips">'+a.tools.map(function(x){return '<span class="cx-tpl-chip violet">'+esc(x)+'</span>'}).join('')+'</div></div>';
      if (a.starterMessages && a.starterMessages.length) {
        html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Try asking</div><div class="cx-tpl-quick">';
        a.starterMessages.forEach(function(m){html += '<button onclick="cxTplQuickStart('+JSON.stringify(m).replace(/"/g,'&quot;')+')">'+esc(m)+'</button>'});
        html += '</div></div>';
      }
    } else if (w) {
      if (w.designTone)              html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Design tone</div><div class="cx-tpl-pers">'+esc(w.designTone)+'</div></div>';
      if (w.sections && w.sections.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Sections</div><div class="cx-tpl-chips">'+w.sections.map(function(x){return '<span class="cx-tpl-chip green">'+esc(x)+'</span>'}).join('')+'</div></div>';
    } else if (ap) {
      if (ap.features && ap.features.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Key features</div><div class="cx-tpl-chips">'+ap.features.map(function(x){return '<span class="cx-tpl-chip">'+esc(x)+'</span>'}).join('')+'</div></div>';
      if (ap.dataModel)              html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Data model</div><div class="cx-tpl-pers">'+esc(ap.dataModel)+'</div></div>';
    } else if (wf) {
      if (wf.trigger)                 html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Trigger</div><div class="cx-tpl-pers">'+esc(wf.trigger)+'</div></div>';
      if (wf.integrations && wf.integrations.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Integrations</div><div class="cx-tpl-chips">'+wf.integrations.map(function(x){return '<span class="cx-tpl-chip violet">'+esc(x)+'</span>'}).join('')+'</div></div>';
      if (wf.steps && wf.steps.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Steps</div><ul class="cx-tpl-list" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px 16px 12px 30px">'+wf.steps.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div>';
    } else if (ct) {
      if (ct.tone)     html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Tone &amp; voice</div><div class="cx-tpl-pers">'+esc(ct.tone)+'</div></div>';
      if (ct.audience) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Audience</div><div class="cx-tpl-pers">'+esc(ct.audience)+'</div></div>';
      if (ct.structure && ct.structure.length) html += '<div class="cx-tpl-block"><div class="cx-tpl-block-l">Structure</div><div class="cx-tpl-chips">'+ct.structure.map(function(x){return '<span class="cx-tpl-chip green">'+esc(x)+'</span>'}).join('')+'</div></div>';
    }

    html += '</div>';
    msgs.innerHTML = html;
  }

  /* ── Pre-fill composer with starter prompt ── */
  function prefillComposer(){
    var inp = $('c-input'); if (!inp) return;
    var p = tpl.payload || {};
    var prompt = p.starterPrompt || tpl.prompt || '';
    if (prompt && !inp.value) {
      inp.value = prompt;
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 200) + 'px';
    }
  }

  /* ── Banner ── */
  function injectBanner(){
    if ($('cx-tpl-banner')) return;
    var area = document.querySelector('.chat-area, .main-area');
    if (!area) return;
    var b = document.createElement('div');
    b.id = 'cx-tpl-banner';
    b.className = 'cx-tpl-banner';
    b.innerHTML =
      '<div class="cx-tpl-banner-icon"><svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg></div>'
      + '<div class="cx-tpl-banner-info"><div class="cx-tpl-banner-l">Template Applied</div><div class="cx-tpl-banner-n">'+esc(tpl.name)+'</div></div>'
      + '<div class="cx-tpl-banner-actions">'
      +   '<button class="cx-tpl-btn" onclick="cxTplDetails()">Details</button>'
      +   '<button class="cx-tpl-btn" onclick="cxTplEdit()">Edit prompt</button>'
      +   '<button class="cx-tpl-btn" onclick="cxTplChange()">Change</button>'
      +   '<button class="cx-tpl-btn danger" onclick="cxTplRemove()">Remove</button>'
      + '</div>';
    area.insertBefore(b, area.firstChild);
  }

  /* ── Public actions ── */
  window.cxTplQuickStart = function(msg){
    var inp = $('c-input'); if (!inp) return;
    inp.value = msg;
    inp.style.height='auto'; inp.style.height = Math.min(inp.scrollHeight,200)+'px';
    inp.focus();
  };
  window.cxTplEdit = function(){
    var inp = $('c-input'); if (!inp) return;
    inp.focus();
    inp.scrollIntoView({behavior:'smooth',block:'center'});
    if (window.cxToast) cxToast('Edit the prompt below — your changes are kept on send.');
  };
  window.cxTplChange = function(){ location.href = 'templates.html'; };
  window.cxTplRemove = function(){
    if (!confirm('Remove the applied template? This will reset the builder to its default state.')) return;
    localStorage.removeItem('createx_template_seed');
    location.href = page + '.html';
  };
  window.cxTplDetails = function(){ showDetails(); };

  function sectionList(label, items){
    return '<div class="cx-tpl-section"><div class="cx-tpl-section-l">'+label+'</div><ul class="cx-tpl-list">'+items.map(function(i){return '<li>'+esc(i)+'</li>'}).join('')+'</ul></div>';
  }

  function showDetails(){
    var m = $('cx-tpl-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'cx-tpl-modal'; m.className = 'cx-tpl-modal';
      m.onclick = function(e){ if (e.target === m) m.classList.remove('open'); };
      document.body.appendChild(m);
    }
    var p = tpl.payload || {}, a = p.agent, w = p.website, ap = p.app, wf = p.workflow, ct = p.content;
    var html = '<div class="cx-tpl-modal-box">'
      + '<div class="cx-tpl-modal-h">'
      +   '<div class="cx-tpl-banner-icon"><svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"/></svg></div>'
      +   '<div style="flex:1;min-width:0"><div style="font:900 17px Inter,sans-serif;color:#fff;letter-spacing:-.01em">'+esc(tpl.name)+'</div><div style="font:700 11px Inter,sans-serif;color:#b489ff;text-transform:uppercase;letter-spacing:.08em;margin-top:3px">'+esc(tpl.category||'')+' · '+esc(tpl.difficulty||'')+'</div></div>'
      +   '<button class="cx-tpl-modal-x" onclick="document.getElementById(\'cx-tpl-modal\').classList.remove(\'open\')">×</button>'
      + '</div>'
      + '<div class="cx-tpl-modal-c">'
      +   '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Description</div><p style="font:600 13px Inter,sans-serif;color:rgba(255,255,255,.72);line-height:1.65">'+esc(tpl.description)+'</p></div>';
    if (p.systemPrompt)  html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">System prompt (overrides builder default)</div><pre class="cx-tpl-pre">'+esc(p.systemPrompt)+'</pre></div>';
    if (p.starterPrompt) html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Starter input (pre-fills the composer)</div><pre class="cx-tpl-pre">'+esc(p.starterPrompt)+'</pre></div>';
    if (a) {
      if (a.name)         html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Agent name</div><p style="font:700 13px Inter,sans-serif;color:#fff">'+esc(a.name)+'</p></div>';
      if (a.personality)  html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Personality &amp; tone</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72);line-height:1.55">'+esc(a.personality)+'</p></div>';
      if (a.capabilities)         html += sectionList('Capabilities', a.capabilities);
      if (a.tools)                html += sectionList('Tools / actions', a.tools);
      if (a.knowledgeSuggestions) html += sectionList('Knowledge base sources', a.knowledgeSuggestions);
      if (a.workflowSuggestions)  html += sectionList('Workflow suggestions', a.workflowSuggestions);
      if (a.behaviorRules)        html += sectionList('Behavior rules', a.behaviorRules);
      if (a.successCriteria)      html += sectionList('Success criteria', a.successCriteria);
      if (a.starterMessages)      html += sectionList('Suggested test questions', a.starterMessages);
    }
    if (w) {
      if (w.designTone)  html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Design tone</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(w.designTone)+'</p></div>';
      if (w.sections)    html += sectionList('Sections', w.sections);
      if (w.colorScheme) html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Color scheme</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(w.colorScheme)+'</p></div>';
    }
    if (ap) {
      if (ap.features)   html += sectionList('Key features', ap.features);
      if (ap.dataModel)  html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Data model</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(ap.dataModel)+'</p></div>';
    }
    if (wf) {
      if (wf.trigger)      html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Trigger</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(wf.trigger)+'</p></div>';
      if (wf.steps)        html += sectionList('Steps', wf.steps);
      if (wf.integrations) html += sectionList('Integrations', wf.integrations);
      if (wf.errorHandling)html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Error handling</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(wf.errorHandling)+'</p></div>';
    }
    if (ct) {
      if (ct.tone)       html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Tone</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(ct.tone)+'</p></div>';
      if (ct.audience)   html += '<div class="cx-tpl-section"><div class="cx-tpl-section-l">Audience</div><p style="font:600 12.5px Inter,sans-serif;color:rgba(255,255,255,.72)">'+esc(ct.audience)+'</p></div>';
      if (ct.structure)  html += sectionList('Structure', ct.structure);
    }
    html += '</div>'
      + '<div class="cx-tpl-modal-f">'
      +   '<button class="cx-tpl-btn" onclick="cxTplChange()">Change template</button>'
      +   '<button class="cx-tpl-btn danger" onclick="cxTplRemove()">Remove template</button>'
      +   '<button class="cx-tpl-btn primary" onclick="document.getElementById(\'cx-tpl-modal\').classList.remove(\'open\')">Continue</button>'
      + '</div></div>';
    m.innerHTML = html;
    m.classList.add('open');
  }

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') { var m = $('cx-tpl-modal'); if (m && m.classList.contains('open')) m.classList.remove('open'); }
  });

  /* ── Init: wait for builder DOM + CFG ── */
  function tryApply(){
    var inp = $('c-input'), msgs = $('chat-messages');
    var sysReady = applySystemPrompt();
    if (inp && msgs && sysReady) {
      injectCSS();
      renderWelcome();
      prefillComposer();
      injectBanner();
      if (window.cxTrack) cxTrack('template_applied', { module: page, metadata: { template_id: tpl.id, template_name: tpl.name } });
      return true;
    }
    return false;
  }
  var n = 0;
  (function loop(){ if (tryApply()) return; if (n++ > 80) return; setTimeout(loop, 60); })();
})();
