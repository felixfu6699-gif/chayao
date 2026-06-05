// Data
let meds = JSON.parse(localStorage.getItem('yaoji_meds') || '[]');
let records = JSON.parse(localStorage.getItem('yaoji_records') || '{}');
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let selectedDate = null;
let editingId = null;

const SLOTS = { morning: '早', noon: '午', evening: '晚' };

// Utils
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatDate(d) {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return d.getMonth() + 1 + '月' + d.getDate() + '日 周' + days[d.getDay()];
}
function save() {
  localStorage.setItem('yaoji_meds', JSON.stringify(meds));
  localStorage.setItem('yaoji_records', JSON.stringify(records));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

// Nav
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector('[data-page="' + page + '"]').classList.add('active');
  if (page === 'today') renderToday();
  else if (page === 'meds') renderMeds();
  else if (page === 'history') renderHistory();
}

// Today page
function renderToday() {
  const today = todayStr();
  const todayMeds = meds.filter(m => m.active !== false);
  const container = document.getElementById('today-content');
  const dateEl = document.getElementById('today-date');
  const progressEl = document.getElementById('today-progress');
  const statusEl = document.getElementById('today-status');

  dateEl.textContent = formatDate(new Date());

  if (todayMeds.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>还没有药物，添加你的第一个药物开始记录</p><button class="add-btn" onclick="switchPage(\'meds\');openModal()">添加药物</button></div>';
    progressEl.textContent = '--';
    statusEl.textContent = '';
    return;
  }

  let total = 0, taken = 0;
  todayMeds.forEach(m => { m.slots.forEach(() => { total++; }); });
  todayMeds.forEach(m => {
    m.slots.forEach(s => {
      if (records[today] && records[today][m.id] && records[today][m.id][s]) taken++;
    });
  });

  progressEl.textContent = taken + '/' + total;
  statusEl.textContent = taken === total ? '今日已全部服用' : '还有 ' + (total - taken) + ' 项未服用';

  let html = '';
  const sections = { morning: [], noon: [], evening: [] };
  todayMeds.forEach(m => {
    m.slots.forEach(s => { sections[s].push(m); });
  });

  Object.keys(sections).forEach(slot => {
    if (sections[slot].length === 0) return;
    html += '<div class="time-section"><div class="time-section-title">' + SLOTS[slot] + '</div>';
    sections[slot].forEach(m => {
      const isTaken = records[today] && records[today][m.id] && records[today][m.id][slot];
      const timeStamp = isTaken ? records[today][m.id][slot] : '';
      html += '<div class="med-card"><div class="med-info"><div class="med-name">' + m.name + '</div>';
      html += '<div class="med-detail">' + m.dosage + '</div>';
      if (timeStamp) html += '<div class="med-time-stamp">' + timeStamp + ' 已服</div>';
      html += '</div>';
      html += '<button class="take-btn' + (isTaken ? ' taken' : '') + '" onclick="takeMed(\'' + m.id + '\',\'' + slot + '\')">';
      if (isTaken) {
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>';
      } else {
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/></svg>';
        html += '<span>服用</span>';
      }
      html += '</button></div>';
    });
    html += '</div>';
  });
  container.innerHTML = html;
}

function takeMed(medId, slot) {
  const today = todayStr();
  if (!records[today]) records[today] = {};
  if (!records[today][medId]) records[today][medId] = {};

  if (records[today][medId][slot]) {
    delete records[today][medId][slot];
    showToast('已撤销');
  } else {
    const now = new Date();
    records[today][medId][slot] = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    showToast('已记录');
  }
  save(); renderToday();
}

// Meds page
function renderMeds() {
  const container = document.getElementById('meds-list');
  if (meds.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>暂无药物</p></div>';
    return;
  }
  let html = '';
  meds.forEach(m => {
    const slotsText = m.slots.map(s => SLOTS[s]).join(' / ');
    html += '<div class="med-list-item"><div class="info"><h3>' + m.name + '</h3>';
    html += '<p>' + m.dosage + ' \u00B7 ' + slotsText + '</p></div>';
    html += '<div class="actions">';
    html += '<button onclick="editMed(\'' + m.id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
    html += '<button class="danger" onclick="confirmDelete(\'' + m.id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    html += '</div></div>';
  });
  container.innerHTML = html;
}

// Modal
function openModal(id) {
  editingId = id || null;
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const nameInput = document.getElementById('input-name');
  const dosageInput = document.getElementById('input-dosage');

  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));

  if (id) {
    const m = meds.find(x => x.id === id);
    title.textContent = '编辑药物';
    nameInput.value = m.name;
    dosageInput.value = m.dosage;
    m.slots.forEach(s => {
      document.querySelector('.time-slot[data-slot="' + s + '"]').classList.add('selected');
    });
  } else {
    title.textContent = '添加药物';
    nameInput.value = '';
    dosageInput.value = '';
  }
  overlay.classList.add('show');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('show'); }

function toggleSlot(el) { el.classList.toggle('selected'); }

function saveMed() {
  const name = document.getElementById('input-name').value.trim();
  const dosage = document.getElementById('input-dosage').value.trim();
  const slots = [];
  document.querySelectorAll('.time-slot.selected').forEach(s => slots.push(s.dataset.slot));

  if (!name) { showToast('请输入药物名称'); return; }
  if (slots.length === 0) { showToast('请选择服用时段'); return; }

  if (editingId) {
    const m = meds.find(x => x.id === editingId);
    m.name = name; m.dosage = dosage || '按医嘱'; m.slots = slots;
  } else {
    meds.push({ id: genId(), name, dosage: dosage || '按医嘱', slots, active: true });
  }
  save(); closeModal(); renderMeds(); showToast(editingId ? '已更新' : '已添加');
}

function editMed(id) { switchPage('meds'); openModal(id); }

function confirmDelete(id) {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('show');
  overlay.dataset.id = id;
}
function cancelDelete() { document.getElementById('confirm-overlay').classList.remove('show'); }
function doDelete() {
  const id = document.getElementById('confirm-overlay').dataset.id;
  meds = meds.filter(m => m.id !== id);
  Object.keys(records).forEach(day => { delete records[day][id]; });
  save(); cancelDelete(); renderMeds(); showToast('已删除');
}

// History page
function renderHistory() {
  renderStreak();
  renderCalendar();
}

function renderStreak() {
  let streak = 0;
  const d = new Date(); d.setDate(d.getDate() - 1);
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if (isDayComplete(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  if (isDayComplete(todayStr())) streak++;
  document.getElementById('streak-num').textContent = streak;
}

function isDayComplete(dateStr) {
  const activeMeds = meds.filter(m => m.active !== false);
  if (activeMeds.length === 0) return false;
  let total = 0, taken = 0;
  activeMeds.forEach(m => {
    m.slots.forEach(s => {
      total++;
      if (records[dateStr] && records[dateStr][m.id] && records[dateStr][m.id][s]) taken++;
    });
  });
  return total > 0 && taken === total;
}

function getDayStatus(dateStr) {
  const activeMeds = meds.filter(m => m.active !== false);
  if (activeMeds.length === 0) return 'empty';
  let total = 0, taken = 0;
  activeMeds.forEach(m => {
    m.slots.forEach(s => {
      total++;
      if (records[dateStr] && records[dateStr][m.id] && records[dateStr][m.id][s]) taken++;
    });
  });
  if (taken === 0) return 'none';
  if (taken === total) return 'full';
  return 'partial';
}

function renderCalendar() {
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  document.getElementById('cal-month-title').textContent = calYear + '年 ' + monthNames[calMonth];

  const first = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
  const startWeekday = first.getDay();
  const todayS = todayStr();

  let html = '';
  for (let i = 0; i < startWeekday; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= lastDay; d++) {
    const ds = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    let cls = 'cal-day';
    if (ds === todayS) cls += ' today';
    if (ds <= todayS) {
      const status = getDayStatus(ds);
      if (status !== 'empty') cls += ' ' + status;
    }
    if (ds === selectedDate) cls += ' selected';
    html += '<div class="' + cls + '" onclick="selectDate(\'' + ds + '\')">' + d + '</div>';
  }
  document.getElementById('cal-grid').innerHTML = html;
  renderDayDetail(selectedDate || todayS);
}

function prevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function nextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function selectDate(ds) { selectedDate = ds; renderCalendar(); }

function renderDayDetail(ds) {
  const container = document.getElementById('day-detail');
  const d = new Date(ds + 'T00:00:00');
  const title = (d.getMonth()+1) + '月' + d.getDate() + '日 详情';
  const activeMeds = meds.filter(m => m.active !== false);

  if (activeMeds.length === 0) { container.innerHTML = ''; return; }

  let html = '<div class="detail-title">' + title + '</div>';
  const slotOrder = ['morning','noon','evening'];
  slotOrder.forEach(slot => {
    activeMeds.forEach(m => {
      if (!m.slots.includes(slot)) return;
      const isTaken = records[ds] && records[ds][m.id] && records[ds][m.id][slot];
      html += '<div class="detail-item">';
      html += '<div class="detail-status ' + (isTaken ? 'taken' : 'missed') + '">' + (isTaken ? '\u2713' : '\u2013') + '</div>';
      html += '<div class="detail-info"><span class="detail-slot">' + SLOTS[slot] + '</span><span class="detail-name">' + m.name + '</span></div>';
      if (isTaken) html += '<div class="detail-time">' + records[ds][m.id][slot] + '</div>';
      html += '</div>';
    });
  });
  container.innerHTML = html;
}

// Init
document.addEventListener('DOMContentLoaded', function() {
  switchPage('today');
});
