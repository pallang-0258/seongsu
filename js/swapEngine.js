// ── 근무 교환 엔진 ──
// 두 직원이 선택한 날짜(1개 또는 2개)마다 서로의 근무를 맞바꾼다.
//  - 같은 날 교환: 10/8에 A(10-20) ↔ B(13-23)
//  - 다른 날 교환: 10/8과 10/10 두 날짜에서 각각 A ↔ B를 맞바꾼다
//    (A가 10/8을 B에게 넘기고, 대신 10/10의 B 근무를 A가 맡는 형태)
// 교환 결과는 state.schedules(수동 변경)에 기록하고, 확정된 주라면 확정 스냅샷에도 함께 반영한다.
// (schedules에도 남겨두기 때문에 나중에 확정을 해제해도 교환이 사라지지 않는다.)
// 교환 내역은 state.shiftSwaps에 남고, 취소하면 교환 전 상태로 되돌린 뒤 내역에서도 삭제한다.

const SWAP_LEAVE_KEYS = ['annual', 'half', 'half_pm'];
const SWAP_ALLOW_CONFIRMED_WEEKS = true;

function swapShiftLabel(v) {
  if (v === '__off__' || v === 'off' || !v) return '휴무';
  return SHIFT_LABEL[v] || v;
}
// 표시·비교용: '__off__'(비근무일)과 'off'(휴무)는 같은 "쉬는 날"로 본다
function swapNorm(v) { return (v === '__off__' || !v) ? 'off' : v; }

function activeShiftSwaps() { return (state.shiftSwaps || []).filter(s => !s.cancelled); }

// 직원 + 날짜 칸에 걸린(취소되지 않은) 교환 기록.
// 교환 뒤에 그 날 연차·반차를 써도 교환 표시는 그대로 남긴다.
function getSwapForCell(emp, dateStr) {
  const list = activeShiftSwaps();
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].cells.some(x => x.empId === emp.id && x.date === dateStr)) return list[i];
  }
  return null;
}
// 근무 교환 내역 표시용 한 줄 요약. 예) "10/9 최하은 <> 10/11 김진성", 같은 날이면 "10/9 최하은 <> 김진성"
// 다른 날 교환은 날짜마다 원래 그 날 근무하던 사람을 그 날짜 옆에 적는다.
function swapSummaryText(swap) {
  const nm = id => { const e = state.employees.find(x => x.id === id); return e ? e.name : '(삭제된 직원)'; };
  const md = d => +d.slice(5, 7) + '/' + +d.slice(8, 10);
  if (swap.dates.length < 2) return md(swap.dates[0]) + ' ' + nm(swap.empA) + ' <> ' + nm(swap.empB);
  const [d1, d2] = swap.dates;
  const workedOn = (d, fallback) => {
    const c = swap.cells.find(x => x.date === d && swapNorm(x.before) !== 'off' && swapNorm(x.after) === 'off');
    return c ? c.empId : fallback;
  };
  let p1 = workedOn(d1, swap.empA);
  let p2 = workedOn(d2, p1 === swap.empA ? swap.empB : swap.empA);
  if (p1 === p2) { p1 = swap.empA; p2 = swap.empB; }
  return md(d1) + ' ' + nm(p1) + ' <> ' + md(d2) + ' ' + nm(p2);
}
function swapPartnerName(swap, empId) {
  const otherId = swap.empA === empId ? swap.empB : swap.empA;
  const o = state.employees.find(e => e.id === otherId);
  return o ? o.name : '(삭제된 직원)';
}
function swapCellTitle(swap, emp, dateStr) {
  const c = swap.cells.find(x => x.empId === emp.id && x.date === dateStr);
  return '근무 교환: ' + swapPartnerName(swap, emp.id) + '와(과) 교환 (' + swapShiftLabel(c.before) + ' → ' + swapShiftLabel(c.after) + ')'
    + (swap.memo ? ' · ' + swap.memo : '');
}

function isEmployedOn(emp, dateStr) {
  if (emp.joinDate && dateStr < emp.joinDate) return false;
  if (emp.leaveDate && dateStr > emp.leaveDate) return false;
  return true;
}

// 교환 미리보기: { cells: [{empId,date,before,after}], errors: [문자열] }
function planShiftSwap(empAId, empBId, dates) {
  const errors = [];
  const empA = state.employees.find(e => e.id === empAId);
  const empB = state.employees.find(e => e.id === empBId);
  if (!empA || !empB) return { cells: [], errors: ['교환할 직원 두 명을 골라주세요.'] };
  if (empA.id === empB.id) return { cells: [], errors: ['서로 다른 직원 두 명을 골라주세요.'] };
  dates = dates.filter(Boolean);
  if (!dates.length) return { cells: [], errors: ['날짜를 골라주세요.'] };
  if (dates.length === 2 && dates[0] === dates[1]) return { cells: [], errors: ['서로 다른 날짜 두 개를 골라주세요. 같은 날 교환이면 "같은 날"을 선택하세요.'] };

  const cells = [];
  let anyChange = false;
  dates.forEach(dateStr => {
    const md = dateStr.slice(5).replace('-', '/');
    [empA, empB].forEach(emp => {
      if (!isEmployedOn(emp, dateStr)) errors.push(md + ': ' + emp.name + ' 님은 이 날짜에 재직 중이 아니에요.');
    });
    const shA = getShiftForDate(empA, dateStr);
    const shB = getShiftForDate(empB, dateStr);
    [[empA, shA], [empB, shB]].forEach(([emp, sh]) => {
      if (SWAP_LEAVE_KEYS.includes(sh)) errors.push(md + ': ' + emp.name + ' 님은 ' + swapShiftLabel(sh) + '가 있어서 교환할 수 없어요. 연차를 먼저 정리해 주세요.');
    });
    if (isDateConfirmed(dateStr)) {
      if (!SWAP_ALLOW_CONFIRMED_WEEKS) errors.push(md + ': 확정된 주예요. 먼저 확정을 해제해 주세요.');
      const snap = state.confirmedSnapshots[weekKeyForDate(dateStr)];
      [empA, empB].forEach(emp => {
        if (!snap[emp.id]) errors.push(md + ': ' + emp.name + ' 님이 확정된 근무표에 없어서 교환할 수 없어요.');
      });
    }
    if (swapNorm(shA) !== swapNorm(shB)) anyChange = true;
    cells.push({ empId: empA.id, date: dateStr, before: shA, after: shB });
    cells.push({ empId: empB.id, date: dateStr, before: shB, after: shA });
  });
  if (!errors.length && !anyChange) errors.push('두 직원의 근무가 같아서 바뀌는 내용이 없어요.');
  return { cells, errors };
}

// 한 칸에 근무 값을 기록한다 (수동 변경 + 확정 스냅샷)
function writeSwapCell(empId, dateStr, value) {
  const wk = weekKeyForDate(dateStr), di = dateToDayIndex(dateStr);
  if (!state.schedules[wk]) state.schedules[wk] = {};
  if (!state.schedules[wk][empId]) state.schedules[wk][empId] = {};
  state.schedules[wk][empId][di] = swapNorm(value);
  const snap = state.confirmedSnapshots[wk];
  if (snap && snap[empId]) {
    snap[empId].shift[di] = swapNorm(value);
    snap[empId].base[di] = swapNorm(value);
  } else {
    state.confirmed[wk] = false;
  }
}

function applyShiftSwap(empAId, empBId, dates, memo) {
  const plan = planShiftSwap(empAId, empBId, dates);
  if (plan.errors.length) return { ok: false, errors: plan.errors };
  plan.cells.forEach(c => {
    const wk = weekKeyForDate(c.date), di = dateToDayIndex(c.date);
    const prev = state.schedules[wk]?.[c.empId]?.[di];
    c.prevOverride = prev === undefined ? null : prev;
  });
  plan.cells.forEach(c => writeSwapCell(c.empId, c.date, c.after));
  if (!state.shiftSwaps) state.shiftSwaps = [];
  const rec = {
    id: nextId(state.shiftSwaps),
    empA: empAId, empB: empBId,
    dates: dates.filter(Boolean),
    memo: (memo || '').trim(),
    createdAt: toLocalDateStr(TODAY),
    cells: plan.cells,
    cancelled: false,
  };
  state.shiftSwaps.push(rec);
  save();
  return { ok: true, swap: rec };
}

// 교환 이후 같은 칸이 다시 바뀌었는지 (취소 전 경고용)
function swapChangedSince(swap) {
  return swap.cells.filter(c => {
    const emp = state.employees.find(e => e.id === c.empId);
    return emp && swapNorm(getShiftForDate(emp, c.date)) !== swapNorm(c.after);
  });
}

function cancelShiftSwap(id) {
  const swap = (state.shiftSwaps || []).find(s => s.id === id);
  if (!swap || swap.cancelled) return false;
  swap.cells.forEach(c => {
    const wk = weekKeyForDate(c.date), di = dateToDayIndex(c.date);
    if (state.schedules[wk]?.[c.empId]) {
      if (c.prevOverride === null || c.prevOverride === undefined) delete state.schedules[wk][c.empId][di];
      else state.schedules[wk][c.empId][di] = c.prevOverride;
    }
    const snap = state.confirmedSnapshots[wk];
    if (snap && snap[c.empId]) {
      snap[c.empId].shift[di] = c.before;
      snap[c.empId].base[di] = c.before;
    } else {
      state.confirmed[wk] = false;
    }
  });
  // 취소한 교환은 내역에 남기지 않고 삭제한다
  state.shiftSwaps = state.shiftSwaps.filter(x => x.id !== id);
  save();
  return true;
}
