// ── 인쇄(요약표/전체출력/고정근무표) ──
// admin4_fixed.html의 doPrint/doPrintFixed 레이아웃을 이식.

// 연차/반차/수동변경 모두 무시하고 "고정 기본 패턴"만 반환 (고정근무표 출력용)
function getFixedShift(emp, di, off) {
  if (!shouldWork(emp, di, off)) return '__off__';
  const pat = getCurrentPattern(emp.id);
  const resolved = pat ? resolveDayPattern(pat[di], off) : null;
  return resolved || 'off';
}

function doPrintFixed() {
  const off = ui.weekOffset;
  const days = getWeekDays(off);
  const fmt = d => (d.getMonth() + 1) + '/' + d.getDate();
  const odd = isOddWeek(off);
  const now = TODAY;
  const titleStr = days[0].getFullYear() + '년 ' + fmt(days[0]) + ' ~ ' + fmt(days[6]) + ' (' + (odd ? '홀수' : '짝수') + ' 주)';
  const metaStr = '출력일: ' + now.getFullYear() + '.' + (now.getMonth() + 1) + '.' + now.getDate() + ' / 고정근무표 (연차·반차 미반영)';

  function schH() {
    const depts = DEPTS.filter(d => state.employees.some(e => e.dept === d));
    let h = '<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5pt">'
      + '<colgroup><col style="width:22pt"><col style="width:40pt">' + days.map(() => '<col>').join('') + '</colgroup>'
      + '<thead><tr><th style="background:#f2f2f2;border:0.3pt solid #aaa;padding:2pt 1pt;text-align:center;font-size:7pt">부서</th>'
      + '<th style="background:#f2f2f2;border:0.3pt solid #aaa;padding:2pt 1pt;text-align:center;font-size:7pt">직원</th>'
      + days.map((d, i) => '<th style="background:#f2f2f2;border:0.3pt solid #aaa;padding:2pt 0;text-align:center;font-size:7pt;' + (i >= 5 ? 'color:#c00' : '') + '">' + DAY_KO[i] + '<br><span style="font-weight:400">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></th>').join('')
      + '</tr></thead><tbody>';
    const colCount = days.length + 2;
    depts.forEach((dept, deptIdx) => {
      const de = state.employees.filter(e => e.dept === dept && isActiveForWeek(e, off));
      if (!de.length) return;
      if (deptIdx > 0) h += '<tr><td colspan="' + colCount + '" style="height:5pt;background:#f2f2f2;border:none;padding:0"></td></tr>';
      de.forEach((emp, ri) => {
        h += '<tr>';
        if (ri === 0) h += '<td rowspan="' + de.length + '" style="border:0.3pt solid #ccc;background:#f9f9f9;text-align:center;font-size:7pt;vertical-align:middle">' + dept + '</td>';
        h += '<td style="border:0.3pt solid #ccc;padding:0 3pt;font-size:7.5pt;font-weight:600;vertical-align:middle">' + emp.name + '</td>';
        days.forEach((_, di) => {
          const sh = getFixedShift(emp, di, off);
          if (sh === '__off__') { h += '<td style="border:0.3pt solid #ccc;text-align:center;color:#ccc;font-size:7pt;vertical-align:middle">—</td>'; return; }
          const lb = SHIFT_LABEL[sh] || '';
          const bg = AM_KEYS.includes(sh) ? '#d4edda' : sh === '1323' ? '#e2d9f3' : '';
          const fg = AM_KEYS.includes(sh) ? '#155724' : sh === '1323' ? '#3d1a78' : '#999';
          h += lb ? '<td style="border:0.3pt solid #ccc;text-align:center;vertical-align:middle"><span style="background:' + bg + ';color:' + fg + ';font-size:7pt;font-weight:700;padding:1pt 4pt;border-radius:2pt;display:inline-block">' + lb + '</span></td>' : '<td style="border:0.3pt solid #ccc;text-align:center;color:#ccc;font-size:7pt">—</td>';
        });
        h += '</tr>';
      });
    });
    return h + '</tbody></table>';
  }
  function sumH() {
    const activeDepts = DEPTS.filter(d => state.employees.some(e => e.dept === d));
    const sds = [{ keys: AM_KEYS, label: '오전', am: true }, { keys: PM_KEYS, label: '오후', am: false }];
    let h = '<table style="width:100%;border-collapse:collapse;font-size:7pt;table-layout:fixed">'
      + '<colgroup><col style="width:22pt"><col style="width:40pt">' + days.map(() => '<col>').join('') + '</colgroup>'
      + '<thead><tr><th colspan="2" style="border:0.4pt solid #bbb;background:#f2f2f2;padding:3pt 2pt"></th>'
      + days.map((d, i) => '<th style="border:0.4pt solid #bbb;background:#f2f2f2;font-weight:700;text-align:center;padding:3pt 2pt;' + (i >= 5 ? 'color:#c00' : '') + '">' + DAY_KO[i] + '<br><span style="font-weight:400">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></th>').join('')
      + '</tr></thead><tbody>';
    sds.forEach((sd, sdIdx) => {
      const rowDepts = activeDepts.filter(d => !PM_EXCLUDE_DEPTS.includes(d) || sd.keys === AM_KEYS);
      if (!rowDepts.length) return;
      const colCount = days.length + 2;
      if (sdIdx > 0) h += '<tr><td colspan="' + colCount + '" style="height:4pt;background:#f2f2f2;border:none;padding:0"></td></tr>';
      const lbBg = sd.am ? '#d4edda' : '#e2d9f3', lbFg = sd.am ? '#155724' : '#3d1a78';
      rowDepts.forEach((dept, di) => {
        const dEmps = state.employees.filter(e => e.dept === dept);
        h += '<tr>';
        if (di === 0) h += '<td rowspan="' + rowDepts.length + '" style="border:0.4pt solid #bbb;background:#e8e8e8;text-align:center;vertical-align:middle;padding:2pt 2pt"><span style="background:' + lbBg + ';color:' + lbFg + ';padding:1pt 3pt;border-radius:2pt;font-weight:700;font-size:6pt">' + sd.label + '</span></td>';
        h += '<td style="border:0.4pt solid #bbb;background:#f5f5f5;text-align:center;font-size:6pt;font-weight:700;padding:2pt 2pt;white-space:nowrap">' + dept + '</td>';
        days.forEach((_, di2) => {
          const entries = dEmps.filter(e => isActiveForWeek(e, off)).map(e => ({ name: e.name, shiftKey: getFixedShift(e, di2, off) })).filter(x => sd.keys.includes(x.shiftKey));
          const cell = entries.map(x => x.name).join('<br>');
          h += '<td style="border:0.4pt solid #bbb;padding:2pt 3pt;font-size:7pt;line-height:1.6;vertical-align:top">' + (cell || '-') + '</td>';
        });
        h += '</tr>';
      });
    });
    return h + '</tbody></table>';
  }
  const legend = '<div style="display:flex;gap:8pt;margin-top:5pt;font-size:6.5pt;color:#555">'
    + '<span><span style="display:inline-block;width:8pt;height:8pt;background:#d4edda;border-radius:1pt;vertical-align:middle"></span> 오전(10-20)</span>'
    + '<span><span style="display:inline-block;width:8pt;height:8pt;background:#e2d9f3;border-radius:1pt;vertical-align:middle"></span> 오후(13-23)</span></div>';
  const html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">'
    + '<style>@page{size:A4 portrait;margin:6mm 8mm}*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:"Malgun Gothic","맑은 고딕",sans-serif}</style></head><body>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5pt solid #000;padding-bottom:3pt;margin-bottom:5pt">'
    + '<div><div style="font-size:13pt;font-weight:700">주간 고정근무표</div><div style="font-size:7pt;color:#555;margin-top:2pt">' + titleStr + '</div></div>'
    + '<div style="font-size:6.5pt;color:#888;text-align:right">' + metaStr + '</div></div>'
    + schH() + '<div style="border-top:0.5pt solid #bbb;margin:4pt 0 3pt"></div>'
    + '<div style="font-size:8pt;font-weight:700;margin-bottom:3pt">요일별 근무 명단 (고정)</div>' + sumH() + legend + '</body></html>';
  printHtml(html);
}

function doPrint(withDetail) {
  const off = ui.weekOffset;
  const days = getWeekDays(off);
  const fmt = d => (d.getMonth() + 1) + '/' + d.getDate();
  const k = weekKey(off);
  const odd = isOddWeek(off);
  const now = TODAY;
  const titleStr = days[0].getFullYear() + '년 ' + fmt(days[0]) + ' ~ ' + fmt(days[6]) + ' (' + (odd ? '홀수' : '짝수') + ' 주)';
  const metaStr = '출력일: ' + now.getFullYear() + '.' + (now.getMonth() + 1) + '.' + now.getDate() + ' / ' + (isWeekConfirmed(off) ? '✓ 확정됨' : '미확정');

  function schH() {
    const depts = DEPTS.filter(d => state.employees.some(e => e.dept === d));
    let h = '<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.5pt">'
      + '<colgroup><col style="width:22pt"><col style="width:40pt">' + days.map(() => '<col>').join('') + '</colgroup>'
      + '<thead><tr><th style="background:#f2f2f2;border:0.3pt solid #aaa;padding:2pt 1pt;text-align:center;font-size:7pt">부서</th>'
      + '<th style="background:#f2f2f2;border:0.3pt solid #aaa;padding:2pt 1pt;text-align:center;font-size:7pt">직원</th>'
      + days.map((d, i) => '<th style="background:#f2f2f2;border:0.3pt solid #aaa;padding:2pt 0;text-align:center;font-size:7pt;' + (i >= 5 ? 'color:#c00' : '') + '">' + DAY_KO[i] + '<br><span style="font-weight:400">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></th>').join('')
      + '</tr></thead><tbody>';
    const colCount = days.length + 2;
    depts.forEach((dept, deptIdx) => {
      const de = state.employees.filter(e => e.dept === dept && isActiveForWeek(e, off));
      if (!de.length) return;
      if (deptIdx > 0) h += '<tr><td colspan="' + colCount + '" style="height:5pt;background:#f2f2f2;border:none;padding:0"></td></tr>';
      de.forEach((emp, ri) => {
        h += '<tr>';
        if (ri === 0) h += '<td rowspan="' + de.length + '" style="border:0.3pt solid #ccc;background:#f9f9f9;text-align:center;font-size:7pt;vertical-align:middle">' + dept + '</td>';
        h += '<td style="border:0.3pt solid #ccc;padding:0 3pt;font-size:7.5pt;font-weight:600;vertical-align:middle">' + emp.name + '</td>';
        days.forEach((_, di) => {
          const sh = getShift(emp, di, off);
          if (sh === '__off__') { h += '<td style="border:0.3pt solid #ccc;text-align:center;color:#ccc;font-size:7pt;vertical-align:middle">—</td>'; return; }
          let lb, bg, fg;
          if (sh === 'half' || sh === 'half_pm') {
            const base = getBaseShift(emp, di, off);
            lb = getHalfLabel(base, sh); bg = '#f8d7da'; fg = '#721c24';
          } else {
            lb = SHIFT_LABEL[sh] || '';
            bg = AM_KEYS.includes(sh) ? '#d4edda' : sh === '1323' ? '#e2d9f3' : sh === 'annual' ? '#fff3cd' : '';
            fg = AM_KEYS.includes(sh) ? '#155724' : sh === '1323' ? '#3d1a78' : sh === 'annual' ? '#856404' : '#999';
          }
          h += lb ? '<td style="border:0.3pt solid #ccc;text-align:center;vertical-align:middle"><span style="background:' + bg + ';color:' + fg + ';font-size:7pt;font-weight:700;padding:1pt 4pt;border-radius:2pt;display:inline-block">' + lb + '</span></td>' : '<td style="border:0.3pt solid #ccc;text-align:center;color:#ccc;font-size:7pt">—</td>';
        });
        h += '</tr>';
      });
    });
    return h + '</tbody></table>';
  }
  function sumH() {
    const activeDepts = DEPTS.filter(d => state.employees.some(e => e.dept === d));
    const sds = [{ keys: AM_KEYS, label: '오전', am: true }, { keys: PM_KEYS, label: '오후', am: false }];
    let h = '<table style="width:100%;border-collapse:collapse;font-size:7pt;table-layout:fixed">'
      + '<colgroup><col style="width:22pt"><col style="width:40pt">' + days.map(() => '<col>').join('') + '</colgroup>'
      + '<thead><tr><th colspan="2" style="border:0.4pt solid #bbb;background:#f2f2f2;padding:3pt 2pt"></th>'
      + days.map((d, i) => '<th style="border:0.4pt solid #bbb;background:#f2f2f2;font-weight:700;text-align:center;padding:3pt 2pt;' + (i >= 5 ? 'color:#c00' : '') + '">' + DAY_KO[i] + '<br><span style="font-weight:400">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></th>').join('')
      + '</tr></thead><tbody>';
    sds.forEach((sd, sdIdx) => {
      const rowDepts = activeDepts.filter(d => !PM_EXCLUDE_DEPTS.includes(d) || sd.keys === AM_KEYS);
      if (!rowDepts.length) return;
      const colCount = days.length + 2;
      if (sdIdx > 0) h += '<tr><td colspan="' + colCount + '" style="height:4pt;background:#f2f2f2;border:none;padding:0"></td></tr>';
      const lbBg = sd.am ? '#d4edda' : '#e2d9f3', lbFg = sd.am ? '#155724' : '#3d1a78';
      rowDepts.forEach((dept, di) => {
        const dEmps = state.employees.filter(e => e.dept === dept);
        h += '<tr>';
        if (di === 0) h += '<td rowspan="' + rowDepts.length + '" style="border:0.4pt solid #bbb;background:#e8e8e8;text-align:center;vertical-align:middle;padding:2pt 2pt"><span style="background:' + lbBg + ';color:' + lbFg + ';padding:1pt 3pt;border-radius:2pt;font-weight:700;font-size:6pt">' + sd.label + '</span></td>';
        h += '<td style="border:0.4pt solid #bbb;background:#f5f5f5;text-align:center;font-size:6pt;font-weight:700;padding:2pt 2pt;white-space:nowrap">' + dept + '</td>';
        days.forEach((_, di2) => {
          const entries = dEmps.filter(e => isActiveForWeek(e, off)).map(e => { const { shiftKey, isHalf, halfType } = getDisplayInfo(e, di2, off); return { name: e.name, shiftKey, isHalf, halfType }; }).filter(x => sd.keys.includes(x.shiftKey));
          const cell = entries.map(x => { if (x.isHalf) { const tl = getHalfLabel(x.shiftKey, x.halfType); return x.name + '<span style="font-size:5.5pt;color:#c0392b">(' + tl + ')</span>'; } return x.name; }).join('<br>');
          h += '<td style="border:0.4pt solid #bbb;padding:2pt 3pt;font-size:7pt;line-height:1.6;vertical-align:top">' + (cell || '-') + '</td>';
        });
        h += '</tr>';
      });
    });
    return h + '</tbody></table>';
  }
  const legend = '<div style="display:flex;gap:8pt;margin-top:5pt;font-size:6.5pt;color:#555">'
    + '<span><span style="display:inline-block;width:8pt;height:8pt;background:#d4edda;border-radius:1pt;vertical-align:middle"></span> 오전(10-20)</span>'
    + '<span><span style="display:inline-block;width:8pt;height:8pt;background:#e2d9f3;border-radius:1pt;vertical-align:middle"></span> 오후(13-23)</span>'
    + '<span><span style="display:inline-block;width:8pt;height:8pt;background:#fff3cd;border-radius:1pt;vertical-align:middle"></span> 연차</span>'
    + '<span><span style="display:inline-block;width:8pt;height:8pt;background:#f8d7da;border-radius:1pt;vertical-align:middle"></span> 반차</span></div>';
  const html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">'
    + '<style>@page{size:A4 portrait;margin:6mm 8mm}*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:"Malgun Gothic","맑은 고딕",sans-serif}</style></head><body>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5pt solid #000;padding-bottom:3pt;margin-bottom:5pt">'
    + '<div><div style="font-size:13pt;font-weight:700">주간 근무표</div><div style="font-size:7pt;color:#555;margin-top:2pt">' + titleStr + '</div></div>'
    + '<div style="font-size:6.5pt;color:#555;text-align:right">' + metaStr + '</div></div>'
    + (withDetail ? schH() + '<div style="border-top:0.5pt solid #bbb;margin:4pt 0 3pt"></div>' : '')
    + '<div style="font-size:8pt;font-weight:700;margin-bottom:3pt">요일별 근무 명단</div>' + sumH() + legend + '</body></html>';
  printHtml(html);
}

function printHtml(html) {
  const iframe = document.getElementById('printFrame');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => iframe.contentWindow.print(), 300);
}
