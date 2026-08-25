/* ============================================
   ROUTINE v3 — ACTION PLAN LAYER
   Loaded after features.js. Adds:
   - Action Plans page (nav: Direction)
   - Plans with tasks (priority, deadline, notes),
     milestones, status, and optional link to an
     existing Goal or Objective.
   - Plan progress is computed from its own tasks;
     when linked, the linked item's progress is
     shown alongside it (independent tracking).
   Export/import stays backward & forward compatible.
   ============================================ */

// ========== STATE + STORAGE ==========
const STORAGE_KEY_ACTIONPLANS = 'lifedash_actionplans';

AppState.actionPlans = [];
/*
  Plan shape:
  {
    id, name, description,
    status: 'not-started' | 'active' | 'done',
    priority: 'low' | 'medium' | 'high',
    deadline: 'YYYY-MM-DD' | null,
    linkedType: 'goal' | 'objective' | null,
    linkedId: string | null,
    milestones: [{ id, title, date: 'YYYY-MM-DD'|null, done }],
    tasks: [{ id, text, done, doneDate, priority, deadline: 'YYYY-MM-DD'|null, note }],
    createdAt, archived
  }
*/

try {
  const raw = localStorage.getItem(STORAGE_KEY_ACTIONPLANS);
  if (raw) AppState.actionPlans = JSON.parse(raw);
} catch (e) { console.warn('action plans load failed', e); }

// ========== PATCH: PERSISTENCE ==========
const _apOrigSave = saveToLocalStorage;
window.saveToLocalStorage = function () {
  _apOrigSave();
  try { localStorage.setItem(STORAGE_KEY_ACTIONPLANS, JSON.stringify(AppState.actionPlans)); } catch (e) {}
};

// ========== PATCH: EXPORT (extends the shared data builder — never redefines the download logic) ==========
const _apOrigBuildExportData = buildExportData;
window.buildExportData = function () {
  const data = _apOrigBuildExportData();
  data.version = '3.1';
  // v3.1 addition (safely ignored by older versions)
  data.actionPlans = AppState.actionPlans;
  return data;
};

// ========== PATCH: IMPORT (accepts v2, v3 and v3.1 files) ==========
const _apOrigImport = importFromJSON;
window.importFromJSON = function (file) {
  return _apOrigImport(file).then(data => {
    if (Array.isArray(data.actionPlans)) {
      // Merge by id: imported plans replace same-id plans, new ones are appended
      const byId = new Map(AppState.actionPlans.map(p => [p.id, p]));
      data.actionPlans.forEach(p => byId.set(p.id, p));
      AppState.actionPlans = [...byId.values()];
      saveToLocalStorage();
      if (AppState.currentPage === 'actionplans') renderActionPlansPage();
    }
    return data;
  });
};

// ========== PATCH: FULL WIPE ==========
const _apOrigClearAll = clearAllData;
window.clearAllData = function () {
  _apOrigClearAll();
  try { localStorage.removeItem(STORAGE_KEY_ACTIONPLANS); } catch (e) {}
  AppState.actionPlans = [];
};

// ========== PATCH: ROUTER ==========
const _apOrigRenderPage = renderPage;
window.renderPage = function (pageId) {
  if (pageId === 'actionplans') {
    AppState.currentPage = pageId;
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const section = document.getElementById('page-actionplans');
    if (section) section.classList.add('active');
    document.querySelectorAll('.nav-item[data-page]').forEach(n => {
      n.classList.toggle('active', n.dataset.page === pageId);
    });
    document.getElementById('page-title').textContent = 'Action Plans';
    renderActionPlansPage();
    return;
  }
  _apOrigRenderPage(pageId);
};
const _apOrigGetPageTitle = getPageTitle;
window.getPageTitle = function (pageId) {
  if (pageId === 'actionplans') return 'Action Plans';
  return _apOrigGetPageTitle(pageId);
};

// ========== PATCH: COMMAND PALETTE ==========
const _apOrigBuildPaletteItems = buildPaletteItems;
window.buildPaletteItems = function () {
  const items = _apOrigBuildPaletteItems();
  items.push(
    { icon: '⚑', label: 'Go to Action Plans', kw: 'action plan plans tasks strategy', group: 'Navigate', run: () => renderPage('actionplans') },
    { icon: '＋', label: 'New action plan', kw: 'new add action plan', group: 'Actions', run: () => { renderPage('actionplans'); openCreatePlanModal(); } },
  );
  return items;
};

// ========== HELPERS ==========
const AP_PRIORITY_META = {
  high:   { label: 'High',   cls: 'ap-pri-high' },
  medium: { label: 'Medium', cls: 'ap-pri-medium' },
  low:    { label: 'Low',    cls: 'ap-pri-low' },
};
const AP_STATUS_META = {
  'not-started': { label: 'Not started', cls: 'ap-st-notstarted', icon: '○' },
  'active':      { label: 'Active',      cls: 'ap-st-active',     icon: '◉' },
  'done':        { label: 'Done',        cls: 'ap-st-done',       icon: '✓' },
};
const AP_PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const AP_STATUS_ORDER = { active: 0, 'not-started': 1, done: 2 };

var _apSelectedId = null;   // plan open in detail view
var _apFilter = 'all';      // all | active | not-started | done | archived

function getPlan(planId) {
  return AppState.actionPlans.find(p => p.id === planId);
}

function getPlanProgress(plan) {
  if (!plan.tasks || plan.tasks.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = plan.tasks.filter(t => t.done).length;
  return { done, total: plan.tasks.length, pct: Math.round((done / plan.tasks.length) * 100) };
}

function getLinkedItem(plan) {
  if (!plan.linkedType || !plan.linkedId) return null;
  if (plan.linkedType === 'goal') {
    const g = AppState.goals.find(x => x.id === plan.linkedId);
    return g ? { kind: 'Goal', name: g.name, progress: getGoalProgress(g) } : null;
  }
  const o = AppState.objectives.find(x => x.id === plan.linkedId);
  return o ? { kind: 'Objective', name: o.name, progress: getObjectiveProgress(o) } : null;
}

function apDeadlineBadge(deadline, doneFlag) {
  if (!deadline) return '';
  const dd = daysBetween(todayStr(), deadline);
  let cls = 'ap-deadline-ok', text;
  if (doneFlag) { cls = 'ap-deadline-done'; text = formatDateShort(deadline); }
  else if (dd < 0) { cls = 'ap-deadline-over'; text = `${Math.abs(dd)}d overdue`; }
  else if (dd === 0) { cls = 'ap-deadline-soon'; text = 'due today'; }
  else if (dd <= 3) { cls = 'ap-deadline-soon'; text = `in ${dd}d`; }
  else { text = formatDateShort(deadline); }
  return `<span class="ap-deadline ${cls}" title="Deadline: ${formatDate(deadline)}">⏱ ${text}</span>`;
}

// ========== CRUD: PLANS ==========
function createActionPlan(fields) {
  const plan = {
    id: generateId('plan'),
    name: fields.name,
    description: fields.description || '',
    status: fields.status || 'not-started',
    priority: fields.priority || 'medium',
    deadline: fields.deadline || null,
    linkedType: fields.linkedType || null,
    linkedId: fields.linkedId || null,
    milestones: [],
    tasks: [],
    createdAt: todayStr(),
    archived: false,
  };
  AppState.actionPlans.push(plan);
  saveToLocalStorage();
  return plan;
}

function archiveActionPlan(planId) {
  const plan = getPlan(planId);
  if (!plan) return;
  plan.archived = !plan.archived;
  saveToLocalStorage();
  if (_apSelectedId === planId) _apSelectedId = null;
  renderActionPlansPage();
  showToast(plan.archived ? 'Plan archived' : 'Plan restored', 'info');
}

function deleteActionPlan(planId) {
  if (!confirm('Delete this action plan permanently? Its tasks and milestones will be lost.')) return;
  AppState.actionPlans = AppState.actionPlans.filter(p => p.id !== planId);
  if (_apSelectedId === planId) _apSelectedId = null;
  saveToLocalStorage();
  renderActionPlansPage();
  showToast('Action plan deleted', 'warning');
}

function setPlanStatus(planId, status) {
  const plan = getPlan(planId);
  if (!plan || !AP_STATUS_META[status]) return;
  plan.status = status;
  saveToLocalStorage();
  renderActionPlansPage();
}

// ========== CRUD: TASKS ==========
function addPlanTask(planId) {
  const plan = getPlan(planId);
  if (!plan) return;
  const textEl = document.getElementById('ap-newtask-text');
  const priEl = document.getElementById('ap-newtask-priority');
  const dlEl = document.getElementById('ap-newtask-deadline');
  const text = textEl ? textEl.value.trim() : '';
  if (!text) { showToast('Describe the task first', 'warning'); return; }
  plan.tasks.push({
    id: generateId('pt'),
    text,
    done: false,
    doneDate: null,
    priority: priEl ? priEl.value : 'medium',
    deadline: dlEl && dlEl.value ? dlEl.value : null,
    note: '',
  });
  saveToLocalStorage();
  renderActionPlansPage();
  // keep the composer focused for rapid entry
  setTimeout(() => document.getElementById('ap-newtask-text')?.focus(), 40);
}

function togglePlanTask(planId, taskId) {
  const plan = getPlan(planId);
  if (!plan) return;
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.done = !task.done;
  task.doneDate = task.done ? todayStr() : null;
  // Gentle status automation: starting work flips 'not started' → 'active'.
  // Marking it 'done' remains a deliberate, manual act.
  if (task.done && plan.status === 'not-started') plan.status = 'active';
  saveToLocalStorage();
  renderActionPlansPage();
  const p = getPlanProgress(plan);
  if (p.pct === 100 && plan.status !== 'done') {
    showToast('All tasks complete — you can mark the plan as Done', 'success');
  }
}

function deletePlanTask(planId, taskId) {
  const plan = getPlan(planId);
  if (!plan) return;
  plan.tasks = plan.tasks.filter(t => t.id !== taskId);
  saveToLocalStorage();
  renderActionPlansPage();
}

var _apOpenNoteTaskId = null;
function togglePlanTaskNote(taskId) {
  _apOpenNoteTaskId = _apOpenNoteTaskId === taskId ? null : taskId;
  renderActionPlansPage();
  if (_apOpenNoteTaskId) setTimeout(() => document.getElementById(`ap-note-${taskId}`)?.focus(), 40);
}

function savePlanTaskNote(planId, taskId) {
  const plan = getPlan(planId);
  if (!plan) return;
  const task = plan.tasks.find(t => t.id === taskId);
  const el = document.getElementById(`ap-note-${taskId}`);
  if (!task || !el) return;
  task.note = el.value.trim();
  _apOpenNoteTaskId = null;
  saveToLocalStorage();
  renderActionPlansPage();
  showToast('Note saved', 'success');
}

// ========== CRUD: MILESTONES ==========
function addPlanMilestone(planId) {
  const plan = getPlan(planId);
  if (!plan) return;
  const titleEl = document.getElementById('ap-newms-title');
  const dateEl = document.getElementById('ap-newms-date');
  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) { showToast('Give the milestone a title', 'warning'); return; }
  plan.milestones.push({
    id: generateId('pm'),
    title,
    date: dateEl && dateEl.value ? dateEl.value : null,
    done: false,
  });
  plan.milestones.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  saveToLocalStorage();
  renderActionPlansPage();
}

function togglePlanMilestone(planId, msId) {
  const plan = getPlan(planId);
  if (!plan) return;
  const ms = plan.milestones.find(m => m.id === msId);
  if (!ms) return;
  ms.done = !ms.done;
  saveToLocalStorage();
  renderActionPlansPage();
}

function deletePlanMilestone(planId, msId) {
  const plan = getPlan(planId);
  if (!plan) return;
  plan.milestones = plan.milestones.filter(m => m.id !== msId);
  saveToLocalStorage();
  renderActionPlansPage();
}

// ========== MODALS ==========
function apLinkOptionsHtml(selectedType, selectedId) {
  const goals = (AppState.goals || []).filter(g => !g.archived);
  const objs = (AppState.objectives || []).filter(o => !o.archived);
  let html = `<option value="" ${!selectedType ? 'selected' : ''}>— No link (standalone plan) —</option>`;
  if (goals.length) {
    html += `<optgroup label="Goals">` + goals.map(g =>
      `<option value="goal:${g.id}" ${selectedType === 'goal' && selectedId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('') + `</optgroup>`;
  }
  if (objs.length) {
    html += `<optgroup label="Objectives">` + objs.map(o =>
      `<option value="objective:${o.id}" ${selectedType === 'objective' && selectedId === o.id ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('') + `</optgroup>`;
  }
  return html;
}

function apPlanFormHtml(plan) {
  const p = plan || {};
  return `
    <div class="form-group">
      <label class="form-label">Plan Name *</label>
      <input type="text" class="form-input" id="modal-plan-name" placeholder="e.g., Launch the portfolio site" value="${escapeHtml(p.name || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <input type="text" class="form-input" id="modal-plan-desc" placeholder="What is this plan about? (optional)" value="${escapeHtml(p.description || '')}">
    </div>
    <div class="ap-form-row">
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-input" id="modal-plan-priority">
          ${['high', 'medium', 'low'].map(k => `<option value="${k}" ${(p.priority || 'medium') === k ? 'selected' : ''}>${AP_PRIORITY_META[k].label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-input" id="modal-plan-status">
          ${['not-started', 'active', 'done'].map(k => `<option value="${k}" ${(p.status || 'not-started') === k ? 'selected' : ''}>${AP_STATUS_META[k].label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Deadline</label>
        <input type="date" class="form-input" id="modal-plan-deadline" value="${p.deadline || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Link to a Goal or Objective (optional)</label>
      <select class="form-input" id="modal-plan-link">${apLinkOptionsHtml(p.linkedType, p.linkedId)}</select>
      <div class="ap-form-hint">The plan keeps its own progress; the linked item's progress is shown next to it for context.</div>
    </div>
  `;
}

function openCreatePlanModal() {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Create Action Plan</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">${apPlanFormHtml(null)}</div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreatePlan()">Create Plan</button>
    </div>
  `);
  setTimeout(() => document.getElementById('modal-plan-name')?.focus(), 60);
}

function openEditPlanModal(planId) {
  const plan = getPlan(planId);
  if (!plan) return;
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Edit Action Plan</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">${apPlanFormHtml(plan)}</div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditPlan('${plan.id}')">Save Changes</button>
    </div>
  `);
}

function apReadPlanForm() {
  const name = document.getElementById('modal-plan-name')?.value.trim();
  if (!name) { showToast('Please enter a plan name', 'warning'); return null; }
  const linkVal = document.getElementById('modal-plan-link')?.value || '';
  let linkedType = null, linkedId = null;
  if (linkVal) {
    const idx = linkVal.indexOf(':');
    linkedType = linkVal.slice(0, idx);
    linkedId = linkVal.slice(idx + 1);
  }
  return {
    name,
    description: document.getElementById('modal-plan-desc')?.value.trim() || '',
    priority: document.getElementById('modal-plan-priority')?.value || 'medium',
    status: document.getElementById('modal-plan-status')?.value || 'not-started',
    deadline: document.getElementById('modal-plan-deadline')?.value || null,
    linkedType, linkedId,
  };
}

function submitCreatePlan() {
  const fields = apReadPlanForm();
  if (!fields) return;
  const plan = createActionPlan(fields);
  closeModal();
  _apSelectedId = plan.id; // jump straight into the new plan
  renderActionPlansPage();
  showToast('Action plan created — add your first tasks', 'success');
}

function submitEditPlan(planId) {
  const plan = getPlan(planId);
  if (!plan) return;
  const fields = apReadPlanForm();
  if (!fields) return;
  Object.assign(plan, fields);
  saveToLocalStorage();
  closeModal();
  renderActionPlansPage();
  showToast('Plan updated', 'success');
}

// ========== RENDER: PAGE ==========
function renderActionPlansPage() {
  const container = document.getElementById('page-actionplans');
  if (!container) return;
  if (_apSelectedId && getPlan(_apSelectedId)) {
    container.innerHTML = renderPlanDetail(getPlan(_apSelectedId));
    return;
  }
  _apSelectedId = null;
  container.innerHTML = renderPlanList();
}

function renderPlanList() {
  const all = AppState.actionPlans;
  const active = all.filter(p => !p.archived && p.status === 'active').length;
  const done = all.filter(p => !p.archived && p.status === 'done').length;
  const tasksDone = all.reduce((a, p) => a + p.tasks.filter(t => t.done).length, 0);
  const tasksTotal = all.reduce((a, p) => a + p.tasks.length, 0);

  let visible = all.filter(p => {
    if (_apFilter === 'archived') return p.archived;
    if (p.archived) return false;
    if (_apFilter === 'all') return true;
    return p.status === _apFilter;
  });
  visible = [...visible].sort((a, b) =>
    (AP_STATUS_ORDER[a.status] - AP_STATUS_ORDER[b.status]) ||
    (AP_PRIORITY_ORDER[a.priority] - AP_PRIORITY_ORDER[b.priority]) ||
    ((a.deadline || '9999') .localeCompare(b.deadline || '9999')));

  const filters = [['all', 'All'], ['active', 'Active'], ['not-started', 'Not started'], ['done', 'Done'], ['archived', 'Archived']];

  return `
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr)">
      <div class="stat-card" style="--stat-color: var(--accent-primary)">
        <div class="stat-label">Plans</div><div class="stat-value">${all.filter(p => !p.archived).length}</div><div class="stat-sub">in the ledger</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-green)">
        <div class="stat-label">Active</div><div class="stat-value">${active}</div><div class="stat-sub">in motion</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-purple)">
        <div class="stat-label">Completed</div><div class="stat-value">${done}</div><div class="stat-sub">plans done</div>
      </div>
      <div class="stat-card" style="--stat-color: var(--accent-blue)">
        <div class="stat-label">Tasks</div><div class="stat-value">${tasksDone}<span class="ap-stat-frac">/${tasksTotal}</span></div><div class="stat-sub">completed overall</div>
      </div>
    </div>

    <div class="ap-toolbar">
      <div class="ap-filters">
        ${filters.map(([k, label]) => `<button class="ap-filter ${_apFilter === k ? 'active' : ''}" onclick="_apFilter='${k}'; renderActionPlansPage()">${label}</button>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="openCreatePlanModal()">＋ New Action Plan</button>
    </div>

    ${visible.length ? `<div class="ap-grid">${visible.map(renderPlanCard).join('')}</div>` : `
      <div class="empty-state" style="padding:48px 0">
        <div class="empty-state-icon">⚑</div>
        <div class="empty-state-text">${_apFilter === 'all'
          ? 'No action plans yet. A plan turns an objective into concrete, ordered work — create the first one.'
          : 'Nothing under this filter.'}</div>
      </div>`}
  `;
}

function renderPlanCard(plan) {
  const prog = getPlanProgress(plan);
  const linked = getLinkedItem(plan);
  const st = AP_STATUS_META[plan.status] || AP_STATUS_META['not-started'];
  const pri = AP_PRIORITY_META[plan.priority] || AP_PRIORITY_META.medium;
  const msDone = plan.milestones.filter(m => m.done).length;
  const nextMs = plan.milestones.find(m => !m.done);

  return `
    <div class="card ap-card ${plan.status === 'done' ? 'ap-card-done' : ''}" onclick="_apSelectedId='${plan.id}'; renderActionPlansPage()">
      <div class="ap-card-top">
        <div class="ap-badges">
          <span class="ap-status ${st.cls}">${st.icon} ${st.label}</span>
          <span class="ap-priority ${pri.cls}">${pri.label}</span>
          ${apDeadlineBadge(plan.deadline, plan.status === 'done')}
        </div>
        <div class="ap-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-sm" onclick="openEditPlanModal('${plan.id}')" title="Edit">✎</button>
          <button class="btn btn-sm" onclick="archiveActionPlan('${plan.id}')" title="${plan.archived ? 'Restore' : 'Archive'}">${plan.archived ? '⟲' : '⛃'}</button>
          <button class="btn btn-sm" onclick="deleteActionPlan('${plan.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="ap-card-name">${escapeHtml(plan.name)}</div>
      ${plan.description ? `<div class="ap-card-desc">${escapeHtml(plan.description)}</div>` : ''}
      ${linked ? `<div class="ap-linked-chip" title="${linked.kind}: ${escapeHtml(linked.name)}">⛓ ${linked.kind} · ${escapeHtml(linked.name)}</div>` : ''}
      <div class="ap-card-progress">
        <div class="ap-progress-label"><span>Tasks</span><span>${prog.done}/${prog.total} (${prog.pct}%)</span></div>
        <div class="go-mini-progress"><div class="go-mini-progress-fill" style="width:${prog.pct}%; background: var(--accent-primary)"></div></div>
        ${linked ? `
          <div class="ap-progress-label"><span>${linked.kind}</span><span>${linked.progress.pct}%</span></div>
          <div class="go-mini-progress"><div class="go-mini-progress-fill" style="width:${linked.progress.pct}%; background: var(--accent-blue)"></div></div>
        ` : ''}
      </div>
      <div class="ap-card-foot">
        ${plan.milestones.length ? `<span>◆ ${msDone}/${plan.milestones.length} milestones</span>` : '<span></span>'}
        ${nextMs ? `<span class="ap-next-ms" title="Next milestone">→ ${escapeHtml(nextMs.title)}${nextMs.date ? ' · ' + formatDateShort(nextMs.date) : ''}</span>` : ''}
      </div>
    </div>
  `;
}

// ========== RENDER: DETAIL ==========
function renderPlanDetail(plan) {
  const prog = getPlanProgress(plan);
  const linked = getLinkedItem(plan);
  const st = AP_STATUS_META[plan.status];
  const pri = AP_PRIORITY_META[plan.priority];

  // Tasks: open first (by priority, then deadline), completed at the bottom
  const tasks = [...plan.tasks].sort((a, b) =>
    (a.done - b.done) ||
    (AP_PRIORITY_ORDER[a.priority || 'medium'] - AP_PRIORITY_ORDER[b.priority || 'medium']) ||
    ((a.deadline || '9999').localeCompare(b.deadline || '9999')));

  return `
    <div class="ap-detail-bar">
      <button class="btn" onclick="_apSelectedId=null; renderActionPlansPage()">← All plans</button>
      <div class="ap-detail-bar-actions">
        <button class="btn btn-sm" onclick="openEditPlanModal('${plan.id}')">✎ Edit</button>
        <button class="btn btn-sm" onclick="archiveActionPlan('${plan.id}')">${plan.archived ? '⟲ Restore' : '⛃ Archive'}</button>
        <button class="btn btn-sm" onclick="deleteActionPlan('${plan.id}')">✕ Delete</button>
      </div>
    </div>

    <div class="card ap-detail-head">
      <div class="ap-detail-head-main">
        <div class="ap-badges">
          <span class="ap-status ${st.cls}">${st.icon} ${st.label}</span>
          <span class="ap-priority ${pri.cls}">${pri.label} priority</span>
          ${apDeadlineBadge(plan.deadline, plan.status === 'done')}
        </div>
        <h2 class="ap-detail-name">${escapeHtml(plan.name)}</h2>
        ${plan.description ? `<p class="ap-detail-desc">${escapeHtml(plan.description)}</p>` : ''}
        <div class="ap-status-switch">
          ${['not-started', 'active', 'done'].map(k => `
            <button class="ap-status-btn ${plan.status === k ? 'active ' + AP_STATUS_META[k].cls : ''}"
              onclick="setPlanStatus('${plan.id}', '${k}')">${AP_STATUS_META[k].icon} ${AP_STATUS_META[k].label}</button>`).join('')}
        </div>
      </div>
      <div class="ap-detail-rings">
        <div class="ap-ring-block">
          ${renderProgressRing(prog.pct, 'var(--accent-primary)', 84)}
          <div class="ap-ring-caption">Plan tasks<br><strong>${prog.done}/${prog.total}</strong></div>
        </div>
        ${linked ? `
          <div class="ap-ring-block">
            ${renderProgressRing(linked.progress.pct, 'var(--accent-blue)', 84)}
            <div class="ap-ring-caption">${linked.kind}<br><strong title="${escapeHtml(linked.name)}">${escapeHtml(linked.name.length > 18 ? linked.name.slice(0, 17) + '…' : linked.name)}</strong></div>
          </div>` : ''}
      </div>
    </div>

    <div class="ap-detail-grid">
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">☑</span> Task list</div>
          <span class="ov-muted">${prog.done}/${prog.total} done</span></div>

        <div class="ap-task-composer">
          <input type="text" class="form-input" id="ap-newtask-text" placeholder="Describe the next concrete action…"
            onkeydown="if(event.key==='Enter') addPlanTask('${plan.id}')">
          <select class="form-input ap-composer-pri" id="ap-newtask-priority" title="Priority">
            <option value="high">High</option>
            <option value="medium" selected>Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="date" class="form-input ap-composer-date" id="ap-newtask-deadline" title="Deadline (optional)">
          <button class="btn btn-primary" onclick="addPlanTask('${plan.id}')">Add</button>
        </div>

        ${tasks.length ? `<div class="ap-task-list">${tasks.map(t => renderPlanTaskRow(plan, t)).join('')}</div>`
          : `<div class="empty-state"><div class="empty-state-icon">◌</div><div class="empty-state-text">No tasks yet. Break the plan into small, checkable actions.</div></div>`}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title"><span class="icon">◆</span> Milestones</div>
          <span class="ov-muted">${plan.milestones.filter(m => m.done).length}/${plan.milestones.length}</span></div>

        <div class="ap-ms-composer">
          <input type="text" class="form-input" id="ap-newms-title" placeholder="Milestone title…"
            onkeydown="if(event.key==='Enter') addPlanMilestone('${plan.id}')">
          <input type="date" class="form-input ap-composer-date" id="ap-newms-date" title="Target date (optional)">
          <button class="btn btn-primary" onclick="addPlanMilestone('${plan.id}')">Add</button>
        </div>

        ${plan.milestones.length ? `<div class="ap-ms-timeline">${plan.milestones.map(m => `
          <div class="ap-ms ${m.done ? 'done' : ''}">
            <button class="ap-ms-dot" onclick="togglePlanMilestone('${plan.id}', '${m.id}')" title="${m.done ? 'Reopen' : 'Mark reached'}">${m.done ? '✓' : ''}</button>
            <div class="ap-ms-body">
              <div class="ap-ms-title">${escapeHtml(m.title)}</div>
              ${m.date ? `<div class="ap-ms-date">${formatDateShort(m.date)}${!m.done && daysBetween(todayStr(), m.date) < 0 ? ' · overdue' : ''}</div>` : ''}
            </div>
            <button class="ap-row-del" onclick="deletePlanMilestone('${plan.id}', '${m.id}')" title="Remove">✕</button>
          </div>`).join('')}</div>`
          : `<div class="empty-state"><div class="empty-state-icon">◌</div><div class="empty-state-text">No milestones. Mark the checkpoints that tell you the plan is on course.</div></div>`}
      </div>
    </div>
  `;
}

function renderPlanTaskRow(plan, t) {
  const pri = AP_PRIORITY_META[t.priority || 'medium'];
  const noteOpen = _apOpenNoteTaskId === t.id;
  return `
    <div class="ap-task ${t.done ? 'done' : ''}">
      <div class="ap-task-main">
        <button class="ap-task-check" onclick="togglePlanTask('${plan.id}', '${t.id}')" title="${t.done ? 'Reopen' : 'Complete'}">${t.done ? '✓' : ''}</button>
        <div class="ap-task-text">
          <span>${escapeHtml(t.text)}</span>
          <div class="ap-task-meta">
            <span class="ap-pri-dot ${pri.cls}" title="${pri.label} priority"></span>
            ${apDeadlineBadge(t.deadline, t.done)}
            ${t.done && t.doneDate ? `<span class="ap-task-donedate">done ${formatDateShort(t.doneDate)}</span>` : ''}
            ${t.note ? `<span class="ap-task-hasnote" title="Has a note">✎ note</span>` : ''}
          </div>
        </div>
        <div class="ap-task-actions">
          <button class="btn btn-sm" onclick="togglePlanTaskNote('${t.id}')" title="Notes / resources">✎</button>
          <button class="ap-row-del" onclick="deletePlanTask('${plan.id}', '${t.id}')" title="Remove">✕</button>
        </div>
      </div>
      ${noteOpen ? `
        <div class="ap-task-note-editor">
          <textarea class="form-input" id="ap-note-${t.id}" rows="3"
            placeholder="Notes, links, resources for this task…">${escapeHtml(t.note || '')}</textarea>
          <div class="ap-task-note-actions">
            <button class="btn btn-sm" onclick="_apOpenNoteTaskId=null; renderActionPlansPage()">Cancel</button>
            <button class="btn btn-sm btn-primary" onclick="savePlanTaskNote('${plan.id}', '${t.id}')">Save note</button>
          </div>
        </div>` : (t.note ? `<div class="ap-task-note-view" onclick="togglePlanTaskNote('${t.id}')">${escapeHtml(t.note)}</div>` : '')}
    </div>
  `;
}

console.log('Routine v3.1 action plan layer initialized');
