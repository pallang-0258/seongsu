// ── 직원용 뷰어 부트스트랩 ──
// admin과 동일한 순서: 1) localStorage 캐시로 즉시 표시  2) GAS(구글시트)에서 최신 데이터 자동 로드
// 뷰어는 절대 save()/syncToSheets()를 호출하지 않는다 (읽기 전용).
// 뷰어는 민감한 칸(전화번호·주민번호·계좌번호·직원 메모)이 빠진 데이터만 받고, 관리자와 다른 캐시 키를 쓴다.
var VIEWER_MODE = true;
// 예전 뷰어가 이 기기에 남겨둔 전체 데이터 캐시는 지운다 (관리자로 쓰는 기기는 그대로 둠)
try { if (!localStorage.getItem('wms_admin_key') && !localStorage.getItem('wms_v6_dirty')) localStorage.removeItem('wms_v6'); } catch (e) {}

function renderAllViewer() {
  initWeekDropdowns();
  renderSchedule();
  initLeaveFilters();
  initLeaveTableFilters();
  renderLeaveTable();
  renderLeaveHistoryViewer();
  initCalendar();
}

load();
renderAllViewer();

if (GAS_URL) {
  const ind = document.getElementById('syncIndicator');
  if (ind) { ind.textContent = '☁ 불러오는 중…'; ind.style.color = '#888'; }
  loadFromSheets(ok => {
    if (ok) {
      renderAllViewer();
      if (ind) { ind.textContent = '☁ 최신 데이터'; ind.style.color = '#2e7d32'; setTimeout(() => { if (ind) ind.textContent = ''; }, 3000); }
    } else {
      if (ind) { ind.textContent = '☁ 로컬 데이터 사용 중'; ind.style.color = '#f57f17'; setTimeout(() => { if (ind) ind.textContent = ''; }, 3000); }
    }
  });
}
