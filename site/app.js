(function () {
  'use strict';

  var D = { procs: [], byId: {}, kids: {}, systems: [], flows: {}, controls: [] };
  var S = { q: '', level: '1-3', fn: '', system: '', status: '', rel: '', scope: true, flowOnly: false, limit: 250,
            tq: '', tScope: true, open: {}, sel: null, zoom: null, sc: 1, role: '' };
  var view = document.getElementById('view');
  var qInput = document.getElementById('q');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function hashFor(id) { return '#p-' + String(id).replace(/\./g, '-'); }
  function idFromHash(h) { return h.slice(2).replace(/-/g, '.'); }
  function stKey(s) { return 'st-' + String(s || 'Not Started').replace(/\s+/g, ''); }
  function pill(s) { return s ? '<span class="pill ' + stKey(s) + '">' + esc(s) + '</span>' : ''; }
  function parentId(p) {
    var parts = p.id.split('.');
    if (p.lvl <= 1) return null;
    if (p.lvl === 2) return parts[0] + '.0';
    return parts.slice(0, -1).join('.');
  }
  function sysKey(name) {
    return ({ 'EOS (Ninety.io)': 'EOS', 'OpenAir / SuiteProjects Pro': 'OpenAir', 'Apollo.io': 'Apollo', 'Arctic Wolf Managed Awareness': 'Arctic Wolf' })[name] || name;
  }
  var FLAG = '<svg class="flagic" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 15V2M3 2.5h9l-2 3 2 3H3" fill="#fde4e1" stroke="#b42318" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  /* ---------- Glossary ---------- */
  var GLOSS = [
    ['People and roles', [
      ['partner', 'Partner', 'The Sparkhound deal owner: the partner-level seller who owns the opportunity. Not a channel partner.'],
      ['alliance', 'Alliance/Channel', 'Outside firms Sparkhound sells with or through, such as Microsoft and Pax8.'],
      ['xo', 'XO (Experience Owner)', "The client's relationship owner, by default the Project Controller; the policies call this role Customer Success Manager. Approves billable time and invoices, runs client onboarding, offboarding, account reviews and renewals. The Managing Partner over Operations assigns XOs."],
      ['pc', 'Project Controller', "Controls a project's budget, time and billing. By default this is the client's XO."],
      ['eo', 'EO (Executive Owner)', "The Sparkhound executive accountable for a client account. Engages the client's executives when an invoice is 60+ days past due."],
      ['mt', 'Managed Technology', 'The practice that supports managed, co-managed, NOC and endpoint management clients: a dispatcher, Tier 1 to 3 and Centralized Services engineers.'],
      ['sd', 'Service Desk practice', "Tier 1 support for large enterprise clients: Tier 1, Process Leads and Service Managers. Escalations go to the client's own IT."],
      ['nln', 'Next Level Now', "The outside firm that runs Sparkhound's accounting, including AR and the controller role."]
    ]],
    ['On a process page', [
      ['owner', 'Process owner', 'The person or role who runs the process day to day and keeps its documentation right. They confirm the flow in review and answer its open questions.'],
      ['acct', 'Accountable leader', 'The leader ultimately answerable for the process. Decisions the process owner cannot make go to them.'],
      ['sup', 'Supporting systems', 'Systems that feed the system of record or work alongside it, such as Avalara calculating tax on invoices in Halo.'],
      ['ctl', 'Compliance mapping', 'The framework a process helps satisfy, such as SOC 2, GAAP or CMMC.'],
      ['bu', 'Business unit', 'Where the process applies: Corporate, Managed Services, Professional Services, or All BUs.'],
      ['pri', 'Priority', 'The order processes get documented in: 1 - Now, 2 - Next, 3 - Later.'],
      ['soc2', 'SOC 2 control', "A control from Sparkhound's SOC 2 control matrix, with an ID like CM-CC6.2-01, mapped to the processes it supports. The code after CM- is the Trust Services Criterion it addresses."],
      ['tsc', 'Trust Services Criteria', 'The AICPA criteria SOC 2 is audited against: Security (CC1 to CC9), plus Availability (A1), Processing Integrity (PI1), Confidentiality (C1) and Privacy (P1 to P8).'],
      ['added', 'Sparkhound addition', 'A process Sparkhound runs that the APQC framework does not break out, added from a Sparkhound policy. Its number ends in S1, S2 and so on under the nearest APQC parent, for example 4.2.3.S1.'],
      ['links', 'Linked processes', 'What feeds a process (upstream) and what it hands off to (downstream), so work can be followed from lead to cash.']
    ]],
    ['The framework', [
      ['apqc', 'APQC PCF', "APQC's Process Classification Framework, cross-industry version 8.0: a standard list of business processes. This library is built on it."],
      ['pcf', 'PCF ID', "A process's number in the APQC framework, such as 9.2.4: category 9, process group 9.2, process 9.2.4."],
      ['level', 'Level (L1 to L5)', 'Depth in the framework: L1 category, L2 process group, L3 process, L4 activity, L5 task. Most flows document an L3 process.'],
      ['scope', 'In scope', 'A process Sparkhound runs and documents. Out-of-scope APQC processes stay in the workbook, marked rather than deleted.'],
      ['relevance', 'Relevance', 'How central a process is to Sparkhound: Core, Supporting or Not Applicable.'],
      ['fn', 'EOS function', "The function on Sparkhound's EOS Accountability Chart that owns the process: Leadership, Sales, Operations, Finance or Shared Services."],
      ['sor', 'System of record', 'The system that holds the authoritative data for a process from 1/1/2027. Supporting systems feed it or use it.'],
      ['status', 'Status', 'How far the documentation has got: Not Started, Draft, In Review (waiting for the process owner to confirm), Published or Needs Update.']
    ]],
    ['Reading a flow', [
      ['kc', 'Key control', 'A check built into a step that prevents an error (Preventive) or catches one afterwards (Detective). Shown with an orange border. IDs look like KC-AR-01.'],
      ['assumed', 'Assumption to confirm', 'A step drawn from an assumption rather than a confirmed answer. Shown with a dashed outline.'],
      ['flag', 'Review flag', 'A decision made in a design session that the process owner still has to confirm. Listed on the Review page.']
    ]]
  ];
  var GDEF = {}; GLOSS.forEach(function (g) { g[1].forEach(function (t) { GDEF[t[0]] = t; }); });
  function term(key, label) {
    var t = GDEF[key];
    return '<a class="term" href="#glossary/' + key + '" data-tip="' + esc(t[2]) + '">' + esc(label || t[1]) + '</a>';
  }
  var LANE_TERMS = [[/\bXO\b/, 'xo'], [/\bEO\b/, 'eo'], [/(?<!Managing )\bPartner\b/, 'partner'], [/\bProject Controller\b/, 'pc'], [/\bAlliance\/Channel\b/, 'alliance'],
    [/\bManaged Technology\b/, 'mt'], [/\bService Desk practice\b/, 'sd'], [/\bNext Level Now\b/, 'nln']];
  function linkTerms(text) {
    var out = esc(text), used = false;
    LANE_TERMS.forEach(function (lt) {
      var m = !used && out.match(lt[0]);
      if (m) { out = out.replace(lt[0], term(lt[1], m[0])); used = true; }
    });
    return out;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function flagsFor(k) {
    var fl = D.flows[k], out = [];
    if (fl) fl.steps.forEach(function (st, i) { if (st.flag) out.push({ process: k, where: 'Step ' + (i + 1) + ': ' + st.title, text: st.flag }); });
    D.controls.forEach(function (c) { if (c.flag && c.process === k && !(fl && fl.steps.some(function (st) { return st.control === c.id && st.flag; }))) out.push({ process: k, where: c.id + ' ' + c.name, text: c.flag }); });
    return out;
  }
  function controlsFor(id) { return D.controls.filter(function (c) { return c.process === id || c.process.indexOf(id + '.') === 0; }); }
  function flowsUnder(id) { return Object.keys(D.flows).filter(function (k) { return k === id || k.indexOf(id + '.') === 0; }); }

  /* ---------- Roles: who takes part in a process ---------- */
  var ROLES = [
    ['partner', 'Partner (deal owner)', /(?<!Managing )\bPartner\b/],
    ['sm', 'Sales & Marketing (Marketing, BDR, SDR)', /Marketing|\bBDR\b|\bSDR\b/],
    ['xo', 'Experience Owner (XO) / Project Controller', /\bXO\b|Experience Owner|Project Controller|Customer Success Manager/],
    ['eo', 'Executive Owner (EO)', /\bEO\b|Executive Owner/],
    ['slo', 'Service line owner', /Service line owner/i],
    ['pl', 'Practice lead / delivery resources', /Practice lead|\bdelivery\b/i],
    ['mt', 'Managed Technology', /Managed Technology/],
    ['sd', 'Service Desk practice', /Service Desk/],
    ['ar', 'AR Clerk / Billing', /\bAR\b|AR Clerk|Billing/],
    ['fin', 'Finance / Controller (Next Level Now)', /Next Level Now|(?<!Project )Controller|^Finance\b/],
    ['mpo', 'Managing Partner, Operations', /Managing Partner/],
    ['ceo', 'CEO', /\bCEO\b/]
  ];
  var SOC_ROLES = { 'Exec Mgmt': 'Executive management', 'Board': 'Board of directors', 'HR': 'HR', 'Compliance': 'Compliance', 'Security': 'Security', 'CISO': 'Security',
    'SOC': 'Security operations (SOC / incident response)', 'IR Team': 'Security operations (SOC / incident response)', 'IT Ops': 'IT operations', 'IT Mgmt': 'IT management',
    'Change Mgmt': 'IT management', 'Internal Audit': 'Internal audit', 'Network Eng': 'Network and cloud engineering', 'Cloud Eng': 'Network and cloud engineering',
    'Facilities': 'Facilities', 'Physical Security': 'Facilities', 'DevOps': 'Development', 'Dev': 'Development', 'QA': 'Development', 'Product Mgmt': 'Development',
    'Procurement': 'Procurement', 'Service Delivery': 'Service delivery', 'Operations': 'Service delivery', 'Data Governance': 'Data governance', 'Legal': 'Legal', 'Privacy': 'Privacy' };
  function buildRoles() {
    D.roleIdx = {}; D.roleOpts = [];
    var add = function (key, id) { (D.roleIdx[key] = D.roleIdx[key] || {})[id] = 1; };
    var texts = {};
    var put = function (id, t) { if (t) (texts[id] = texts[id] || []).push(t); };
    D.procs.forEach(function (p) { put(p.id, p.owner); put(p.id, p.acct); });
    Object.keys(D.flows).forEach(function (k) {
      var fl = D.flows[k];
      fl.lanes.forEach(function (l, i) { if (fl.steps.some(function (st) { return st.lane === i; })) { put(k, l.name); put(k, l.sub); } });
      fl.steps.forEach(function (st) { put(k, st.who); });
    });
    D.controls.forEach(function (c) { put(c.process, c.owner); });
    Object.keys(texts).forEach(function (id) {
      texts[id].forEach(function (t) { ROLES.forEach(function (r) { if (r[2].test(t)) add(r[0], id); }); });
    });
    ROLES.forEach(function (r) { if (D.roleIdx[r[0]]) D.roleOpts.push(['role:' + r[0], r[1], 'Process roles']); D.roleIdx['role:' + r[0]] = D.roleIdx[r[0]]; });
    var socLabels = {};
    D.soc.controls.forEach(function (c) {
      c.owner.split('/').forEach(function (o) {
        var lab = SOC_ROLES[o.trim()]; if (!lab) return;
        socLabels[lab] = 1; c.processes.forEach(function (k) { add('soc:' + lab, k); });
      });
    });
    Object.keys(socLabels).sort().forEach(function (lab) { D.roleOpts.push(['soc:' + lab, lab, 'SOC 2 control owners']); });
  }
  function roleLabel(key) { var o = D.roleOpts.filter(function (x) { return x[0] === key; })[0]; return o ? o[1] : ''; }
  function socFor(id) { return D.socBy[id] || []; }
  function socUnder(id) {
    var out = [], seen = {};
    Object.keys(D.socBy).forEach(function (k) { if (k.indexOf(id + '.') === 0) D.socBy[k].forEach(function (c) { if (!seen[c.id]) { seen[c.id] = 1; out.push(c); } }); });
    return out;
  }
  function socDomain(code) { return D.soc.domains.filter(function (d) { return d.code === code; })[0]; }

  function load() {
    Promise.all(['data/processes.json', 'data/systems.json', 'data/flows.json', 'data/soc2.json', 'data/dataflows.json'].map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); });
    })).then(function (res) {
      D.procs = res[0]; D.systems = res[1]; D.flows = res[2].flows; D.controls = res[2].controls; D.soc = res[3]; D.df = res[4];
      D.socBy = {}; D.soc.controls.forEach(function (c) { c.processes.forEach(function (k) { (D.socBy[k] = D.socBy[k] || []).push(c); }); });
      D.procs.forEach(function (p) {
        D.byId[p.id] = p;
        var par = parentId(p);
        p.parent = par;
        if (par) (D.kids[par] = D.kids[par] || []).push(p.id);
        var kc = controlsFor(p.id).map(function (c) { return c.id + ' ' + c.name; }).join(' ');
        var sc2 = (D.socBy[p.id] || []).map(function (c) { return c.id + ' ' + c.tsc + ' ' + c.objective; }).join(' ');
        p.hay = [p.id, p.name, p.owner, p.acct, p.sor, p.sup, p.fn, p.bu, p.ctl, p.kpi, p.notes, kc, sc2, (p.pol || []).join(' '), p.added ? 'sparkhound addition' : ''].join(' ').toLowerCase();
      });
      buildRoles();
      document.getElementById('flowCount').textContent = Object.keys(D.flows).length;
      var nf = 0; Object.keys(D.flows).forEach(function (k) { nf += flagsFor(k).length; }); document.getElementById('flagCount').textContent = nf || '';
      route();
    }).catch(function () {
      view.innerHTML = '<div class="card empty">The process data could not be loaded. Serve this folder over HTTP (not file://) so the data files can be read.</div>';
    });
  }

  function setNav(v) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav'), function (a) { a.classList.toggle('on', a.getAttribute('data-v') === v); });
  }

  function route() {
    var h = location.hash.replace(/^#/, '');
    window.scrollTo(0, 0);
    if (h !== 'library' && h !== 'taxonomy' && S.q) { S.q = ''; S.tq = ''; qInput.value = ''; }
    if (h.indexOf('p-') === 0 && D.byId[idFromHash(h)]) { setNav(''); return renderProcess(idFromHash(h)); }
    if (h === 'taxonomy') { setNav('taxonomy'); return renderTree(); }
    if (h === 'flows') { setNav('flows'); return renderFlows(); }
    if (h === 'systems') { setNav('systems'); return renderSystems(); }
    if (h === 'dataflow') { setNav('dataflow'); return renderDataflow(); }
    if (h === 'controls' || h.indexOf('controls/') === 0) { setNav('controls'); return renderControls(h.split('/')[1]); }
    if (h === 'review') { setNav('review'); return renderReview(); }
    if (h === 'glossary' || h.indexOf('glossary/') === 0) { setNav('glossary'); return renderGlossary(h.split('/')[1]); }
    if (h === 'library') { setNav('library'); return renderLibrary(); }
    setNav('home'); renderHome();
  }
  window.addEventListener('hashchange', route);
  document.querySelector('.skip').addEventListener('click', function (e) { e.preventDefault(); view.focus(); view.scrollIntoView(); });

  /* Term definitions: one shared tooltip, shown on hover and keyboard focus */
  var tip = document.createElement('div');
  tip.id = 'tip'; tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  var tipFor = null;
  function showTip(el) {
    tipFor = el; tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; el.setAttribute('aria-describedby', 'tip');
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    var top = r.bottom + 6 + h > window.innerHeight ? r.top - h - 6 : r.bottom + 6;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null; tip.hidden = true; }
  document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('.term'); if (t) showTip(t); else if (tipFor && !tipFor.matches(':focus')) hideTip(); });
  document.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('term')) showTip(e.target); else hideTip(); });
  document.addEventListener('focusout', function (e) { if (e.target === tipFor) hideTip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, true);

  qInput.addEventListener('input', function () {
    S.q = qInput.value.trim(); S.limit = 250;
    var h = location.hash.replace(/^#/, '');
    if (h === 'taxonomy') { S.tq = S.q; renderTreeBody(); return; }
    if (h !== 'library') { location.hash = 'library'; return; }
    renderLibraryBody();
  });

  /* ---------- Home ---------- */
  function renderHome() {
    var nFlows = Object.keys(D.flows).length;
    var inScope = D.procs.filter(function (p) { return p.scope === 'Yes'; }).length;
    var nFlags = 0; Object.keys(D.flows).forEach(function (k) { nFlags += flagsFor(k).length; });
    var link = function (h, t) { return '<a href="#' + h + '">' + t + '</a>'; };
    var row = function (title, body) { return '<div class="howrow"><h3>' + title + '</h3><p>' + body + '</p></div>'; };
    var shape = function (type, ctl, as) { var w = type === 'decision' ? 46 : 56, h = type === 'decision' ? 34 : 30; return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + shapeSvg(type, w, h, ctl, as) + '</svg>'; };
    var key = function (svg, title, body) { return '<div class="keyrow"><span class="keyshape">' + svg + '</span><div><b>' + title + '</b><p>' + body + '</p></div></div>'; };
    view.innerHTML = '<article class="home">' +
      '<header><h1>Sparkhound Process Library</h1>' +
      '<p class="lead">How Sparkhound runs its business, written down: who owns each process, the system it runs in, and the checks that keep it right. It describes the operating model for 1/1/2027, when HaloPSA, QuickBooks Online and Paylocity become the systems of record.</p>' +
      '<p class="state">This is a working prototype. ' + nFlows + ' processes have full flows and are being reviewed with their owners now. The other ' + (inScope - nFlows).toLocaleString() + ' in-scope processes are listed with their suggested systems, but aren\'t written up yet.</p></header>' +

      '<section><h2>How to use it</h2>' +
        row('Find a process', 'Type in the search box at the top of any page. It matches process names, owners, systems and controls. To browse instead, use the ' + link('library', 'Library') + ', a filterable table, or the ' + link('taxonomy', 'Taxonomy') + ', the full tree of processes. To see every process your job takes part in, pick your role in the Library\'s Role filter.') +
        row('Read a flow', link('flows', 'Process flows') + ' lists the processes documented so far. Each flow has one row per role, and the work runs left to right. Select any step to see who does it, in which system, and under which control. Flows open fitted to your screen; use + and − (or Ctrl and the mouse wheel) to zoom in.') +
        row('See what\'s still open', link('review', 'Review') + ' collects the ' + nFlags + ' decisions waiting for a process owner to confirm. Each flow also lists its open questions at the bottom of the page.') +
        row('Check systems and controls', link('systems', 'Systems') + ' shows which system is the record for what from 1/1/2027, and ' + link('dataflow', 'Data flows') + ' shows how data moves between them. ' + link('controls', 'Controls') + ' lists the key controls and the step each one sits on.') +
        row('Look up a term', 'The ' + link('glossary', 'Glossary') + ' explains roles like XO and EO and terms like PCF ID. Words with a dotted underline anywhere on the site show their definition when you point at them.') +
      '</section>' +

      '<section><h2>What\'s recorded for each process</h2>' +
        '<p>Every process page uses the same fields, so you can compare any two processes side by side.</p>' +
        row('Process owner', 'The person or role who runs the process day to day and keeps its page right. They confirm the flow in review and answer its open questions. &ldquo;Not assigned&rdquo; means no one has been named yet.') +
        row('Accountable leader', 'The leader ultimately answerable for the process. Decisions the process owner can\'t make, and disagreements between teams, go to them.') +
        row('System of record', 'The one system that holds the authoritative data for the process from 1/1/2027. If two systems disagree, the system of record wins. <b>Supporting systems</b> feed it or work alongside it: invoices live in HaloPSA, for example, while Avalara calculates the tax on them.') +
        row('Key controls', 'Checks built into the process so mistakes are prevented or caught. <b>Preventive</b> controls stop a problem before it happens, such as the XO approving an invoice before it is sent. <b>Detective</b> controls find one afterwards, such as reconciling applied payments to bank deposits. Each control has an ID like KC-AR-01, an owner, the system it runs in, and the evidence that proves it ran. They are all listed on ' + link('controls', 'Controls') + '.') +
        row('SOC 2 controls', 'The controls from Sparkhound\'s SOC 2 control matrix, with IDs like CM-CC6.2-01. Each one is mapped to the processes it supports, so a process page shows the SOC 2 controls that depend on it, and ' + link('controls', 'Controls') + ' lists every control with its owner, frequency and how it is tested.') +
        row('Compliance mapping', 'The framework the process helps satisfy, such as SOC 2, GAAP or CMMC. Auditors and the compliance team use it to find every process behind a requirement.') +
        row('Status', 'How far the documentation has got. ' + pill('Not Started') + ' nothing written yet. ' + pill('Draft') + ' written but not checked. ' + pill('In Review') + ' waiting for the process owner to confirm. ' + pill('Published') + ' confirmed and current. ' + pill('Needs Update') + ' out of date with how the work is really done.') +
        row('Open questions and flags', '<b>Open questions</b> are things still unknown, listed at the bottom of a flow. <b>Flags</b> are decisions already made in a design session that the owner still has to confirm. Both are cleared in review.') +
        row('Linked processes', 'What feeds a process and what it hands off to. Follow the links to trace work end to end, from a new lead to cash in the bank.') +
        row('Where it sits', 'Each process has an APQC number and level, a parent process, the ' + term('fn', 'EOS function') + ' and business unit it belongs to, its relevance to Sparkhound, and a priority (1&nbsp;-&nbsp;Now, 2&nbsp;-&nbsp;Next, 3&nbsp;-&nbsp;Later) that sets the order processes get documented in.') +
      '</section>' +

      '<section><h2>Reading a flow</h2>' +
        '<div class="keygrid">' +
        key(shape('start'), 'Start and end', 'Where a process begins and where it hands off. An end that names another process links to it.') +
        key(shape('process'), 'Step', 'Work someone does. The lane says who; the box names the system.') +
        key(shape('decision'), 'Decision', 'A question, with a labelled arrow for each answer.') +
        key(shape('document'), 'Document', 'A record the process produces, such as a signed SOW.') +
        key(shape('process', 1), 'Key control', 'An orange border marks a check that prevents or catches an error.') +
        key(shape('process', 0, 1), 'Assumption', 'A dashed outline means the step is assumed and not yet confirmed.') +
        key('<svg width="56" height="30" viewBox="0 0 56 30" aria-hidden="true" style="overflow:visible">' + shapeSvg('process', 56, 30) + '<circle cx="50" cy="6" r="8" fill="#fff" stroke="#b42318" stroke-width="1.5"/><path d="M47 11V2.5M47 3h5.5l-1.3 2 1.3 2H47" fill="#fde4e1" stroke="#b42318" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>', 'Review flag', 'A decision made in a design session that the process owner still has to confirm.') +
        '</div>' +
      '</section>' +

      '<section><h2>Something wrong or missing?</h2>' +
        '<p>Every process page names its owner. Tell them, or bring it to the next review session. Once a correction is agreed, the process is updated and the site republished.</p>' +
      '</section>' +
    '</article>';
  }

  /* ---------- Library ---------- */
  function filtered() {
    var q = S.q.toLowerCase(), sys = S.system.toLowerCase();
    return D.procs.filter(function (p) {
      if (S.scope && p.scope !== 'Yes') return false;
      if (S.level === '1-3' && p.lvl > 3) return false;
      if (S.level && S.level !== '1-3' && String(p.lvl) !== S.level) return false;
      if (S.fn && p.fn !== S.fn) return false;
      if (S.status && p.status !== S.status) return false;
      if (S.rel && p.rel !== S.rel) return false;
      if (S.flowOnly && !flowsUnder(p.id).length) return false;
      if (S.role && !(D.roleIdx[S.role] || {})[p.id]) return false;
      if (sys && (p.sor + ' ' + p.sup).toLowerCase().indexOf(sys) < 0) return false;
      if (q && p.hay.indexOf(q) < 0) return false;
      return true;
    });
  }
  function opts(values, cur, all) {
    return '<option value="">' + all + '</option>' + values.map(function (v) {
      var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v;
      return '<option value="' + esc(val) + '"' + (val === cur ? ' selected' : '') + '>' + esc(lab) + '</option>';
    }).join('');
  }
  function uniq(field) { var o = {}; D.procs.forEach(function (p) { if (p[field]) o[p[field]] = 1; }); return Object.keys(o).sort(); }

  function renderLibrary() {
    var inScope = D.procs.filter(function (p) { return p.scope === 'Yes'; }).length;
    view.innerHTML =
      '<div><h1>Process Library</h1><p class="sub">Sparkhound\'s processes, numbered by the ' + term('apqc', 'APQC framework') + '. ' + inScope.toLocaleString() + ' of the framework\'s ' + D.procs.length.toLocaleString() + ' processes are ' + term('scope', 'in scope') + ' for Sparkhound.</p></div>' +
      '<div class="filters">' +
        '<label><span>' + term('level', 'Level') + '</span><select id="fLevel">' + opts([['1-3', 'Levels 1–3'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3'], ['4', 'Level 4'], ['5', 'Level 5']], S.level, 'All levels') + '</select></label>' +
        '<label><span>' + term('fn', 'EOS function') + '</span><select id="fFn">' + opts(uniq('fn'), S.fn, 'All functions') + '</select></label>' +
        '<label><span>' + term('sor', 'System') + '</span><select id="fSys">' + opts(D.systems.filter(function (s) { return s.status !== 'Retired'; }).map(function (s) { return [sysKey(s.name), s.name]; }), S.system, 'All systems') + '</select></label>' +
        '<label><span>' + term('status', 'Status') + '</span><select id="fSt">' + opts(['Not Started', 'Draft', 'In Review', 'Published', 'Needs Update'], S.status, 'All statuses') + '</select></label>' +
        '<label><span>' + term('relevance', 'Relevance') + '</span><select id="fRel">' + opts(['Core', 'Supporting', 'Not Applicable'], S.rel, 'All') + '</select></label>' +
        '<label><span>Role</span><select id="fRole"><option value="">All roles</option>' + ['Process roles', 'SOC 2 control owners'].map(function (g) {
          return '<optgroup label="' + g + '">' + D.roleOpts.filter(function (o) { return o[2] === g; }).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === S.role ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</optgroup>';
        }).join('') + '</select></label>' +
        '<label class="chk"><input type="checkbox" id="fScope"' + (S.scope ? ' checked' : '') + '> In scope only</label>' +
        '<label class="chk"><input type="checkbox" id="fFlow"' + (S.flowOnly ? ' checked' : '') + '> Has a process flow</label>' +
      '</div>' +
      '<div id="libBody"></div>';
    var bind = function (id, key, prop) {
      document.getElementById(id).addEventListener('change', function (e) { S[key] = prop ? e.target.checked : e.target.value; S.limit = 250; renderLibraryBody(); });
    };
    document.getElementById('fRole').addEventListener('change', function (e) { S.role = e.target.value; S.limit = 250; if (S.role && S.level === '1-3') S.level = ''; renderLibrary(); document.getElementById('fRole').focus(); });
    bind('fLevel', 'level'); bind('fFn', 'fn'); bind('fSys', 'system'); bind('fSt', 'status'); bind('fRel', 'rel'); bind('fScope', 'scope', 1); bind('fFlow', 'flowOnly', 1);
    renderLibraryBody();
  }

  function renderLibraryBody() {
    var el = document.getElementById('libBody'); if (!el) return renderLibrary();
    var rows = filtered(), shown = rows.slice(0, S.limit);
    if (!rows.length) {
      el.innerHTML = '<div class="card empty"><p style="margin:0 0 12px">No processes match ' + (S.q ? '“' + esc(S.q) + '” with these filters' : 'these filters') + '.</p><button class="btn" id="clearAll">Clear search and filters</button></div>';
      document.getElementById('clearAll').addEventListener('click', function () {
        S.q = ''; qInput.value = ''; S.level = '1-3'; S.fn = ''; S.system = ''; S.status = ''; S.rel = ''; S.role = ''; S.scope = true; S.flowOnly = false; S.limit = 250;
        renderLibrary(); qInput.focus();
      });
      return;
    }
    el.innerHTML = '<div class="card tablewrap"><table><thead><tr><th>' + term('pcf', 'PCF ID') + '</th><th>Process</th><th>' + term('level', 'Level') + '</th><th>Process owner</th><th>' + term('fn', 'Function') + '</th><th>' + term('sor', 'System of record') + '</th><th>' + term('kc', 'Controls') + '</th><th>' + term('soc2', 'SOC 2') + '</th><th>Flow</th><th>' + term('status', 'Status') + '</th></tr></thead><tbody>' +
      shown.map(function (p) {
        var kc = controlsFor(p.id).length, s2 = socFor(p.id).length, fl = D.flows[p.id];
        return '<tr' + (fl ? ' class="hl"' : '') + '><td class="mono" style="color:var(--muted)">' + esc(p.id) + '</td>' +
          '<td style="padding-left:' + (12 + (p.lvl - 1) * 20) + 'px;' + (p.lvl === 1 ? 'font-weight:600' : '') + '"><a href="' + hashFor(p.id) + '">' + esc(p.name) + '</a>' + (p.added ? ' <span class="chip add">Sparkhound</span>' : '') + '</td>' +
          '<td><span class="lvl">L' + p.lvl + '</span></td><td>' + esc(p.owner) + '</td><td style="color:var(--ink2)">' + esc(p.fn) + '</td>' +
          '<td style="color:var(--ink2)">' + esc(p.sor) + '</td><td style="text-align:center">' + (kc || '') + '</td><td style="text-align:center">' + (s2 || '') + '</td>' +
          '<td>' + (fl ? '<a href="' + hashFor(p.id) + '">View</a>' : '') + '</td><td>' + pill(p.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin-top:10px"><span class="muted">Showing ' + shown.length + ' of ' + rows.length + ' matching processes' + (S.role ? ' that include ' + esc(roleLabel(S.role)) : '') + '</span>' +
      (rows.length > shown.length ? '<button class="btn" id="more">Show more</button>' : '') + '</div>';
    var m = document.getElementById('more');
    if (m) m.addEventListener('click', function () { S.limit += 500; renderLibraryBody(); });
  }

  /* ---------- Taxonomy ---------- */
  function isOpen(id) {
    if (S.open.hasOwnProperty(id)) return S.open[id];
    return !!S.tq;
  }
  function renderTree() {
    S.tq = S.q;
    view.innerHTML = '<div><h1>Taxonomy</h1><p class="sub">The APQC hierarchy as Sparkhound uses it. Open or close any branch, or set how many levels to show.</p></div>' +
      '<div class="filters" style="align-items:center">' +
        '<span class="muted">Show levels:</span>' +
        [1, 2, 3, 4, 5].map(function (n) { return '<button class="btn" data-lv="' + n + '">' + (n === 1 ? 'Level 1 only' : '1–' + n) + '</button>'; }).join('') +
        '<label class="chk" style="margin:0 0 0 12px"><input type="checkbox" id="tScope"' + (S.tScope ? ' checked' : '') + '> In scope only</label>' +
      '</div>' +
      '<div class="card tree" id="treeBody"></div>';
    document.getElementById('tScope').addEventListener('change', function (e) { S.tScope = e.target.checked; renderTreeBody(); });
    Array.prototype.forEach.call(view.querySelectorAll('[data-lv]'), function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-lv'); S.open = {};
        D.procs.forEach(function (p) { S.open[p.id] = p.lvl < n; });
        renderTreeBody();
      });
    });
    renderTreeBody();
  }
  function renderTreeBody() {
    var el = document.getElementById('treeBody'); if (!el) return;
    var q = S.tq.toLowerCase(), keep = null;
    if (q) {
      keep = {};
      D.procs.forEach(function (p) {
        if (S.tScope && p.scope !== 'Yes') return;
        if (p.hay.indexOf(q) >= 0) { var x = p; while (x) { keep[x.id] = 1; x = D.byId[x.parent]; } }
      });
    }
    var out = [], n = 0;
    function vis(p) { return (!S.tScope || p.scope === 'Yes') && (!keep || keep[p.id]); }
    function walk(id, depth) {
      var p = D.byId[id]; if (!p || !vis(p)) return;
      if (n++ > 2500) return;
      var kids = (D.kids[id] || []).filter(function (k) { return vis(D.byId[k]); });
      var open = kids.length && isOpen(id);
      var name = esc(p.name);
      if (q) { var i = p.name.toLowerCase().indexOf(q); if (i >= 0) name = esc(p.name.slice(0, i)) + '<span class="mark">' + esc(p.name.slice(i, i + q.length)) + '</span>' + esc(p.name.slice(i + q.length)); }
      out.push('<div class="tnode" style="padding-left:' + (4 + depth * 22) + 'px">' +
        (kids.length ? '<button class="tog' + (open ? ' open' : '') + '" data-id="' + esc(id) + '" aria-expanded="' + !!open + '" aria-label="' + (open ? 'Collapse ' : 'Expand ') + esc(p.name) + '"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="#4f5b64" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' : '<span class="dot" aria-hidden="true">•</span>') +
        '<span class="lvl" style="flex:none">L' + p.lvl + '</span><span class="mono" style="min-width:60px;color:var(--muted)">' + esc(id) + '</span>' +
        '<a href="' + hashFor(id) + '" style="' + (depth === 0 ? 'font-weight:600' : '') + '">' + name + '</a>' +
        (kids.length && !open ? '<span class="muted" style="font-size:12px">' + kids.length + '</span>' : '') +
        (D.flows[id] ? ' <span class="chip sor" style="margin:0">Flow</span>' : '') + (p.added ? ' <span class="chip add" style="margin:0">Sparkhound</span>' : '') +
        '<span style="margin-left:auto">' + (p.status && p.status !== 'Not Started' ? pill(p.status) : '') + '</span></div>');
      if (open) kids.forEach(function (k) { walk(k, depth + 1); });
    }
    D.procs.filter(function (p) { return p.lvl === 1; }).forEach(function (p) { walk(p.id, 0); });
    el.innerHTML = out.length ? out.join('') : '<div class="empty">No process names match “' + esc(S.tq) + '”. Try a shorter word, or search the Library, which also matches owners, systems and controls.</div>';
    Array.prototype.forEach.call(el.querySelectorAll('.tog'), function (b) {
      b.addEventListener('click', function () { var id = b.getAttribute('data-id'); S.open[id] = !isOpen(id); renderTreeBody(); var nb = el.querySelector('.tog[data-id="' + id + '"]'); if (nb) nb.focus(); });
    });
  }

  /* ---------- Process record ---------- */
  function renderProcess(id) {
    var p = D.byId[id], par = D.byId[p.parent], flow = D.flows[id];
    var crumbs = [], x = par;
    while (x) { crumbs.unshift('<a href="' + hashFor(x.id) + '">' + esc(x.id + ' ' + x.name) + '</a>'); x = D.byId[x.parent]; }
    var kids = (D.kids[id] || []).map(function (k) { return D.byId[k]; });
    var kcs = controlsFor(id), childFlows = flowsUnder(id).filter(function (k) { return k !== id; });
    var sys = function (s, cls) { return s ? s.split(/,\s*/).map(function (v) { return '<span class="chip ' + (cls || '') + '">' + esc(v) + '</span>'; }).join('') : '<span class="muted">—</span>'; };

    var html = '<div><nav class="crumbs" aria-label="Breadcrumb"><a href="#library">Process Library</a>' + crumbs.map(function (c) { return '<span aria-hidden="true">›</span>' + c; }).join('') + '</nav>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px"><span class="mono" style="font-size:15px;color:var(--muted)">' + esc(p.id) + '</span><h1 style="font-size:24px">' + esc(p.name) + '</h1>' + pill(p.status) + '</div></div>';

    if (flow) {
      html += '<section class="card" aria-label="Process flow">' +
        '<div class="sec" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between;padding-bottom:6px">' +
          '<div><h2 style="margin:0">Process flow<span class="muted" style="font-weight:400"><span class="sep" aria-hidden="true">·</span>' + esc(flow.span) + '</span></h2><p class="muted" style="margin:4px 0 0">' + esc(flow.summary) + ' Select a step for details.</p></div>' +
          '<div class="zoom" role="group" aria-label="Zoom"><button class="btn zbtn" id="zOut" type="button" aria-label="Zoom out">−</button><button class="btn" id="zFit" type="button">Fit to width</button><span class="zlvl" id="zLvl" aria-live="polite"></span><button class="btn zbtn" id="zIn" type="button" aria-label="Zoom in">+</button></div>' +
        '</div>' +
        '<details class="legendbox"' + (window.innerWidth > 860 ? ' open' : '') + '><summary>How to read this flow</summary><div class="legend">' + legend() + '</div></details>' +
        '<div class="flowbody"><div class="lanewrap" id="laneWrap"></div>' +
        '<aside class="steppanel" id="stepPanel" aria-label="Step details" hidden></aside></div>' +
      '</section>';
    }

    html += '<div class="cols"><div class="main">' +
      '<section class="card" aria-label="Process fields"><div class="grid">' +
        f(term('level', 'Level'), 'L' + p.lvl) + f('Parent process', par ? '<a href="' + hashFor(par.id) + '">' + esc(par.id + ' ' + par.name) + '</a>' : '—', 1) +
        f(term('owner', 'Process owner'), p.owner ? esc(p.owner) : '<span class="muted">Not assigned</span>', 1) + f(term('acct', 'Accountable leader'), p.acct ? esc(p.acct) : '<span class="muted">Not assigned</span>', 1) +
        f(term('fn', 'EOS function'), p.fn) + f(term('bu', 'Business unit'), p.bu) + f(term('relevance', 'Relevance'), p.rel) + f(term('pri', 'Priority'), p.pri) + f('APQC metrics', p.metrics ? p.metrics + ' benchmarks' : '—') + f(term('added', 'Source'), p.added ? 'Sparkhound addition (not in APQC)' : 'APQC PCF v8.0', 1) + (p.pol ? f('Governing policy', p.pol.join('; ')) : '') +
      '</div></section>' +
      (p.desc ? '<section class="card sec"><div class="fl">APQC description</div><p style="margin:4px 0 0;font-size:14px;line-height:1.55">' + esc(p.desc) + '</p>' + (p.notes ? '<div class="fl" style="margin-top:12px">Sparkhound notes</div><p style="margin:4px 0 0;font-size:14px;line-height:1.55">' + esc(p.notes) + '</p>' : '') + '</section>' : '');

    if (flow) {
      html += '<section class="card tablewrap" aria-label="Workflow steps"><div class="sec" style="padding-bottom:6px"><h2 style="margin:0">Workflow steps</h2></div><table><thead><tr><th>#</th><th>Step</th><th>Lane</th><th>Responsible</th><th>System</th><th>Control</th></tr></thead><tbody>' +
        flow.steps.map(function (s, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + (s.apqc ? '<span class="mono" style="color:var(--muted)">' + esc(s.apqc) + '</span> ' : '') + esc(s.title) + '</td><td>' + esc(flow.lanes[s.lane].name) + '</td><td>' + esc(s.who || '') + '</td><td>' + esc(s.system || '') + '</td><td>' + (s.control ? '<a class="chip kc" href="#controls">' + esc(s.control) + '</a>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></section>';
    } else if (childFlows.length) {
      html += '<section class="card sec"><h2>Process flows in this branch</h2><div style="display:flex;flex-wrap:wrap;gap:10px">' + childFlows.map(function (k) {
        return '<a class="linkcard" href="' + hashFor(k) + '"><small>' + esc(k) + '</small><strong>' + esc(D.byId[k].name) + ' →</strong></a>'; }).join('') + '</div></section>';
    }
    if (kids.length) {
      html += '<section class="card tablewrap"><div class="sec" style="padding-bottom:6px"><h2 style="margin:0">Sub-processes</h2></div><table><thead><tr><th>PCF ID</th><th>Process</th><th>Owner</th><th>System of record</th><th>Status</th></tr></thead><tbody>' +
        kids.map(function (k) { return '<tr><td class="mono" style="color:var(--muted)">' + esc(k.id) + '</td><td><a href="' + hashFor(k.id) + '">' + esc(k.name) + '</a>' + (D.flows[k.id] ? ' <span class="chip sor">Flow</span>' : '') + (k.scope !== 'Yes' ? ' <span class="chip">Out of scope</span>' : '') + '</td><td>' + esc(k.owner) + '</td><td>' + esc(k.sor) + '</td><td>' + pill(k.status) + '</td></tr>'; }).join('') +
        '</tbody></table></section>';
    }
    html += '</div><div class="aside">';
    var fls = flow ? flagsFor(id) : [];
    if (fls.length) {
      html += '<section class="card sec flagcard"><h2 style="margin:0 0 8px;display:flex;gap:8px;align-items:center">' + FLAG + 'Flagged for review</h2><p class="muted" style="margin:0 0 8px">Decisions made in the design sessions that the process owner should confirm.</p><ul>' + fls.map(function (x) { return '<li><b>' + esc(x.where) + '.</b> ' + esc(x.text) + '</li>'; }).join('') + '</ul></section>';
    }
    if (flow && flow.questions && flow.questions.length) {
      html += '<section class="card sec qs"><h2 style="margin:0 0 8px">Open questions</h2><p class="muted" style="margin:0 0 8px">This flow is a draft. Dashed boxes are assumptions until these are answered.</p><ol>' + flow.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></section>';
    }
    if (flow && (flow.upstream.length || flow.downstream.length)) {
      html += '<section class="card sec" style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0">Linked processes</h2>' +
        flow.upstream.map(function (k) { return '<a class="linkcard" href="' + hashFor(k) + '"><small>Upstream</small><strong>' + esc(k + ' ' + D.byId[k].name) + ' →</strong></a>'; }).join('') +
        flow.downstream.map(function (k) { return '<a class="linkcard" href="' + hashFor(k) + '"><small>Hands off to</small><strong>' + esc(k + ' ' + D.byId[k].name) + ' →</strong></a>'; }).join('') + '</section>';
    }
    html += '<section class="card sec"><h2>Systems</h2><div class="fl">System of record</div><div class="fv">' + sys(p.sor, 'sor') + '</div><div class="fl" style="margin-top:10px">Supporting</div><div class="fv">' + sys(p.sup) + '</div></section>';
    html += '<section class="card sec"><h2>Controls</h2>' + (kcs.length ? kcs.map(function (c) {
      return '<div style="margin-bottom:10px"><span class="chip kc">' + esc(c.id) + '</span> <strong style="font-size:14px">' + esc(c.name) + '</strong><div class="muted" style="margin-top:2px">' + esc(c.description) + '</div></div>'; }).join('') : '<p class="muted" style="margin:0">No key controls documented yet.</p>') +
      (p.ctl ? '<div class="fl" style="margin-top:6px">Compliance mapping</div><div class="fv">' + sys(p.ctl) + '</div>' : '') + '</section>';
    var s2 = socFor(id), s2u = socUnder(id).filter(function (c) { return s2.indexOf(c) < 0; });
    if (s2.length || s2u.length) {
      html += '<section class="card sec"><h2>' + term('soc2', 'SOC 2 controls') + '</h2>' + s2.map(function (c) {
        return '<div class="soc-item"><a class="chip soc" href="#controls/' + esc(c.id) + '">' + esc(c.id) + '</a> <strong>' + esc(c.objective) + '</strong><div class="muted">' + esc(c.tsc) + '<span class="sep" aria-hidden="true">·</span>' + esc(c.owner) + '<span class="sep" aria-hidden="true">·</span>' + esc(c.freq) + '</div></div>';
      }).join('') + (s2u.length ? '<p class="muted" style="margin:' + (s2.length ? '10px' : '0') + ' 0 0">' + (s2.length ? 'Plus ' : '') + s2u.length + ' SOC 2 control' + (s2u.length === 1 ? '' : 's') + ' on its sub-processes: ' + s2u.map(function (c) { return '<a href="#controls/' + esc(c.id) + '">' + esc(c.id) + '</a>'; }).join(', ') + '.</p>' : '') + '</section>';
    }
    html += '</div></div>';
    view.innerHTML = html;
    if (flow) {
      S.step = null; S.zoom = null;
      drawFlow(flow);
      var zoomTo = function (z) {
        var w = document.getElementById('laneWrap'), old = S.sc;
        var cx = (w.scrollLeft + w.clientWidth / 2) / old, cy = (w.scrollTop + w.clientHeight / 2) / old;
        S.zoom = z; drawFlow(flow);
        w.scrollLeft = cx * S.sc - w.clientWidth / 2; w.scrollTop = cy * S.sc - w.clientHeight / 2;
      };
      document.getElementById('zIn').addEventListener('click', function () { zoomTo(Math.min(2, Math.round(S.sc * 1.25 * 20) / 20)); });
      document.getElementById('zOut').addEventListener('click', function () { zoomTo(Math.max(0.3, Math.round(S.sc / 1.25 * 20) / 20)); });
      document.getElementById('zFit').addEventListener('click', function () { zoomTo(null); });
      document.getElementById('laneWrap').addEventListener('wheel', function (e) {
        if (!e.ctrlKey) return; e.preventDefault();
        zoomTo(e.deltaY < 0 ? Math.min(2, Math.round(S.sc * 1.1 * 20) / 20) : Math.max(0.3, Math.round(S.sc / 1.1 * 20) / 20));
      }, { passive: false });
    }
  }
  function f(label, val, raw) { return '<div><div class="fl">' + label + '</div><div class="fv">' + (raw ? (val || '—') : esc(val || '—')) + '</div></div>'; }

  /* ---------- Swimlane renderer (wide format) ---------- */
  var SHAPE = { process: { w: 200, h: 112 }, decision: { w: 200, h: 120 }, start: { w: 196, h: 62 }, end: { w: 196, h: 62 }, document: { w: 196, h: 86 } };
  var COLORS = { start: ['#fff1c2', '#d9a521'], end: ['#fff1c2', '#d9a521'], process: ['#dbe8fb', '#5f8fd8'], decision: ['#fde2f1', '#d36ba6'], document: ['#ffffff', '#8fa3c0'] };
  function shapeSvg(type, w, h, ctl, assumed) {
    var c = COLORS[type] || COLORS.process;
    var stroke = (ctl ? 'stroke="#c25e10" stroke-width="2.6"' : 'stroke="' + c[1] + '" stroke-width="1.5"') + (assumed ? ' stroke-dasharray="7 5"' : '');
    if (type === 'decision') return '<polygon points="' + (w / 2) + ',2 ' + (w - 2) + ',' + (h / 2) + ' ' + (w / 2) + ',' + (h - 2) + ' 2,' + (h / 2) + '" fill="' + c[0] + '" ' + stroke + '/>';
    if (type === 'start' || type === 'end') return '<rect x="1.5" y="1.5" width="' + (w - 3) + '" height="' + (h - 3) + '" rx="' + (h / 2 - 1.5) + '" fill="' + c[0] + '" ' + stroke + '/>';
    if (type === 'document') return '<path d="M2 2H' + (w - 2) + 'V' + (h - 14) + 'C' + (w * 0.75) + ' ' + (h - 28) + ' ' + (w * 0.25) + ' ' + (h + 2) + ' 2 ' + (h - 14) + 'Z" fill="' + c[0] + '" ' + stroke + '/>';
    return '<rect x="1.5" y="1.5" width="' + (w - 3) + '" height="' + (h - 3) + '" rx="3" fill="' + c[0] + '" ' + stroke + '/>';
  }
  function legend() {
    var item = function (type, label, ctl, as) { var w = type === 'decision' ? 34 : 40, h = type === 'decision' ? 24 : 22; return '<span><svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + shapeSvg(type, w, h, ctl, as) + '</svg>' + label + '</span>'; };
    return item('start', 'Start / end') + item('process', 'Process step') + item('decision', 'Decision') + item('document', 'Document') + item('process', 'Control point', 1) + item('process', 'Assumption to confirm', 0, 1) + '<span>' + FLAG + 'Flagged for owner review</span>' +
      '<span>Each box: APQC ID<span class="sep" aria-hidden="true">·</span>System<span class="sep" aria-hidden="true">·</span>Control. Lanes show who owns each step.</span>';
  }

  function drawFlow(flow) {
    var wrap = document.getElementById('laneWrap');
    var LABW = 170, PITCH = 248, ROWH = 152, PADX = 24, PADT = 34;
    var laneRows = flow.lanes.map(function () { return 1; });
    var maxCol = 0;
    flow.steps.forEach(function (s) { laneRows[s.lane] = Math.max(laneRows[s.lane], (s.row || 0) + 1); maxCol = Math.max(maxCol, s.col); });
    var laneTop = [], y = PADT;
    laneRows.forEach(function (r, i) { laneTop[i] = y; y += r * ROWH; });
    var H = y, W = LABW + (maxCol + 1) * PITCH + PADX;
    var pos = {};
    flow.steps.forEach(function (s) {
      var sz = SHAPE[s.type] || SHAPE.process;
      pos[s.id] = { s: s, w: sz.w, h: sz.h, cx: LABW + s.col * PITCH + PITCH / 2, cy: laneTop[s.lane] + (s.row || 0) * ROWH + ROWH / 2 };
    });
    function port(p, side) {
      if (side === 'right') return [p.cx + p.w / 2, p.cy];
      if (side === 'left') return [p.cx - p.w / 2, p.cy];
      if (side === 'top') return [p.cx, p.cy - p.h / 2];
      return [p.cx, p.cy + p.h / 2];
    }
    function horiz(side) { return side === 'left' || side === 'right'; }
    function route(a, b, fs, ts) {
      var P = port(a, fs), Q = port(b, ts), px = P[0], py = P[1], qx = Q[0], qy = Q[1];
      var d = 'M' + px + ' ' + py;
      if (horiz(fs) && !horiz(ts)) d += 'H' + qx + 'V' + qy;
      else if (!horiz(fs) && horiz(ts)) d += 'V' + qy + 'H' + qx;
      else if (horiz(fs) && horiz(ts)) {
        if (fs === ts) { var gx = (fs === 'right' ? Math.max(px, qx) + 30 : Math.min(px, qx) - 30); d += 'H' + gx + 'V' + qy + 'H' + qx; }
        else if (py === qy) d += 'H' + qx;
        else { var mx = (px + qx) / 2; d += 'H' + mx + 'V' + qy + 'H' + qx; }
      } else {
        if (fs === ts) { var gy = (fs === 'top' ? Math.min(py, qy) - 34 : Math.max(py, qy) + 34); d += 'V' + gy + 'H' + qx + 'V' + qy; }
        else if (px === qx) d += 'V' + qy;
        else { var my = (py + qy) / 2; d += 'V' + my + 'H' + qx + 'V' + qy; }
      }
      var lab = fs === 'right' ? [px + 8, py - 9, 'start'] : fs === 'left' ? [px - 8, py - 9, 'end'] : fs === 'top' ? [px + 8, py - (fs === ts ? 40 : 12), 'start'] : [px + 8, py + 18, 'start'];
      return { d: d, lab: lab };
    }

    var html = '<div class="lanes" id="lanesInner" style="width:' + W + 'px;height:' + H + 'px">';
    flow.lanes.forEach(function (l, i) {
      html += '<div class="laneband' + (i % 2 ? ' alt' : '') + '" style="top:' + laneTop[i] + 'px;height:' + (laneRows[i] * ROWH) + 'px;width:' + W + 'px"></div>' +
        '<div class="lanelab" style="top:' + laneTop[i] + 'px;height:' + (laneRows[i] * ROWH) + 'px;width:' + LABW + 'px"><b>' + linkTerms(l.name) + '</b>' + (l.sub ? '<span>' + linkTerms(l.sub) + '</span>' : '') + '</div>';
    });
    var paths = [], labels = [];
    flow.steps.forEach(function (s) {
      (s.next || []).forEach(function (n) {
        var a = pos[s.id], b = pos[n.to]; if (!b) return;
        var r = route(a, b, n.from || 'right', n.toSide || 'left');
        paths.push('<path d="' + r.d + '" fill="none" stroke="#2c3a4f" stroke-width="1.5"' + (n.dash ? ' stroke-dasharray="6 5"' : ' marker-end="url(#ah)"') + '/>');
        if (n.label) labels.push('<text x="' + r.lab[0] + '" y="' + r.lab[1] + '" text-anchor="' + r.lab[2] + '">' + esc(n.label) + '</text>');
      });
    });
    html += '<svg class="edges" width="' + W + '" height="' + H + '" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" fill="#2c3a4f"/></marker></defs>' + paths.join('') + labels.join('') + '</svg>';

    flow.steps.forEach(function (s, i) {
      var p = pos[s.id], lab;
      if (s.type === 'start' || s.type === 'end') lab = '<span>' + esc(s.title) + '</span>';
      else if (s.type === 'decision') lab = '<span>' + esc(s.title) + '</span>' + (s.control ? '<i>Control</i>' : '');
      else lab = '<b>' + (s.apqc ? esc(s.apqc) + ' ' : '') + esc(s.title) + '</b>' + (s.note ? '<span>' + esc(s.note) + '</span>' : '') + (s.system ? '<span>System: ' + esc(s.system) + '</span>' : '') + (s.control ? '<i>Control: ' + esc(s.controlNote || s.control) + '</i>' : '');
      html += '<button type="button" class="node node-' + s.type + '" data-step="' + esc(s.id) + '" aria-label="Step ' + (i + 1) + ': ' + esc(s.title) + '" style="left:' + (p.cx - p.w / 2) + 'px;top:' + (p.cy - p.h / 2) + 'px;width:' + p.w + 'px;height:' + p.h + 'px">' +
        '<svg class="shape" width="' + p.w + '" height="' + p.h + '" aria-hidden="true">' + shapeSvg(s.type, p.w, p.h, !!s.control, !!s.assumed) + '</svg>' +
        (s.flag ? '<span class="flagb" title="Flagged for review">' + FLAG + '</span>' : '') + '<span class="lab">' + lab + '</span></button>';
    });
    html += '</div>';
    wrap.innerHTML = '<div id="scaleBox">' + html + '</div>';
    var box = document.getElementById('scaleBox'), inner = document.getElementById('lanesInner');
    var fitSc = Math.min(1, (wrap.clientWidth - 2) / W);
    var sc = S.zoom == null ? fitSc : S.zoom;
    S.sc = sc;
    inner.style.transform = 'scale(' + sc + ')'; inner.style.transformOrigin = '0 0';
    box.style.width = (W * sc) + 'px'; box.style.height = (H * sc) + 'px';
    var zl = document.getElementById('zLvl'), zf = document.getElementById('zFit');
    if (zl) zl.textContent = Math.round(sc * 100) + '%';
    if (zf) zf.setAttribute('aria-pressed', S.zoom == null ? 'true' : 'false');
    var labs = wrap.querySelectorAll('.lanelab');
    wrap.onscroll = function () { var x = wrap.scrollLeft / sc; Array.prototype.forEach.call(labs, function (l) { l.style.left = x + 'px'; }); };
    wrap.onscroll();
    Array.prototype.forEach.call(wrap.querySelectorAll('.node'), function (b) {
      b.addEventListener('click', function () { selectStep(flow, b.getAttribute('data-step')); });
      if (b.getAttribute('data-step') === S.step) b.classList.add('sel');
    });
  }

  /* Step details: docked beside the flow on wide screens, below it on narrow ones */
  function selectStep(flow, id) {
    var panel = document.getElementById('stepPanel'), wrap = document.getElementById('laneWrap');
    var s = flow.steps.filter(function (x) { return x.id === id; })[0]; if (!s || !panel) return;
    var wasHidden = panel.hidden;
    S.step = id; panel.hidden = false;
    showStep(flow, s);
    if (wasHidden && S.zoom == null) drawFlow(flow);
    var node = null;
    Array.prototype.forEach.call(wrap.querySelectorAll('.node'), function (x) { x.classList.toggle('sel', x.getAttribute('data-step') === id); if (x.getAttribute('data-step') === id) node = x; });
    if (node) {
      var k = S.sc, nl = node.offsetLeft * k, nr = nl + node.offsetWidth * k, vl = wrap.scrollLeft + 180 * k, vr = wrap.scrollLeft + wrap.clientWidth - 16;
      if (nr > vr) wrap.scrollLeft += nr - vr; else if (nl < vl) wrap.scrollLeft -= vl - nl;
      var nt = node.offsetTop * k, nb = nt + node.offsetHeight * k;
      if (nb > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = nb - wrap.clientHeight + 16; else if (nt < wrap.scrollTop) wrap.scrollTop = nt - 16;
    }
    var h = document.getElementById('stepTitle');
    var stacked = getComputedStyle(panel.parentNode).flexDirection === 'column';
    if (h) { h.focus({ preventScroll: true }); if (stacked) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function closeStep(flow) {
    var panel = document.getElementById('stepPanel'); if (!panel || panel.hidden) return;
    var id = S.step; S.step = null; panel.hidden = true;
    if (S.zoom == null) drawFlow(flow);
    var wrap = document.getElementById('laneWrap'), back = null;
    Array.prototype.forEach.call(wrap.querySelectorAll('.node'), function (x) { x.classList.remove('sel'); if (x.getAttribute('data-step') === id) back = x; });
    if (back) back.focus();
  }
  function showStep(flow, s) {
    var el = document.getElementById('stepPanel'); if (!el) return;
    var idx = flow.steps.indexOf(s) + 1;
    var c = s.control && D.controls.filter(function (x) { return x.id === s.control; })[0];
    var types = { start: 'Start', end: 'End', process: 'Step', decision: 'Decision', document: 'Document' };
    var row = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : ''; };
    el.innerHTML = '<div class="sp-head"><div><h3 id="stepTitle" tabindex="-1">' + esc(s.title) + '</h3>' +
        '<div class="sp-meta">Step ' + idx + ' of ' + flow.steps.length + '<span class="sep" aria-hidden="true">·</span>' + esc(types[s.type]) + '</div></div>' +
        '<button type="button" class="sp-close" id="stepClose" aria-label="Close step details"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>' +
      (s.flag ? '<div class="flagrow">' + FLAG + '<b>Flagged for review:</b> ' + esc(s.flag) + '</div>' : '') +
      (s.assumed ? '<div><span class="pill st-Draft">Assumption to confirm</span></div>' : '') +
      '<dl class="sp-facts">' + row('Lane', esc(flow.lanes[s.lane].name)) + row('Responsible', esc(s.who || '')) + row('System', esc(s.system || '')) + row('APQC', s.apqc ? '<span class="mono">' + esc(s.apqc) + '</span>' : '') + '</dl>' +
      (s.detail ? '<p class="sp-detail">' + esc(s.detail) + '</p>' : '') +
      (c ? '<div class="sp-control"><div><span class="chip kc">' + esc(c.id) + '</span> <strong>' + esc(c.name) + '</strong></div><p>' + esc(c.type) + ' control. ' + esc(c.description) + '</p><p><span class="muted">Evidence:</span> ' + esc(c.evidence) + '</p></div>' : '') +
      (s.link ? '<a class="linkcard" href="' + hashFor(s.link) + '"><small>Go to</small><strong>' + esc(s.link + ' ' + D.byId[s.link].name) + ' →</strong></a>' : '') +
      ((s.next || []).length ? '<div class="sp-next"><div class="sp-label">Next</div>' + s.next.map(function (n) { var t = flow.steps.filter(function (x) { return x.id === n.to; })[0]; return '<button type="button" class="sp-nextbtn" data-to="' + esc(n.to) + '">' + (n.label ? '<span class="muted">' + esc(n.label) + ':</span> ' : '') + esc(t.title) + ' <span aria-hidden="true">→</span></button>'; }).join('') + '</div>' : '');
    document.getElementById('stepClose').addEventListener('click', function () { closeStep(flow); });
    Array.prototype.forEach.call(el.querySelectorAll('.sp-nextbtn'), function (b) { b.addEventListener('click', function () { selectStep(flow, b.getAttribute('data-to')); }); });
    el.onkeydown = function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeStep(flow); } };
  }

  /* ---------- Flows, systems, controls ---------- */
  function renderFlows() {
    var keys = Object.keys(D.flows);
    var groups = [['Sales', ['3.5.1', '3.3.3.S1', '3.5.3', '3.5.4', '3.5.2.S2']], ['Operations', ['5.2', '5.4.1.S1', '5.4', '6.2.2']], ['Finance', ['9.5.1', '9.2.2', '9.2.2.S1', '9.2.3', '9.2.4', '9.6.1', '9.3.2.S1']]];
    var card = function (k) {
        var fl = D.flows[k], p = D.byId[k], kc = controlsFor(k).length;
        return '<a class="card flowcard" href="' + hashFor(k) + '"><span class="mono" style="color:var(--muted)">' + esc(k) + '</span><strong style="font-size:16px">' + esc(p.name) + '</strong><span class="muted">' + esc(fl.summary) + '</span>' +
          '<span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><span class="chip">' + plural(fl.steps.length, 'step', 'steps') + '</span><span class="chip">' + plural(fl.lanes.length, 'lane', 'lanes') + '</span>' + (kc ? '<span class="chip kc">' + plural(kc, 'control', 'controls') + '</span>' : '') + (flagsFor(k).length ? '<span class="chip flagchip">' + FLAG + ' ' + flagsFor(k).length + ' to review</span>' : '') + pill(p.status) + '</span></a>';
    };
    view.innerHTML = '<div><h1>Process flows</h1><p class="sub">Swimlane flows with owners, systems and controls on every step, across Sales, Operations and Finance. ' + keys.length + ' documented.</p></div>' +
      groups.map(function (g) { var ks = g[1].filter(function (k) { return D.flows[k]; }); return ks.length ? '<h2 style="margin:6px 0 0">' + g[0] + '</h2><div class="flowcards">' + ks.map(card).join('') + '</div>' : ''; }).join('') +
      (function () { var rest = keys.filter(function (k) { return !groups.some(function (g) { return g[1].indexOf(k) >= 0; }); }); return rest.length ? '<h2 style="margin:6px 0 0">Other</h2><div class="flowcards">' + rest.map(card).join('') + '</div>' : ''; })();
  }

  function renderSystems() {
    var inScope = D.procs.filter(function (p) { return p.scope === 'Yes'; });
    var count = function (name, field) { var k = sysKey(name).toLowerCase(); return inScope.filter(function (p) { return (p[field] || '').toLowerCase().indexOf(k) >= 0; }).length; };
    var groups = ['Target', 'Retained - confirm', 'Retired'];
    view.innerHTML = '<div><h1>Systems</h1><p class="sub">Systems of record for 1/1/2027, with how many in-scope processes run in each. Select a system to see its processes.</p></div>' +
      groups.map(function (g) {
        var list = D.systems.filter(function (s) { return s.status === g; }); if (!list.length) return '';
        return '<section class="card tablewrap"><div class="sec" style="padding-bottom:6px"><h2 style="margin:0">' + esc(g === 'Retained - confirm' ? 'Still mapped, not on the 1/1/2027 list (confirm)' : g === 'Target' ? 'Target systems' : 'Retired') + '</h2></div><table><thead><tr><th>System</th><th>Role</th><th style="text-align:right">As system of record</th><th style="text-align:right">As supporting</th><th>Notes</th></tr></thead><tbody>' +
          list.map(function (s) {
            return '<tr><td>' + (g === 'Retired' ? esc(s.name) : '<a href="#library" data-sys="' + esc(sysKey(s.name)) + '" style="font-weight:600">' + esc(s.name) + '</a>') + '</td><td>' + esc(s.role) + '</td><td style="text-align:right">' + count(s.name, 'sor') + '</td><td style="text-align:right">' + count(s.name, 'sup') + '</td><td class="muted">' + esc(s.note) + '</td></tr>';
          }).join('') + '</tbody></table></section>';
      }).join('');
    Array.prototype.forEach.call(view.querySelectorAll('[data-sys]'), function (a) {
      a.addEventListener('click', function () { S.system = a.getAttribute('data-sys'); S.level = ''; S.q = ''; qInput.value = ''; });
    });
  }

  function renderControls(sel) {
    var maps = {};
    D.procs.forEach(function (p) { if (p.scope === 'Yes' && p.ctl) maps[p.ctl] = (maps[p.ctl] || 0) + 1; });
    var mk = Object.keys(maps).sort(function (a, b) { return maps[b] - maps[a]; });
    view.innerHTML = '<div><h1>Controls</h1><p class="sub">Key controls built into the process flows, Sparkhound\'s SOC 2 controls and the processes they support, and the compliance frameworks mapped across the library.</p></div>' +
      '<section class="card tablewrap"><div class="sec" style="padding-bottom:6px"><h2 style="margin:0">Key controls</h2><p class="muted" style="margin:4px 0 0">Control IDs are proposed.</p></div><table><thead><tr><th>ID</th><th>Control</th><th>Process</th><th>Type</th><th>Owner</th><th>System</th><th>Evidence</th></tr></thead><tbody>' +
      D.controls.map(function (c) {
        return '<tr><td><span class="chip kc">' + esc(c.id) + '</span></td><td><strong>' + esc(c.name) + '</strong><div class="muted" style="margin-top:2px;max-width:420px">' + esc(c.description) + '</div></td><td><a href="' + hashFor(c.process) + '">' + esc(c.process + ' ' + D.byId[c.process].name) + '</a><div class="muted">Step ' + esc(c.step) + '</div></td><td>' + esc(c.type) + '</td><td>' + esc(c.owner) + '</td><td>' + esc(c.system) + '</td><td class="muted">' + esc(c.evidence) + '</td></tr>';
      }).join('') + '</tbody></table></section>' +
      socSection() +
      '<section class="card tablewrap"><div class="sec" style="padding-bottom:6px"><h2 style="margin:0">Compliance mapping</h2></div><table><thead><tr><th>Framework / area</th><th style="text-align:right">In-scope processes</th></tr></thead><tbody>' +
      mk.map(function (k) { return '<tr><td><a href="#library" data-q="' + esc(k) + '">' + esc(k) + '</a></td><td style="text-align:right">' + maps[k] + '</td></tr>'; }).join('') + '</tbody></table></section>';
    Array.prototype.forEach.call(view.querySelectorAll('[data-q]'), function (a) {
      a.addEventListener('click', function () { S.q = a.getAttribute('data-q'); qInput.value = S.q; S.level = ''; S.system = ''; });
    });
    var hit = sel && document.getElementById('soc-' + sel);
    if (hit) { hit.closest('details').open = true; hit.classList.add('hit'); hit.scrollIntoView({ block: 'center' }); hit.setAttribute('tabindex', '-1'); hit.focus({ preventScroll: true }); }
  }
  function socSection() {
    var procLink = function (k) { var p = D.byId[k]; return p ? '<a href="' + hashFor(k) + '">' + esc(k + ' ' + p.name) + '</a>' : esc(k); };
    return '<section class="card"><div class="sec" style="padding-bottom:4px"><h2 style="margin:0">' + term('soc2', 'SOC 2 controls') + '</h2>' +
      '<p class="muted" style="margin:4px 0 0;max-width:80ch">' + D.soc.controls.length + ' controls from the SOC 2 Master Control Matrix, grouped by ' + term('tsc', 'Trust Services Criteria') + ' domain, each mapped to the library processes it supports. Readiness status is not shown here while it is being worked.</p></div>' +
      D.soc.domains.map(function (d) {
        var cs = D.soc.controls.filter(function (c) { return c.domain === d.code; }); if (!cs.length) return '';
        return '<details class="socdom"><summary><span class="mono">' + esc(d.code) + '</span> ' + esc(d.name) + '<span class="sep" aria-hidden="true">·</span><span class="muted">' + plural(cs.length, 'control', 'controls') + '</span>' +
          (d.inScope ? '<span class="pill st-InReview" style="margin-left:10px">In audit scope</span>' : '<span class="pill st-NotStarted" style="margin-left:10px">Not in current audit scope</span>') + '</summary>' +
          '<div class="tablewrap"><table class="soctable"><thead><tr><th>ID</th><th>Control</th><th>Type and frequency</th><th>Owner</th><th>Supports processes</th></tr></thead><tbody>' +
          cs.map(function (c) {
            return '<tr id="soc-' + esc(c.id) + '"><td><span class="chip soc">' + esc(c.id) + '</span><div class="muted" style="margin-top:4px">' + esc(c.tsc) + '</div></td>' +
              '<td><strong>' + esc(c.objective) + '</strong><div class="soc-act">' + esc(c.activity) + '</div>' +
              '<details class="soctest"><summary>Evidence and testing</summary><dl>' +
                '<dt>Design test (Type 1)</dt><dd>' + esc(c.design) + '</dd><dt>Operating test (Type 2)</dt><dd>' + esc(c.operating) + '</dd>' +
                '<dt>References</dt><dd class="mono" style="font-size:12px">' + esc(c.evidence.concat(c.interview, c.test).join(', ')) + '</dd></dl></details></td>' +
              '<td>' + esc(c.type) + '<div class="muted">' + esc(c.freq) + '</div></td><td>' + esc(c.owner) + '</td>' +
              '<td class="soc-procs">' + c.processes.map(procLink).join('') + '</td></tr>';
          }).join('') + '</tbody></table></div></details>';
      }).join('') + '</section>';
  }

  /* ---------- Data flows ---------- */
  function renderDataflow() {
    var df = D.df, PX = 250, PY = 150, BW = 190, BH = 66, PAD = 24;
    var maxC = Math.max.apply(null, df.nodes.map(function (n) { return n.col; })), maxR = Math.max.apply(null, df.nodes.map(function (n) { return n.row; }));
    var W = maxC * PX + BW + PAD * 2, H = maxR * PY + BH + PAD * 2;
    var pos = {};
    df.nodes.forEach(function (n) { pos[n.id] = { n: n, x: PAD + BW / 2 + n.col * PX, y: PAD + BH / 2 + n.row * PY }; });
    var clip = function (a, b) {
      var dx = b.x - a.x, dy = b.y - a.y, k = Math.min(dx ? (BW / 2 + 4) / Math.abs(dx) : 1e9, dy ? (BH / 2 + 4) / Math.abs(dy) : 1e9);
      return [a.x + dx * k, a.y + dy * k];
    };
    var pairs = {}, order = [];
    df.flows.forEach(function (f) {
      var key = [f.from, f.to].sort().join('|');
      if (!pairs[key]) { pairs[key] = { a: f.from, b: f.to, fwd: false, back: false, ids: [], how: f.how }; order.push(key); }
      var p = pairs[key];
      if (f.from === p.a || f.both) p.fwd = true;
      if (f.from === p.b || f.both) p.back = true;
      p.ids.push(f.id);
    });
    var style = function (how) { return /planned/i.test(how) ? 'planned' : /manual|self-service/i.test(how) ? 'manual' : 'auto'; };
    var svg = '<svg class="dfd" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Data flow diagram: how data moves between Sparkhound systems, centred on HaloPSA">' +
      '<defs><marker id="dfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" fill="#2c3a4f"/></marker></defs>';
    order.forEach(function (key) {
      var p = pairs[key], A = pos[p.a], B = pos[p.b], s1 = clip(A, B), s2 = clip(B, A), st = style(p.how);
      svg += '<g class="dfe" data-n="' + p.a + ' ' + p.b + '"><line x1="' + s1[0] + '" y1="' + s1[1] + '" x2="' + s2[0] + '" y2="' + s2[1] + '" class="dfl ' + st + '"' +
        (p.fwd ? ' marker-end="url(#dfa)"' : '') + (p.back ? ' marker-start="url(#dfa)"' : '') + '/>';
      var mx = (s1[0] + s2[0]) / 2, my = (s1[1] + s2[1]) / 2, lab = p.ids.join(' · '), bw = 14 + lab.length * 6.6;
      svg += '<rect x="' + (mx - bw / 2) + '" y="' + (my - 10) + '" width="' + bw + '" height="20" rx="10" class="dfb"/><text x="' + mx + '" y="' + (my + 4) + '" class="dfbt">' + lab + '</text></g>';
    });
    df.nodes.forEach(function (n) {
      var q = pos[n.id];
      svg += '<g class="dfn' + (n.core ? ' core' : '') + (n.external ? ' ext' : '') + (n.planned ? ' plan' : '') + '" data-id="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(n.name) + ': show its data flows">' +
        '<rect x="' + (q.x - BW / 2) + '" y="' + (q.y - BH / 2) + '" width="' + BW + '" height="' + BH + '" rx="8"/>' +
        '<text x="' + q.x + '" y="' + (q.y - 4) + '" class="dfnt">' + esc(n.name) + '</text>' +
        '<text x="' + q.x + '" y="' + (q.y + 14) + '" class="dfns">' + esc(n.role) + '</text></g>';
    });
    svg += '</svg>';
    var name = function (id) { return pos[id].n.name; };
    var procLinks = function (ks) { return ks.map(function (k) { return D.byId[k] ? '<a href="' + hashFor(k) + '">' + esc(k) + '</a>' : esc(k); }).join(', '); };
    view.innerHTML = '<div><h1>Data flows</h1><p class="sub">How data moves between Sparkhound\'s systems for 1/1/2027. HaloPSA sits at the centre: it holds clients, tickets, projects, time, quotes and invoices, and most integrations feed it. Select a system to see only its flows.</p></div>' +
      '<section class="card"><div class="dfwrap">' + svg + '</div>' +
      '<div class="legend dflegend"><span><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="dfl auto"/></svg>Automatic integration</span>' +
      '<span><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="dfl manual"/></svg>Manual or self-service</span>' +
      '<span><svg width="34" height="10" aria-hidden="true"><line x1="0" y1="5" x2="34" y2="5" class="dfl planned"/></svg>Planned</span>' +
      '<span><svg width="34" height="14" aria-hidden="true"><rect x="1" y="1" width="32" height="12" rx="3" fill="#fff" stroke="#8a97a6" stroke-dasharray="4 3"/></svg>Outside Sparkhound</span>' +
      '<span><svg width="34" height="14" aria-hidden="true"><rect x="1" y="1" width="32" height="12" rx="3" fill="#fff" stroke="#156b5e" stroke-width="1.5" stroke-dasharray="1.5 3" stroke-linecap="round"/></svg>Planned system</span>' +
      '<span>Numbers match the table. Arrows show the direction data moves.</span></div></section>' +
      '<section class="card tablewrap"><div class="sec" style="padding-bottom:6px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h2 style="margin:0" id="dfTitle">All data flows</h2><button class="btn" id="dfAll" type="button" hidden>Show all</button></div>' +
      '<table><thead><tr><th>#</th><th>From → to</th><th>Data</th><th>How</th><th>When</th><th>Processes</th></tr></thead><tbody>' +
      df.flows.map(function (f) {
        return '<tr data-n="' + f.from + ' ' + f.to + '"><td class="mono">' + f.id + '</td><td style="white-space:nowrap"><strong>' + esc(name(f.from)) + '</strong> ' + (f.both ? '↔' : '→') + ' <strong>' + esc(name(f.to)) + '</strong></td>' +
          '<td style="max-width:46ch">' + esc(f.data) + '</td><td>' + esc(f.how) + '</td><td>' + esc(f.when) + '</td><td>' + procLinks(f.processes) + '</td></tr>';
      }).join('') + '</tbody></table></section>' +
      '<section class="card sec"><h2>Not yet mapped</h2><ul class="dfun">' + df.unmapped.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>' +
      (df.sources ? '<p class="muted" style="margin:14px 0 0">Sources: ' + df.sources.map(function (x) { return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.label) + '</a>'; }).join('; ') + '</p>' : '') + '</section>';
    var sel = null;
    var apply = function () {
      Array.prototype.forEach.call(view.querySelectorAll('.dfe'), function (g) { g.classList.toggle('dim', !!sel && g.getAttribute('data-n').split(' ').indexOf(sel) < 0); });
      Array.prototype.forEach.call(view.querySelectorAll('.dfn'), function (g) { g.classList.toggle('on', g.getAttribute('data-id') === sel); });
      Array.prototype.forEach.call(view.querySelectorAll('tbody tr'), function (r) { r.hidden = !!sel && r.getAttribute('data-n').split(' ').indexOf(sel) < 0; });
      document.getElementById('dfTitle').textContent = sel ? 'Data flows for ' + name(sel) : 'All data flows';
      document.getElementById('dfAll').hidden = !sel;
    };
    Array.prototype.forEach.call(view.querySelectorAll('.dfn'), function (g) {
      var go = function () { var id = g.getAttribute('data-id'); sel = sel === id ? null : id; apply(); };
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    document.getElementById('dfAll').addEventListener('click', function () { sel = null; apply(); });
  }

  function renderGlossary(key) {
    view.innerHTML = '<div><h1>Glossary</h1><p class="sub">The roles and terms used across the library. Dotted-underlined words elsewhere on the site link here.</p></div>' +
      GLOSS.map(function (g) {
        return '<section class="card sec"><h2>' + esc(g[0]) + '</h2><dl class="gloss">' + g[1].map(function (t) {
          return '<div id="g-' + t[0] + '"' + (t[0] === key ? ' class="hit"' : '') + '><dt>' + esc(t[1]) + '</dt><dd>' + esc(t[2]) + '</dd></div>';
        }).join('') + '</dl></section>';
      }).join('');
    var hit = key && document.getElementById('g-' + key);
    if (hit) { hit.scrollIntoView({ block: 'center' }); hit.setAttribute('tabindex', '-1'); hit.focus({ preventScroll: true }); }
  }

  function renderReview() {
    var all = [];
    Object.keys(D.flows).forEach(function (k) { all = all.concat(flagsFor(k)); });
    var by = {};
    all.forEach(function (x) { (by[x.process] = by[x.process] || []).push(x); });
    var qs = Object.keys(D.flows).filter(function (k) { return (D.flows[k].questions || []).length; });
    view.innerHTML = '<div><h1 style="display:flex;gap:10px;align-items:center">Review</h1><p class="sub">What process owners need to confirm: decisions flagged in the design sessions, and open questions on draft flows.</p></div>' +
      '<section class="card sec flagcard"><h2 style="display:flex;gap:8px;align-items:center">' + FLAG + 'Flagged for review<span class="muted" style="font-weight:400"><span class="sep" aria-hidden="true">·</span>' + all.length + '</span></h2>' +
      (all.length ? Object.keys(by).map(function (k) {
        var p = D.byId[k];
        return '<div style="margin:12px 0 0"><a href="' + hashFor(k) + '" style="font-weight:600">' + esc(k + ' ' + p.name) + '</a><span class="muted"><span class="sep" aria-hidden="true">·</span>owner: ' + esc(p.owner || 'not assigned') + '</span><ul>' + by[k].map(function (x) { return '<li><b>' + esc(x.where) + '.</b> ' + esc(x.text) + '</li>'; }).join('') + '</ul></div>';
      }).join('') : '<p class="muted">Nothing flagged.</p>') + '</section>' +
      '<section class="card sec qs"><h2>Open questions on draft flows</h2>' + qs.map(function (k) {
        return '<div style="margin:12px 0 0"><a href="' + hashFor(k) + '" style="font-weight:600">' + esc(k + ' ' + D.byId[k].name) + '</a><ol>' + D.flows[k].questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>';
      }).join('') + '</section>';
  }

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var h = location.hash; if (h.indexOf('#p-') === 0) { var fl = D.flows[idFromHash(h.slice(1))]; if (fl) drawFlow(fl); } }, 200); });

  load();
})();
