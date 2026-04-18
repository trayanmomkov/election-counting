import { PARTIES, PREF_MIN, PREF_MAX } from './parties.js';

const STORAGE_KEY = 'broene-izbori-v1';
const STORAGE_VERSION = 1;
const HISTORY_MAX = 100;
const DEBOUNCE_MS = 180;
const SAVE_DEBOUNCE_MS = 250;
const FLASH_MS = 450;
const TOAST_MS = 2200;
const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;
const NO_PREF_KEY = '0';

// ---------- State ----------
let state = loadState();
let lastActionAt = 0;
let saveTimer = null;
let toastTimer = null;

function defaultState() {
  const counts = {};
  for (const p of PARTIES) {
    const prefs = { [NO_PREF_KEY]: 0 };
    if (p.hasPrefs) {
      for (let i = PREF_MIN; i <= PREF_MAX; i++) {
        prefs[String(i)] = 0;
      }
    }
    counts[String(p.n)] = { total: 0, prefs };
  }
  return { version: STORAGE_VERSION, counts, invalid: 0, history: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION) return defaultState();
    const def = defaultState();
    for (const p of PARTIES) {
      const key = String(p.n);
      if (!parsed.counts[key]) parsed.counts[key] = def.counts[key];
      else {
        for (const k of Object.keys(def.counts[key].prefs)) {
          if (parsed.counts[key].prefs[k] == null) parsed.counts[key].prefs[k] = 0;
        }
      }
    }
    if (!Array.isArray(parsed.history)) parsed.history = [];
    if (typeof parsed.invalid !== 'number') parsed.invalid = 0;
    return parsed;
  } catch (e) {
    console.error('Load state failed', e);
    return defaultState();
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveStateNow, SAVE_DEBOUNCE_MS);
}

function saveStateNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed', e);
    showToast('⚠ Грешка при запис. Експортирайте данните!');
  }
}

function canAct() {
  const now = performance.now();
  if (now - lastActionAt < DEBOUNCE_MS) return false;
  lastActionAt = now;
  return true;
}

function trimHistory() {
  if (state.history.length > HISTORY_MAX) {
    state.history.splice(0, state.history.length - HISTORY_MAX);
  }
}

// ---------- Actions: voting ----------
function voteFor(partyNum, prefKey) {
  if (!canAct()) return false;
  const pKey = String(partyNum);
  const pref = String(prefKey);
  const entry = state.counts[pKey];
  if (!entry) return false;
  if (entry.prefs[pref] == null) entry.prefs[pref] = 0;
  entry.prefs[pref]++;
  entry.total++;
  state.history.push({ t: 'vote', party: pKey, pref, at: Date.now() });
  trimHistory();
  scheduleSave();
  updatePartyCard(pKey);
  updateTotal();
  updateUndo();
  vibrate();
  flashCard(pKey);
  return true;
}

function voteInvalid() {
  if (!canAct()) return false;
  state.invalid++;
  state.history.push({ t: 'invalid', at: Date.now() });
  trimHistory();
  scheduleSave();
  updateInvalid();
  updateTotal();
  updateUndo();
  vibrate();
  flashInvalid();
  return true;
}

// ---------- Actions: correction (±1 adjust) ----------
function adjustParty(partyKey, prefKey, delta) {
  const entry = state.counts[partyKey];
  if (!entry) return false;
  const cur = entry.prefs[prefKey] || 0;
  if (cur + delta < 0) return false;
  entry.prefs[prefKey] = cur + delta;
  entry.total = Math.max(0, entry.total + delta);
  state.history.push({ t: 'adjust', target: 'party', party: partyKey, pref: prefKey, delta, at: Date.now() });
  trimHistory();
  scheduleSave();
  updatePartyCard(partyKey);
  updateTotal();
  updateUndo();
  vibrate();
  return true;
}

function adjustInvalid(delta) {
  if (state.invalid + delta < 0) return false;
  state.invalid += delta;
  state.history.push({ t: 'adjust', target: 'invalid', delta, at: Date.now() });
  trimHistory();
  scheduleSave();
  updateInvalid();
  updateTotal();
  updateUndo();
  vibrate();
  return true;
}

// ---------- Undo ----------
function undo() {
  if (state.history.length === 0) return;
  const last = state.history.pop();
  if (last.t === 'vote') {
    const entry = state.counts[last.party];
    if (entry) {
      entry.prefs[last.pref] = Math.max(0, (entry.prefs[last.pref] || 0) - 1);
      entry.total = Math.max(0, entry.total - 1);
      updatePartyCard(last.party);
    }
    showToast(`Отменен глас за № ${last.party}${last.pref !== NO_PREF_KEY ? ' / пр. ' + last.pref : ''}`);
  } else if (last.t === 'invalid') {
    state.invalid = Math.max(0, state.invalid - 1);
    updateInvalid();
    showToast('Отменена недействителна');
  } else if (last.t === 'adjust') {
    if (last.target === 'party') {
      const entry = state.counts[last.party];
      if (entry) {
        entry.prefs[last.pref] = Math.max(0, (entry.prefs[last.pref] || 0) - last.delta);
        entry.total = Math.max(0, entry.total - last.delta);
        updatePartyCard(last.party);
      }
    } else if (last.target === 'invalid') {
      state.invalid = Math.max(0, state.invalid - last.delta);
      updateInvalid();
    }
    showToast('Отменена корекция');
  }
  scheduleSave();
  updateTotal();
  updateUndo();
}

function resetAll() {
  state = defaultState();
  saveStateNow();
  renderAll();
  showToast('Всички броячи са нулирани');
}

// ---------- Rendering ----------
function renderAll() {
  renderPartiesGrid();
  updateInvalid();
  updateTotal();
  updateUndo();
}

function renderPartiesGrid() {
  const grid = $('parties-grid');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const p of PARTIES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'party-card';
    card.dataset.party = String(p.n);
    card.setAttribute('aria-label', `Партия ${p.n} — ${p.full}. Текущ брой: ${state.counts[p.n].total}`);

    const num = document.createElement('span');
    num.className = 'party-number';
    num.textContent = String(p.n);
    card.appendChild(num);

    const name = document.createElement('span');
    name.className = 'party-name';
    name.textContent = p.short;
    card.appendChild(name);

    const count = document.createElement('span');
    count.className = 'party-count';
    count.textContent = String(state.counts[p.n].total);
    card.appendChild(count);

    attachPressHandlers(card, {
      onTap: () => handlePartyClick(p),
      onLongPress: () => openPartyCorrection(p),
    });
    frag.appendChild(card);
  }
  grid.appendChild(frag);
}

function updatePartyCard(partyKey) {
  const card = document.querySelector(`.party-card[data-party="${partyKey}"]`);
  if (!card) return;
  const countEl = card.querySelector('.party-count');
  const total = state.counts[partyKey].total;
  if (countEl) countEl.textContent = String(total);
  const p = PARTIES.find((x) => String(x.n) === partyKey);
  if (p) {
    card.setAttribute('aria-label', `Партия ${p.n} — ${p.full}. Текущ брой: ${total}`);
  }
  // Also update correction modal if it's open for this party
  const modal = $('correction-modal');
  if (modal.open && modal.dataset.party === partyKey) {
    const party = PARTIES.find((x) => String(x.n) === partyKey);
    if (party) renderCorrectionList(party);
  }
}

function updateTotal() {
  let sum = state.invalid;
  for (const key in state.counts) sum += state.counts[key].total;
  $('total-count').textContent = String(sum);
}

function updateInvalid() {
  $('invalid-count').textContent = String(state.invalid);
  const modal = $('correction-modal');
  if (modal.open && modal.dataset.target === 'invalid') {
    renderInvalidCorrection();
  }
}

function updateUndo() {
  const btn = $('btn-undo');
  const empty = state.history.length === 0;
  btn.disabled = empty;
  btn.setAttribute('aria-disabled', String(empty));
}

// ---------- Feedback ----------
function vibrate() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(18); } catch (_) {}
  }
}

function vibrateStrong() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate([25, 30, 25]); } catch (_) {}
  }
}

function flashCard(partyKey) {
  const card = document.querySelector(`.party-card[data-party="${partyKey}"]`);
  if (!card) return;
  card.classList.remove('flash');
  void card.offsetWidth;
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), FLASH_MS);
}

function flashInvalid() {
  const btn = $('btn-invalid');
  btn.classList.remove('flash');
  void btn.offsetWidth;
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), FLASH_MS);
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), TOAST_MS);
}

// ---------- Long-press handling ----------
function attachPressHandlers(element, { onTap, onLongPress }) {
  let timer = null;
  let longFired = false;
  let downX = 0, downY = 0;
  let armed = false;

  const arm = (x, y) => {
    downX = x; downY = y;
    longFired = false;
    armed = true;
    element.classList.add('longpress-armed');
    timer = setTimeout(() => {
      longFired = true;
      element.classList.remove('longpress-armed');
      vibrateStrong();
      onLongPress();
      timer = null;
    }, LONG_PRESS_MS);
  };

  const disarm = () => {
    armed = false;
    element.classList.remove('longpress-armed');
    if (timer) { clearTimeout(timer); timer = null; }
  };

  element.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    arm(e.clientX, e.clientY);
  });

  element.addEventListener('pointermove', (e) => {
    if (!armed) return;
    if (Math.abs(e.clientX - downX) > MOVE_CANCEL_PX || Math.abs(e.clientY - downY) > MOVE_CANCEL_PX) {
      disarm();
    }
  });

  element.addEventListener('pointerup', disarm);
  element.addEventListener('pointerleave', disarm);
  element.addEventListener('pointercancel', disarm);

  // Desktop right-click also opens correction
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!longFired) onLongPress();
    longFired = true;
    setTimeout(() => { longFired = false; }, 600);
  });

  // Click handler: skip if long-press fired
  element.addEventListener('click', (e) => {
    if (longFired) {
      e.preventDefault();
      e.stopPropagation();
      longFired = false;
      return;
    }
    onTap();
  });
}

// ---------- Modal: preferences (voting) ----------
function handlePartyClick(party) {
  if (!party.hasPrefs) {
    voteFor(party.n, NO_PREF_KEY);
    return;
  }
  openPrefModal(party);
}

function openPrefModal(party) {
  const modal = $('pref-modal');
  $('modal-party-number').textContent = `№ ${party.n}`;
  $('modal-party-name').textContent = party.full;

  const prefsGrid = $('prefs-grid');
  prefsGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = PREF_MIN; i <= PREF_MAX; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pref-circle';
    btn.dataset.pref = String(i);
    btn.textContent = String(i);
    btn.setAttribute('aria-label', `Преференция ${i}`);
    btn.addEventListener('click', () => {
      if (voteFor(party.n, i)) closePrefModal();
    });
    frag.appendChild(btn);
  }
  prefsGrid.appendChild(frag);

  const noPrefBtn = $('btn-no-pref');
  noPrefBtn.onclick = () => {
    if (voteFor(party.n, NO_PREF_KEY)) closePrefModal();
  };

  openModal(modal);
}

function closePrefModal() {
  const modal = $('pref-modal');
  if (modal.open) modal.close();
}

// ---------- Modal: correction (long-press) ----------
function openPartyCorrection(party) {
  const modal = $('correction-modal');
  modal.classList.remove('correction-invalid');
  modal.dataset.party = String(party.n);
  modal.dataset.target = 'party';
  $('correction-modal-number').textContent = `№ ${party.n}`;
  $('correction-modal-name').textContent = party.full;
  renderCorrectionList(party);
  openModal(modal);
}

function openInvalidCorrection() {
  const modal = $('correction-modal');
  modal.classList.add('correction-invalid');
  modal.dataset.party = '';
  modal.dataset.target = 'invalid';
  $('correction-modal-number').textContent = '';
  $('correction-modal-name').textContent = 'Недействителни бюлетини';
  renderInvalidCorrection();
  openModal(modal);
}

function renderCorrectionList(party) {
  const list = $('correction-list');
  const addGrid = $('correction-add-grid');
  const totalEl = $('correction-total');
  list.innerHTML = '';
  addGrid.innerHTML = '';

  const pKey = String(party.n);
  const entry = state.counts[pKey];

  // "Без преф." row always shown
  list.appendChild(makeCorrectionRow('Без преф.', NO_PREF_KEY, pKey, entry.prefs[NO_PREF_KEY] || 0));

  // Prefs with count > 0
  if (party.hasPrefs) {
    let hasAny = false;
    for (let i = PREF_MIN; i <= PREF_MAX; i++) {
      const k = String(i);
      if ((entry.prefs[k] || 0) > 0) {
        list.appendChild(makeCorrectionRow(`Пр. ${i}`, k, pKey, entry.prefs[k]));
        hasAny = true;
      }
    }
    if (!hasAny && (entry.prefs[NO_PREF_KEY] || 0) === 0) {
      const empty = document.createElement('div');
      empty.className = 'correction-empty';
      empty.textContent = 'Още няма записи за тази партия.';
      list.appendChild(empty);
    }

    // Add-to-new grid: all 101-138
    $('correction-add-section').hidden = false;
    for (let i = PREF_MIN; i <= PREF_MAX; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'correction-add-btn';
      btn.textContent = String(i);
      btn.setAttribute('aria-label', `Добави глас за преференция ${i}`);
      btn.addEventListener('click', () => adjustParty(pKey, String(i), +1));
      addGrid.appendChild(btn);
    }
  } else {
    $('correction-add-section').hidden = true;
  }

  totalEl.textContent = String(entry.total);
}

function renderInvalidCorrection() {
  const list = $('correction-list');
  const totalEl = $('correction-total');
  list.innerHTML = '';
  $('correction-add-section').hidden = true;

  list.appendChild(makeCorrectionRow('Недействителни', null, null, state.invalid, /*isInvalid=*/true));
  totalEl.textContent = String(state.invalid);
}

function makeCorrectionRow(label, prefKey, partyKey, count, isInvalid = false) {
  const row = document.createElement('div');
  row.className = 'correction-row';

  const lbl = document.createElement('span');
  lbl.className = 'correction-label';
  lbl.textContent = label;
  row.appendChild(lbl);

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'correction-btn minus';
  minus.textContent = '−';
  minus.setAttribute('aria-label', `Намали ${label}`);
  minus.disabled = count <= 0;
  minus.addEventListener('click', () => {
    if (isInvalid) adjustInvalid(-1);
    else adjustParty(partyKey, prefKey, -1);
  });
  row.appendChild(minus);

  const countEl = document.createElement('span');
  countEl.className = 'correction-count';
  countEl.textContent = String(count);
  row.appendChild(countEl);

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'correction-btn plus';
  plus.textContent = '+';
  plus.setAttribute('aria-label', `Увеличи ${label}`);
  plus.addEventListener('click', () => {
    if (isInvalid) adjustInvalid(+1);
    else adjustParty(partyKey, prefKey, +1);
  });
  row.appendChild(plus);

  return row;
}

function closeCorrectionModal() {
  const modal = $('correction-modal');
  if (modal.open) modal.close();
}

// ---------- Modal plumbing ----------
function openModal(modal) {
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
}

function closeModal(modal) {
  if (typeof modal.close === 'function') {
    modal.close();
  } else {
    modal.removeAttribute('open');
  }
}

function wireBackdropClose(modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
}

// ---------- Export ----------
function exportCsv() {
  const BOM = '\uFEFF';
  const header = ['№ партия', 'Партия', 'Общо', 'Без преф.'];
  for (let i = PREF_MIN; i <= PREF_MAX; i++) header.push('пр. ' + i);
  const lines = [header.map(csvEscape).join(',')];

  for (const p of PARTIES) {
    const c = state.counts[String(p.n)];
    const row = [p.n, p.full, c.total, c.prefs[NO_PREF_KEY] || 0];
    for (let i = PREF_MIN; i <= PREF_MAX; i++) {
      row.push(c.prefs[String(i)] || 0);
    }
    lines.push(row.map(csvEscape).join(','));
  }

  const invalidRow = ['', 'Недействителни', state.invalid];
  while (invalidRow.length < header.length) invalidRow.push('');
  lines.push(invalidRow.map(csvEscape).join(','));

  let grandTotal = state.invalid;
  for (const key in state.counts) grandTotal += state.counts[key].total;
  const totalRow = ['', 'ОБЩО', grandTotal];
  while (totalRow.length < header.length) totalRow.push('');
  lines.push(totalRow.map(csvEscape).join(','));

  download(BOM + lines.join('\r\n'), `broene-izbori-${timestamp()}.csv`, 'text/csv;charset=utf-8');
  showToast('CSV файлът е свален');
}

function exportJson() {
  const payload = { exported_at: new Date().toISOString(), ...state };
  download(JSON.stringify(payload, null, 2), `broene-izbori-${timestamp()}.json`, 'application/json');
  showToast('JSON backup свален');
}

function csvEscape(v) {
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ---------- Utils ----------
function $(id) { return document.getElementById(id); }

// ---------- Init ----------
function init() {
  renderAll();

  $('btn-undo').addEventListener('click', undo);
  $('modal-close').addEventListener('click', closePrefModal);
  $('correction-modal-close').addEventListener('click', closeCorrectionModal);

  // Invalid ballot: normal tap + long-press for correction
  attachPressHandlers($('btn-invalid'), {
    onTap: voteInvalid,
    onLongPress: openInvalidCorrection,
  });

  // Reset flow
  $('btn-reset').addEventListener('click', () => openModal($('reset-modal')));
  $('btn-reset-cancel').addEventListener('click', () => closeModal($('reset-modal')));
  $('btn-reset-confirm').addEventListener('click', () => {
    closeModal($('reset-modal'));
    resetAll();
  });

  // Export flow
  $('btn-export').addEventListener('click', () => openModal($('export-modal')));
  $('export-modal-close').addEventListener('click', () => closeModal($('export-modal')));
  $('btn-export-csv').addEventListener('click', () => {
    closeModal($('export-modal'));
    exportCsv();
  });
  $('btn-export-json').addEventListener('click', () => {
    closeModal($('export-modal'));
    exportJson();
  });

  // Backdrop close on all modals
  wireBackdropClose($('pref-modal'));
  wireBackdropClose($('reset-modal'));
  wireBackdropClose($('export-modal'));
  wireBackdropClose($('correction-modal'));

  // Keyboard shortcut: U = undo
  document.addEventListener('keydown', (e) => {
    if (e.key === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (!isInput && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        undo();
      }
    }
  });

  // Persist on unload
  window.addEventListener('beforeunload', () => saveStateNow());
  window.addEventListener('pagehide', () => saveStateNow());

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW registration failed', err);
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
