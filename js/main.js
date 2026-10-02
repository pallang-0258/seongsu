// ── 부트스트랩 ──
(function initApp() {
  // 모달 배경 클릭 시 닫기
  document.querySelectorAll('.modal-bg').forEach(bg => bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); }));

  checkMobile();
  initHolidayReportSel();

  // 1) localStorage로 빠르게 먼저 표시
  load();
  loadSiteTitle();
  renderAll();

  // 2) GAS URL이 설정되어 있으면 Sheets에서 최신 데이터 자동 로드 (기존 admin4_fixed.html과 동일 동작)
  if (GAS_URL) {
    const ind = document.getElementById('syncIndicator');
    function autoLoadFromSheets() {
      if (ind) { ind.textContent = '☁ 불러오는 중…'; ind.style.color = '#888'; }
      loadFromSheets(ok => {
        if (ok) {
          renderAll();
          if (ind) { ind.textContent = '☁ 최신 데이터'; ind.style.color = '#2e7d32'; setTimeout(() => { if (ind) ind.textContent = ''; }, 3000); }
        } else {
          if (ind) { ind.textContent = '☁ 로컬 데이터 사용 중'; ind.style.color = '#f57f17'; setTimeout(() => { if (ind) ind.textContent = ''; }, 3000); }
        }
      });
    }
    // 버그수정: 지난 세션에서 디바운스 때문에 구글시트까지 못 보내고 끝난 변경사항이 있으면
    // (예: 수정 직후 바로 새로고침) 여기서 그 변경사항부터 먼저 다시 보낸 뒤에 최신 데이터를
    // 불러온다 — 순서를 반대로 하면 방금 한 수정이 옛날 서버 값에 덮어써져 사라져 보인다.
    if (hasUnsyncedLocalChanges()) {
      doSyncNow(serializeState(), () => autoLoadFromSheets());
    } else {
      autoLoadFromSheets();
    }
  }
})();
