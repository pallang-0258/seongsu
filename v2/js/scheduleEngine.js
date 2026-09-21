// ── 근무표 엔진 ──
// admin4_fixed.html의 shouldWork/getPatternAt/getShift/getBaseShift/setShiftRaw 로직을 이식하되,
// (1) 요일별 홀짝 교대근무({alt:true,odd,even}) 지원과
// (2) 확정 스냅샷(confirmedSnapshots)을 "단일 진실 소스"로 우선 적용하는 로직을 추가했다.

// 직원이 해당 요일에 "출근 대상"인지 (격주 근무유형 포함, 실제 배정 근무유형과 무관)
function shouldWork(emp, di, off) {
  const wd = emp.workDays ? emp.workDays[di] : 1;
  if (!wd) return false;
  if (emp.workType === 'biweek_odd') return isOddWeek(off);
  if (emp.workType === 'biweek_even') return !isOddWeek(off);
  return true;
}

// shiftHistory 타임라인에서 dateStr에 해당하는 패턴(7칸 배열) 반환
function getPatternAt(empId, dateStr) {
  const hist = (state.shiftHistory[empId] || []).slice().sort((a, b) => a.applyFrom.localeCompare(b.applyFrom));
  if (!hist.length) return state.defaultShift[empId];
  if (dateStr < hist[0].applyFrom) return hist[0].oldShift;
  let pat = hist[0].newShift;
  for (let i = 1; i < hist.length; i++) {
    if (dateStr >= hist[i].applyFrom) pat = hist[i].newShift;
    else break;
  }
  return pat;
}

// 하루치 패턴 값(문자열 | null | {alt,odd,even}) → 해당 주(off)의 홀/짝에 맞춰 실제 시프트 키로 해소
function resolveDayPattern(patDay, off) {
  if (patDay && typeof patDay === 'object') {
    if (patDay.alt) return isOddWeek(off) ? patDay.odd : patDay.even;
    return null;
  }
  return patDay || null;
}

function isFullShiftKey(v) { return v === '1020' || v === '1019' || v === '1323'; }

// 오늘 기준으로 적용되는 "현재" 패턴 (shiftHistory를 거쳐 해소된 값).
// admin4_fixed.html은 promoteShiftHistory()로 DEFAULT_SHIFT를 주기적으로 이관했지만,
// 여기서는 부작용 있는 상태변경 없이 항상 getPatternAt으로 계산해 항상 최신 상태를 보장한다.
function getCurrentPattern(empId) {
  return getPatternAt(empId, toLocalDateStr(TODAY)) || Array(7).fill(null);
}

// ── 스냅샷 우선 조회 헬퍼 ──
function getSnapshotEntry(empId, dateStr) {
  const wk = weekKeyForDate(dateStr);
  const snap = state.confirmedSnapshots[wk];
  if (!snap || !snap[empId]) return null;
  const di = dateToDayIndex(dateStr);
  return { wk, di, snap: snap[empId] };
}
function isWeekConfirmed(off) {
  return !!state.confirmedSnapshots[weekKey(off)];
}
function isDateConfirmed(dateStr) {
  return !!state.confirmedSnapshots[weekKeyForDate(dateStr)];
}

// ── 날짜 기준 핵심 조회 함수 (모든 다른 계산의 기반) ──
function getShiftForDate(emp, dateStr) {
  const s = getSnapshotEntry(emp.id, dateStr);
  if (s) return s.snap.shift[s.di];

  if (emp.joinDate && dateStr < emp.joinDate) return '__off__';
  if (emp.leaveDate && dateStr > emp.leaveDate) return '__off__';
  const lr = (state.leaveRequests || []).find(r => r.empId === emp.id && r.status === 'approved' && dateStr >= r.start && dateStr <= r.end);
  if (lr) return lr.type === 'half_pm' ? 'half_pm' : lr.type === 'half' ? 'half' : 'annual';

  const off = dateToWeekOffset(dateStr);
  const di = dateToDayIndex(dateStr);
  const wk = weekKey(off);
  const ov = state.schedules[wk]?.[emp.id]?.[di];
  if (ov !== undefined) return ov;
  if (!shouldWork(emp, di, off)) return '__off__';
  const pat = getPatternAt(emp.id, dateStr);
  const resolved = pat ? resolveDayPattern(pat[di], off) : null;
  return resolved || 'off';
}

function getBaseShiftForDate(emp, dateStr) {
  const s = getSnapshotEntry(emp.id, dateStr);
  if (s) return s.snap.base[s.di];

  if (emp.joinDate && dateStr < emp.joinDate) return '__off__';
  if (emp.leaveDate && dateStr > emp.leaveDate) return '__off__';
  const off = dateToWeekOffset(dateStr);
  const di = dateToDayIndex(dateStr);
  const wk = weekKey(off);
  const ov = state.schedules[wk]?.[emp.id]?.[di];
  if (ov !== undefined && ov !== 'half' && ov !== 'half_pm' && ov !== 'annual') return ov;
  if (!shouldWork(emp, di, off)) return '__off__';
  const pat = getPatternAt(emp.id, dateStr);
  const resolved = pat ? resolveDayPattern(pat[di], off) : null;
  return resolved || 'off';
}

function getNoteForDate(emp, dateStr) {
  const s = getSnapshotEntry(emp.id, dateStr);
  if (s) return s.snap.note[s.di] || '';
  const wk = weekKeyForDate(dateStr);
  const di = dateToDayIndex(dateStr);
  return state.schedules[wk]?._notes?.[emp.id]?.[di] || '';
}

// ── 기존 코드(주차 오프셋 기반) 호환 래퍼 ──
function getShift(emp, di, off) { return getShiftForDate(emp, toLocalDateStr(getWeekDays(off)[di])); }
function getBaseShift(emp, di, off) { return getBaseShiftForDate(emp, toLocalDateStr(getWeekDays(off)[di])); }
function getNote(empId, di, off) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return '';
  return getNoteForDate(emp, toLocalDateStr(getWeekDays(off)[di]));
}
function setNote(empId, di, note, off) {
  const k = weekKey(off);
  if (isWeekConfirmed(off)) return; // 확정된 주는 수정 불가
  if (!state.schedules[k]) state.schedules[k] = {};
  if (!state.schedules[k]._notes) state.schedules[k]._notes = {};
  if (!state.schedules[k]._notes[empId]) state.schedules[k]._notes[empId] = {};
  if (note && note.trim()) { state.schedules[k]._notes[empId][di] = note.trim(); }
  else { delete state.schedules[k]._notes[empId][di]; }
}

function setShiftRaw(empId, di, sh, off) {
  if (isWeekConfirmed(off)) { alert('이 주는 확정되어 있습니다. 수정하려면 먼저 확정을 해제하세요.'); return false; }
  const k = weekKey(off);
  if (!state.schedules[k]) state.schedules[k] = {};
  if (!state.schedules[k][empId]) state.schedules[k][empId] = {};
  state.schedules[k][empId][di] = sh;
  state.confirmed[k] = false;
  save();
  return true;
}

// ── 재직 여부 ──
function hasJoined(emp, off) {
  if (!emp.joinDate) return true;
  const weekSun = new Date(getWeekStart(off)); weekSun.setDate(weekSun.getDate() + 6);
  return parseLocalDate(emp.joinDate) <= weekSun;
}
function isResigned(emp) {
  if (!emp.leaveDate) return false;
  return parseLocalDate(emp.leaveDate) < TODAY;
}
function isActiveForWeek(emp, off) {
  if (!hasJoined(emp, off)) return false;
  if (emp.leaveDate) {
    const weekMon = getWeekStart(off);
    if (parseLocalDate(emp.leaveDate) < weekMon) return false;
  }
  return true;
}

// ── 확정(스냅샷) 로직 ──
// 요구사항 버그수정: 주 확정 시 그 주의 "해석된 결과값"을 스냅샷으로 저장하고,
// 스냅샷이 있는 주는 이후 shiftHistory/DEFAULT_SHIFT/schedules가 어떻게 바뀌든
// 항상 스냅샷 값만 반환한다 (getShiftForDate/getBaseShiftForDate/getNoteForDate 최상단 참조).
function confirmSchedule(off) {
  off = off ?? ui.weekOffset;
  const k = weekKey(off);
  if (state.confirmedSnapshots[k]) { alert('이미 확정된 주입니다.'); return; }
  const days = getWeekDays(off);
  const activeEmps = state.employees.filter(e => isActiveForWeek(e, off));
  const snap = {};
  activeEmps.forEach(emp => {
    const shiftArr = [], baseArr = [], noteArr = [];
    for (let di = 0; di < 7; di++) {
      const dateStr = toLocalDateStr(days[di]);
      shiftArr.push(getShiftForDate(emp, dateStr));
      baseArr.push(getBaseShiftForDate(emp, dateStr));
      noteArr.push(getNoteForDate(emp, dateStr));
    }
    snap[emp.id] = { shift: shiftArr, base: baseArr, note: noteArr };
  });
  state.confirmedSnapshots[k] = snap;
  state.confirmed[k] = true;
  save();
}
function unconfirmSchedule(off) {
  off = off ?? ui.weekOffset;
  const k = weekKey(off);
  if (!state.confirmedSnapshots[k]) return;
  if (!confirm('이 주의 확정을 해제할까요? 해제하면 다시 실시간 근무패턴을 기준으로 계산되며 수정할 수 있게 됩니다.')) return;
  delete state.confirmedSnapshots[k];
  state.confirmed[k] = false;
  save();
  renderSchedule();
}

function resetWeekSchedule(off) {
  off = off ?? ui.weekOffset;
  const k = weekKey(off);
  if (isWeekConfirmed(off)) { alert('이 주는 확정되어 있습니다. 초기화하려면 먼저 확정을 해제하세요.'); return; }
  const days = getWeekDays(off);
  const weekDateStrs = days.map(d => toLocalDateStr(d));
  const hadChanges = !!(state.schedules[k] && Object.keys(state.schedules[k]).filter(x => x !== '_notes').length);
  const hadLeaves = state.leaveRequests.some(r => r.reason === '근무표에서 등록' && weekDateStrs.includes(r.start));
  if (!hadChanges && !hadLeaves) { alert('이 주에 수동으로 변경된 근무가 없습니다.'); return; }
  if (!confirm('이 주의 수동 변경을 모두 초기화하고 기본 근무표로 되돌릴까요?\n(메모는 유지됩니다)')) return;
  if (state.schedules[k]) { const notes = state.schedules[k]._notes; state.schedules[k] = {}; if (notes) state.schedules[k]._notes = notes; }
  state.leaveRequests = state.leaveRequests.filter(r => !(r.reason === '근무표에서 등록' && weekDateStrs.includes(r.start)));
  state.confirmed[k] = false;
  save(); renderSchedule();
}

// ── 요약표용 ──
function getDisplayInfo(emp, di2, off) {
  const sh = getShift(emp, di2, off);
  if (sh === 'half' || sh === 'half_pm') return { shiftKey: getBaseShift(emp, di2, off), isHalf: true, halfType: sh };
  return { shiftKey: sh, isHalf: false, halfType: null };
}

// ── 추가근무 반영 실제 근무 구간 (기능 5: "10-20 + 3h → 10-23" 처럼 실제 구간 표시) ──
// 기본 시프트 구간에 그 날짜의 모든 추가근무 기록 구간을 합쳐(union) 표시 문자열을 만든다.
function getWorkedRangeForDate(emp, dateStr) {
  const baseShift = getBaseShiftForDate(emp, dateStr);
  const otRecs = (state.overtimeRecords || []).filter(r => r.empId === emp.id && r.date === dateStr);
  let range = isFullShiftKey(baseShift) ? SHIFT_RANGE_MIN[baseShift].slice() : null;
  if (!otRecs.length) return null;
  otRecs.forEach(r => {
    if (!r.startTime || !r.endTime) return;
    const [sh, sm] = r.startTime.split(':').map(Number);
    const [eh, em] = r.endTime.split(':').map(Number);
    const s = sh * 60 + sm, e = eh * 60 + em;
    if (!range) range = [s, e];
    else range = [Math.min(range[0], s), Math.max(range[1], e)];
  });
  if (!range) return null;
  return { text: formatMinutesLabel(range[0]) + '-' + formatMinutesLabel(range[1]), startMin: range[0], endMin: range[1] };
}
function hasOvertimeOnDate(empId, dateStr) {
  return (state.overtimeRecords || []).some(r => r.empId === empId && r.date === dateStr);
}
