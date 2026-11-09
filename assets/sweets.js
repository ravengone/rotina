/* ============================================
   ROUTINE v3.3 — SWEETS & FAST FOOD TRACKER
   Loaded after foodtracker.js. Adds:
   - "Sweets & Fast Food" page (nav: Direction),
     fully separate from Habit Control.
   - Every time you eat sweets or fast food you log
     a FAILURE (a "slip"). Several per day are allowed,
     so the count is real, not just yes/no.
   - Clean streak, week-vs-week verdict (good / bad),
     monthly calendar, 8-week chart, breakdown.
   Uses its own storage keys. Export/import stays
   backward & forward compatible.
   ============================================ */

// ========== STATE + STORAGE ==========
const STORAGE_KEY_SWEETS_LOG = 'lifedash_sweets_log';
const STORAGE_KEY_SWEETS_META = 'lifedash_sweets_meta';

const SW_TYPES = {
  sweets:   { label: 'Sweets',    icon: '🍬', color: '--accent-purple' },
  fastfood: { label: 'Fast food', icon: '🍔', color: '--accent-orange' },
};

AppState.sweetsLog = {};
/*
  Shape: { "2026-11-06": [ { id, type: 'sweets'|'fastfood', note, time: 'HH:MM'|'' }, ... ] }
  A date only exists once it has at least one slip. No entry = clean day.
*/
AppState.sweetsMeta = { startDate: null }; // first day of tracking (clean streak never counts before it)

try {
  const raw = localStorage.getItem(STORAGE_KEY_SWEETS_LOG);
  if (raw) AppState.sweetsLog = JSON.parse(raw) || {};
  const meta = localStorage.getItem(STORAGE_KEY_SWEETS_META);
  if (meta) AppState.sweetsMeta = { ...AppState.sweetsMeta, ...JSON.parse(meta) };
} catch (e) { console.warn('sweets log load failed', e); }

function swEnsureStartDate() {
  const logged = Object.keys(AppState.sweetsLog).sort();
  const today = todayStr();
  let start = AppState.sweetsMeta.startDate || today;
  if (logged.length && logged[0] < start) start = logged[0];
  if (start !== AppState.sweetsMeta.startDate) {
    AppState.sweetsMeta.startDate = start;
    try { localStorage.setItem(STORAGE_KEY_SWEETS_META, JSON.stringify(AppState.sweetsMeta)); } catch (e) {}
  }
}
swEnsureStartDate();

// ========== PATCH: PERSISTENCE ==========
const _swOrigSave = saveToLocalStorage;
window.saveToLocalStorage = function () {
  _swOrigSave();
  try {
    localStorage.setItem(STORAGE_KEY_SWEETS_LOG, JSON.stringify(AppState.sweetsLog));
    localStorage.setItem(STORAGE_KEY_SWEETS_META, JSON.stringify(AppState.sweetsMeta));
  } catch (e) {}
};

// ========== PATCH: EXPORT (extends the shared data builder) ==========
const _swOrigBuildExportData = buildExportData;
window.buildExportData = function () {
  const data = _swOrigBuildExportData();
  data.version = '3.3';
  // v3.3 additions (safely ignored by older versions)
  data.sweetsLog = AppState.sweetsLog;
  data.sweetsMeta = AppState.sweetsMeta;
  return data;
};

// ========== PATCH: IMPORT (accepts v2 through v3.3 files) ==========
const _swOrigImport = importFromJSON;
window.importFromJSON = function (file) {
  return _swOrigImport(file).then(data => {
    if (data.sweetsLog) {
      AppState.sweetsLog = { ...AppState.sweetsLog, ...data.sweetsLog };
      if (data.sweetsMeta && data.sweetsMeta.startDate) {
        const cur = AppState.sweetsMeta.startDate;
        AppState.sweetsMeta.startDate = (!cur || data.sweetsMeta.startDate < cur) ? data.sweetsMeta.startDate : cur;
      }
      swEnsureStartDate();
      saveToLocalStorage();
      if (AppState.currentPage === 'sweets') renderSweetsPage();
    }
    return data;
  });
};

// ========== PATCH: FULL WIPE ==========
const _swOrigClearAll = clearAllData;
window.clearAllData = function () {
  _swOrigClearAll();
  try {
    localStorage.removeItem(STORAGE_KEY_SWEETS_LOG);
    localStorage.removeItem(STORAGE_KEY_SWEETS_META);
  } catch (e) {}
  AppState.sweetsLog = {};
  AppState.sweetsMeta = { startDate: todayStr() };
};

// ========== PATCH: ROUTER ==========
const _swOrigRenderPage = renderPage;
window.renderPage = function (pageId) {
  if (pageId === 'sweets') {
    AppState.currentPage = pageId;
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const section = document.getElementById('page-sweets');
    if (section) section.classList.add('active');
    document.querySelectorAll('.nav-item[data-page]').forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });
    document.getElementById('page-title').textContent = 'Sweets & Fast Food';
    renderSweetsPage();
    return;
  }
  _swOrigRenderPage(pageId);
};
const _swOrigGetPageTitle = getPageTitle;
window.getPageTitle = function (pageId) {
  if (pageId === 'sweets') return 'Sweets & Fast Food';
  return _swOrigGetPageTitle(pageId);
};

// ========== PATCH: COMMAND PALETTE ==========
const _swOrigBuildPaletteItems = buildPaletteItems;
window.buildPaletteItems = function () {
  const items = _swOrigBuildPaletteItems();
  items.push(
    { icon: '⊘', label: 'Go to Sweets & Fast Food', kw: 'sweets fast food candy junk slip failure tracker sugar', group: 'Navigate', run: () => renderPage('sweets') },
    { icon: '🍬', label: 'Log a sweets slip (today)', kw: 'sweets candy sugar slip fail log', group: 'Actions', run: () => { swQuickLog('sweets'); } },
    { icon: '🍔', label: 'Log a fast food slip (today)', kw: 'fast food burger junk slip fail log', group: 'Actions', run: () => { swQuickLog('fastfood'); } },
  );
  return items;
};

// ========== HELPERS ==========
var _swSelectedDate = todayStr();
var _swCalMonth = new Date().getMonth();
var _swCalYear = new Date().getFullYear();

function swDay(date) { return AppState.sweetsLog[date] || []; }
function swCount(date, type) {
  const d = swDay(date);
  return type ? d.filter(s => s.type === type).length : d.length;
}
function swCountRange(endDate, days, type) {
  let n = 0;
  for (let i = 0; i < days; i++) n += swCount(addDays(endDate, -i), type);
  return n;
}
function swCleanDaysRange(endDate, days) {
  const start = AppState.sweetsMeta.startDate || todayStr();
  let clean = 0, tracked = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(endDate, -i);
    if (d < start) continue;
    tracked++;
    if (swCount(d) === 0) clean++;
  }
  return { clean, tracked };
}
function swCurrentStreak() {
  const start = AppState.sweetsMeta.startDate || todayStr();
  let streak = 0;
  let d = todayStr();
  while (d >= start && swCount(d) === 0 && streak < 3650) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}
function swBestStreak() {
  const start = AppState.sweetsMeta.startDate || todayStr();
  const today = todayStr();
  let best = 0, run = 0, d = start, guard = 0;
  while (d <= today && guard < 3650) {
    if (swCount(d) === 0) { run++; best = Math.max(best, run); } else run = 0;
    d = addDays(d, 1);
    guard++;
  }
  return best;
}
function swLastSlipDate() {
  const dates = Object.keys(AppState.sweetsLog).filter(d => swCount(d) > 0).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
function swDaysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}
function swCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#999';
}
function swNowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

// Good / bad verdict for the last 7 days vs the 7 before
function swVerdict() {
  const today = todayStr();
  const thisWeek = swCountRange(today, 7);
  const lastWeek = swCountRange(addDays(today, -7), 7);
  if (thisWeek === 0) return { key: 'great', label: 'Excellent', sub: 'no slips in 7 days', color: '--accent-green' };
  if (thisWeek < lastWeek) return { key: 'good', label: 'Improving', sub: `${lastWeek - thisWeek} fewer than last week`, color: '--accent-green' };
  if (thisWeek === lastWeek) return { key: 'even', label: 'Holding', sub: 'same as last week', color: '--accent-warning' };
  return { key: 'bad', label: 'Slipping', sub: `${thisWeek - lastWeek} more than last week`, color: '--accent-secondary' };
}

// ========== CRUD ==========
function swAddSlip(type, date) {
  if (!SW_TYPES[type]) return;
  const d = date || _swSelectedDate;
  if (d > todayStr()) { showToast("Can't log a slip in the future", 'warning'); return; }
  const noteEl = document.getElementById('sw-note');
  const note = noteEl ? noteEl.value.trim() : '';
  if (!AppState.sweetsLog[d]) AppState.sweetsLog[d] = [];
  AppState.sweetsLog[d].push({
    id: generateId('sw'),
    type,
    note,
    time: d === todayStr() ? swNowTime() : '',
  });
  swEnsureStartDate();
  saveToLocalStorage();
  renderSweetsPage();
  const n = swCount(d);
  showToast(`${SW_TYPES[type].icon} ${SW_TYPES[type].label} slip logged — ${n} on ${formatDateShort(d)}`, 'warning');
}

function swQuickLog(type) {
  _swSelectedDate = todayStr();
  renderPage('sweets');
  swAddSlip(type, todayStr());
}

function swRemoveSlip(date, slipId) {
  const day = AppState.sweetsLog[date];
  if (!day) return;
  AppState.sweetsLog[date] = day.filter(s => s.id !== slipId);
  if (AppState.sweetsLog[date].length === 0) delete AppState.sweetsLog[date];
  saveToLocalStorage();
  renderSweetsPage();
  showToast('Slip removed', 'info');
}

function swPrevDay() { _swSelectedDate = addDays(_swSelectedDate, -1); swSyncCalToSelected(); renderSweetsPage(); }
function swNextDay() {
  const next = addDays(_swSelectedDate, 1);
  if (next > todayStr()) return;
  _swSelectedDate = next; swSyncCalToSelected(); renderSweetsPage();
}
function swJumpToday() { _swSelectedDate = todayStr(); swSyncCalToSelected(); renderSweetsPage(); }
function swJumpDate(dateStr) {
  if (!dateStr) return;
  _swSelectedDate = dateStr > todayStr() ? todayStr() : dateStr;
  swSyncCalToSelected();
  renderSweetsPage();
}
function swSyncCalToSelected() {
  const dt = new Date(_swSelectedDate + 'T12:00:00');
  _swCalMonth = dt.getMonth();
  _swCalYear = dt.getFullYear();
}
function swCalNav(delta) {
  _swCalMonth += delta;
  if (_swCalMonth > 11) { _swCalMonth = 0; _swCalYear++; }
  if (_swCalMonth < 0) { _swCalMonth = 11; _swCalYear--; }
  renderSweetsPage();
}

// ========== RENDER: PAGE ==========
function renderSweetsPage() {
  const container = document.getElementById('page-sweets');
  if (!container) return;
  swEnsureStartDate();

  const today = todayStr();
  const streak = swCurrentStreak();
  const best = swBestStreak();
  const thisWeek = swCountRange(today, 7);
  const lastWeek = swCountRange(addDays(today, -7), 7);
  const cleanWeek = swCleanDaysRange(today, 7);
  const monthStart = today.slice(0, 8) + '01';
  const monthDays = swDaysBetween(monthStart, today) + 1;
  const thisMonth = swCountRange(today, monthDays);
  const verdict = swVerdict();
  const lastSlip = swLastSlipDate();

  container.innerHTML = `
    <div class="stats-grid sw-stats">
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Clean Streak</div>
        <div class="stat-value">${streak}d</div>
        <div class="stat-sub">best: ${best}d${lastSlip ? ` · last slip ${formatDateShort(lastSlip)}` : ''}</div>
      </div>
      <div class="stat-card" style="--stat-color: ${thisWeek <= lastWeek ? 'var(--accent-green)' : 'var(--accent-secondary)'}">
        <div class="stat-label">Last 7 days</div>
        <div class="stat-value">${thisWeek}<span class="ap-stat-frac"> slips</span></div>
        <div class="stat-sub">${lastWeek} the week before · ${cleanWeek.clean}/${cleanWeek.tracked} clean days</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">This Month</div>
        <div class="stat-value">${thisMonth}<span class="ap-stat-frac"> slips</span></div>
        <div class="stat-sub">🍬 ${swCountRange(today, monthDays, 'sweets')} · 🍔 ${swCountRange(today, monthDays, 'fastfood')}</div>
      </div>
      <div class="stat-card sw-verdict sw-verdict-${verdict.key}" style="--stat-color: var(${verdict.color})">
        <div class="stat-label">How you're doing</div>
        <div class="stat-value" style="color: var(${verdict.color})">${verdict.label}</div>
        <div class="stat-sub">${verdict.sub}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      ${renderSweetsLogCard()}
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">▦</span> Slip Calendar</div>
          <div class="sw-cal-nav">
            <button class="btn btn-sm" onclick="swCalNav(-1)">◀</button>
            <span class="sw-cal-label">${new Date(_swCalYear, _swCalMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button class="btn btn-sm" onclick="swCalNav(1)">▶</button>
          </div>
        </div>
        ${renderSweetsCalendar(_swCalYear, _swCalMonth)}
        <div class="sw-legend">
          <span><i class="sw-dot sw-dot-clean"></i> Clean</span>
          <span><i class="sw-dot sw-dot-one"></i> 1 slip</span>
          <span><i class="sw-dot sw-dot-many"></i> 2+ slips</span>
          <span class="sw-legend-hint">Click a day to log or edit it</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">↗</span> Slips per week</div>
          <span class="ov-muted">last 8 weeks</span>
        </div>
        <div class="chart-container" style="height:240px"><canvas id="sw-weekly-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">◎</span> Breakdown</div>
          <span class="ov-muted">since ${formatDateShort(AppState.sweetsMeta.startDate)}</span>
        </div>
        ${renderSweetsBreakdown()}
      </div>
    </div>
  `;
  renderSweetsWeeklyChart();
}

function renderSweetsLogCard() {
  const date = _swSelectedDate;
  const today = todayStr();
  const isToday = date === today;
  const slips = swDay(date);
  return `
    <div class="card sw-log-card ${slips.length ? 'sw-has-slips' : 'sw-is-clean'}">
      <div class="card-header">
        <div class="card-title"><span class="icon">✕</span> Log a slip</div>
        <span class="sw-day-status ${slips.length ? 'bad' : 'good'}">${slips.length ? `${slips.length} slip${slips.length > 1 ? 's' : ''}` : 'clean'}</span>
      </div>

      <div class="sw-date-nav">
        <button class="date-nav-btn" onclick="swPrevDay()">◀</button>
        <input type="date" class="date-input" value="${date}" max="${today}" onchange="swJumpDate(this.value)">
        <button class="date-nav-btn" onclick="swNextDay()" ${isToday ? 'disabled' : ''}>▶</button>
        ${isToday ? '' : `<button class="btn btn-sm" onclick="swJumpToday()">Today</button>`}
      </div>

      <input type="text" class="form-input sw-note" id="sw-note" placeholder="What was it? (optional — e.g. chocolate bar, burger & fries)">

      <div class="sw-buttons">
        ${Object.entries(SW_TYPES).map(([key, t]) => `
          <button class="sw-btn sw-btn-${key}" onclick="swAddSlip('${key}')">
            <span class="sw-btn-icon">${t.icon}</span>
            <span class="sw-btn-text"><strong>I had ${t.label.toLowerCase()}</strong><small>mark as failure</small></span>
          </button>`).join('')}
      </div>

      <div class="sw-slip-list">
        ${slips.length ? slips.map(s => {
          const t = SW_TYPES[s.type] || SW_TYPES.sweets;
          return `
          <div class="sw-slip sw-slip-${s.type}">
            <span class="sw-slip-icon">${t.icon}</span>
            <div class="sw-slip-body">
              <div class="sw-slip-type">${t.label}${s.time ? ` <span class="sw-slip-time">${s.time}</span>` : ''}</div>
              ${s.note ? `<div class="sw-slip-note">${escapeHtml(s.note)}</div>` : ''}
            </div>
            <button class="ap-row-del" onclick="swRemoveSlip('${date}', '${s.id}')" title="Remove this slip">✕</button>
          </div>`;
        }).join('') : `
          <div class="sw-clean-msg">${isToday ? 'No sweets or fast food today. Keep it that way.' : `${formatDateShort(date)} was a clean day.`}</div>`}
      </div>
    </div>
  `;
}

function renderSweetsCalendar(year, month) {
  const today = todayStr();
  const start = AppState.sweetsMeta.startDate || today;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '<div class="sw-cal"><div class="mini-cal-header">';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => { html += `<div class="mini-cal-day-label">${d}</div>`; });
  html += '</div><div class="mini-cal-grid">';
  for (let i = 0; i < firstDay; i++) html += '<div class="mini-cal-cell empty"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isFuture = key > today;
    const beforeStart = key < start;
    const n = swCount(key);
    let cls = '';
    if (!isFuture) {
      if (n >= 2) cls = 'sw-many';
      else if (n === 1) cls = 'sw-one';
      else if (!beforeStart) cls = 'sw-clean';
    }
    const title = isFuture ? '' : n ? `${n} slip${n > 1 ? 's' : ''} — 🍬 ${swCount(key, 'sweets')} · 🍔 ${swCount(key, 'fastfood')}` : (beforeStart ? 'Before tracking started' : 'Clean day');
    html += `<div class="mini-cal-cell ${cls} ${key === today ? 'today' : ''} ${key === _swSelectedDate ? 'sw-selected' : ''} ${isFuture ? 'future' : ''}"
      title="${title}" ${isFuture ? '' : `onclick="swJumpDate('${key}')"`}>${day}${n ? `<span class="sw-cal-count">${n}</span>` : ''}</div>`;
  }
  html += '</div></div>';
  return html;
}

function renderSweetsBreakdown() {
  const all = Object.values(AppState.sweetsLog).flat();
  const total = all.length;
  const sweets = all.filter(s => s.type === 'sweets').length;
  const fast = all.filter(s => s.type === 'fastfood').length;
  const sweetsPct = total ? Math.round((sweets / total) * 100) : 0;
  const fastPct = total ? 100 - sweetsPct : 0;

  const start = AppState.sweetsMeta.startDate || todayStr();
  const trackedDays = swDaysBetween(start, todayStr()) + 1;
  const daysWithSlips = Object.keys(AppState.sweetsLog).filter(d => swCount(d) > 0).length;
  const cleanPct = trackedDays ? Math.round(((trackedDays - daysWithSlips) / trackedDays) * 100) : 100;

  // Worst weekday
  const dow = [0, 0, 0, 0, 0, 0, 0];
  Object.keys(AppState.sweetsLog).forEach(d => { dow[new Date(d + 'T12:00:00').getDay()] += swCount(d); });
  const maxDow = Math.max(...dow);
  const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

  if (!total) {
    return `<div class="empty-state" style="padding:28px 0"><div class="empty-state-icon">◌</div>
      <div class="empty-state-text">No slips logged since ${formatDateShort(start)}. ${trackedDays} clean day${trackedDays > 1 ? 's' : ''} and counting.</div></div>`;
  }

  return `
    <div class="sw-breakdown">
      <div class="sw-bd-row">
        <div class="progress-label"><span class="progress-label-name">🍬 Sweets</span><span class="progress-label-value">${sweets} · ${sweetsPct}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${sweetsPct}%; --bar-color: var(--accent-purple)"></div></div>
      </div>
      <div class="sw-bd-row">
        <div class="progress-label"><span class="progress-label-name">🍔 Fast food</span><span class="progress-label-value">${fast} · ${fastPct}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${fastPct}%; --bar-color: var(--accent-orange)"></div></div>
      </div>
      <div class="sw-bd-facts">
        <div><span class="sw-bd-num">${total}</span><span class="sw-bd-lbl">total slips</span></div>
        <div><span class="sw-bd-num">${cleanPct}%</span><span class="sw-bd-lbl">clean days (${trackedDays - daysWithSlips}/${trackedDays})</span></div>
        <div><span class="sw-bd-num">${maxDow > 0 ? dayNames[dow.indexOf(maxDow)].slice(0, 3) : '—'}</span><span class="sw-bd-lbl">weakest day${maxDow > 0 ? ` (${maxDow})` : ''}</span></div>
      </div>
    </div>
  `;
}

function renderSweetsWeeklyChart() {
  if (typeof Chart === 'undefined') return;
  const today = todayStr();
  const labels = [], sweets = [], fast = [];
  for (let w = 7; w >= 0; w--) {
    const end = addDays(today, -w * 7);
    const startW = addDays(end, -6);
    labels.push(w === 0 ? 'This wk' : `${formatDateShort(startW)}`);
    sweets.push(swCountRange(end, 7, 'sweets'));
    fast.push(swCountRange(end, 7, 'fastfood'));
  }
  const purple = swCssVar('--accent-purple');
  const orange = swCssVar('--accent-orange');
  createChart('sw-weekly-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '🍬 Sweets', data: sweets, backgroundColor: purple, borderRadius: 4, stack: 's' },
        { label: '🍔 Fast food', data: fast, backgroundColor: orange, borderRadius: 4, stack: 's' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
      },
    },
  });
}

console.log('Routine v3.3 sweets & fast food tracker initialized');
