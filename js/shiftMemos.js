// ══════════════════════ 근무 변경 메모 모아보기 ══════════════════════
// 근무표 칸 메모(schedules[wk]._notes, 확정된 주는 confirmedSnapshots[wk][empId].note)를
// 직원별 / 날짜별로 모아서 보여준다. 자동으로 붙는 [추가근무] 줄은 빼고 직접 쓴 메모만 보여준다.

const shiftMemoUi = { view: 'emp' }; // 'emp' | 'date'

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
function _smNote(m) {
  return (m.swapText ? '<div class="sm-swap">🔄 ' + _smEsc(m.swapText) + '</div>' : '')
    + (m.note ? '<div class="sm-note">' + _smEsc(m.note) + '</div>' : '');
}

function renderShiftMemos() {
  const wrap = document.getElementById('shiftMemoList');
  const list = _smFiltered();
  document.getElementById('smCount').textContent = list.length ? '메모 ' + list.length + '건' : '';
  if (!list.length) { wrap.innerHTML = '<div class="sm-empty">이 기간에 근무 변경 메모가 없습니다</div>'; return; }

  if (shiftMemoUi.view === 'emp') {
    const order = state.employees.map(e => e.id);
    const groups = {};
    list.forEach(m => { (groups[m.empId] = groups[m.empId] || []).push(m); });
    const ids = Object.keys(groups).map(Number).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    });
    wrap.innerHTML = '<div class="sm-grid">' + ids.map(id => {
      const items = groups[id].sort((a, b) => a.date.localeCompare(b.date));
      const emp = items[0].emp;
      return '<div class="sm-group">'
        + '<div class="sm-group-hd"><span><b>' + _smEsc(emp.name) + '</b>' + (emp.dept ? ' <span class="sm-dept">' + _smEsc(emp.dept) + '</span>' : '') + '</span><span class="sm-cnt">' + items.length + '건</span></div>'
        + items.map(m => '<div class="sm-row"><div class="sm-row-hd"><span class="sm-date">' + _smDateLabel(m.date) + '</span>' + _smShiftBadge(m) + '</div>' + _smNote(m) + '</div>').join('')
        + '</div>';
    }).join('') + '</div>';
  } else {
    const groups = {};
    list.forEach(m => { (groups[m.date] = groups[m.date] || []).push(m); });
    const dates = Object.keys(groups).sort();
    const order = state.employees.map(e => e.id);
    wrap.innerHTML = dates.map(d => {
      const items = groups[d].sort((a, b) => order.indexOf(a.empId) - order.indexOf(b.empId));
      return '<div class="sm-day">'
        + '<div class="sm-day-hd">' + _smDateLabel(d) + ' <span class="sm-cnt">' + items.length + '건</span></div>'
        + items.map(m => '<div class="sm-row sm-row-inline"><div class="sm-row-hd"><span class="sm-name">' + _smEsc(m.emp.name) + (m.emp.dept ? ' <span class="sm-dept">' + _smEsc(m.emp.dept) + '</span>' : '') + '</span>' + _smShiftBadge(m) + '</div>' + _smNote(m) + '</div>').join('')
        + '</div>';
    }).join('');
  }
}
