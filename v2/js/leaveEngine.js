// ── 연차/반차 엔진 ──
// 새 연차 발생 공식(근로기준법 기준) + 승계연차 가산 + 파트타임 제외 로직.

function isFulltime(emp) { return (emp.employmentType || 'fulltime') !== 'parttime'; }
function fulltimeEmployees() { return state.employees.filter(isFulltime); }

// 새 연차 발생 공식:
//  - 근속 1년 미만: 개근한 달마다 1일, 최대 11일
//  - 근속 1년 이상: 기본 15일 + (근속연수-1)/2를 내림한 값 (3년,5년,7년,...마다 +1), 최대 25일
// 파트타임 직원은 연차 발생 대상이 아니므로 항상 0.
function calcEarnedAnnual(joinDateStr, bonusAnnual, emp) {
  if (emp && !isFulltime(emp)) return 0; // 파트타임: 연차 시스템에서 완전히 제외
  let base = 0;
  if (joinDateStr) {
    const join = parseLocalDate(joinDateStr);
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
function saveBonusAnnual(empId, bonusVal, reason) {
  const e = state.employees.find(emp => emp.id === empId); if (!e) return;
  if (!e.bonusAnnualHistory) e.bonusAnnualHistory = [];
  e.bonusAnnualHistory.push({ bonus: bonusVal, reason, date: toLocalDateStr(TODAY) });
  e.bonusAnnual = bonusVal;
  save();
}

// ── 연차/반차 신청 CRUD ──
function nextId(arr) { return (arr[arr.length - 1]?.id || 0) + 1; }

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
