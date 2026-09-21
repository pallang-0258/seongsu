// ── 추가근무 엔진 ──

function calcOtHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return Math.round(mins / 60 * 10) / 10;
}

function createOvertime({ empId, date, startTime, endTime, reason }) {
  state.overtimeRecords.push({ id: nextId(state.overtimeRecords), empId, date, startTime, endTime, reason });
  syncOvertimeNoteForDate(empId, date);
  save();
}
function updateOvertime(id, { empId, date, startTime, endTime, reason }) {
  const r = state.overtimeRecords.find(x => x.id === id); if (!r) return;
  const oldDate = r.date, oldEmpId = r.empId;
  r.empId = empId; r.date = date; r.startTime = startTime; r.endTime = endTime; r.reason = reason;
  if (oldDate !== date || oldEmpId !== empId) syncOvertimeNoteForDate(oldEmpId, oldDate);
  syncOvertimeNoteForDate(empId, date);
  save();
}
function deleteOvertime(id) {
  const rec = state.overtimeRecords.find(x => x.id === id);
  state.overtimeRecords = state.overtimeRecords.filter(x => x.id !== id);
  if (rec) syncOvertimeNoteForDate(rec.empId, rec.date);
  save();
}

// 특정 직원의 특정 날짜 추가근무 메모를 근무표 노트(schedules[wk]._notes)에 동기화
function syncOvertimeNoteForDate(empId, dateStr) {
  try {
    if (isDateConfirmed(dateStr)) return; // 확정된 주는 건드리지 않음
    const recs = state.overtimeRecords.filter(r => r.empId === empId && r.date === dateStr);
    const off = dateToWeekOffset(dateStr);
    const di = dateToDayIndex(dateStr);
    if (recs.length === 0) {
      const existing = getNote(empId, di, off);
      const cleaned = existing.split('\n').filter(l => !l.startsWith('[추가근무]')).join('\n').trim();
      setNote(empId, di, cleaned, off);
    } else {
      const otLines = recs.map(r => {
        const hrs = calcOtHours(r.startTime, r.endTime);
        return '[추가근무] ' + r.startTime + '~' + r.endTime + ' (' + hrs + '시간)' + (r.reason ? ' ' + r.reason : '');
      });
      const existing = getNote(empId, di, off);
      const manualLines = existing.split('\n').filter(l => !l.startsWith('[추가근무]')).join('\n').trim();
      const combined = otLines.join('\n') + (manualLines ? '\n' + manualLines : '');
      setNote(empId, di, combined, off);
    }
  } catch (e) { console.warn('syncOvertimeNoteForDate 오류:', e); }
}

// ── 정규 근무시간 계산 (월별 합산용) ──
function calcScheduledHoursForDate(emp, dateStr) {
  const sh = getShiftForDate(emp, dateStr);
  if (sh === 'off' || sh === '__off__' || sh === 'annual') return 0;
  if (sh === 'half' || sh === 'half_pm') {
    const base = getBaseShiftForDate(emp, dateStr);
    return getHalfHours(base, sh);
  }
  if (isFullShiftKey(sh)) return SHIFT_HOURS[sh] || 0;
  return 0;
}

// 월별 직원별 "정규근무 + 추가근무" 합산 (급여 참고용)
function calcMonthlyPayrollSummary(year, month) {
  const dates = getDatesInMonth(year, month);
  const result = {}; // empId -> {regular, overtime, otCount, total}
  state.employees.forEach(e => { result[e.id] = { regular: 0, overtime: 0, otCount: 0 }; });
  dates.forEach(dateStr => {
    state.employees.forEach(e => {
      result[e.id].regular += calcScheduledHoursForDate(e, dateStr);
    });
  });
  state.overtimeRecords.forEach(r => {
    if (!r.date.startsWith(year + '-' + String(month + 1).padStart(2, '0'))) return;
    if (!result[r.empId]) result[r.empId] = { regular: 0, overtime: 0, otCount: 0 };
    result[r.empId].overtime += calcOtHours(r.startTime, r.endTime);
    result[r.empId].otCount++;
  });
  Object.keys(result).forEach(id => { result[id].total = Math.round((result[id].regular + result[id].overtime) * 10) / 10; result[id].regular = Math.round(result[id].regular * 10) / 10; });
  return result;
}

// ── CSV 내보내기 (클라이언트 사이드) ──
function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => {
    const s = (cell === null || cell === undefined) ? '' : String(cell);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportOvertimeMonthCsv(year, month) {
  const monthStr = year + '-' + String(month + 1).padStart(2, '0');
  const recs = state.overtimeRecords.filter(r => r.date.startsWith(monthStr)).sort((a, b) => a.date.localeCompare(b.date));
  const rows = [['직원', '부서', '날짜', '시작시간', '종료시간', '추가근무시간', '사유']];
  recs.forEach(r => {
    const emp = state.employees.find(e => e.id === r.empId);
    rows.push([emp ? emp.name : r.empId, emp ? emp.dept : '', r.date, r.startTime, r.endTime, calcOtHours(r.startTime, r.endTime), r.reason || '']);
  });
  rows.push([]);
  rows.push(['— 직원별 월간 합계 (정규근무 + 추가근무) —']);
  rows.push(['직원', '부서', '정규근무시간', '추가근무시간', '합계시간']);
  const summary = calcMonthlyPayrollSummary(year, month);
  state.employees.forEach(e => {
    const s = summary[e.id]; if (!s || (s.regular === 0 && s.overtime === 0)) return;
    rows.push([e.name, e.dept, s.regular, s.overtime, s.total]);
  });
  downloadCsv('overtime_' + monthStr + '.csv', rows);
}
