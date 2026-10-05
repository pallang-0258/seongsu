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

// 버그수정 1: 페이지를 열자마자 백그라운드로 시작되는 loadFromSheets()가 (Apps Script는
// 종종 느리게 응답한다) 사용자가 그 사이에 저장한 로컬 수정사항보다 "늦게" 도착해서 덮어써버리는
// 경쟁 상태(race condition)를 막기 위한 타임스탬프. save()가 호출된 시각을 기록해두고,
// loadFromSheets()는 자신이 요청을 보낸 시각 "이후"에 로컬 저장이 있었다면 그 응답을 무시한다.
// (단, 이건 "같은 페이지를 열어둔 동안"에만 유효 — 새로고침하면 이 변수는 0으로 리셋된다.)
let _lastLocalSaveAt = 0;

// 버그수정 2 (실제로 보고된 문제): save()는 구글시트 전송을 1초 디바운스하는데, 그 1초가
// 지나기 전에 새로고침/탭 닫기를 하면 전송이 아예 안 나간 채로 페이지가 사라진다 — 로컬에는
// 수정값이 저장돼 있지만 구글시트는 옛날 값 그대로라서, 다음에 페이지를 열면 자동으로 불러오는
// loadFromSheets()가 그 옛날 값으로 덮어써버려 "수정한 게 새로고침하면 원래대로 돌아간다"가 된다.
// 해결: localStorage에 "구글시트로 아직 못 보낸 변경사항이 있다" 표시(dirty 플래그)를 남겨두고,
// 다음에 페이지를 열 때 이 플래그가 있으면 서버에서 불러오기 전에 먼저 그 변경사항부터 다시 전송한다.
const DIRTY_KEY = 'wms_v6_dirty';
function markDirty() { try { localStorage.setItem(DIRTY_KEY, '1'); } catch (e) {} }
function clearDirty() { try { localStorage.removeItem(DIRTY_KEY); } catch (e) {} }
function hasUnsyncedLocalChanges() {
  try { return localStorage.getItem(DIRTY_KEY) === '1'; } catch (e) { return false; }
}

// 버그수정 3: 저장은 "전체 데이터 통째로 덮어쓰기"라서, 오래된 데이터를 가진 기기/탭이 저장하면
// 그 사이 다른 기기에서 한 수정(주간 확정 포함)이 조용히 사라졌다. 서버(GAS)가 저장할 때마다
// 버전 번호를 1씩 올리고, 이 페이지는 "내 데이터가 어느 버전을 기준으로 한 것인지"(baseVersion)를
// 함께 보낸다. 서버 버전이 그 사이 바뀌었으면 서버가 저장을 거부(conflict)하고, 사용자에게 고르게 한다.
// _serverVersion은 탭마다 메모리에 따로 들고 있어야 같은 브라우저의 다른 탭끼리도 충돌을 감지한다.
// (구버전 GAS는 version을 돌려주지 않으므로 그 경우엔 예전처럼 그냥 덮어쓴다.)
const VERSION_KEY = 'wms_v6_version';
let _serverVersion = (() => {
  try { const v = localStorage.getItem(VERSION_KEY); return v === null ? null : Number(v); } catch (e) { return null; }
})();
function setServerVersion(v) {
  if (typeof v !== 'number') return;
  _serverVersion = v;
  try { localStorage.setItem(VERSION_KEY, String(v)); } catch (e) {}
}

// save()가 호출될 때마다 1씩 증가. 전송이 성공했을 때 "보낸 시점 이후로 또 수정된 게 없을 때만"
// dirty 플래그를 지우기 위해 쓴다 (전송 중에 한 수정이 표시 없이 사라지는 문제 방지).
let _localRev = 0;

function save() {
  _lastLocalSaveAt = Date.now();
  _localRev++;
  const data = serializeState();
  try { localStorage.setItem('wms_v6', JSON.stringify(data)); } catch (e) {}
  markDirty();
  syncToSheets();
}

function load() {
  try {
    const r = localStorage.getItem('wms_v6');
    if (r) applyLoadedData(JSON.parse(r));
  } catch (e) {}
}

let _syncTimer = null;
function syncToSheets() {
  if (!GAS_URL) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => { _syncTimer = null; doSyncNow(); }, 1000);
}

// 페이지를 떠날 때(탭 닫기·새로고침·앱 전환) 디바운스 대기 중인 전송을 기다리지 않고 바로 보낸다.
function flushPendingSync() {
  if (!_syncTimer || !GAS_URL) return;
  clearTimeout(_syncTimer); _syncTimer = null;
  doSyncNow(null, { keepalive: true });
}

function setSyncIndicator(text, color, autoClear) {
  const indicator = document.getElementById('syncIndicator');
  if (!indicator) return;
  indicator.textContent = text; indicator.style.color = color;
  if (autoClear) setTimeout(() => { if (indicator.textContent === text) indicator.textContent = ''; }, 3000);
}

// 전송은 한 번에 하나씩만 한다. 버전 번호를 쓰므로, 같은 기준 버전으로 두 개를 동시에 보내면
// 두 번째가 자기 자신과 충돌하기 때문. 전송 중에 또 요청이 오면 끝난 뒤 최신 상태로 한 번 더 보낸다.
let _syncInFlight = false;
let _syncQueued = null; // { callbacks: [], opts }

// 디바운스 없이 즉시 전송 (새로고침 복구 재전송 등에 사용). callback(ok)로 성공 여부를 알려준다.
// 항상 "보내는 순간의" 최신 state를 보낸다. opts.force=true면 버전 확인 없이 덮어쓴다.
function doSyncNow(callback, opts) {
  opts = opts || {};
  if (_syncInFlight) {
    if (!_syncQueued) _syncQueued = { callbacks: [], opts: {} };
    if (callback) _syncQueued.callbacks.push(callback);
    if (opts.force) _syncQueued.opts.force = true;
    return;
  }
  _syncInFlight = true;
  const sentRev = _localRev;
  const body = JSON.stringify({ action: 'save', data: serializeState(), baseVersion: _serverVersion ?? 0, force: !!opts.force });
  setSyncIndicator('☁ 저장 중…', '#f57f17');

  const finish = ok => {
    _syncInFlight = false;
    if (callback) callback(ok);
    if (_syncQueued) {
      const q = _syncQueued; _syncQueued = null;
      doSyncNow(okNext => q.callbacks.forEach(cb => cb(okNext)), q.opts);
    }
  };

  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
    // keepalive는 페이지가 닫혀도 요청을 끝까지 보내주지만 본문이 64KB 이하일 때만 허용된다.
    keepalive: !!opts.keepalive && body.length < 60000,
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        setServerVersion(res.version);
        if (_localRev === sentRev) clearDirty();
        setSyncIndicator('☁ 저장됨', '#2e7d32', true);
        finish(true);
      } else if (res.conflict) {
        setSyncIndicator('⚠ 다른 기기와 저장 충돌', '#c0392b');
        resolveSyncConflict(ok => finish(ok));
      } else {
        setSyncIndicator('☁ 저장 실패', '#c0392b', true);
        finish(false);
      }
    })
    .catch(() => {
      setSyncIndicator('☁ 저장 실패', '#c0392b', true);
      finish(false);
    });
}

// 서버에 이 페이지가 모르는 더 최신 저장이 있을 때: 최신 데이터를 받을지, 이 기기 내용으로 덮어쓸지 묻는다.
// 고르는 동안과 불러오는 동안에는 _syncInFlight가 true로 유지되어 다른 전송은 큐에서 기다린다.
function resolveSyncConflict(done) {
  const takeServer = confirm(
    '다른 기기(또는 다른 탭)에서 더 최근에 저장한 내용이 있어서, 이 화면의 변경사항을 구글시트에 저장하지 않았어요.\n\n'
    + '[확인] 최신 데이터를 불러옵니다. 이 화면에서 저장되지 않은 변경은 사라집니다.\n'
    + '[취소] 이 화면의 내용으로 덮어씁니다. 다른 기기에서 한 변경이 사라집니다.'
  );
  if (takeServer) {
    _syncQueued = null; // 받은 최신 데이터를 다시 덮어쓰지 않도록 대기 중인 전송은 버린다
    loadFromSheets(ok => {
      _syncInFlight = false;
      if (typeof renderAll === 'function') renderAll();
      setSyncIndicator(ok ? '☁ 최신 데이터' : '☁ 불러오기 실패', ok ? '#2e7d32' : '#c0392b', true);
      done(ok);
    }, { overwriteUnsynced: true });
  } else {
    _syncInFlight = false;
    doSyncNow(done, { force: true });
  }
}

// opts.overwriteUnsynced=true: 구글시트로 아직 못 보낸 로컬 변경이 있어도 서버 데이터로 덮어쓴다
// (사용자가 직접 "최신 데이터 가져오기"를 누르거나 충돌 시 "불러오기"를 고른 경우만).
// 그 외에는 못 보낸 변경이 있으면 서버 데이터를 적용하지 않는다 — 다음 전송으로 서버가 따라오게 된다.
function loadFromSheets(callback, opts) {
  opts = opts || {};
  if (!GAS_URL) { if (callback) callback(false); return; }
  const requestStartedAt = Date.now();
  fetch(GAS_URL + '?action=load')
    .then(r => r.json())
    .then(res => {
      if (res.ok && res.data && Object.keys(res.data).length) {
        if (!opts.overwriteUnsynced) {
          // 이 요청을 보낸 "이후"에 사용자가 로컬에서 저장을 했다면, 지금 받은 데이터는
          // 그 저장이 반영되기 전(더 오래된) 서버 상태이므로 적용하지 않고 무시한다.
          // (그 저장은 이미 자체적으로 서버에 전송을 예약해뒀으므로 곧 서버도 최신 상태가 된다.)
          if (_lastLocalSaveAt > requestStartedAt) { if (callback) callback(true); return; }
          if (hasUnsyncedLocalChanges()) { if (callback) callback(false); return; }
        }
        applyLoadedData(res.data);
        setServerVersion(res.version);
        try { localStorage.setItem('wms_v6', JSON.stringify(res.data)); } catch (e) {}
        if (opts.overwriteUnsynced) clearDirty();
        if (callback) callback(true);
      } else {
        if (res.ok) setServerVersion(res.version);
        if (callback) callback(false);
      }
    })
    .catch(() => { if (callback) callback(false); });
}
