// ── 직원용 뷰어 부트스트랩 ──
// admin과 동일한 순서: 1) localStorage 캐시로 즉시 표시  2) GAS(구글시트)에서 최신 데이터 자동 로드
// 뷰어는 절대 save()/syncToSheets()를 호출하지 않는다 (읽기 전용).

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
