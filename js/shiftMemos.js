// ══════════════════════ 근무 변경 메모 모아보기 ══════════════════════
// 근무표 칸 메모(schedules[wk]._notes, 확정된 주는 confirmedSnapshots[wk][empId].note)를
// 직원별 / 날짜별로 모아서 보여준다. 자동으로 붙는 [추가근무] 줄은 빼고 직접 쓴 메모만 보여준다.

const shiftMemoUi = { view: 'emp' }; // 'emp' | 'date'

// 선 아이콘 (이모지 대신)
const SM_ICON = {
  pin: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
  swap: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>',
};

function _smEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _smShiftText(v) {
  if (v === '__off__' || v === 'off' || v == null) return '휴무';
  return shiftLabel(v) || v;
}
function _smDateLabel(dateStr) {
  const d = parseLocalDate(dateStr);
  return (d.getMonth() + 1) + '/' + d.getDate() + '(' + DAY_KO[dateToDayIndex(dateStr)] + ')';
}

// 근무표에서 손대기 전 원래 근무(기본 패턴 기준). getBaseShiftForDate는 수정한 근무를 그대로 돌려주므로 따로 계산한다.
function _smPatternShift(emp, dateStr) {
  if (emp.joinDate && dateStr < emp.joinDate) return '__off__';
  if (emp.leaveDate && dateStr > emp.leaveDate) return '__off__';
  const off = dateToWeekOffset(dateStr);
  const di = dateToDayIndex(dateStr);
  if (!shouldWork(emp, di, off)) return '__off__';
  const pat = getPatternAt(emp.id, dateStr);
  return (pat ? resolveDayPattern(pat[di], off) : null) || 'off';
}

// 메모가 있는 모든 (직원, 날짜)를 모은다.
function collectShiftMemos() {
  const keys = new Set();
  const addWeek = (wk, perEmp, getArr) => {
    const mon = parseLocalDate(wk);
    Object.keys(perEmp || {}).forEach(empId => {
      const arr = getArr(perEmp[empId]);
      if (!arr) return;
      Object.keys(arr).forEach(di => {
        if (!arr[di]) return;
        const d = new Date(mon); d.setDate(mon.getDate() + (+di));
        keys.add(empId + '|' + toLocalDateStr(d));
      });
    });
  };
  Object.keys(state.schedules || {}).forEach(wk => addWeek(wk, state.schedules[wk] && state.schedules[wk]._notes, x => x));
  Object.keys(state.confirmedSnapshots || {}).forEach(wk => addWeek(wk, state.confirmedSnapshots[wk], x => x && x.note));

  // 근무 교환 기록도 교환한 두 직원의 그 날짜 메모로 함께 보여준다 (교환 내역 자체는 그대로 두고 읽기만 함)
  const swapsByKey = {};
  (typeof activeShiftSwaps === 'function' ? activeShiftSwaps() : []).forEach(sw => {
    sw.cells.forEach(c => {
      const k = c.empId + '|' + c.date;
      keys.add(k);
      (swapsByKey[k] = swapsByKey[k] || []).push({ partner: swapPartnerName(sw, c.empId), memo: sw.memo || '' });
    });
  });

  const out = [];
  keys.forEach(k => {
    const [empIdStr, date] = k.split('|');
    const empId = +empIdStr;
    const emp = state.employees.find(e => e.id === empId) || { id: empId, name: '(삭제된 직원)', dept: '' };
    const note = getNoteForDate(emp, date) || '';
    const manual = note.split('\n').filter(l => !l.startsWith('[추가근무]')).join('\n').trim();
    const swaps = swapsByKey[k] || [];
    if (!manual && !swaps.length) return;
    let base = null, cur = null;
    try { base = _smPatternShift(emp, date); cur = getShiftForDate(emp, date); } catch (e) { /* 직원 정보가 없을 때 */ }
    const swapText = swaps.map(x => x.partner + ' 님과 근무 교환' + (x.memo ? ' (' + x.memo + ')' : '')).join('\n');
    out.push({ empId, emp, date, note: manual, swaps, swapText, base, cur, changed: _smShiftText(base) !== _smShiftText(cur) });
  });
  return out;
}

function initShiftMemoTab() {
  const memos = collectShiftMemos();
  const cur = String(TODAY.getFullYear());
  const years = new Set(memos.map(m => m.date.slice(0, 4))); years.add(cur);
  const yrEl = document.getElementById('smYear');
  const prevYear = yrEl.value;
  yrEl.innerHTML = [...years].sort().reverse().map(y => '<option value="' + y + '">' + y + '년</option>').join('');
  yrEl.value = prevYear && years.has(prevYear) ? prevYear : cur;
  const mEl = document.getElementById('smMonth');
  if (!mEl._init) { mEl.value = String(TODAY.getMonth() + 1).padStart(2, '0'); mEl._init = true; }
  const empEl = document.getElementById('smEmpFilter');
  const prevEmp = empEl.value;
  empEl.innerHTML = '<option value="">전체 직원</option>' + state.employees.map(e => '<option value="' + e.id + '">' + _smEsc(e.name) + ' (' + _smEsc(e.dept) + ')</option>').join('');
  empEl.value = prevEmp;
  setShiftMemoView(shiftMemoUi.view);
}

function setShiftMemoView(v) {
  shiftMemoUi.view = v;
  document.getElementById('smViewEmp').className = 'btn sm' + (v === 'emp' ? ' primary' : '');
  document.getElementById('smViewDate').className = 'btn sm' + (v === 'date' ? ' primary' : '');
  renderShiftMemos();
}

function _smFiltered() {
  const year = document.getElementById('smYear').value;
  const month = document.getElementById('smMonth').value;
  const empId = +document.getElementById('smEmpFilter').value || 0;
  const q = (document.getElementById('smSearch').value || '').trim().toLowerCase();
  return collectShiftMemos().filter(m =>
    (!year || m.date.startsWith(year)) &&
    (!month || !year || m.date.startsWith(year + '-' + month)) &&
    (!empId || m.empId === empId) &&
    (!q || m.note.toLowerCase().includes(q) || m.swapText.toLowerCase().includes(q) || m.emp.name.toLowerCase().includes(q)));
}

function _smShiftBadge(m) {
  if (m.changed) {
    return '<span class="sm-shift"><span class="sm-base">' + _smEsc(_smShiftText(m.base)) + '</span> → <b>' + _smEsc(_smShiftText(m.cur)) + '</b></span>';
  }
  return '<span class="sm-shift">' + _smEsc(_smShiftText(m.cur)) + '</span>';
}
function _smEditBtn(m) {
  return '<button class="btn sm sm-edit" onclick="openEditShiftMemo(' + m.empId + ',\'' + m.date + '\')">' + (m.note ? '수정' : '메모 쓰기') + '</button>';
}
function _smNote(m) {
  return (m.swapText ? '<div class="sm-swap">' + _smEsc(m.swapText).split("\n").map(l => SM_ICON.swap + ' ' + l).join("\n") + '</div>' : '')
    + (m.note ? '<div class="sm-note">' + _smEsc(m.note) + '</div>' : '');
}

function _smPinned(empId) { return ((state.pinnedMemos || {})[empId] || '').trim(); }
// 직원별 보기 맨 위에 붙는 고정 메모 (필터: 직원·검색만 적용, 기간과는 상관없음)
function _smPinnedIds() {
  const empId = +document.getElementById('smEmpFilter').value || 0;
  const q = (document.getElementById('smSearch').value || '').trim().toLowerCase();
  return Object.keys(state.pinnedMemos || {}).map(Number).filter(id => {
    const t = _smPinned(id); if (!t) return false;
    if (empId && id !== empId) return false;
    if (!q) return true;
    const emp = state.employees.find(e => e.id === id);
    return t.toLowerCase().includes(q) || (emp && emp.name.toLowerCase().includes(q));
  });
}

function renderShiftMemos() {
  const wrap = document.getElementById('shiftMemoList');
  const list = _smFiltered();
  const pinnedIds = shiftMemoUi.view === 'emp' ? _smPinnedIds() : [];
  document.getElementById('smCount').textContent = list.length ? '메모 ' + list.length + '건' : '';
  if (!list.length && !pinnedIds.length) { wrap.innerHTML = '<div class="sm-empty">이 기간에 근무 변경 메모가 없습니다</div>'; return; }

  if (shiftMemoUi.view === 'emp') {
    const order = state.employees.map(e => e.id);
    const groups = {};
    list.forEach(m => { (groups[m.empId] = groups[m.empId] || []).push(m); });
    pinnedIds.forEach(id => { if (!groups[id]) groups[id] = []; });
    const ids = Object.keys(groups).map(Number).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    });
    wrap.innerHTML = '<div class="sm-grid">' + ids.map(id => {
      const items = groups[id].sort((a, b) => a.date.localeCompare(b.date));
      const emp = state.employees.find(e => e.id === id) || (items[0] && items[0].emp) || { id, name: '(삭제된 직원)', dept: '' };
      const pin = _smPinned(id);
      return '<div class="sm-group">'
        + '<div class="sm-group-hd"><span><b>' + _smEsc(emp.name) + '</b>' + (emp.dept ? ' <span class="sm-dept">' + _smEsc(emp.dept) + '</span>' : '') + '</span>'
        + '<span style="display:flex;align-items:center;gap:6px">' + (items.length ? '<span class="sm-cnt">' + items.length + '건</span>' : '')
        + (pin ? '' : '<button class="btn sm sm-pin-btn" title="이 직원의 고정 메모 쓰기" onclick="openPinnedMemoModal(' + id + ')">' + SM_ICON.pin + ' 고정 메모</button>') + '</span></div>'
        + (pin ? '<div class="sm-pinned"><div class="sm-row-hd"><span class="sm-pin-label">' + SM_ICON.pin + ' 고정 메모</span><button class="btn sm sm-edit" onclick="openPinnedMemoModal(' + id + ')">수정</button></div><div class="sm-note">' + _smEsc(pin) + '</div></div>' : '')
        + items.map(m => '<div class="sm-row"><div class="sm-row-hd"><span class="sm-date">' + _smDateLabel(m.date) + '</span>' + _smShiftBadge(m) + _smEditBtn(m) + '</div>' + _smNote(m) + '</div>').join('')
        + (!items.length ? '<div class="sm-row sm-none">이 기간에 근무 변경 메모가 없어요</div>' : '')
        + '</div>';
    }).join('') + '</div>';
  } else {
    if (!list.length) { wrap.innerHTML = '<div class="sm-empty">이 기간에 근무 변경 메모가 없습니다</div>'; return; }
    const groups = {};
    list.forEach(m => { (groups[m.date] = groups[m.date] || []).push(m); });
    const dates = Object.keys(groups).sort();
    const order = state.employees.map(e => e.id);
    wrap.innerHTML = dates.map(d => {
      const items = groups[d].sort((a, b) => order.indexOf(a.empId) - order.indexOf(b.empId));
      return '<div class="sm-day">'
        + '<div class="sm-day-hd">' + _smDateLabel(d) + ' <span class="sm-cnt">' + items.length + '건</span></div>'
        + items.map(m => '<div class="sm-row sm-row-inline"><div class="sm-row-hd"><span class="sm-name">' + _smEsc(m.emp.name) + (m.emp.dept ? ' <span class="sm-dept">' + _smEsc(m.emp.dept) + '</span>' : '') + '</span>' + _smShiftBadge(m) + _smEditBtn(m) + '</div>' + _smNote(m) + '</div>').join('')
        + '</div>';
    }).join('');
  }
}

// ── 근무 메모 탭에서 메모 추가 / 수정 ──
// 근무표 칸 메모와 같은 곳(schedules[wk]._notes)에 저장한다. [추가근무] 줄은 그대로 둔다.
// 확정된 주는 확정 스냅샷의 메모도 같이 바꿔서 화면에 바로 보이게 한다 (근무 자체는 바꾸지 않음).
function _smOtLines(empId, dateStr) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return [];
  return (getNoteForDate(emp, dateStr) || '').split('\n').filter(l => l.startsWith('[추가근무]'));
}
function _smManualNote(empId, dateStr) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return '';
  return (getNoteForDate(emp, dateStr) || '').split('\n').filter(l => !l.startsWith('[추가근무]')).join('\n').trim();
}
function saveShiftMemo(empId, dateStr, manualText) {
  const otLines = _smOtLines(empId, dateStr);
  const manual = (manualText || '').trim();
  const combined = otLines.join('\n') + (otLines.length && manual ? '\n' : '') + manual;
  const wk = weekKeyForDate(dateStr), di = dateToDayIndex(dateStr);
  if (!state.schedules[wk]) state.schedules[wk] = {};
  if (!state.schedules[wk]._notes) state.schedules[wk]._notes = {};
  if (!state.schedules[wk]._notes[empId]) state.schedules[wk]._notes[empId] = {};
  if (combined.trim()) state.schedules[wk]._notes[empId][di] = combined;
  else delete state.schedules[wk]._notes[empId][di];
  const snap = state.confirmedSnapshots[wk] && state.confirmedSnapshots[wk][empId];
  if (snap && snap.note) snap.note[di] = combined;
  save();
}

function _smFillModalInfo() {
  const m = document.getElementById('shiftMemoModal');
  const pinned = document.getElementById('smmPinned').checked;
  document.getElementById('smmDateWrap').style.display = pinned ? 'none' : '';
  document.getElementById('smmInfo').style.display = pinned ? 'none' : '';
  document.getElementById('smmPinHint').style.display = pinned ? '' : 'none';
  if (pinned) {
    document.getElementById('smmOt').style.display = 'none';
    const ta = document.getElementById('smmText');
    const existing = _smPinned(+document.getElementById('smmEmp').value);
    if (!m._editing) {
      const typed = ta._loaded ? (ta.value.startsWith(ta._loaded) ? ta.value.slice(ta._loaded.length).trim() : ta.value.trim()) : ta.value.trim();
      if (existing) { ta.value = existing + (typed ? '\n' + typed : ''); ta._loaded = existing; } else { ta.value = typed; ta._loaded = false; }
      document.getElementById('smmExisting').style.display = existing ? '' : 'none';
    }
    return;
  }
  const empId = +document.getElementById('smmEmp').value;
  const date = document.getElementById('smmDate').value;
  const info = document.getElementById('smmInfo');
  const otEl = document.getElementById('smmOt');
  const emp = state.employees.find(e => e.id === empId);
  if (!emp || !date) { info.textContent = ''; otEl.style.display = 'none'; return; }
  const cur = getShiftForDate(emp, date), base = _smPatternShift(emp, date);
  let txt = '이 날 근무: ' + (_smShiftText(base) !== _smShiftText(cur) ? _smShiftText(base) + ' → ' + _smShiftText(cur) : _smShiftText(cur));
  const sw = typeof getSwapForCell === 'function' ? getSwapForCell(emp, date) : null;
  if (sw) txt += ' · ' + SM_ICON.swap + ' ' + _smEsc(swapPartnerName(sw, empId)) + ' 님과 근무 교환';
  if (isDateConfirmed(date)) txt += ' · 확정된 주';
  info.innerHTML = txt;
  const ot = _smOtLines(empId, date);
  if (ot.length) { otEl.style.display = ''; otEl.textContent = ot.join('\n'); } else { otEl.style.display = 'none'; otEl.textContent = ''; }
  // 추가 모드에서 이미 메모가 있는 날을 고르면 그 메모를 불러와서 덮어쓰지 않게 한다
  if (!m._editing) {
    const existing = _smManualNote(empId, date);
    const ta = document.getElementById('smmText');
    const typed = ta._loaded ? (ta.value.startsWith(ta._loaded) ? ta.value.slice(ta._loaded.length).trim() : ta.value.trim()) : ta.value.trim();
    if (existing) { ta.value = existing + (typed ? '\n' + typed : ''); ta._loaded = existing; }
    else { ta.value = typed; ta._loaded = false; }
    document.getElementById('smmExisting').style.display = existing ? '' : 'none';
  }
}

function openShiftMemoModal(empId, date, pinned) {
  const m = document.getElementById('shiftMemoModal');
  const editing = !!(empId && (date || pinned));
  m._editing = editing;
  document.getElementById('smmPinned').checked = !!pinned;
  document.getElementById('smmPinRow').style.display = editing ? 'none' : '';
  document.getElementById('smmTitle').innerHTML = pinned ? (editing ? SM_ICON.pin + ' 고정 메모 수정' : SM_ICON.pin + ' 고정 메모 추가') : (editing ? '근무 메모 수정' : '근무 메모 추가');
  const empSel = document.getElementById('smmEmp');
  empSel.innerHTML = state.employees.map(e => '<option value="' + e.id + '">' + _smEsc(e.name) + ' (' + _smEsc(e.dept) + ')</option>').join('');
  const filterEmp = document.getElementById('smEmpFilter').value;
  empSel.value = editing ? empId : (filterEmp || (state.employees[0] && state.employees[0].id) || '');
  empSel.disabled = editing;
  const dateEl = document.getElementById('smmDate');
  dateEl.value = editing ? date : toLocalDateStr(TODAY);
  dateEl.disabled = editing;
  const ta = document.getElementById('smmText');
  ta.value = editing ? (pinned ? _smPinned(empId) : _smManualNote(empId, date)) : ''; ta._loaded = false;
  document.getElementById('smmExisting').style.display = 'none';
  document.getElementById('smmDelete').style.display = editing && ta.value ? '' : 'none';
  _smFillModalInfo();
  m.classList.add('open');
  setTimeout(() => ta.focus(), 50);
}
function openEditShiftMemo(empId, date) { openShiftMemoModal(empId, date); }
function openPinnedMemoModal(empId) { openShiftMemoModal(empId, null, true); }
function onSmmPinnedToggle() {
  const pinned = document.getElementById('smmPinned').checked;
  document.getElementById('smmTitle').innerHTML = pinned ? SM_ICON.pin + ' 고정 메모 추가' : '근무 메모 추가';
  const ta = document.getElementById('smmText');
  if (ta._loaded && ta.value.startsWith(ta._loaded)) ta.value = ta.value.slice(ta._loaded.length).trim();
  ta._loaded = false;
  _smFillModalInfo();
}
function savePinnedMemo(empId, text) {
  if (!state.pinnedMemos) state.pinnedMemos = {};
  const t = (text || '').trim();
  if (t) state.pinnedMemos[empId] = t; else delete state.pinnedMemos[empId];
  save();
}

function submitShiftMemo() {
  const empId = +document.getElementById('smmEmp').value;
  const date = document.getElementById('smmDate').value;
  const text = document.getElementById('smmText').value;
  const isPinned = document.getElementById('smmPinned').checked;
  if (!empId || (!date && !isPinned)) { alert('직원과 날짜를 골라주세요.'); return; }
  const m = document.getElementById('shiftMemoModal');
  if (!m._editing && !text.trim()) { alert('메모 내용을 입력해주세요.'); return; }
  if (isPinned) {
    savePinnedMemo(empId, text);
    closeModal('shiftMemoModal');
    shiftMemoUi.view = 'emp';
    initShiftMemoTab();
    return;
  }
  saveShiftMemo(empId, date, text);
  closeModal('shiftMemoModal');
  initShiftMemoTab();
  if (typeof renderSchedule === 'function') renderSchedule();
}
function deleteShiftMemo() {
  const isPinned = document.getElementById('smmPinned').checked;
  if (!confirm(isPinned ? '이 고정 메모를 삭제할까요?' : '이 메모를 삭제할까요? (근무와 근무 교환 기록은 그대로예요)')) return;
  document.getElementById('smmText').value = '';
  submitShiftMemo();
}
