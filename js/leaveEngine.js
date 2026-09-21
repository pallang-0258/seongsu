// ── 연차/반차 엔진 ──
// 새 연차 발생 공식(근로기준법 기준) + 승계연차 가산 + 파트타임 제외 로직.

function isFulltime(emp) { return (emp.employmentType || 'fulltime') !== 'parttime'; }
function fulltimeEmployees() { return state.employees.filter(isFulltime); }

// fromDate부터 toDate까지 완주한 개월 수 (toDate가 fromDate보다 이르면 0)
function monthsElapsed(fromDate, toDate) {
  if (toDate < fromDate) return 0;
  let months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
  const annivThisMonth = new Date(toDate.getFullYear(), toDate.getMonth(), fromDate.getDate());
  if (toDate < annivThisMonth) months--;
  return Math.max(months, 0);
}

// 새 연차 발생 공식 (2012년 개정 근로기준법 기준):
//  - 근속 1년 미만: 개근한 달마다 1일, 최대 11일
//  - 근속 1년 이상: 1년 미만 기간 동안 쌓인 최대 11일은 사라지지 않고 그대로 유지된 채,
//    그 위에 15일(3년차부터 2년마다 +1, 최대 25일)이 "합산"된다 — 2012년 개정 전에는 서로 상쇄됐지만
//    지금은 법적으로 상쇄 조항이 삭제되어 최대 11+15=26일부터 시작한다.
// 파트타임 직원은 연차 발생 대상이 아니므로 항상 0.
// 타지점 등에서 이동해온 경우 emp.trueJoinDate(연차 인정 시작일)가 "1년 경과 여부" 판단 기준이 되고,
// 1년 미만 구간의 매달 가산은 이 지점 실제 근무 시작일(joinDate) 기준으로 계산한다
// (타지점 재직 기간의 매달 가산은 그쪽에서 이미 별도로 관리했을 것이므로 중복 계산하지 않음).
function calcEarnedAnnual(joinDateStr, bonusAnnual, emp) {
  if (emp && !isFulltime(emp)) return 0; // 파트타임: 연차 시스템에서 완전히 제외
  if (!joinDateStr) return (bonusAnnual || 0);
  const effectiveJoinStr = (emp && emp.trueJoinDate) || joinDateStr;
  const trueJoin = parseLocalDate(effectiveJoinStr);
  const branchJoin = parseLocalDate(joinDateStr);
  const now = TODAY;
  let base = 0;
  if (now >= trueJoin) {
    let years = now.getFullYear() - trueJoin.getFullYear();
    const annivThisYear = new Date(now.getFullYear(), trueJoin.getMonth(), trueJoin.getDate());
    if (now < annivThisYear) years--;
    years = Math.max(years, 0);

    if (years < 1) {
      base = Math.min(monthsElapsed(branchJoin, now), 11);
    } else {
      // 1년 시점(연차 인정 시작일 기준 1주년)까지 이 지점에서 쌓였을 개월수를 고정값으로 반영
      const trueAnniv = new Date(trueJoin.getFullYear() + 1, trueJoin.getMonth(), trueJoin.getDate());
      const firstYearCredit = Math.min(monthsElapsed(branchJoin, trueAnniv), 11);
      const yearNCredit = Math.min(15 + Math.floor((years - 1) / 2), 25);
      base = firstYearCredit + yearNCredit;
    }
  }
  return base + (bonusAnnual || 0);
}

function calcUsedAnnual(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (emp && !isFulltime(emp)) return 0;
  return state.leaveRequests.filter(r => r.empId === empId && r.status === 'approved').reduce((s, r) => {
    if (r.type === 'annual') { const d = Math.round((parseLocalDate(r.end) - parseLocalDate(r.start)) / 864e5) + 1; return s + d; }
    return s + 0.5;
  }, 0);
}

// ── 승계/차감 연차 조정 ──
// 이력 항목은 두 가지 형태가 섞여 있을 수 있다:
//  - 예전 방식(구버전 admin4_fixed.html 포함): {bonus: <그 시점의 절대값>, reason, date} — "합계를 이 값으로 설정"
//  - 새 방식: {id, delta: <이번에 더하거나 뺄 일수>, reason, date} — "합계에 이만큼 가감"
// 합계는 항상 이력을 순서대로 재생해서 계산한다 (delta면 누적, bonus면 그 값으로 리셋).
// 이렇게 하면 이력 중 아무 항목이나 삭제해도 항상 정확한 합계로 다시 계산된다.
function computeBonusAnnualTotal(history) {
  let total = 0;
  (history || []).forEach(h => {
    if (h.delta !== undefined) total += h.delta;
    else if (h.bonus !== undefined) total = h.bonus;
  });
  return total;
}
function addBonusAnnualAdjustment(empId, delta, reason) {
  const e = state.employees.find(emp => emp.id === empId); if (!e || !delta) return;
  if (!e.bonusAnnualHistory) e.bonusAnnualHistory = [];
  e.bonusAnnualHistory.push({ id: nextId(e.bonusAnnualHistory), delta, reason, date: toLocalDateStr(TODAY) });
  e.bonusAnnual = computeBonusAnnualTotal(e.bonusAnnualHistory);
  save();
}
function deleteBonusAnnualAdjustment(empId, historyId) {
  const e = state.employees.find(emp => emp.id === empId); if (!e || !e.bonusAnnualHistory) return;
  e.bonusAnnualHistory = e.bonusAnnualHistory.filter(h => h.id !== historyId);
  e.bonusAnnual = computeBonusAnnualTotal(e.bonusAnnualHistory);
  save();
}

// ── 연차/반차 신청 CRUD ──
function nextId(arr) { return (arr.length ? Math.max(...arr.map(x => x.id || 0)) : 0) + 1; }

function createLeaveRequest({ empId, type, start, end, reason }) {
  state.leaveRequests.push({ id: nextId(state.leaveRequests), empId, type, start, end, reason, status: 'approved', createdAt: toLocalDateStr(TODAY) });
  save();
}
function updateLeaveRequest(id, { empId, type, start, end, reason }) {
  const lr = state.leaveRequests.find(r => r.id === id); if (!lr) return;
  lr.empId = empId; lr.type = type; lr.start = start; lr.end = end; lr.reason = reason;
  save();
}
function deleteLeaveRequest(id) {
  state.leaveRequests = state.leaveRequests.filter(r => r.id !== id);
  save();
}
function setLeaveStatus(id, status) {
  const lr = state.leaveRequests.find(r => r.id === id); if (!lr) return;
  lr.status = status;
  save();
}

function buildYearOptions(extraYears = []) {
  const years = new Set([...state.leaveRequests.map(r => r.start.slice(0, 4)), ...extraYears]);
  years.add(String(TODAY.getFullYear()));
  const cur = String(TODAY.getFullYear());
  return [...years].sort().reverse().map(y => '<option value="' + y + '"' + (y === cur ? ' selected' : '') + '>' + y + '년</option>').join('');
}
