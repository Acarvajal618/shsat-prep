(function () {
  const DATA_PREFIX = 'data/';
  const STORAGE_MASTERY = 'shsat_mastery';
  const MASTERY_LEVELS = ['not_started', 'attempted', 'familiar', 'proficient', 'mastered'];

  // Lessons available — add type_id here as new lesson HTMLs are created
  const LESSONS = new Set(['1_1','1_2','1_3','1_4','1_5','1_6','1_7','1_8','1_9','2_1','2_2','2_3','2_4','2_5','2_6','2_7','2_8','2_9','2_10','2_11','3_1','3_2','4_1','4_2','4_3','4_4','4_5','4_6','4_7','4_8','5_1','5_2','5_3','5_4','5_5','5_6','6_1','6_2','6_3','6_4','6_5','6_6','6_7','6_8','6_9','6_10','6_11','6_12','6_13','6_14','6_15','6_16','6_17','6_18','6_19','6_20','6_21','6_22','7_1','7_2','7_3','7_4','7_5','7_6','7_7','8_1','8_2','8_3','9_1','9_2','9_3','9_4','9_5','9_6','9_7','9_8','9_9','10_1','10_2']);

  let problemTypes = [];
  let subtypeList = [];
  let problemsByType = {};
  let state = {
    practice: { queue: [], index: 0, correct: 0, selectedType: null },
    exam: { queue: [], index: 0, answers: [], correct: 0, startTime: null, timerId: null }
  };

  function getMastery() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_MASTERY) || '{}');
    } catch {
      return {};
    }
  }

  function setMastery(typeId, update) {
    const m = getMastery();
    const prev = m[typeId] || { level: 'not_started', correct: 0, total: 0 };
    m[typeId] = { ...prev, ...update };
    localStorage.setItem(STORAGE_MASTERY, JSON.stringify(m));
  }


  function saveResult(typeId, correct) {
    var key = 'shsat_results';
    var results = JSON.parse(localStorage.getItem(key) || '[]');
    results.push({ typeId: typeId, correct: correct, ts: Date.now() });
    if (results.length > 500) results = results.slice(-500);
    localStorage.setItem(key, JSON.stringify(results));
  }

  function hasPassedLesson(typeId) {
    var results = JSON.parse(localStorage.getItem('shsat_results') || '[]');
    return results.some(function(r){ return r.typeId === typeId && r.correct; });
  }

  function updateMasteryFromResult(typeId, correct) {
    const m = getMastery();
    const prev = m[typeId] || { level: 'not_started', correct: 0, total: 0 };
    const total = prev.total + 1;
    const correctCount = prev.correct + (correct ? 1 : 0);
    const pct = total > 0 ? (100 * correctCount) / total : 0;
    let level = prev.level;
    if (level === 'not_started') level = correct ? 'familiar' : 'attempted';
    else if (correct && (level === 'attempted' || level === 'familiar')) {
      level = pct >= 85 ? 'proficient' : 'familiar';
    } else if (!correct && level === 'mastered') level = 'familiar';
    setMastery(typeId, { level, correct: correctCount, total });
  }

  function typeName(typeId) {
    const [major] = String(typeId).split('_');
    const t = problemTypes.find((x) => String(x.id) === major);
    return t ? t.name : typeId;
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function showLoading(on) {
    const loading = document.getElementById('screen-loading');
    if (on) {
      document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
      loading.classList.remove('hidden');
    } else loading.classList.add('hidden');
  }

  async function loadInitialData() {
    const [typesRes, schemaRes] = await Promise.all([
      fetch(DATA_PREFIX + 'problem_types.json'),
      fetch(DATA_PREFIX + 'exam_diagnostic_full.csv?v=full')
    ]);
    if (!typesRes.ok || !schemaRes.ok) throw new Error('Failed to load data');
    problemTypes = await typesRes.json();
    const schemaText = await schemaRes.text();
    subtypeList = schemaText
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((row) => {
        const parts = row.split(',');
        return (parts[1] || '').trim();
      })
      .filter(Boolean);
    return { problemTypes, subtypeList };
  }

  async function loadProblemsForTypes(typeIds) {
    const needed = typeIds.filter((id) => !problemsByType[id]);
    await Promise.all(
      needed.map(async (typeId) => {
        const res = await fetch(DATA_PREFIX + 'generated/type_' + typeId + '.json');
        if (!res.ok) {
          problemsByType[typeId] = [];
          return;
        }
        const list = await res.json();
        problemsByType[typeId] = Array.isArray(list) ? list : [];
      })
    );
    return typeIds.map((id) => problemsByType[id] || []);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickOnePerType() {
    const out = [];
    subtypeList.forEach((typeId) => {
      const list = problemsByType[typeId];
      if (list && list.length) out.push(list[Math.floor(Math.random() * list.length)]);
    });
    return out;
  }

  function buildPracticeQueue(count, typeId) {
    if (typeId) {
      const list = problemsByType[typeId] || [];
      return shuffle(list).slice(0, Math.min(count, list.length));
    }
    const pool = [];
    subtypeList.forEach((id) => {
      (problemsByType[id] || []).forEach((p) => pool.push(p));
    });
    return shuffle(pool).slice(0, Math.min(count, pool.length));
  }

  function renderOptions(container, problem, selectedKey, disabled, correctKey) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const opts = problem.options || {};
    container.innerHTML = '';
    letters.forEach((key) => {
      if (!(key in opts)) return;
      const div = document.createElement('label');
      div.className = 'option' + (selectedKey === key ? ' selected' : '');
      if (correctKey && (key === correctKey || key === selectedKey)) {
        div.classList.add(key === correctKey ? 'correct' : 'incorrect');
      }
      div.innerHTML =
        '<input type="radio" name="ans" value="' +
        key +
        '" ' +
        (disabled ? 'disabled' : '') +
        (selectedKey === key ? ' checked' : '') +
        ' /> <span>' +
        key +
        '. ' +
        escapeHtml(String(opts[key])) +
        '</span>';
      if (!disabled) div.addEventListener('click', (e) => { e.preventDefault(); selectOption(container, key); });
      container.appendChild(div);
    });
  }

  function selectOption(container, key) {
    const opt = container.querySelector('input[value="' + key + '"]');
    if (!opt) return;
    const wasSelected = opt.checked;
    container.querySelectorAll('.option').forEach((el) => el.classList.remove('selected'));
    container.querySelectorAll('input[name="ans"]').forEach((el) => { el.checked = false; });
    if (!wasSelected) {
      opt.closest('.option').classList.add('selected');
      opt.checked = true;
    }
  }

  function getSelectedOption(container) {
    const r = container.querySelector('input[name="ans"]:checked');
    return r ? r.value : null;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // Shared helpers come from common.js (window.SHSAT)
  const renderDiagram = window.SHSAT.renderDiagram;

  function renderSolution(container, problem) {
    const sol = problem.solution;
    if (!sol) {
      container.innerHTML = '<p>No solution steps available.</p>';
      return;
    }
    let html = '';
    if (sol.strategy) html += '<p class="strategy">' + escapeHtml(sol.strategy) + '</p>';
    if (sol.steps && sol.steps.length) {
      html += '<ol class="steps">' + sol.steps.map((t) => '<li>' + escapeHtml(t) + '</li>').join('') + '</ol>';
    }
    if (sol.final_answer) html += '<p class="final">Answer: ' + escapeHtml(sol.final_answer) + '</p>';
    container.innerHTML = html || '<p>No solution available.</p>';
  }

  // —— Dashboard ——
  function renderDashboard() {
    const mastery = getMastery();
    const proficient = subtypeList.filter((id) => {
      const lvl = (mastery[id] || {}).level;
      return lvl === 'proficient' || lvl === 'mastered';
    });
    const total = subtypeList.length;
    const pct = total > 0 ? Math.round((proficient.length / total) * 100) : 0;

    document.getElementById('mastery-summary').innerHTML =
      '<div class="mastery-summary-label">Skills to proficient</div>' +
      '<div class="mastery-summary-count">' + proficient.length + ' / ' + total + ' <span>(' + pct + '%)</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.max(pct, pct > 0 ? 0 : 0) + '%"></div></div>' +
      (proficient.length === 0 ? '<p style="margin:0.75rem 0 0;font-size:0.85rem;opacity:0.85">👋 New here? Start with the <a href="#exam" style="color:#a8edbc;font-weight:600">diagnostic exam</a> to see where you stand, or jump into <a href="#practice" style="color:#a8edbc;font-weight:600">practice</a> by type.</p>' : '');

    // Group subtypes by major type id
    const groups = {};
    subtypeList.forEach((typeId) => {
      const [major] = String(typeId).split('_');
      if (!groups[major]) groups[major] = { name: typeName(typeId), ids: [] };
      groups[major].ids.push(typeId);
    });

    const container = document.getElementById('type-grid');
    container.innerHTML = '';
    container.className = '';

    // Equation Trainer promo card at the top
    const trainerPromo = document.createElement('div');
    trainerPromo.style.cssText = 'margin-bottom:1.25rem;';
    trainerPromo.innerHTML =
      '<a href="trainer.html" style="display:flex;align-items:center;gap:1rem;background:linear-gradient(135deg,#4c1d63 0%,#c026d3 100%);border-radius:10px;padding:1rem 1.25rem;color:#fff;text-decoration:none;box-shadow:0 4px 16px rgba(192,38,211,0.25);transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(192,38,211,0.35)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 4px 16px rgba(192,38,211,0.25)\'">' +
      '<span style="font-size:2rem;line-height:1">🧮</span>' +
      '<div>' +
      '<div style="font-weight:800;font-size:1rem;margin-bottom:0.15rem">Equation Trainer</div>' +
      '<div style="font-size:0.82rem;opacity:0.85">Learn & practice the 6 equation types the SHSAT loves — step by step.</div>' +
      '</div>' +
      '<span style="margin-left:auto;opacity:0.75;font-size:1.1rem">→</span>' +
      '</a>';
    container.appendChild(trainerPromo);

    Object.entries(groups).forEach(([major, group]) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'type-group';
      const unitLabel = 'Unit ' + major + ' — ' + group.name;

      groupEl.innerHTML =
        '<div class="type-group-header">' +
        '<span class="type-group-dot"></span>' +
        '<span class="type-group-name">' + escapeHtml(unitLabel) + '</span>' +
        '<span class="type-group-line"></span>' +
        '</div>';

      const grid = document.createElement('div');
      grid.className = 'type-grid';

      group.ids.forEach((typeId) => {
        const m = mastery[typeId] || {};
        const level = m.level || 'not_started';
        const card = document.createElement('div');
        card.className = 'type-card level-' + level;
        var passedBadge = hasPassedLesson(typeId) ? ' <span style="display:inline-block;background:#1e8e3e;color:#fff;font-size:0.6rem;font-weight:700;padding:0.1em 0.4em;border-radius:3px;vertical-align:middle;margin-left:0.25rem">✓</span>' : '';
        card.innerHTML =
          '<span class="name">' + escapeHtml(typeName(typeId)) + passedBadge + ' <span style="font-weight:400;color:var(--text-muted)">' + typeId + '</span></span>' +
          '<span class="level level-' + level + '">' + level.replace(/_/g, ' ') + '</span>' +
          '<span class="card-actions">' +
          '<a class="card-btn-practice" href="#practice?type=' + encodeURIComponent(typeId) + '">Practice</a>' +
          (LESSONS.has(typeId) ? '<a class="card-btn-learn" href="lessons/' + typeId + '.html" target="_blank">Learn</a>' : '') +
          '</span>';
        grid.appendChild(card);
      });

      groupEl.appendChild(grid);
      container.appendChild(groupEl);
    });
  }

  // —— Practice ——
  function showPracticeSetup() {
    if (state.practice.queue.length > 0) {
      // picker always visible;
      document.getElementById('practice-session').classList.remove('hidden');
      document.getElementById('feedback-card').style.display = 'none';
      document.getElementById('question-card').classList.remove('hidden');
      showPracticeQuestion();
      return;
    }
    // picker always visible;
    document.getElementById('practice-session').classList.add('hidden');
    const picker = document.getElementById('type-picker');
    picker.innerHTML = '';

    // Auto-select type if coming from a dashboard card link
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const typeParam = params.get('type');
    if (typeParam && subtypeList.includes(typeParam)) {
      state.practice.selectedType = typeParam;
    }

    // Group subtypes by unit
    const groups = {};
    subtypeList.forEach((typeId) => {
      const [major] = String(typeId).split('_');
      if (!groups[major]) groups[major] = { name: typeName(typeId), ids: [] };
      groups[major].ids.push(typeId);
    });

    Object.entries(groups).forEach(([major, group]) => {
      const section = document.createElement('div');
      section.className = 'picker-unit-section';

      const header = document.createElement('div');
      header.className = 'picker-unit-header';
      header.textContent = 'Unit ' + major + ' — ' + group.name;
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'picker-subtype-grid';

      group.ids.forEach((typeId) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.dataset.typeid = typeId;
        card.className = 'picker-subtype-card' + (state.practice.selectedType === typeId ? ' active' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'picker-subtype-name';
        nameSpan.textContent = typeName(typeId);

        const idSpan = document.createElement('span');
        idSpan.className = 'picker-subtype-id';
        idSpan.textContent = typeId;

        card.appendChild(nameSpan);
        card.appendChild(idSpan);

        if (LESSONS.has(typeId)) {
          const learnLink = document.createElement('a');
          learnLink.href = 'lessons/' + typeId + '.html';
          learnLink.target = '_blank';
          learnLink.className = 'picker-learn-link';
          learnLink.textContent = '📖';
          learnLink.title = 'Open lesson for ' + typeId;
          learnLink.addEventListener('click', (e) => e.stopPropagation());
          card.appendChild(learnLink);
        }

        card.addEventListener('click', () => {
          // Toggle multi-select — click to add/remove from selection
          card.classList.toggle('active');
          // Keep selectedType as the last-clicked for backward compat
          state.practice.selectedType = card.classList.contains('active') ? typeId : null;
        });

        grid.appendChild(card);
      });

      section.appendChild(grid);
      picker.appendChild(section);
    });
  }

  function getPracticeMode() { return 'type'; } // always by type

  function startPractice() {
    const count = parseInt(document.getElementById('practice-count').value, 10);
    // Collect all selected (active) types from the picker
    const selectedCards = document.querySelectorAll('.picker-subtype-card.active');
    const selectedTypes = Array.from(selectedCards).map(c => c.dataset.typeid);
    if (selectedTypes.length === 0) {
      alert('Select at least one type from the list first.');
      return;
    }
    const needTypes = selectedTypes;
    showLoading(true);
    loadProblemsForTypes(needTypes).then(() => {
      showLoading(false);
      showScreen('screen-practice');
      // Build queue sampling from all selected types
      const perType = Math.max(1, Math.ceil(count / selectedTypes.length));
      let queue = [];
      selectedTypes.forEach(tid => {
        queue = queue.concat(buildPracticeQueue(perType, tid));
      });
      // Shuffle and trim to requested count
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      queue = queue.slice(0, count);
      state.practice.queue = queue;
      state.practice.index = 0;
      state.practice.correct = 0;
      if (state.practice.queue.length === 0) {
        alert('No problems available for this selection.');
        return;
      }
      document.getElementById('practice-session').classList.remove('hidden');
      coverSolution();
      document.getElementById('question-card').classList.remove('hidden');
      showPracticeQuestion();
    });
  }

  function showPracticeQuestion() {
    const q = state.practice.queue;
    const i = state.practice.index;
    if (i >= q.length) {
      endPractice();
      return;
    }
    const problem = q[i];
    document.getElementById('practice-progress-text').textContent =
      (i + 1) + ' / ' + q.length + (problem.id ? '  ·  ID ' + problem.id + '  ·  ' + (problem.type_id || '') : '');
    var pbarFill = document.getElementById('practice-pbar-fill');
    if (pbarFill) pbarFill.style.width = (q.length > 0 ? Math.round(100 * i / q.length) : 0) + '%';
    coverSolution();
    document.getElementById('question-text').textContent = problem.question;
    document.getElementById('options').innerHTML = '';
    renderDiagram(document.getElementById('diagram-container'), problem);
    renderOptions(document.getElementById('options'), problem, null, false);
    document.getElementById('question-card').classList.remove('hidden');
  }

  function submitPracticeAnswer() {
    const container = document.getElementById('options');
    const selected = getSelectedOption(container);
    if (selected == null) return;
    const i = state.practice.index;
    const problem = state.practice.queue[i];
    const correct = selected === problem.correct;
    state.practice.correct += correct ? 1 : 0;
    updateMasteryFromResult(problem.type_id, correct);
    saveResult(problem.type_id, correct);
    renderOptions(container, problem, selected, true, problem.correct);
    var unitLabel = typeName(problem.type_id) + " (" + problem.type_id + ")";
    document.getElementById("feedback-result").innerHTML = correct
      ? '<div style="font-size:1.4rem;font-weight:800;color:#1e8e3e;margin-bottom:0.35rem">✓ Correct!</div><div style="font-size:0.82rem;color:#6b7280;margin-bottom:0.5rem">' + unitLabel + '</div>'
      : '<div style="font-size:1.4rem;font-weight:800;color:#d93025;margin-bottom:0.35rem">✗ Incorrect</div><div style="font-size:0.92rem;margin-bottom:0.25rem">Correct answer: <strong>' + (problem.correct || "") + '</strong></div><div style="font-size:0.82rem;color:#6b7280;margin-bottom:0.5rem">' + unitLabel + '</div>';
    renderSolution(document.getElementById('solution-box'), problem);
    uncoverSolution();
  }

  function coverSolution() {
    document.getElementById('solution-cover').style.display = 'block';
    document.getElementById('feedback-card').style.display = 'none';
    document.getElementById('next-question-wrap').style.display = 'none';
    document.getElementById('solution-box').innerHTML = '';
    document.getElementById('feedback-result').innerHTML = '';
  }

  function uncoverSolution() {
    document.getElementById('solution-cover').style.display = 'none';
    document.getElementById('feedback-card').style.display = 'block';
    document.getElementById('next-question-wrap').style.display = 'block';
  }

  function nextPracticeQuestion() {
    coverSolution();
    document.getElementById('options').innerHTML = '';
    document.getElementById('question-card').classList.remove('hidden');
    state.practice.index++;
    showPracticeQuestion();
  }

  function endPractice() {
    const n = state.practice.queue.length;
    const c = state.practice.correct;
    alert('Practice complete. ' + c + ' / ' + n + ' correct.');
    // Clear state fully before returning to setup so stale answers don't persist
    state.practice.queue = [];
    state.practice.index = 0;
    state.practice.correct = 0;
    state.practice.selectedType = null;
    // Clear any lingering options/feedback UI
    document.getElementById('options').innerHTML = '';
    document.getElementById('feedback-card').style.display = 'none';
    document.getElementById('question-card').classList.remove('hidden');
    document.getElementById('practice-session').classList.add('hidden');
    // picker always visible;
    showPracticeSetup();
  }

  // —— Exam ——
  function startExam() {
    showLoading(true);
    loadProblemsForTypes(subtypeList).then(() => {
      showLoading(false);
      showScreen('screen-exam');
      state.exam.queue = pickOnePerType();
      state.exam.index = 0;
      state.exam.answers = [];
      state.exam.correct = 0;
      state.exam.startTime = document.getElementById('exam-timer').checked ? Date.now() : null;
      document.getElementById('exam-setup').classList.add('hidden');
      document.getElementById('exam-results').classList.add('hidden');
      document.getElementById('exam-session').classList.remove('hidden');
      if (state.exam.startTime) {
        document.getElementById('exam-timer-display').classList.remove('hidden');
        state.exam.timerId = setInterval(updateExamTimer, 1000);
      }
      showExamQuestion();
    });
  }

  function updateExamTimer() {
    if (!state.exam.startTime) return;
    const sec = Math.floor((Date.now() - state.exam.startTime) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    document.getElementById('exam-timer-display').textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function showExamQuestion() {
    const q = state.exam.queue;
    const i = state.exam.index;
    if (i >= q.length) {
      endExam();
      return;
    }
    const problem = q[i];
    document.getElementById('exam-progress-text').textContent =
      (i + 1) + ' / ' + state.exam.queue.length + (problem.id ? '  ·  ID ' + problem.id + '  ·  ' + (problem.type_id || '') : '');
    document.getElementById('exam-question-text').textContent = problem.question;
    renderDiagram(document.getElementById('exam-diagram-container'), problem);
    renderOptions(document.getElementById('exam-options'), problem, null, false);
    document.getElementById('exam-question-card').classList.remove('hidden');
    document.getElementById('exam-feedback').classList.add('hidden');
  }

  function submitExamAnswer() {
    const container = document.getElementById('exam-options');
    const selected = getSelectedOption(container);
    if (selected == null) return;
    const i = state.exam.index;
    const problem = state.exam.queue[i];
    const correct = selected === problem.correct;
    state.exam.answers.push({ typeId: problem.type_id, correct });
    state.exam.correct += correct ? 1 : 0;
    document.getElementById('exam-feedback-result').innerHTML = correct
      ? '<p class="correct-msg">Correct.</p>'
      : '<p class="incorrect-msg">Incorrect. Correct: ' + (problem.correct || '') + '</p>';
    renderSolution(document.getElementById('exam-solution-box'), problem);
    document.getElementById('exam-question-card').classList.add('hidden');
    document.getElementById('exam-feedback').classList.remove('hidden');
  }

  function nextExamQuestion() {
    state.exam.index++;
    showExamQuestion();
  }

  function endExam() {
    if (state.exam.timerId) { clearInterval(state.exam.timerId); state.exam.timerId = null; }
    state.exam.startTime = null;
    document.getElementById('exam-timer-display').classList.add('hidden');
    document.getElementById('exam-timer-display').textContent = '';
    const missed = state.exam.answers.filter((a) => !a.correct).map((a) => a.typeId);
    document.getElementById('exam-score-text').textContent =
      'Score: ' + state.exam.correct + ' / ' + state.exam.queue.length + '. Missed types: ' + (missed.length ? missed.join(', ') : 'none.');
    const missedEl = document.getElementById('missed-types');
    missedEl.innerHTML = '';
    missed.forEach((typeId) => {
      const a = document.createElement('a');
      a.href = '#practice?type=' + encodeURIComponent(typeId);
      a.textContent = typeName(typeId) + ' (' + typeId + ')';
      missedEl.appendChild(a);
    });
    document.getElementById('exam-session').classList.add('hidden');
    document.getElementById('exam-results').classList.remove('hidden');
    document.getElementById('exam-review-set').onclick = () => {
      if (missed.length) {
        state.practice.queue = [];
        missed.forEach((id) => {
          (problemsByType[id] || []).forEach((p) => state.practice.queue.push(p));
        });
        state.practice.queue = shuffle(state.practice.queue).slice(0, Math.min(20, state.practice.queue.length));
        state.practice.index = 0;
        state.practice.correct = 0;
        window.location.hash = 'practice';
        route();
      }
    };
  }

  // —— Routing ——
  function route() {
    const hash = (window.location.hash || '#dashboard').slice(1).split('?')[0];

    // Update active nav link
    document.querySelectorAll('.nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.route === hash);
    });

    if (hash === 'dashboard') {
      showScreen('screen-dashboard');
      renderDashboard();
    } else if (hash === 'practice') {
      showScreen('screen-practice');
      showPracticeSetup();
    } else if (hash === 'exam') {
      // Kill any running timer before resetting
      if (state.exam.timerId) { clearInterval(state.exam.timerId); state.exam.timerId = null; }
      // Reset exam state fully
      state.exam.queue = [];
      state.exam.index = 0;
      state.exam.answers = [];
      state.exam.correct = 0;
      state.exam.startTime = null;
      // Clean up UI
      document.getElementById('exam-options').innerHTML = '';
      document.getElementById('exam-feedback').classList.add('hidden');
      document.getElementById('exam-question-card').classList.remove('hidden');
      document.getElementById('exam-timer-display').classList.add('hidden');
      document.getElementById('exam-timer-display').textContent = '';
      showScreen('screen-exam');
      document.getElementById('exam-setup').classList.remove('hidden');
      document.getElementById('exam-session').classList.add('hidden');
      document.getElementById('exam-results').classList.add('hidden');
    }
  }

  function init() {
    showLoading(true);
    loadInitialData()
      .then(() => {
        showLoading(false);
        route();
      })
      .catch((err) => {
        showLoading(false);
        document.getElementById('app').innerHTML = '<p style="color:red">Failed to load data. Run <code>python web/copy_data.py</code> and serve <code>web/public</code> from a local server.</p>';
        console.error(err);
      });
    window.addEventListener('hashchange', route);
    document.getElementById('start-practice').addEventListener('click', startPractice);
    document.getElementById('submit-answer').addEventListener('click', submitPracticeAnswer);
    document.getElementById('next-question').addEventListener('click', nextPracticeQuestion);
    document.getElementById('start-exam').addEventListener('click', startExam);
    document.getElementById('exam-submit').addEventListener('click', submitExamAnswer);
    document.getElementById('exam-next').addEventListener('click', nextExamQuestion);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
