// ── 월별 공휴일 근무 리포트 ──
// 약사 그룹 / 그 외 전체 직원 그룹으로 나누어, 그 달의 공휴일에 실제로 근무한 직원과
// 공휴일 근무시간 합계·근무 횟수를 계산한다.

function calcHolidayWorkedReport(year, month) {
  const dates = getDatesInMonth(year, month).filter(isHoliday);
  const groups = {
    pharmacist: { label: '약사', employees: [] },
    others: { label: '그 외 전체 직원', employees: [] },
  };
  const perEmp = {}; // empId -> {emp, totalHours, days: Set}

  dates.forEach(dateStr => {
    state.employees.forEach(emp => {
      if (isResigned(emp) && emp.leaveDate && dateStr > emp.leaveDate) return;
      const sh = getShiftForDate(emp, dateStr);
      if (!isFullShiftKey(sh)) return; // off/annual/half/휴무 등은 "근무"로 집계하지 않음
      const range = getWorkedRangeForDate(emp, dateStr);
      const hours = range ? (range.endMin - range.startMin) / 60 : (SHIFT_HOURS[sh] || 0);
      if (!perEmp[emp.id]) perEmp[emp.id] = { emp, totalHours: 0, days: new Set() };
      perEmp[emp.id].totalHours += hours;
      perEmp[emp.id].days.add(dateStr);
    });
  });

  Object.values(perEmp).forEach(rec => {
    const target = rec.emp.dept === '약사' ? groups.pharmacist : groups.others;
    target.employees.push({
      empId: rec.emp.id,
      name: rec.emp.name,
      dept: rec.emp.dept,
      totalHours: Math.round(rec.totalHours * 10) / 10,
      holidaysWorked: rec.days.size,
      dates: [...rec.days].sort(),
    });
  });

  [groups.pharmacist, groups.others].forEach(g => {
    g.employees.sort((a, b) => b.totalHours - a.totalHours);
    g.totalHours = Math.round(g.employees.reduce((s, e) => s + e.totalHours, 0) * 10) / 10;
  });

  return { holidays: dates.map(d => ({ date: d, name: getHolidayName(d) })), groups };
}
