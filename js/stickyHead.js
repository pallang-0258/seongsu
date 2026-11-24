// ── 휴대폰: 근무표 요일·날짜 줄을 화면 위에 띄워 스크롤을 따라오게 ──
// 휴대폰에서는 근무표를 화면 폭에 맞춰 줄여(transform) 보여주는데, 줄인 표 안에서는
// CSS sticky가 제자리에 붙지 않고 아이폰 사파리에서는 아예 따라오지 않는다.
// 그래서 휴대폰에서는 요일·날짜 줄을 복사해 화면 위(고정 위치)에 직접 띄운다. PC는 CSS sticky를 그대로 쓴다.
(function () {
  let box = null;
  function ensureBox() {
    if (!box) {
      box = document.createElement('div');
      box.className = 'sch-float-head';
      box.setAttribute('aria-hidden', 'true');
      document.body.appendChild(box);
    }
    return box;
  }
  function update() {
    if (!box) return;
    const tbl = document.getElementById('screenSchTable');
    const main = document.querySelector('.main');
    if (!box.firstChild || !tbl || !main || tbl.offsetParent === null) { box.style.display = 'none'; return; }
    const mr = main.getBoundingClientRect(), tr = tbl.getBoundingClientRect(), hh = box._h || 0;
    const show = tr.top < mr.top && tr.bottom > mr.top + hh * 2;
    box.style.display = show ? 'block' : 'none';
    if (show) {
      box.style.top = mr.top + 'px';
      box.style.left = tr.left + 'px';
      box.style.width = tr.width + 'px';
    }
  }
  function rebuild() {
    const b = ensureBox();
    b.innerHTML = ''; b.style.display = 'none';
    const tbl = document.getElementById('screenSchTable');
    if (!tbl || !tbl.tHead || window.innerWidth > 768) return;
    const scale = parseFloat(tbl.dataset.scale || '1') || 1;
    const clone = document.createElement('table');
    clone.className = tbl.className;
    clone.style.width = tbl.offsetWidth + 'px';
    const head = tbl.tHead.cloneNode(true);
    const src = tbl.tHead.rows[0].cells, dst = head.rows[0].cells;
    for (let i = 0; i < src.length && i < dst.length; i++) dst[i].style.width = src[i].offsetWidth + 'px';
    clone.appendChild(head);
    if (scale !== 1) { clone.style.transform = 'scale(' + scale + ')'; clone.style.transformOrigin = 'top left'; }
    b.appendChild(clone);
    b._h = tbl.tHead.offsetHeight * scale;
    b.style.height = b._h + 'px';
    update();
  }
  window.refreshSchFloatHead = rebuild;
  // .main 안의 스크롤도 잡히도록 capture로 듣는다
  document.addEventListener('scroll', update, { capture: true, passive: true });
})();
