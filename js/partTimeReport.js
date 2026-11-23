// ── 월별 파트 근무 리포트 ──
// 파트타임 직원(employmentType === 'parttime')이 그 달에 실제로 몇 시간 근무했는지 계산한다.
//  - 정해진 근무(10-20 등)·직접 입력 근무: 그 근무 시간 (추가근무가 있으면 추가근무까지 늘어난 시간)
//  - 반차: 남은 절반 근무 시간 (HALF_HOURS)
//  - 휴무·연차: 0시간 (단, 휴무일에 추가근무 기록이 있으면 그 시간)
// 근무 교환·근무일 옮김은 getShiftForDate에 이미 반영되어 있어 따로 처리하지 않는다.

function partTimeHoursForDate(emp, dateStr) {
  const sh = getShiftForDate(emp, dateStr);
  if (sh === 'half' || sh === 'half_pm') {
    const base = getBaseShiftForDate(emp, dateStr);
    return HALF_HOURS[base] ? HALF_HOURS[base][sh] : shiftHours(base) / 2;
  }
  if (sh === 'annual') return 0;
  const range = getWorkedRangeForDate(emp, dateStr);
  if (range) return (range.endMin - range.startMin) / 60;
  return isFullShiftKey(sh) ? shiftHours(sh) : 0;
}

// 그 달을 월요일 시작 주로 나눈다 (달 밖의 날짜는 빼고). 예) [{start:'2026-11-01', end:'2026-11-01'}, {start:'2026-11-02', end:'2026-11-08'}, ...]
function monthWeekRanges(year, month) {
  const weeks = [];
  getDatesInMonth(year, month).forEach(d => {
    const isMon = parseLocalDate(d).getDay() === 1;
    if (!weeks.length || isMon) weeks.push({ start: d, end: d });
    else weeks[weeks.length - 1].end = d;
  });
  return weeks;
}

function calcPartTimeMonthlyReport(year, month) {
  const dates = getDatesInMonth(year, month);
  const first = dates[0], last = dates[dates.length - 1];
  const weeks = monthWeekRanges(year, month);
  const r1 = v => Math.round(v * 10) / 10;
  const employees = DEPTS.flatMap(dept => state.employees.filter(e => e.dept === dept))
    .filter(e => e.employmentType === 'parttime')
    .filter(e => !(e.joinDate && e.joinDate > last) && !(e.leaveDate && e.leaveDate < first))
    .map(emp => {
      let total = 0, days = 0;
      const weekHours = weeks.map(() => 0);
      const weekDays = weeks.map(() => []); // 주마다 실제 근무한 날: [{date, hours}]
      dates.forEach(d => {
        const h = partTimeHoursForDate(emp, d);
        if (!h) return;
        total += h; days++;
        const wi = weeks.findIndex(w => d >= w.start && d <= w.end);
        weekHours[wi] += h;
        weekDays[wi].push({ date: d, hours: r1(h) });
      });
      return { empId: emp.id, name: emp.name, dept: emp.dept, days, totalHours: r1(total), weekHours: weekHours.map(r1), weekDays };
    });
  return { weeks, employees, totalHours: r1(employees.reduce((s, e) => s + e.totalHours, 0)) };
}
