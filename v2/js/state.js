// ── 전역 상태 & 저장/동기화 ──
// admin4_fixed.html과 동일한 localStorage 키('wms_gas_url','wms_v6')와
// 동일한 GAS 프로토콜(fetch POST action:'save' / GET ?action=load)을 사용한다.
// state = 서버(GAS)/localStorage에 저장되는 영속 데이터.
// ui    = 화면 표시용 임시 상태 (저장되지 않음).

let state = {
  employees: [],
  leaveRequests: [],
  schedules: {},
  confirmed: {},
  confirmedSnapshots: {}, // { [weekKey]: { [empId]: {shift:[7], base:[7], note:[7]} } } — 확정 스냅샷(단일 진실 소스)
  overtimeRecords: [],
  empMemos: [],
  shiftHistory: {},
  defaultShift: {}, // { [empId]: [7] } 각 원소는 null | '1020'|'1019'|'1323' | {alt:true, odd, even}
  holidayOverrides: {}, // { 'YYYY-MM-DD': true|false }
};

let ui = {
  weekOffset: 0,
  selectedEmpId: null,
  editingCell: null,
  editingEmpId: null,
  calYear: TODAY.getFullYear(), calMonth: TODAY.getMonth(), calSelectedEmps: new Set(), calSelectedDept: null,
  otCalYear: TODAY.getFullYear(), otCalMonth: TODAY.getMonth(),
  smOffset: 0,
  empDeptFilter: '',
};

// ── 시드(초기) 직원 데이터 — admin4_fixed.html과 동일 ──
function seedEmployees() {
  return [
    { id: 1, name: '김진성', dept: '약사', annual: 15, used: 2, color: 0, workType: 'full', workDays: [1, 1, 1, 1, 0, 0, 1], employmentType: 'fulltime' },
    { id: 2, name: '최하은', dept: '약사', annual: 15, used: 1, color: 1, workType: 'full', workDays: [0, 1, 1, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 3, name: '박혜빈', dept: '약사', annual: 15, used: 0, color: 2, workType: 'full', workDays: [1, 1, 1, 0, 1, 1, 0], employmentType: 'fulltime' },
    { id: 4, name: '송새희', dept: '약사', annual: 15, used: 3, color: 3, workType: 'full', workDays: [1, 1, 0, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 5, name: '김현성', dept: '약사', annual: 15, used: 0, color: 4, workType: 'full', workDays: [0, 0, 0, 0, 1, 1, 0], employmentType: 'fulltime' },
    { id: 6, name: '이아현', dept: '약사', annual: 15, used: 1, color: 5, workType: 'full', workDays: [1, 0, 1, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 7, name: '장예진', dept: '약사', annual: 15, used: 0, color: 6, workType: 'full', workDays: [0, 0, 0, 0, 0, 0, 1], employmentType: 'fulltime' },
    { id: 8, name: '류시현', dept: '약사', annual: 15, used: 0, color: 7, workType: 'full', workDays: [0, 0, 0, 0, 0, 0, 1], employmentType: 'fulltime' },
    { id: 9, name: '박미란', dept: '약사', annual: 15, used: 0, color: 8, workType: 'biweek_odd', workDays: [0, 0, 0, 0, 0, 0, 1], employmentType: 'fulltime' },
    { id: 10, name: '공희준', dept: '약사', annual: 15, used: 0, color: 9, workType: 'biweek_even', workDays: [0, 0, 0, 0, 0, 0, 1], employmentType: 'fulltime' },
    { id: 11, name: '배서온', dept: '일본어', annual: 15, used: 0, color: 0, workType: 'full', workDays: [1, 1, 1, 0, 1, 0, 1], employmentType: 'fulltime' },
    { id: 12, name: '문현주', dept: '일본어', annual: 15, used: 1, color: 1, workType: 'full', workDays: [1, 0, 1, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 13, name: '송민성', dept: '일본어', annual: 15, used: 0, color: 2, workType: 'full', workDays: [1, 1, 0, 1, 1, 0, 1], employmentType: 'fulltime' },
    { id: 14, name: '마유코', dept: '일본어', annual: 15, used: 0, color: 3, workType: 'full', workDays: [0, 1, 1, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 15, name: '송지은', dept: '일본어', annual: 15, used: 0, color: 4, workType: 'full', workDays: [1, 1, 1, 0, 0, 1, 1], employmentType: 'fulltime' },
    { id: 16, name: '미리', dept: '일본어', annual: 15, used: 0, color: 5, workType: 'full', workDays: [0, 0, 0, 0, 0, 1, 1], employmentType: 'fulltime' },
    { id: 17, name: '홍상회', dept: '중국어', annual: 15, used: 0, color: 0, workType: 'full', workDays: [1, 1, 0, 1, 1, 0, 1], employmentType: 'fulltime' },
    { id: 18, name: '이주현', dept: '중국어', annual: 15, used: 0, color: 1, workType: 'full', workDays: [1, 0, 1, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 19, name: '황미양', dept: '중국어', annual: 15, used: 0, color: 2, workType: 'full', workDays: [1, 1, 0, 1, 1, 0, 1], employmentType: 'fulltime' },
    { id: 20, name: '조순주', dept: '중국어', annual: 15, used: 0, color: 3, workType: 'full', workDays: [0, 1, 1, 1, 1, 1, 0], employmentType: 'fulltime' },
    { id: 21, name: '권성수', dept: '중국어', annual: 15, used: 0, color: 4, workType: 'full', workDays: [1, 0, 1, 1, 0, 1, 1], employmentType: 'fulltime' },
    { id: 22, name: '유창혁', dept: '중국어', annual: 15, used: 0, color: 5, workType: 'full', workDays: [1, 1, 1, 0, 0, 0, 0], employmentType: 'fulltime' },
    { id: 23, name: '정예선', dept: '중국어', annual: 15, used: 0, color: 6, workType: 'full', workDays: [1, 0, 0, 1, 1, 1, 1], employmentType: 'fulltime' },
    { id: 24, name: '왕육홍', dept: '중국어', annual: 15, used: 0, color: 7, workType: 'full', workDays: [0, 1, 1, 0, 0, 0, 0], employmentType: 'fulltime' },
    { id: 25, name: '조문준', dept: '물류', annual: 15, used: 0, color: 0, workType: 'full', workDays: [1, 1, 1, 1, 1, 0, 0], employmentType: 'fulltime' },
  ];
}

state.employees = seedEmployees();

// ── GAS URL ──
let GAS_URL = '';
try { GAS_URL = localStorage.getItem('wms_gas_url') || DEFAULT_GAS_URL; } catch (e) { GAS_URL = DEFAULT_GAS_URL; }

function setGasUrl(url) {
  GAS_URL = (url || '').trim();
  try { localStorage.setItem('wms_gas_url', GAS_URL); } catch (e) {}
}

function serializeState() {
  const shiftToSave = {};
  Object.keys(state.defaultShift).forEach(k => { shiftToSave[+k] = state.defaultShift[k]; });
  return {
    employees: state.employees,
    leaveRequests: state.leaveRequests,
    schedules: state.schedules,
    confirmed: state.confirmed,
    confirmedSnapshots: state.confirmedSnapshots,
    overtimeRecords: state.overtimeRecords,
    empMemos: state.empMemos,
    shiftHistory: state.shiftHistory,
    defaultShift: shiftToSave,
    holidayOverrides: state.holidayOverrides,
  };
}

function applyLoadedData(d) {
  if (!d) return;
  if (d.employees) state.employees = d.employees;
  if (d.leaveRequests) state.leaveRequests = d.leaveRequests;
  if (d.schedules) state.schedules = d.schedules;
  if (d.confirmed) state.confirmed = d.confirmed;
  if (d.confirmedSnapshots) state.confirmedSnapshots = d.confirmedSnapshots;
  if (d.overtimeRecords) state.overtimeRecords = d.overtimeRecords;
  if (d.empMemos) state.empMemos = d.empMemos;
  if (d.shiftHistory) state.shiftHistory = d.shiftHistory;
  if (d.defaultShift) state.defaultShift = d.defaultShift;
  if (d.holidayOverrides) state.holidayOverrides = d.holidayOverrides;
  // 하위호환: employmentType 없는 기존 직원은 fulltime으로 간주
  (state.employees || []).forEach(e => { if (!e.employmentType) e.employmentType = 'fulltime'; });
}

function save() {
  const data = serializeState();
  try { localStorage.setItem('wms_v6', JSON.stringify(data)); } catch (e) {}
  syncToSheets(data);
}

function load() {
  try {
    const r = localStorage.getItem('wms_v6');
    if (r) applyLoadedData(JSON.parse(r));
  } catch (e) {}
}

let _syncTimer = null;
function syncToSheets(data) {
  if (!GAS_URL) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) { indicator.textContent = '☁ 저장 중…'; indicator.style.color = '#f57f17'; }
    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'save', data }),
    })
      .then(r => r.json())
      .then(res => {
        if (indicator) {
          indicator.textContent = res.ok ? '☁ 저장됨' : '☁ 저장 실패';
          indicator.style.color = res.ok ? '#2e7d32' : '#c0392b';
          setTimeout(() => { if (indicator) indicator.textContent = ''; }, 3000);
        }
      })
      .catch(() => {
        if (indicator) { indicator.textContent = '☁ 저장 실패'; indicator.style.color = '#c0392b'; setTimeout(() => { if (indicator) indicator.textContent = ''; }, 3000); }
      });
  }, 1000);
}

function loadFromSheets(callback) {
  if (!GAS_URL) { if (callback) callback(false); return; }
  fetch(GAS_URL + '?action=load')
    .then(r => r.json())
    .then(res => {
      if (res.ok && res.data && Object.keys(res.data).length) {
        applyLoadedData(res.data);
        try { localStorage.setItem('wms_v6', JSON.stringify(res.data)); } catch (e) {}
        if (callback) callback(true);
      } else { if (callback) callback(false); }
    })
    .catch(() => { if (callback) callback(false); });
}
