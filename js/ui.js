// ── UI 렌더링 / 이벤트 배선 ──
// admin4_fixed.html의 화면 렌더링 로직을 다중 파일 구조로 이식.

// ══════════════════════ 공통 ══════════════════════
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  ui.editingCell = null;
  if (id === 'leaveModal') document.getElementById('leaveModal')._editId = null;
}
function renderAll() {
  renderSidebar();
  initWeekDropdowns();
  renderSchedule();
  renderLeaveTable();
  renderEmpTable();
}

function switchTab(tab) {
  ['schedule', 'leave', 'overtime', 'employees'].forEach((t, i) => {
    document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).style.display = t === tab ? '' : 'none';
    const tabBtns = document.querySelectorAll('.header-tabs .tab');
    if (tabBtns[i]) tabBtns[i].className = 'tab' + (t === tab ? ' active' : '');
    const mt = document.getElementById('mtab-' + t);
    if (mt) mt.className = 'mobile-tab' + (t === tab ? ' active' : '');
  });
  document.getElementById('sidebar').style.display = tab === 'schedule' ? '' : 'none';
  closeMobileSidebar();
  if (tab === 'leave') { initLeaveFilters(); initLeaveTableFilters(); renderLeaveTable(); renderLeaveHistory(); initCalendar(); renderLeaveBalanceSimple(); setTimeout(fitTableToScreen, 100); }
  if (tab === 'overtime') { initOvertimeTab(); }
  if (tab === 'employees') { renderEmpTable(); initEmpMemoFilters(); renderEmpMemos(); }
}

let _wasMobileWidth = window.innerWidth <= 768;
function checkMobile() {
  const isMobile = window.innerWidth <= 768;
  const mobileBtn = document.getElementById('mobileSidebarBtn');
  if (mobileBtn) mobileBtn.style.display = isMobile ? '' : 'none';
  // 모바일/데스크톱 경계를 넘어 리사이즈(예: 태블릿 회전)되면 직원 표 레이아웃(카드 vs 표)을 다시 그림
  if (isMobile !== _wasMobileWidth) {
    _wasMobileWidth = isMobile;
    const empTab = document.getElementById('tabEmployees');
    if (empTab && empTab.style.display !== 'none') renderEmpTable();
  }
}
window.addEventListener('resize', checkMobile);

function toggleMobileSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const isOpen = sb.classList.contains('mobile-open');
  if (isOpen) { sb.classList.remove('mobile-open'); ov.classList.remove('open'); }
  else { sb.classList.add('mobile-open'); ov.classList.add('open'); }
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
function toggleSearch() {
  const wrap = document.getElementById('searchWrap');
  const isOpen = wrap.classList.contains('open');
  wrap.classList.toggle('open');
  if (isOpen) { document.getElementById('searchEmp').value = ''; renderSidebar(); }
  else { setTimeout(() => document.getElementById('searchEmp').focus(), 50); }
}
function clearSearch() { document.getElementById('searchEmp').value = ''; ui.selectedEmpId = null; renderSidebar(); renderSchedule(); }

function startEditTitle() {
  const el = document.getElementById('siteTitle');
  const cur = el.textContent;
  const input = document.createElement('input');
  input.value = cur;
  input.style.cssText = 'font-size:15px;font-weight:600;border:none;border-bottom:2px solid #fff;outline:none;background:transparent;color:#fff;font-family:inherit;width:220px;padding:0';
  el.replaceWith(input);
  input.focus(); input.select();
  function commit() {
    const val = input.value.trim() || cur;
    const div = document.createElement('div');
    div.className = 'header-title'; div.id = 'siteTitle'; div.title = '클릭하여 이름 수정'; div.style.cursor = 'pointer';
    div.textContent = val; div.onclick = startEditTitle;
    input.replaceWith(div);
    document.title = val.replace(/^📋\s*/, '');
    try { localStorage.setItem('wms_sitename', val); } catch (e) {}
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = cur; input.blur(); } });
}
function loadSiteTitle() {
  try {
    const saved = localStorage.getItem('wms_sitename');
    if (saved) { const el = document.getElementById('siteTitle'); if (el) { el.textContent = saved; document.title = saved.replace(/^📋\s*/, ''); } }
  } catch (e) {}
}

// 모바일 화면에서 표가 넘칠 때 비율 축소
function fitTableToScreen() {
  if (window.innerWidth > 768) return;
  const targets = [
    { tblId: 'screenSchTable', wrapSel: '.sch-wrap' },
    { tblId: 'screenSummary', wrapSel: '.sum-wrap' },
    { tblId: 'leaveTable', wrapId: 'leaveTableWrap' },
    { tblId: 'overtimeTable', wrapId: 'overtimeTableWrap' },
  ];
  targets.forEach(({ tblId, wrapSel, wrapId }) => {
    const tbl = document.getElementById(tblId); if (!tbl) return;
    const wrap = wrapId ? document.getElementById(wrapId) : tbl.closest(wrapSel); if (!wrap) return;
    tbl.style.transform = ''; tbl.style.transformOrigin = ''; wrap.style.height = ''; wrap.style.overflow = 'visible';
    const tblW = tbl.scrollWidth, wrapW = wrap.clientWidth;
    if (tblW > wrapW && wrapW > 0) {
      const scale = wrapW / tblW;
      tbl.style.transform = 'scale(' + scale + ')'; tbl.style.transformOrigin = 'top left';
      wrap.style.height = (tbl.scrollHeight * scale) + 'px';
    }
  });
}
function fitCalToScreen() {
  if (window.innerWidth > 768) return;
  [['calGrid', 'calGridWrap'], ['otCalGrid', 'otCalGridWrap']].forEach(([gridId, wrapId]) => {
    const grid = document.getElementById(gridId);
    const wrap = document.getElementById(wrapId) || (grid && grid.parentElement);
    if (!grid || !wrap) return;
    grid.style.transform = ''; grid.style.transformOrigin = ''; wrap.style.height = '';
    const gridW = grid.scrollWidth, wrapW = wrap.clientWidth || wrap.offsetWidth;
    if (gridW > 0 && wrapW > 0 && gridW > wrapW) {
      const scale = wrapW / gridW;
      grid.style.transform = 'scale(' + scale + ')'; grid.style.transformOrigin = 'top left';
      wrap.style.height = (grid.scrollHeight * scale) + 'px'; wrap.style.overflow = 'visible';
    }
  });
}
window.addEventListener('resize', fitCalToScreen);

document.addEventListener('click', e => {
  // 모달 배경 클릭 시 닫기 (index.html 로드 후 위임)
});

// ══════════════════════ 사이드바 ══════════════════════
function renderSidebar() {
  const q = (document.getElementById('searchEmp').value || '').trim().toLowerCase();
  let html = '';
  DEPTS.forEach(dept => {
    const emps = state.employees.filter(e => e.dept === dept && (!q || e.name.toLowerCase().includes(q)));
    if (!emps.length) return;
    html += '<div class="sidebar-label">' + dept + '</div>';
    emps.forEach(e => {
      const [bg, fg] = COLORS[e.color % COLORS.length];
      const tag = e.workType === 'biweek_odd' ? '<span style="font-size:9px;color:#999"> 홀수</span>' : e.workType === 'biweek_even' ? '<span style="font-size:9px;color:#999"> 짝수</span>' : '';
      const ptTag = e.employmentType === 'parttime' ? '<span style="font-size:9px;color:#e65100"> PT</span>' : '';
      html += '<div class="emp-item' + (ui.selectedEmpId === e.id ? ' selected' : '') + '" onclick="selectEmp(' + e.id + ')">'
        + '<div class="avatar" style="background:' + bg + ';color:' + fg + '">' + e.name[0] + '</div>'
        + '<div class="emp-name-s">' + e.name + tag + ptTag + '</div></div>';
    });
  });
  document.getElementById('empList').innerHTML = html;
}
function selectEmp(id) { ui.selectedEmpId = ui.selectedEmpId === id ? null : id; renderSidebar(); renderSchedule(); }

// ══════════════════════ 근무표 ══════════════════════
function buildSchTable(el, off) {
  const days = getWeekDays(off);
  const emps = ui.selectedEmpId ? state.employees.filter(e => e.id === ui.selectedEmpId) : state.employees;
  const depts = DEPTS.filter(d => emps.some(e => e.dept === d));
  const isMobile = window.innerWidth <= 768;
  const deptW = isMobile ? '22px' : '44px';
  const nameW = isMobile ? '40px' : '72px';
  let html = '<colgroup><col style="width:' + deptW + '"><col style="width:' + nameW + '">' + days.map(() => '<col>').join('') + '</colgroup>'
    + '<thead><tr><th>부서</th><th style="text-align:left;padding-left:7px">직원</th>'
    + days.map((d, i) => {
        const dateStr = toLocalDateStr(d);
        const hol = isHoliday(dateStr);
        const wknd = i >= 5 || hol;
        const holName = hol ? getHolidayName(dateStr) : '';
        return '<th class="' + (wknd ? 'wknd' : '') + '"' + (hol ? ' title="' + holName + '"' : '') + '>' + DAY_KO[i] + (hol ? ' 🔴' : '') + '<br><span style="font-weight:400;font-size:10px">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></th>';
      }).join('')
    + '</tr></thead><tbody>';
  const colCount = days.length + 2;
  depts.forEach((dept, deptIdx) => {
    const de = emps.filter(e => e.dept === dept && isActiveForWeek(e, off));
    if (!de.length) return;
    if (deptIdx > 0) html += '<tr><td colspan="' + colCount + '" style="height:8px;background:#f5f4f0;border:none;padding:0"></td></tr>';
    de.forEach((emp, ri) => {
      html += '<tr>';
      if (ri === 0) html += '<td class="dept-cell" rowspan="' + de.length + '">' + dept + '</td>';
      html += '<td class="emp-cell"><span style="font-size:12px;font-weight:600">' + emp.name + '</span></td>';
      days.forEach((dayDate, di) => {
        const dateStr = toLocalDateStr(dayDate);
        const sh = getShift(emp, di, off);
        if (sh === '__off__') {
          html += '<td onclick="openShiftEdit(' + emp.id + ',' + di + ')" style="cursor:pointer">'
            + '<div style="width:100%;height:40px;display:flex;align-items:center;justify-content:center;background:#f7f7f7"><span style="font-size:10px;color:#ccc">—</span></div></td>';
          return;
        }
        let lb, cl, extraLabel = '';
        const k = weekKey(off);
        const isManuallySet = state.schedules[k]?.[emp.id]?.[di] !== undefined;
        const otRange = getWorkedRangeForDate(emp, dateStr);

        if (sh === 'half' || sh === 'half_pm') {
          const base = getBaseShift(emp, di, off);
          lb = getHalfLabel(base, sh); cl = 's-half';
          extraLabel = '<div style="font-size:9px;color:#880e4f;margin-top:1px;pointer-events:none">' + (sh === 'half' ? '오전반차' : '오후반차') + '</div>';
        } else if (sh === 'off' && isManuallySet) {
          lb = ''; cl = '';
        } else if (isFullShiftKey(sh) && otRange) {
          // 기능5: 추가근무가 있으면 실제 근무 구간을 표시 (예: 10-20 + 3h → 10-23)
          lb = otRange.text; cl = SHIFT_CLS[sh] || '';
        } else {
          cl = SHIFT_CLS[sh] || ''; lb = SHIFT_LABEL[sh] || '';
        }

        const noteText = getNote(emp.id, di, off);
        const hasOtNote = noteText && noteText.includes('[추가근무]');
        const hasManualNote = noteText && noteText.split('\n').some(l => !l.startsWith('[추가근무]') && l.trim());
        const noteDot = hasOtNote && hasManualNote
          ? '<span title="' + noteText + '" style="position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#1565c0 50%,#f57f17 50%);pointer-events:none"></span>'
          : hasOtNote
          ? '<span title="' + noteText + '" style="position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:#1565c0;pointer-events:none"></span>'
          : hasManualNote
          ? '<span title="' + noteText + '" style="position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:#f57f17;pointer-events:none"></span>' : '';
        html += '<td onclick="openShiftEdit(' + emp.id + ',' + di + ')">'
          + '<div class="shift-cell" style="flex-direction:column;gap:0;position:relative">'
          + noteDot
          + (lb ? '<div class="shift-pill ' + cl + '" style="pointer-events:none">' + lb + '</div>' : '<span style="font-size:10px;color:#ccc">-</span>')
          + extraLabel
          + '</div></td>';
      });
      html += '</tr>';
    });
  });
  el.innerHTML = html + '</tbody>';
}

function buildSummaryTable(el, off) {
  const days = getWeekDays(off);
  const activeDepts = DEPTS.filter(d => state.employees.some(e => e.dept === d));
  const shiftDefs = [{ keys: AM_KEYS, label: '오전', cls: 's-1020' }, { keys: PM_KEYS, label: '오후', cls: 's-1323' }];
  const isMobile = window.innerWidth <= 768;
  const shiftW = isMobile ? '20px' : '44px';
  const deptW = isMobile ? '28px' : '72px';
  let html = '<colgroup><col style="width:' + shiftW + '"><col style="width:' + deptW + '">' + days.map(() => '<col>').join('') + '</colgroup>'
    + '<thead><tr><th colspan="2"></th>'
    + days.map((d, i) => {
        const hol = isHoliday(toLocalDateStr(d));
        return '<th class="' + ((i >= 5 || hol) ? 'wknd' : '') + '">' + DAY_KO[i] + '<br><span style="font-weight:400;font-size:10px">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></th>';
      }).join('')
    + '</tr></thead><tbody>';
  shiftDefs.forEach((sd, sdIdx) => {
    const rowDepts = activeDepts.filter(d => !PM_EXCLUDE_DEPTS.includes(d) || sd.keys === AM_KEYS);
    if (!rowDepts.length) return;
    if (sdIdx > 0) { const colCount = days.length + 2; html += '<tr><td colspan="' + colCount + '" style="height:8px;background:#f5f4f0;border:none;padding:0"></td></tr>'; }
    rowDepts.forEach((dept, di) => {
      const dEmps = state.employees.filter(e => e.dept === dept);
      html += '<tr>';
      if (di === 0) html += '<td class="sum-shift-cell" rowspan="' + rowDepts.length + '"><div class="sum-shift-inner"><div class="shift-pill ' + sd.cls + '" style="font-size:10px">' + sd.label + '</div></div></td>';
      html += '<td class="sum-dept-cell" style="width:80px">' + dept + '</td>';
      days.forEach((_, di2) => {
        const entries = dEmps.filter(e => isActiveForWeek(e, off)).map(e => { const { shiftKey, isHalf, halfType } = getDisplayInfo(e, di2, off); return { name: e.name, shiftKey, isHalf, halfType }; }).filter(x => sd.keys.includes(x.shiftKey));
        const cell = entries.map(x => {
          if (x.isHalf) { const timeLabel = getHalfLabel(x.shiftKey, x.halfType); return x.name + '<span style="font-size:9px;color:#c0392b">(' + timeLabel + ')</span>'; }
          return x.name;
        }).join('<br>');
        html += '<td class="sum-name-cell">' + (cell || '<span style="color:#ddd">-</span>') + '</td>';
      });
      html += '</tr>';
    });
  });
  el.innerHTML = html + '</tbody>';
}

function renderConfirmBadgeAndButtons() {
  const off = ui.weekOffset;
  const k = weekKey(off);
  const isConf = isWeekConfirmed(off);
  const badge = document.getElementById('confirmBadge');
  badge.className = 'confirm-badge ' + (isConf ? 'confirmed' : 'unconfirmed');
  badge.textContent = isConf ? '✓ 확정됨' : '● 미확정';
  const confirmBtn = document.getElementById('confirmScheduleBtn');
  const unconfirmBtn = document.getElementById('unconfirmScheduleBtn');
  const resetBtn = document.getElementById('resetWeekBtn');
  if (confirmBtn) confirmBtn.style.display = isConf ? 'none' : '';
  if (unconfirmBtn) unconfirmBtn.style.display = isConf ? '' : 'none';
  if (resetBtn) resetBtn.disabled = isConf;
}

function renderSchedule() {
  syncWeekDropdowns();
  const odd = isOddWeek(ui.weekOffset);
  const wb = document.getElementById('weekTypeBadge');
  wb.textContent = odd ? '홀수 주' : '짝수 주';
  wb.style.background = odd ? '#e8f5e9' : '#e3f2fd';
  wb.style.color = odd ? '#2e7d32' : '#1565c0';
  renderConfirmBadgeAndButtons();
  buildSchTable(document.getElementById('screenSchTable'), ui.weekOffset);
  buildSummaryTable(document.getElementById('screenSummary'), ui.weekOffset);
  updateStats();
  renderHolidayManager();
  renderHolidayReport();
  setTimeout(fitTableToScreen, 50);
}

// ── 주차 드롭다운 ──
function initWeekDropdowns() {
  const yr = document.getElementById('weekYearSel');
  const cur = TODAY.getFullYear();
  yr.innerHTML = [cur - 1, cur, cur + 1].map(y => '<option value="' + y + '"' + (y === cur ? ' selected' : '') + '>' + y + '년</option>').join('');
  populateWeekMonthSel();
  populateWeekPickSel(cur, TODAY.getMonth());
  syncWeekDropdowns();
}
function populateWeekMonthSel() {
  document.getElementById('weekMonthSel').innerHTML = Array.from({ length: 12 }, (_, i) => '<option value="' + i + '">' + (i + 1) + '월</option>').join('');
}
function populateWeekPickSel(year, month) {
  const el = document.getElementById('weekPickSel');
  const weeks = getWeeksInMonth(year, month);
  const fmt = d => (d.getMonth() + 1) + '/' + d.getDate();
  el.innerHTML = weeks.map(off => {
    const days = getWeekDays(off);
    const label = days[0].getFullYear() + '년 ' + fmt(days[0]) + ' ~ ' + fmt(days[6]);
    const odd = isOddWeek(off);
    const conf = isWeekConfirmed(off) ? ' ✓' : '';
    return '<option value="' + off + '">' + label + ' (' + (odd ? '홀' : '짝') + '주)' + conf + '</option>';
  }).join('');
}
function syncWeekDropdowns() {
  const days = getWeekDays(ui.weekOffset);
  const year = days[0].getFullYear(), month = days[0].getMonth();
  const yr = document.getElementById('weekYearSel'), mo = document.getElementById('weekMonthSel'), pk = document.getElementById('weekPickSel');
  if (!yr || !mo || !pk) return;
  if (yr.value != year) { yr.value = year; if (!yr.value) { yr.innerHTML += '<option value="' + year + '">' + year + '년</option>'; yr.value = year; } }
  mo.value = month;
  populateWeekPickSel(year, month);
  pk.value = ui.weekOffset;
  if (pk.value != ui.weekOffset) {
    const fmt = d => (d.getMonth() + 1) + '/' + d.getDate();
    const d0 = getWeekDays(ui.weekOffset);
    const label = d0[0].getFullYear() + '년 ' + fmt(d0[0]) + ' ~ ' + fmt(d0[6]);
    pk.innerHTML = '<option value="' + ui.weekOffset + '">' + label + '</option>' + pk.innerHTML;
    pk.value = ui.weekOffset;
  }
}
function onWeekSelChange() { populateWeekPickSel(+document.getElementById('weekYearSel').value, +document.getElementById('weekMonthSel').value); }
function onWeekPick() { ui.weekOffset = +document.getElementById('weekPickSel').value; renderSchedule(); }
function goToThisWeek() { ui.weekOffset = 0; renderSchedule(); }
function changeWeek(dir) { ui.weekOffset += dir; renderSchedule(); }
function updateStats() {
  document.getElementById('statTotal').textContent = state.employees.length;
  DEPTS.forEach((dept, i) => { const el = document.getElementById('statDept' + i); if (el) el.textContent = state.employees.filter(e => e.dept === dept).length; });
}

// ── 확정/해제/초기화 UI 래퍼 ──
function confirmScheduleUI() { confirmSchedule(ui.weekOffset); renderSchedule(); }
function unconfirmScheduleUI() { unconfirmSchedule(ui.weekOffset); }
function resetWeekScheduleUI() { resetWeekSchedule(ui.weekOffset); }

// ── 근무 교대 (직원끼리 서로 근무 맞바꾸기, 같은 부서만) ──
function swapShiftLabel(emp, dateStr) {
  const sh = getShiftForDate(emp, dateStr);
  if (sh === '__off__') return '휴무 (원래 비근무일)';
  if (sh === 'off') return '휴무';
  if (sh === 'annual') return '연차';
  if (sh === 'half' || sh === 'half_pm') { const base = getBaseShiftForDate(emp, dateStr); return getHalfLabel(base, sh); }
  return SHIFT_LABEL[sh] || sh;
}
function isSwappableShift(sh) { return sh === '1020' || sh === '1019' || sh === '1323' || sh === 'half' || sh === 'half_pm'; }

function openSwapModal() {
  const opts = state.employees.filter(e => !isResigned(e)).map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('swapEmpA').innerHTML = '<option value="">선택</option>' + opts;
  document.getElementById('swapEmpB').innerHTML = '<option value="">먼저 A를 선택하세요</option>';
  document.getElementById('swapDateA').value = '';
  document.getElementById('swapDateB').value = '';
  document.getElementById('swapAInfo').textContent = '';
  document.getElementById('swapBInfo').textContent = '';
  document.getElementById('swapPreview').style.display = 'none';
  document.getElementById('swapModal').classList.add('open');
}
function onSwapChange() {
  const aId = +document.getElementById('swapEmpA').value || null;
  const bSel = document.getElementById('swapEmpB');
  const prevB = bSel.value;
  const empA = state.employees.find(e => e.id === aId);
  if (empA) {
    const sameDept = state.employees.filter(e => !isResigned(e) && e.dept === empA.dept && e.id !== aId);
    bSel.innerHTML = '<option value="">선택</option>' + sameDept.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('');
    if (sameDept.some(e => String(e.id) === prevB)) bSel.value = prevB;
  } else {
    bSel.innerHTML = '<option value="">먼저 A를 선택하세요</option>';
  }
  const dateA = document.getElementById('swapDateA').value;
  const bId = +bSel.value || null;
  const empB = state.employees.find(e => e.id === bId);
  const dateB = document.getElementById('swapDateB').value;

  document.getElementById('swapAInfo').textContent = (empA && dateA) ? ('현재: ' + swapShiftLabel(empA, dateA)) : '';
  document.getElementById('swapBInfo').textContent = (empB && dateB) ? ('현재: ' + swapShiftLabel(empB, dateB)) : '';

  const preview = document.getElementById('swapPreview');
  if (empA && empB && dateA && dateB) {
    preview.style.display = '';
    preview.innerHTML = empA.name + ' (' + dateA + '): <strong>' + swapShiftLabel(empA, dateA) + '</strong> → <strong>' + swapShiftLabel(empB, dateB) + '</strong><br>'
      + empB.name + ' (' + dateB + '): <strong>' + swapShiftLabel(empB, dateB) + '</strong> → <strong>' + swapShiftLabel(empA, dateA) + '</strong>';
  } else {
    preview.style.display = 'none';
  }
}
function submitSwap() {
  const aId = +document.getElementById('swapEmpA').value || null;
  const bId = +document.getElementById('swapEmpB').value || null;
  const dateA = document.getElementById('swapDateA').value;
  const dateB = document.getElementById('swapDateB').value;
  const empA = state.employees.find(e => e.id === aId);
  const empB = state.employees.find(e => e.id === bId);
  if (!empA || !empB || !dateA || !dateB) { alert('직원 A/B와 날짜를 모두 선택하세요.'); return; }
  if (empA.dept !== empB.dept) { alert('같은 부서끼리만 근무를 바꿀 수 있습니다.'); return; }
  if (isWeekConfirmed(dateToWeekOffset(dateA)) || isWeekConfirmed(dateToWeekOffset(dateB))) {
    alert('해당 날짜가 포함된 주가 이미 확정되어 있습니다. 먼저 확정을 해제한 뒤 다시 시도해주세요.'); return;
  }
  const shiftA = getShiftForDate(empA, dateA);
  const shiftB = getShiftForDate(empB, dateB);
  if (!isSwappableShift(shiftA) || !isSwappableShift(shiftB)) {
    alert('연차나 휴무는 근무 교대로 처리할 수 없습니다. 실제 근무일끼리만 바꿀 수 있어요.'); return;
  }
  setShiftRaw(empA.id, dateToDayIndex(dateA), shiftB, dateToWeekOffset(dateA));
  setShiftRaw(empB.id, dateToDayIndex(dateB), shiftA, dateToWeekOffset(dateB));
  closeModal('swapModal');
  renderSchedule();
  alert(empA.name + '님과 ' + empB.name + '님의 근무를 맞바꿨습니다.');
}

// ── 근무 변경 모달 ──
function openShiftEdit(empId, di) {
  if (isWeekConfirmed(ui.weekOffset)) { alert('이 주는 확정되어 있습니다. 수정하려면 먼저 확정을 해제하세요.'); return; }
  ui.editingCell = { empId, di };
  const emp = state.employees.find(e => e.id === empId);
  const d = getWeekDays(ui.weekOffset)[di];
  const isOrigOff = !shouldWork(emp, di, ui.weekOffset);
  document.getElementById('shiftModalTitle').innerHTML = emp.name + ' — ' + (d.getMonth() + 1) + '/' + d.getDate() + ' 근무 변경'
    + (isOrigOff ? ' <span style="font-size:11px;font-weight:400;color:#f57f17">(원래 비근무일)</span>' : '');
  const cur = getShift(emp, di, ui.weekOffset);
  document.getElementById('shiftSelect').value = (cur === '__off__') ? 'off' : cur;
  const fullNote = getNote(empId, di, ui.weekOffset);
  const otLines = fullNote.split('\n').filter(l => l.startsWith('[추가근무]'));
  const manualLines = fullNote.split('\n').filter(l => !l.startsWith('[추가근무]')).join('\n').trim();
  const otNoteEl = document.getElementById('shiftOtNote');
  if (otLines.length) { otNoteEl.style.display = ''; otNoteEl.textContent = otLines.join('\n'); }
  else { otNoteEl.style.display = 'none'; otNoteEl.textContent = ''; }
  document.getElementById('shiftNote').value = manualLines;
  document.getElementById('shiftModal').classList.add('open');
}
function applyShift() {
  const { empId, di } = ui.editingCell;
  const sel = document.getElementById('shiftSelect').value;
  const emp = state.employees.find(e => e.id === empId);
  const isOrigOff = !shouldWork(emp, di, ui.weekOffset);
  const dateStr = toLocalDateStr(getWeekDays(ui.weekOffset)[di]);

  const existingIdx = state.leaveRequests.findIndex(r => r.empId === empId && r.start === dateStr && r.end === dateStr && (r.type === 'annual' || r.type === 'half' || r.type === 'half_pm'));

  if (sel === 'annual' || sel === 'half' || sel === 'half_pm') {
    if (existingIdx >= 0) { state.leaveRequests[existingIdx].type = sel; }
    else { state.leaveRequests.push({ id: nextId(state.leaveRequests), empId, type: sel, start: dateStr, end: dateStr, reason: '근무표에서 등록', status: 'approved', createdAt: toLocalDateStr(TODAY) }); }
    const k = weekKey(ui.weekOffset);
    if (state.schedules[k]?.[empId]?.[di] !== undefined) delete state.schedules[k][empId][di];
    state.confirmed[k] = false;
  } else {
    if (existingIdx >= 0) state.leaveRequests.splice(existingIdx, 1);
    if (isOrigOff && sel === 'off') {
      const k = weekKey(ui.weekOffset);
      if (state.schedules[k]?.[empId]?.[di] !== undefined) { delete state.schedules[k][empId][di]; state.confirmed[k] = false; }
    } else {
      setShiftRaw(empId, di, sel, ui.weekOffset);
    }
  }
  const manualNote = document.getElementById('shiftNote').value;
  const existingNote = getNote(empId, di, ui.weekOffset);
  const otLines = existingNote.split('\n').filter(l => l.startsWith('[추가근무]'));
  const combined = otLines.join('\n') + (otLines.length && manualNote.trim() ? '\n' : '') + manualNote;
  setNote(empId, di, combined, ui.weekOffset);
  save(); closeModal('shiftModal'); renderSchedule();
}

// ══════════════════════ 공휴일 관리 (근무표 탭) ══════════════════════
function renderHolidayManager() {
  const wrap = document.getElementById('holidayManagerWrap'); if (!wrap) return;
  const days = getWeekDays(ui.weekOffset);
  const y = days[0].getFullYear(), m = days[0].getMonth();
  const monthStr = y + '-' + String(m + 1).padStart(2, '0');
  const allDates = new Set([...Object.keys(KOREAN_HOLIDAYS_DEFAULT).filter(d => d.startsWith(monthStr)), ...Object.keys(state.holidayOverrides || {}).filter(d => d.startsWith(monthStr))]);
  const list = [...allDates].sort().map(d => {
    const hol = isHoliday(d);
    const isOverridden = Object.prototype.hasOwnProperty.call(state.holidayOverrides || {}, d);
    const name = getHolidayName(d) || (Object.prototype.hasOwnProperty.call(KOREAN_HOLIDAYS_DEFAULT, d) ? KOREAN_HOLIDAYS_DEFAULT[d] : '지정 휴일');
    return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">'
      + '<span style="min-width:80px;font-weight:600;' + (hol ? 'color:#c0392b' : 'color:#aaa;text-decoration:line-through') + '">' + d + '</span>'
      + '<span style="flex:1;color:#666">' + name + (isOverridden ? ' <span style="font-size:10px;color:#1565c0">(수동설정)</span>' : '') + '</span>'
      + '<button class="btn sm" onclick="toggleHoliday(\'' + d + '\');renderSchedule();">' + (hol ? '해제' : '지정') + '</button>'
      + (isOverridden ? '<button class="btn sm" onclick="clearHolidayOverride(\'' + d + '\');save();renderSchedule();">기본값</button>' : '')
      + '</div>';
  }).join('');
  wrap.innerHTML = (list || '<div style="color:#aaa;font-size:12px">이 달에는 등록된 공휴일이 없습니다</div>');
}
function addHolidayFromInput() {
  const v = document.getElementById('holidayDateInput').value;
  if (!v) return;
  setHolidayOverride(v, true);
  save(); renderSchedule();
}

// ══════════════════════ 월별 공휴일 근무 리포트 ══════════════════════
function initHolidayReportSel() {
  const yr = document.getElementById('hrYearSel'); if (!yr) return;
  const cur = TODAY.getFullYear();
  yr.innerHTML = [cur - 1, cur, cur + 1].map(y => '<option value="' + y + '">' + y + '년</option>').join('');
  yr.value = cur;
  const mo = document.getElementById('hrMonthSel');
  mo.innerHTML = Array.from({ length: 12 }, (_, i) => '<option value="' + i + '">' + (i + 1) + '월</option>').join('');
  mo.value = TODAY.getMonth();
}
function renderHolidayReport() {
  const wrap = document.getElementById('holidayReportWrap'); if (!wrap) return;
  const yEl = document.getElementById('hrYearSel'), mEl = document.getElementById('hrMonthSel');
  if (!yEl.value) initHolidayReportSel();
  const year = +yEl.value, month = +mEl.value;
  const report = calcHolidayWorkedReport(year, month);
  const holHtml = report.holidays.length
    ? report.holidays.map(h => '<span style="display:inline-block;margin:2px 6px 2px 0;font-size:11px;color:#c0392b">' + h.date + ' (' + (h.name || '') + ')</span>').join('')
    : '<span style="color:#aaa;font-size:12px">이 달에는 공휴일이 없습니다</span>';
  function groupHtml(g) {
    if (!g.employees.length) return '<div style="color:#aaa;font-size:12px;padding:6px 0">해당 그룹에서 공휴일 근무 내역이 없습니다</div>';
    return '<table class="lv-table" style="font-size:12px"><thead><tr><th>이름</th><th>부서</th><th>공휴일 근무일수</th><th>공휴일 근무시간</th></tr></thead><tbody>'
      + g.employees.map(e => '<tr><td><strong>' + e.name + '</strong></td><td style="color:#888">' + e.dept + '</td><td style="text-align:center">' + e.holidaysWorked + '일</td><td style="text-align:center;font-weight:600;color:#1565c0">' + e.totalHours + '시간</td></tr>').join('')
      + '</tbody></table>';
  }
  wrap.innerHTML = '<div style="margin-bottom:10px">' + holHtml + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    + '<div><div style="font-weight:600;font-size:12px;margin-bottom:6px;color:#1565c0">약사 (합계 ' + report.groups.pharmacist.totalHours + '시간)</div>' + groupHtml(report.groups.pharmacist) + '</div>'
    + '<div><div style="font-weight:600;font-size:12px;margin-bottom:6px;color:#1565c0">그 외 전체 직원 (합계 ' + report.groups.others.totalHours + '시간)</div>' + groupHtml(report.groups.others) + '</div>'
    + '</div>';
}
function onHolidayReportSelChange() { renderHolidayReport(); }

// ══════════════════════ 근무 명단 요약 모달 ══════════════════════
function openSummaryModal() {
  ui.smOffset = ui.weekOffset;
  initSmDropdowns();
  renderSummaryModal();
  document.getElementById('summaryModal').classList.add('open');
}
function initSmDropdowns() {
  const yr = document.getElementById('smYearSel'); const cur = TODAY.getFullYear();
  yr.innerHTML = [cur - 1, cur, cur + 1].map(y => '<option value="' + y + '"' + (y === cur ? ' selected' : '') + '>' + y + '년</option>').join('');
  document.getElementById('smMonthSel').innerHTML = Array.from({ length: 12 }, (_, i) => '<option value="' + i + '">' + (i + 1) + '월</option>').join('');
  syncSmDropdowns();
}
function syncSmDropdowns() {
  const days = getWeekDays(ui.smOffset);
  const year = days[0].getFullYear(), month = days[0].getMonth();
  const yr = document.getElementById('smYearSel'), mo = document.getElementById('smMonthSel'), pk = document.getElementById('smWeekSel');
  if (!yr || !mo || !pk) return;
  yr.value = year; mo.value = month;
  const weeks = getWeeksInMonth(year, month);
  const fmt = d => (d.getMonth() + 1) + '/' + d.getDate();
  pk.innerHTML = weeks.map(off => { const ds = getWeekDays(off); const label = ds[0].getFullYear() + '년 ' + fmt(ds[0]) + ' ~ ' + fmt(ds[6]); return '<option value="' + off + '">' + label + ' (' + (isOddWeek(off) ? '홀' : '짝') + '주)</option>'; }).join('');
  pk.value = ui.smOffset;
  if (pk.value != ui.smOffset) {
    const ds = getWeekDays(ui.smOffset);
    pk.innerHTML = '<option value="' + ui.smOffset + '">' + ds[0].getFullYear() + '년 ' + fmt(ds[0]) + ' ~ ' + fmt(ds[6]) + '</option>' + pk.innerHTML;
    pk.value = ui.smOffset;
  }
  const badge = document.getElementById('smWeekBadge');
  if (badge) { const odd = isOddWeek(ui.smOffset); badge.textContent = odd ? '홀수 주' : '짝수 주'; badge.style.background = odd ? '#e8f5e9' : '#e3f2fd'; badge.style.color = odd ? '#2e7d32' : '#1565c0'; }
}
function onSmSelChange() {
  const year = +document.getElementById('smYearSel').value, month = +document.getElementById('smMonthSel').value;
  const weeks = getWeeksInMonth(year, month);
  ui.smOffset = weeks[0];
  syncSmDropdowns(); renderSummaryModal();
}
function onSmWeekPick() { ui.smOffset = +document.getElementById('smWeekSel').value; syncSmDropdowns(); renderSummaryModal(); }
function smChangeWeek(dir) { ui.smOffset += dir; syncSmDropdowns(); renderSummaryModal(); }
function smGoToday() { ui.smOffset = 0; syncSmDropdowns(); renderSummaryModal(); }
function renderSummaryModal() { const el = document.getElementById('summaryModalTable'); if (!el) return; buildSummaryTable(el, ui.smOffset); }

// ══════════════════════ 연차/반차 탭 ══════════════════════
// 기능4: 파트타임 직원은 연차/반차 시스템에서 완전히 제외 (드롭다운/잔여현황/이력 전부)
function initLeaveFilters() {
  document.getElementById('leaveEmpFilter').innerHTML = '<option value="">전체 직원</option>' + fulltimeEmployees().map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('leaveYearFilter').innerHTML = buildYearOptions();
}
function initLeaveTableFilters() {
  const el = document.getElementById('leaveTableYear'); if (!el) return;
  el.innerHTML = buildYearOptions();
  const m = String(TODAY.getMonth() + 1).padStart(2, '0');
  const ms = document.getElementById('leaveTableMonth'); if (ms) ms.value = m;
}
function ftLeaveRequests() {
  const ftIds = new Set(fulltimeEmployees().map(e => e.id));
  return state.leaveRequests.filter(r => ftIds.has(r.empId));
}
function renderLeaveTable() {
  const year = document.getElementById('leaveTableYear')?.value || '';
  const month = document.getElementById('leaveTableMonth')?.value || '';
  let filtered = ftLeaveRequests();
  if (year) filtered = filtered.filter(r => r.start.startsWith(year) || (month === '' && r.end.startsWith(year)));
  if (month && year) { const ym = year + '-' + month; filtered = filtered.filter(r => r.start.startsWith(ym) || r.end.startsWith(ym) || (r.start < ym + '-01' && r.end >= ym + '-01')); }
  filtered = filtered.sort((a, b) => b.start.localeCompare(a.start));
  let html = '<thead><tr><th>직원</th><th>유형</th><th>신청일</th><th>기간</th><th>사유</th><th>관리</th></tr></thead><tbody>';
  if (!filtered.length) html += '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:16px">해당 내역이 없습니다</td></tr>';
  else filtered.forEach(lr => {
    const emp = state.employees.find(e => e.id === lr.empId); if (!emp) return;
    const tl = lr.type === 'annual' ? '연차' : lr.type === 'half' ? '반차(오전)' : '반차(오후)';
    html += '<tr><td><strong>' + emp.name + '</strong> <span style="font-size:11px;color:#aaa">' + emp.dept + '</span></td>'
      + '<td>' + tl + '</td>'
      + '<td style="font-size:11px;color:#888">' + (lr.createdAt || '-') + '</td>'
      + '<td>' + (lr.start === lr.end ? lr.start : lr.start + '~' + lr.end) + '</td>'
      + '<td style="color:#888">' + (lr.reason || '-') + '</td>'
      + '<td style="white-space:nowrap"><button class="btn sm" onclick="openEditLeave(' + lr.id + ')">수정</button> <button class="btn sm danger" onclick="deleteLeaveUI(' + lr.id + ')">삭제</button></td></tr>';
  });
  document.getElementById('leaveTable').innerHTML = html + '</tbody>';
}
function openEditLeave(id) {
  const lr = state.leaveRequests.find(r => r.id === id); if (!lr) return;
  document.getElementById('leaveModalTitle').textContent = '연차 / 반차 수정';
  document.getElementById('leaveEmpSel').innerHTML = fulltimeEmployees().map(e => '<option value="' + e.id + '"' + (e.id === lr.empId ? ' selected' : '') + '>' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('leaveTypeSel').value = lr.type;
  document.getElementById('lvStart').value = lr.start;
  document.getElementById('lvEnd').value = lr.end;
  document.getElementById('lvReason').value = lr.reason || '';
  document.getElementById('leaveModal')._editId = id;
  document.getElementById('leaveModal').classList.add('open');
}
function deleteLeaveUI(id) {
  if (!confirm('신청을 삭제하시겠습니까?')) return;
  deleteLeaveRequest(id);
  renderLeaveTable(); renderLeaveHistory(); renderLeaveBalanceSimple(); renderCalendar(); renderSchedule();
}
function openLeaveModal() {
  document.getElementById('leaveModalTitle').textContent = '연차 / 반차 신청';
  document.getElementById('leaveEmpSel').innerHTML = fulltimeEmployees().map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  const t = toLocalDateStr(TODAY);
  document.getElementById('lvStart').value = t; document.getElementById('lvEnd').value = t; document.getElementById('lvReason').value = '';
  document.getElementById('leaveModal')._editId = null;
  document.getElementById('leaveModal').classList.add('open');
}
function openCalLeaveModal(dateStr) {
  document.getElementById('leaveModalTitle').textContent = '연차 / 반차 신청 — ' + dateStr;
  document.getElementById('leaveEmpSel').innerHTML = fulltimeEmployees().map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('lvStart').value = dateStr; document.getElementById('lvEnd').value = dateStr; document.getElementById('lvReason').value = '';
  document.getElementById('leaveModal')._editId = null;
  document.getElementById('leaveModal').classList.add('open');
}
function submitLeave() {
  const empId = +document.getElementById('leaveEmpSel').value;
  const type = document.getElementById('leaveTypeSel').value;
  const start = document.getElementById('lvStart').value;
  const end = document.getElementById('lvEnd').value;
  const reason = document.getElementById('lvReason').value;
  if (!start || !end) return;
  const editId = document.getElementById('leaveModal')._editId;
  if (editId) updateLeaveRequest(editId, { empId, type, start, end, reason });
  else createLeaveRequest({ empId, type, start, end, reason });
  document.getElementById('leaveModal')._editId = null;
  closeModal('leaveModal'); renderLeaveTable(); renderCalendar(); renderLeaveHistory(); renderLeaveBalanceSimple(); renderSchedule();
}

function renderLeaveBalanceSimple() {
  const el = document.getElementById('leaveBalanceSimpleTable'); if (!el) return;
  let html = '<thead><tr><th>이름</th><th>부서</th><th>입사일</th><th>발생</th><th>사용</th><th>잔여</th></tr></thead><tbody>';
  fulltimeEmployees().forEach(e => {
    const earned = calcEarnedAnnual(e.joinDate, e.bonusAnnual, e);
    const used = calcUsedAnnual(e.id); const rem = earned - used;
    const isFuture = e.joinDate && parseLocalDate(e.joinDate) > TODAY;
    html += '<tr><td><strong>' + e.name + '</strong>' + (isFuture ? ' <span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 5px;border-radius:8px">예정</span>' : '') + '</td>'
      + '<td style="color:#888">' + e.dept + '</td>'
      + '<td style="font-size:11px;color:#888">' + (e.joinDate || '-') + (e.trueJoinDate ? '<div style="color:#1565c0">연차 ' + e.trueJoinDate + '~</div>' : '') + '</td>'
      + '<td style="text-align:center">' + earned + '일</td>'
      + '<td style="text-align:center">' + used + '일</td>'
      + '<td style="text-align:center;font-weight:600;color:' + (rem < 0 ? '#c0392b' : rem === 0 ? '#888' : '#2e7d32') + '">' + rem + '일</td></tr>';
  });
  el.innerHTML = html + '</tbody>';
}

function renderBonusAnnualModalContent(empId) {
  const e = state.employees.find(emp => emp.id === empId); if (!e) return;
  const base = calcEarnedAnnual(e.joinDate, 0, e);
  const baseLabel = e.trueJoinDate ? ('연차 인정 시작일(' + e.trueJoinDate + ') 기준') : '입사일 기준';
  document.getElementById('bonusBaseInfo').textContent = baseLabel + ' ' + base + '일 발생';
  const total = computeBonusAnnualTotal(e.bonusAnnualHistory);
  document.getElementById('bonusCurrentTotal').textContent = (total > 0 ? '+' : '') + total + '일';
  const histWrap = document.getElementById('bonusAnnualHistoryWrap');
  const hist = e.bonusAnnualHistory || [];
  if (hist.length) {
    histWrap.style.display = '';
    let running = 0;
    const rows = hist.map(h => {
      const isDelta = h.delta !== undefined;
      running = isDelta ? running + h.delta : h.bonus;
      const amountLabel = isDelta ? ((h.delta > 0 ? '+' : '') + h.delta + '일') : ('→ ' + h.bonus + '일로 설정 (이전 방식)');
      const delBtn = h.id !== undefined ? '<button class="btn sm danger" style="font-size:10px;padding:1px 6px;flex-shrink:0" onclick="deleteBonusAnnualAdjustmentUI(' + empId + ',' + h.id + ')">삭제</button>' : '';
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid #f0ede8">'
        + '<span style="color:#1565c0;font-weight:600;white-space:nowrap">' + amountLabel + '</span>'
        + '<span style="flex:1;color:#555">' + (h.reason || '–') + '</span>'
        + '<span style="color:#aaa;white-space:nowrap">' + h.date + '</span>'
        + delBtn + '</div>';
    });
    document.getElementById('bonusAnnualHistory').innerHTML = rows.reverse().join('');
  } else { histWrap.style.display = 'none'; }
}
function openBonusAnnualModal(empId) {
  ui.editingEmpId = empId;
  const e = state.employees.find(emp => emp.id === empId); if (!e) return;
  document.getElementById('bonusAnnualModalTitle').textContent = '연차 조정 – ' + e.name;
  document.getElementById('bonusAnnualInput').value = '';
  document.getElementById('bonusAnnualReason').value = '';
  renderBonusAnnualModalContent(empId);
  document.getElementById('bonusAnnualModal').classList.add('open');
}
function saveBonusAnnualUI() {
  const delta = parseFloat(document.getElementById('bonusAnnualInput').value) || 0;
  if (!delta) { alert('추가하거나 차감할 일수를 입력하세요 (0이 아닌 값).'); return; }
  const reason = document.getElementById('bonusAnnualReason').value.trim();
  addBonusAnnualAdjustment(ui.editingEmpId, delta, reason);
  document.getElementById('bonusAnnualInput').value = '';
  document.getElementById('bonusAnnualReason').value = '';
  renderBonusAnnualModalContent(ui.editingEmpId);
  renderLeaveBalanceSimple(); renderLeaveHistory(); renderEmpTable();
}
function deleteBonusAnnualAdjustmentUI(empId, historyId) {
  if (!confirm('이 조정 내역을 삭제할까요? 삭제하면 그만큼 합계에서 다시 빠집니다.')) return;
  deleteBonusAnnualAdjustment(empId, historyId);
  renderBonusAnnualModalContent(empId);
  renderLeaveBalanceSimple(); renderLeaveHistory(); renderEmpTable();
}

function renderLeaveHistory() {
  const empId = +document.getElementById('leaveEmpFilter').value || null;
  const year = document.getElementById('leaveYearFilter').value;
  let filtered = ftLeaveRequests().filter(r => r.status !== 'rejected');
  if (empId) filtered = filtered.filter(r => r.empId === empId);
  if (year) filtered = filtered.filter(r => r.start.startsWith(year));
  filtered = [...filtered].sort((a, b) => b.start.localeCompare(a.start));
  const container = document.getElementById('leaveHistory');
  if (!filtered.length) { container.innerHTML = '<div style="color:#aaa;font-size:12px;padding:12px 0;text-align:center">해당 내역이 없습니다</div>'; return; }
  if (!empId) {
    const grouped = {}; filtered.forEach(r => { if (!grouped[r.empId]) grouped[r.empId] = []; grouped[r.empId].push(r); });
    let html = '';
    fulltimeEmployees().filter(e => grouped[e.id]).forEach(e => {
      const earned = calcEarnedAnnual(e.joinDate, e.bonusAnnual, e); const used = calcUsedAnnual(e.id); const rem = earned - used;
      html += '<div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #dde4ee">'
        + '<span style="font-weight:600;font-size:13px">' + e.name + '</span><span style="font-size:11px;color:#aaa">' + e.dept + '</span>'
        + '<span style="margin-left:auto;font-size:11px;color:#888">발생 ' + earned + '일 · 사용 ' + used + '일 · <strong style="color:' + (rem < 0 ? '#c0392b' : '#2e7d32') + '">' + rem + '일 잔여</strong></span></div>'
        + buildLeaveRows(grouped[e.id]) + '</div>';
    });
    container.innerHTML = html;
  } else container.innerHTML = buildLeaveRows(filtered);
}
function buildLeaveRows(requests) {
  if (!requests.length) return '<div style="color:#aaa;font-size:12px;padding:8px 0">내역 없음</div>';
  return '<table class="lv-table" style="font-size:12px"><thead><tr><th>유형</th><th>기간</th><th>일수</th><th>사유</th><th>상태</th></tr></thead><tbody>'
    + requests.map(r => {
      const tl = r.type === 'annual' ? '연차' : r.type === 'half' ? '반차(오전)' : '반차(오후)';
      const days = r.type === 'annual' ? Math.round((parseLocalDate(r.end) - parseLocalDate(r.start)) / 864e5) + 1 : 0.5;
      return '<tr><td><span class="badge badge-approved" style="font-size:10px">' + tl + '</span></td>'
        + '<td>' + (r.start === r.end ? r.start : r.start + ' ~ ' + r.end) + '</td>'
        + '<td style="text-align:center;font-weight:600">' + days + '일</td>'
        + '<td style="color:#888">' + (r.reason || '-') + '</td>'
        + '<td><span class="badge badge-approved" style="font-size:10px">승인</span></td></tr>';
    }).join('') + '</tbody></table>';
}

// ── 연차/반차 달력 ──
function initCalendar() { ui.calYear = TODAY.getFullYear(); ui.calMonth = TODAY.getMonth(); ui.calSelectedEmps = new Set(); ui.calSelectedDept = null; renderCalEmpFilter(); renderCalendar(); }
function calToggleDept(dept) {
  if (ui.calSelectedDept === dept) { ui.calSelectedDept = null; ui.calSelectedEmps = new Set(); }
  else { ui.calSelectedDept = dept; ui.calSelectedEmps = new Set(fulltimeEmployees().filter(e => e.dept === dept && !isResigned(e)).map(e => e.id)); }
  renderCalEmpFilter(); renderCalendar();
}
function renderCalEmpFilter() {
  const wrap = document.getElementById('calEmpFilter'); if (!wrap) return;
  const allActive = ui.calSelectedEmps.size === 0;
  let html = '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #dde4ee">';
  html += '<button class="cal-emp-btn' + (allActive ? ' active' : '') + '" style="' + (allActive ? 'background:#1565c0;color:#fff;border-color:#1565c0' : '') + '" onclick="calToggleEmp(null)">전체</button>';
  DEPTS.forEach(dept => { const active = ui.calSelectedDept === dept; html += '<button class="cal-emp-btn' + (active ? ' active' : '') + '" style="' + (active ? 'background:#1565c0;color:#fff;border-color:#1565c0' : '') + '" onclick="calToggleDept(\'' + dept + '\')">' + dept + '</button>'; });
  html += '</div><div style="display:flex;flex-wrap:wrap;gap:5px">';
  const visibleEmps = ui.calSelectedDept ? fulltimeEmployees().filter(e => e.dept === ui.calSelectedDept && !isResigned(e)) : fulltimeEmployees().filter(e => !isResigned(e));
  visibleEmps.forEach(e => {
    const [bg, fg] = COLORS[e.color % COLORS.length];
    const active = ui.calSelectedEmps.has(e.id) && ui.calSelectedDept === null;
    html += '<button class="cal-emp-btn' + (active ? ' active' : '') + '" style="' + (active ? 'background:' + bg + ';color:' + fg + ';border-color:' + fg : '') + '" onclick="calToggleEmp(' + e.id + ')">' + e.name + '</button>';
  });
  wrap.innerHTML = html + '</div>';
}
function calToggleEmp(id) {
  ui.calSelectedDept = null;
  if (id === null) ui.calSelectedEmps = new Set();
  else { if (ui.calSelectedEmps.has(id)) ui.calSelectedEmps.delete(id); else ui.calSelectedEmps.add(id); }
  renderCalEmpFilter(); renderCalendar();
}
function calChangeMonth(dir) { ui.calMonth += dir; if (ui.calMonth > 11) { ui.calMonth = 0; ui.calYear++; } if (ui.calMonth < 0) { ui.calMonth = 11; ui.calYear--; } renderCalendar(); }
function renderCalendar() {
  const lbl = document.getElementById('calMonthLabel'); const grid = document.getElementById('calGrid'); if (!lbl || !grid) return;
  lbl.textContent = ui.calYear + '년 ' + (ui.calMonth + 1) + '월';
  const targetEmps = ui.calSelectedEmps.size > 0 ? fulltimeEmployees().filter(e => ui.calSelectedEmps.has(e.id)) : fulltimeEmployees();
  const monthStr = ui.calYear + '-' + String(ui.calMonth + 1).padStart(2, '0');
  const relevant = ftLeaveRequests().filter(r => r.status !== 'rejected' && targetEmps.some(e => e.id === r.empId) && (r.start.startsWith(monthStr) || r.end.startsWith(monthStr) || (r.start < monthStr + '-01' && r.end >= monthStr + '-01')));
  const dayMap = {};
  relevant.forEach(r => {
    const emp = state.employees.find(e => e.id === r.empId); if (!emp) return;
    let cur = parseLocalDate(r.start); const end = parseLocalDate(r.end);
    while (cur <= end) { const key = toLocalDateStr(cur); if (!dayMap[key]) dayMap[key] = []; dayMap[key].push({ name: emp.name, type: r.type, status: r.status }); cur.setDate(cur.getDate() + 1); }
  });
  const firstDay = new Date(ui.calYear, ui.calMonth, 1); const lastDay = new Date(ui.calYear, ui.calMonth + 1, 0);
  let startDow = firstDay.getDay();
  const todayStr = toLocalDateStr(TODAY);
  let html = ['일', '월', '화', '수', '목', '금', '토'].map((d, i) => '<div class="cal-day-hd' + (i === 0 || i === 6 ? ' wknd' : '') + '">' + d + '</div>').join('');
  for (let i = 0; i < startDow; i++) { const d = new Date(ui.calYear, ui.calMonth, 1 - (startDow - i)); html += '<div class="cal-cell other-month"><div class="cal-date">' + d.getDate() + '</div></div>'; }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(ui.calYear, ui.calMonth, d); const dow = date.getDay(); const dateStr = toLocalDateStr(date);
    const hol = isHoliday(dateStr); const isWknd = dow === 0 || dow === 6 || hol;
    const isToday = dateStr === todayStr;
    const entries = dayMap[dateStr] || [];
    const dateNumHtml = isToday ? '<span class="cal-date today-num">' + d + '</span>' : '<span class="cal-date' + (isWknd ? ' wknd' : '') + '">' + d + '</span>';
    const tagsHtml = entries.slice(0, 4).map(en => { const tc = en.type === 'annual' ? 'annual' : en.type === 'half' ? 'half' : 'half_pm'; const tl = en.type === 'annual' ? '연차' : en.type === 'half' ? '반차(오전)' : '반차(오후)'; return '<span class="cal-tag ' + tc + '"' + (en.status === 'pending' ? ' style="opacity:.6"' : '') + '>' + en.name + ' ' + tl + '</span>'; }).join('');
    const moreHtml = entries.length > 4 ? '<span style="font-size:10px;color:#aaa">+' + (entries.length - 4) + '명 더</span>' : '';
    const holBadge = hol ? '<div style="font-size:9px;color:#c0392b" title="' + getHolidayName(dateStr) + '">' + getHolidayName(dateStr) + '</div>' : '';
    html += '<div class="cal-cell' + (isToday ? ' today' : '') + (hol ? ' holiday' : '') + '" onclick="openCalLeaveModal(\'' + dateStr + '\')">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">' + dateNumHtml + '<span class="cal-add-btn">+</span></div>'
      + holBadge + tagsHtml + moreHtml + '</div>';
  }
  const total = startDow + lastDay.getDate(); const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= remain; i++) html += '<div class="cal-cell other-month"><div class="cal-date">' + i + '</div></div>';
  grid.innerHTML = html;
  setTimeout(fitCalToScreen, 50);
}

// ══════════════════════ 추가근무 탭 ══════════════════════
function initOvertimeTab() {
  const years = new Set(state.overtimeRecords.map(r => r.date.slice(0, 4)));
  years.add(String(TODAY.getFullYear()));
  const cur = String(TODAY.getFullYear());
  const yHtml = [...years].sort().reverse().map(y => '<option value="' + y + '"' + (y === cur ? ' selected' : '') + '>' + y + '년</option>').join('');
  document.getElementById('otYear').innerHTML = yHtml;
  document.getElementById('otSumYear').innerHTML = yHtml;
  const m = String(TODAY.getMonth() + 1).padStart(2, '0');
  document.getElementById('otMonth').value = m;
  document.getElementById('otSumMonth').value = m;
  document.getElementById('otEmpFilter').innerHTML = '<option value="">전체 직원</option>' + state.employees.map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  ui.otCalYear = TODAY.getFullYear(); ui.otCalMonth = TODAY.getMonth();
  renderOvertimeTable(); renderOvertimeSummary(); renderOtCalendar();
}
function renderOvertimeTable() {
  const year = document.getElementById('otYear')?.value || '';
  const month = document.getElementById('otMonth')?.value || '';
  const empId = +document.getElementById('otEmpFilter')?.value || 0;
  let filtered = [...state.overtimeRecords];
  if (year) filtered = filtered.filter(r => r.date.startsWith(year));
  if (month && year) filtered = filtered.filter(r => r.date.startsWith(year + '-' + month));
  if (empId) filtered = filtered.filter(r => r.empId === empId);
  filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const tbl = document.getElementById('overtimeTable'); tbl.innerHTML = '';
  const thead = tbl.createTHead();
  thead.innerHTML = '<tr><th>직원</th><th>날짜</th><th>시간</th><th>근무 시간</th><th>사유</th><th>관리</th></tr>';
  const tbody = tbl.createTBody();
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:16px">등록된 추가근무가 없습니다</td></tr>'; return; }
  filtered.forEach(r => {
    const emp = state.employees.find(e => e.id === r.empId); if (!emp) return;
    const hrs = calcOtHours(r.startTime, r.endTime);
    const [bg, fg] = COLORS[emp.color % COLORS.length];
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><div style="display:flex;align-items:center;gap:5px"><div class="avatar" style="background:' + bg + ';color:' + fg + ';width:20px;height:20px;font-size:9px;flex-shrink:0">' + emp.name[0] + '</div><strong>' + emp.name + '</strong> <span style="font-size:11px;color:#aaa">' + emp.dept + '</span></div></td>'
      + '<td>' + r.date + '</td>'
      + '<td><span style="background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">' + r.startTime + ' ~ ' + r.endTime + '</span></td>'
      + '<td style="text-align:center;font-weight:600;color:#1565c0">' + hrs + '시간</td>'
      + '<td style="color:#888">' + (r.reason || '-') + '</td>'
      + '<td style="white-space:nowrap"></td>';
    const actionTd = tr.querySelector('td:last-child');
    const editBtn = document.createElement('button'); editBtn.className = 'btn sm'; editBtn.textContent = '수정'; editBtn.style.marginRight = '4px'; editBtn.onclick = () => openEditOvertime(r.id);
    const delBtn = document.createElement('button'); delBtn.className = 'btn sm danger'; delBtn.textContent = '삭제'; delBtn.onclick = () => deleteOvertimeUI(r.id);
    actionTd.appendChild(editBtn); actionTd.appendChild(delBtn);
    tbody.appendChild(tr);
  });
}
// 기능5: 정규근무 + 추가근무 합산 월간 요약 (급여 참고용)
function renderOvertimeSummary() {
  const year = document.getElementById('otSumYear')?.value || String(TODAY.getFullYear());
  const month = document.getElementById('otSumMonth')?.value || '';
  const el = document.getElementById('overtimeSummaryTable');
  if (!month) {
    // 전체(연도)인 경우 기존처럼 추가근무만 합산해서 표시
    let filtered = [...state.overtimeRecords];
    if (year) filtered = filtered.filter(r => r.date.startsWith(year));
    const empMap = {};
    filtered.forEach(r => { if (!empMap[r.empId]) empMap[r.empId] = { total: 0, count: 0 }; empMap[r.empId].total += calcOtHours(r.startTime, r.endTime); empMap[r.empId].count++; });
    let html = '<thead><tr><th>직원</th><th>부서</th><th>추가근무 횟수</th><th>총 추가근무 시간</th></tr></thead><tbody>';
    const sorted = state.employees.filter(e => empMap[e.id]).sort((a, b) => (empMap[b.id]?.total || 0) - (empMap[a.id]?.total || 0));
    if (!sorted.length) html += '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:16px">해당 기간 추가근무 내역이 없습니다</td></tr>';
    else sorted.forEach(e => { const d = empMap[e.id]; html += '<tr><td><strong>' + e.name + '</strong></td><td style="color:#888">' + e.dept + '</td><td style="text-align:center">' + d.count + '회</td><td style="font-weight:600;color:#1565c0">' + d.total + '시간</td></tr>'; });
    el.innerHTML = html + '</tbody>';
    return;
  }
  const monthIdx = +month - 1;
  const summary = calcMonthlyPayrollSummary(+year, monthIdx);
  let html = '<thead><tr><th>직원</th><th>부서</th><th>정규근무시간</th><th>추가근무 횟수</th><th>추가근무시간</th><th>합계(급여참고)</th></tr></thead><tbody>';
  const sorted = state.employees.filter(e => summary[e.id] && (summary[e.id].regular > 0 || summary[e.id].overtime > 0)).sort((a, b) => (summary[b.id]?.total || 0) - (summary[a.id]?.total || 0));
  if (!sorted.length) html += '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:16px">해당 월 근무/추가근무 내역이 없습니다</td></tr>';
  else sorted.forEach(e => {
    const s = summary[e.id];
    html += '<tr><td><strong>' + e.name + '</strong></td><td style="color:#888">' + e.dept + '</td>'
      + '<td style="text-align:center">' + s.regular + '시간</td>'
      + '<td style="text-align:center">' + s.otCount + '회</td>'
      + '<td style="text-align:center;color:#1565c0">' + s.overtime + '시간</td>'
      + '<td style="text-align:center;font-weight:700">' + s.total + '시간</td></tr>';
  });
  el.innerHTML = html + '</tbody>';
}
function exportOvertimeMonthCsvUI() {
  const year = +(document.getElementById('otSumYear')?.value || TODAY.getFullYear());
  const month = document.getElementById('otSumMonth')?.value;
  if (!month) { alert('내보낼 월을 선택해주세요.'); return; }
  exportOvertimeMonthCsv(year, +month - 1);
}
function renderOtCalendar() {
  const lbl = document.getElementById('otCalMonthLabel'); const grid = document.getElementById('otCalGrid'); if (!lbl || !grid) return;
  lbl.textContent = ui.otCalYear + '년 ' + (ui.otCalMonth + 1) + '월';
  const monthStr = ui.otCalYear + '-' + String(ui.otCalMonth + 1).padStart(2, '0');
  const relevant = state.overtimeRecords.filter(r => r.date.startsWith(monthStr));
  const dayMap = {};
  relevant.forEach(r => { if (!dayMap[r.date]) dayMap[r.date] = []; const emp = state.employees.find(e => e.id === r.empId); if (emp) dayMap[r.date].push({ name: emp.name, startTime: r.startTime, endTime: r.endTime, hrs: calcOtHours(r.startTime, r.endTime) }); });
  const firstDay = new Date(ui.otCalYear, ui.otCalMonth, 1); const lastDay = new Date(ui.otCalYear, ui.otCalMonth + 1, 0);
  const startDow = firstDay.getDay(); const todayStr = toLocalDateStr(TODAY);
  let html = ['일', '월', '화', '수', '목', '금', '토'].map((d, i) => '<div class="cal-day-hd' + (i === 0 || i === 6 ? ' wknd' : '') + '">' + d + '</div>').join('');
  for (let i = 0; i < startDow; i++) { const d = new Date(ui.otCalYear, ui.otCalMonth, 1 - (startDow - i)); html += '<div class="cal-cell other-month"><div class="cal-date">' + d.getDate() + '</div></div>'; }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(ui.otCalYear, ui.otCalMonth, d); const dow = date.getDay(); const dateStr = toLocalDateStr(date);
    const hol = isHoliday(dateStr); const isWknd = dow === 0 || dow === 6 || hol; const isToday = dateStr === todayStr;
    const entries = dayMap[dateStr] || [];
    const dateNumHtml = isToday ? '<span class="cal-date today-num">' + d + '</span>' : '<span class="cal-date' + (isWknd ? ' wknd' : '') + '">' + d + '</span>';
    const totalHrs = entries.reduce((s, e) => s + e.hrs, 0);
    const tagsHtml = entries.slice(0, 3).map(en => '<span class="cal-tag" style="background:#e3f2fd;color:#1565c0">' + en.name + ' ' + en.startTime + '~' + en.endTime + '</span>').join('');
    const moreHtml = entries.length > 3 ? '<span style="font-size:10px;color:#aaa">+' + (entries.length - 3) + '명 더</span>' : '';
    const hrsHtml = entries.length > 0 ? '<div style="font-size:9px;color:#1565c0;font-weight:600;margin-top:2px">총 ' + totalHrs + '시간</div>' : '';
    html += '<div class="cal-cell' + (isToday ? ' today' : '') + (hol ? ' holiday' : '') + '" onclick="openOvertimeModalWithDate(\'' + dateStr + '\')">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">' + dateNumHtml + '<span class="cal-add-btn">+</span></div>'
      + tagsHtml + moreHtml + hrsHtml + '</div>';
  }
  const total = startDow + lastDay.getDate(); const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= remain; i++) html += '<div class="cal-cell other-month"><div class="cal-date">' + i + '</div></div>';
  grid.innerHTML = html;
  setTimeout(fitCalToScreen, 50);
}
function otCalChangeMonth(dir) { ui.otCalMonth += dir; if (ui.otCalMonth > 11) { ui.otCalMonth = 0; ui.otCalYear++; } if (ui.otCalMonth < 0) { ui.otCalMonth = 11; ui.otCalYear--; } renderOtCalendar(); }

function openOvertimeModal() {
  document.getElementById('overtimeModalTitle').textContent = '추가근무 등록';
  document.getElementById('otEmpSel').innerHTML = state.employees.map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('otDate').value = toLocalDateStr(TODAY);
  document.getElementById('otStartTime').value = ''; document.getElementById('otEndTime').value = ''; document.getElementById('otReason').value = '';
  document.getElementById('otCalcHours').textContent = '';
  document.getElementById('overtimeModal')._editId = null;
  document.getElementById('overtimeModal').classList.add('open');
}
function openOvertimeModalWithDate(dateStr) { openOvertimeModal(); document.getElementById('otDate').value = dateStr; }
function openEditOvertime(id) {
  const r = state.overtimeRecords.find(x => x.id === id); if (!r) return;
  document.getElementById('overtimeModalTitle').textContent = '추가근무 수정';
  document.getElementById('otEmpSel').innerHTML = state.employees.map(e => '<option value="' + e.id + '"' + (e.id === r.empId ? ' selected' : '') + '>' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('otDate').value = r.date;
  document.getElementById('otStartTime').value = r.startTime; document.getElementById('otEndTime').value = r.endTime; document.getElementById('otReason').value = r.reason || '';
  const hrs = calcOtHours(r.startTime, r.endTime);
  document.getElementById('otCalcHours').textContent = hrs > 0 ? '(' + hrs + '시간)' : '';
  document.getElementById('overtimeModal')._editId = id;
  document.getElementById('overtimeModal').classList.add('open');
}
function submitOvertime() {
  const empId = +document.getElementById('otEmpSel').value;
  const date = document.getElementById('otDate').value;
  const startTime = document.getElementById('otStartTime').value;
  const endTime = document.getElementById('otEndTime').value;
  const reason = document.getElementById('otReason').value;
  if (!date || !startTime || !endTime) { alert('날짜와 시작/종료 시간을 입력해주세요.'); return; }
  const editId = document.getElementById('overtimeModal')._editId;
  if (editId) updateOvertime(editId, { empId, date, startTime, endTime, reason });
  else createOvertime({ empId, date, startTime, endTime, reason });
  closeModal('overtimeModal');
  renderOvertimeTable(); renderOvertimeSummary(); renderOtCalendar(); renderSchedule();
}
function deleteOvertimeUI(id) {
  if (!confirm('추가근무 기록을 삭제하시겠습니까?')) return;
  deleteOvertime(id);
  renderOvertimeTable(); renderOvertimeSummary(); renderOtCalendar(); renderSchedule();
}
document.addEventListener('DOMContentLoaded', () => {
  ['otStartTime', 'otEndTime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      const s = document.getElementById('otStartTime').value, e = document.getElementById('otEndTime').value;
      const hrs = calcOtHours(s, e);
      document.getElementById('otCalcHours').textContent = (s && e && hrs > 0) ? '(' + hrs + '시간)' : '';
    });
  });
});

// ══════════════════════ 직원 관리 탭 ══════════════════════
function setEmpDeptFilter(dept) {
  ui.empDeptFilter = dept;
  document.querySelectorAll('#empDeptFilter .cal-emp-btn').forEach(btn => {
    const isActive = btn.textContent === (dept || '전체');
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? '#1a1a1a' : ''; btn.style.color = isActive ? '#fff' : ''; btn.style.borderColor = isActive ? '#1a1a1a' : '';
  });
  renderEmpTable();
}
function renderEmpTable() {
  if (window.innerWidth <= 768) { renderEmpTableMobile(); return; }
  const tm = { full: '매주', biweek_odd: '격주(홀수)', biweek_even: '격주(짝수)' };
  const filtered = ui.empDeptFilter ? state.employees.filter(e => e.dept === ui.empDeptFilter) : state.employees;
  let html = '<thead><tr><th style="width:28px"></th><th>이름</th><th>부서</th><th>고용형태</th><th>입사일</th><th>퇴사일</th><th>근무유형</th>'
    + DAY_KO.map((d, i) => '<th style="' + (i >= 5 ? 'color:#c0392b' : '') + ';min-width:60px">' + d + '</th>').join('')
    + '<th>연차</th><th>관리</th></tr></thead><tbody id="empTbody">';
  if (!filtered.length) html += '<tr><td colspan="15" style="text-align:center;color:#aaa;padding:16px">해당 부서 직원이 없습니다</td></tr>';
  filtered.forEach(e => {
    const pat = getCurrentPattern(e.id);
    const isPT = e.employmentType === 'parttime';
    const base = calcEarnedAnnual(e.joinDate, 0, e);
    const bonus = e.bonusAnnual || 0;
    const earned = base + bonus;
    const used = calcUsedAnnual(e.id);
    const rem = earned - used;
    const isFuture = e.joinDate && parseLocalDate(e.joinDate) > TODAY;
    const resigned = isResigned(e);
    const rowStyle = resigned ? 'opacity:0.5;background:#fafafa;' : '';
    const todayStr = toLocalDateStr(TODAY);
    const pendingChanges = (state.shiftHistory[e.id] || []).filter(h => h.applyFrom > todayStr);
    const pendingBadge = pendingChanges.length > 0 ? ' <span style="font-size:10px;background:#fff3e0;color:#e65100;padding:1px 6px;border-radius:10px;cursor:pointer" onclick="showShiftHistory(' + e.id + ')" title="클릭하여 변경 예정 상세보기">📅 변경예정 ' + pendingChanges.length + '건</span>' : '';
    html += '<tr data-id="' + e.id + '" style="' + rowStyle + '">'
      + '<td style="text-align:center;cursor:grab;color:#ccc;font-size:14px;user-select:none" class="drag-handle" title="드래그하여 순서 변경">⠿</td>'
      + '<td><strong>' + e.name + '</strong>' + (isFuture ? ' <span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 6px;border-radius:10px">입사예정</span>' : '') + (resigned ? ' <span style="font-size:10px;background:#fce4ec;color:#880e4f;padding:1px 6px;border-radius:10px">퇴사</span>' : '') + pendingBadge + (e.phone ? '<div style="font-size:10px;color:#90aac8"><a href="tel:' + e.phone + '" style="color:inherit;text-decoration:none">' + e.phone + '</a></div>' : '') + '</td>'
      + '<td>' + e.dept + '</td>'
      + '<td>' + (isPT ? '<span style="font-size:10px;background:#fff3e0;color:#e65100;padding:1px 6px;border-radius:10px">파트타임</span>' : '<span style="font-size:11px;color:#888">정규직</span>') + '</td>'
      + '<td style="font-size:11px;color:#888">' + (e.joinDate || '-') + '</td>'
      + '<td style="font-size:11px;color:' + (resigned ? '#c0392b' : '#888') + '">' + (e.leaveDate || '-') + '</td>'
      + '<td style="font-size:11px">' + (resigned ? '<span style="color:#bbb">퇴사</span>' : (tm[e.workType] || e.workType)) + '</td>';
    pat.forEach((sh, di) => {
      const isWknd = di >= 5;
      html += '<td style="text-align:center;' + (isWknd ? 'background:#fafafa' : '') + '">'
        + (sh ? '<span class="shift-pill ' + dayShiftClass(sh, 0) + '" style="font-size:10px;padding:1px 5px" title="' + dayShiftLabel(sh) + '">' + dayShiftLabel(sh) + '</span>' : '<span style="color:#ccc;font-size:11px">—</span>')
        + '</td>';
    });
    html += '<td style="font-size:11px;white-space:nowrap">'
      + (isPT ? '<span style="color:#bbb">해당없음</span>' : '<span style="font-weight:600;color:' + (rem < 0 ? '#c0392b' : rem === 0 ? '#888' : '#2e7d32') + '">' + rem + '일</span>'
        + ' <span style="color:#aaa">(' + base + (bonus ? '<span style="color:#f57f17;font-weight:600">+' + bonus + '</span>' : '') + '/사용 ' + used + ')</span>'
        + ' <button class="btn sm" onclick="openBonusAnnualModal(' + e.id + ')" style="font-size:10px;padding:2px 7px;margin-left:3px" title="연차 조정">✏</button>')
      + '</td>'
      + '<td style="white-space:nowrap"><button class="btn sm" onclick="openEditEmp(' + e.id + ')" style="margin-right:4px">수정</button><button class="btn sm danger" onclick="removeEmp(' + e.id + ')">삭제</button></td></tr>';
  });
  const tbl = document.getElementById('empTable');
  tbl.innerHTML = '';
  const tmp = document.createElement('table'); tmp.innerHTML = html + '</tbody>';
  while (tmp.firstChild) tbl.appendChild(tmp.firstChild);
  initEmpDragDrop();
}

// 모바일: 15열 표 대신 한 열짜리 카드 리스트로 렌더링 — 가로 스크롤이 생기지 않도록
// (요일별 근무시간은 칩을 flex-wrap으로 감싸서 한 화면 폭 안에서 줄바꿈되게 함)
function renderEmpTableMobile() {
  const tm = { full: '매주', biweek_odd: '격주(홀수)', biweek_even: '격주(짝수)' };
  const filtered = ui.empDeptFilter ? state.employees.filter(e => e.dept === ui.empDeptFilter) : state.employees;
  let html = '<tbody id="empTbody">';
  if (!filtered.length) html += '<tr><td style="text-align:center;color:#aaa;padding:16px">해당 부서 직원이 없습니다</td></tr>';
  filtered.forEach(e => {
    const pat = getCurrentPattern(e.id);
    const isPT = e.employmentType === 'parttime';
    const base = calcEarnedAnnual(e.joinDate, 0, e);
    const bonus = e.bonusAnnual || 0;
    const earned = base + bonus;
    const used = calcUsedAnnual(e.id);
    const rem = earned - used;
    const isFuture = e.joinDate && parseLocalDate(e.joinDate) > TODAY;
    const resigned = isResigned(e);
    const rowStyle = resigned ? 'opacity:0.5;background:#fafafa;' : '';
    const todayStr = toLocalDateStr(TODAY);
    const pendingChanges = (state.shiftHistory[e.id] || []).filter(h => h.applyFrom > todayStr);
    const pendingBadge = pendingChanges.length > 0 ? ' <span style="font-size:10px;background:#fff3e0;color:#e65100;padding:1px 6px;border-radius:10px" onclick="showShiftHistory(' + e.id + ')">📅 변경예정 ' + pendingChanges.length + '건</span>' : '';
    const dayChips = pat.map((sh, di) => {
      if (!sh) return '';
      const isWknd = di >= 5;
      return '<span class="shift-pill ' + dayShiftClass(sh, 0) + '" style="font-size:10px;padding:2px 6px;' + (isWknd ? 'outline:1px solid #f5c6c2' : '') + '">' + DAY_KO[di] + ' ' + dayShiftLabel(sh) + '</span>';
    }).join('');
    html += '<tr data-id="' + e.id + '" style="' + rowStyle + '"><td style="padding:10px 4px">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
      + '<div style="min-width:0"><div style="font-size:14px"><strong>' + e.name + '</strong>'
      + (isFuture ? ' <span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 6px;border-radius:10px">입사예정</span>' : '')
      + (resigned ? ' <span style="font-size:10px;background:#fce4ec;color:#880e4f;padding:1px 6px;border-radius:10px">퇴사</span>' : '')
      + '</div><div style="font-size:11px;color:#888;margin-top:2px">' + e.dept + ' · ' + (isPT ? '파트타임' : '정규직') + ' · ' + (resigned ? '퇴사' : (tm[e.workType] || e.workType)) + pendingBadge + '</div>'
      + (e.phone ? '<div style="font-size:11px;margin-top:2px"><a href="tel:' + e.phone + '" style="color:#1565c0;text-decoration:none">📞 ' + e.phone + '</a></div>' : '') + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">'
      + '<button class="btn sm" onclick="openEditEmp(' + e.id + ')">수정</button>'
      + '<button class="btn sm danger" onclick="removeEmp(' + e.id + ')">삭제</button>'
      + '</div></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">' + (dayChips || '<span style="font-size:11px;color:#ccc">요일별 근무 없음</span>') + '</div>'
      + '<div style="margin-top:8px;font-size:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
      + (isPT ? '<span style="color:#bbb">연차 해당없음</span>' : '연차 <strong style="color:' + (rem < 0 ? '#c0392b' : rem === 0 ? '#888' : '#2e7d32') + '">' + rem + '일</strong>'
        + ' <span style="color:#aaa;font-size:11px">(' + base + (bonus ? '<span style="color:#f57f17;font-weight:600">+' + bonus + '</span>' : '') + '/사용 ' + used + ')</span>'
        + '<button class="btn sm" onclick="openBonusAnnualModal(' + e.id + ')" style="font-size:10px;padding:2px 7px">✏ 조정</button>')
      + '</div>'
      + '</td></tr>';
  });
  const tbl = document.getElementById('empTable');
  tbl.innerHTML = '';
  const tmp = document.createElement('table'); tmp.innerHTML = html + '</tbody>';
  while (tmp.firstChild) tbl.appendChild(tmp.firstChild);
}

// ── 직원 순서 드래그앤드롭 (데스크톱 표 전용) ──
let dragSrcId = null, dragClone = null, dragOffsetY = 0;
function initEmpDragDrop() {
  const tbody = document.getElementById('empTbody'); if (!tbody) return;
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    const handle = row.querySelector('.drag-handle'); if (!handle) return;
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const startX = e.clientX, startY = e.clientY; let dragging = false;
      const rowId = +row.dataset.id;
      function startDrag() {
        dragging = true; dragSrcId = rowId;
        const rect = row.getBoundingClientRect(); dragOffsetY = startY - rect.top;
        dragClone = row.cloneNode(true);
        dragClone.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;opacity:0.7;pointer-events:none;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;';
        document.body.appendChild(dragClone); row.style.opacity = '0.3';
      }
      function onMove(e) {
        if (!dragging) { if (Math.abs(e.clientY - startY) > 5 || Math.abs(e.clientX - startX) > 5) startDrag(); return; }
        dragClone.style.top = (e.clientY - dragOffsetY) + 'px';
        tbody.querySelectorAll('tr[data-id]').forEach(r => r.style.borderTop = '');
        dragClone.style.display = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        dragClone.style.display = '';
        const targetRow = el && el.closest('tr[data-id]');
        if (targetRow && +targetRow.dataset.id !== dragSrcId) targetRow.style.borderTop = '2px solid #1a1a1a';
      }
      function onUp(e) {
        document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
        if (dragClone) { dragClone.remove(); dragClone = null; }
        tbody.querySelectorAll('tr[data-id]').forEach(r => { r.style.borderTop = ''; r.style.opacity = ''; });
        if (!dragging) { dragSrcId = null; return; }
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const targetRow = el && el.closest('tr[data-id]');
        if (targetRow) {
          const targetId = +targetRow.dataset.id;
          if (targetId !== dragSrcId) {
            const srcIdx = state.employees.findIndex(emp => emp.id === dragSrcId);
            const tgtIdx = state.employees.findIndex(emp => emp.id === targetId);
            if (srcIdx !== -1 && tgtIdx !== -1) {
              const [moved] = state.employees.splice(srcIdx, 1);
              const newTgt = state.employees.findIndex(emp => emp.id === targetId);
              state.employees.splice(newTgt, 0, moved);
              save(); renderEmpTable(); renderSchedule(); renderSidebar();
            }
          }
        }
        dragSrcId = null;
      }
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
  });
}

// ── 직원 메모 ──
function initEmpMemoFilters() {
  const yr = document.getElementById('memoYear'); const cur = String(TODAY.getFullYear());
  const years = new Set(state.empMemos.map(m => m.date.slice(0, 4)));
  years.add(cur);
  yr.innerHTML = [...years].sort().reverse().map(y => '<option value="' + y + '"' + (y === cur ? ' selected' : '') + '>' + y + '년</option>').join('');
  document.getElementById('memoMonth').value = String(TODAY.getMonth() + 1).padStart(2, '0');
  document.getElementById('memoEmpFilter').innerHTML = '<option value="">전체 직원</option>' + state.employees.map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
}
function renderEmpMemos() {
  const year = document.getElementById('memoYear')?.value || '';
  const month = document.getElementById('memoMonth')?.value || '';
  const empId = +document.getElementById('memoEmpFilter')?.value || 0;
  let filtered = [...state.empMemos];
  if (year) filtered = filtered.filter(m => m.date.startsWith(year));
  if (month && year) filtered = filtered.filter(m => m.date.startsWith(year + '-' + month));
  if (empId) filtered = filtered.filter(m => m.empId === empId);
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  const container = document.getElementById('empMemoList');
  if (!filtered.length) { container.innerHTML = '<div style="color:#aaa;font-size:12px;padding:12px 0;text-align:center">메모가 없습니다</div>'; return; }
  container.innerHTML = filtered.map(m => {
    const emp = state.employees.find(e => e.id === m.empId);
    return '<div style="border:1px solid #eee;border-radius:8px;padding:8px 10px;margin-bottom:8px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
      + '<span style="font-weight:600;font-size:12px">' + (emp ? emp.name : '알 수 없음') + '</span>'
      + '<span style="font-size:11px;color:#aaa">' + m.date + '</span></div>'
      + '<div style="font-size:12px;color:#444;white-space:pre-line">' + m.content.replace(/</g, '&lt;') + '</div>'
      + '<div style="text-align:right;margin-top:4px"><button class="btn sm" onclick="openEditEmpMemo(' + m.id + ')" style="font-size:10px;padding:2px 7px;margin-right:3px">수정</button><button class="btn sm danger" onclick="deleteEmpMemo(' + m.id + ')" style="font-size:10px;padding:2px 7px">삭제</button></div>'
      + '</div>';
  }).join('');
}
function openEmpMemoModal() {
  document.getElementById('empMemoModalTitle').textContent = '메모 추가';
  document.getElementById('memoEmpSel').innerHTML = state.employees.map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('memoDate').value = toLocalDateStr(TODAY);
  document.getElementById('memoContent').value = '';
  document.getElementById('empMemoModal')._editId = null;
  document.getElementById('empMemoModal').classList.add('open');
}
function openEditEmpMemo(id) {
  const m = state.empMemos.find(x => x.id === id); if (!m) return;
  document.getElementById('empMemoModalTitle').textContent = '메모 수정';
  document.getElementById('memoEmpSel').innerHTML = state.employees.map(e => '<option value="' + e.id + '"' + (e.id === m.empId ? ' selected' : '') + '>' + e.name + ' (' + e.dept + ')</option>').join('');
  document.getElementById('memoDate').value = m.date;
  document.getElementById('memoContent').value = m.content;
  document.getElementById('empMemoModal')._editId = id;
  document.getElementById('empMemoModal').classList.add('open');
}
function submitEmpMemo() {
  const empId = +document.getElementById('memoEmpSel').value;
  const date = document.getElementById('memoDate').value;
  const content = document.getElementById('memoContent').value.trim();
  if (!date || !content) { alert('날짜와 메모 내용을 입력해주세요.'); return; }
  const editId = document.getElementById('empMemoModal')._editId;
  if (editId) updateEmpMemo(editId, { empId, date, content });
  else createEmpMemo({ empId, date, content });
  closeModal('empMemoModal'); renderEmpMemos();
}

// ══════════════════════ Google Sheets 연동 설정 ══════════════════════
function openSheetsSettingModal() {
  document.getElementById('gasUrlInput').value = GAS_URL;
  document.getElementById('gasTestResult').textContent = '';
  document.getElementById('gasCodeBlock').textContent = GAS_CODE;
  document.getElementById('sheetsSettingModal').classList.add('open');
}
function copyGasCode() {
  navigator.clipboard.writeText(GAS_CODE).then(() => {
    const btn = document.querySelector('[onclick="copyGasCode()"]');
    if (btn) { btn.textContent = '✓ 복사됨'; setTimeout(() => btn.textContent = '복사', 1500); }
  });
}
function saveGasUrl() {
  const url = document.getElementById('gasUrlInput').value.trim();
  setGasUrl(url);
  closeModal('sheetsSettingModal');
  if (url) { const ind = document.getElementById('syncIndicator'); if (ind) { ind.textContent = '☁ 연결됨'; ind.style.color = '#2e7d32'; } }
}
function testGasConnection() {
  const url = document.getElementById('gasUrlInput').value.trim();
  const res = document.getElementById('gasTestResult');
  if (!url) { res.textContent = '⚠ URL을 먼저 입력하세요'; res.style.color = '#f57f17'; return; }
  res.textContent = '연결 중…'; res.style.color = '#888';
  fetch(url + '?action=load').then(r => r.json()).then(d => {
    res.textContent = d.ok ? '✓ 연결 성공!' : '✗ 응답 오류: ' + d.error;
    res.style.color = d.ok ? '#2e7d32' : '#c0392b';
  }).catch(() => { res.textContent = '✗ 연결 실패 (CORS 또는 URL 오류)'; res.style.color = '#c0392b'; });
}
function pullFromSheets() {
  const url = document.getElementById('gasUrlInput').value.trim();
  const res = document.getElementById('gasTestResult');
  if (!url) { res.textContent = '⚠ URL을 먼저 입력하세요'; res.style.color = '#f57f17'; return; }
  res.textContent = '가져오는 중…'; res.style.color = '#888';
  const prevUrl = GAS_URL; GAS_URL = url;
  loadFromSheets(ok => {
    if (ok) { res.textContent = '✓ 데이터 가져오기 성공!'; res.style.color = '#2e7d32'; renderAll(); }
    else { res.textContent = '✗ 데이터 없음 또는 실패'; res.style.color = '#c0392b'; GAS_URL = prevUrl; }
  });
}
