// ── 전역 상수 ──
// 앱 전체에서 재사용되는 요일/부서/근무유형 관련 상수 모음.

const TODAY = new Date();

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일'];
const DEPTS = ['약사', '일본어', '중국어', '물류'];

const AM_KEYS = ['1020', '1019'];
const PM_KEYS = ['1323'];
const PM_EXCLUDE_DEPTS = ['물류'];

const SHIFT_LABEL = { '1020': '10-20', '1019': '10-19', '1323': '13-23', annual: '연차', half: '반차(오전)', half_pm: '반차(오후)', off: '' };
const SHIFT_CLS = { '1020': 's-1020', '1019': 's-1019', '1323': 's-1323', annual: 's-annual', half: 's-half', half_pm: 's-half', off: '' };

// 근무 시작/종료 (분 단위, 자정 기준) — 추가근무 합산/구간표시에 사용
const SHIFT_RANGE_MIN = {
  '1020': [600, 1200],   // 10:00-20:00
  '1019': [600, 1140],   // 10:00-19:00
  '1323': [780, 1380],   // 13:00-23:00
};
// 근무 시간(시간 단위)
const SHIFT_HOURS = { '1020': 10, '1019': 9, '1323': 10 };

// 반차 실제 근무 구간 표시용 라벨.
// half(오전반차) = 뒤쪽 절반 근무 / half_pm(오후반차) = 앞쪽 절반 근무.
// 버그수정: 1019(9시간 근무)는 4.5h/4.5h로 정확히 분할해야 함 (기존 코드는 5h/4h로 잘못 분할되어 있었음).
// 1020/1323(10시간 근무)은 기존과 동일하게 5h/5h.
const HALF_TIME = {
  '1020': { half: '15-20', half_pm: '10-15' },
  '1019': { half: '14:30-19', half_pm: '10-14:30' },
  '1323': { half: '18-23', half_pm: '13-18' },
};
// 반차 실제 근무 시간(시간 단위) — half:뒤쪽 시간, half_pm:앞쪽 시간
const HALF_HOURS = {
  '1020': { half: 5, half_pm: 5 },
  '1019': { half: 4.5, half_pm: 4.5 },
  '1323': { half: 5, half_pm: 5 },
};

// ── 시간 직접 입력 근무 ──
// 정해진 근무(10-20 등) 말고 그날만 시간을 직접 정한 근무는 'c1000-1500'처럼
// 'c' + 시작(HHMM) + '-' + 종료(HHMM) 문자열로 저장한다. 기존 근무 값과 같은 자리에
// 문자열로 들어가므로 근무 교환·주 확정·구글시트 저장이 그대로 동작한다.
const CUSTOM_SHIFT_RE = /^c(\d{2})(\d{2})-(\d{2})(\d{2})$/;
function isCustomShiftKey(v) { return typeof v === 'string' && CUSTOM_SHIFT_RE.test(v); }
function makeCustomShiftKey(startMin, endMin) {
  const f = m => String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0');
  return 'c' + f(startMin) + '-' + f(endMin);
}
// 근무 구간 [시작분, 종료분] (정해진 근무 + 직접 입력 근무). 근무가 아니면 null
function shiftRangeMin(v) {
  if (SHIFT_RANGE_MIN[v]) return SHIFT_RANGE_MIN[v].slice();
  const m = typeof v === 'string' ? v.match(CUSTOM_SHIFT_RE) : null;
  if (!m) return null;
  return [(+m[1]) * 60 + (+m[2]), (+m[3]) * 60 + (+m[4])];
}
function shiftHours(v) {
  if (SHIFT_HOURS[v] !== undefined) return SHIFT_HOURS[v];
  const r = shiftRangeMin(v);
  return r ? Math.round((r[1] - r[0]) / 60 * 100) / 100 : 0;
}
function shiftLabel(v) {
  if (isCustomShiftKey(v)) { const r = shiftRangeMin(v); return formatMinutesLabel(r[0]) + '-' + formatMinutesLabel(r[1]); }
  return SHIFT_LABEL[v] || '';
}
// 직접 입력 근무·쉬는 날 추가근무는 13시 전에 시작하면 오전, 13시부터면 오후로 본다
const CUSTOM_PM_START_MIN = 13 * 60; // 오후조 출근(13시)보다 이르면 오전조
function isAmShift(v) { return AM_KEYS.includes(v) || (isCustomShiftKey(v) && shiftRangeMin(v)[0] < CUSTOM_PM_START_MIN); }
function isPmShift(v) { return PM_KEYS.includes(v) || (isCustomShiftKey(v) && shiftRangeMin(v)[0] >= CUSTOM_PM_START_MIN); }
// 요약표 오전/오후 줄 배정. 물류처럼 오후 줄이 없는 부서는 직접 입력한 오후 근무도 오전 줄에 넣어
// 요약표에서 빠지지 않게 한다.
function shiftInSummaryRow(isAmRow, v, dept) {
  const noPmRow = PM_EXCLUDE_DEPTS.includes(dept);
  if (isAmRow) return isAmShift(v) || (noPmRow && isCustomShiftKey(v));
  return isPmShift(v) && !(noPmRow && isCustomShiftKey(v));
}
function shiftCls(v) {
  if (isCustomShiftKey(v)) return (isAmShift(v) ? 's-1020' : 's-1323') + ' s-custom';
  return SHIFT_CLS[v] || '';
}

function getHalfLabel(baseShift, halfType) {
  if (isCustomShiftKey(baseShift)) {
    const [s, e] = shiftRangeMin(baseShift), mid = Math.round((s + e) / 2);
    return halfType === 'half' ? formatMinutesLabel(mid) + '-' + formatMinutesLabel(e) : formatMinutesLabel(s) + '-' + formatMinutesLabel(mid);
  }
  const map = HALF_TIME[baseShift];
  if (!map) return halfType === 'half' ? '반차(오전)' : '반차(오후)';
  return map[halfType] || (halfType === 'half' ? '반차(오전)' : '반차(오후)');
}
function getHalfHours(baseShift, halfType) {
  if (isCustomShiftKey(baseShift)) return Math.round(shiftHours(baseShift) / 2 * 100) / 100;
  const map = HALF_HOURS[baseShift];
  if (!map) return 0;
  return map[halfType] || 0;
}

const COLORS = [
  ['#e8f5e9', '#2e7d32'], ['#e8eaf6', '#283593'], ['#f3e5f5', '#6a1b9a'],
  ['#fff8e1', '#f57f17'], ['#fce4ec', '#880e4f'], ['#e0f7fa', '#00695c'],
  ['#fbe9e7', '#bf360c'], ['#f1f8e9', '#33691e'], ['#fafafa', '#424242'],
  ['#e0f2f1', '#004d40'], ['#fff3e0', '#e65100'], ['#e8eaf6', '#1a237e'],
];

// GAS(Google Apps Script) 연동 — 기존 admin4_fixed.html과 완전히 동일한 프로토콜 유지
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzJNkdS9Y-429satbzJrXuUx3Em16dS2Y0cAFk_zxOBclub74kr_pZLiRCisMnAoPksaw/exec';

// Apps Script에 붙여넣는 백엔드 코드.
// 저장 충돌 방지를 위해 버전 번호(C1 셀)를 추가했고, 50,000자 칸 제한 때문에 데이터를 여러 칸에 나눠 저장한다. 이 코드로 다시 배포하기 전까지는 예전처럼 동작한다.
// 예전 페이지(baseVersion을 안 보내는 클라이언트)의 저장도 그대로 받아준다.
const GAS_CODE = `const SHEET_NAME = 'wms_data';
// 구글시트 한 칸에는 50,000자까지만 들어가므로, 데이터를 A열 여러 칸(A1, A2, ...)에 나눠 저장한다.
// B1 = 마지막 저장 시각, C1 = 버전 번호, D1 = 나눠 저장한 칸 수.
// 각 칸 앞에 '~'를 붙여 시트가 숫자·날짜·수식으로 바꿔버리지 않게 한다 (읽을 때 떼어낸다).
const CHUNK_SIZE = 45000;

function readJson(sh) {
  const count = Number(sh.getRange(1,4).getValue());
  if (!count) return String(sh.getRange(1,1).getValue()); // 예전 방식(A1 한 칸)으로 저장된 데이터
  return sh.getRange(1,1,count,1).getValues().map(r => String(r[0]).slice(1)).join('');
}

function writeJson(sh, json) {
  const chunks = [];
  for (let i = 0; i < json.length; ) {
    let end = Math.min(i + CHUNK_SIZE, json.length);
    const c = json.charCodeAt(end - 1);
    if (end < json.length && c >= 0xD800 && c <= 0xDBFF) end--; // 이모지 등이 두 칸에 걸쳐 잘리지 않게
    chunks.push(['~' + json.slice(i, end)]);
    i = end;
  }
  if (!chunks.length) chunks.push(['~']);
  const oldCount = Number(sh.getRange(1,4).getValue()) || 1;
  sh.getRange(1,1,chunks.length,1).setNumberFormat('@').setValues(chunks);
  if (oldCount > chunks.length) sh.getRange(chunks.length + 1, 1, oldCount - chunks.length, 1).clearContent();
  sh.getRange(1,4).setValue(chunks.length);
}

// ── 관리자 비밀번호 ──
// Apps Script 편집기 > 프로젝트 설정(톱니바퀴) > 스크립트 속성에 ADMIN_KEY 를 추가하고 값으로 비밀번호를 넣는다.
// ADMIN_KEY 가 있으면:
//   - 관리자 페이지는 비밀번호를 보내야 전체 데이터를 받고(POST load) 저장할 수 있다(POST save).
//   - 비밀번호 없이 주소로 직접 열거나 직원용 뷰어가 받는 데이터(GET load)에서는
//     전화번호·주민번호·계좌번호·직원 메모를 뺀다 (뷰어 본인 확인용 전화번호 뒷 4자리만 남김).
// ADMIN_KEY 가 없으면 예전처럼 비밀번호 없이 동작한다.
function adminKey() { return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || ''; }
function isAdmin(key) { const k = adminKey(); return !k || String(key || '') === k; }

function sanitizeForViewer(data) {
  const d = JSON.parse(JSON.stringify(data || {}));
  (d.employees || []).forEach(function (emp) {
    const digits = String(emp.phone || '').replace(/\\D/g, '');
    delete emp.phone; delete emp.rrn; delete emp.bankAccount;
    if (digits.length >= 4) emp.phoneLast4 = digits.slice(-4);
  });
  delete d.empMemos;
  delete d.pinnedMemos;
  return d;
}

function readData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() < 1) return { data: {}, version: 0 };
  const raw = readJson(sh);
  return { data: raw ? JSON.parse(raw) : {}, version: Number(sh.getRange(1,3).getValue()) || 0 };
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'load') {
      const r = readData();
      const data = adminKey() ? sanitizeForViewer(r.data) : r.data;
      return jsonRes({ok:true, data, version:r.version});
    }
    return jsonRes({ok:false, error:'unknown action'});
  } catch(err) { return jsonRes({ok:false, error:err.toString()}); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'load') {
      if (!isAdmin(body.key)) return jsonRes({ok:false, auth:true, error:'관리자 비밀번호가 맞지 않아요'});
      const r = readData();
      return jsonRes({ok:true, data:r.data, version:r.version});
    }
    if (body.action === 'save') {
      if (!isAdmin(body.key)) return jsonRes({ok:false, auth:true, error:'관리자 비밀번호가 맞지 않아요'});
      lock.waitLock(20000);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sh = ss.getSheetByName(SHEET_NAME);
      if (!sh) sh = ss.insertSheet(SHEET_NAME);
      const version = Number(sh.getRange(1,3).getValue()) || 0;
      // 예전 페이지(admin.html 등)는 baseVersion을 보내지 않고, 확정 스냅샷·공휴일 지정 같은 새 데이터를
      // 빼고 저장한다. 그런 저장을 받으면 그 데이터가 지워지므로 거부한다.
      if (body.baseVersion === undefined) return jsonRes({ok:false, error:'outdated page: open admin4_fixed.html'});
      const json = JSON.stringify(body.data);
      if (json === readJson(sh)) return jsonRes({ok:true, version});
      if (!body.force && Number(body.baseVersion) !== version) {
        return jsonRes({ok:false, conflict:true, version});
      }
      writeJson(sh, json);
      sh.getRange(1,2).setValue(new Date().toISOString());
      sh.getRange(1,3).setValue(version + 1);
      return jsonRes({ok:true, version: version + 1});
    }
    return jsonRes({ok:false, error:'unknown action'});
  } catch(err) { return jsonRes({ok:false, error:err.toString()}); }
  finally { lock.releaseLock(); }
}

function jsonRes(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
