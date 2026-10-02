/* Language pack loader + page rendering. Plain ES5-ish, no dependencies. */

var LANGS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'sk', label: 'Slovenčina' }
];

var DEFAULT_LANG = 'sk';
var STORE_LANG = 'confession.lang';
var STORE_MARKS = 'confession.marks';
var STORE_NOTES = 'confession.notes';
var STORE_GENDER = 'confession.gender';
var STORE_LAST = 'confession.last';
var STORE_DEPTH = 'confession.depth';
var STORE_THEME = 'confession.theme';
var DELIM = '|';

var GENDERS = ['m', 'f'];

/* Material Design Icons, inlined so the page fetches nothing from a CDN:
   pencil-plus-outline / pencil-minus-outline for a note,
   information-slab-symbol for a question that carries an explanation,
   weather-night / weather-sunny for the dark mode toggle. */
var ICON_NOTE_OPEN = 'M14.1,9L15,9.9L5.9,19H5V18.1L14.1,9M17.7,3C17.5,3 17.2,3.1 17,3.3L15.2,5.1L18.9,8.9L20.7,7C21.1,6.6 21.1,6 20.7,5.6L18.4,3.3C18.2,3.1 17.9,3 17.7,3M14.1,6.2L3,17.2V21H6.8L17.8,9.9L14.1,6.2M7,2V5H10V7H7V10H5V7H2V5H5V2H7Z';
var ICON_DARK = 'M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z';
var ICON_LIGHT = 'M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z';
var ICON_INFO = 'M13 9H11V7H13V9M14 15V17H10V15H11V13H10V11H13V15H14Z';
var ICON_NOTE_CLOSE = 'M14.1,9L15,9.9L5.9,19H5V18.1L14.1,9M17.7,3C17.5,3 17.2,3.1 17,3.3L15.2,5.1L18.9,8.9L20.7,7C21.1,6.6 21.1,6 20.7,5.6L18.4,3.3C18.2,3.1 17.9,3 17.7,3M14.1,6.2L3,17.2V21H6.8L17.8,9.9L14.1,6.2M10,5V7H2V5H10Z';

function noteIcon(d) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<path d="' + d + '"/></svg>';
}

/* Two examinations: the full one, and a short list of the essentials.
   The quick file reuses ids from the deep one, so a tick survives a switch. */
var DEPTHS = [
  { code: 'deep', file: 'questions.csv' },
  { code: 'quick', file: 'questions-quick.csv' }
];
var DEFAULT_DEPTH = 'deep';

/* ---------- storage helpers (safe when disabled) ---------- */

function read(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

function currentLang() {
  var q = new URLSearchParams(location.search).get('lang');
  var stored = read(STORE_LANG, DEFAULT_LANG);
  var wanted = q || stored;
  for (var i = 0; i < LANGS.length; i++) {
    if (LANGS[i].code === wanted) return wanted;
  }
  return DEFAULT_LANG;
}

/* ---------- CSV ---------- */

/* Parses a DELIM-separated file with a header row into an array of objects.
   Handles quoted fields, embedded delimiters, newlines and "" escapes. */
function parseCsv(text) {
  var rows = [];
  var row = [];
  var field = '';
  var quoted = false;
  var i = 0;

  text = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < text.length) {
    var c = text.charAt(i);
    if (quoted) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === DELIM) { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  row.push(field);
  rows.push(row);

  var header = rows.shift().map(function (h) { return h.trim(); });
  var out = [];
  for (var r = 0; r < rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0].trim() === '') continue;
    var obj = {};
    for (var c2 = 0; c2 < header.length; c2++) {
      obj[header[c2]] = (rows[r][c2] || '').trim();
    }
    out.push(obj);
  }
  return out;
}

function loadCsv(path) {
  return fetch(path, { cache: 'no-cache' }).then(function (res) {
    if (!res.ok) throw new Error(path + ' -> ' + res.status);
    return res.text();
  }).then(parseCsv);
}

/* ---------- UI strings ---------- */

function setMeta(selector, value) {
  var el = document.querySelector(selector);
  if (el && value) el.setAttribute('content', value);
}

function applyUi(strings) {
  var nodes = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < nodes.length; i++) {
    var key = nodes[i].getAttribute('data-i18n');
    if (strings[key] !== undefined) nodes[i].textContent = strings[key];
  }

  /* Alt text is text too, so it comes from the pack like everything else. */
  var images = document.querySelectorAll('[data-i18n-alt]');
  for (var j = 0; j < images.length; j++) {
    var alt = images[j].getAttribute('data-i18n-alt');
    if (strings[alt] !== undefined) images[j].setAttribute('alt', strings[alt]);
  }

  var page = document.body.getAttribute('data-page');
  var name = strings['app.name'];
  var title = strings['title.' + page];

  /* The HTML ships the Slovak title and description for crawlers; once a pack
     is loaded they are rewritten in the reader's language. */
  if (title) document.title = (name && title !== name) ? title + ' - ' + name : title;

  var desc = strings['desc.' + page];
  setMeta('meta[name="description"]', desc);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:title"]', document.title);

  document.documentElement.lang = currentLang();
}

/* ---------- theme ---------- */

/* '' means follow the operating system, which is the default. */
function storedTheme() {
  var t = read(STORE_THEME, '');
  return (t === 'dark' || t === 'light') ? t : '';
}

/* What the page is actually showing right now. */
function activeTheme() {
  var chosen = storedTheme();
  if (chosen) return chosen;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

function applyTheme(strings) {
  var chosen = storedTheme();
  var root = document.documentElement;
  if (chosen) { root.setAttribute('data-theme', chosen); }
  else { root.removeAttribute('data-theme'); }

  var button = document.getElementById('theme');
  if (!button) return;

  /* The icon shows where the switch leads, not where you are. */
  var goingDark = activeTheme() === 'light';
  button.innerHTML = noteIcon(goingDark ? ICON_DARK : ICON_LIGHT);
  var label = strings[goingDark ? 'theme.dark' : 'theme.light'] || '';
  button.title = label;
  button.setAttribute('aria-label', label);
}

function setupTheme(strings) {
  var button = document.getElementById('theme');
  if (!button) return;

  button.addEventListener('click', function () {
    write(STORE_THEME, activeTheme() === 'dark' ? 'light' : 'dark');
    applyTheme(strings);
  });

  /* Follow the system while the reader has expressed no preference. */
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!storedTheme()) applyTheme(strings);
    });
  } catch (e) { /* older browsers simply do not follow along */ }

  applyTheme(strings);
}

/* ---------- language switcher ---------- */

function buildSwitcher(lang) {
  var sel = document.getElementById('lang');
  if (!sel) return;
  for (var i = 0; i < LANGS.length; i++) {
    var opt = document.createElement('option');
    opt.value = LANGS[i].code;
    opt.textContent = LANGS[i].label;
    if (LANGS[i].code === lang) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', function () {
    write(STORE_LANG, sel.value);
    location.search = '?lang=' + sel.value;
  });
}

/* ---------- gender ---------- */

/* '' until the reader picks one. */
function currentGender() {
  var stored = read(STORE_GENDER, '');
  return GENDERS.indexOf(stored) === -1 ? '' : stored;
}

/* A question is shown when its gender cell is empty or matches the reader.
   Before a choice is made nothing is filtered out. */
function matchesGender(row, gender) {
  var want = (row.gender || '').trim().toLowerCase();
  if (!want) return true;
  if (!gender) return true;
  return want === gender;
}

function buildGenderPicker(strings, onChange) {
  var sel = document.getElementById('gender');
  if (!sel) return;
  var current = currentGender();
  sel.innerHTML = '';

  /* Placeholder only until the reader has chosen; it is removed afterwards. */
  if (!current) {
    var first = document.createElement('option');
    first.value = '';
    first.textContent = strings['gender.choose'] || '';
    first.selected = true;
    sel.appendChild(first);
  }

  GENDERS.forEach(function (code) {
    var opt = document.createElement('option');
    opt.value = code;
    opt.textContent = strings['gender.' + code] || code;
    if (code === current) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', function () {
    if (!sel.value) return;
    write(STORE_GENDER, sel.value);
    if (sel.options[0] && !sel.options[0].value) sel.remove(0);
    onChange();
  });
}

/* ---------- depth (how long an examination) ---------- */

function currentDepth() {
  var wanted = read(STORE_DEPTH, DEFAULT_DEPTH);
  for (var i = 0; i < DEPTHS.length; i++) {
    if (DEPTHS[i].code === wanted) return wanted;
  }
  return DEFAULT_DEPTH;
}

function questionsFile(depth) {
  for (var i = 0; i < DEPTHS.length; i++) {
    if (DEPTHS[i].code === depth) return DEPTHS[i].file;
  }
  return DEPTHS[0].file;
}

function buildDepthPicker(strings, onChange) {
  var sel = document.getElementById('depth');
  if (!sel) return;
  var current = currentDepth();
  sel.innerHTML = '';

  DEPTHS.forEach(function (d) {
    var opt = document.createElement('option');
    opt.value = d.code;
    opt.textContent = strings['depth.' + d.code] || d.code;
    if (d.code === current) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', function () {
    write(STORE_DEPTH, sel.value);
    onChange();
  });
}

/* ---------- last confession ---------- */

function todayIso() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function daysSince(iso) {
  var parts = iso.split('-');
  if (parts.length !== 3) return null;
  var then = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  if (isNaN(then.getTime())) return null;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86400000);
}

/* YYYY-MM-DD as the reader's language writes it; falls back to the raw value. */
function formatDate(iso) {
  var parts = iso.split('-');
  if (parts.length !== 3) return iso;
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  if (isNaN(d.getTime())) return iso;
  try { return d.toLocaleDateString(currentLang()); } catch (e) { return iso; }
}

/* "pred 3 dnami" / "3 days ago" / "vor 3 Tagen", with the right plural form
   and with today and yesterday named rather than counted. */
function relativeDays(iso) {
  var n = daysSince(iso);
  if (n === null) return '';
  try {
    return new Intl.RelativeTimeFormat(currentLang(), { numeric: 'auto' }).format(-n, 'day');
  } catch (e) {
    return formatDate(iso);
  }
}

function showLast(strings) {
  var out = document.getElementById('since');
  if (!out) return;
  var iso = read(STORE_LAST, '');
  var n = iso ? daysSince(iso) : null;

  if (n === null) {
    out.textContent = strings['last.none'] || '';
    return;
  }
  var tpl = strings['last.since'] || '{date} ({n})';
  out.textContent = tpl.replace('{ago}', relativeDays(iso))
    .replace('{date}', formatDate(iso))
    .replace('{n}', n);
}

function setupLast(strings) {
  var input = document.getElementById('last');
  if (!input) return;
  input.value = read(STORE_LAST, '');
  input.max = todayIso();

  input.addEventListener('change', function () {
    write(STORE_LAST, input.value);
    showLast(strings);
  });

  var clear = document.getElementById('last-clear');
  if (clear) {
    clear.addEventListener('click', function () {
      input.value = '';
      write(STORE_LAST, '');
      showLast(strings);
    });
  }

  showLast(strings);
}

/* ---------- marks (checked questions) ---------- */

function loadMarks() {
  try { return JSON.parse(read(STORE_MARKS, '{}')) || {}; } catch (e) { return {}; }
}

function saveMarks(marks) {
  write(STORE_MARKS, JSON.stringify(marks));
}

function loadNotes() {
  try { return JSON.parse(read(STORE_NOTES, '{}')) || {}; } catch (e) { return {}; }
}

function saveNotes(notes) {
  write(STORE_NOTES, JSON.stringify(notes));
}

/* ---------- pages ---------- */

function renderQuestions(rows, strings) {
  var host = document.getElementById('questions');
  if (!host) return;
  var marks = loadMarks();
  var notes = loadNotes();
  var gender = currentGender();
  host.innerHTML = '';

  var groups = [];
  var group = null;

  function startGroup(title) {
    group = { title: title, items: [] };
    groups.push(group);
  }

  rows.forEach(function (q) {
    var section = (q.section || '').trim();

    /* A filled section cell starts a new block; blank continues the current one. */
    if (section || !group) startGroup(section);

    /* A row with a section but no question is a standalone heading. */
    if (!q.question) return;

    /* Skip questions meant for the other gender. */
    if (!matchesGender(q, gender)) return;

    var li = document.createElement('li');
    var label = document.createElement('label');

    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!marks[q.id];

    var text = document.createElement('span');
    text.className = 'qtext';
    text.textContent = q.question;

    var note = document.createElement('textarea');
    note.className = 'qnote-input';
    note.rows = 2;
    note.value = notes[q.id] || '';
    note.placeholder = strings['questions.note.placeholder'] || '';
    note.setAttribute('aria-label', strings['questions.note.label'] || '');

    box.addEventListener('change', function () {
      var m = loadMarks();
      if (box.checked) { m[q.id] = 1; } else { delete m[q.id]; }
      saveMarks(m);
      updateCount(strings);
    });

    note.addEventListener('input', function () {
      var n = loadNotes();
      if (note.value) { n[q.id] = note.value; } else { delete n[q.id]; }
      saveNotes(n);
      markNote();
    });

    var noteWrap = document.createElement('div');
    noteWrap.className = 'qnote';
    noteWrap.id = 'note-' + q.id;
    noteWrap.hidden = true;
    noteWrap.appendChild(note);

    /* Only a row with a description column gets an explanation to open. */
    var info = null, infoWrap = null;
    var description = (q.description || '').trim();
    if (description) {
      infoWrap = document.createElement('div');
      infoWrap.className = 'qinfo';
      infoWrap.id = 'info-' + q.id;
      infoWrap.hidden = true;
      infoWrap.textContent = description;

      info = document.createElement('button');
      info.type = 'button';
      info.className = 'qinfo-toggle';
      info.innerHTML = noteIcon(ICON_INFO);
      info.title = strings['questions.info.label'] || '';
      info.setAttribute('aria-label', info.title);
      info.setAttribute('aria-expanded', 'false');
      info.setAttribute('aria-controls', infoWrap.id);

      info.addEventListener('click', function () {
        var opening = infoWrap.hidden;
        infoWrap.hidden = !opening;
        info.setAttribute('aria-expanded', String(opening));
      });
    }

    /* The button sits outside the label: inside it, a click would tick the box. */
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'qnote-toggle';
    toggle.innerHTML = noteIcon(ICON_NOTE_OPEN);
    var icon = toggle.querySelector('path');
    toggle.title = strings['questions.note.label'] || '';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', noteWrap.id);

    /* A written note shows on the closed button, so nothing is lost from sight. */
    function markNote() {
      if (note.value) { toggle.classList.add('has-note'); }
      else { toggle.classList.remove('has-note'); }
    }
    markNote();

    toggle.addEventListener('click', function () {
      var opening = noteWrap.hidden;
      noteWrap.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      icon.setAttribute('d', opening ? ICON_NOTE_CLOSE : ICON_NOTE_OPEN);
      if (opening) { note.focus(); }
    });

    label.appendChild(box);
    label.appendChild(text);

    var row = document.createElement('div');
    row.className = 'qrow';
    row.appendChild(label);
    if (info) { row.appendChild(info); }
    row.appendChild(toggle);

    li.appendChild(row);
    if (infoWrap) { li.appendChild(infoWrap); }
    li.appendChild(noteWrap);
    group.items.push(li);
  });

  groups.forEach(function (g) {
    /* Drop a section whose questions were all filtered out. */
    if (!g.items.length) return;

    var section = document.createElement('section');
    section.className = 'qgroup';

    if (g.title) {
      var h = document.createElement('h2');
      h.textContent = g.title;
      section.appendChild(h);
    }

    var list = document.createElement('ol');
    list.className = 'questions';
    g.items.forEach(function (li) { list.appendChild(li); });

    section.appendChild(list);
    host.appendChild(section);
  });

  updateCount(strings);
}

/* Wired once per page; re-rendering must not stack duplicate listeners.
   Both pages clear the same marks, then refresh whatever they show. */
function wireReset(after) {
  var reset = document.getElementById('reset');
  if (!reset) return;

  reset.addEventListener('click', function () {
    saveMarks({});
    saveNotes({});
    if (after) after();
  });
}

function updateCount(strings) {
  var el = document.getElementById('count');
  var host = document.getElementById('questions');
  if (!el || !host) return;
  /* Counts what is on screen, so hidden questions do not inflate the total. */
  var n = host.querySelectorAll('input[type="checkbox"]:checked').length;
  var tpl = strings['questions.count'] || '{n} selected';
  el.textContent = tpl.replace('{n}', n);
}

/* The opening formula names the date of the last confession; {n} is the
   number of days, for wordings that prefer it. */
function showOpening(strings) {
  var el = document.getElementById('opening');
  if (!el) return;

  var iso = read(STORE_LAST, '');
  var n = iso ? daysSince(iso) : null;
  /* n === null also covers a stored value that is not a real date. */
  var date = n === null ? (strings['confession.nodate'] || '') : formatDate(iso);

  el.textContent = (strings['confession.opening'] || '')
    .replace('{ago}', n === null ? date : relativeDays(iso))
    .replace('{date}', date)
    .replace('{n}', n === null ? '' : n);
}

/* The reader may have ticked in either examination, so the confession page
   reads both. Deep order wins; anything only in the quick file follows. */
function mergeQuestions(deep, quick) {
  var seen = {};
  var out = [];
  deep.forEach(function (q) { seen[q.id] = true; out.push(q); });
  quick.forEach(function (q) { if (!seen[q.id]) out.push(q); });
  return out;
}

/* The confession page: the formula, plus every question the reader ticked.
   Marks are keyed by id, so the rows are listed in questions.csv order. */
function renderConfession(rows, strings) {
  var list = document.getElementById('sins');
  var none = document.getElementById('none');
  if (!list) return;

  var marks = loadMarks();
  var notes = loadNotes();
  list.innerHTML = '';
  var shown = 0;

  rows.forEach(function (q) {
    if (!q.question || !marks[q.id]) return;
    var li = document.createElement('li');
    li.textContent = q.question;
    if (notes[q.id]) {
      var note = document.createElement('span');
      note.className = 'sin-note';
      note.textContent = notes[q.id];
      li.appendChild(note);
    }
    list.appendChild(li);
    shown++;
  });

  if (none) {
    none.hidden = shown > 0;
    none.textContent = strings['confession.none'] || '';
  }
}

function renderPrayers(rows, strings) {
  var host = document.getElementById('prayers');
  if (!host) return;
  host.innerHTML = '';
  rows.forEach(function (p) {
    var sec = document.createElement('section');
    sec.className = 'prayer';
    sec.id = p.id;

    var h = document.createElement('h2');
    h.textContent = p.title;

    var body = document.createElement('p');
    body.textContent = p.text;

    sec.appendChild(h);
    sec.appendChild(body);

    if (p.source) {
      var line = document.createElement('p');
      line.className = 'source';
      /* The label is optional; without it the link stands alone, no stray space. */
      var label = strings['prayers.source'] || '';
      if (label) line.appendChild(document.createTextNode(label + ' '));
      line.appendChild(externalLink(p.source_url, p.source));
      sec.appendChild(line);
    }

    host.appendChild(sec);
  });
}

/* An <a> when there is a URL, plain text otherwise. */
function externalLink(href, text) {
  if (!href) return document.createTextNode(text);
  var a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function renderContact(rows, strings) {
  var host = document.getElementById('contact');
  if (!host) return;
  host.innerHTML = '';
  rows.forEach(function (c) {
    var dt = document.createElement('dt');
    dt.textContent = c.label;

    var dd = document.createElement('dd');
    if (c.type === 'phone' || c.type === 'email') {
      var a = document.createElement('a');
      a.href = (c.type === 'phone' ? 'tel:' : 'mailto:') + c.href;
      a.textContent = c.value;
      dd.appendChild(a);
    } else if (c.type === 'link' && c.href) {
      dd.appendChild(externalLink(c.href, c.value));
    } else {
      dd.textContent = c.value;
    }

    host.appendChild(dt);
    host.appendChild(dd);
  });
}

function fail(message) {
  var box = document.getElementById('error');
  if (!box) return;
  box.hidden = false;
  box.textContent = message;
}

/* ---------- boot ---------- */

function boot() {
  var lang = currentLang();
  write(STORE_LANG, lang);
  buildSwitcher(lang);

  var page = document.body.getAttribute('data-page');
  var base = 'lang/' + lang + '/';

  loadCsv(base + 'ui.csv').then(function (rows) {
    var strings = {};
    rows.forEach(function (r) { strings[r.key] = r.value; });
    applyUi(strings);
    setupTheme(strings);

    if (page === 'index') {
      var rows = [];

      var show = function () { renderQuestions(rows, strings); };

      /* Each depth is its own file, fetched when the reader asks for it. */
      var loadDepth = function () {
        return loadCsv(base + questionsFile(currentDepth())).then(function (q) {
          rows = q;
          show();
        });
      };

      return loadDepth().then(function () {
        wireReset(show);
        setupLast(strings);
        buildGenderPicker(strings, show);
        buildDepthPicker(strings, function () {
          loadDepth().catch(function (err) { fail(String(err.message || err)); });
        });
      });
    }
    if (page === 'confession') {
      return Promise.all([
        loadCsv(base + 'questions.csv'),
        /* A missing quick file must not hide the sins from the deep one. */
        loadCsv(base + 'questions-quick.csv').catch(function () { return []; })
      ]).then(function (sets) {
        var q = mergeQuestions(sets[0], sets[1]);
        renderConfession(q, strings);
        showOpening(strings);
        showLast(strings);
        wireReset(function () {
          /* Reset here means the confession just happened: start the next
             examination from an empty list, dated today. */
          write(STORE_LAST, todayIso());
          renderConfession(q, strings);
          showOpening(strings);
          showLast(strings);
        });
      });
    }
    if (page === 'prayers') return loadCsv(base + 'prayers.csv').then(function (p) { renderPrayers(p, strings); });
    if (page === 'contact') return loadCsv(base + 'contact.csv').then(function (c) { renderContact(c, strings); });
  }).catch(function (err) {
    fail(String(err.message || err));
  });
}

document.addEventListener('DOMContentLoaded', boot);
