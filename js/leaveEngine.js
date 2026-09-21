// ── 연차/반차 엔진 ──
// 새 연차 발생 공식(근로기준법 기준) + 승계연차 가산 + 파트타임 제외 로직.

function isFulltime(emp) { return (emp.employmentType || 'fulltime') !== 'parttime'; }
function fulltimeEmployees() { return state.employees.filter(isFulltime); }

// 새 연차 발생 공식:
//  - 근속 1년 미만: 개근한 달마다 1일, 최대 11일
//  - 근속 1년 이상: 기본 15일 + (근속연수-1)/2를 내림한 값 (3년,5년,7년,...마다 +1), 최대 25일
// 파트타임 직원은 연차 발생 대상이 아니므로 항상 0.
// 타지점 등에서 이동해온 경우 emp.trueJoinDate(연차 인정 시작일)가 있으면 그 날짜를
// 근속 기산일로 쓴다 (이 지점 근무 시작일인 joinDate와는 별개 — 스케줄/입사예정 표시는 joinDate 그대로 사용).
function calcEarnedAnnual(joinDateStr, bonusAnnual, emp) {
  if (emp && !isFulltime(emp)) return 0; // 파트타임: 연차 시스템에서 완전히 제외
  const effectiveJoinStr = (emp && emp.trueJoinDate) || joinDateStr;
  let base = 0;
  if (effectiveJoinStr) {
    const join = parseLocalDate(effectiveJoinStr);
    const now = TODAY;
    if (now >= join) {
      let months = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
      const annivThisMonth = new Date(now.getFullYear(), now.getMonth(), join.getDate());
      if (now < annivThisMonth) months--;
      months = Math.max(months, 0);

      let years = now.getFullYear() - join.getFullYear();
      const annivThisYear = new Date(now.getFullYear(), join.getMonth(), join.getDate());
      if (now < annivThisYear) years--;
      years = Math.max(years, 0);

      if (years < 1) {
        base = Math.min(months, 11);
      } else {
        base = Math.min(15 + Math.floor((years - 1) / 2), 25);
      }
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
