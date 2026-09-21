// ── 직원용 뷰어 렌더링 (읽기 전용) ──
// admin의 ui.js와 같은 근무표/연차 계산 함수(scheduleEngine.js, leaveEngine.js)를 공유하되,
// 여기서는 데이터를 수정하는 함수(save 등)를 절대 호출하지 않는다. 모달/편집 기능 없음.

function switchViewerTab(tab) {
  ['schedule', 'leave'].forEach(t => {
    document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).style.display = t === tab ? '' : 'none';
    const tabBtns = document.querySelectorAll('.header-tabs .tab');
    const idx = t === 'schedule' ? 0 : 1;
    if (tabBtns[idx]) tabBtns[idx].className = 'tab' + (t === tab ? ' active' : '');
    const mt = document.getElementById('mtab-' + t);
    if (mt) mt.className = 'mobile-tab' + (t === tab ? ' active' : '');
  });
  if (tab === 'leave') { initLeaveFilters(); initLeaveTableFilters(); renderLeaveTable(); renderLeaveHistoryViewer(); initCalendar(); setTimeout(fitTableToScreen, 100); }
}

// ── 화면 폭에 맞춰 표/달력 축소 (가로 스크롤 방지) ──
function fitTableToScreen() {
  if (window.innerWidth > 768) return;
  const targets = [
    { tblId: 'screenSchTable', wrapSel: '.sch-wrap' },
    { tblId: 'screenSummary', wrapSel: '.sum-wrap' },
    { tblId: 'leaveTable', wrapId: 'leaveTableWrap' },
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
  const grid = document.getElementById('calGrid');
  const wrap = document.getElementById('calGridWrap') || (grid && grid.parentElement);
  if (!grid || !wrap) return;
  grid.style.transform = ''; grid.style.transformOrigin = ''; wrap.style.height = '';
  const gridW = grid.scrollWidth, wrapW = wrap.clientWidth || wrap.offsetWidth;
  if (gridW > 0 && wrapW > 0 && gridW > wrapW) {
    const scale = wrapW / gridW;
    grid.style.transform = 'scale(' + scale + ')'; grid.style.transformOrigin = 'top left';
    wrap.style.height = (grid.scrollHeight * scale) + 'px'; wrap.style.overflow = 'visible';
  }
}
window.addEventListener('resize', fitCalToScreen);

// ══════════════════════ 근무표 탭 (읽기 전용) ══════════════════════
function buildSchTable(el, off) {
  const days = getWeekDays(off);
  const emps = state.employees;
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
          html += '<td><div style="width:100%;height:40px;display:flex;align-items:center;justify-content:center;background:#f7f7f7"><span style="font-size:10px;color:#ccc">—</span></div></td>';
          return;
        }
        let lb, cl, extraLabel = '';
        const k = weekKey(off);
        const isManuallySet = state.schedules[k]?.[emp.id]?.[di] !== undefined;
        const otRange = getWorkedRangeForDate(emp, dateStr);

        if (sh === 'half' || sh === 'half_pm') {
          const base = getBaseShift(emp, di, off);
          lb = getHalfLabel(base, sh); cl = 's-half';
          extraLabel = '<div style="font-size:9px;color:#880e4f;margin-top:1px">' + (sh === 'half' ? '오전반차' : '오후반차') + '</div>';
        } else if (sh === 'off' && isManuallySet) {
          lb = ''; cl = '';
        } else if (isFullShiftKey(sh) && otRange) {
          lb = otRange.text; cl = SHIFT_CLS[sh] || '';
        } else {
          cl = SHIFT_CLS[sh] || ''; lb = SHIFT_LABEL[sh] || '';
        }

        const noteText = getNote(emp.id, di, off);
        const hasOtNote = noteText && noteText.includes('[추가근무]');
        const hasManualNote = noteText && noteText.split('\n').some(l => !l.startsWith('[추가근무]') && l.trim());
        const noteDot = hasOtNote && hasManualNote
          ? '<span title="' + noteText + '" style="position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#1565c0 50%,#f57f17 50%)"></span>'
          : hasOtNote
          ? '<span title="' + noteText + '" style="position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:#1565c0"></span>'
          : hasManualNote
          ? '<span title="' + noteText + '" style="position:absolute;top:3px;right:4px;width:6px;height:6px;border-radius:50%;background:#f57f17"></span>' : '';
        html += '<td>'
          + '<div class="shift-cell" style="flex-direction:column;gap:0;position:relative;cursor:default">'
          + noteDot
          + (lb ? '<div class="shift-pill ' + cl + '">' + lb + '</div>' : '<span style="font-size:10px;color:#ccc">-</span>')
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

function renderSchedule() {
  syncWeekDropdowns();
  const odd = isOddWeek(ui.weekOffset);
  const wb = document.getElementById('weekTypeBadge');
  wb.textContent = odd ? '홀수 주' : '짝수 주';
  wb.style.background = odd ? '#e8f5e9' : '#e3f2fd';
  wb.style.color = odd ? '#2e7d32' : '#1565c0';
  const isConf = isWeekConfirmed(ui.weekOffset);
  const badge = document.getElementById('confirmBadge');
  badge.className = 'confirm-badge ' + (isConf ? 'confirmed' : 'unconfirmed');
  badge.textContent = isConf ? '✓ 확정됨' : '● 미확정 (변경될 수 있음)';
  buildSchTable(document.getElementById('screenSchTable'), ui.weekOffset);
  buildSummaryTable(document.getElementById('screenSummary'), ui.weekOffset);
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

// ══════════════════════ 연차/반차 탭 (읽기 전용 + 사용내역 비밀번호 확인) ══════════════════════
function initLeaveFilters() {
  document.getElementById('leaveEmpFilter').innerHTML = '<option value="">직원을 선택하세요</option>' + fulltimeEmployees().map(e => '<option value="' + e.id + '">' + e.name + ' (' + e.dept + ')</option>').join('');
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
  let html = '<thead><tr><th>직원</th><th>유형</th><th>기간</th><th>사유</th></tr></thead><tbody>';
  if (!filtered.length) html += '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:16px">해당 내역이 없습니다</td></tr>';
  else filtered.forEach(lr => {
    const emp = state.employees.find(e => e.id === lr.empId); if (!emp) return;
    const tl = lr.type === 'annual' ? '연차' : lr.type === 'half' ? '반차(오전)' : '반차(오후)';
    html += '<tr><td><strong>' + emp.name + '</strong> <span style="font-size:11px;color:#aaa">' + emp.dept + '</span></td>'
      + '<td>' + tl + '</td>'
      + '<td>' + (lr.start === lr.end ? lr.start : lr.start + '~' + lr.end) + '</td>'
      + '<td style="color:#888">' + (lr.reason || '-') + '</td></tr>';
  });
  document.getElementById('leaveTable').innerHTML = html + '</tbody>';
}
function buildLeaveRows(requests) {
  if (!requests.length) return '<div style="color:#aaa;font-size:12px;padding:8px 0">내역 없음</div>';
  return '<table class="lv-table" style="font-size:12px"><thead><tr><th>유형</th><th>기간</th><th>일수</th><th>사유</th></tr></thead><tbody>'
    + requests.map(r => {
      const tl = r.type === 'annual' ? '연차' : r.type === 'half' ? '반차(오전)' : '반차(오후)';
      const days = r.type === 'annual' ? Math.round((parseLocalDate(r.end) - parseLocalDate(r.start)) / 864e5) + 1 : 0.5;
      return '<tr><td><span class="badge badge-approved" style="font-size:10px">' + tl + '</span></td>'
        + '<td>' + (r.start === r.end ? r.start : r.start + ' ~ ' + r.end) + '</td>'
        + '<td style="text-align:center;font-weight:600">' + days + '일</td>'
        + '<td style="color:#888">' + (r.reason || '-') + '</td></tr>';
    }).join('') + '</tbody></table>';
}

// ── 연차/반차 달력 (읽기 전용) ──
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
    html += '<div class="cal-cell' + (isToday ? ' today' : '') + (hol ? ' holiday' : '') + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">' + dateNumHtml + '</div>'
      + holBadge + tagsHtml + moreHtml + '</div>';
  }
  const total = startDow + lastDay.getDate(); const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= remain; i++) html += '<div class="cal-cell other-month"><div class="cal-date">' + i + '</div></div>';
  grid.innerHTML = html;
  setTimeout(fitCalToScreen, 50);
}

// ── 직원별 사용 내역: 휴대폰 뒷자리 4자리 확인 후에만 표시 ──
// 주의: 이건 동료끼리 서로 남의 연차 사용내역을 함부로 못 보게 하는 정도의 화면 잠금이며,
// 진짜 서버 인증이 아니다(브라우저 개발자 도구로는 우회 가능). 그 이상의 보안이 필요하면 별도 백엔드 인증이 필요하다.
let unlockedEmpIds = new Set();
function onLeaveHistoryEmpChange() { renderLeaveHistoryViewer(); }
function renderLeaveHistoryViewer() {
  const container = document.getElementById('leaveHistory');
  const empId = +document.getElementById('leaveEmpFilter').value || null;
  if (!empId) { container.innerHTML = '<div style="color:#aaa;font-size:12px;padding:12px 0;text-align:center">직원을 선택하면 사용 내역을 확인할 수 있습니다</div>'; return; }
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) { container.innerHTML = ''; return; }

  if (!unlockedEmpIds.has(empId)) {
    const hasPhone = !!(emp.phone && emp.phone.replace(/\D/g, '').length >= 4);
    if (!hasPhone) {
      container.innerHTML = '<div style="color:#c0392b;font-size:12px;padding:12px 0;text-align:center">이 직원은 전화번호가 등록되어 있지 않아 확인할 수 없습니다. 관리자에게 문의해주세요.</div>';
      return;
    }
    container.innerHTML = '<div style="max-width:280px;margin:10px auto;text-align:center">'
      + '<div style="font-size:12px;color:#555;margin-bottom:8px">' + emp.name + '님 본인 확인<br>휴대폰 번호 뒷자리 4자리를 입력하세요</div>'
      + '<input type="password" inputmode="numeric" maxlength="4" id="lvHistPw" placeholder="0000" style="text-align:center;letter-spacing:4px;font-size:16px;margin-bottom:8px" onkeydown="if(event.key===\'Enter\')submitLeaveHistoryPassword(' + empId + ')">'
      + '<div id="lvHistPwErr" style="color:#c0392b;font-size:11px;min-height:16px;margin-bottom:6px"></div>'
      + '<button class="btn primary sm" onclick="submitLeaveHistoryPassword(' + empId + ')">확인</button>'
      + '</div>';
    document.getElementById('lvHistPw')?.focus();
    return;
  }

  const year = document.getElementById('leaveYearFilter').value;
  let filtered = ftLeaveRequests().filter(r => r.status !== 'rejected' && r.empId === empId);
  if (year) filtered = filtered.filter(r => r.start.startsWith(year));
  filtered = [...filtered].sort((a, b) => b.start.localeCompare(a.start));
  const earned = calcEarnedAnnual(emp.joinDate, emp.bonusAnnual, emp); const used = calcUsedAnnual(emp.id); const rem = earned - used;
  container.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #dde4ee">'
    + '<span style="font-weight:600;font-size:13px">' + emp.name + '</span><span style="font-size:11px;color:#aaa">' + emp.dept + '</span>'
    + '<span style="margin-left:auto;font-size:11px;color:#888">발생 ' + earned + '일 · 사용 ' + used + '일 · <strong style="color:' + (rem < 0 ? '#c0392b' : '#2e7d32') + '">' + rem + '일 잔여</strong></span>'
    + '<button class="btn sm" onclick="lockLeaveHistory(' + empId + ')" style="font-size:10px">🔒 잠금</button></div>'
    + buildLeaveRows(filtered);
}
function submitLeaveHistoryPassword(empId) {
  const emp = state.employees.find(e => e.id === empId); if (!emp) return;
  const input = (document.getElementById('lvHistPw').value || '').trim();
  const last4 = (emp.phone || '').replace(/\D/g, '').slice(-4);
  if (input && input === last4) { unlockedEmpIds.add(empId); renderLeaveHistoryViewer(); }
  else { const err = document.getElementById('lvHistPwErr'); if (err) err.textContent = '번호가 일치하지 않습니다'; document.getElementById('lvHistPw').value = ''; document.getElementById('lvHistPw').focus(); }
}
function lockLeaveHistory(empId) { unlockedEmpIds.delete(empId); renderLeaveHistoryViewer(); }
