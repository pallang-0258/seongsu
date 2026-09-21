// ── 직원 관리: CRUD + 요일별 근무패턴(교대 포함) 편집 + 적용시작일/이력 ──

const ALT_OPTION_VALUE = 'alt';

// 하루 패턴 값 → 사람이 읽는 라벨 (직원표/이력 표시용)
function dayShiftLabel(v) {
  if (v === null || v === undefined) return '휴무';
  if (typeof v === 'object') {
    if (v.alt) return '홀:' + (SHIFT_LABEL[v.odd] || v.odd) + ' / 짝:' + (SHIFT_LABEL[v.even] || v.even);
    return '휴무';
  }
  return SHIFT_LABEL[v] || v;
}
function dayShiftClass(v, off) {
  // off가 주어지면(홀짝 판단 가능) alt를 실제 시프트로 해소해서 색상 클래스 반환
  if (v && typeof v === 'object' && v.alt) {
    const resolved = off !== undefined ? (isOddWeek(off) ? v.odd : v.even) : v.odd;
    return SHIFT_CLS[resolved] || '';
  }
  return SHIFT_CLS[v] || '';
}
function dayShiftEqual(a, b) {
  return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
}

// ── 요일별 근무 시간 표(직원 추가/수정 모달) ──
function renderDayShiftRow(shiftArr) {
  const defaults = ['1020', '1020', '1020', '1020', '1020', null, null];
  const row = document.getElementById('dayShiftRow'); if (!row) return;
  row.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const raw = (shiftArr && shiftArr[i] !== undefined) ? shiftArr[i] : defaults[i];
    const isAlt = raw && typeof raw === 'object' && raw.alt;
    const mainVal = isAlt ? ALT_OPTION_VALUE : (raw || 'off');
    const oddVal = isAlt ? raw.odd : '1020';
    const evenVal = isAlt ? raw.even : '1323';
    const isWknd = i >= 5;
    return '<td style="border:1px solid #e8e6e0;padding:4px 3px;text-align:center;vertical-align:top">'
      + '<select id="ds' + i + '" onchange="onDayShiftSelectChange(' + i + ')" style="width:100%;height:32px;font-size:11px;border-radius:6px;border:1px solid #d8d5cf;padding:0 2px;' + (isWknd ? 'color:#c0392b' : '') + '">'
      + '<option value="off"' + (mainVal === 'off' ? ' selected' : '') + '>휴무</option>'
      + '<option value="1020"' + (mainVal === '1020' ? ' selected' : '') + ' style="color:#2e7d32">10-20</option>'
      + '<option value="1019"' + (mainVal === '1019' ? ' selected' : '') + ' style="color:#2e7d32">10-19</option>'
      + '<option value="1323"' + (mainVal === '1323' ? ' selected' : '') + ' style="color:#4527a0">13-23</option>'
      + '<option value="' + ALT_OPTION_VALUE + '"' + (mainVal === ALT_OPTION_VALUE ? ' selected' : '') + ' style="color:#e65100">격주 교대</option>'
      + '</select>'
      + '<div id="dsAlt' + i + '" style="display:' + (mainVal === ALT_OPTION_VALUE ? '' : 'none') + ';margin-top:3px">'
      + '<select id="ds' + i + '_odd" style="width:100%;height:26px;font-size:10px;border-radius:5px;border:1px solid #d8d5cf;margin-bottom:2px" title="홀수주 근무">'
      + ['1020', '1019', '1323'].map(k => '<option value="' + k + '"' + (oddVal === k ? ' selected' : '') + '>홀 ' + SHIFT_LABEL[k] + '</option>').join('')
      + '</select>'
      + '<select id="ds' + i + '_even" style="width:100%;height:26px;font-size:10px;border-radius:5px;border:1px solid #d8d5cf" title="짝수주 근무">'
      + ['1020', '1019', '1323'].map(k => '<option value="' + k + '"' + (evenVal === k ? ' selected' : '') + '>짝 ' + SHIFT_LABEL[k] + '</option>').join('')
      + '</select></div>'
      + '</td>';
  }).join('');
}
function onDayShiftSelectChange(i) {
  const sel = document.getElementById('ds' + i);
  const wrap = document.getElementById('dsAlt' + i);
  if (wrap) wrap.style.display = (sel.value === ALT_OPTION_VALUE) ? '' : 'none';
}
function gatherDayShiftsFromForm() {
  return Array.from({ length: 7 }, (_, i) => {
    const sel = document.getElementById('ds' + i);
    const v = sel ? sel.value : 'off';
    if (v === 'off') return null;
    if (v === ALT_OPTION_VALUE) {
      const odd = document.getElementById('ds' + i + '_odd')?.value || '1020';
      const even = document.getElementById('ds' + i + '_even')?.value || '1323';
      return { alt: true, odd, even };
    }
    return v;
  });
}

function onWorkTypeChange() {
  const t = document.getElementById('nWorkType').value;
  const hint = document.getElementById('workTypeHint');
  if (t === 'biweek_odd') hint.textContent = '홀수 주(1,3,5,…주)에만 근무합니다.';
  else if (t === 'biweek_even') hint.textContent = '짝수 주(2,4,6,…주)에만 근무합니다.';
  else hint.textContent = '';
}

function openEmpModal() {
  ui.editingEmpId = null;
  document.getElementById('empModalTitle').textContent = '직원 추가';
  document.getElementById('nName').value = ''; document.getElementById('nDept').value = '약사';
  document.getElementById('nJoinDate').value = ''; document.getElementById('nWorkType').value = 'full';
  document.getElementById('nLeaveDate').value = '';
  document.getElementById('nEmploymentType').value = 'fulltime';
  document.getElementById('nPhone').value = '';
  document.getElementById('nTrueJoinDate').value = '';
  document.getElementById('workTypeHint').textContent = '';
  document.getElementById('empApplyFromWrap').style.display = 'none';
  renderDayShiftRow(null);
  document.getElementById('empModal').classList.add('open');
}

function openEditEmp(id) {
  ui.editingEmpId = id; const e = state.employees.find(emp => emp.id === id); if (!e) return;
  document.getElementById('empModalTitle').textContent = '직원 수정 – ' + e.name;
  document.getElementById('nName').value = e.name; document.getElementById('nDept').value = e.dept;
  document.getElementById('nJoinDate').value = e.joinDate || ''; document.getElementById('nLeaveDate').value = e.leaveDate || '';
  document.getElementById('nWorkType').value = e.workType || 'full';
  document.getElementById('nEmploymentType').value = e.employmentType || 'fulltime';
  document.getElementById('nPhone').value = e.phone || '';
  document.getElementById('nTrueJoinDate').value = e.trueJoinDate || '';
  onWorkTypeChange();
  const pat = getCurrentPattern(e.id);
  renderDayShiftRow(pat);
  document.getElementById('empApplyFromWrap').style.display = '';
  document.querySelector('input[name="applyFromMode"][value="now"]').checked = true;
  document.getElementById('empApplyDateRow').style.display = 'none';
  document.getElementById('nApplyFrom').value = toLocalDateStr(TODAY);
  document.getElementById('empModal').classList.add('open');
}
function onApplyFromModeChange() {
  const mode = document.querySelector('input[name="applyFromMode"]:checked')?.value;
  document.getElementById('empApplyDateRow').style.display = (mode === 'date') ? '' : 'none';
}

// 버그수정: 예전에는 직원의 고정 시간표를 바꾸면 fromDateStr 이후 근무표에서 수동으로
// 바꿔둔 근무(state.schedules의 개별 오버라이드)를 전부 지워버렸다. 이제는 지우지 않는다 —
// getShiftForDate가 이미 오버라이드를 패턴보다 우선해서 보여주므로(수동 수정이 항상 우선 적용),
// 그냥 그대로 두면 된다. 대신 저장 시점에 "이 직원의 어느 날짜가 이미 수동으로 설정되어 있어서
// 새 고정시간표가 그 날짜에는 적용되지 않는다"는 걸 알려주기 위해 그 목록만 모아서 반환한다.
// (fromDateStr 이후 & 아직 확정되지 않은 주만 대상 — 확정된 주는 애초에 영향받지 않는다.)
function collectFutureManualOverrides(empId, fromDateStr) {
  const results = [];
  Object.keys(state.schedules).forEach(k => {
    if (state.confirmedSnapshots[k]) return;
    const empOv = state.schedules[k][empId];
    if (!empOv) return;
    const weekOff = dateToWeekOffset(k);
    Object.keys(empOv).forEach(diKey => {
      if (diKey === '_notes') return;
      const di = +diKey;
      const dateStr = toLocalDateStr(getWeekDays(weekOff)[di]);
      if (dateStr < fromDateStr) return;
      results.push({ dateStr, value: empOv[diKey] });
    });
  });
  return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}
function manualOverrideValueLabel(v) {
  if (v === 'off') return '휴무(수동 지정)';
  return SHIFT_LABEL[v] || String(v);
}
function showManualOverrideWarning(empName, overrides) {
  if (!overrides.length) return;
  document.getElementById('shiftHistoryTitle').textContent = empName + ' — 새 고정시간표가 적용되지 않는 날짜';
  const html = '<div style="font-size:12px;color:#555;margin-bottom:10px;line-height:1.6">'
    + '아래 날짜들은 근무표에서 이미 수동으로 변경되어 있어서, 방금 바꾼 고정시간표 대신 <strong>기존 수동 설정이 그대로 유지</strong>됩니다.<br>바꾸고 싶다면 근무표 탭에서 해당 날짜를 다시 클릭해 수정하세요.</div>'
    + '<div style="border:1px solid #dde4ee;border-radius:10px;overflow:hidden">'
    + overrides.map((o, i) => '<div style="display:flex;justify-content:space-between;gap:8px;padding:8px 12px;' + (i > 0 ? 'border-top:1px solid #f0ede8' : '') + '">'
      + '<span style="font-weight:600">' + o.dateStr + '</span>'
      + '<span style="color:#1565c0">' + manualOverrideValueLabel(o.value) + '</span></div>').join('')
    + '</div>';
  document.getElementById('shiftHistoryBody').innerHTML = html;
  document.getElementById('shiftHistoryModal').classList.add('open');
}

function saveEmp() {
  const name = document.getElementById('nName').value.trim(); if (!name) return;
  const workType = document.getElementById('nWorkType').value;
  const joinDate = document.getElementById('nJoinDate').value || '';
  const leaveDate = document.getElementById('nLeaveDate').value || '';
  const employmentType = document.getElementById('nEmploymentType').value || 'fulltime';
  const phone = document.getElementById('nPhone').value.trim();
  const trueJoinDate = document.getElementById('nTrueJoinDate').value || '';
  const dayShifts = gatherDayShiftsFromForm();
  const workDays = dayShifts.map(v => v !== null ? 1 : 0);

  let pendingOverrideWarning = null; // { empName, overrides } — 저장 완료 후에 보여줄 경고 팝업

  if (ui.editingEmpId) {
    const e = state.employees.find(emp => emp.id === ui.editingEmpId); if (!e) return;
    const mode = document.querySelector('input[name="applyFromMode"]:checked')?.value || 'now';
    let applyFrom = null;
    if (mode === 'date') {
      const v = document.getElementById('nApplyFrom').value;
      if (v) applyFrom = parseLocalDate(v);
    }
    const newShift = dayShifts;
    const oldShift = getCurrentPattern(e.id);
    const shiftChanged = newShift.some((v, i) => !dayShiftEqual(v, oldShift[i]));

    e.name = name; e.dept = document.getElementById('nDept').value; e.joinDate = joinDate; e.leaveDate = leaveDate;
    e.workType = workType; e.workDays = workDays; e.employmentType = employmentType; e.phone = phone; e.trueJoinDate = trueJoinDate;

    if (shiftChanged && applyFrom) {
      const applyDate = new Date(applyFrom); applyDate.setHours(0, 0, 0, 0);
      const applyDateStr = toLocalDateStr(applyDate);
      if (!state.shiftHistory[e.id]) state.shiftHistory[e.id] = [];
      state.shiftHistory[e.id] = state.shiftHistory[e.id].filter(h => h.applyFrom !== applyDateStr);
      if (!state.shiftHistory[e.id].length) {
        const baseFrom = e.joinDate || '2000-01-01';
        state.shiftHistory[e.id].push({ applyFrom: baseFrom, newShift: [...oldShift], oldShift: [...oldShift], registeredAt: toLocalDateStr(TODAY) });
      } else {
        const sorted = state.shiftHistory[e.id].slice().sort((a, b) => a.applyFrom.localeCompare(b.applyFrom));
        const prevEntry = sorted.filter(h => h.applyFrom < applyDateStr).pop();
        if (!prevEntry) {
          const baseFrom = e.joinDate || '2000-01-01';
          state.shiftHistory[e.id].push({ applyFrom: baseFrom, newShift: [...oldShift], oldShift: [...oldShift], registeredAt: toLocalDateStr(TODAY) });
        }
      }
      state.shiftHistory[e.id].push({ applyFrom: applyDateStr, newShift: [...newShift], oldShift: [...oldShift], registeredAt: toLocalDateStr(TODAY) });
      state.shiftHistory[e.id] = state.shiftHistory[e.id].slice(-20);
      const affected1 = collectFutureManualOverrides(e.id, applyDateStr);
      if (affected1.length) pendingOverrideWarning = { empName: e.name, overrides: affected1 };
      state.defaultShift[e.id] = newShift;
    } else if (shiftChanged) {
      if (!state.shiftHistory[e.id]) state.shiftHistory[e.id] = [];
      const todayStr = toLocalDateStr(TODAY);
      if (!state.shiftHistory[e.id].length) {
        const baseFrom = e.joinDate || '2000-01-01';
        state.shiftHistory[e.id].push({ applyFrom: baseFrom, newShift: [...oldShift], oldShift: [...oldShift], registeredAt: todayStr });
      }
      state.shiftHistory[e.id] = state.shiftHistory[e.id].filter(h => h.applyFrom !== todayStr);
      state.shiftHistory[e.id].push({ applyFrom: todayStr, newShift: [...newShift], oldShift: [...oldShift], registeredAt: todayStr });
      state.shiftHistory[e.id] = state.shiftHistory[e.id].slice(-20);
      const todayMonStr = toLocalDateStr(getWeekStart(0));
      const affected2 = collectFutureManualOverrides(e.id, todayMonStr);
      if (affected2.length) pendingOverrideWarning = { empName: e.name, overrides: affected2 };
      state.defaultShift[e.id] = newShift;
    }
  } else {
    const id = (state.employees.length > 0 ? Math.max(...state.employees.map(e => e.id)) : 0) + 1;
    state.employees.push({ id, name, dept: document.getElementById('nDept').value, joinDate, leaveDate, annual: 0, used: 0, color: id % COLORS.length, workType, workDays, employmentType, phone, trueJoinDate });
    state.defaultShift[id] = dayShifts;
  }
  // 부서별 자동 정렬 (퇴사자는 맨 아래)
  state.employees.sort((a, b) => {
    const ar = isResigned(a) ? 1 : 0, br = isResigned(b) ? 1 : 0;
    if (ar !== br) return ar - br;
    const ai = DEPTS.indexOf(a.dept), bi = DEPTS.indexOf(b.dept);
    if (ai !== bi) return ai - bi;
    return 0;
  });
  save(); closeModal('empModal'); renderAll();
  if (pendingOverrideWarning) showManualOverrideWarning(pendingOverrideWarning.empName, pendingOverrideWarning.overrides);
}
function removeEmp(id) { if (!confirm('정말 삭제하시겠습니까?')) return; state.employees = state.employees.filter(e => e.id !== id); save(); renderAll(); }

// ── 스케줄 변경 이력 ──
function showShiftHistory(empId) {
  const e = state.employees.find(x => x.id === empId); if (!e) return;
  const history = (state.shiftHistory[empId] || []).slice().sort((a, b) => a.applyFrom.localeCompare(b.applyFrom));
  const todayStr = toLocalDateStr(TODAY);
  document.getElementById('shiftHistoryTitle').textContent = e.name + ' — 스케줄 변경 이력';
  let html = '';
  if (!history.length) {
    html = '<div style="color:#aaa;text-align:center;padding:16px">변경 이력이 없습니다</div>';
  } else {
    history.forEach(h => {
      const isPast = h.applyFrom <= todayStr;
      const statusBadge = isPast
        ? '<span style="font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 7px;border-radius:10px">적용됨</span>'
        : '<span style="font-size:10px;background:#fff3e0;color:#e65100;padding:1px 7px;border-radius:10px">적용예정</span>';
      const changes = [];
      for (let di = 0; di < 7; di++) {
        const o = h.oldShift[di], n = h.newShift[di];
        if (!dayShiftEqual(o, n)) changes.push(DAY_KO[di] + ': ' + dayShiftLabel(o) + ' → ' + dayShiftLabel(n));
      }
      html += '<div style="border:1px solid #dde4ee;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:' + (isPast ? '#fafafa' : '#fffbf5') + '">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<strong style="font-size:13px">' + h.applyFrom + ' 부터 적용</strong>' + statusBadge
        + '<span style="margin-left:auto;font-size:11px;color:#aaa">등록일: ' + h.registeredAt + '</span></div>'
        + '<div style="font-size:12px;color:#444;line-height:1.8">' + changes.map(c => '<div>• ' + c + '</div>').join('') + '</div>'
        + (!isPast ? '<button class="btn sm danger" style="margin-top:8px;font-size:11px" onclick="cancelShiftHistory(' + empId + ',\'' + h.applyFrom + '\')">예정 취소</button>' : '')
        + '</div>';
    });
  }
  document.getElementById('shiftHistoryBody').innerHTML = html;
  document.getElementById('shiftHistoryModal').classList.add('open');
}
function cancelShiftHistory(empId, applyFrom) {
  if (!confirm(applyFrom + ' 부터 적용 예정인 스케줄 변경을 취소할까요?')) return;
  if (state.shiftHistory[empId]) state.shiftHistory[empId] = state.shiftHistory[empId].filter(h => h.applyFrom !== applyFrom);
  save(); renderAll();
  closeModal('shiftHistoryModal');
}

// ── 직원 메모 CRUD ──
function createEmpMemo({ empId, date, content }) {
  state.empMemos.push({ id: nextId(state.empMemos), empId, date, content, createdAt: toLocalDateStr(TODAY) });
  save();
}
function updateEmpMemo(id, { empId, date, content }) {
  const m = state.empMemos.find(x => x.id === id); if (!m) return;
  m.empId = empId; m.date = date; m.content = content;
  save();
}
function deleteEmpMemo(id) {
  if (!confirm('메모를 삭제하시겠습니까?')) return;
  state.empMemos = state.empMemos.filter(x => x.id !== id);
  save(); renderEmpMemos();
}
