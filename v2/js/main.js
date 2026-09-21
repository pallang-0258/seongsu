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
})();
