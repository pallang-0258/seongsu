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

function getHalfLabel(baseShift, halfType) {
  const map = HALF_TIME[baseShift];
  if (!map) return halfType === 'half' ? '반차(오전)' : '반차(오후)';
  return map[halfType] || (halfType === 'half' ? '반차(오전)' : '반차(오후)');
}
function getHalfHours(baseShift, halfType) {
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

// Apps Script에 붙여넣는 백엔드 코드 — 기존과 동일 (변경 금지)
const GAS_CODE = `const SHEET_NAME = 'wms_data';

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'load') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = ss.getSheetByName(SHEET_NAME);
      if (!sh || sh.getLastRow() < 1) return jsonRes({ok:true, data:{}});
      const raw = sh.getRange(1,1).getValue();
      const data = raw ? JSON.parse(raw) : {};
      return jsonRes({ok:true, data});
    }
    return jsonRes({ok:false, error:'unknown action'});
  } catch(err) { return jsonRes({ok:false, error:err.toString()}); }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'save') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sh = ss.getSheetByName(SHEET_NAME);
      if (!sh) sh = ss.insertSheet(SHEET_NAME);
      sh.getRange(1,1).setValue(JSON.stringify(body.data));
      sh.getRange(1,2).setValue(new Date().toISOString());
      return jsonRes({ok:true});
    }
    return jsonRes({ok:false, error:'unknown action'});
  } catch(err) { return jsonRes({ok:false, error:err.toString()}); }
}

function jsonRes(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
