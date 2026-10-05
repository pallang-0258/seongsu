// ── 부트스트랩 ──
function showFirstLoadBlocker() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;font-size:14px;color:#333';
  document.body.appendChild(el);
  return {
    setLoading() { el.innerHTML = '<div>☁ 구글시트에서 데이터를 불러오는 중…</div>'; },
    setFailed(retry) {
      el.innerHTML = '<div><div style="margin-bottom:12px">구글시트에서 데이터를 불러오지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</div>'
        + '<button class="btn">다시 시도</button></div>';
      el.querySelector('button').onclick = retry;
    },
    remove() { el.remove(); },
  };
}

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
    // 로컬 캐시 없이 처음 여는 기기는 시트 데이터를 받기 전까지 화면을 막아둔다.
    // 빈 화면(또는 예시 데이터)에서 한 수정이 실제 데이터를 덮어쓰지 않게 하기 위함.
    const blocker = _startedWithoutLocalData ? showFirstLoadBlocker() : null;
    function autoLoadFromSheets() {
      if (ind) { ind.textContent = '☁ 불러오는 중…'; ind.style.color = '#888'; }
      if (blocker) blocker.setLoading();
      loadFromSheets(ok => {
        if (blocker) {
          if (_startedWithoutLocalData) { blocker.setFailed(autoLoadFromSheets); return; }
          blocker.remove();
          renderAll();
        }
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
    if (hasUnsyncedLocalChanges() && !_startedWithoutLocalData) {
      doSyncNow(() => autoLoadFromSheets());
    } else {
      autoLoadFromSheets();
    }

    // 수정 직후 1초 안에 탭을 닫거나 새로고침해도 변경사항이 바로 전송되도록 한다.
    // (모바일은 앱 전환 시 pagehide 없이 종료되는 경우가 있어 visibilitychange도 함께 쓴다.)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPendingSync(); });
    window.addEventListener('pagehide', flushPendingSync);
  }
})();
