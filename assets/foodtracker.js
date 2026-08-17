/* ============================================
   ROUTINE v3.2 — FOOD TRACKER LAYER
   Loaded after actionplan.js. Adds:
   - Food Tracker page (nav: Daily)
   - Five daily meal slots (Breakfast, Second
     Breakfast, Lunch, Afternoon Snack, Dinner),
     each with free-text + time, fully editable
     and removable. Any slot can be left blank.
   - Per-day JSON export for quick nightly
     check-ins, independent of the full backup.
   Export/import stays backward & forward compatible.
   ============================================ */

// ========== STATE + STORAGE ==========
const STORAGE_KEY_FOODLOG = 'lifedash_foodlog';

const FT_MEAL_SLOTS = [
  { id: 'breakfast',        label: 'Breakfast',         icon: '🍳' },
  { id: 'second_breakfast', label: 'Second Breakfast',  icon: '🥐' },
  { id: 'lunch',            label: 'Lunch',             icon: '🍽️' },
  { id: 'afternoon_snack',  label: 'Afternoon Snack',   icon: '🍎' },
  { id: 'dinner',           label: 'Dinner',            icon: '🍲' },
];

AppState.foodLog = {};
/*
  Shape: { "2026-08-17": { breakfast: { text, time }, lunch: { text, time }, ... } }
  A meal key only exists on a day once it has text and/or a time — leaving
  a meal blank simply means that key is never written for that date.
*/

try {
  const raw = localStorage.getItem(STORAGE_KEY_FOODLOG);
  if (raw) AppState.foodLog = JSON.parse(raw);
} catch (e) { console.warn('food log load failed', e); }

// ========== PATCH: PERSISTENCE ==========
const _ftOrigSave = saveToLocalStorage;
window.saveToLocalStorage = function () {
  _ftOrigSave();
  try { localStorage.setItem(STORAGE_KEY_FOODLOG, JSON.stringify(AppState.foodLog)); } catch (e) {}
};

// ========== PATCH: EXPORT (schema superset — old files import fine) ==========
window.exportToJSON = function () {
  const data = {
    version: '3.2',
    exportDate: new Date().toISOString(),
    config: AppState.config,
    history: AppState.history,
    goals: AppState.goals,
    objectives: AppState.objectives,
    calendarEvents: AppState.calendarEvents,
    trackers: AppState.trackers,
    schedules: AppState.schedules,
    pomodoroConfig: AppState.pomodoroConfig,
    pomodoroHistory: AppState.pomodoroHistory,
    habits: AppState.habits,
    habitsLog: AppState.habitsLog,
    journal: AppState.journal,
    theme: document.documentElement.dataset.theme || 'dark',
    actionPlans: AppState.actionPlans,
    // v3.2 addition (safely ignored by older versions)
    foodLog: AppState.foodLog,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `life_dashboard.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try { localStorage.setItem(STORAGE_KEY_LAST_EXPORT, Date.now().toString()); } catch (e) {}
  showToast('Backup exported', 'success');
};

// ========== PATCH: IMPORT (accepts v2 through v3.2 files) ==========
const _ftOrigImport = importFromJSON;
window.importFromJSON = function (file) {
  return _ftOrigImport(file).then(data => {
    if (data.foodLog) {
      AppState.foodLog = { ...AppState.foodLog, ...data.foodLog };
      saveToLocalStorage();
      if (AppState.currentPage === 'foodtracker') renderFoodTrackerPage();
    }
    return data;
  });
};

// ========== PATCH: FULL WIPE ==========
const _ftOrigClearAll = clearAllData;
window.clearAllData = function () {
  _ftOrigClearAll();
  try { localStorage.removeItem(STORAGE_KEY_FOODLOG); } catch (e) {}
  AppState.foodLog = {};
};

// ========== PATCH: ROUTER ==========
const _ftOrigRenderPage = renderPage;
window.renderPage = function (pageId) {
  if (pageId === 'foodtracker') {
    AppState.currentPage = pageId;
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const section = document.getElementById('page-foodtracker');
    if (section) section.classList.add('active');
    document.querySelectorAll('.nav-item[data-page]').forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });
    document.getElementById('page-title').textContent = 'Food Tracker';
    renderFoodTrackerPage();
    return;
  }
  _ftOrigRenderPage(pageId);
};
const _ftOrigGetPageTitle = getPageTitle;
window.getPageTitle = function (pageId) {
  if (pageId === 'foodtracker') return 'Food Tracker';
  return _ftOrigGetPageTitle(pageId);
};

// ========== PATCH: COMMAND PALETTE ==========
const _ftOrigBuildPaletteItems = buildPaletteItems;
window.buildPaletteItems = function () {
  const items = _ftOrigBuildPaletteItems();
  items.push(
    { icon: '▣', label: 'Go to Food Tracker', kw: 'food tracker meals breakfast lunch dinner eat nutrition', group: 'Navigate', run: () => renderPage('foodtracker') },
    { icon: '⬇', label: 'Export this day\u2019s food log', kw: 'export food day meals json', group: 'Actions', run: () => { renderPage('foodtracker'); exportFoodDay(_ftSelectedDate); } },
  );
  return items;
};

// ========== HELPERS ==========
var _ftSelectedDate = todayStr();

function getFoodDay(date) {
  return AppState.foodLog[date] || {};
}

function ftMealCount(date) {
  const day = getFoodDay(date);
  return FT_MEAL_SLOTS.reduce((n, s) => n + (day[s.id] && (day[s.id].text || day[s.id].time) ? 1 : 0), 0);
}

function ftDaysTracked() {
  return Object.keys(AppState.foodLog).filter(d => ftMealCount(d) > 0).length;
}

function ftLoggingStreak() {
  let streak = 0;
  let check = todayStr();
  while (streak < 365) {
    if (ftMealCount(check) > 0) {
      streak++;
      check = addDays(check, -1);
    } else {
      break;
    }
  }
  return streak;
}

// ========== CRUD ==========
function saveFoodMeal(date, mealId) {
  const textEl = document.getElementById(`ft-text-${mealId}`);
  const timeEl = document.getElementById(`ft-time-${mealId}`);
  const text = textEl ? textEl.value.trim() : '';
  const time = timeEl ? timeEl.value : '';

  // Both fields empty = treat as "left blank", same as clearing it
  if (!text && !time) {
    clearFoodMeal(date, mealId, true);
    return;
  }

  if (!AppState.foodLog[date]) AppState.foodLog[date] = {};
  AppState.foodLog[date][mealId] = { text, time };
  saveToLocalStorage();
  renderFoodTrackerPage();
  const slot = FT_MEAL_SLOTS.find(s => s.id === mealId);
  showToast(`${slot ? slot.label : 'Meal'} saved`, 'success');
}

function clearFoodMeal(date, mealId, silent) {
  if (AppState.foodLog[date]) {
    delete AppState.foodLog[date][mealId];
    if (Object.keys(AppState.foodLog[date]).length === 0) delete AppState.foodLog[date];
  }
  saveToLocalStorage();
  renderFoodTrackerPage();
  if (!silent) {
    const slot = FT_MEAL_SLOTS.find(s => s.id === mealId);
    showToast(`${slot ? slot.label : 'Meal'} cleared`, 'info');
  }
}

function ftPrevDay() { _ftSelectedDate = addDays(_ftSelectedDate, -1); renderFoodTrackerPage(); }
function ftNextDay() { _ftSelectedDate = addDays(_ftSelectedDate, 1); renderFoodTrackerPage(); }
function ftJumpToday() { _ftSelectedDate = todayStr(); renderFoodTrackerPage(); }
function ftJumpDate(dateStr) { _ftSelectedDate = dateStr; renderFoodTrackerPage(); }

// Export a single day's food log as its own JSON file — for nightly check-ins.
function exportFoodDay(date) {
  const day = getFoodDay(date);
  const meals = {};
  FT_MEAL_SLOTS.forEach(s => {
    meals[s.id] = (day[s.id] && (day[s.id].text || day[s.id].time))
      ? { label: s.label, text: day[s.id].text || '', time: day[s.id].time || '' }
      : null;
  });
  const data = { date, meals };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `food_log_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported food log for ${formatDateShort(date)}`, 'success');
}

// ========== RENDER: PAGE ==========
function renderFoodTrackerPage() {
  const container = document.getElementById('page-foodtracker');
  if (!container) return;
  const date = _ftSelectedDate;
  const day = getFoodDay(date);
  const loggedToday = ftMealCount(date);
  const streak = ftLoggingStreak();
  const daysTracked = ftDaysTracked();

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Logged — ${formatDateShort(date)}</div>
        <div class="stat-value">${loggedToday}<span class="ap-stat-frac">/${FT_MEAL_SLOTS.length}</span></div>
        <div class="stat-sub">meals recorded</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Logging Streak</div>
        <div class="stat-value">${streak}d</div>
        <div class="stat-sub">consecutive days tracked</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Days Tracked</div>
        <div class="stat-value">${daysTracked}</div>
        <div class="stat-sub">all-time</div>
      </div>
    </div>

    <div class="ft-toolbar">
      <div class="ft-date-nav">
        <button class="date-nav-btn" onclick="ftPrevDay()">◀</button>
        <input type="date" class="date-input" value="${date}" onchange="ftJumpDate(this.value)">
        <button class="date-nav-btn" onclick="ftNextDay()">▶</button>
        <button class="btn btn-sm" onclick="ftJumpToday()">Today</button>
      </div>
      <button class="btn btn-primary" onclick="exportFoodDay('${date}')">⬇ Export this day</button>
    </div>

    <div class="ft-grid">
      ${FT_MEAL_SLOTS.map(slot => renderFoodMealCard(date, slot, day[slot.id])).join('')}
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title"><span class="icon">☰</span> Recent Days</div></div>
      <div class="ft-history-list">
        ${renderFoodHistoryList(date)}
      </div>
    </div>
  `;
}

function renderFoodMealCard(date, slot, entry) {
  const hasEntry = !!(entry && (entry.text || entry.time));
  const text = entry ? (entry.text || '') : '';
  const time = entry ? (entry.time || '') : '';
  return `
    <div class="card ft-meal-card ${hasEntry ? 'ft-has-entry' : ''}">
      <div class="ft-meal-head">
        <span class="ft-meal-icon">${slot.icon}</span>
        <span class="ft-meal-label">${slot.label}</span>
        ${hasEntry ? `<span class="ft-meal-badge">logged</span>` : `<span class="ft-meal-badge ft-meal-badge-empty">blank</span>`}
      </div>
      <textarea class="form-input ft-meal-text" id="ft-text-${slot.id}" rows="2"
        placeholder="What did you eat? Leave blank if you skipped this one.">${escapeHtml(text)}</textarea>
      <div class="ft-meal-foot">
        <input type="time" class="form-input ft-meal-time" id="ft-time-${slot.id}" value="${time}">
        <div class="ft-meal-actions">
          <button class="ap-row-del" onclick="clearFoodMeal('${date}','${slot.id}')" title="Clear this meal">✕</button>
          <button class="btn btn-sm btn-primary" onclick="saveFoodMeal('${date}','${slot.id}')">Save</button>
        </div>
      </div>
    </div>
  `;
}

function renderFoodHistoryList(selectedDate) {
  const days = [];
  for (let i = 0; i < 14; i++) days.push(addDays(todayStr(), -i));
  return days.map(d => {
    const n = ftMealCount(d);
    return `
      <div class="ft-history-row ${d === selectedDate ? 'active' : ''}" onclick="ftJumpDate('${d}')">
        <span class="ft-history-date">${formatDate(d)}</span>
        <span class="ft-history-count ${n === 0 ? 'ft-history-count-empty' : ''}">${n}/${FT_MEAL_SLOTS.length} meals</span>
      </div>
    `;
  }).join('');
}

console.log('Routine v3.2 food tracker layer initialized');
