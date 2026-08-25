/* ============================================
   ROUTINE v3 — FEATURES LAYER
   Loaded after app.js. Extends the core with:
   - Overview home page (rings, year ledger, level, week strip)
   - Daily Journal (mood + notes) with trend chart
   - Command palette (Ctrl/Cmd+K)
   - Theme engine (dark / light) persisted + exported
   - Backup reminders, day-summary copy, keyboard shortcuts
   All export/import stays backward & forward compatible.
   ============================================ */

// ========== NEW STATE + STORAGE ==========
const STORAGE_KEY_JOURNAL = 'lifedash_journal';
const STORAGE_KEY_THEME = 'lifedash_theme';
const STORAGE_KEY_LAST_EXPORT = 'lifedash_last_export';

AppState.journal = {}; // { "2026-07-03": { mood: 1-5, note: "" } }

// Load journal + theme immediately (before first paint of pages)
try {
  const j = localStorage.getItem(STORAGE_KEY_JOURNAL);
  if (j) AppState.journal = JSON.parse(j);
} catch (e) { console.warn('journal load failed', e); }

(function applySavedThemeEarly() {
  let theme = 'dark';
  try { theme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark'; } catch (e) {}
  document.documentElement.dataset.theme = theme;
})();

const MOOD_EMOJI = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['Rough', 'Low', 'Neutral', 'Good', 'Great'];
const LEVEL_TITLES = ['Novice', 'Apprentice', 'Practitioner', 'Scholar', 'Adept', 'Expert', 'Master', 'Sage', 'Luminary', 'Polymath'];

// ========== PATCH: PERSISTENCE ==========
const _origSave = saveToLocalStorage;
window.saveToLocalStorage = function () {
  _origSave();
  try { localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(AppState.journal)); } catch (e) {}
};

// ========== PATCH: EXPORT (extends the shared data builder — never redefines the download logic) ==========
const _featOrigBuildExportData = buildExportData;
window.buildExportData = function () {
  const data = _featOrigBuildExportData();
  data.version = '3.0';
  // v3 additions (safely ignored by older versions)
  data.journal = AppState.journal;
  data.theme = document.documentElement.dataset.theme || 'dark';
  return data;
};

// ========== PATCH: IMPORT (accepts v2 and v3 files) ==========
const _origImport = importFromJSON;
window.importFromJSON = function (file) {
  return _origImport(file).then(data => {
    if (data.journal) AppState.journal = { ...AppState.journal, ...data.journal };
    if (data.theme) setTheme(data.theme, true);
    saveToLocalStorage();
    if (['overview', 'journal'].includes(AppState.currentPage)) renderPage(AppState.currentPage);
    return data;
  });
};

// ========== PATCH: FULL WIPE ALSO CLEARS NEW KEYS ==========
const _origClearAll = clearAllData;
window.clearAllData = function () {
  _origClearAll();
  try {
    localStorage.removeItem(STORAGE_KEY_JOURNAL);
    localStorage.removeItem(STORAGE_KEY_LAST_EXPORT);
  } catch (e) {}
  AppState.journal = {};
};

// ========== THEME ENGINE ==========
function setTheme(theme, silent) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(STORAGE_KEY_THEME, theme); } catch (e) {}
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'light' ? '☾' : '☀';
  syncChartTheme();
  if (!silent) {
    // Re-render charts on the current page so grid/label colors follow the theme
    renderPage(AppState.currentPage);
  }
}
function toggleTheme() {
  const cur = document.documentElement.dataset.theme || 'dark';
  setTheme(cur === 'light' ? 'dark' : 'light');
}
function syncChartTheme() {
  if (typeof Chart === 'undefined') return;
  const light = (document.documentElement.dataset.theme === 'light');
  Chart.defaults.color = light ? '#5B6172' : '#95A0B8';
  Chart.defaults.borderColor = light ? 'rgba(32,36,47,0.10)' : 'rgba(149,160,184,0.12)';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 10;
}

// ========== SHARED HELPERS ==========
function overallCompletion(date) {
  return Math.round((calcDayCompletion(date, 'activities') + calcDayCompletion(date, 'studies')) / 2);
}
function totalTasksCompletedAllTime() {
  let n = 0;
  Object.values(AppState.history).forEach(rec => {
    ['activities', 'studies'].forEach(cat => {
      if (!rec[cat]) return;
      Object.values(rec[cat]).forEach(v => { if (v && v.done) n++; });
    });
  });
  return n;
}
function levelInfo() {
  const xp = totalTasksCompletedAllTime() * 10;
  const level = Math.floor(Math.sqrt(xp / 60));
  const curFloor = level * level * 60;
  const nextAt = (level + 1) * (level + 1) * 60;
  const pct = nextAt === curFloor ? 0 : Math.round(((xp - curFloor) / (nextAt - curFloor)) * 100);
  const title = LEVEL_TITLES[Math.min(Math.floor(level / 2), LEVEL_TITLES.length - 1)];
  return { xp, level, pct, nextAt, title };
}
function focusMinutesInRange(start, end) {
  return AppState.pomodoroHistory
    .filter(s => s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + (s.totalMinutes || 0), 0);
}
function ringSVG(pct, colorVar, size, label) {
  const r = (size / 2) - 7;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(pct, 100) / 100);
  return `
  <div class="ov-ring">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="8"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(${colorVar})" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 ${size / 2} ${size / 2})" class="ov-ring-arc"/>
    </svg>
    <div class="ov-ring-center">
      <div class="ov-ring-pct">${pct}<span>%</span></div>
      <div class="ov-ring-label">${label}</div>
    </div>
  </div>`;
}

// ========== JOURNAL DATA ==========
function getJournalEntry(date) { return AppState.journal[date] || null; }
function setMood(date, mood) {
  if (!AppState.journal[date]) AppState.journal[date] = {};
  AppState.journal[date].mood = (AppState.journal[date].mood === mood) ? null : mood;
  saveToLocalStorage();
  document.querySelectorAll(`.mood-row[data-date="${date}"] .mood-btn`).forEach(b => {
    b.classList.toggle('active', Number(b.dataset.mood) === AppState.journal[date].mood);
  });
  if (AppState.currentPage === 'journal') renderJournalPage();
}
function saveJournalNote(date, inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  if (!AppState.journal[date]) AppState.journal[date] = {};
  AppState.journal[date].note = el.value.trim();
  saveToLocalStorage();
  showToast('Journal entry saved', 'success');
  if (AppState.currentPage === 'journal') renderJournalPage();
}
function deleteJournalEntry(date) {
  delete AppState.journal[date];
  saveToLocalStorage();
  showToast('Entry removed', 'info');
  if (AppState.currentPage === 'journal') renderJournalPage();
  else if (AppState.currentPage === 'overview') renderOverviewPage();
}
function journalQuickCard(date, ctx) {
  const entry = getJournalEntry(date) || {};
  const noteId = `journal-note-${ctx}`;
  return `
  <div class="card journal-quick">
    <div class="card-header">
      <div class="card-title"><span class="icon">✎</span> Journal — ${formatDateShort(date)}</div>
      ${entry.mood ? `<span class="journal-mood-chip">${MOOD_EMOJI[entry.mood - 1]} ${MOOD_LABELS[entry.mood - 1]}</span>` : ''}
    </div>
    <div class="mood-row" data-date="${date}">
      ${[1, 2, 3, 4, 5].map(m => `
        <button class="mood-btn ${entry.mood === m ? 'active' : ''}" data-mood="${m}"
          title="${MOOD_LABELS[m - 1]}" onclick="setMood('${date}', ${m})">${MOOD_EMOJI[m - 1]}</button>`).join('')}
    </div>
    <textarea class="form-input journal-note" id="${noteId}" rows="3"
      placeholder="How did the day go? Wins, friction, thoughts…">${escapeHtml(entry.note || '')}</textarea>
    <div class="journal-quick-actions">
      <button class="btn btn-sm btn-primary" onclick="saveJournalNote('${date}', '${noteId}')">Save entry</button>
    </div>
  </div>`;
}

// ========== COPY DAY SUMMARY ==========
function copyDaySummary(date) {
  const rec = getDayRecord(date);
  const lines = [`ROUTINE — ${formatDate(date)}`, ''];
  [['activities', 'Activities'], ['studies', 'Studies']].forEach(([cat, label]) => {
    const pct = calcDayCompletion(date, cat);
    lines.push(`${label} (${pct}%)`);
    AppState.config[cat].forEach(item => {
      if (!isItemActiveOnDate(item.id, date) && item.frequency !== 'optional') return;
      const st = rec[cat]?.[item.id];
      if (item.frequency === 'optional' && !(st && st.done)) return;
      const mark = st && st.done ? '✓' : '✗';
      const detail = st && st.detail ? ` — ${st.detail}` : '';
      lines.push(`  ${mark} ${item.name}${detail}`);
    });
    lines.push('');
  });
  const focus = AppState.pomodoroHistory.filter(s => s.date === date).reduce((a, s) => a + (s.totalMinutes || 0), 0);
  if (focus > 0) lines.push(`Focus: ${focus} min`);
  const j = getJournalEntry(date);
  if (j && j.mood) lines.push(`Mood: ${MOOD_EMOJI[j.mood - 1]} ${MOOD_LABELS[j.mood - 1]}`);
  if (j && j.note) lines.push(`Note: ${j.note}`);
  const text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast('Day summary copied to clipboard', 'success'),
      () => showToast('Could not access clipboard', 'error')
    );
  } else {
    showToast('Clipboard not available in this browser', 'error');
  }
}

// ========== PATCH: ROUTER (adds Overview + Journal pages) ==========
const _origRenderPage = renderPage;
window.renderPage = function (pageId) {
  if (pageId === 'overview' || pageId === 'journal') {
    AppState.currentPage = pageId;
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const section = document.getElementById(`page-${pageId}`);
    if (section) section.classList.add('active');
    document.querySelectorAll('.nav-item[data-page]').forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });
    document.getElementById('page-title').textContent = pageId === 'overview' ? 'Overview' : 'Journal';
    if (pageId === 'overview') renderOverviewPage(); else renderJournalPage();
    return;
  }
  _origRenderPage(pageId);
};
const _origGetPageTitle = getPageTitle;
window.getPageTitle = function (pageId) {
  if (pageId === 'overview') return 'Overview';
  if (pageId === 'journal') return 'Journal';
  return _origGetPageTitle(pageId);
};

// ========== OVERVIEW PAGE ==========
function renderOverviewPage() {
  const container = document.getElementById('page-overview');
  const today = todayStr();
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const actPct = calcDayCompletion(today, 'activities');
  const studPct = calcDayCompletion(today, 'studies');
  const streak = calcStreak('activities');
  const lvl = levelInfo();

  // Week strip — last 7 days
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    weekDays.push({ date: d, pct: overallCompletion(d), isToday: d === today });
  }
  const wk = getWeekRange(today);
  const focusWeek = focusMinutesInRange(wk.start, wk.end);
  const focusToday = focusMinutesInRange(today, today);

  // Upcoming events
  const upcoming = (AppState.calendarEvents || [])
    .filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  // Active goals + objectives snapshot
  const activeGoals = (AppState.goals || []).filter(g => !g.archived).slice(0, 2);
  const activeObjs = (AppState.objectives || []).filter(o => !o.archived).slice(0, 2);

  // Pending tasks today
  const pending = [];
  ['activities', 'studies'].forEach(cat => {
    AppState.config[cat].forEach(item => {
      if (item.frequency === 'optional') return;
      if (!isItemActiveOnDate(item.id, today)) return;
      const st = getItemStatus(today, cat, item.id);
      if (!st || !st.done) pending.push({ ...item, cat });
    });
  });

  container.innerHTML = `
    <div class="ov-hero">
      <div class="ov-hero-text">
        <div class="ov-eyebrow">${formatDate(today)}</div>
        <h2 class="ov-greeting">${greeting}.</h2>
        <p class="ov-sub">${pending.length === 0
          ? 'Every tracked task is done. The ledger is clean.'
          : `${pending.length} task${pending.length > 1 ? 's' : ''} still open today · ${streak}d streak · ${focusToday} min of focus logged`}</p>
        <div class="ov-quick">
          <button class="btn btn-primary" onclick="renderPage('today')">Open daily tracker</button>
          <button class="btn" onclick="renderPage('pomodoro')">Start a focus session</button>
          <button class="btn" onclick="exportToJSON()">⬇ Backup</button>
        </div>
      </div>
      <div class="ov-rings">
        ${ringSVG(actPct, '--accent-primary', 132, 'Activities')}
        ${ringSVG(studPct, '--accent-blue', 132, 'Studies')}
      </div>
    </div>

    <div class="ov-grid">
      <div class="card ov-level">
        <div class="card-header"><div class="card-title"><span class="icon">◈</span> Discipline level</div></div>
        <div class="ov-level-row">
          <div class="ov-level-num">${lvl.level}</div>
          <div class="ov-level-meta">
            <div class="ov-level-title">${lvl.title}</div>
            <div class="ov-level-xp">${lvl.xp.toLocaleString()} XP · ${lvl.nextAt - lvl.xp} to next level</div>
            <div class="go-mini-progress"><div class="go-mini-progress-fill" style="width:${lvl.pct}%; background: var(--accent-primary)"></div></div>
          </div>
        </div>
        <div class="ov-level-foot">Every completed task earns 10 XP — ${totalTasksCompletedAllTime().toLocaleString()} completed so far.</div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">▤</span> Last 7 days</div>
          <span class="ov-muted">${focusWeek} min focus this week</span></div>
        <div class="weekstrip">
          ${weekDays.map(d => `
            <div class="weekstrip-day ${d.isToday ? 'today' : ''}" title="${formatDate(d.date)}: ${d.pct}%"
                 onclick="jumpToDate('${d.date}'); renderPage('today')">
              <div class="weekstrip-bar"><div class="weekstrip-fill" style="height:${Math.max(d.pct, 4)}%"></div></div>
              <div class="weekstrip-pct">${d.pct}</div>
              <div class="weekstrip-label">${new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="card full-width">
        <div class="card-header"><div class="card-title"><span class="icon">❖</span> The year, day by day</div>
          <span class="ov-muted">combined activities + studies</span></div>
        ${renderYearLedger()}
      </div>

      ${journalQuickCard(today, 'ov')}

      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">◷</span> Coming up</div>
          <button class="btn btn-sm" onclick="renderPage('calendar')">Calendar →</button></div>
        ${upcoming.length ? upcoming.map(e => {
          const dd = daysBetween(today, e.date);
          return `<div class="ov-event">
            <div class="ov-event-when">${dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : `in ${dd}d`}</div>
            <div class="ov-event-info"><div class="ov-event-title">${escapeHtml(e.title)}</div>
            <div class="ov-event-date">${formatDateShort(e.date)}</div></div></div>`;
        }).join('') : `<div class="empty-state"><div class="empty-state-icon">◌</div><div class="empty-state-text">No upcoming events. Add one from the calendar.</div></div>`}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">⛰</span> Goals in motion</div>
          <button class="btn btn-sm" onclick="renderPage('goals')">All goals →</button></div>
        ${(activeGoals.length || activeObjs.length) ? `
          ${activeGoals.map(g => {
            const p = getGoalProgress(g);
            return `<div class="ov-goal"><div class="ov-goal-name">${escapeHtml(g.name)}</div>
              <div class="go-mini-progress"><div class="go-mini-progress-fill" style="width:${p.pct}%; background: var(--accent-purple)"></div></div>
              <div class="ov-goal-pct">${p.pct}%</div></div>`;
          }).join('')}
          ${activeObjs.map(o => {
            const p = getObjectiveProgress(o);
            return `<div class="ov-goal"><div class="ov-goal-name">${escapeHtml(o.name)}</div>
              <div class="go-mini-progress"><div class="go-mini-progress-fill" style="width:${p.pct}%; background: var(--accent-blue)"></div></div>
              <div class="ov-goal-pct">${p.pct}%</div></div>`;
          }).join('')}
        ` : `<div class="empty-state"><div class="empty-state-icon">◌</div><div class="empty-state-text">Nothing here yet. Set a goal to see it tracked.</div></div>`}
      </div>
    </div>
  `;
}

function renderYearLedger() {
  const today = todayStr();
  // Align to Monday, cover ~52 weeks
  let start = addDays(today, -363);
  while (new Date(start + 'T12:00:00').getDay() !== 1) start = addDays(start, -1);

  const dates = getDatesInRange(start, today);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let cells = '';
  const monthAtWeek = [];
  dates.forEach((d, i) => {
    if (i % 7 === 0) monthAtWeek.push(new Date(d + 'T12:00:00').getMonth());
    const hasData = !!AppState.history[d];
    const pct = hasData ? overallCompletion(d) : 0;
    let level = 0;
    if (pct > 0) level = 1;
    if (pct >= 25) level = 2;
    if (pct >= 50) level = 3;
    if (pct >= 75) level = 4;
    if (pct >= 100) level = 5;
    cells += `<div class="ym-cell level-${level} ${d === today ? 'is-today' : ''}" title="${formatDate(d)} — ${hasData ? pct + '%' : 'no record'}"
      onclick="jumpToDate('${d}'); renderPage('today')"></div>`;
  });

  let labels = '';
  monthAtWeek.forEach((m, w) => {
    const isNew = w === 0 || m !== monthAtWeek[w - 1];
    labels += `<div class="ym-month">${isNew ? monthNames[m] : ''}</div>`;
  });

  const daysTracked = Object.keys(AppState.history).length;
  return `
    <div class="ym-scroll">
      <div class="ym-months" style="grid-template-columns: repeat(${monthAtWeek.length}, var(--ym-cell))">${labels}</div>
      <div class="yearmap" style="grid-template-columns: repeat(${monthAtWeek.length}, var(--ym-cell))">${cells}</div>
    </div>
    <div class="ym-legend">
      <span>${daysTracked} days on record</span>
      <span class="ym-legend-scale">Less
        <i class="ym-cell level-1"></i><i class="ym-cell level-2"></i><i class="ym-cell level-3"></i><i class="ym-cell level-4"></i><i class="ym-cell level-5"></i>
      More</span>
    </div>`;
}

// ========== JOURNAL PAGE ==========
let _journalSelectedDate = todayStr();
function renderJournalPage() {
  const container = document.getElementById('page-journal');
  const dates = Object.keys(AppState.journal).sort().reverse();
  const withContent = dates.filter(d => AppState.journal[d] && (AppState.journal[d].mood || AppState.journal[d].note));

  // Mood stats
  const moodCounts = [0, 0, 0, 0, 0];
  withContent.forEach(d => { const m = AppState.journal[d].mood; if (m) moodCounts[m - 1]++; });
  const moodTotal = moodCounts.reduce((a, b) => a + b, 0);
  const avgMood = moodTotal ? (moodCounts.reduce((a, c, i) => a + c * (i + 1), 0) / moodTotal).toFixed(1) : '—';

  container.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Entries</div><div class="stat-value">${withContent.length}</div><div class="stat-sub">days journaled</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Average mood</div><div class="stat-value">${avgMood}</div><div class="stat-sub">on a 1–5 scale</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Most frequent</div>
        <div class="stat-value">${moodTotal ? MOOD_EMOJI[moodCounts.indexOf(Math.max(...moodCounts))] : '—'}</div>
        <div class="stat-sub">${moodTotal ? MOOD_LABELS[moodCounts.indexOf(Math.max(...moodCounts))] : 'no moods logged yet'}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">✎</span> Write</div>
          <input type="date" class="date-input" value="${_journalSelectedDate}"
            onchange="_journalSelectedDate=this.value; renderJournalPage()"></div>
        ${journalQuickCardInner(_journalSelectedDate)}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">∿</span> Mood — last 30 days</div></div>
        <div class="chart-container" style="height:220px"><canvas id="journal-mood-chart"></canvas></div>
      </div>
    </div>

    <div class="card full-width" style="margin-top: 20px">
      <div class="card-header"><div class="card-title"><span class="icon">☰</span> Past entries</div>
        <input type="text" class="form-input" id="journal-search" placeholder="Search notes…" style="max-width:220px"
          oninput="filterJournalEntries(this.value)"></div>
      <div id="journal-entries-list">${renderJournalEntries(withContent, '')}</div>
    </div>
  `;
  renderMoodChart();
}
function journalQuickCardInner(date) {
  const entry = getJournalEntry(date) || {};
  return `
    <div class="mood-row" data-date="${date}">
      ${[1, 2, 3, 4, 5].map(m => `
        <button class="mood-btn ${entry.mood === m ? 'active' : ''}" data-mood="${m}"
          title="${MOOD_LABELS[m - 1]}" onclick="setMood('${date}', ${m})">${MOOD_EMOJI[m - 1]}</button>`).join('')}
    </div>
    <textarea class="form-input journal-note" id="journal-note-page" rows="6"
      placeholder="How did the day go? Wins, friction, thoughts…">${escapeHtml(entry.note || '')}</textarea>
    <div class="journal-quick-actions">
      <button class="btn btn-sm btn-primary" onclick="saveJournalNote('${date}', 'journal-note-page')">Save entry</button>
      ${(entry.mood || entry.note) ? `<button class="btn btn-sm btn-danger" onclick="deleteJournalEntry('${date}')">Remove</button>` : ''}
    </div>`;
}
function renderJournalEntries(dates, term) {
  const t = (term || '').toLowerCase();
  const filtered = dates.filter(d => {
    if (!t) return true;
    const e = AppState.journal[d];
    return (e.note || '').toLowerCase().includes(t) || d.includes(t);
  });
  if (!filtered.length) return `<div class="empty-state"><div class="empty-state-icon">◌</div><div class="empty-state-text">${t ? 'No entries match that search.' : 'No entries yet. The first line is the hardest.'}</div></div>`;
  return filtered.slice(0, 60).map(d => {
    const e = AppState.journal[d];
    return `<div class="journal-entry" onclick="_journalSelectedDate='${d}'; renderJournalPage()">
      <div class="journal-entry-head">
        <span class="journal-entry-date">${formatDate(d)}</span>
        ${e.mood ? `<span class="journal-mood-chip">${MOOD_EMOJI[e.mood - 1]} ${MOOD_LABELS[e.mood - 1]}</span>` : ''}
      </div>
      ${e.note ? `<div class="journal-entry-note">${escapeHtml(e.note)}</div>` : '<div class="journal-entry-note muted">Mood only — no note.</div>'}
    </div>`;
  }).join('');
}
function filterJournalEntries(term) {
  const dates = Object.keys(AppState.journal).sort().reverse()
    .filter(d => AppState.journal[d] && (AppState.journal[d].mood || AppState.journal[d].note));
  document.getElementById('journal-entries-list').innerHTML = renderJournalEntries(dates, term);
}
function renderMoodChart() {
  const today = todayStr();
  const labels = [], data = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    labels.push(formatDateShort(d));
    const e = AppState.journal[d];
    data.push(e && e.mood ? e.mood : null);
  }
  createChart('journal-mood-chart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data, borderColor: '#E5B04C', backgroundColor: 'rgba(229,176,76,0.12)',
        pointBackgroundColor: '#E5B04C', spanGaps: true, tension: 0.35, fill: true, pointRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw ? `${MOOD_EMOJI[c.raw - 1]} ${MOOD_LABELS[c.raw - 1]}` : '' } } },
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1, callback: v => MOOD_EMOJI[v - 1] || '' } },
        x: { ticks: { maxTicksLimit: 8 } }
      }
    }
  });
}

// ========== PATCH: TODAY PAGE EXTRAS (journal + copy summary) ==========
const _origRenderToday = renderTodayPage;
window.renderTodayPage = function () {
  _origRenderToday();
  const container = document.getElementById('page-today');
  const date = AppState.currentDate;
  container.insertAdjacentHTML('beforeend', `
    <div class="dashboard-grid" style="margin-top:20px">
      ${journalQuickCard(date, 'today')}
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">⧉</span> Share the day</div></div>
        <p class="ov-muted" style="margin-bottom:14px">Copy a clean text summary of this day — tasks, details, focus time and mood — ready to paste anywhere.</p>
        <button class="btn" onclick="copyDaySummary('${date}')">⧉ Copy day summary</button>
      </div>
    </div>
  `);
};

// ========== COMMAND PALETTE ==========
let _cmdkIndex = 0;
let _cmdkItems = [];
function buildPaletteItems() {
  const today = todayStr();
  const pages = [
    ['overview', '⌂', 'Overview', 'home dashboard'],
    ['today', '☑', 'Daily Tracker', 'today tasks checklist'],
    ['pomodoro', '◔', 'Study Mode', 'focus timer pomodoro'],
    ['goals', '⛰', 'Goals & Objectives', 'goals'],
    ['trackers', '↗', 'Progress Trackers', 'trackers money books'],
    ['calendar', '▦', 'Calendar', 'events dates'],
    ['habits', '⛨', 'Habit Control', 'vices habits'],
    ['journal', '✎', 'Journal', 'mood notes diary'],
    ['activities-dash', '⚡', 'Activities Dashboard', 'charts stats'],
    ['studies-dash', '✦', 'Studies Dashboard', 'charts stats study'],
    ['comparison', '⚖', 'Comparison', 'compare weeks'],
    ['observations', '◎', 'Observations', 'details notes'],
    ['insights', '❋', 'Insights', 'analysis smart'],
    ['history', '☰', 'History', 'table records'],
    ['settings', '⚙', 'Configuration', 'settings items frequency'],
    ['data', '⛃', 'Data Management', 'export import backup'],
  ].map(([id, icon, label, kw]) => ({
    icon, label: `Go to ${label}`, kw: kw + ' ' + label.toLowerCase(), group: 'Navigate',
    run: () => renderPage(id),
  }));

  const actions = [
    { icon: '☀', label: 'Toggle light / dark theme', kw: 'theme light dark mode', group: 'Actions', run: () => toggleTheme() },
    { icon: '⬇', label: 'Export backup (JSON)', kw: 'export save backup download', group: 'Actions', run: () => exportToJSON() },
    { icon: '◉', label: 'Jump to today', kw: 'today now current date', group: 'Actions', run: () => { jumpToDate(today); renderPage('today'); } },
    { icon: '⧉', label: 'Copy today’s summary', kw: 'copy clipboard share summary', group: 'Actions', run: () => copyDaySummary(today) },
    { icon: '＋', label: 'New calendar event', kw: 'new add event calendar', group: 'Actions', run: () => { renderPage('calendar'); openCreateEventModal(today); } },
    { icon: '＋', label: 'New goal', kw: 'new add goal', group: 'Actions', run: () => { renderPage('goals'); openCreateGoalModal(); } },
    { icon: '＋', label: 'New objective', kw: 'new add objective', group: 'Actions', run: () => { renderPage('goals'); openCreateObjectiveModal(); } },
    { icon: '＋', label: 'New tracker', kw: 'new add tracker progress', group: 'Actions', run: () => { renderPage('trackers'); openCreateTrackerModal(); } },
    { icon: '▶', label: 'Start focus session', kw: 'start pomodoro focus timer', group: 'Actions', run: () => { renderPage('pomodoro'); setTimeout(() => pomodoroStart(), 100); } },
  ];

  const tasks = [];
  ['activities', 'studies'].forEach(cat => {
    AppState.config[cat].forEach(item => {
      if (!isItemActiveOnDate(item.id, today) && item.frequency !== 'optional') return;
      const st = getItemStatus(today, cat, item.id);
      const done = st && st.done;
      tasks.push({
        icon: done ? '✓' : '○',
        label: `${done ? 'Undo' : 'Mark done'}: ${item.name}`,
        kw: 'task toggle ' + item.name.toLowerCase(), group: 'Today’s tasks',
        run: () => {
          if (AppState.currentDate !== today) jumpToDate(today);
          toggleItem(today, cat, item.id);
          if (AppState.currentPage === 'today') renderTodayPage();
          if (AppState.currentPage === 'overview') renderOverviewPage();
          showToast(`${item.name} ${done ? 'reopened' : 'completed'}`, done ? 'info' : 'success');
        },
      });
    });
  });

  return [...actions, ...pages, ...tasks];
}
function openPalette() {
  const overlay = document.getElementById('cmdk-overlay');
  const input = document.getElementById('cmdk-input');
  overlay.classList.add('open');
  input.value = '';
  _cmdkIndex = 0;
  renderPaletteList('');
  setTimeout(() => input.focus(), 30);
}
function closePalette() {
  document.getElementById('cmdk-overlay').classList.remove('open');
}
function renderPaletteList(query) {
  const q = query.trim().toLowerCase();
  const all = buildPaletteItems();
  _cmdkItems = q ? all.filter(i => (i.label + ' ' + i.kw).toLowerCase().includes(q)) : all;
  _cmdkItems = _cmdkItems.slice(0, 14);
  if (_cmdkIndex >= _cmdkItems.length) _cmdkIndex = 0;
  const list = document.getElementById('cmdk-list');
  if (!_cmdkItems.length) {
    list.innerHTML = `<div class="cmdk-empty">Nothing matches “${escapeHtml(query)}”.</div>`;
    return;
  }
  let html = '', lastGroup = '';
  _cmdkItems.forEach((item, i) => {
    if (item.group !== lastGroup) { html += `<div class="cmdk-group">${item.group}</div>`; lastGroup = item.group; }
    html += `<div class="cmdk-item ${i === _cmdkIndex ? 'active' : ''}" data-idx="${i}"
      onmouseenter="_cmdkIndex=${i}; highlightPalette()" onclick="runPaletteItem(${i})">
      <span class="cmdk-icon">${item.icon}</span><span>${escapeHtml(item.label)}</span></div>`;
  });
  list.innerHTML = html;
}
function highlightPalette() {
  document.querySelectorAll('.cmdk-item').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.idx) === _cmdkIndex);
  });
}
function runPaletteItem(i) {
  const item = _cmdkItems[i];
  closePalette();
  if (item) item.run();
}

// ========== BACKUP REMINDER ==========
function checkBackupReminder() {
  const trackedDays = Object.keys(AppState.history).length;
  if (trackedDays < 3) return;
  let last = 0;
  try { last = Number(localStorage.getItem(STORAGE_KEY_LAST_EXPORT) || 0); } catch (e) {}
  const days = (Date.now() - last) / 86400000;
  if (!last || days > 7) {
    showToast(`No backup in ${last ? Math.floor(days) + ' days' : 'a while'} — export your data to keep it safe`, 'warning');
  }
}

// ========== KEYBOARD SHORTCUTS ==========
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('cmdk-overlay');
    const paletteOpen = overlay.classList.contains('open');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOpen ? closePalette() : openPalette();
      return;
    }
    if (paletteOpen) {
      if (e.key === 'Escape') { closePalette(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); _cmdkIndex = Math.min(_cmdkIndex + 1, _cmdkItems.length - 1); highlightPalette(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _cmdkIndex = Math.max(_cmdkIndex - 1, 0); highlightPalette(); }
      else if (e.key === 'Enter') { e.preventDefault(); runPaletteItem(_cmdkIndex); }
      return;
    }
    // Global shortcuts (skip when typing)
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (e.key === '[' && AppState.currentPage === 'today') navigateDate(-1);
    if (e.key === ']' && AppState.currentPage === 'today') navigateDate(1);
  });
  const input = document.getElementById('cmdk-input');
  input.addEventListener('input', () => { _cmdkIndex = 0; renderPaletteList(input.value); });
  document.getElementById('cmdk-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'cmdk-overlay') closePalette();
  });
}

// ========== BOOT (runs after app.js's own DOMContentLoaded handler) ==========
document.addEventListener('DOMContentLoaded', () => {
  syncChartTheme();
  setTheme(document.documentElement.dataset.theme || 'dark', true);

  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
  document.getElementById('cmdk-btn')?.addEventListener('click', openPalette);

  initShortcuts();

  // Land on the new Overview page
  renderPage('overview');

  setTimeout(checkBackupReminder, 1600);
  console.log('Routine v3 features layer initialized');
});
