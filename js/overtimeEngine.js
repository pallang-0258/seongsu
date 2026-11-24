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

// 직원별 추가근무 합계 (month가 ''이면 그 해 전체). 추가근무한 직원만, 정규직/파트로 나눠서 시간 많은 순으로.
function calcOvertimeSummaryByEmp(year, month) {
  const prefix = String(year) + (month ? '-' + String(month).padStart(2, '0') : '');
  const map = {};
  state.overtimeRecords.forEach(r => {
    if (!r.date.startsWith(prefix)) return;
    if (!map[r.empId]) map[r.empId] = { hours: 0, count: 0 };
    map[r.empId].hours += calcOtHours(r.startTime, r.endTime);
    map[r.empId].count++;
  });
  const list = state.employees.filter(e => map[e.id])
    .map(e => ({ emp: e, count: map[e.id].count, hours: Math.round(map[e.id].hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);
  return { regular: list.filter(d => d.emp.employmentType !== 'parttime'), part: list.filter(d => d.emp.employmentType === 'parttime') };
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
  const { regular, part } = calcOvertimeSummaryByEmp(year, month + 1);
  rows.push(['— 직원별 월간 추가근무 합계 —']);
  rows.push(['직원', '부서', '추가근무 횟수', '추가근무시간']);
  regular.forEach(d => rows.push([d.emp.name, d.emp.dept, d.count, d.hours]));
  if (part.length) {
    rows.push([]);
    rows.push(['— 파트 직원 추가근무 합계 (근무표 파트 리포트에 이미 반영됨) —']);
    rows.push(['직원', '부서', '추가근무 횟수', '추가근무시간']);
    part.forEach(d => rows.push([d.emp.name, d.emp.dept, d.count, d.hours]));
  }
  downloadCsv('overtime_' + monthStr + '.csv', rows);
}
