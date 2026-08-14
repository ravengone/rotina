/* ============================================
   LIFE DASHBOARD - APPLICATION CORE
   ============================================ */

// ========== DATA STRUCTURES ==========

const DEFAULT_ACTIVITIES = [
  { id: 'work', name: 'Work', placeholder: 'actual work', frequency: 'daily', category: 'activities' },
  { id: 'physical_training', name: 'Physical Training', placeholder: 'calisthenics / gym', frequency: 'daily', category: 'activities' },
  { id: 'reading', name: 'Reading', placeholder: 'book name', frequency: 'daily', category: 'activities' },
  { id: 'hobby', name: 'Hobby', placeholder: 'name', frequency: 'daily', category: 'activities' },
  { id: 'philosophy', name: 'Philosophy', placeholder: 'Stoicism', frequency: 'daily', category: 'activities' },
  { id: 'scientia_momentum', name: 'Scientia Momentum / College', placeholder: 'one / other / both', frequency: 'daily', category: 'activities' },

  { id: 'social', name: 'Social', placeholder: 'what kind of contact?', frequency: 'daily', category: 'activities' },
];

const DEFAULT_STUDIES = [
  { id: 'college', name: 'College', placeholder: 'content', frequency: 'daily', category: 'studies', group: 'mandatory' },
  { id: 'course', name: 'Course (Degree)', placeholder: 'platform + content', frequency: 'daily', category: 'studies', group: 'mandatory' },
  { id: 'linguistics', name: 'Linguistics', placeholder: 'language name', frequency: 'daily', category: 'studies', group: 'mandatory' },
  { id: 'reading_writing', name: 'Reading or Writing', placeholder: 'writing / reading / both + details', frequency: 'daily', category: 'studies', group: 'mandatory' },
  { id: 'philosophy_study', name: 'Philosophy', placeholder: 'philosophy + topic', frequency: 'weekly', category: 'studies', group: 'mandatory' },
  { id: 'coding', name: 'Coding / Programming', placeholder: 'content / topic', frequency: 'biweekly', category: 'studies', group: 'mandatory' },
  { id: 'interchange', name: 'Interchange / Scholarship', placeholder: 'content', frequency: 'monthly', category: 'studies', group: 'mandatory' },
  { id: 'exterior_job', name: 'Exterior Job / Emigration', placeholder: 'content', frequency: 'monthly', category: 'studies', group: 'mandatory' },
  { id: 'hardware', name: 'Hardware / Robotics / Mechanics', placeholder: 'content + topic', frequency: 'optional', category: 'studies', group: 'optional' },
  { id: 'mathematics', name: 'Mathematics / Physics / Astronomy', placeholder: 'content + topic', frequency: 'optional', category: 'studies', group: 'optional' },
  { id: 'investment', name: 'Investment / Finances', placeholder: 'content + topic', frequency: 'optional', category: 'studies', group: 'optional' },
  { id: 'other_study', name: 'Other (History, Geography, Bio...)', placeholder: 'content + topic', frequency: 'optional', category: 'studies', group: 'optional' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly (at least once)', days: 7 },
  { value: 'biweekly', label: 'Every 2 Weeks', days: 14 },
  { value: 'triweekly', label: 'Every 3 Weeks', days: 21 },
  { value: 'monthly', label: 'Every 4 Weeks', days: 28 },
  { value: 'optional', label: 'Optional', days: null },
];

const FREQUENCY_META = {
  daily: { label: 'Daily', tagClass: 'tag-daily', color: '#E5B04C', days: 1 },
  weekly: { label: 'Weekly', tagClass: 'tag-weekly', color: '#7FA8F0', days: 7 },
  biweekly: { label: 'Biweekly', tagClass: 'tag-biweekly', color: '#9F8FFF', days: 14 },
  triweekly: { label: '3 Weeks', tagClass: 'tag-biweekly', color: '#c084fc', days: 21 },
  monthly: { label: 'Monthly', tagClass: 'tag-monthly', color: '#E88B4E', days: 28 },
  optional: { label: 'Optional', tagClass: 'tag-optional', color: '#555d75', days: null },
};

// ========== STATE MANAGEMENT ==========

const AppState = {
  currentPage: 'today',
  currentDate: new Date().toISOString().split('T')[0],
  history: {},         // { "2026-03-01": { activities: {...}, studies: {...} } }
  config: {
    activities: [],
    studies: [],
  },
  goals: [],           // Array of goal objects
  objectives: [],      // Array of objective objects
  calendarEvents: [],  // Array of calendar events with date, title, description
  trackers: [],        // Progress trackers (money, books, etc.)
  schedules: {},       // Activity schedule overrides { activityId: { days: [1,2,3,4,5], exceptions: [] } }
  pomodoroConfig: {    // Pomodoro timer settings
    workMinutes: 30,
    shortBreakMinutes: 5,
    longBreakMinutes: 30,
    cyclesBeforeLong: 4,
  },
  pomodoroHistory: [], // { date, subject, cycles, totalMinutes }
  comparisonMode: 'week',
  comparisonDateA: null,
  comparisonDateB: null,
  habits: [],          // Array of vice/bad habit definitions { id, name, icon, createdAt }
  habitsLog: {},       // { "2026-03-01": { habitId: { failed: true, note: "..." } } }
};

// ========== STORAGE KEYS ==========
const STORAGE_KEY_HISTORY = 'lifedash_history';
const STORAGE_KEY_CONFIG = 'lifedash_config';
const STORAGE_KEY_GOALS = 'lifedash_goals';
const STORAGE_KEY_OBJECTIVES = 'lifedash_objectives';
const STORAGE_KEY_CALENDAR = 'lifedash_calendar';
const STORAGE_KEY_TRACKERS = 'lifedash_trackers';
const STORAGE_KEY_SCHEDULES = 'lifedash_schedules';
const STORAGE_KEY_POMODORO_CFG = 'lifedash_pomodoro_config';
const STORAGE_KEY_POMODORO_HIST = 'lifedash_pomodoro_history';
const STORAGE_KEY_HABITS = 'lifedash_habits';
const STORAGE_KEY_HABITS_LOG = 'lifedash_habits_log';
// ========== UTILITY FUNCTIONS ==========

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.floor((db - da) / 86400000);
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
}

function getMonthRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function getYearRange(dateStr) {
  const y = new Date(dateStr + 'T12:00:00').getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

function getDatesInRange(start, end) {
  const dates = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ========== DATA PERSISTENCE ==========

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(AppState.history));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(AppState.config));
    localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(AppState.goals));
    localStorage.setItem(STORAGE_KEY_OBJECTIVES, JSON.stringify(AppState.objectives));
    localStorage.setItem(STORAGE_KEY_CALENDAR, JSON.stringify(AppState.calendarEvents));
    localStorage.setItem(STORAGE_KEY_TRACKERS, JSON.stringify(AppState.trackers));
    localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(AppState.schedules));
    localStorage.setItem(STORAGE_KEY_POMODORO_CFG, JSON.stringify(AppState.pomodoroConfig));
    localStorage.setItem(STORAGE_KEY_POMODORO_HIST, JSON.stringify(AppState.pomodoroHistory));
    localStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(AppState.habits));
    localStorage.setItem(STORAGE_KEY_HABITS_LOG, JSON.stringify(AppState.habitsLog));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const hist = localStorage.getItem(STORAGE_KEY_HISTORY);
    const conf = localStorage.getItem(STORAGE_KEY_CONFIG);
    const goals = localStorage.getItem(STORAGE_KEY_GOALS);
    const objectives = localStorage.getItem(STORAGE_KEY_OBJECTIVES);
    const calendar = localStorage.getItem(STORAGE_KEY_CALENDAR);
    const trackers = localStorage.getItem(STORAGE_KEY_TRACKERS);
    const schedules = localStorage.getItem(STORAGE_KEY_SCHEDULES);
    const pomCfg = localStorage.getItem(STORAGE_KEY_POMODORO_CFG);
    const pomHist = localStorage.getItem(STORAGE_KEY_POMODORO_HIST);
    const habitsData = localStorage.getItem(STORAGE_KEY_HABITS);
    const habitsLogData = localStorage.getItem(STORAGE_KEY_HABITS_LOG);
    if (hist) AppState.history = JSON.parse(hist);
    if (conf) AppState.config = JSON.parse(conf);
    if (goals) AppState.goals = JSON.parse(goals);
    if (objectives) AppState.objectives = JSON.parse(objectives);
    if (calendar) AppState.calendarEvents = JSON.parse(calendar);
    if (trackers) AppState.trackers = JSON.parse(trackers);
    if (schedules) AppState.schedules = JSON.parse(schedules);
    if (pomCfg) AppState.pomodoroConfig = JSON.parse(pomCfg);
    if (pomHist) AppState.pomodoroHistory = JSON.parse(pomHist);
    if (habitsData) AppState.habits = JSON.parse(habitsData);
    if (habitsLogData) AppState.habitsLog = JSON.parse(habitsLogData);
    return !!(hist || conf);
  } catch (e) {
    console.warn('localStorage load failed:', e);
    return false;
  }
}

function exportToJSON() {
  const data = {
    version: '2.0',
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
  showToast('Data exported successfully', 'success');
}

function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.history) {
          AppState.history = { ...AppState.history, ...data.history };
        }
        if (data.config) {
          AppState.config = data.config;
          applyConfig();
        }
        if (data.goals) {
          AppState.goals = data.goals;
        }
        if (data.objectives) {
          AppState.objectives = data.objectives;
        }
        if (data.calendarEvents) {
          AppState.calendarEvents = data.calendarEvents;
        }
        if (data.trackers) {
          AppState.trackers = data.trackers;
        }
        if (data.schedules) {
          AppState.schedules = data.schedules;
        }
        if (data.pomodoroConfig) {
          AppState.pomodoroConfig = data.pomodoroConfig;
        }
        if (data.pomodoroHistory) {
          AppState.pomodoroHistory = data.pomodoroHistory;
        }
        if (data.habits) {
          AppState.habits = data.habits;
        }
        if (data.habitsLog) {
          AppState.habitsLog = { ...AppState.habitsLog, ...data.habitsLog };
        }
        saveToLocalStorage();
        resolve(data);
        showToast('Data imported successfully', 'success');
      } catch (err) {
        reject(err);
        showToast('Import failed: Invalid JSON', 'error');
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

// ========== CONFIG MANAGEMENT ==========

function initConfig() {
  if (!AppState.config.activities || AppState.config.activities.length === 0) {
    AppState.config.activities = deepClone(DEFAULT_ACTIVITIES);
  }
  if (!AppState.config.studies || AppState.config.studies.length === 0) {
    AppState.config.studies = deepClone(DEFAULT_STUDIES);
  }
  // Track deleted items so defaults don't re-appear
  if (!AppState.config._deletedIds) {
    AppState.config._deletedIds = [];
  }
  // Only merge NEW items from defaults that haven't been explicitly deleted
  DEFAULT_ACTIVITIES.forEach(da => {
    if (!AppState.config.activities.find(a => a.id === da.id) && !AppState.config._deletedIds.includes(da.id)) {
      AppState.config.activities.push(deepClone(da));
    }
  });
  DEFAULT_STUDIES.forEach(ds => {
    if (!AppState.config.studies.find(s => s.id === ds.id) && !AppState.config._deletedIds.includes(ds.id)) {
      AppState.config.studies.push(deepClone(ds));
    }
  });
}

function applyConfig() {
  initConfig();
}

function getAllItems(category) {
  if (category === 'activities') return AppState.config.activities;
  if (category === 'studies') return AppState.config.studies;
  return [...AppState.config.activities, ...AppState.config.studies];
}

function getItemById(id) {
  return getAllItems('all').find(i => i.id === id);
}

// ========== DAY RECORD MANAGEMENT ==========

function ensureDayRecord(dateStr) {
  if (!AppState.history[dateStr]) {
    AppState.history[dateStr] = { activities: {}, studies: {} };
  }
  return AppState.history[dateStr];
}

function getDayRecord(dateStr) {
  return AppState.history[dateStr] || { activities: {}, studies: {} };
}

function setItemStatus(dateStr, category, itemId, done, detail) {
  const record = ensureDayRecord(dateStr);
  const cat = category === 'activities' ? 'activities' : 'studies';
  if (!record[cat]) record[cat] = {};
  record[cat][itemId] = { done: !!done, detail: detail || '' };
  saveToLocalStorage();
}

function getItemStatus(dateStr, category, itemId) {
  const record = getDayRecord(dateStr);
  const cat = category === 'activities' ? 'activities' : 'studies';
  return record[cat]?.[itemId] || { done: false, detail: '' };
}

// ========== STATISTICS CALCULATIONS ==========

function isItemActiveOnDate(itemId, dateStr) {
  const schedule = AppState.schedules[itemId];
  if (!schedule || !schedule.days || schedule.days.length === 0 || schedule.days.length === 7) {
    return true; // No schedule restriction = active every day
  }
  const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun
  return schedule.days.includes(dayOfWeek);
}

function calcDayCompletion(dateStr, category) {
  const items = getAllItems(category);
  const record = getDayRecord(dateStr);
  const cat = category === 'activities' ? 'activities' : 'studies';
  
  // For studies daily: college OR course is required (not both)
  let requiredCount = 0;
  let doneCount = 0;

  items.forEach(item => {
    if (item.frequency === 'optional') return;
    if (item.frequency !== 'daily') return;
    
    // Skip items not scheduled for this day
    if (!isItemActiveOnDate(item.id, dateStr)) return;
    
    // Special rule: college and course — only one required
    if (category === 'studies' && (item.id === 'college' || item.id === 'course')) {
      return; // handle separately
    }
    
    requiredCount++;
    if (record[cat]?.[item.id]?.done) doneCount++;
  });

  // Handle college/course special case — only if at least one is active today
  if (category === 'studies') {
    const collegeActive = isItemActiveOnDate('college', dateStr);
    const courseActive = isItemActiveOnDate('course', dateStr);
    if (collegeActive || courseActive) {
      requiredCount++; // one of them is required
      const collegeDone = record[cat]?.college?.done;
      const courseDone = record[cat]?.course?.done;
      if (collegeDone || courseDone) doneCount++;
    }
  }

  return requiredCount === 0 ? 100 : Math.round((doneCount / requiredCount) * 100);
}

function calcRangeCompletion(start, end, category) {
  const dates = getDatesInRange(start, end);
  if (dates.length === 0) return 0;
  const items = getAllItems(category);
  
  let totalRequired = 0;
  let totalDone = 0;

  // Daily items
  const dailyItems = items.filter(i => i.frequency === 'daily');
  
  dates.forEach(date => {
    const record = getDayRecord(date);
    const cat = category === 'activities' ? 'activities' : 'studies';
    
    dailyItems.forEach(item => {
      if (category === 'studies' && (item.id === 'college' || item.id === 'course')) return;
      // Skip items not scheduled for this day
      if (!isItemActiveOnDate(item.id, date)) return;
      totalRequired++;
      if (record[cat]?.[item.id]?.done) totalDone++;
    });

    if (category === 'studies') {
      const collegeActive = isItemActiveOnDate('college', date);
      const courseActive = isItemActiveOnDate('course', date);
      if (collegeActive || courseActive) {
        totalRequired++;
        if (record[cat]?.college?.done || record[cat]?.course?.done) totalDone++;
      }
    }
  });

  // Weekly/biweekly/monthly items — check if done at least once in period
  const periodicItems = items.filter(i => ['weekly', 'biweekly', 'triweekly', 'monthly'].includes(i.frequency));
  const periodDays = daysBetween(start, end) + 1;

  periodicItems.forEach(item => {
    const freqDays = FREQUENCY_META[item.frequency]?.days;
    if (!freqDays) return;
    
    const expectedOccurrences = Math.max(1, Math.floor(periodDays / freqDays));
    let occurrences = 0;
    const cat = category === 'activities' ? 'activities' : 'studies';

    dates.forEach(date => {
      if (getDayRecord(date)[cat]?.[item.id]?.done) occurrences++;
    });

    totalRequired += expectedOccurrences;
    totalDone += Math.min(occurrences, expectedOccurrences);
  });

  return totalRequired === 0 ? 100 : Math.round((totalDone / totalRequired) * 100);
}

function calcStreak(category) {
  let streak = 0;
  let date = todayStr();
  
  while (true) {
    const completion = calcDayCompletion(date, category);
    if (completion >= 80) {
      streak++;
      date = addDays(date, -1);
    } else {
      break;
    }
    if (streak > 365) break;
  }
  return streak;
}

function calcItemLastDone(itemId, category) {
  const cat = category === 'activities' ? 'activities' : 'studies';
  const dates = Object.keys(AppState.history).sort().reverse();
  
  for (const date of dates) {
    if (AppState.history[date][cat]?.[itemId]?.done) {
      return date;
    }
  }
  return null;
}

function calcItemDaysSinceLastDone(itemId, category) {
  const lastDone = calcItemLastDone(itemId, category);
  if (!lastDone) return Infinity;
  return daysBetween(lastDone, todayStr());
}

// ========== AI ANALYSIS ENGINE ==========

function generateInsights() {
  const insights = [];
  const today = todayStr();
  const allItems = [...AppState.config.activities, ...AppState.config.studies];

  allItems.forEach(item => {
    if (item.frequency === 'optional') return;
    
    const cat = item.category;
    const daysSince = calcItemDaysSinceLastDone(item.id, cat);
    const freqMeta = FREQUENCY_META[item.frequency];
    
    if (!freqMeta || !freqMeta.days) return;

    const threshold = freqMeta.days;
    const overdue = daysSince - threshold;

    if (daysSince === Infinity && item.frequency === 'daily') {
      insights.push({
        type: 'critical',
        icon: '🔴',
        text: `<strong>${item.name}</strong> has never been completed. This is a <strong>${freqMeta.label.toLowerCase()}</strong> activity — start today!`,
        priority: 100,
        itemId: item.id,
        category: cat,
      });
    } else if (overdue > threshold) {
      insights.push({
        type: 'critical',
        icon: '🔴',
        text: `<strong>${item.name}</strong> is severely overdue — last done <strong>${daysSince} days ago</strong> (expected every ${threshold} days). Immediate attention needed.`,
        priority: 90 + overdue,
        itemId: item.id,
        category: cat,
      });
    } else if (overdue > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        text: `<strong>${item.name}</strong> is overdue by <strong>${overdue} day${overdue > 1 ? 's' : ''}</strong>. Last completed ${daysSince} days ago.`,
        priority: 50 + overdue,
        itemId: item.id,
        category: cat,
      });
    } else if (daysSince === threshold - 1 && item.frequency !== 'daily') {
      insights.push({
        type: 'info',
        icon: 'ℹ️',
        text: `<strong>${item.name}</strong> is due <strong>tomorrow</strong>. Plan ahead!`,
        priority: 30,
        itemId: item.id,
        category: cat,
      });
    } else if (daysSince === threshold && item.frequency !== 'daily') {
      insights.push({
        type: 'warning',
        icon: '⏰',
        text: `<strong>${item.name}</strong> is due <strong>today</strong>!`,
        priority: 70,
        itemId: item.id,
        category: cat,
      });
    }
  });

  // Check today's daily completion
  const actCompletion = calcDayCompletion(today, 'activities');
  const studCompletion = calcDayCompletion(today, 'studies');
  
  if (actCompletion === 100 && studCompletion === 100) {
    insights.push({
      type: 'success',
      icon: '🎉',
      text: `All daily tasks completed! Great discipline today.`,
      priority: 5,
    });
  }

  // Streak info
  const actStreak = calcStreak('activities');
  const studStreak = calcStreak('studies');
  if (actStreak >= 3) {
    insights.push({
      type: 'success',
      icon: '🔥',
      text: `Activities streak: <strong>${actStreak} days</strong> in a row with 80%+ completion!`,
      priority: 10,
    });
  }
  if (studStreak >= 3) {
    insights.push({
      type: 'success',
      icon: '📚',
      text: `Studies streak: <strong>${studStreak} days</strong> in a row with 80%+ completion!`,
      priority: 10,
    });
  }

  // College/Course reminder
  const todayRecord = getDayRecord(today);
  const collegeDone = todayRecord.studies?.college?.done;
  const courseDone = todayRecord.studies?.course?.done;
  if (!collegeDone && !courseDone) {
    insights.push({
      type: 'info',
      icon: '📋',
      text: `Remember: <strong>College</strong> or <strong>Course</strong> — at least one must be completed today.`,
      priority: 60,
    });
  }

  // Observation quality insights
  let totalDoneItems = 0;
  let totalWithDetails = 0;
  const recentDates = [];
  let rd = today;
  for (let i = 0; i < 7; i++) { recentDates.push(rd); rd = addDays(rd, -1); }
  
  recentDates.forEach(date => {
    const rec = getDayRecord(date);
    ['activities', 'studies'].forEach(cat => {
      if (!rec[cat]) return;
      Object.values(rec[cat]).forEach(data => {
        if (data.done) {
          totalDoneItems++;
          if (data.detail && data.detail.trim()) totalWithDetails++;
        }
      });
    });
  });

  if (totalDoneItems > 0 && totalWithDetails < totalDoneItems * 0.2) {
    insights.push({
      type: 'info',
      icon: '📝',
      text: `Only <strong>${Math.round(totalWithDetails/totalDoneItems*100)}%</strong> of recent completions have observations. Adding notes helps track what you actually did — visit the <strong>Observations</strong> page for analysis.`,
      priority: 25,
    });
  } else if (totalDoneItems > 5 && totalWithDetails >= totalDoneItems * 0.7) {
    insights.push({
      type: 'success',
      icon: '📝',
      text: `Excellent documentation! <strong>${Math.round(totalWithDetails/totalDoneItems*100)}%</strong> of recent completions have detailed observations.`,
      priority: 8,
    });
  }

  insights.sort((a, b) => b.priority - a.priority);
  return insights;
}

// ========== TOAST SYSTEM ==========

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== CHART HELPERS ==========

let chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function createChart(canvasId, config) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  chartInstances[canvasId] = new Chart(ctx.getContext('2d'), config);
  return chartInstances[canvasId];
}

// ========== RENDER ENGINE ==========

function renderPage(pageId) {
  AppState.currentPage = pageId;
  
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  const section = document.getElementById(`page-${pageId}`);
  if (section) section.classList.add('active');
  
  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    n.classList.toggle('active', n.dataset.page === pageId);
  });

  document.getElementById('page-title').textContent = getPageTitle(pageId);

  switch (pageId) {
    case 'today': renderTodayPage(); break;
    case 'goals': renderGoalsPage(); break;
    case 'calendar': renderCalendarPage(); break;
    case 'trackers': renderTrackersPage(); break;
    case 'habits': renderHabitsPage(); break;
    case 'pomodoro': renderPomodoroPage(); break;
    case 'activities-dash': renderActivitiesDashboard(); break;
    case 'studies-dash': renderStudiesDashboard(); break;
    case 'comparison': renderComparisonPage(); break;
    case 'history': renderHistoryPage(); break;
    case 'observations': renderObservationsPage(); break;
    case 'insights': renderInsightsPage(); break;
    case 'settings': renderSettingsPage(); break;
    case 'data': renderDataPage(); break;
  }
}

function getPageTitle(pageId) {
  const titles = {
    'today': 'Daily Tracker',
    'goals': 'Goals & Objectives',
    'calendar': 'Calendar & Events',
    'trackers': 'Progress Trackers',
    'habits': 'Habit Control',
    'pomodoro': 'Study Mode',
    'activities-dash': 'Activities Dashboard',
    'studies-dash': 'Studies Dashboard',
    'comparison': 'Comparison View',
    'history': 'History',
    'observations': 'Observations',
    'insights': 'AI Insights',
    'settings': 'Configuration',
    'data': 'Data Management',
  };
  return titles[pageId] || 'Dashboard';
}

// ========== TODAY PAGE ==========

function renderTodayPage() {
  const container = document.getElementById('page-today');
  const date = AppState.currentDate;
  
  const actCompletion = calcDayCompletion(date, 'activities');
  const studCompletion = calcDayCompletion(date, 'studies');
  const totalItems = [...AppState.config.activities, ...AppState.config.studies].filter(i => i.frequency !== 'optional' && isItemActiveOnDate(i.id, date)).length;
  const record = getDayRecord(date);
  let totalDone = 0;
  ['activities', 'studies'].forEach(cat => {
    const items = cat === 'activities' ? AppState.config.activities : AppState.config.studies;
    items.forEach(item => {
      if (item.frequency === 'optional') return;
      if (!isItemActiveOnDate(item.id, date)) return;
      if (record[cat]?.[item.id]?.done) totalDone++;
    });
  });

  const insights = generateInsights().slice(0, 3);
  const insightsHtml = insights.length > 0
    ? insights.map(i => `<div class="ai-insight ${i.type}"><span class="ai-insight-icon">${i.icon}</span><div class="ai-insight-text">${i.text}</div></div>`).join('')
    : '<div class="ai-insight success"><span class="ai-insight-icon">✨</span><div class="ai-insight-text">Everything looks great! Keep going.</div></div>';

  // Anki word counter
  const ankiStats = calcAnkiStats();

  // Day of week label for schedule
  const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  container.innerHTML = `
    <div class="date-nav">
      <button class="date-nav-btn" onclick="navigateDate(-1)">◀</button>
      <span class="date-nav-current">${formatDate(date)}</span>
      <button class="date-nav-btn" onclick="navigateDate(1)">▶</button>
      <input type="date" class="date-input" value="${date}" onchange="jumpToDate(this.value)">
      <button class="btn btn-sm" onclick="jumpToDate(todayStr())">Today</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Activities</div>
        <div class="stat-value">${actCompletion}%</div>
        <div class="stat-sub">Daily completion</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Studies</div>
        <div class="stat-value">${studCompletion}%</div>
        <div class="stat-sub">Daily completion</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Tasks Done</div>
        <div class="stat-value">${totalDone}</div>
        <div class="stat-sub">out of tracked items</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-orange)">
        <div class="stat-label">Act. Streak</div>
        <div class="stat-value">${calcStreak('activities')}d</div>
        <div class="stat-sub">consecutive 80%+ days</div>
      </div>
    </div>

    ${ankiStats.totalWords > 0 ? `
    <div class="anki-stats-bar">
      <div class="anki-stat"><span class="anki-stat-icon">📇</span><span class="anki-stat-label">Anki Total:</span><span class="anki-stat-value">${ankiStats.totalWords} words</span></div>
      <div class="anki-stat"><span class="anki-stat-label">This week:</span><span class="anki-stat-value">${ankiStats.weekWords} words</span></div>
      <div class="anki-stat"><span class="anki-stat-label">This month:</span><span class="anki-stat-value">${ankiStats.monthWords} words</span></div>
      <div class="anki-stat"><span class="anki-stat-label">Streak:</span><span class="anki-stat-value">${ankiStats.streak}d</span></div>
      <div class="anki-stat"><span class="anki-stat-label">Avg/day:</span><span class="anki-stat-value">${ankiStats.avgPerDay}</span></div>
    </div>
    ` : ''}

    <div class="ai-panel" style="margin-bottom: 24px;">
      <div class="ai-header">
        <span class="ai-badge">Analysis</span>
        <span class="ai-title">Smart Reminders</span>
      </div>
      ${insightsHtml}
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">⚡</span> Activities</div>
          <span style="font-size:0.78rem;color:var(--text-muted)">${actCompletion}% done</span>
        </div>
        <div class="activity-list scroll-inner" id="activities-checklist">
          ${renderChecklist(AppState.config.activities, date, 'activities')}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📚</span> Studies</div>
          <span style="font-size:0.78rem;color:var(--text-muted)">${studCompletion}% done</span>
        </div>
        <div class="activity-list scroll-inner" id="studies-checklist">
          ${renderStudiesChecklist(date)}
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
      <button class="btn" onclick="exportToJSON()">⬇ Export JSON</button>
    </div>

    ${renderDailyGoalsSection(date)}
    ${renderDailyTrackersSection()}
  `;
}

function renderChecklist(items, date, category) {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
  const referenceDate = new Date(date + 'T12:00:00');
  
  return items.map(item => {
    const status = getItemStatus(date, category, item.id);
    const freqMeta = FREQUENCY_META[item.frequency];
    const schedule = AppState.schedules[item.id];
    
    // ===== CHECK 1: Schedule-based off-day =====
    let isScheduleOffDay = false;
    let scheduleTag = '';
    if (schedule && schedule.days && schedule.days.length > 0 && schedule.days.length < 7) {
      isScheduleOffDay = !schedule.days.includes(dayOfWeek);
      if (isScheduleOffDay) {
        scheduleTag = '<span class="schedule-off-tag">Off day</span>';
      }
    }
    
    // ===== CHECK 2: Frequency-cycle off-day =====
    let isFrequencyOffDay = isTaskInOffDayState(item.id, category, referenceDate);
    
    // ===== DETERMINE FINAL OFF-DAY STATE =====
    let shouldShowOffDay = false;
    
    if (isFrequencyOffDay && status.done) {
      shouldShowOffDay = true;
    } else if (isScheduleOffDay && !status.done) {
      shouldShowOffDay = true;
    }
    
    // Build additional context tag for frequency completion
    // Shows in ALL days of the cycle, not just the completion day
    let frequencyTag = '';
    if (isFrequencyOffDay && !isScheduleOffDay && item.frequency !== 'daily') {
      frequencyTag = `<span class="cycle-complete-tag">${freqMeta.label} ✓</span>`;
    }
    
    return `
      <div class="activity-item ${status.done ? 'completed' : ''} ${shouldShowOffDay ? 'off-day' : ''}" 
           data-id="${item.id}" 
           data-category="${category}"
           data-frequency="${item.frequency}"
           title="${isFrequencyOffDay && status.done ? `Completed within ${freqMeta.label.toLowerCase()} cycle` : ''}">
        <div class="check-box" onclick="toggleItem('${date}','${category}','${item.id}')">✓</div>
        <div class="activity-info">
          <span class="activity-name">${item.name}</span>
          <span class="activity-tag ${freqMeta.tagClass}">${freqMeta.label}</span>
          ${scheduleTag}
          ${frequencyTag}
        </div>
        <input type="text" class="activity-detail-input" placeholder="${item.placeholder}"
          value="${escapeHtml(status.detail)}"
          onchange="updateDetail('${date}','${category}','${item.id}', this.value)"
          onclick="event.stopPropagation()">
      </div>
    `;
  }).join('');
}

function renderStudiesChecklist(date) {
  const studies = AppState.config.studies;
  const referenceDate = new Date(date + 'T12:00:00');
  const groups = {
    'Daily (Mandatory)': studies.filter(s => s.frequency === 'daily'),
    'Weekly': studies.filter(s => s.frequency === 'weekly'),
    'Biweekly': studies.filter(s => s.frequency === 'biweekly'),
    'Every 3 Weeks': studies.filter(s => s.frequency === 'triweekly'),
    'Monthly': studies.filter(s => s.frequency === 'monthly'),
    'Optional': studies.filter(s => s.frequency === 'optional'),
  };

  let html = '';
  for (const [groupName, groupItems] of Object.entries(groups)) {
    if (groupItems.length === 0) continue;
    html += `<div class="activity-category-header"><h3>${groupName}</h3></div>`;
    
    groupItems.forEach(item => {
      const status = getItemStatus(date, 'studies', item.id);
      const freqMeta = FREQUENCY_META[item.frequency];
      
      // Check if this study is in an off-day state (completed within its frequency cycle)
      let isFrequencyOffDay = isTaskInOffDayState(item.id, 'studies', referenceDate);
      
      // Build frequency completion tag for non-daily studies
      // Shows in ALL days of the cycle, not just the completion day
      let frequencyTag = '';
      if (isFrequencyOffDay && item.frequency !== 'daily') {
        frequencyTag = `<span class="cycle-complete-tag">${freqMeta.label} ✓</span>`;
      }
      
      let note = '';
      if (item.id === 'college' || item.id === 'course') {
        note = '<span style="font-size:0.7rem;color:var(--text-muted);margin-left:4px">(at least one required)</span>';
      }
      html += `
        <div class="activity-item ${status.done ? 'completed' : ''} ${isFrequencyOffDay ? 'off-day' : ''}" 
             data-id="${item.id}" 
             data-category="studies"
             data-frequency="${item.frequency}"
             title="${isFrequencyOffDay ? `Completed within ${freqMeta.label.toLowerCase()} cycle` : ''}">
          <div class="check-box" onclick="toggleItem('${date}','studies','${item.id}')">✓</div>
          <div class="activity-info">
            <span class="activity-name">${item.name}${note}</span>
            <span class="activity-tag ${freqMeta.tagClass}">${freqMeta.label}</span>
            ${frequencyTag}
          </div>
          <input type="text" class="activity-detail-input" placeholder="${item.placeholder}"
            value="${escapeHtml(status.detail)}"
            onchange="updateDetail('${date}','studies','${item.id}', this.value)"
            onclick="event.stopPropagation()">
        </div>
      `;
    });
  }
  return html;
}

function toggleItem(date, category, itemId) {
  const current = getItemStatus(date, category, itemId);
  const newDone = !current.done;
  setItemStatus(date, category, itemId, newDone, current.detail);

  // Targeted DOM update instead of full re-render
  const itemEl = document.querySelector(`.activity-item[data-id="${itemId}"][data-category="${category}"]`);
  if (itemEl) {
    itemEl.classList.toggle('completed', newDone);
  }

  // Update completion stats in header
  const actCompletion = calcDayCompletion(date, 'activities');
  const studCompletion = calcDayCompletion(date, 'studies');
  const record = getDayRecord(date);
  let totalDone = 0;
  ['activities', 'studies'].forEach(cat => {
    Object.values(record[cat] || {}).forEach(v => { if (v.done) totalDone++; });
  });

  // Update stat cards
  const statValues = document.querySelectorAll('.stat-card .stat-value');
  if (statValues.length >= 3 && AppState.currentPage === 'today') {
    statValues[0].textContent = `${actCompletion}%`;
    statValues[1].textContent = `${studCompletion}%`;
    statValues[2].textContent = `${totalDone}`;
    statValues[3].textContent = `${calcStreak('activities')}d`;
    // Update card header percentages
    const actHeader = document.querySelector('#activities-checklist')?.closest('.card')?.querySelector('.card-header span:last-child');
    const studHeader = document.querySelector('#studies-checklist')?.closest('.card')?.querySelector('.card-header span:last-child');
    if (actHeader) actHeader.textContent = `${actCompletion}% done`;
    if (studHeader) studHeader.textContent = `${studCompletion}% done`;
  }
}

function updateDetail(date, category, itemId, value) {
  const current = getItemStatus(date, category, itemId);
  setItemStatus(date, category, itemId, current.done, value);
}

function navigateDate(delta) {
  AppState.currentDate = addDays(AppState.currentDate, delta);
  document.getElementById('current-date-display').textContent = formatDate(AppState.currentDate);
  renderPage(AppState.currentPage);
}

function jumpToDate(dateStr) {
  if (!dateStr) return;
  AppState.currentDate = dateStr;
  document.getElementById('current-date-display').textContent = formatDate(AppState.currentDate);
  renderPage(AppState.currentPage);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== ACTIVITIES DASHBOARD ==========

function renderActivitiesDashboard() {
  const container = document.getElementById('page-activities-dash');
  const week = getWeekRange(AppState.currentDate);
  const month = getMonthRange(AppState.currentDate);
  
  const weekComp = calcRangeCompletion(week.start, week.end, 'activities');
  const monthComp = calcRangeCompletion(month.start, month.end, 'activities');
  const streak = calcStreak('activities');

  // Per-item progress for the week
  const items = AppState.config.activities;
  const weekDates = getDatesInRange(week.start, week.end);

  let itemProgressHtml = items.map(item => {
    let doneCount = 0;
    weekDates.forEach(d => {
      if (getDayRecord(d).activities?.[item.id]?.done) doneCount++;
    });
    const expected = item.frequency === 'daily' ? weekDates.length : (FREQUENCY_META[item.frequency]?.days ? 1 : 0);
    const pct = expected === 0 ? 0 : Math.min(100, Math.round((doneCount / expected) * 100));
    const color = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-warning)' : 'var(--accent-secondary)';
    return `
      <div class="progress-bar-container">
        <div class="progress-label">
          <span class="progress-label-name">${item.name}</span>
          <span class="progress-label-value">${doneCount}/${expected > 0 ? expected : '—'} (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;--bar-color:${color}"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="date-nav">
      <button class="date-nav-btn" onclick="navigateDate(-7)">◀</button>
      <span class="date-nav-current">Week of ${formatDateShort(week.start)} — ${formatDateShort(week.end)}</span>
      <button class="date-nav-btn" onclick="navigateDate(7)">▶</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Week Completion</div>
        <div class="stat-value">${weekComp}%</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Month Completion</div>
        <div class="stat-value">${monthComp}%</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-orange)">
        <div class="stat-label">Current Streak</div>
        <div class="stat-value">${streak}d</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Today</div>
        <div class="stat-value">${calcDayCompletion(todayStr(), 'activities')}%</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📊</span> Weekly Trend</div>
        </div>
        <div class="chart-container"><canvas id="chart-activities-week"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📈</span> Item Progress (This Week)</div>
        </div>
        <div class="scroll-inner">${itemProgressHtml}</div>
      </div>
      <div class="card full-width">
        <div class="card-header">
          <div class="card-title"><span class="icon">🗓️</span> Monthly Overview</div>
        </div>
        <div class="chart-container"><canvas id="chart-activities-month"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🟩</span> 90-Day Heatmap</div>
        </div>
        <div id="heatmap-activities"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🍩</span> Completion Distribution</div>
        </div>
        <div class="chart-container"><canvas id="chart-activities-doughnut"></canvas></div>
      </div>
    </div>
  `;

  // Render charts
  setTimeout(() => {
    renderWeeklyChart('chart-activities-week', 'activities');
    renderMonthlyChart('chart-activities-month', 'activities');
    renderHeatmapForDashboard('heatmap-activities', 'activities');
    renderDoughnutChart('chart-activities-doughnut', 'activities');
  }, 50);
}

// ========== STUDIES DASHBOARD ==========

function renderStudiesDashboard() {
  const container = document.getElementById('page-studies-dash');
  const week = getWeekRange(AppState.currentDate);
  const month = getMonthRange(AppState.currentDate);
  
  const weekComp = calcRangeCompletion(week.start, week.end, 'studies');
  const monthComp = calcRangeCompletion(month.start, month.end, 'studies');
  const streak = calcStreak('studies');

  const items = AppState.config.studies;
  const weekDates = getDatesInRange(week.start, week.end);

  let itemProgressHtml = items.map(item => {
    let doneCount = 0;
    weekDates.forEach(d => {
      if (getDayRecord(d).studies?.[item.id]?.done) doneCount++;
    });
    const freqDays = FREQUENCY_META[item.frequency]?.days;
    let expected;
    if (item.frequency === 'daily') expected = weekDates.length;
    else if (freqDays && freqDays <= 7) expected = 1;
    else if (freqDays) expected = Math.max(0, Math.round(7 / freqDays));
    else expected = 0;
    
    const pct = expected === 0 ? (doneCount > 0 ? 100 : 0) : Math.min(100, Math.round((doneCount / Math.max(1, expected)) * 100));
    const color = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-warning)' : item.frequency === 'optional' ? 'var(--text-muted)' : 'var(--accent-secondary)';
    const freqMeta = FREQUENCY_META[item.frequency];
    return `
      <div class="progress-bar-container">
        <div class="progress-label">
          <span class="progress-label-name">${item.name} <span class="activity-tag ${freqMeta.tagClass}" style="font-size:0.6rem">${freqMeta.label}</span></span>
          <span class="progress-label-value">${doneCount}x this week</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;--bar-color:${color}"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="date-nav">
      <button class="date-nav-btn" onclick="navigateDate(-7)">◀</button>
      <span class="date-nav-current">Week of ${formatDateShort(week.start)} — ${formatDateShort(week.end)}</span>
      <button class="date-nav-btn" onclick="navigateDate(7)">▶</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Week Completion</div>
        <div class="stat-value">${weekComp}%</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Month Completion</div>
        <div class="stat-value">${monthComp}%</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-orange)">
        <div class="stat-label">Current Streak</div>
        <div class="stat-value">${streak}d</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Today</div>
        <div class="stat-value">${calcDayCompletion(todayStr(), 'studies')}%</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📊</span> Weekly Trend</div>
        </div>
        <div class="chart-container"><canvas id="chart-studies-week"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📈</span> Subject Progress (This Week)</div>
        </div>
        <div class="scroll-inner">${itemProgressHtml}</div>
      </div>
      <div class="card full-width">
        <div class="card-header">
          <div class="card-title"><span class="icon">🗓️</span> Monthly Overview</div>
        </div>
        <div class="chart-container"><canvas id="chart-studies-month"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🟩</span> 90-Day Heatmap</div>
        </div>
        <div id="heatmap-studies"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🍩</span> Subject Distribution</div>
        </div>
        <div class="chart-container"><canvas id="chart-studies-doughnut"></canvas></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    renderWeeklyChart('chart-studies-week', 'studies');
    renderMonthlyChart('chart-studies-month', 'studies');
    renderHeatmapForDashboard('heatmap-studies', 'studies');
    renderDoughnutChart('chart-studies-doughnut', 'studies');
  }, 50);
}

// ========== CHART RENDERERS ==========

function renderWeeklyChart(canvasId, category) {
  const week = getWeekRange(AppState.currentDate);
  const dates = getDatesInRange(week.start, week.end);
  const labels = dates.map(d => {
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'short' });
  });
  const data = dates.map(d => calcDayCompletion(d, category));
  const color = category === 'activities' ? '#E5B04C' : '#7FA8F0';

  createChart(canvasId, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Completion %',
        data,
        backgroundColor: data.map(v => v >= 80 ? `${color}99` : v >= 50 ? '#EFD07C66' : '#E5695B66'),
        borderColor: data.map(v => v >= 80 ? color : v >= 50 ? '#EFD07C' : '#E5695B'),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1e28', titleFont: { family: 'Outfit' }, bodyFont: { family: 'JetBrains Mono', size: 12 } }
      }
    }
  });
}

function renderMonthlyChart(canvasId, category) {
  const month = getMonthRange(AppState.currentDate);
  const dates = getDatesInRange(month.start, month.end);
  const labels = dates.map(d => new Date(d + 'T12:00:00').getDate().toString());
  const data = dates.map(d => calcDayCompletion(d, category));
  const color = category === 'activities' ? '#E5B04C' : '#7FA8F0';

  createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Completion %',
        data,
        borderColor: color,
        backgroundColor: `${color}15`,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: color,
        pointBorderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 15 }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1e28', titleFont: { family: 'Outfit' }, bodyFont: { family: 'JetBrains Mono', size: 12 } }
      }
    }
  });
}

// ========== COMPARISON PAGE ==========

function renderDoughnutChart(canvasId, category) {
  const month = getMonthRange(AppState.currentDate);
  const dates = getDatesInRange(month.start, month.end);
  const items = getAllItems(category);
  const cat = category === 'activities' ? 'activities' : 'studies';
  
  const itemDone = items.map(item => {
    let count = 0;
    dates.forEach(d => {
      if (getDayRecord(d)[cat]?.[item.id]?.done) count++;
    });
    return { name: item.name, count };
  }).filter(d => d.count > 0);

  if (itemDone.length === 0) return;

  const colors = [
    '#E5B04C', '#7FA8F0', '#9F8FFF', '#E88B4E', '#7FC08B',
    '#E5695B', '#EFD07C', '#c084fc', '#38bdf8', '#f472b6',
    '#4ade80', '#e879f9', '#facc15', '#22d3ee',
  ];

  createChart(canvasId, {
    type: 'doughnut',
    data: {
      labels: itemDone.map(d => d.name),
      datasets: [{
        data: itemDone.map(d => d.count),
        backgroundColor: itemDone.map((_, i) => colors[i % colors.length] + '88'),
        borderColor: itemDone.map((_, i) => colors[i % colors.length]),
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8b92a8', font: { family: 'Outfit', size: 10 }, boxWidth: 12, padding: 8 }
        },
        tooltip: { backgroundColor: '#1a1e28' }
      }
    }
  });
}

// ========== COMPARISON PAGE (cont.) ==========

function renderComparisonPage() {
  const container = document.getElementById('page-comparison');
  
  container.innerHTML = `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title"><span class="icon">⚖️</span> Comparison Settings</div>
      </div>
      <div class="comparison-controls">
        <div class="tab-group">
          <button class="tab-btn ${AppState.comparisonMode === 'day' ? 'active' : ''}" onclick="setCompMode('day')">Day</button>
          <button class="tab-btn ${AppState.comparisonMode === 'week' ? 'active' : ''}" onclick="setCompMode('week')">Week</button>
          <button class="tab-btn ${AppState.comparisonMode === 'month' ? 'active' : ''}" onclick="setCompMode('month')">Month</button>
          <button class="tab-btn ${AppState.comparisonMode === 'year' ? 'active' : ''}" onclick="setCompMode('year')">Year</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <label class="form-label" style="margin:0">Period A:</label>
          <input type="date" class="date-input" id="comp-date-a" value="${AppState.comparisonDateA || AppState.currentDate}" onchange="updateCompDates()">
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <label class="form-label" style="margin:0">Period B:</label>
          <input type="date" class="date-input" id="comp-date-b" value="${AppState.comparisonDateB || addDays(AppState.currentDate, -7)}" onchange="updateCompDates()">
        </div>
      </div>
    </div>
    <div id="comparison-results"></div>
  `;

  updateCompDates();
}

function setCompMode(mode) {
  AppState.comparisonMode = mode;
  renderComparisonPage();
}

function updateCompDates() {
  const dateA = document.getElementById('comp-date-a')?.value || AppState.currentDate;
  const dateB = document.getElementById('comp-date-b')?.value || addDays(AppState.currentDate, -7);
  AppState.comparisonDateA = dateA;
  AppState.comparisonDateB = dateB;

  let rangeA, rangeB, labelA, labelB;
  
  switch (AppState.comparisonMode) {
    case 'day':
      rangeA = { start: dateA, end: dateA };
      rangeB = { start: dateB, end: dateB };
      labelA = formatDate(dateA);
      labelB = formatDate(dateB);
      break;
    case 'week':
      rangeA = getWeekRange(dateA);
      rangeB = getWeekRange(dateB);
      labelA = `Week of ${formatDateShort(rangeA.start)}`;
      labelB = `Week of ${formatDateShort(rangeB.start)}`;
      break;
    case 'month':
      rangeA = getMonthRange(dateA);
      rangeB = getMonthRange(dateB);
      labelA = new Date(dateA + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      labelB = new Date(dateB + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      break;
    case 'year':
      rangeA = getYearRange(dateA);
      rangeB = getYearRange(dateB);
      labelA = new Date(dateA + 'T12:00:00').getFullYear().toString();
      labelB = new Date(dateB + 'T12:00:00').getFullYear().toString();
      break;
  }

  const actA = calcRangeCompletion(rangeA.start, rangeA.end, 'activities');
  const actB = calcRangeCompletion(rangeB.start, rangeB.end, 'activities');
  const studA = calcRangeCompletion(rangeA.start, rangeA.end, 'studies');
  const studB = calcRangeCompletion(rangeB.start, rangeB.end, 'studies');

  const diffAct = actA - actB;
  const diffStud = studA - studB;

  const resultsDiv = document.getElementById('comparison-results');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr)">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Activities (A)</div>
        <div class="stat-value">${actA}%</div>
        <div class="stat-sub">${labelA}</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Activities (B)</div>
        <div class="stat-value">${actB}%</div>
        <div class="stat-sub">${labelB}</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Studies (A)</div>
        <div class="stat-value">${studA}%</div>
        <div class="stat-sub">${labelA}</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Studies (B)</div>
        <div class="stat-value">${studB}%</div>
        <div class="stat-sub">${labelB}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">⚡</span> Activities Delta</div>
          <span class="stat-sub ${diffAct >= 0 ? 'positive' : 'negative'}">${diffAct >= 0 ? '+' : ''}${diffAct}%</span>
        </div>
        <div class="chart-container"><canvas id="chart-comp-act"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📚</span> Studies Delta</div>
          <span class="stat-sub ${diffStud >= 0 ? 'positive' : 'negative'}">${diffStud >= 0 ? '+' : ''}${diffStud}%</span>
        </div>
        <div class="chart-container"><canvas id="chart-comp-stud"></canvas></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    renderComparisonChart('chart-comp-act', 'activities', rangeA, rangeB, labelA, labelB);
    renderComparisonChart('chart-comp-stud', 'studies', rangeA, rangeB, labelA, labelB);
  }, 50);
}

function renderComparisonChart(canvasId, category, rangeA, rangeB, labelA, labelB) {
  const items = getAllItems(category);
  const labels = items.filter(i => i.frequency !== 'optional').map(i => i.name);
  
  const datesA = getDatesInRange(rangeA.start, rangeA.end);
  const datesB = getDatesInRange(rangeB.start, rangeB.end);
  const cat = category === 'activities' ? 'activities' : 'studies';

  const dataA = items.filter(i => i.frequency !== 'optional').map(item => {
    let done = 0;
    datesA.forEach(d => { if (getDayRecord(d)[cat]?.[item.id]?.done) done++; });
    return Math.round((done / Math.max(1, datesA.length)) * 100);
  });

  const dataB = items.filter(i => i.frequency !== 'optional').map(item => {
    let done = 0;
    datesB.forEach(d => { if (getDayRecord(d)[cat]?.[item.id]?.done) done++; });
    return Math.round((done / Math.max(1, datesB.length)) * 100);
  });

  const colorA = category === 'activities' ? '#E5B04C' : '#7FA8F0';
  const colorB = '#9F8FFF';

  createChart(canvasId, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: labelA, data: dataA, backgroundColor: `${colorA}88`, borderColor: colorA, borderWidth: 1, borderRadius: 3 },
        { label: labelB, data: dataB, backgroundColor: `${colorB}88`, borderColor: colorB, borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, max: 100, ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8b92a8', font: { family: 'Outfit', size: 11 } }, grid: { display: false } }
      },
      plugins: {
        legend: { labels: { color: '#8b92a8', font: { family: 'Outfit', size: 11 } } },
        tooltip: { backgroundColor: '#1a1e28' }
      }
    }
  });
}

// ========== HISTORY PAGE ==========

function renderHistoryPage() {
  const container = document.getElementById('page-history');
  const dates = Object.keys(AppState.history).sort().reverse();
  
  if (dates.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No history yet. Start tracking today!</div></div>`;
    return;
  }

  const allItems = [...AppState.config.activities, ...AppState.config.studies];

  let tableRows = dates.slice(0, 60).map(date => {
    const actComp = calcDayCompletion(date, 'activities');
    const studComp = calcDayCompletion(date, 'studies');
    const record = getDayRecord(date);
    let totalDone = 0;
    let totalTracked = 0;
    let obsCount = 0;
    allItems.forEach(item => {
      const cat = item.category === 'activities' ? 'activities' : 'studies';
      if (record[cat]?.[item.id]?.done) totalDone++;
      if (record[cat]?.[item.id]) totalTracked++;
      if (record[cat]?.[item.id]?.detail?.trim()) obsCount++;
    });
    
    return `<tr style="cursor:pointer" onclick="jumpToDate('${date}');renderPage('today')">
      <td style="font-family:'JetBrains Mono',monospace;font-size:0.8rem">${formatDate(date)}</td>
      <td><span class="status-dot ${actComp >= 80 ? 'done' : actComp > 0 ? 'missed' : 'na'}"></span> ${actComp}%</td>
      <td><span class="status-dot ${studComp >= 80 ? 'done' : studComp > 0 ? 'missed' : 'na'}"></span> ${studComp}%</td>
      <td>${totalDone}</td>
      <td>${obsCount > 0 ? `<span style="color:var(--accent-primary)">${obsCount} 📝</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="icon">📜</span> Completion History</div>
        <span style="font-size:0.78rem;color:var(--text-muted)">${dates.length} days tracked</span>
      </div>
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Activities</th>
              <th>Studies</th>
              <th>Items Done</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ========== INSIGHTS PAGE ==========

function renderInsightsPage() {
  const container = document.getElementById('page-insights');
  const insights = generateInsights();
  
  const insightsHtml = insights.length > 0
    ? insights.map(i => `<div class="ai-insight ${i.type}"><span class="ai-insight-icon">${i.icon}</span><div class="ai-insight-text">${i.text}</div></div>`).join('')
    : '<div class="ai-insight success"><span class="ai-insight-icon">✨</span><div class="ai-insight-text">Everything is on track! No issues detected.</div></div>';

  // Build "last done" table for mandatory items
  const mandatoryItems = [...AppState.config.activities, ...AppState.config.studies].filter(i => i.frequency !== 'optional');
  let overviewHtml = mandatoryItems.map(item => {
    const cat = item.category;
    const daysSince = calcItemDaysSinceLastDone(item.id, cat);
    const freq = FREQUENCY_META[item.frequency];
    const isOverdue = freq.days && daysSince > freq.days;
    const statusClass = daysSince === Infinity ? 'missed' : isOverdue ? 'missed' : 'done';
    const daysText = daysSince === Infinity ? 'Never' : daysSince === 0 ? 'Today' : `${daysSince}d ago`;
    return `
      <tr>
        <td>${item.name}</td>
        <td><span class="activity-tag ${freq.tagClass}" style="font-size:0.6rem">${freq.label}</span></td>
        <td><span class="status-dot ${statusClass}"></span> ${daysText}</td>
        <td>${isOverdue ? '⚠️ Overdue' : daysSince === Infinity ? '❌ Never done' : '✅ OK'}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="ai-panel" style="margin-bottom:24px">
      <div class="ai-header">
        <span class="ai-badge">AI Analysis</span>
        <span class="ai-title">Intelligent Activity Monitor</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
        This analysis checks all mandatory activities and studies for overdue items, streaks, and patterns. Only mandatory items trigger alerts.
      </p>
      ${insightsHtml}
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🟩</span> Activities Heatmap (90 days)</div>
        </div>
        <div id="insights-heatmap-act"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🟦</span> Studies Heatmap (90 days)</div>
        </div>
        <div id="insights-heatmap-stud"></div>
      </div>
      <div class="card full-width">
        <div class="card-header">
          <div class="card-title"><span class="icon">📊</span> Item Frequency (Last 30 Days)</div>
        </div>
        <div class="chart-container"><canvas id="chart-insights-freq"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><span class="icon">🔍</span> Mandatory Items Overview</div>
      </div>
      <div class="history-table-container">
        <table class="history-table">
          <thead><tr><th>Item</th><th>Frequency</th><th>Last Done</th><th>Status</th></tr></thead>
          <tbody>${overviewHtml}</tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    renderHeatmapForDashboard('insights-heatmap-act', 'activities');
    renderHeatmapForDashboard('insights-heatmap-stud', 'studies');
    renderInsightsFreqChart();
  }, 50);
}

function renderInsightsFreqChart() {
  const allItems = [...AppState.config.activities, ...AppState.config.studies].filter(i => i.frequency !== 'optional');
  const today = todayStr();
  const startDate = addDays(today, -30);
  const dates = getDatesInRange(startDate, today);

  const itemCounts = allItems.map(item => {
    const cat = item.category === 'activities' ? 'activities' : 'studies';
    let count = 0;
    dates.forEach(d => {
      if (getDayRecord(d)[cat]?.[item.id]?.done) count++;
    });
    return { name: item.name, count, category: item.category };
  }).sort((a, b) => b.count - a.count);

  createChart('chart-insights-freq', {
    type: 'bar',
    data: {
      labels: itemCounts.map(i => i.name),
      datasets: [{
        label: 'Times completed (30d)',
        data: itemCounts.map(i => i.count),
        backgroundColor: itemCounts.map(i => i.category === 'activities' ? '#E5B04C66' : '#7FA8F066'),
        borderColor: itemCounts.map(i => i.category === 'activities' ? '#E5B04C' : '#7FA8F0'),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { color: '#8b92a8', stepSize: 1, font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { ticks: { color: '#8b92a8', font: { family: 'Outfit', size: 9 }, maxRotation: 45 }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1e28' }
      }
    }
  });
}

// ========== OBSERVATIONS PAGE ==========

function collectAllObservations() {
  const observations = {}; // { itemId: [{ date, detail }] }
  const allItems = [...AppState.config.activities, ...AppState.config.studies];
  
  allItems.forEach(item => {
    observations[item.id] = [];
  });

  const dates = Object.keys(AppState.history).sort();
  dates.forEach(date => {
    const record = AppState.history[date];
    ['activities', 'studies'].forEach(cat => {
      if (!record[cat]) return;
      Object.entries(record[cat]).forEach(([itemId, data]) => {
        if (data.detail && data.detail.trim()) {
          if (!observations[itemId]) observations[itemId] = [];
          observations[itemId].push({ date, detail: data.detail.trim(), done: data.done });
        }
      });
    });
  });

  return observations;
}

function analyzeObservationPatterns(observations) {
  const analysis = [];
  const allItems = [...AppState.config.activities, ...AppState.config.studies];
  
  // 1. Word frequency analysis across all observations
  const globalWordFreq = {};
  const itemWordFreq = {};
  
  allItems.forEach(item => {
    const obs = observations[item.id] || [];
    itemWordFreq[item.id] = {};
    
    obs.forEach(o => {
      const words = o.detail.toLowerCase()
        .replace(/[^a-záàâãéèêíïóôõöúüç0-9\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 2);
      
      words.forEach(word => {
        globalWordFreq[word] = (globalWordFreq[word] || 0) + 1;
        itemWordFreq[item.id][word] = (itemWordFreq[item.id][word] || 0) + 1;
      });
    });
  });

  // 2. Most documented activities
  const docCounts = allItems
    .map(item => ({ item, count: (observations[item.id] || []).length }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);

  if (docCounts.length > 0) {
    const top = docCounts[0];
    analysis.push({
      type: 'info',
      icon: '📝',
      text: `<strong>${top.item.name}</strong> is your most documented item with <strong>${top.count} observations</strong>. Good habit of tracking details!`,
      priority: 40,
    });
  }

  // 3. Items with NO observations but marked done many times
  allItems.forEach(item => {
    if (item.frequency === 'optional') return;
    const obs = (observations[item.id] || []).length;
    let doneCount = 0;
    Object.values(AppState.history).forEach(record => {
      const cat = item.category === 'activities' ? 'activities' : 'studies';
      if (record[cat]?.[item.id]?.done) doneCount++;
    });
    
    if (doneCount >= 5 && obs === 0) {
      analysis.push({
        type: 'warning',
        icon: '⚠️',
        text: `<strong>${item.name}</strong> has been completed <strong>${doneCount} times</strong> but has <strong>zero observations</strong>. Adding details helps you track progress and remember what you did.`,
        priority: 60,
      });
    } else if (doneCount >= 5 && obs < doneCount * 0.3) {
      analysis.push({
        type: 'info',
        icon: 'ℹ️',
        text: `<strong>${item.name}</strong> only has details in <strong>${Math.round(obs/doneCount*100)}%</strong> of completions (${obs}/${doneCount}). Consider adding more observations.`,
        priority: 30,
      });
    }
  });

  // 4. Recurring patterns in detail text
  allItems.forEach(item => {
    const obs = observations[item.id] || [];
    if (obs.length < 3) return;
    
    const wordFreqs = itemWordFreq[item.id] || {};
    const sorted = Object.entries(wordFreqs).sort((a, b) => b[1] - a[1]);
    const topWords = sorted.slice(0, 5).filter(([_, count]) => count >= 2);
    
    if (topWords.length >= 2) {
      const wordList = topWords.map(([w, c]) => `"${w}" (${c}x)`).join(', ');
      analysis.push({
        type: 'success',
        icon: '🔄',
        text: `<strong>${item.name}</strong> — recurring themes: ${wordList}. This reveals your focus areas.`,
        priority: 25,
      });
    }
  });

  // 5. Diversity analysis
  allItems.forEach(item => {
    const obs = observations[item.id] || [];
    if (obs.length < 5) return;
    
    const uniqueDetails = new Set(obs.map(o => o.detail.toLowerCase().trim()));
    const diversityRatio = uniqueDetails.size / obs.length;
    
    if (diversityRatio >= 0.8 && obs.length >= 5) {
      analysis.push({
        type: 'success',
        icon: '🌈',
        text: `<strong>${item.name}</strong> shows <strong>high diversity</strong> — ${uniqueDetails.size} unique entries out of ${obs.length}. You're exploring varied content!`,
        priority: 20,
      });
    } else if (diversityRatio < 0.3 && obs.length >= 5) {
      analysis.push({
        type: 'info',
        icon: '🔁',
        text: `<strong>${item.name}</strong> shows <strong>high repetition</strong> — only ${uniqueDetails.size} unique entries out of ${obs.length}. Consider diversifying your approach.`,
        priority: 35,
      });
    }
  });

  // 6. Recent activity analysis (last 7 days)
  const recentDates = [];
  let d = todayStr();
  for (let i = 0; i < 7; i++) {
    recentDates.push(d);
    d = addDays(d, -1);
  }
  
  let recentObsCount = 0;
  let recentDoneCount = 0;
  recentDates.forEach(date => {
    const record = getDayRecord(date);
    ['activities', 'studies'].forEach(cat => {
      if (!record[cat]) return;
      Object.values(record[cat]).forEach(data => {
        if (data.done) recentDoneCount++;
        if (data.detail && data.detail.trim()) recentObsCount++;
      });
    });
  });

  if (recentDoneCount > 0) {
    const obsRate = Math.round((recentObsCount / recentDoneCount) * 100);
    if (obsRate >= 70) {
      analysis.push({
        type: 'success',
        icon: '✨',
        text: `Great documentation this week! <strong>${obsRate}%</strong> of completed items have detailed observations (${recentObsCount}/${recentDoneCount}).`,
        priority: 15,
      });
    } else if (obsRate < 30) {
      analysis.push({
        type: 'warning',
        icon: '📋',
        text: `Only <strong>${obsRate}%</strong> of completed items this week have observations (${recentObsCount}/${recentDoneCount}). Try adding more details!`,
        priority: 55,
      });
    }
  }

  analysis.sort((a, b) => b.priority - a.priority);
  return { analysis, globalWordFreq, itemWordFreq, docCounts };
}

function renderObservationsPage() {
  const container = document.getElementById('page-observations');
  const observations = collectAllObservations();
  const allItems = [...AppState.config.activities, ...AppState.config.studies];
  const { analysis, globalWordFreq, docCounts } = analyzeObservationPatterns(observations);

  // Build filter options
  const itemsWithObs = allItems.filter(item => (observations[item.id] || []).length > 0);
  const filterOptionsHtml = `<option value="all">All Items</option>` +
    `<option value="activities">— All Activities —</option>` +
    AppState.config.activities.filter(i => (observations[i.id] || []).length > 0)
      .map(i => `<option value="${i.id}">&nbsp;&nbsp;${i.name} (${observations[i.id].length})</option>`).join('') +
    `<option value="studies">— All Studies —</option>` +
    AppState.config.studies.filter(i => (observations[i.id] || []).length > 0)
      .map(i => `<option value="${i.id}">&nbsp;&nbsp;${i.name} (${observations[i.id].length})</option>`).join('');

  // Build word cloud data (top 30 words)
  const sortedWords = Object.entries(globalWordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  const maxFreq = sortedWords.length > 0 ? sortedWords[0][1] : 1;
  const wordCloudHtml = sortedWords.map(([word, freq]) => {
    const size = Math.max(0.7, Math.min(2.2, 0.7 + (freq / maxFreq) * 1.5));
    const opacity = Math.max(0.5, freq / maxFreq);
    const hue = Math.round(170 + (freq / maxFreq) * 60); // teal to blue gradient
    return `<span class="word-cloud-word" style="font-size:${size}rem;opacity:${opacity};color:hsl(${hue},65%,65%)" title="${word}: ${freq}x">${word}</span>`;
  }).join('');

  // AI analysis HTML
  const aiHtml = analysis.length > 0
    ? analysis.slice(0, 8).map(i => `<div class="ai-insight ${i.type}"><span class="ai-insight-icon">${i.icon}</span><div class="ai-insight-text">${i.text}</div></div>`).join('')
    : '<div class="ai-insight success"><span class="ai-insight-icon">✨</span><div class="ai-insight-text">Not enough data yet. Keep tracking with detailed observations!</div></div>';

  // Documentation rate by item (for radar/bar chart)
  const docRateData = allItems.filter(i => i.frequency !== 'optional').map(item => {
    let doneCount = 0;
    Object.values(AppState.history).forEach(record => {
      const cat = item.category === 'activities' ? 'activities' : 'studies';
      if (record[cat]?.[item.id]?.done) doneCount++;
    });
    const obsCount = (observations[item.id] || []).length;
    return {
      name: item.name,
      category: item.category,
      doneCount,
      obsCount,
      rate: doneCount > 0 ? Math.round((obsCount / doneCount) * 100) : 0,
    };
  }).filter(d => d.doneCount > 0);

  // Total observations count
  const totalObs = Object.values(observations).reduce((sum, arr) => sum + arr.length, 0);
  const totalDone = Object.values(AppState.history).reduce((sum, record) => {
    let c = 0;
    ['activities', 'studies'].forEach(cat => {
      Object.values(record[cat] || {}).forEach(v => { if (v.done) c++; });
    });
    return sum + c;
  }, 0);
  const globalRate = totalDone > 0 ? Math.round((totalObs / totalDone) * 100) : 0;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Total Observations</div>
        <div class="stat-value">${totalObs}</div>
        <div class="stat-sub">across all items</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Documentation Rate</div>
        <div class="stat-value">${globalRate}%</div>
        <div class="stat-sub">completions with details</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Items Documented</div>
        <div class="stat-value">${itemsWithObs.length}</div>
        <div class="stat-sub">out of ${allItems.length} total</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Top Documented</div>
        <div class="stat-value" style="font-size:1.2rem">${docCounts.length > 0 ? docCounts[0].item.name : '—'}</div>
        <div class="stat-sub">${docCounts.length > 0 ? docCounts[0].count + ' entries' : 'no data'}</div>
      </div>
    </div>

    <div class="ai-panel" style="margin-bottom:24px">
      <div class="ai-header">
        <span class="ai-badge">AI Analysis</span>
        <span class="ai-title">Observation Intelligence</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
        Patterns, trends, and recommendations based on your observation data and documentation habits.
      </p>
      ${aiHtml}
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">☁️</span> Word Cloud</div>
          <span style="font-size:0.78rem;color:var(--text-muted)">${sortedWords.length} terms</span>
        </div>
        <div class="word-cloud-container">${wordCloudHtml || '<span style="color:var(--text-muted)">No observations yet</span>'}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📊</span> Documentation Rate</div>
        </div>
        <div class="chart-container"><canvas id="chart-obs-rate"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🕸️</span> Coverage Radar</div>
        </div>
        <div class="chart-container"><canvas id="chart-obs-radar"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📈</span> Observation Timeline</div>
        </div>
        <div class="chart-container"><canvas id="chart-obs-timeline"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><span class="icon">🔎</span> Observation Explorer</div>
        <div style="display:flex;gap:8px;align-items:center">
          <select class="form-select" id="obs-filter" onchange="filterObservations()" style="min-width:220px">
            ${filterOptionsHtml}
          </select>
          <input type="text" class="form-input" id="obs-search" placeholder="Search observations..." 
            oninput="filterObservations()" style="width:200px">
        </div>
      </div>
      <div class="scroll-inner" id="observations-list" style="max-height:600px">
        ${renderObservationsList(observations, allItems, 'all', '')}
      </div>
    </div>
  `;

  // Render charts
  setTimeout(() => {
    renderObsRateChart(docRateData);
    renderObsRadarChart(docRateData);
    renderObsTimelineChart(observations);
  }, 50);
}

function renderObservationsList(observations, allItems, filterValue, searchTerm) {
  let items = allItems;
  
  if (filterValue === 'activities') {
    items = AppState.config.activities;
  } else if (filterValue === 'studies') {
    items = AppState.config.studies;
  } else if (filterValue !== 'all') {
    items = allItems.filter(i => i.id === filterValue);
  }

  const search = searchTerm.toLowerCase().trim();
  let html = '';
  let totalShown = 0;

  items.forEach(item => {
    let obs = (observations[item.id] || []).slice().reverse(); // newest first
    
    if (search) {
      obs = obs.filter(o => o.detail.toLowerCase().includes(search) || o.date.includes(search));
    }

    if (obs.length === 0) return;
    totalShown += obs.length;

    const freqMeta = FREQUENCY_META[item.frequency];
    html += `
      <div class="obs-group">
        <div class="obs-group-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <div class="obs-group-info">
            <span class="obs-group-name">${item.name}</span>
            <span class="activity-tag ${freqMeta.tagClass}" style="font-size:0.6rem">${freqMeta.label}</span>
            <span class="obs-group-count">${obs.length} observation${obs.length !== 1 ? 's' : ''}</span>
          </div>
          <span class="obs-group-chevron">▾</span>
        </div>
        <div class="obs-group-body">
          ${obs.slice(0, 50).map(o => `
            <div class="obs-entry" onclick="jumpToDate('${o.date}');renderPage('today')">
              <span class="obs-entry-date">${formatDate(o.date)}</span>
              <span class="obs-entry-detail">${escapeHtml(o.detail)}</span>
              <span class="obs-entry-status ${o.done ? 'done' : ''}">${o.done ? '✓' : '○'}</span>
            </div>
          `).join('')}
          ${obs.length > 50 ? `<div class="obs-entry" style="justify-content:center;color:var(--text-muted);font-style:italic">...and ${obs.length - 50} more</div>` : ''}
        </div>
      </div>
    `;
  });

  if (totalShown === 0) {
    html = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No observations found. Add details when completing activities!</div></div>';
  }

  return html;
}

function filterObservations() {
  const filterValue = document.getElementById('obs-filter')?.value || 'all';
  const searchTerm = document.getElementById('obs-search')?.value || '';
  const observations = collectAllObservations();
  const allItems = [...AppState.config.activities, ...AppState.config.studies];
  const listEl = document.getElementById('observations-list');
  if (listEl) {
    listEl.innerHTML = renderObservationsList(observations, allItems, filterValue, searchTerm);
  }
}

function renderObsRateChart(docRateData) {
  if (docRateData.length === 0) return;
  const labels = docRateData.map(d => d.name);
  const data = docRateData.map(d => d.rate);
  const colors = docRateData.map(d => d.category === 'activities' ? '#E5B04C88' : '#7FA8F088');
  const borders = docRateData.map(d => d.category === 'activities' ? '#E5B04C' : '#7FA8F0');

  createChart('chart-obs-rate', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Documentation Rate %',
        data,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, max: 100, ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8b92a8', font: { family: 'Outfit', size: 10 } }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1e28' }
      }
    }
  });
}

function renderObsRadarChart(docRateData) {
  if (docRateData.length < 3) return;
  const top = docRateData.slice(0, 8);
  const labels = top.map(d => d.name);

  createChart('chart-obs-radar', {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'Observations',
          data: top.map(d => d.obsCount),
          borderColor: '#E5B04C',
          backgroundColor: 'rgba(229, 176, 76, 0.15)',
          pointBackgroundColor: '#E5B04C',
          pointBorderWidth: 0,
          pointRadius: 4,
        },
        {
          label: 'Completions',
          data: top.map(d => d.doneCount),
          borderColor: '#9F8FFF',
          backgroundColor: 'rgba(159, 143, 255, 0.1)',
          pointBackgroundColor: '#9F8FFF',
          pointBorderWidth: 0,
          pointRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          ticks: { color: '#8b92a8', backdropColor: 'transparent', font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#8b92a8', font: { family: 'Outfit', size: 10 } }
        }
      },
      plugins: {
        legend: { labels: { color: '#8b92a8', font: { family: 'Outfit', size: 11 } } },
        tooltip: { backgroundColor: '#1a1e28' }
      }
    }
  });
}

function renderObsTimelineChart(observations) {
  // Group observations by week
  const allObs = [];
  Object.entries(observations).forEach(([itemId, obs]) => {
    obs.forEach(o => allObs.push(o));
  });
  
  if (allObs.length === 0) return;

  allObs.sort((a, b) => a.date.localeCompare(b.date));
  
  // Group by week
  const weekMap = {};
  allObs.forEach(o => {
    const week = getWeekRange(o.date);
    const key = week.start;
    weekMap[key] = (weekMap[key] || 0) + 1;
  });

  const weeks = Object.keys(weekMap).sort().slice(-12); // last 12 weeks
  const labels = weeks.map(w => formatDateShort(w));
  const data = weeks.map(w => weekMap[w] || 0);

  createChart('chart-obs-timeline', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Observations per week',
        data,
        borderColor: '#E5B04C',
        backgroundColor: 'rgba(229, 176, 76, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#E5B04C',
        pointBorderWidth: 0,
        pointHoverRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { color: '#8b92a8', stepSize: 1, font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { ticks: { color: '#8b92a8', font: { family: 'JetBrains Mono', size: 10 } }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1e28' }
      }
    }
  });
}

// ========== ENHANCED DASHBOARD CHARTS ==========

function renderHeatmapForDashboard(containerId, category) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const today = todayStr();
  const startDate = addDays(today, -90); // last ~3 months
  const dates = getDatesInRange(startDate, today);
  
  let html = '<div class="heatmap-grid">';
  dates.forEach(date => {
    const completion = calcDayCompletion(date, category);
    let level = 0;
    if (completion > 0) level = 1;
    if (completion >= 25) level = 2;
    if (completion >= 50) level = 3;
    if (completion >= 75) level = 4;
    if (completion >= 100) level = 5;
    html += `<div class="heatmap-cell level-${level}" title="${formatDate(date)}: ${completion}%"></div>`;
  });
  html += '</div>';
  html += `<div class="heatmap-legend">
    <span>Less</span>
    <div class="heatmap-cell level-1" style="width:12px;height:12px"></div>
    <div class="heatmap-cell level-2" style="width:12px;height:12px"></div>
    <div class="heatmap-cell level-3" style="width:12px;height:12px"></div>
    <div class="heatmap-cell level-4" style="width:12px;height:12px"></div>
    <div class="heatmap-cell level-5" style="width:12px;height:12px"></div>
    <span>More</span>
  </div>`;
  
  container.innerHTML = html;
}

// ========== SETTINGS PAGE ==========

function renderSettingsPage() {
  const container = document.getElementById('page-settings');
  
  const freqOptionsHtml = FREQUENCY_OPTIONS.map(f => `<option value="${f.value}">${f.label}</option>`).join('');

  let activitiesConfig = AppState.config.activities.map((item, idx) => `
    <div class="config-item">
      <div>
        <div class="config-item-name">${item.name}</div>
        <div class="config-item-desc">Placeholder: ${item.placeholder}</div>
      </div>
      <div class="config-item-actions">
        <select class="form-select priority-select" onchange="updateItemFrequency('activities', ${idx}, this.value)">
          ${FREQUENCY_OPTIONS.map(f => `<option value="${f.value}" ${item.frequency === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
        <button class="btn-edit-config" onclick="openRenameItemModal('activities', ${idx})" title="Rename ${item.name}">✎</button>
        <button class="btn btn-delete-config" onclick="deleteConfigItem('activities', ${idx})" title="Delete ${item.name}">🗑️</button>
      </div>
    </div>
  `).join('');

  let studiesConfig = AppState.config.studies.map((item, idx) => `
    <div class="config-item">
      <div>
        <div class="config-item-name">${item.name}</div>
        <div class="config-item-desc">Placeholder: ${item.placeholder}</div>
      </div>
      <div class="config-item-actions">
        <select class="form-select priority-select" onchange="updateItemFrequency('studies', ${idx}, this.value)">
          ${FREQUENCY_OPTIONS.map(f => `<option value="${f.value}" ${item.frequency === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
        <button class="btn-edit-config" onclick="openRenameItemModal('studies', ${idx})" title="Rename ${item.name}">✎</button>
        <button class="btn btn-delete-config" onclick="deleteConfigItem('studies', ${idx})" title="Delete ${item.name}">🗑️</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title"><span class="icon">⚙️</span> Priority Configuration</div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:20px">
        Rename, re-prioritize, or remove any activity or study subject. Use ✎ to rename an item, the dropdown to change its frequency (e.g. move Mathematics from Optional to Weekly), or 🗑️ to delete it.
      </p>
      
      <div class="config-section">
        <div class="config-section-title">⚡ Activities</div>
        ${activitiesConfig}
      </div>

      <div class="config-section">
        <div class="config-section-title">📚 Studies</div>
        ${studiesConfig}
      </div>
    </div>

    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title"><span class="icon">➕</span> Add New Item</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto auto;gap:12px;align-items:end;">
        <div class="form-group" style="margin:0">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="new-item-name" placeholder="Item name">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Placeholder</label>
          <input type="text" class="form-input" id="new-item-placeholder" placeholder="Detail hint">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Category</label>
          <select class="form-select" id="new-item-category">
            <option value="activities">Activities</option>
            <option value="studies">Studies</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Frequency</label>
          <select class="form-select" id="new-item-frequency">${freqOptionsHtml}</select>
        </div>
        <button class="btn btn-primary" onclick="addNewItem()" style="height:38px">Add</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="icon">🔄</span> Reset</div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
        Restore all configuration to defaults. This won't delete your history data.
      </p>
      <button class="btn btn-danger" onclick="resetConfig()">Reset to Defaults</button>
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-header">
        <div class="card-title"><span class="icon">📅</span> Activity Schedules</div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
        Set which days each activity is expected. Off-days will be marked lighter in the daily tracker but can still be completed as exceptions.
      </p>
      <div class="schedule-config-list">
        ${renderScheduleConfig()}
      </div>
    </div>
  `;
}

function updateItemFrequency(category, index, newFrequency) {
  AppState.config[category][index].frequency = newFrequency;
  saveToLocalStorage();
  showToast(`Updated ${AppState.config[category][index].name} to ${FREQUENCY_META[newFrequency].label}`, 'success');
}

// --- Rename Activity/Study Item Modal ---
function openRenameItemModal(category, index) {
  const item = AppState.config[category][index];
  if (!item) return;
  const label = category === 'activities' ? 'Activity' : 'Study';
  const html = `
    <div class="modal-header">
      <div class="modal-title">Rename ${label}</div>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input type="text" class="form-input" id="rename-item-name" value="${escapeHtml(item.name)}" placeholder="Item name">
      </div>
      <div class="form-group">
        <label class="form-label">Placeholder</label>
        <input type="text" class="form-input" id="rename-item-placeholder" value="${escapeHtml(item.placeholder || '')}" placeholder="Detail hint">
      </div>
      <p class="ap-form-hint">The item's tracking history is preserved — this only changes the label shown across the app.</p>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitRenameItem('${category}', ${index})">Save</button>
    </div>
  `;
  openModal(html);
}

function submitRenameItem(category, index) {
  const item = AppState.config[category][index];
  if (!item) return;
  const nameInput = document.getElementById('rename-item-name');
  const placeholderInput = document.getElementById('rename-item-placeholder');
  const name = nameInput.value.trim();
  const placeholder = placeholderInput.value.trim();

  if (!name) { showToast('Please enter a name', 'warning'); return; }

  item.name = name;
  item.placeholder = placeholder || item.placeholder;
  saveToLocalStorage();
  closeModal();
  showToast(`Renamed to "${name}"`, 'success');
  renderSettingsPage();
}

function addNewItem() {
  const name = document.getElementById('new-item-name').value.trim();
  const placeholder = document.getElementById('new-item-placeholder').value.trim() || 'details';
  const category = document.getElementById('new-item-category').value;
  const frequency = document.getElementById('new-item-frequency').value;

  if (!name) { showToast('Please enter a name', 'warning'); return; }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (getAllItems(category).find(i => i.id === id)) {
    showToast('An item with a similar name already exists', 'warning');
    return;
  }

  const newItem = {
    id,
    name,
    placeholder,
    frequency,
    category,
    group: frequency === 'optional' ? 'optional' : 'mandatory',
  };

  AppState.config[category].push(newItem);
  saveToLocalStorage();
  showToast(`Added "${name}" to ${category}`, 'success');
  renderSettingsPage();
}

function resetConfig() {
  if (confirm('Reset all configuration to defaults? Your history data will be preserved.')) {
    AppState.config.activities = deepClone(DEFAULT_ACTIVITIES);
    AppState.config.studies = deepClone(DEFAULT_STUDIES);
    AppState.config._deletedIds = [];
    saveToLocalStorage();
    showToast('Configuration reset to defaults', 'success');
    renderSettingsPage();
  }
}

function deleteConfigItem(category, index) {
  const item = AppState.config[category][index];
  if (!item) return;
  const label = category === 'activities' ? 'activity' : 'study';
  if (confirm(`Delete "${item.name}" from ${label} list?\n\nThis removes it from the configuration. Historical data for this item will be preserved.`)) {
    // Register the ID so initConfig() never re-adds this default item on reload
    if (!AppState.config._deletedIds) AppState.config._deletedIds = [];
    if (!AppState.config._deletedIds.includes(item.id)) {
      AppState.config._deletedIds.push(item.id);
    }
    AppState.config[category].splice(index, 1);
    saveToLocalStorage();
    showToast(`Deleted "${item.name}"`, 'success');
    renderSettingsPage();
  }
}

// ========== DATA MANAGEMENT PAGE ==========

function renderDataPage() {
  const container = document.getElementById('page-data');
  const recordCount = Object.keys(AppState.history).length;
  const dataSize = new Blob([JSON.stringify(AppState.history)]).size;
  const sizeStr = dataSize > 1024 ? `${(dataSize / 1024).toFixed(1)} KB` : `${dataSize} B`;
  container.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr)">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Days Tracked</div>
        <div class="stat-value">${recordCount}</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Data Size</div>
        <div class="stat-value">${sizeStr}</div>
      </div>
    </div>

    <div class="dashboard-grid">

      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">⬇️</span> Export Data</div>
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
          Download all your data as <strong>life_dashboard.json</strong>. Place this file in the same folder as index.html to auto-load on startup.
        </p>
        <button class="btn btn-primary" onclick="exportToJSON()">⬇ Export JSON</button>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">⬆️</span> Import Data</div>
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
          Upload a previously exported JSON file. New data will be merged with existing records.
        </p>
        <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-input').click()">
          <div class="upload-zone-icon">📁</div>
          <div class="upload-zone-text">Click to select JSON file</div>
          <div class="upload-zone-hint">or drag and drop here</div>
        </div>
        <input type="file" id="file-input" accept=".json" style="display:none" onchange="handleFileUpload(event)">
      </div>

      <div class="card full-width">
        <div class="card-header">
          <div class="card-title"><span class="icon">⚠️</span> Danger Zone</div>
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-danger" onclick="clearAllHistory()">🗑 Clear All History</button>
          <button class="btn btn-danger" onclick="clearAllData()">💣 Factory Reset</button>
        </div>
      </div>
    </div>
  `;

  // Drag and drop
  const zone = document.getElementById('upload-zone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent-primary)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) handleFile(file);
}

function handleFile(file) {
  if (!file.name.endsWith('.json')) {
    showToast('Please upload a JSON file', 'warning');
    return;
  }
  importFromJSON(file).then(() => {
    renderPage(AppState.currentPage);
  });
}

function clearAllHistory() {
  if (confirm('Delete ALL history data? This cannot be undone.')) {
    AppState.history = {};
    saveToLocalStorage();
    showToast('All history cleared', 'warning');
    renderPage('data');
  }
}

function clearAllData() {
  if (confirm('FACTORY RESET: Delete ALL data and configuration? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    localStorage.removeItem(STORAGE_KEY_GOALS);
    localStorage.removeItem(STORAGE_KEY_OBJECTIVES);
    localStorage.removeItem(STORAGE_KEY_CALENDAR);
    localStorage.removeItem(STORAGE_KEY_TRACKERS);
    localStorage.removeItem(STORAGE_KEY_SCHEDULES);
    localStorage.removeItem(STORAGE_KEY_POMODORO_CFG);
    localStorage.removeItem(STORAGE_KEY_POMODORO_HIST);
    localStorage.removeItem(STORAGE_KEY_HABITS);
    localStorage.removeItem(STORAGE_KEY_HABITS_LOG);
    AppState.history = {};
    AppState.config = { activities: [], studies: [] };
    AppState.goals = [];
    AppState.objectives = [];
    AppState.calendarEvents = [];
    AppState.trackers = [];
    AppState.schedules = {};
    AppState.pomodoroConfig = { workMinutes: 30, shortBreakMinutes: 5, longBreakMinutes: 30, cyclesBeforeLong: 4 };
    AppState.pomodoroHistory = [];
    AppState.habits = [];
    AppState.habitsLog = {};
    initConfig();
    saveToLocalStorage();
    showToast('Factory reset complete', 'warning');
    renderPage('today');
  }
}

// ========== GOALS & OBJECTIVES SYSTEM ==========

// --- ID generation ---
function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// --- Modal helpers ---
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (overlay && container) {
    container.innerHTML = html;
    overlay.classList.add('active');
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// --- Goal CRUD ---
function createGoal(name, description, steps) {
  const goal = {
    id: generateId('goal'),
    name,
    description: description || '',
    steps: steps.map((text, i) => ({ id: 's' + i, text, done: false, doneDate: null })),
    createdAt: todayStr(),
    archived: false,
  };
  AppState.goals.push(goal);
  saveToLocalStorage();
  return goal;
}

function toggleGoalStep(goalId, stepId) {
  const goal = AppState.goals.find(g => g.id === goalId);
  if (!goal) return;
  const step = goal.steps.find(s => s.id === stepId);
  if (!step) return;
  step.done = !step.done;
  step.doneDate = step.done ? todayStr() : null;
  saveToLocalStorage();
}

function getGoalProgress(goal) {
  if (!goal.steps || goal.steps.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = goal.steps.filter(s => s.done).length;
  return { done, total: goal.steps.length, pct: Math.round((done / goal.steps.length) * 100) };
}

function archiveGoal(goalId) {
  const goal = AppState.goals.find(g => g.id === goalId);
  if (goal) {
    goal.archived = !goal.archived;
    saveToLocalStorage();
    renderPage(AppState.currentPage);
    showToast(goal.archived ? 'Goal archived' : 'Goal restored', 'info');
  }
}

function deleteGoal(goalId) {
  if (!confirm('Delete this goal permanently?')) return;
  AppState.goals = AppState.goals.filter(g => g.id !== goalId);
  saveToLocalStorage();
  renderPage(AppState.currentPage);
  showToast('Goal deleted', 'warning');
}

// --- Objective CRUD ---
function createObjective(name, description, type, steps, targetValue, unit) {
  const obj = {
    id: generateId('obj'),
    name,
    description: description || '',
    type, // 'list' or 'value'
    createdAt: todayStr(),
    archived: false,
  };
  if (type === 'list') {
    obj.steps = steps.map((text, i) => ({ id: 's' + i, text, done: false, doneDate: null }));
  } else {
    obj.targetValue = parseFloat(targetValue) || 0;
    obj.currentValue = 0;
    obj.unit = unit || '';
    obj.valueHistory = [];
  }
  AppState.objectives.push(obj);
  saveToLocalStorage();
  return obj;
}

function toggleObjectiveStep(objId, stepId) {
  const obj = AppState.objectives.find(o => o.id === objId);
  if (!obj || obj.type !== 'list') return;
  const step = obj.steps.find(s => s.id === stepId);
  if (!step) return;
  step.done = !step.done;
  step.doneDate = step.done ? todayStr() : null;
  saveToLocalStorage();
}

function addObjectiveValue(objId, amount, date) {
  const obj = AppState.objectives.find(o => o.id === objId);
  if (!obj || obj.type !== 'value') return;
  const val = parseFloat(amount);
  if (isNaN(val) || val === 0) return;
  obj.valueHistory.push({ date: date || todayStr(), amount: val });
  obj.currentValue = obj.valueHistory.reduce((sum, v) => sum + v.amount, 0);
  saveToLocalStorage();
}

function removeObjectiveValueEntry(objId, index) {
  const obj = AppState.objectives.find(o => o.id === objId);
  if (!obj || obj.type !== 'value') return;
  obj.valueHistory.splice(index, 1);
  obj.currentValue = obj.valueHistory.reduce((sum, v) => sum + v.amount, 0);
  saveToLocalStorage();
  renderPage(AppState.currentPage);
}

function getObjectiveProgress(obj) {
  if (obj.type === 'list') {
    if (!obj.steps || obj.steps.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = obj.steps.filter(s => s.done).length;
    return { done, total: obj.steps.length, pct: Math.round((done / obj.steps.length) * 100) };
  } else {
    const target = obj.targetValue || 1;
    const current = obj.currentValue || 0;
    return { done: current, total: target, pct: Math.min(100, Math.round((current / target) * 100)) };
  }
}

function archiveObjective(objId) {
  const obj = AppState.objectives.find(o => o.id === objId);
  if (obj) {
    obj.archived = !obj.archived;
    saveToLocalStorage();
    renderPage(AppState.currentPage);
    showToast(obj.archived ? 'Objective archived' : 'Objective restored', 'info');
  }
}

function deleteObjective(objId) {
  if (!confirm('Delete this objective permanently?')) return;
  AppState.objectives = AppState.objectives.filter(o => o.id !== objId);
  saveToLocalStorage();
  renderPage(AppState.currentPage);
  showToast('Objective deleted', 'warning');
}

// --- Progress Ring SVG helper ---
function renderProgressRing(pct, color, size) {
  size = size || 56;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `
    <div class="go-progress-ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}">
        <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
        <circle class="ring-fill" cx="${size/2}" cy="${size/2}" r="${r}"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
          style="--ring-color:${color}"/>
      </svg>
      <span class="go-progress-ring-pct">${pct}%</span>
    </div>
  `;
}

// --- Render Goals & Objectives Management Page ---
function renderGoalsPage() {
  const container = document.getElementById('page-goals');

  const activeGoals = AppState.goals.filter(g => !g.archived);
  const archivedGoals = AppState.goals.filter(g => g.archived);
  const activeObjectives = AppState.objectives.filter(o => !o.archived);
  const archivedObjectives = AppState.objectives.filter(o => o.archived);

  const totalGoals = AppState.goals.length;
  const completedGoals = AppState.goals.filter(g => getGoalProgress(g).pct === 100).length;
  const totalObj = AppState.objectives.length;
  const completedObj = AppState.objectives.filter(o => getObjectiveProgress(o).pct >= 100).length;

  const goalsCardsHtml = activeGoals.length > 0
    ? activeGoals.map(g => renderGoalCard(g)).join('')
    : '<div class="empty-state"><div class="empty-state-icon">\uD83C\uDFAF</div><div class="empty-state-text">No active goals. Create one to get started!</div></div>';

  const objCardsHtml = activeObjectives.length > 0
    ? activeObjectives.map(o => renderObjectiveCard(o)).join('')
    : '<div class="empty-state"><div class="empty-state-icon">\uD83D\uDCCC</div><div class="empty-state-text">No active objectives. Create one to start tracking!</div></div>';

  let archivedHtml = '';
  if (archivedGoals.length > 0 || archivedObjectives.length > 0) {
    archivedHtml = `
      <div class="card" style="margin-top:24px">
        <div class="card-header collapsible-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
          <div class="card-title"><span class="icon">\uD83D\uDCE6</span> Archived (${archivedGoals.length + archivedObjectives.length})</div>
          <span style="font-size:0.78rem;color:var(--text-muted)">click to toggle</span>
        </div>
        <div style="display:none">
          <div class="go-grid" style="margin-top:16px;padding:0 24px 24px">
            ${archivedGoals.map(g => renderGoalCard(g)).join('')}
            ${archivedObjectives.map(o => renderObjectiveCard(o)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Total Goals</div>
        <div class="stat-value">${totalGoals}</div>
        <div class="stat-sub">${completedGoals} completed</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Total Objectives</div>
        <div class="stat-value">${totalObj}</div>
        <div class="stat-sub">${completedObj} completed</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Active</div>
        <div class="stat-value">${activeGoals.length + activeObjectives.length}</div>
        <div class="stat-sub">in progress</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Archived</div>
        <div class="stat-value">${archivedGoals.length + archivedObjectives.length}</div>
        <div class="stat-sub">finished or paused</div>
      </div>
    </div>

    <div class="go-filter-bar">
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openCreateGoalModal()">+ New Goal</button>
        <button class="btn" onclick="openCreateObjectiveModal()">+ New Objective</button>
      </div>
    </div>

    <h3 style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-secondary);font-family:'JetBrains Mono',monospace;margin-bottom:14px">\uD83C\uDFAF Goals</h3>
    <div class="go-grid">${goalsCardsHtml}</div>

    <h3 style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-secondary);font-family:'JetBrains Mono',monospace;margin:28px 0 14px">\uD83D\uDCCC Objectives</h3>
    <div class="go-grid">${objCardsHtml}</div>

    ${archivedHtml}
  `;
}

function renderGoalCard(goal) {
  const progress = getGoalProgress(goal);
  const isComplete = progress.pct === 100;
  const color = isComplete ? 'var(--accent-green)' : 'var(--accent-primary)';

  const stepsHtml = goal.steps.map(step => `
    <div class="go-step ${step.done ? 'done' : ''}" onclick="toggleGoalStep('${goal.id}','${step.id}');renderPage('goals')">
      <div class="go-step-check">\u2713</div>
      <span class="go-step-text">${escapeHtml(step.text)}</span>
      ${step.doneDate ? `<span class="go-step-date">${formatDateShort(step.doneDate)}</span>` : ''}
    </div>
  `).join('');

  return `
    <div class="go-card type-goal ${goal.archived ? 'archived' : ''}">
      <div class="go-card-accent"></div>
      <div class="go-card-body">
        <div class="go-card-header">
          <div class="go-card-title">${escapeHtml(goal.name)}</div>
          <div class="go-card-badges">
            <span class="go-badge go-badge-goal">Goal</span>
            ${isComplete ? '<span class="go-badge go-badge-complete">Complete</span>' : ''}
            ${goal.archived ? '<span class="go-badge go-badge-archived">Archived</span>' : ''}
          </div>
        </div>
        ${goal.description ? `<div class="go-card-description">${escapeHtml(goal.description)}</div>` : ''}
        <div class="go-progress-ring-wrapper">
          ${renderProgressRing(progress.pct, color)}
          <div class="go-progress-info">
            <div class="go-progress-main">${progress.done} / ${progress.total}</div>
            <div class="go-progress-sub">steps completed</div>
          </div>
        </div>
        <div class="go-steps scroll-inner" style="max-height:240px">${stepsHtml}</div>
        <div class="go-card-actions">
          <button class="btn btn-sm" onclick="openEditGoalModal('${goal.id}')">Edit</button>
          <button class="btn btn-sm" onclick="archiveGoal('${goal.id}')">${goal.archived ? 'Restore' : 'Archive'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteGoal('${goal.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderObjectiveCard(obj) {
  const progress = getObjectiveProgress(obj);
  const isComplete = progress.pct >= 100;
  const isValue = obj.type === 'value';
  const color = isComplete ? 'var(--accent-green)' : isValue ? 'var(--accent-orange)' : 'var(--accent-blue)';
  const badgeClass = isValue ? 'go-badge-obj-value' : 'go-badge-obj-list';
  const badgeLabel = isValue ? 'Value' : 'List';

  let contentHtml = '';
  if (isValue) {
    const unit = obj.unit ? ` ${escapeHtml(obj.unit)}` : '';
    contentHtml = `
      <div class="go-progress-ring-wrapper">
        ${renderProgressRing(progress.pct, color)}
        <div class="go-progress-info">
          <div class="go-progress-main">${progress.done}${unit} / ${progress.total}${unit}</div>
          <div class="go-progress-sub">${progress.pct}% completed${isComplete ? ' \u2014 Done!' : ''}</div>
        </div>
      </div>
      ${obj.valueHistory && obj.valueHistory.length > 0 ? `
        <div class="go-value-history">
          ${obj.valueHistory.slice().reverse().slice(0, 10).map((entry, revIdx) => {
            const realIdx = obj.valueHistory.length - 1 - revIdx;
            return `
              <div class="go-value-history-entry">
                <span class="date">${formatDateShort(entry.date)}</span>
                <span class="amount">+${entry.amount}${unit}</span>
                <span class="remove-entry" onclick="event.stopPropagation();removeObjectiveValueEntry('${obj.id}',${realIdx})">\u2715</span>
              </div>
            `;
          }).join('')}
          ${obj.valueHistory.length > 10 ? '<div style="text-align:center;font-size:0.72rem;color:var(--text-muted);padding:4px">...and more</div>' : ''}
        </div>
      ` : ''}
    `;
  } else {
    const stepsHtml = obj.steps.map(step => `
      <div class="go-step ${step.done ? 'done' : ''}" onclick="toggleObjectiveStep('${obj.id}','${step.id}');renderPage('goals')">
        <div class="go-step-check">\u2713</div>
        <span class="go-step-text">${escapeHtml(step.text)}</span>
        ${step.doneDate ? `<span class="go-step-date">${formatDateShort(step.doneDate)}</span>` : ''}
      </div>
    `).join('');
    contentHtml = `
      <div class="go-progress-ring-wrapper">
        ${renderProgressRing(progress.pct, color)}
        <div class="go-progress-info">
          <div class="go-progress-main">${progress.done} / ${progress.total}</div>
          <div class="go-progress-sub">steps completed</div>
        </div>
      </div>
      <div class="go-steps scroll-inner" style="max-height:240px">${stepsHtml}</div>
    `;
  }

  return `
    <div class="go-card type-objective-${obj.type} ${obj.archived ? 'archived' : ''}">
      <div class="go-card-accent"></div>
      <div class="go-card-body">
        <div class="go-card-header">
          <div class="go-card-title">${escapeHtml(obj.name)}</div>
          <div class="go-card-badges">
            <span class="go-badge ${badgeClass}">${badgeLabel}</span>
            ${isComplete ? '<span class="go-badge go-badge-complete">Complete</span>' : ''}
            ${obj.archived ? '<span class="go-badge go-badge-archived">Archived</span>' : ''}
          </div>
        </div>
        ${obj.description ? `<div class="go-card-description">${escapeHtml(obj.description)}</div>` : ''}
        ${contentHtml}
        <div class="go-card-actions">
          <button class="btn btn-sm" onclick="openEditObjectiveModal('${obj.id}')">Edit</button>
          <button class="btn btn-sm" onclick="archiveObjective('${obj.id}')">${obj.archived ? 'Restore' : 'Archive'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteObjective('${obj.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;
}

// --- Daily Tracker Goals/Objectives Section ---
function renderDailyGoalsSection(date) {
  const activeGoals = AppState.goals.filter(g => !g.archived);
  const activeObjectives = AppState.objectives.filter(o => !o.archived);

  if (activeGoals.length === 0 && activeObjectives.length === 0) return '';

  let itemsHtml = '';

  // Render active goals
  activeGoals.forEach(goal => {
    const progress = getGoalProgress(goal);
    const isComplete = progress.pct === 100;
    const color = isComplete ? 'var(--accent-green)' : 'var(--accent-primary)';
    const pendingSteps = goal.steps.filter(s => !s.done);
    const completedSteps = goal.steps.filter(s => s.done);

    itemsHtml += `
      <div class="go-daily-item">
        <div class="go-daily-item-header">
          <div class="go-daily-item-name">
            <span class="go-badge go-badge-goal" style="font-size:0.58rem">Goal</span>
            ${escapeHtml(goal.name)}
          </div>
          <div class="go-daily-item-pct">${progress.done}/${progress.total} (${progress.pct}%)</div>
        </div>
        <div class="go-mini-progress">
          <div class="go-mini-progress-fill" style="width:${progress.pct}%;background:${color}"></div>
        </div>
        <div class="go-steps" style="margin-top:10px;margin-bottom:0">
          ${pendingSteps.map(step => `
            <div class="go-step" onclick="toggleGoalStep('${goal.id}','${step.id}');renderPage('today')">
              <div class="go-step-check">\u2713</div>
              <span class="go-step-text">${escapeHtml(step.text)}</span>
            </div>
          `).join('')}
          ${completedSteps.length > 0 && pendingSteps.length > 0 ? `
            <div style="font-size:0.72rem;color:var(--text-muted);padding:4px 0;cursor:pointer"
              onclick="var el=this.nextElementSibling;el.style.display=el.style.display==='none'?'flex':'none';this.textContent=el.style.display==='none'?'Show ${completedSteps.length} completed...':'Hide completed'">
              Show ${completedSteps.length} completed...
            </div>
            <div style="display:none;flex-direction:column;gap:4px">
              ${completedSteps.map(step => `
                <div class="go-step done" onclick="toggleGoalStep('${goal.id}','${step.id}');renderPage('today')">
                  <div class="go-step-check">\u2713</div>
                  <span class="go-step-text">${escapeHtml(step.text)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${completedSteps.length > 0 && pendingSteps.length === 0 ? `
            <div style="text-align:center;padding:8px;color:var(--accent-green);font-size:0.85rem;font-weight:600">\u2714 Goal complete!</div>
          ` : ''}
        </div>
      </div>
    `;
  });

  // Render active objectives
  activeObjectives.forEach(obj => {
    const progress = getObjectiveProgress(obj);
    const isComplete = progress.pct >= 100;
    const isValue = obj.type === 'value';
    const color = isComplete ? 'var(--accent-green)' : isValue ? 'var(--accent-orange)' : 'var(--accent-blue)';
    const badgeClass = isValue ? 'go-badge-obj-value' : 'go-badge-obj-list';
    const badgeLabel = isValue ? 'Value' : 'List';

    if (isValue) {
      const unit = obj.unit ? ` ${escapeHtml(obj.unit)}` : '';
      const todayEntry = obj.valueHistory.find(v => v.date === date);

      itemsHtml += `
        <div class="go-daily-item">
          <div class="go-daily-item-header">
            <div class="go-daily-item-name">
              <span class="go-badge ${badgeClass}" style="font-size:0.58rem">${badgeLabel}</span>
              ${escapeHtml(obj.name)}
            </div>
            <div class="go-daily-item-pct">${progress.done}${unit} / ${progress.total}${unit} (${progress.pct}%)</div>
          </div>
          <div class="go-mini-progress">
            <div class="go-mini-progress-fill" style="width:${progress.pct}%;background:${color}"></div>
          </div>
          <div class="go-value-input-row" style="margin-top:10px;margin-bottom:0">
            <div class="go-value-label">
              Add progress${todayEntry ? `<span class="go-value-progress-text">(today: +${todayEntry.amount}${unit})</span>` : ''}
            </div>
            <input type="number" class="go-value-input" id="go-val-${obj.id}" placeholder="0" min="0" step="any">
            <button class="go-value-add-btn" onclick="dailyAddObjectiveValue('${obj.id}','${date}')">Save</button>
          </div>
          ${isComplete ? '<div style="text-align:center;padding:6px;color:var(--accent-green);font-size:0.85rem;font-weight:600;margin-top:4px">\u2714 Objective reached!</div>' : ''}
        </div>
      `;
    } else {
      const pendingSteps = obj.steps.filter(s => !s.done);
      const completedSteps = obj.steps.filter(s => s.done);

      itemsHtml += `
        <div class="go-daily-item">
          <div class="go-daily-item-header">
            <div class="go-daily-item-name">
              <span class="go-badge ${badgeClass}" style="font-size:0.58rem">${badgeLabel}</span>
              ${escapeHtml(obj.name)}
            </div>
            <div class="go-daily-item-pct">${progress.done}/${progress.total} (${progress.pct}%)</div>
          </div>
          <div class="go-mini-progress">
            <div class="go-mini-progress-fill" style="width:${progress.pct}%;background:${color}"></div>
          </div>
          <div class="go-steps" style="margin-top:10px;margin-bottom:0">
            ${pendingSteps.map(step => `
              <div class="go-step" onclick="toggleObjectiveStep('${obj.id}','${step.id}');renderPage('today')">
                <div class="go-step-check">\u2713</div>
                <span class="go-step-text">${escapeHtml(step.text)}</span>
              </div>
            `).join('')}
            ${completedSteps.length > 0 && pendingSteps.length > 0 ? `
              <div style="font-size:0.72rem;color:var(--text-muted);padding:4px 0;cursor:pointer"
                onclick="var el=this.nextElementSibling;el.style.display=el.style.display==='none'?'flex':'none';this.textContent=el.style.display==='none'?'Show ${completedSteps.length} completed...':'Hide completed'">
                Show ${completedSteps.length} completed...
              </div>
              <div style="display:none;flex-direction:column;gap:4px">
                ${completedSteps.map(step => `
                  <div class="go-step done" onclick="toggleObjectiveStep('${obj.id}','${step.id}');renderPage('today')">
                    <div class="go-step-check">\u2713</div>
                    <span class="go-step-text">${escapeHtml(step.text)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${completedSteps.length > 0 && pendingSteps.length === 0 ? `
              <div style="text-align:center;padding:8px;color:var(--accent-green);font-size:0.85rem;font-weight:600">\u2714 Objective complete!</div>
            ` : ''}
          </div>
        </div>
      `;
    }
  });

  return `
    <div class="go-daily-section">
      <div class="card" style="margin-top:24px">
        <div class="card-header">
          <div class="card-title"><span class="icon">\uD83C\uDFAF</span> Goals & Objectives</div>
          <span style="font-size:0.78rem;color:var(--text-muted)">${activeGoals.length + activeObjectives.length} active</span>
        </div>
        <div class="go-daily-items scroll-inner" style="max-height:600px">
          ${itemsHtml}
        </div>
      </div>
    </div>
  `;
}

function dailyAddObjectiveValue(objId, date) {
  const input = document.getElementById('go-val-' + objId);
  if (!input) return;
  const val = parseFloat(input.value);
  if (isNaN(val) || val === 0) {
    showToast('Enter a valid number', 'warning');
    return;
  }
  addObjectiveValue(objId, val, date);
  showToast(`Added +${val} to objective`, 'success');
  renderPage('today');
}

// --- Create/Edit Goal Modal ---
function openCreateGoalModal() {
  const html = `
    <div class="modal-header">
      <div class="modal-title">Create New Goal</div>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Goal Name *</label>
        <input type="text" class="form-input" id="modal-goal-name" placeholder="e.g., Learn Piano">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-goal-desc" placeholder="Brief description (optional)">
      </div>
      <div class="form-group">
        <label class="form-label">Steps (what needs to be done)</label>
        <div class="go-form-steps" id="modal-goal-steps">
          <div class="go-form-step-row">
            <input type="text" class="form-input" placeholder="Step 1..." data-step>
            <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
          </div>
          <div class="go-form-step-row">
            <input type="text" class="form-input" placeholder="Step 2..." data-step>
            <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
          </div>
          <div class="go-form-step-row">
            <input type="text" class="form-input" placeholder="Step 3..." data-step>
            <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
          </div>
        </div>
        <button class="go-form-add-step" onclick="addModalStepRow('modal-goal-steps')">+ Add Step</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreateGoal()">Create Goal</button>
    </div>
  `;
  openModal(html);
}

function openEditGoalModal(goalId) {
  const goal = AppState.goals.find(g => g.id === goalId);
  if (!goal) return;

  const stepsHtml = goal.steps.map(step => `
    <div class="go-form-step-row">
      <input type="text" class="form-input" value="${escapeHtml(step.text)}" data-step data-done="${step.done}" data-done-date="${step.doneDate || ''}">
      <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
    </div>
  `).join('');

  const html = `
    <div class="modal-header">
      <div class="modal-title">Edit Goal</div>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Goal Name *</label>
        <input type="text" class="form-input" id="modal-goal-name" value="${escapeHtml(goal.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-goal-desc" value="${escapeHtml(goal.description)}">
      </div>
      <div class="form-group">
        <label class="form-label">Steps</label>
        <div class="go-form-steps" id="modal-goal-steps">${stepsHtml}</div>
        <button class="go-form-add-step" onclick="addModalStepRow('modal-goal-steps')">+ Add Step</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditGoal('${goal.id}')">Save Changes</button>
    </div>
  `;
  openModal(html);
}

function addModalStepRow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const count = container.querySelectorAll('.go-form-step-row').length + 1;
  const row = document.createElement('div');
  row.className = 'go-form-step-row';
  row.innerHTML = `
    <input type="text" class="form-input" placeholder="Step ${count}..." data-step>
    <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
  `;
  container.appendChild(row);
  row.querySelector('input').focus();
}

function submitCreateGoal() {
  const name = document.getElementById('modal-goal-name')?.value.trim();
  if (!name) { showToast('Please enter a goal name', 'warning'); return; }

  const desc = document.getElementById('modal-goal-desc')?.value.trim() || '';
  const stepInputs = document.querySelectorAll('#modal-goal-steps [data-step]');
  const steps = [];
  stepInputs.forEach(input => {
    const text = input.value.trim();
    if (text) steps.push(text);
  });

  if (steps.length === 0) { showToast('Add at least one step', 'warning'); return; }

  createGoal(name, desc, steps);
  closeModal();
  showToast('Goal "' + name + '" created!', 'success');
  renderPage('goals');
}

function submitEditGoal(goalId) {
  const goal = AppState.goals.find(g => g.id === goalId);
  if (!goal) return;

  const name = document.getElementById('modal-goal-name')?.value.trim();
  if (!name) { showToast('Please enter a goal name', 'warning'); return; }

  goal.name = name;
  goal.description = document.getElementById('modal-goal-desc')?.value.trim() || '';

  const stepInputs = document.querySelectorAll('#modal-goal-steps [data-step]');
  const newSteps = [];
  stepInputs.forEach((input, i) => {
    const text = input.value.trim();
    if (text) {
      newSteps.push({
        id: 's' + i,
        text,
        done: input.dataset.done === 'true',
        doneDate: input.dataset.doneDate || null,
      });
    }
  });

  if (newSteps.length === 0) { showToast('Add at least one step', 'warning'); return; }

  goal.steps = newSteps;
  saveToLocalStorage();
  closeModal();
  showToast('Goal updated', 'success');
  renderPage('goals');
}

// --- Create/Edit Objective Modal ---
let _modalObjType = 'list';

function openCreateObjectiveModal() {
  _modalObjType = 'list';
  const html = `
    <div class="modal-header">
      <div class="modal-title">Create New Objective</div>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Objective Name *</label>
        <input type="text" class="form-input" id="modal-obj-name" placeholder="e.g., No sweets for 30 days">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-obj-desc" placeholder="Brief description (optional)">
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <div class="go-type-selector" id="modal-obj-type-sel">
          <div class="go-type-option selected" onclick="selectObjType('list')" data-type="list">
            <div class="go-type-option-icon">\uD83D\uDCCB</div>
            <div class="go-type-option-label">List</div>
            <div class="go-type-option-desc">Checklist of steps</div>
          </div>
          <div class="go-type-option" onclick="selectObjType('value')" data-type="value">
            <div class="go-type-option-icon">\uD83D\uDCCA</div>
            <div class="go-type-option-label">Value</div>
            <div class="go-type-option-desc">Track number to a target</div>
          </div>
        </div>
      </div>
      <div id="modal-obj-list-fields">
        <div class="form-group">
          <label class="form-label">Steps</label>
          <div class="go-form-steps" id="modal-obj-steps">
            <div class="go-form-step-row">
              <input type="text" class="form-input" placeholder="Step 1..." data-step>
              <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
            </div>
            <div class="go-form-step-row">
              <input type="text" class="form-input" placeholder="Step 2..." data-step>
              <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
            </div>
          </div>
          <button class="go-form-add-step" onclick="addModalStepRow('modal-obj-steps')">+ Add Step</button>
        </div>
      </div>
      <div id="modal-obj-value-fields" style="display:none">
        <div class="form-group">
          <label class="form-label">Target Value *</label>
          <input type="number" class="form-input" id="modal-obj-target" placeholder="e.g., 30" min="1" step="any">
        </div>
        <div class="form-group">
          <label class="form-label">Unit (optional)</label>
          <input type="text" class="form-input" id="modal-obj-unit" placeholder="e.g., days, km, pages...">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreateObjective()">Create Objective</button>
    </div>
  `;
  openModal(html);
}

function selectObjType(type) {
  _modalObjType = type;
  document.querySelectorAll('#modal-obj-type-sel .go-type-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.type === type);
  });
  document.getElementById('modal-obj-list-fields').style.display = type === 'list' ? '' : 'none';
  document.getElementById('modal-obj-value-fields').style.display = type === 'value' ? '' : 'none';
}

function submitCreateObjective() {
  const name = document.getElementById('modal-obj-name')?.value.trim();
  if (!name) { showToast('Please enter an objective name', 'warning'); return; }

  const desc = document.getElementById('modal-obj-desc')?.value.trim() || '';

  if (_modalObjType === 'list') {
    const stepInputs = document.querySelectorAll('#modal-obj-steps [data-step]');
    const steps = [];
    stepInputs.forEach(input => {
      const text = input.value.trim();
      if (text) steps.push(text);
    });
    if (steps.length === 0) { showToast('Add at least one step', 'warning'); return; }
    createObjective(name, desc, 'list', steps, null, null);
  } else {
    const target = document.getElementById('modal-obj-target')?.value;
    if (!target || parseFloat(target) <= 0) { showToast('Enter a valid target value', 'warning'); return; }
    const unit = document.getElementById('modal-obj-unit')?.value.trim() || '';
    createObjective(name, desc, 'value', null, target, unit);
  }

  closeModal();
  showToast('Objective "' + name + '" created!', 'success');
  renderPage('goals');
}

function openEditObjectiveModal(objId) {
  const obj = AppState.objectives.find(o => o.id === objId);
  if (!obj) return;

  const isValue = obj.type === 'value';

  let fieldsHtml = '';
  if (isValue) {
    fieldsHtml = `
      <div class="form-group">
        <label class="form-label">Target Value</label>
        <input type="number" class="form-input" id="modal-obj-target" value="${obj.targetValue}" min="1" step="any">
      </div>
      <div class="form-group">
        <label class="form-label">Unit</label>
        <input type="text" class="form-input" id="modal-obj-unit" value="${escapeHtml(obj.unit || '')}">
      </div>
    `;
  } else {
    const stepsHtml = obj.steps.map(step => `
      <div class="go-form-step-row">
        <input type="text" class="form-input" value="${escapeHtml(step.text)}" data-step data-done="${step.done}" data-done-date="${step.doneDate || ''}">
        <button class="go-form-step-remove" onclick="this.parentElement.remove()" title="Remove">\u2715</button>
      </div>
    `).join('');
    fieldsHtml = `
      <div class="form-group">
        <label class="form-label">Steps</label>
        <div class="go-form-steps" id="modal-obj-steps">${stepsHtml}</div>
        <button class="go-form-add-step" onclick="addModalStepRow('modal-obj-steps')">+ Add Step</button>
      </div>
    `;
  }

  const html = `
    <div class="modal-header">
      <div class="modal-title">Edit Objective</div>
      <button class="modal-close" onclick="closeModal()">\u2715</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Objective Name *</label>
        <input type="text" class="form-input" id="modal-obj-name" value="${escapeHtml(obj.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-obj-desc" value="${escapeHtml(obj.description || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <div class="go-badge ${isValue ? 'go-badge-obj-value' : 'go-badge-obj-list'}" style="display:inline-block">${isValue ? 'Value' : 'List'}</div>
      </div>
      ${fieldsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditObjective('${obj.id}')">Save Changes</button>
    </div>
  `;
  openModal(html);
}

function submitEditObjective(objId) {
  const obj = AppState.objectives.find(o => o.id === objId);
  if (!obj) return;

  const name = document.getElementById('modal-obj-name')?.value.trim();
  if (!name) { showToast('Please enter an objective name', 'warning'); return; }

  obj.name = name;
  obj.description = document.getElementById('modal-obj-desc')?.value.trim() || '';

  if (obj.type === 'value') {
    const target = document.getElementById('modal-obj-target')?.value;
    if (target && parseFloat(target) > 0) {
      obj.targetValue = parseFloat(target);
    }
    obj.unit = document.getElementById('modal-obj-unit')?.value.trim() || '';
  } else {
    const stepInputs = document.querySelectorAll('#modal-obj-steps [data-step]');
    const newSteps = [];
    stepInputs.forEach((input, i) => {
      const text = input.value.trim();
      if (text) {
        newSteps.push({
          id: 's' + i,
          text,
          done: input.dataset.done === 'true',
          doneDate: input.dataset.doneDate || null,
        });
      }
    });
    if (newSteps.length === 0) { showToast('Add at least one step', 'warning'); return; }
    obj.steps = newSteps;
  }

  saveToLocalStorage();
  closeModal();
  showToast('Objective updated', 'success');
  renderPage('goals');
}


// ========== ANKI WORD COUNTER ==========

function calcAnkiStats() {
  const today = todayStr();
  const dates = Object.keys(AppState.history).sort();
  let totalWords = 0;
  let weekWords = 0;
  let monthWords = 0;
  let streak = 0;
  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);
  
  // Collect all anki entries
  const ankiEntries = [];
  dates.forEach(date => {
    const record = AppState.history[date];
    const ankiData = record.activities?.anki;
    if (ankiData && ankiData.done) {
      const words = parseAnkiWords(ankiData.detail);
      totalWords += words;
      ankiEntries.push({ date, words });
      if (date >= weekRange.start && date <= weekRange.end) weekWords += words;
      if (date >= monthRange.start && date <= monthRange.end) monthWords += words;
    }
  });

  // Calculate streak
  let checkDate = today;
  while (true) {
    const record = AppState.history[checkDate];
    if (record?.activities?.anki?.done) {
      streak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
    if (streak > 365) break;
  }

  const daysTracked = ankiEntries.length;
  const avgPerDay = daysTracked > 0 ? Math.round(totalWords / daysTracked) : 0;

  return { totalWords, weekWords, monthWords, streak, avgPerDay, entries: ankiEntries };
}

function parseAnkiWords(detail) {
  if (!detail) return 0;
  const match = detail.match(/(\d+)\s*(?:words?|palavras?|w)/i);
  if (match) return parseInt(match[1]);
  const numMatch = detail.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]);
  if (detail.toLowerCase() === 'done') return 0;
  return 0;
}

// ========== CALENDAR & EVENTS SYSTEM ==========

function renderCalendarPage() {
  const container = document.getElementById('page-calendar');
  const today = todayStr();
  const events = AppState.calendarEvents || [];
  
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sortedEvents.filter(e => e.date >= today);
  const past = sortedEvents.filter(e => e.date < today).reverse();

  const upcomingHtml = upcoming.length > 0 ? upcoming.map((evt, i) => {
    const daysUntil = daysBetween(today, evt.date);
    const urgencyClass = daysUntil <= 1 ? 'cal-urgent' : daysUntil <= 3 ? 'cal-soon' : daysUntil <= 7 ? 'cal-week' : '';
    const daysLabel = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`;
    return `
      <div class="cal-event ${urgencyClass}">
        <div class="cal-event-date">
          <div class="cal-event-day">${new Date(evt.date + 'T12:00:00').getDate()}</div>
          <div class="cal-event-month">${new Date(evt.date + 'T12:00:00').toLocaleDateString('en-US', {month:'short'})}</div>
        </div>
        <div class="cal-event-info">
          <div class="cal-event-title">${escapeHtml(evt.title)}</div>
          ${evt.description ? `<div class="cal-event-desc">${escapeHtml(evt.description)}</div>` : ''}
          ${evt.category ? `<span class="cal-event-cat">${escapeHtml(evt.category)}</span>` : ''}
        </div>
        <div class="cal-event-countdown">
          <div class="cal-event-days-num">${daysLabel}</div>
        </div>
        <div class="cal-event-actions">
          <button class="btn btn-sm" onclick="editCalendarEvent(${events.indexOf(evt)})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCalendarEvent(${events.indexOf(evt)})">✕</button>
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">No upcoming events</div></div>';

  const pastHtml = past.length > 0 ? past.slice(0, 20).map(evt => `
    <div class="cal-event cal-past">
      <div class="cal-event-date">
        <div class="cal-event-day">${new Date(evt.date + 'T12:00:00').getDate()}</div>
        <div class="cal-event-month">${new Date(evt.date + 'T12:00:00').toLocaleDateString('en-US', {month:'short'})}</div>
      </div>
      <div class="cal-event-info">
        <div class="cal-event-title">${escapeHtml(evt.title)}</div>
        ${evt.description ? `<div class="cal-event-desc">${escapeHtml(evt.description)}</div>` : ''}
      </div>
      <div class="cal-event-actions">
        <button class="btn btn-sm btn-danger" onclick="deleteCalendarEvent(${events.indexOf(evt)})">✕</button>
      </div>
    </div>
  `).join('') : '';

  // Mini calendar view for current month
  const miniCalHtml = renderMiniCalendar(today);

  container.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Upcoming</div>
        <div class="stat-value">${upcoming.length}</div>
        <div class="stat-sub">events ahead</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-orange)">
        <div class="stat-label">This Week</div>
        <div class="stat-value">${upcoming.filter(e => daysBetween(today, e.date) <= 7).length}</div>
        <div class="stat-sub">coming up soon</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-secondary)">
        <div class="stat-label">Urgent</div>
        <div class="stat-value">${upcoming.filter(e => daysBetween(today, e.date) <= 2).length}</div>
        <div class="stat-sub">within 2 days</div>
      </div>
    </div>

    <div class="go-filter-bar">
      <button class="btn btn-primary" onclick="openCreateEventModal()">+ New Event</button>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📅</span> Mini Calendar</div>
        </div>
        <div class="mini-calendar">${miniCalHtml}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🔔</span> Upcoming Events</div>
          <span style="font-size:0.78rem;color:var(--text-muted)">${upcoming.length} events</span>
        </div>
        <div class="cal-events-list scroll-inner" style="max-height:500px">${upcomingHtml}</div>
      </div>
    </div>

    ${past.length > 0 ? `
    <div class="card" style="margin-top:20px">
      <div class="card-header collapsible-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
        <div class="card-title"><span class="icon">📜</span> Past Events (${past.length})</div>
        <span style="font-size:0.78rem;color:var(--text-muted)">click to toggle</span>
      </div>
      <div style="display:none">
        <div class="cal-events-list" style="padding:0 24px 24px">${pastHtml}</div>
      </div>
    </div>` : ''}
  `;
}

function renderMiniCalendar(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const today = todayStr();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = AppState.calendarEvents || [];

  let html = '<div class="mini-cal-header">';
  ['S','M','T','W','T','F','S'].forEach(d => { html += `<div class="mini-cal-day-label">${d}</div>`; });
  html += '</div><div class="mini-cal-grid">';

  for (let i = 0; i < firstDay; i++) html += '<div class="mini-cal-cell empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateKey === today;
    const hasEvent = events.some(e => e.date === dateKey);
    const hasActivity = !!AppState.history[dateKey];
    html += `<div class="mini-cal-cell ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''} ${hasActivity ? 'has-activity' : ''}"
      onclick="jumpToDate('${dateKey}');renderPage('today')">${day}</div>`;
  }
  html += '</div>';
  return html;
}

function openCreateEventModal(prefillDate) {
  const html = `
    <div class="modal-header">
      <div class="modal-title">New Calendar Event</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" class="form-input" id="modal-evt-title" placeholder="e.g., Midterm Exam">
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" class="form-input" id="modal-evt-date" value="${prefillDate || todayStr()}">
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="modal-evt-category">
          <option value="">None</option>
          <option value="Exam">Exam</option>
          <option value="Deadline">Deadline</option>
          <option value="Meeting">Meeting</option>
          <option value="Event">Event</option>
          <option value="Personal">Personal</option>
          <option value="Work">Work</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-evt-desc" placeholder="Optional details...">
      </div>
      <div class="form-group">
        <label class="form-label">Notify days before</label>
        <input type="number" class="form-input" id="modal-evt-notify" value="3" min="0" max="30">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreateEvent()">Create Event</button>
    </div>
  `;
  openModal(html);
}

function submitCreateEvent() {
  const title = document.getElementById('modal-evt-title')?.value.trim();
  const date = document.getElementById('modal-evt-date')?.value;
  const category = document.getElementById('modal-evt-category')?.value || '';
  const description = document.getElementById('modal-evt-desc')?.value.trim() || '';
  const notifyDays = parseInt(document.getElementById('modal-evt-notify')?.value) || 3;

  if (!title) { showToast('Enter an event title', 'warning'); return; }
  if (!date) { showToast('Select a date', 'warning'); return; }

  if (!AppState.calendarEvents) AppState.calendarEvents = [];
  AppState.calendarEvents.push({
    id: generateId('evt'),
    title, date, category, description, notifyDays, createdAt: todayStr()
  });
  saveToLocalStorage();
  closeModal();
  showToast(`Event "${title}" created`, 'success');
  renderPage('calendar');
}

function editCalendarEvent(index) {
  const evt = AppState.calendarEvents[index];
  if (!evt) return;
  const html = `
    <div class="modal-header">
      <div class="modal-title">Edit Event</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" class="form-input" id="modal-evt-title" value="${escapeHtml(evt.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input type="date" class="form-input" id="modal-evt-date" value="${evt.date}">
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="modal-evt-category">
          <option value="" ${!evt.category ? 'selected' : ''}>None</option>
          <option value="Exam" ${evt.category === 'Exam' ? 'selected' : ''}>Exam</option>
          <option value="Deadline" ${evt.category === 'Deadline' ? 'selected' : ''}>Deadline</option>
          <option value="Meeting" ${evt.category === 'Meeting' ? 'selected' : ''}>Meeting</option>
          <option value="Event" ${evt.category === 'Event' ? 'selected' : ''}>Event</option>
          <option value="Personal" ${evt.category === 'Personal' ? 'selected' : ''}>Personal</option>
          <option value="Work" ${evt.category === 'Work' ? 'selected' : ''}>Work</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-evt-desc" value="${escapeHtml(evt.description || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Notify days before</label>
        <input type="number" class="form-input" id="modal-evt-notify" value="${evt.notifyDays || 3}" min="0" max="30">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditEvent(${index})">Save</button>
    </div>
  `;
  openModal(html);
}

function submitEditEvent(index) {
  const title = document.getElementById('modal-evt-title')?.value.trim();
  const date = document.getElementById('modal-evt-date')?.value;
  if (!title || !date) { showToast('Title and date required', 'warning'); return; }

  AppState.calendarEvents[index].title = title;
  AppState.calendarEvents[index].date = date;
  AppState.calendarEvents[index].category = document.getElementById('modal-evt-category')?.value || '';
  AppState.calendarEvents[index].description = document.getElementById('modal-evt-desc')?.value.trim() || '';
  AppState.calendarEvents[index].notifyDays = parseInt(document.getElementById('modal-evt-notify')?.value) || 3;
  saveToLocalStorage();
  closeModal();
  showToast('Event updated', 'success');
  renderPage('calendar');
}

function deleteCalendarEvent(index) {
  if (!confirm('Delete this event?')) return;
  AppState.calendarEvents.splice(index, 1);
  saveToLocalStorage();
  showToast('Event deleted', 'warning');
  renderPage('calendar');
}

function checkCalendarNotifications() {
  const today = todayStr();
  const events = AppState.calendarEvents || [];
  const notifications = [];

  events.forEach(evt => {
    if (evt.date < today) return; // past events
    const daysUntil = daysBetween(today, evt.date);
    const notifyDays = evt.notifyDays || 3;
    if (daysUntil <= notifyDays) {
      notifications.push({
        title: evt.title,
        date: evt.date,
        daysUntil,
        category: evt.category || '',
        description: evt.description || '',
      });
    }
  });

  if (notifications.length > 0) {
    showCalendarPopup(notifications);
  }
}

function showCalendarPopup(notifications) {
  const itemsHtml = notifications.map(n => {
    const urgency = n.daysUntil === 0 ? 'cal-popup-today' : n.daysUntil <= 1 ? 'cal-popup-tomorrow' : 'cal-popup-soon';
    const daysText = n.daysUntil === 0 ? '🔴 TODAY' : n.daysUntil === 1 ? '🟡 Tomorrow' : `📅 ${n.daysUntil} days`;
    return `
      <div class="cal-popup-item ${urgency}">
        <div class="cal-popup-item-header">
          <strong>${escapeHtml(n.title)}</strong>
          <span class="cal-popup-days">${daysText}</span>
        </div>
        <div class="cal-popup-item-meta">
          ${formatDate(n.date)}${n.category ? ` · ${n.category}` : ''}
        </div>
        ${n.description ? `<div class="cal-popup-item-desc">${escapeHtml(n.description)}</div>` : ''}
      </div>
    `;
  }).join('');

  const html = `
    <div class="modal-header" style="border-bottom-color:var(--accent-orange)">
      <div class="modal-title">🔔 Upcoming Events</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">
        You have ${notifications.length} event${notifications.length > 1 ? 's' : ''} coming up soon:
      </p>
      <div class="cal-popup-list">${itemsHtml}</div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Dismiss</button>
      <button class="btn btn-primary" onclick="closeModal();renderPage('calendar')">View Calendar</button>
    </div>
  `;
  openModal(html);
}

// ========== PROGRESS TRACKERS SYSTEM ==========

function renderTrackersPage() {
  const container = document.getElementById('page-trackers');
  const trackers = AppState.trackers || [];
  const active = trackers.filter(t => !t.archived);
  const archived = trackers.filter(t => t.archived);

  const trackersHtml = active.length > 0 ? active.map((t, idx) => renderTrackerCard(t, trackers.indexOf(t))).join('') :
    '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No trackers yet. Create one to visualize your progress!</div></div>';

  container.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Active Trackers</div>
        <div class="stat-value">${active.length}</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Completed</div>
        <div class="stat-value">${active.filter(t => (t.currentValue || 0) >= (t.targetValue || 1)).length}</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Archived</div>
        <div class="stat-value">${archived.length}</div>
      </div>
    </div>

    <div class="go-filter-bar">
      <button class="btn btn-primary" onclick="openCreateTrackerModal()">+ New Tracker</button>
    </div>

    <div class="go-grid">${trackersHtml}</div>

    ${archived.length > 0 ? `
    <div class="card" style="margin-top:24px">
      <div class="card-header collapsible-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
        <div class="card-title"><span class="icon">📦</span> Archived (${archived.length})</div>
        <span style="font-size:0.78rem;color:var(--text-muted)">click to toggle</span>
      </div>
      <div style="display:none"><div class="go-grid" style="padding:16px 24px">
        ${archived.map((t, i) => renderTrackerCard(t, trackers.indexOf(t))).join('')}
      </div></div>
    </div>` : ''}
  `;
}

function renderTrackerCard(tracker, index) {
  const current = tracker.currentValue || 0;
  const target = tracker.targetValue || 1;
  const pct = Math.min(100, Math.round((current / target) * 100));
  const isComplete = pct >= 100;
  const color = isComplete ? 'var(--accent-green)' : 'var(--accent-orange)';
  const unit = tracker.unit ? ` ${escapeHtml(tracker.unit)}` : '';
  const remaining = Math.max(0, target - current);

  return `
    <div class="go-card type-tracker ${tracker.archived ? 'archived' : ''}">
      <div class="go-card-accent" style="background:${color}"></div>
      <div class="go-card-body">
        <div class="go-card-header">
          <div class="go-card-title">${escapeHtml(tracker.name)}</div>
          <div class="go-card-badges">
            <span class="go-badge" style="background:var(--accent-orange-dim);color:var(--accent-orange)">Tracker</span>
            ${isComplete ? '<span class="go-badge go-badge-complete">Complete</span>' : ''}
          </div>
        </div>
        ${tracker.description ? `<div class="go-card-description">${escapeHtml(tracker.description)}</div>` : ''}
        <div class="go-progress-ring-wrapper">
          ${renderProgressRing(pct, color)}
          <div class="go-progress-info">
            <div class="go-progress-main">${current}${unit} / ${target}${unit}</div>
            <div class="go-progress-sub">${remaining > 0 ? `${remaining}${unit} remaining` : 'Complete!'}</div>
          </div>
        </div>
        ${!tracker.archived ? `
        <div class="go-value-input-row" style="margin-top:10px">
          <div class="go-value-label">Update progress</div>
          <input type="number" class="go-value-input" id="tracker-val-${index}" placeholder="0" step="any">
          <button class="go-value-add-btn" onclick="addTrackerValue(${index})">+ Add</button>
          <button class="go-value-add-btn" style="background:var(--accent-blue)" onclick="setTrackerValue(${index})">= Set</button>
        </div>` : ''}
        ${tracker.history && tracker.history.length > 0 ? `
          <div class="go-value-history">
            ${tracker.history.slice().reverse().slice(0, 8).map((entry, revIdx) => {
              const unit2 = tracker.unit ? ` ${escapeHtml(tracker.unit)}` : '';
              return `<div class="go-value-history-entry">
                <span class="date">${formatDateShort(entry.date)}</span>
                <span class="amount">${entry.type === 'set' ? '=' : '+'}${entry.amount}${unit2}</span>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
        <div class="go-card-actions">
          <button class="btn btn-sm" onclick="editTracker(${index})">Edit</button>
          <button class="btn btn-sm" onclick="archiveTracker(${index})">${tracker.archived ? 'Restore' : 'Archive'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTracker(${index})">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderDailyTrackersSection() {
  const trackers = (AppState.trackers || []).filter(t => !t.archived);
  if (trackers.length === 0) return '';

  const html = trackers.map(t => {
    const pct = Math.min(100, Math.round(((t.currentValue||0) / (t.targetValue||1)) * 100));
    const unit = t.unit ? ` ${escapeHtml(t.unit)}` : '';
    const color = pct >= 100 ? 'var(--accent-green)' : 'var(--accent-orange)';
    return `
      <div class="go-daily-item">
        <div class="go-daily-item-header">
          <div class="go-daily-item-name">
            <span class="go-badge" style="background:var(--accent-orange-dim);color:var(--accent-orange);font-size:0.58rem">Tracker</span>
            ${escapeHtml(t.name)}
          </div>
          <div class="go-daily-item-pct">${t.currentValue||0}${unit} / ${t.targetValue}${unit} (${pct}%)</div>
        </div>
        <div class="go-mini-progress">
          <div class="go-mini-progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card" style="margin-top:24px">
      <div class="card-header">
        <div class="card-title"><span class="icon">📊</span> Trackers</div>
        <span style="font-size:0.78rem;color:var(--text-muted);cursor:pointer" onclick="renderPage('trackers')">View All →</span>
      </div>
      <div class="go-daily-items">${html}</div>
    </div>
  `;
}

function openCreateTrackerModal() {
  const html = `
    <div class="modal-header">
      <div class="modal-title">New Progress Tracker</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input type="text" class="form-input" id="modal-trk-name" placeholder="e.g., Three Body Problem (book)">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-trk-desc" placeholder="Optional description">
      </div>
      <div class="form-group">
        <label class="form-label">Target Value *</label>
        <input type="number" class="form-input" id="modal-trk-target" placeholder="e.g., 400" min="1" step="any">
      </div>
      <div class="form-group">
        <label class="form-label">Current Value</label>
        <input type="number" class="form-input" id="modal-trk-current" placeholder="0" min="0" step="any" value="0">
      </div>
      <div class="form-group">
        <label class="form-label">Unit</label>
        <input type="text" class="form-input" id="modal-trk-unit" placeholder="e.g., pages, R$, km...">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreateTracker()">Create</button>
    </div>
  `;
  openModal(html);
}

function submitCreateTracker() {
  const name = document.getElementById('modal-trk-name')?.value.trim();
  const target = parseFloat(document.getElementById('modal-trk-target')?.value);
  if (!name) { showToast('Enter a name', 'warning'); return; }
  if (!target || target <= 0) { showToast('Enter a valid target', 'warning'); return; }

  const current = parseFloat(document.getElementById('modal-trk-current')?.value) || 0;
  const tracker = {
    id: generateId('trk'),
    name,
    description: document.getElementById('modal-trk-desc')?.value.trim() || '',
    targetValue: target,
    currentValue: current,
    unit: document.getElementById('modal-trk-unit')?.value.trim() || '',
    history: current > 0 ? [{ date: todayStr(), amount: current, type: 'set' }] : [],
    archived: false,
    createdAt: todayStr(),
  };

  if (!AppState.trackers) AppState.trackers = [];
  AppState.trackers.push(tracker);
  saveToLocalStorage();
  closeModal();
  showToast(`Tracker "${name}" created`, 'success');
  renderPage('trackers');
}

function addTrackerValue(index) {
  const input = document.getElementById('tracker-val-' + index);
  if (!input) return;
  const val = parseFloat(input.value);
  if (isNaN(val) || val === 0) { showToast('Enter a valid number', 'warning'); return; }
  const t = AppState.trackers[index];
  t.currentValue = (t.currentValue || 0) + val;
  if (!t.history) t.history = [];
  t.history.push({ date: todayStr(), amount: val, type: 'add' });
  saveToLocalStorage();
  showToast(`Added +${val} to ${t.name}`, 'success');
  renderPage(AppState.currentPage);
}

function setTrackerValue(index) {
  const input = document.getElementById('tracker-val-' + index);
  if (!input) return;
  const val = parseFloat(input.value);
  if (isNaN(val)) { showToast('Enter a valid number', 'warning'); return; }
  const t = AppState.trackers[index];
  t.currentValue = val;
  if (!t.history) t.history = [];
  t.history.push({ date: todayStr(), amount: val, type: 'set' });
  saveToLocalStorage();
  showToast(`Set ${t.name} to ${val}`, 'success');
  renderPage(AppState.currentPage);
}

function editTracker(index) {
  const t = AppState.trackers[index];
  if (!t) return;
  const html = `
    <div class="modal-header">
      <div class="modal-title">Edit Tracker</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input type="text" class="form-input" id="modal-trk-name" value="${escapeHtml(t.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="modal-trk-desc" value="${escapeHtml(t.description || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Target Value</label>
        <input type="number" class="form-input" id="modal-trk-target" value="${t.targetValue}" min="1" step="any">
      </div>
      <div class="form-group">
        <label class="form-label">Unit</label>
        <input type="text" class="form-input" id="modal-trk-unit" value="${escapeHtml(t.unit || '')}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditTracker(${index})">Save</button>
    </div>
  `;
  openModal(html);
}

function submitEditTracker(index) {
  const t = AppState.trackers[index];
  const name = document.getElementById('modal-trk-name')?.value.trim();
  if (!name) { showToast('Enter a name', 'warning'); return; }
  t.name = name;
  t.description = document.getElementById('modal-trk-desc')?.value.trim() || '';
  const target = parseFloat(document.getElementById('modal-trk-target')?.value);
  if (target && target > 0) t.targetValue = target;
  t.unit = document.getElementById('modal-trk-unit')?.value.trim() || '';
  saveToLocalStorage();
  closeModal();
  showToast('Tracker updated', 'success');
  renderPage(AppState.currentPage);
}

function archiveTracker(index) {
  AppState.trackers[index].archived = !AppState.trackers[index].archived;
  saveToLocalStorage();
  renderPage(AppState.currentPage);
}

function deleteTracker(index) {
  if (!confirm('Delete this tracker?')) return;
  AppState.trackers.splice(index, 1);
  saveToLocalStorage();
  showToast('Tracker deleted', 'warning');
  renderPage(AppState.currentPage);
}

// ========== POMODORO / STUDY MODE ==========

let _pomodoroState = {
  running: false,
  paused: false,
  phase: 'work', // 'work', 'short_break', 'long_break'
  cycle: 1,
  timeRemaining: 0, // seconds
  intervalId: null,
  subject: '',
  totalWorkSeconds: 0,
  sessionsCompleted: 0,
};

function renderPomodoroPage() {
  const container = document.getElementById('page-pomodoro');
  const cfg = AppState.pomodoroConfig;
  const state = _pomodoroState;

  const phaseLabels = { work: 'Focus Time', short_break: 'Short Break', long_break: 'Long Break' };
  const phaseColors = { work: 'var(--accent-primary)', short_break: 'var(--accent-green)', long_break: 'var(--accent-blue)' };
  
  const mins = Math.floor(state.timeRemaining / 60);
  const secs = state.timeRemaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  const totalPhaseTime = state.phase === 'work' ? cfg.workMinutes * 60 :
    state.phase === 'short_break' ? cfg.shortBreakMinutes * 60 : cfg.longBreakMinutes * 60;
  const progressPct = totalPhaseTime > 0 ? Math.round(((totalPhaseTime - state.timeRemaining) / totalPhaseTime) * 100) : 0;

  // History stats
  const todayHistory = (AppState.pomodoroHistory || []).filter(h => h.date === todayStr());
  const todayCycles = todayHistory.reduce((s, h) => s + (h.cycles || 0), 0);
  const todayMinutes = todayHistory.reduce((s, h) => s + (h.totalMinutes || 0), 0);
  const weekRange = getWeekRange(todayStr());
  const weekHistory = (AppState.pomodoroHistory || []).filter(h => h.date >= weekRange.start && h.date <= weekRange.end);
  const weekMinutes = weekHistory.reduce((s, h) => s + (h.totalMinutes || 0), 0);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Today</div>
        <div class="stat-value">${todayMinutes}m</div>
        <div class="stat-sub">${todayCycles} cycles</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">This Week</div>
        <div class="stat-value">${weekMinutes}m</div>
        <div class="stat-sub">study time</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Current Cycle</div>
        <div class="stat-value">${state.cycle}/${cfg.cyclesBeforeLong}</div>
        <div class="stat-sub">before long break</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-orange)">
        <div class="stat-label">Session</div>
        <div class="stat-value">${state.sessionsCompleted}</div>
        <div class="stat-sub">cycles completed</div>
      </div>
    </div>

    <div class="pomodoro-container">
      <div class="pomodoro-phase-label" style="color:${phaseColors[state.phase]}">${phaseLabels[state.phase]}</div>
      
      <div class="pomodoro-timer-ring" style="--pom-color:${phaseColors[state.phase]};--pom-progress:${progressPct}%">
        <div class="pomodoro-timer-display">${timeStr}</div>
      </div>

      <div class="pomodoro-cycles">
        ${Array.from({length: cfg.cyclesBeforeLong}, (_, i) => 
          `<div class="pom-cycle-dot ${i < state.cycle - 1 || (i === state.cycle - 1 && state.phase !== 'work') ? 'filled' : i === state.cycle - 1 ? 'active' : ''}"></div>`
        ).join('')}
      </div>

      <div class="form-group" style="max-width:300px;margin:16px auto">
        <input type="text" class="form-input" id="pom-subject" placeholder="What are you studying?" 
          value="${escapeHtml(state.subject)}" onchange="_pomodoroState.subject=this.value"
          style="text-align:center">
      </div>

      <div class="pomodoro-controls">
        ${!state.running ? `
          <button class="btn btn-primary pom-btn-main" onclick="pomodoroStart()">▶ Start</button>
        ` : state.paused ? `
          <button class="btn btn-primary pom-btn-main" onclick="pomodoroResume()">▶ Resume</button>
        ` : `
          <button class="btn pom-btn-main" onclick="pomodoroPause()">⏸ Pause</button>
        `}
        <button class="btn" onclick="pomodoroSkip()">⏭ Skip</button>
        <button class="btn btn-danger" onclick="pomodoroReset()">⟲ Reset</button>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-top:32px">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">⚙️</span> Timer Settings</div>
        </div>
        <div style="padding:0 24px 24px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Focus (min)</label>
            <input type="number" class="form-input" value="${cfg.workMinutes}" min="1" max="120" 
              onchange="updatePomodoroConfig('workMinutes', this.value)">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Short Break (min)</label>
            <input type="number" class="form-input" value="${cfg.shortBreakMinutes}" min="1" max="30" 
              onchange="updatePomodoroConfig('shortBreakMinutes', this.value)">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Long Break (min)</label>
            <input type="number" class="form-input" value="${cfg.longBreakMinutes}" min="5" max="60" 
              onchange="updatePomodoroConfig('longBreakMinutes', this.value)">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Cycles before long break</label>
            <input type="number" class="form-input" value="${cfg.cyclesBeforeLong}" min="1" max="10" 
              onchange="updatePomodoroConfig('cyclesBeforeLong', this.value)">
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📜</span> Today's Sessions</div>
        </div>
        <div class="scroll-inner" style="max-height:300px;padding:0 24px 24px">
          ${todayHistory.length > 0 ? todayHistory.reverse().map(h => `
            <div class="pom-history-entry">
              <span class="pom-hist-subject">${escapeHtml(h.subject || 'Untitled')}</span>
              <span class="pom-hist-stats">${h.cycles} cycle${h.cycles > 1 ? 's' : ''} · ${h.totalMinutes}min</span>
            </div>
          `).join('') : '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No sessions today</div></div>'}
        </div>
      </div>
    </div>
  `;
}

function updatePomodoroConfig(key, value) {
  const val = parseInt(value);
  if (isNaN(val) || val <= 0) return;
  AppState.pomodoroConfig[key] = val;
  saveToLocalStorage();
  if (!_pomodoroState.running) {
    _pomodoroState.timeRemaining = AppState.pomodoroConfig.workMinutes * 60;
  }
  showToast('Timer settings updated', 'success');
}

function pomodoroStart() {
  const cfg = AppState.pomodoroConfig;
  _pomodoroState.running = true;
  _pomodoroState.paused = false;
  _pomodoroState.phase = 'work';
  _pomodoroState.timeRemaining = cfg.workMinutes * 60;
  _pomodoroState.totalWorkSeconds = 0;
  _pomodoroState.subject = document.getElementById('pom-subject')?.value || '';
  
  // Request notification permission for background alerts
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  pomodoroTick();
  _pomodoroState.intervalId = setInterval(pomodoroTick, 1000);
  renderPomodoroPage();
}

function pomodoroPause() {
  _pomodoroState.paused = true;
  if (_pomodoroState.intervalId) clearInterval(_pomodoroState.intervalId);
  renderPomodoroPage();
}

function pomodoroResume() {
  _pomodoroState.paused = false;
  _pomodoroState.intervalId = setInterval(pomodoroTick, 1000);
  renderPomodoroPage();
}

function pomodoroSkip() {
  pomodoroPhaseComplete();
}

function pomodoroReset() {
  if (_pomodoroState.intervalId) clearInterval(_pomodoroState.intervalId);
  
  // Save session if any work was done
  if (_pomodoroState.totalWorkSeconds > 60) {
    savePomodoroSession();
  }
  
  // Restore document title
  document.title = 'Life Dashboard — Activity & Study Tracker';
  
  // Restore nav text
  const navPom = document.querySelector('.nav-item[data-page="pomodoro"] span:last-child');
  if (navPom) navPom.textContent = 'Study Mode';
  
  _pomodoroState = {
    running: false, paused: false, phase: 'work', cycle: 1,
    timeRemaining: AppState.pomodoroConfig.workMinutes * 60,
    intervalId: null, subject: '', totalWorkSeconds: 0, sessionsCompleted: 0,
  };
  renderPomodoroPage();
}

function pomodoroTick() {
  if (_pomodoroState.timeRemaining > 0) {
    _pomodoroState.timeRemaining--;
    if (_pomodoroState.phase === 'work') {
      _pomodoroState.totalWorkSeconds++;
    }
    // Update display without full re-render (only if elements exist)
    const timerEl = document.querySelector('.pomodoro-timer-display');
    if (timerEl) {
      const mins = Math.floor(_pomodoroState.timeRemaining / 60);
      const secs = _pomodoroState.timeRemaining % 60;
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    // Update progress ring
    const cfg = AppState.pomodoroConfig;
    const totalPhaseTime = _pomodoroState.phase === 'work' ? cfg.workMinutes * 60 :
      _pomodoroState.phase === 'short_break' ? cfg.shortBreakMinutes * 60 : cfg.longBreakMinutes * 60;
    const pct = Math.round(((totalPhaseTime - _pomodoroState.timeRemaining) / totalPhaseTime) * 100);
    const ring = document.querySelector('.pomodoro-timer-ring');
    if (ring) ring.style.setProperty('--pom-progress', pct + '%');
    
    // Update document title with timer when running (background support)
    const mins2 = Math.floor(_pomodoroState.timeRemaining / 60);
    const secs2 = _pomodoroState.timeRemaining % 60;
    const phaseEmoji = _pomodoroState.phase === 'work' ? '🎯' : '☕';
    document.title = `${phaseEmoji} ${String(mins2).padStart(2, '0')}:${String(secs2).padStart(2, '0')} — Life Dashboard`;
    
    // Update nav indicator so user sees timer on any page
    const navPom = document.querySelector('.nav-item[data-page="pomodoro"] span:last-child');
    if (navPom) {
      navPom.textContent = `Study Mode ${String(mins2).padStart(2,'0')}:${String(secs2).padStart(2,'0')}`;
    }
  } else {
    pomodoroPhaseComplete();
  }
}

function playPomodoroSound(isWorkDone) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    
    if (isWorkDone) {
      // Triple ascending chime for end of work session
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, now + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.6);
        osc.start(now + i * 0.25);
        osc.stop(now + i * 0.25 + 0.6);
      });
      // Second wave (repeat for emphasis)
      setTimeout(() => {
        try {
          const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
          const n = ctx2.currentTime;
          [783.99, 987.77, 1046.50].forEach((freq, i) => {
            const osc = ctx2.createOscillator();
            const gain = ctx2.createGain();
            osc.connect(gain);
            gain.connect(ctx2.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, n + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, n + i * 0.2 + 0.5);
            osc.start(n + i * 0.2);
            osc.stop(n + i * 0.2 + 0.5);
          });
        } catch(e) {}
      }, 900);
    } else {
      // Two-tone bell for break end
      [440, 554.37, 440].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, now + i * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.4);
        osc.start(now + i * 0.3);
        osc.stop(now + i * 0.3 + 0.4);
      });
    }
  } catch(e) {}
  
  // Also fire a browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = isWorkDone ? '☕ Break Time!' : '🎯 Focus Time!';
    const body = isWorkDone ? 'Great work! Take a break.' : 'Break is over. Let\'s focus!';
    new Notification(title, { body, icon: '🍅' });
  }
}

function pomodoroPhaseComplete() {
  if (_pomodoroState.intervalId) clearInterval(_pomodoroState.intervalId);
  const cfg = AppState.pomodoroConfig;
  
  const isWorkPhaseEnding = _pomodoroState.phase === 'work';
  
  // Play improved notification sound
  playPomodoroSound(isWorkPhaseEnding);

  if (_pomodoroState.phase === 'work') {
    _pomodoroState.sessionsCompleted++;
    
    if (_pomodoroState.cycle >= cfg.cyclesBeforeLong) {
      // Long break
      _pomodoroState.phase = 'long_break';
      _pomodoroState.timeRemaining = cfg.longBreakMinutes * 60;
      _pomodoroState.cycle = 1;
      showToast('🎉 Long break time! Great work!', 'success');
    } else {
      // Short break
      _pomodoroState.phase = 'short_break';
      _pomodoroState.timeRemaining = cfg.shortBreakMinutes * 60;
      showToast('☕ Short break! Relax for a moment.', 'info');
    }
  } else {
    // Break is over, back to work
    if (_pomodoroState.phase === 'short_break') {
      _pomodoroState.cycle++;
    }
    _pomodoroState.phase = 'work';
    _pomodoroState.timeRemaining = cfg.workMinutes * 60;
    showToast('🎯 Focus time! Let\'s go!', 'info');
  }
  
  _pomodoroState.intervalId = setInterval(pomodoroTick, 1000);
  renderPomodoroPage();
}

function savePomodoroSession() {
  const totalMinutes = Math.round(_pomodoroState.totalWorkSeconds / 60);
  if (totalMinutes < 1) return;

  if (!AppState.pomodoroHistory) AppState.pomodoroHistory = [];
  AppState.pomodoroHistory.push({
    date: todayStr(),
    subject: _pomodoroState.subject || 'General',
    cycles: _pomodoroState.sessionsCompleted,
    totalMinutes,
  });
  saveToLocalStorage();
}

// ========== HABIT CONTROL (Vices & Bad Habits Tracker) ==========

let _habitsCalMonth = new Date().getMonth();
let _habitsCalYear = new Date().getFullYear();

function renderHabitsPage() {
  const container = document.getElementById('page-habits');
  const today = todayStr();
  const habits = AppState.habits || [];
  const log = AppState.habitsLog || {};

  // Calculate stats
  const last7 = [];
  const last14_first7 = [];
  for (let i = 0; i < 7; i++) last7.push(addDays(today, -i));
  for (let i = 7; i < 14; i++) last14_first7.push(addDays(today, -i));
  
  let thisWeekFails = 0, lastWeekFails = 0;
  let thisWeekClean = 0, lastWeekClean = 0;
  
  last7.forEach(d => {
    const dayLog = log[d] || {};
    habits.forEach(h => {
      if (dayLog[h.id]?.failed) thisWeekFails++;
      else thisWeekClean++;
    });
  });
  
  last14_first7.forEach(d => {
    const dayLog = log[d] || {};
    habits.forEach(h => {
      if (dayLog[h.id]?.failed) lastWeekFails++;
      else lastWeekClean++;
    });
  });

  // Current streak (days with zero failures)
  let cleanStreak = 0;
  let checkDate = today;
  while (cleanStreak < 365) {
    const dayLog = log[checkDate] || {};
    const anyFail = habits.some(h => dayLog[h.id]?.failed);
    if (anyFail) break;
    // Only count if there's at least some history or it's today
    if (checkDate === today || Object.keys(dayLog).length > 0 || AppState.history[checkDate]) {
      cleanStreak++;
    } else {
      break;
    }
    checkDate = addDays(checkDate, -1);
  }

  // Calendar HTML
  const calHtml = renderHabitsCalendar(_habitsCalYear, _habitsCalMonth, habits, log);

  // Today's habit status
  const todayLog = log[today] || {};
  const todayStatusHtml = habits.length > 0 ? habits.map(h => {
    const failed = todayLog[h.id]?.failed || false;
    const note = todayLog[h.id]?.note || '';
    return `
      <div class="habit-today-item ${failed ? 'failed' : 'clean'}">
        <div class="habit-today-left">
          <span class="habit-today-icon">${h.icon || '🚫'}</span>
          <span class="habit-today-name">${escapeHtml(h.name)}</span>
        </div>
        <div class="habit-today-right">
          <button class="btn btn-sm ${failed ? 'habit-btn-failed' : 'habit-btn-clean'}" 
            onclick="toggleHabitFail('${h.id}', '${today}')">
            ${failed ? '❌ Failed' : '✅ Clean'}
          </button>
          <input type="text" class="form-input habit-note-input" placeholder="note..." 
            value="${escapeHtml(note)}" 
            onchange="updateHabitNote('${h.id}', '${today}', this.value)">
        </div>
      </div>
    `;
  }).join('') : '<div class="empty-state"><div class="empty-state-icon">🛡️</div><div class="empty-state-text">No habits tracked yet. Add one below.</div></div>';

  // AI Analysis
  const analysisHtml = generateHabitsAnalysis(habits, log, today);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Clean Streak</div>
        <div class="stat-value">${cleanStreak}d</div>
        <div class="stat-sub">zero-failure days</div>
      </div>
      <div class="stat-card" style="--stat-color: ${thisWeekFails <= lastWeekFails ? 'var(--accent-green)' : 'var(--accent-secondary)'}">
        <div class="stat-label">This Week</div>
        <div class="stat-value">${thisWeekFails}</div>
        <div class="stat-sub">failures (last 7d)</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Last Week</div>
        <div class="stat-value">${lastWeekFails}</div>
        <div class="stat-sub">failures (prev 7d)</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Tracked</div>
        <div class="stat-value">${habits.length}</div>
        <div class="stat-sub">habits monitored</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title"><span class="icon">📋</span> Today — ${formatDate(today)}</div>
      </div>
      <div class="habit-today-list">
        ${todayStatusHtml}
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📅</span> Habit Calendar</div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-sm" onclick="habitsCalNav(-1)">◀</button>
            <span style="font-size:0.85rem;min-width:100px;text-align:center" id="habits-cal-label">
              ${new Date(_habitsCalYear, _habitsCalMonth).toLocaleDateString('en-US', {month:'long', year:'numeric'})}
            </span>
            <button class="btn btn-sm" onclick="habitsCalNav(1)">▶</button>
          </div>
        </div>
        <div class="habits-calendar">${calHtml}</div>
        <div style="padding:8px 24px 16px;display:flex;gap:16px;font-size:0.75rem;color:var(--text-muted)">
          <span><span class="habit-legend-dot clean-dot"></span> Clean day</span>
          <span><span class="habit-legend-dot fail-dot"></span> Failure logged</span>
          <span><span class="habit-legend-dot partial-dot"></span> Partial fail</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🧠</span> Intelligent Analysis</div>
        </div>
        <div class="habits-analysis scroll-inner" style="max-height:420px;padding:0 24px 24px">
          ${analysisHtml}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <div class="card-title"><span class="icon">⚙️</span> Manage Habits</div>
      </div>
      <div style="padding:0 24px 24px">
        <div style="display:flex;gap:12px;margin-bottom:16px;align-items:end">
          <div class="form-group" style="margin:0;flex:1">
            <label class="form-label">Habit/Vice Name</label>
            <input type="text" class="form-input" id="new-habit-name" placeholder="e.g., Smoking, Junk Food, Social Media...">
          </div>
          <div class="form-group" style="margin:0;width:80px">
            <label class="form-label">Icon</label>
            <input type="text" class="form-input" id="new-habit-icon" placeholder="🚬" value="🚫" style="text-align:center">
          </div>
          <button class="btn btn-primary" onclick="addNewHabit()" style="height:38px">+ Add</button>
        </div>
        ${habits.length > 0 ? `
        <div class="habits-manage-list">
          ${habits.map((h, i) => `
            <div class="habits-manage-item">
              <span>${h.icon || '🚫'} ${escapeHtml(h.name)}</span>
              <span style="font-size:0.75rem;color:var(--text-muted)">since ${formatDateShort(h.createdAt || today)}</span>
              <button class="btn btn-sm btn-danger" onclick="deleteHabit(${i})">🗑</button>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderHabitsCalendar(year, month, habits, log) {
  const today = todayStr();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '<div class="mini-cal-header">';
  ['S','M','T','W','T','F','S'].forEach(d => { html += `<div class="mini-cal-day-label">${d}</div>`; });
  html += '</div><div class="mini-cal-grid">';

  for (let i = 0; i < firstDay; i++) html += '<div class="mini-cal-cell empty"></div>';
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateKey === today;
    const isFuture = dateKey > today;
    const dayLog = log[dateKey] || {};
    
    let failCount = 0;
    let totalTracked = habits.length;
    habits.forEach(h => {
      if (dayLog[h.id]?.failed) failCount++;
    });
    
    let statusClass = '';
    if (!isFuture && totalTracked > 0) {
      if (failCount === 0) statusClass = 'habit-clean';
      else if (failCount < totalTracked) statusClass = 'habit-partial';
      else statusClass = 'habit-fail';
    }
    
    const tooltip = failCount > 0 ? `${failCount} failure${failCount>1?'s':''}` : (totalTracked > 0 && !isFuture ? 'Clean day' : '');
    
    html += `<div class="mini-cal-cell ${isToday ? 'today' : ''} ${statusClass} ${isFuture ? 'future' : ''}" 
      title="${tooltip}"
      onclick="openHabitsDayModal('${dateKey}')">${day}</div>`;
  }
  html += '</div>';
  return html;
}

function habitsCalNav(delta) {
  _habitsCalMonth += delta;
  if (_habitsCalMonth > 11) { _habitsCalMonth = 0; _habitsCalYear++; }
  if (_habitsCalMonth < 0) { _habitsCalMonth = 11; _habitsCalYear--; }
  renderHabitsPage();
}

function toggleHabitFail(habitId, dateStr) {
  if (!AppState.habitsLog) AppState.habitsLog = {};
  if (!AppState.habitsLog[dateStr]) AppState.habitsLog[dateStr] = {};
  
  const current = AppState.habitsLog[dateStr][habitId];
  if (current?.failed) {
    AppState.habitsLog[dateStr][habitId] = { failed: false, note: current.note || '' };
  } else {
    AppState.habitsLog[dateStr][habitId] = { failed: true, note: current?.note || '' };
  }
  saveToLocalStorage();
  renderHabitsPage();
}

function updateHabitNote(habitId, dateStr, note) {
  if (!AppState.habitsLog) AppState.habitsLog = {};
  if (!AppState.habitsLog[dateStr]) AppState.habitsLog[dateStr] = {};
  if (!AppState.habitsLog[dateStr][habitId]) AppState.habitsLog[dateStr][habitId] = { failed: false };
  AppState.habitsLog[dateStr][habitId].note = note;
  saveToLocalStorage();
}

function addNewHabit() {
  const name = document.getElementById('new-habit-name')?.value.trim();
  const icon = document.getElementById('new-habit-icon')?.value.trim() || '🚫';
  if (!name) { showToast('Enter a habit name', 'warning'); return; }
  
  if (!AppState.habits) AppState.habits = [];
  const id = 'habit_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
  
  if (AppState.habits.find(h => h.name.toLowerCase() === name.toLowerCase())) {
    showToast('This habit already exists', 'warning');
    return;
  }
  
  AppState.habits.push({ id, name, icon, createdAt: todayStr() });
  saveToLocalStorage();
  showToast(`Tracking "${name}"`, 'success');
  renderHabitsPage();
}

function deleteHabit(index) {
  const habit = AppState.habits[index];
  if (!habit) return;
  if (!confirm(`Remove "${habit.name}" from tracking?\n\nLog data for this habit will be preserved.`)) return;
  AppState.habits.splice(index, 1);
  saveToLocalStorage();
  showToast(`Removed "${habit.name}"`, 'warning');
  renderHabitsPage();
}

function openHabitsDayModal(dateStr) {
  const habits = AppState.habits || [];
  if (habits.length === 0) { showToast('Add a habit first', 'info'); return; }
  
  const log = AppState.habitsLog || {};
  const dayLog = log[dateStr] || {};
  
  const itemsHtml = habits.map(h => {
    const failed = dayLog[h.id]?.failed || false;
    const note = dayLog[h.id]?.note || '';
    return `
      <div class="habit-modal-item">
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <span>${h.icon || '🚫'}</span>
          <span>${escapeHtml(h.name)}</span>
        </div>
        <button class="btn btn-sm ${failed ? 'habit-btn-failed' : 'habit-btn-clean'}"
          onclick="toggleHabitFail('${h.id}', '${dateStr}');openHabitsDayModal('${dateStr}')">
          ${failed ? '❌ Failed' : '✅ Clean'}
        </button>
        <input type="text" class="form-input" style="width:140px;font-size:0.8rem" placeholder="note..." 
          value="${escapeHtml(note)}" 
          onchange="updateHabitNote('${h.id}', '${dateStr}', this.value)">
      </div>
    `;
  }).join('');

  const html = `
    <div class="modal-header">
      <div class="modal-title">🛡️ Habit Log — ${formatDate(dateStr)}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      ${itemsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal();renderHabitsPage()">Done</button>
    </div>
  `;
  openModal(html);
}

function generateHabitsAnalysis(habits, log, today) {
  if (habits.length === 0) {
    return '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">🧠</div><div class="empty-state-text">Add habits to see intelligent analysis</div></div>';
  }

  const insights = [];
  
  // Collect data for this week and last week
  const thisWeekDates = [];
  const lastWeekDates = [];
  for (let i = 0; i < 7; i++) thisWeekDates.push(addDays(today, -i));
  for (let i = 7; i < 14; i++) lastWeekDates.push(addDays(today, -i));
  
  let thisWeekTotal = 0, lastWeekTotal = 0;
  const perHabitThis = {};
  const perHabitLast = {};
  
  habits.forEach(h => {
    perHabitThis[h.id] = 0;
    perHabitLast[h.id] = 0;
  });
  
  thisWeekDates.forEach(d => {
    const dayLog = log[d] || {};
    habits.forEach(h => {
      if (dayLog[h.id]?.failed) {
        thisWeekTotal++;
        perHabitThis[h.id]++;
      }
    });
  });
  
  lastWeekDates.forEach(d => {
    const dayLog = log[d] || {};
    habits.forEach(h => {
      if (dayLog[h.id]?.failed) {
        lastWeekTotal++;
        perHabitLast[h.id]++;
      }
    });
  });
  
  // Overall comparison
  if (thisWeekTotal < lastWeekTotal) {
    const diff = lastWeekTotal - thisWeekTotal;
    insights.push({
      type: 'success',
      icon: '🎉',
      text: `<strong>Great progress!</strong> You had <strong>${thisWeekTotal}</strong> failure${thisWeekTotal !== 1 ? 's' : ''} this week vs <strong>${lastWeekTotal}</strong> last week — that's <strong>${diff} fewer</strong>. You're on the right path!`,
    });
  } else if (thisWeekTotal > lastWeekTotal) {
    const diff = thisWeekTotal - lastWeekTotal;
    insights.push({
      type: 'warning',
      icon: '⚠️',
      text: `<strong>Attention:</strong> This week had <strong>${thisWeekTotal}</strong> failure${thisWeekTotal !== 1 ? 's' : ''} vs <strong>${lastWeekTotal}</strong> last week — <strong>${diff} more</strong>. Don't give up. Every setback is a chance to learn.`,
    });
  } else if (thisWeekTotal === 0 && lastWeekTotal === 0) {
    insights.push({
      type: 'success',
      icon: '🏆',
      text: `<strong>Flawless!</strong> Two consecutive clean weeks. You're building real discipline. Keep this momentum going!`,
    });
  } else {
    insights.push({
      type: 'info',
      icon: 'ℹ️',
      text: `This week and last week had the same number of failures (<strong>${thisWeekTotal}</strong>). Consistency is key — try to break through and reduce this number.`,
    });
  }

  // Per-habit breakdown
  habits.forEach(h => {
    const tw = perHabitThis[h.id];
    const lw = perHabitLast[h.id];
    
    if (tw === 0 && lw === 0) {
      // Calculate total clean days for this habit
      let cleanDays = 0;
      let cd = today;
      for (let i = 0; i < 30; i++) {
        if (!(log[cd]?.[h.id]?.failed)) cleanDays++;
        else break;
        cd = addDays(cd, -1);
      }
      if (cleanDays >= 7) {
        insights.push({
          type: 'success',
          icon: h.icon || '🛡️',
          text: `<strong>${escapeHtml(h.name)}:</strong> ${cleanDays}+ days clean! This habit is under control. Every day strengthens your willpower.`,
        });
      }
    } else if (tw < lw) {
      insights.push({
        type: 'success',
        icon: '📉',
        text: `<strong>${escapeHtml(h.name)}:</strong> Improved! Down from <strong>${lw}</strong> to <strong>${tw}</strong> failures this week.`,
      });
    } else if (tw > lw) {
      insights.push({
        type: 'warning',
        icon: '📈',
        text: `<strong>${escapeHtml(h.name)}:</strong> Increased from <strong>${lw}</strong> to <strong>${tw}</strong> failures. Try to identify what triggers this habit and have a plan ready.`,
      });
    } else if (tw > 0) {
      insights.push({
        type: 'info',
        icon: '🔄',
        text: `<strong>${escapeHtml(h.name)}:</strong> <strong>${tw}</strong> failure${tw > 1 ? 's' : ''} both weeks. Focus on reducing even by one — small wins compound over time.`,
      });
    }
  });
  
  // Tips based on patterns
  const totalFailDays = Object.keys(log).filter(d => {
    const dayLog = log[d];
    return habits.some(h => dayLog[h.id]?.failed);
  });
  
  if (totalFailDays.length > 0) {
    // Check if failures cluster on certain days
    const dayOfWeekCounts = [0,0,0,0,0,0,0];
    totalFailDays.forEach(d => {
      const dow = new Date(d + 'T12:00:00').getDay();
      dayOfWeekCounts[dow]++;
    });
    const maxDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    if (dayOfWeekCounts[maxDay] >= 3) {
      insights.push({
        type: 'info',
        icon: '🔍',
        text: `<strong>Pattern detected:</strong> Most failures happen on <strong>${dayNames[maxDay]}</strong>. Pay extra attention on that day — prepare alternatives and stay mindful.`,
      });
    }
  }

  // Motivational tips
  const motivations = [
    { icon: '💪', text: '<strong>Remember:</strong> Progress, not perfection. Each clean day rewires your brain. You are literally building a new version of yourself.' },
    { icon: '🧘', text: '<strong>Tip:</strong> When you feel the urge, pause for 10 deep breaths. Most cravings pass within 10-15 minutes. Distract yourself with a positive activity.' },
    { icon: '📝', text: '<strong>Tip:</strong> Writing notes about when and why you fail helps identify patterns. The more you understand your triggers, the better you can avoid them.' },
    { icon: '🌊', text: '<strong>Mindset:</strong> A single failure doesn\'t erase your progress. What matters is getting back on track immediately. Don\'t let one bad day become two.' },
  ];
  
  // Pick 1-2 motivations based on current state
  if (thisWeekTotal > 0) {
    const idx = Math.floor(thisWeekTotal * 1.3) % motivations.length;
    insights.push({ type: 'info', ...motivations[idx] });
  }
  if (thisWeekTotal >= 3) {
    const idx2 = (Math.floor(thisWeekTotal * 2.7) + 1) % motivations.length;
    insights.push({ type: 'info', ...motivations[idx2] });
  }

  return insights.map(i => `
    <div class="ai-insight ${i.type}">
      <span class="ai-insight-icon">${i.icon}</span>
      <div class="ai-insight-text">${i.text}</div>
    </div>
  `).join('');
}

// ========== SCHEDULE CONFIGURATION (in Settings) ==========

function renderScheduleConfig() {
  const allItems = [...AppState.config.activities, ...AppState.config.studies];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return allItems.map(item => {
    const schedule = AppState.schedules[item.id] || {};
    const days = schedule.days || [];
    const hasDays = days.length > 0 && days.length < 7;

    return `
      <div class="schedule-item">
        <div class="schedule-item-name">${item.name}</div>
        <div class="schedule-days">
          ${dayNames.map((dn, i) => `
            <button class="schedule-day-btn ${days.includes(i) || days.length === 0 ? 'active' : ''}" 
              onclick="toggleScheduleDay('${item.id}', ${i})">${dn}</button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleScheduleDay(itemId, dayIndex) {
  if (!AppState.schedules[itemId]) {
    // First time setting schedule — start with all days selected, then toggle off
    AppState.schedules[itemId] = { days: [0,1,2,3,4,5,6] };
  }
  const days = AppState.schedules[itemId].days;
  const idx = days.indexOf(dayIndex);
  if (idx >= 0) {
    days.splice(idx, 1);
  } else {
    days.push(dayIndex);
    days.sort();
  }
  // If all days are selected, treat as "no schedule" (always active)
  if (days.length === 7 || days.length === 0) {
    delete AppState.schedules[itemId];
  }
  saveToLocalStorage();
  renderSettingsPage();
}

// ========== MOBILE SIDEBAR TOGGLE ==========

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ========== INITIALIZATION ==========


// ========================================
// FREQUENCY-AWARE COMPLETION CYCLE SYSTEM
// ========================================

/**
 * Determines if a task is in its "off-day" state based on frequency cycles
 * A task is "off-day" if it was completed within its current frequency cycle
 */
function isTaskInOffDayState(taskId, category, referenceDate = new Date()) {
  const itemConfig = getItemConfig(taskId, category);
  if (!itemConfig) return false;
  
  if (itemConfig.frequency === 'optional') return false;
  
  const frequencyDays = FREQUENCY_META[itemConfig.frequency]?.days;
  if (!frequencyDays || frequencyDays === null) return false;
  
  const lastCompletionDate = getLastCompletionDate(taskId, category);
  if (!lastCompletionDate) return false;
  
  // Special handling for daily tasks
  if (itemConfig.frequency === 'daily') {
    const todayStr = toDateString(referenceDate);
    return lastCompletionDate === todayStr;
  }
  
  // For longer frequency cycles
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);
  
  const lastCompDate = new Date(lastCompletionDate + 'T00:00:00');
  const daysElapsed = Math.floor((refDate - lastCompDate) / (1000 * 60 * 60 * 24));
  
  return daysElapsed < frequencyDays;
}

/**
 * Gets the most recent completion date for a task
 */
function getLastCompletionDate(taskId, category) {
  const dates = Object.keys(AppState.history).sort().reverse();
  
  for (const date of dates) {
    const record = AppState.history[date];
    const categoryData = record[category] || {};
    
    if (categoryData[taskId]?.done === true) {
      return date;
    }
  }
  
  return null;
}

/**
 * Gets the item configuration from the active task lists
 */
function getItemConfig(taskId, category) {
  if (category === 'activities') {
    return AppState.config.activities?.find(a => a.id === taskId) || null;
  } else if (category === 'studies') {
    return AppState.config.studies?.find(s => s.id === taskId) || null;
  }
  return null;
}

/**
 * Converts a Date object to YYYY-MM-DD string format
 */
function toDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates days remaining in the current frequency cycle for a task
 */
function getDaysRemainingInCycle(taskId, category) {
  const itemConfig = getItemConfig(taskId, category);
  if (!itemConfig || itemConfig.frequency === 'optional') return null;
  
  const frequencyDays = FREQUENCY_META[itemConfig.frequency]?.days;
  if (!frequencyDays) return null;
  
  const lastCompletionDate = getLastCompletionDate(taskId, category);
  
  if (!lastCompletionDate) return frequencyDays;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastCompDate = new Date(lastCompletionDate + 'T00:00:00');
  const daysElapsed = Math.floor((today - lastCompDate) / (1000 * 60 * 60 * 24));
  
  return frequencyDays - daysElapsed;
}

/**
 * Gets completion percentage for a frequency cycle
 */
function getCycleCompletionPercentage(taskId, category) {
  const itemConfig = getItemConfig(taskId, category);
  if (!itemConfig || itemConfig.frequency === 'optional') return 0;
  
  const frequencyDays = FREQUENCY_META[itemConfig.frequency]?.days;
  if (!frequencyDays) return 0;
  
  const lastCompletionDate = getLastCompletionDate(taskId, category);
  if (!lastCompletionDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastCompDate = new Date(lastCompletionDate + 'T00:00:00');
  const daysElapsed = Math.floor((today - lastCompDate) / (1000 * 60 * 60 * 24));
  
  const percentage = Math.min(100, Math.floor((daysElapsed / frequencyDays) * 100));
  return percentage;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load from localStorage first — returns true if data was found
  const hasLocalData = loadFromLocalStorage();
  
  // Initialize config
  initConfig();
  
  // Ensure config is applied
  applyConfig();
  
  // Save initial state
  saveToLocalStorage();
  
  // Initialize Pomodoro timer state
  _pomodoroState.timeRemaining = AppState.pomodoroConfig.workMinutes * 60;
  
  // Update date display
  document.getElementById('current-date-display').textContent = formatDate(AppState.currentDate);
  
  // Set up navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      renderPage(item.dataset.page);
      // Close mobile sidebar
      document.querySelector('.sidebar').classList.remove('open');
    });
  });
  
  // Render initial page
  renderPage('today');
  
  // Check calendar notifications after a brief delay
  setTimeout(() => {
    checkCalendarNotifications();
  }, 800);
  
  console.log('Life Dashboard v2.0 initialized');
});
