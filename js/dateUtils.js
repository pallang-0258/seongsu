// ── 날짜/주차 유틸 ──
// admin4_fixed.html의 getWeekStart/getWeekDays/toLocalDateStr/weekKey/isOddWeek 로직을 그대로 이식.

function getWeekStart(off) {
  const d = new Date(TODAY);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + off * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekDays(off) {
  const m = getWeekStart(off);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(m); d.setDate(d.getDate() + i); return d; });
}
function toLocalDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// "YYYY-MM-DD" 문자열을 로컬 타임존 기준으로 안전하게 Date로 변환 (new Date(str)는 UTC로 파싱되어 하루 밀릴 수 있음)
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function weekKey(off) { return toLocalDateStr(getWeekStart(off)); }
function isOddWeek(off) {
  // 해당 주 일요일이 그 달의 몇 번째 일요일인지로 홀/짝 판단
  const sun = getWeekDays(off)[6];
  const nth = Math.ceil(sun.getDate() / 7);
  return nth % 2 === 1;
}

// 임의의 날짜 문자열 → 그 날짜가 속한 주의 weekOffset(오늘 기준)
function dateToWeekOffset(dateStr) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  mon.setHours(0, 0, 0, 0);
  const todayMon = getWeekStart(0);
  return Math.round((mon - todayMon) / (7 * 86400000));
}
// 임의의 날짜 문자열 → 월=0 ... 일=6 요일 인덱스
function dateToDayIndex(dateStr) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}
// 날짜 문자열이 속한 주의 월요일 날짜 문자열 (= weekKey)
function weekKeyForDate(dateStr) {
  return weekKey(dateToWeekOffset(dateStr));
}

function getWeeksInMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startMon = new Date(firstDay);
  const dow = startMon.getDay();
  startMon.setDate(startMon.getDate() - (dow === 0 ? 6 : dow - 1));
  const weeks = [];
  const cur = new Date(startMon);
  while (cur <= lastDay) {
    const diff = Math.round((cur - getWeekStart(0)) / (7 * 86400000));
    weeks.push(diff);
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

// 분(0~1439) → "H" 또는 "H:MM" 형태 문자열
function formatMinutesLabel(m) {
  const h = Math.floor(m / 60), mm = ((m % 60) + 60) % 60;
  return mm === 0 ? String(h) : h + ':' + String(mm).padStart(2, '0');
}

// 월의 모든 날짜 문자열 배열
function getDatesInMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const arr = [];
  for (let d = 1; d <= lastDay; d++) arr.push(toLocalDateStr(new Date(year, month, d)));
  return arr;
}
