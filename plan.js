// Study Hub plan template: renders a plan page from window.PLAN (used by TIA, Python and the roadmap).
// Progress is stored in localStorage under PLAN.key as { tasks: {id: bool}, weekNotes: {sheetId: text} },
// the same format the earlier versions of these pages used, so saved progress carries over.
(function () {
  const PLAN = window.PLAN;
  const sheets = PLAN.sheets;
  const tracking = !PLAN.readOnly;
  const unit = PLAN.unit || 'Week';

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const pad2 = (n) => String(n).padStart(2, '0');
  const groupsOf = (sheet) => sheet.groups || [{ name: '', tasks: sheet.tasks || [] }];
  const tasksOf = (sheet) => groupsOf(sheet).reduce((all, g) => all.concat(g.tasks), []);

  // ---------- Page frame ----------

  const navLinks = [
    ['index.html', 'Home'],
    ['study_plan_v2_interactive_slides.html', 'V2'],
    ['tia_portal_8week_study_plan_slides.html', 'TIA'],
    ['python_automation_6week_study_plan_slides.html', 'Python']
  ];

  const toolbar = tracking ? `
      <div class="toolbar-progress" aria-live="polite">
        <span class="mono"><b id="doneCount">0</b>/<span id="totalCount">0</span></span>
        <div class="bar master-progress" role="progressbar" aria-label="Overall progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="bar-fill" id="masterProgressFill"></div>
        </div>
        <span class="mono" id="progressText">0%</span>
      </div>
      <div class="toolbar-tools">
        <input class="field" id="searchBox" type="search" placeholder="Search tasks…" aria-label="Search tasks" />
        <span class="search-status" id="searchStatus" aria-live="polite"></span>
        <button class="btn" type="button" id="incompleteButton" title="Show only tasks that are not done yet (click again to show all)">Open items</button>
        <button class="btn" type="button" id="allButton" title="Show all tasks">Show all</button>
        <button class="btn is-quiet" type="button" id="resetButton" title="Clear saved progress and notes">Reset</button>
      </div>` : `
      <div class="toolbar-progress"><span class="mono">Archived · read only</span></div>
      <div class="toolbar-tools">
        <input class="field" id="searchBox" type="search" placeholder="Search…" aria-label="Search" />
        <span class="search-status" id="searchStatus" aria-live="polite"></span>
      </div>`;

  document.body.classList.add('plan-page');
  document.querySelectorAll('body > noscript').forEach((el) => el.remove());
  // Add the page frame without replacing <body>, so nothing else on the page (styles, scripts) is lost.
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="plan-header" id="topbar">
      <nav class="site-nav" aria-label="Main">
        <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">SH</span><span class="brand-name">Study Hub</span></a>
        <div class="site-links">${navLinks.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</div>
        <button class="btn is-quiet lock-btn" type="button" data-lock title="Forget the password on this device">Lock</button>
      </nav>
      <div class="plan-toolbar">
        <span class="kicker plan-id">${esc(PLAN.sheetNo)} · ${esc(PLAN.name)}</span>
        ${toolbar}
      </div>
    </header>

    <main class="deck" id="deck">
      <div class="sheet deck-sheet" data-zones="10" data-zone-rows="6">
        <div class="slides" id="slides"></div>
      </div>
    </main>

    <footer class="title-strip plan-strip" id="strip">
      <div class="tb-cell tb-project"><span class="tb-k">Project</span><span class="tb-v">Study Hub</span></div>
      <div class="tb-cell tb-title"><span class="tb-k">Title</span><span class="tb-v" id="sheetTitle"></span></div>
      <div class="tb-cell"><span class="tb-k">Sheet</span><span class="tb-v" id="slideCounter"></span></div>
      <div class="tb-cell tb-rev"><span class="tb-k">Rev</span><span class="tb-v">${esc(PLAN.rev)}</span></div>
      <div class="tb-cell tb-date"><span class="tb-k">${esc(PLAN.dateLabel || 'Status')}</span><span class="tb-v">${esc(PLAN.dateValue || '')}</span></div>
      <nav class="tb-controls" aria-label="Sheet controls">
        <a class="btn" href="index.html" aria-label="Back to Study Hub home">⌂<span class="btn-label"> Home</span></a>
        <button class="btn" type="button" id="prevButton" aria-label="Previous sheet">◀<span class="btn-label"> Prev</span></button>
        <button class="btn" type="button" id="nextButton" aria-label="Next sheet"><span class="btn-label">Next </span>▶</button>
      </nav>
    </footer>`);

  // ---------- Overview sheet ----------

  // Group consecutive sheets that share a phase label, e.g. "Phase 1 — ... (weeks 1–2)".
  const phaseRows = [];
  if (unit === 'Week') {
    sheets.forEach((sheet) => {
      const last = phaseRows[phaseRows.length - 1];
      if (last && last.kicker === sheet.kicker) last.ids.push(sheet.id);
      else phaseRows.push({ kicker: sheet.kicker, ids: [sheet.id] });
    });
  }

  const ladder = sheets.map((sheet, i) => `
    <button class="rung" type="button" data-go-slide="${i + 1}" data-rung="${esc(sheet.id)}" aria-label="Open ${unit} ${esc(sheet.id)}: ${esc(sheet.title)}">
      <span class="rung-no">R${pad2(i + 1)}</span>
      <span class="rung-label"><strong>${unit} ${esc(sheet.id)} · ${esc(sheet.title)}</strong><span>${esc(sheet.dates || sheet.effort || '')}</span></span>
      <span class="rung-count">${tracking ? `0/${tasksOf(sheet).length}` : `${tasksOf(sheet).length} items`}</span>
      <span class="coil" aria-hidden="true"></span>
    </button>`).join('');

  const overview = `
    <section class="slide active" aria-label="Overview">
      <div class="shell">
        <div class="ov-head">
          <div>
            <span class="kicker">DWG ${esc(PLAN.sheetNo)} · Sheet 01 · Overview</span>
            <h1>${esc(PLAN.title)}</h1>
            <p class="lead">${esc(PLAN.lead)}</p>
          </div>
          ${tracking ? `
          <div class="meter">
            <div class="meter-row">
              <span class="meter-value" id="heroPercent">0%</span>
              <span class="meter-sub"><span id="heroDone">0</span> / <span id="heroTotal">0</span> tasks</span>
            </div>
            <div class="bar hero-progress" role="progressbar" aria-label="Overall completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <div class="bar-fill" id="heroProgressFill"></div>
            </div>
          </div>` : `
          <div class="meter">
            <div class="meter-row"><span class="meter-value">${sheets.length}</span><span class="meter-sub">phases · archived</span></div>
          </div>`}
        </div>

        <div class="ov-grid">
          <section>
            <div class="block-title">
              <h2>${unit} ladder</h2>
              <span class="kicker">${sheets.length} rungs</span>
            </div>
            <div class="ladder">${ladder}</div>
            <div class="start-row"><button class="btn is-primary" type="button" data-go-slide="1">Start ${unit} 1 →</button></div>
          </section>

          <section>
            ${phaseRows.length ? `
            <div class="block-title"><h2>Phases</h2></div>
            <table class="spec">${phaseRows.map((row) => `<tr><td>${esc(row.kicker.replace(/\s*\(weeks?[^)]*\)\s*$/i, ''))}</td><td>W${row.ids[0]}${row.ids.length > 1 ? '–' + row.ids[row.ids.length - 1] : ''}</td></tr>`).join('')}</table>` : ''}
            ${PLAN.loadRows ? `
            <div class="block-title" style="margin-top:22px"><h2>${esc(PLAN.loadTitle || 'Effort')}</h2></div>
            <table class="spec">${PLAN.loadRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
            ${PLAN.notes ? `
            <div class="block-title" style="margin-top:22px"><h2>General notes</h2></div>
            <ol class="gen-notes">${PLAN.notes.map((n) => `<li${n.due ? ' class="is-due"' : ''}><b>${esc(n.title)}</b>${esc(n.text)}</li>`).join('')}</ol>` : ''}
            <p class="how">${tracking ? 'Click a task to mark it done · click again to undo · one notes panel per ' + unit.toLowerCase() + ' · ← → to change sheet' : 'Read-only archive · ← → to change sheet'}</p>
          </section>
        </div>
      </div>
    </section>`;

  // ---------- Week / phase sheets ----------

  function renderTask(task) {
    const attrs = tracking
      ? `tabindex="0" role="button" aria-pressed="false" title="Click to mark done / not done"`
      : '';
    return `
      <article class="task-card${tracking ? '' : ' is-static'}" data-task-id="${esc(task.id)}" ${attrs}>
        <span class="task-tag-row">${task.tag ? `<span class="tag">${esc(task.tag.toUpperCase())}</span>` : ''}<span class="task-id">${esc(task.id.toUpperCase())}</span></span>
        <span class="task-title">${esc(task.title)}</span>
        ${task.desc ? `<span class="task-desc">${esc(task.desc)}</span>` : ''}
        ${task.prompt ? `
          <button type="button" class="prompt-toggle" aria-expanded="false">› AI prompt</button>
          <div class="prompt-wrap" hidden>
            <div class="prompt-box">${esc(task.prompt)}</div>
            <button type="button" class="btn prompt-copy">Copy prompt</button>
          </div>` : ''}
      </article>`;
  }

  function renderSheet(sheet, i) {
    const total = tasksOf(sheet).length;
    const groups = groupsOf(sheet).map((group, gi) => `
      <section class="track-group" data-track-id="${esc(sheet.id)}-${gi + 1}">
        ${group.name ? `
        <div class="track-header">
          <h3>${esc(group.name)}</h3>
          <span class="line" aria-hidden="true"></span>
          <span class="track-progress-text">${group.tasks.length}</span>
        </div>` : ''}
        <div class="topic-grid">${group.tasks.map(renderTask).join('')}</div>
      </section>`).join('');

    const outcomes = [];
    if (sheet.deliverable) outcomes.push(`<div class="outcome"><span class="kicker">${esc(sheet.deliverable.label || 'Deliverable')}</span>${esc(sheet.deliverable.text)}</div>`);
    if (sheet.milestone) outcomes.push(`<div class="outcome is-check"><span class="kicker">${esc(sheet.milestone.label || 'Target')}</span>${esc(sheet.milestone.text)}</div>`);

    const meta = [];
    if (sheet.dates) meta.push(`<div class="phase-meta-row"><span>Dates</span><b>${esc(sheet.dates)}</b></div>`);
    if (sheet.effort) meta.push(`<div class="phase-meta-row"><span>Effort</span><b>${esc(sheet.effort)}</b></div>`);
    if (tracking) {
      meta.push(`<div class="phase-meta-row"><span>Done</span><b class="sheet-count">0/${total}</b></div>`);
      meta.push(`<div class="bar phase-progress" role="progressbar" aria-label="${unit} ${esc(sheet.id)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="bar-fill"></div></div>`);
    }

    return `
      <section class="slide phase-slide" data-sheet="${esc(sheet.id)}" aria-label="${unit} ${esc(sheet.id)}: ${esc(sheet.title)}" aria-hidden="true">
        <div class="shell">
          <header class="phase-head">
            <div>
              <span class="kicker">Sheet ${pad2(i + 2)} · ${unit} ${esc(sheet.id)} of ${sheets.length}</span>
              <h2>${esc(sheet.title)}</h2>
              ${/^phase \d+$/i.test(sheet.kicker || '') ? '' : `<p class="phase-goal">${esc(sheet.kicker)}</p>`}
            </div>
            <div class="phase-meta">${meta.join('')}</div>
          </header>
          <div class="tracks">${groups}</div>
          <div class="filter-empty" hidden>Nothing on this sheet matches the current filter.</div>
          ${sheet.code ? `<pre class="code-block">${esc(sheet.code)}</pre>` : ''}
          ${sheet.tip ? `<div class="tip"><span class="kicker">Note</span>${esc(sheet.tip)}</div>` : ''}
          ${outcomes.length ? `<div class="outcomes-grid">${outcomes.join('')}</div>` : ''}
          ${PLAN.archivedNote ? `<p class="archived-banner">${esc(PLAN.archivedNote)}</p>` : ''}
          ${tracking ? `
          <div class="phase-notes">
            <button type="button" class="notes-toggle" aria-expanded="false">
              <span aria-hidden="true">✎</span> ${unit} ${esc(sheet.id)} notes <span class="notes-flag"></span>
            </button>
            <textarea class="notes-box" data-notes-for="${esc(sheet.id)}" hidden aria-label="Notes for ${unit} ${esc(sheet.id)}" placeholder="Notes for this ${unit.toLowerCase()}: what worked, questions, links..."></textarea>
          </div>` : ''}
        </div>
      </section>`;
  }

  document.getElementById('slides').innerHTML = overview + sheets.map(renderSheet).join('');

  const slides = Array.from(document.querySelectorAll('.slide'));
  const cards = Array.from(document.querySelectorAll('.task-card'));
  let current = 0;
  let showIncompleteOnly = false;

  // ---------- Saving and restoring ----------

  const isDone = (card) => card.classList.contains('completed');

  function setDone(card, done) {
    card.classList.toggle('completed', done);
    card.setAttribute('aria-pressed', String(done));
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAN.key) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function persist() {
    if (!tracking) return;
    const state = { tasks: {}, weekNotes: {} };
    cards.forEach((card) => { state.tasks[card.dataset.taskId] = isDone(card); });
    document.querySelectorAll('.notes-box').forEach((box) => { state.weekNotes[box.dataset.notesFor] = box.value; });
    try { localStorage.setItem(PLAN.key, JSON.stringify(state)); } catch (error) { /* storage blocked */ }
  }

  function updateNotesFlag(box) {
    box.closest('.phase-notes').querySelector('.notes-flag').textContent = box.value.trim() ? '· saved' : '';
  }

  function restore() {
    if (!tracking) return;
    const state = readState();
    const tasks = state.tasks || {};
    const notes = state.weekNotes && typeof state.weekNotes === 'object' ? state.weekNotes : {};
    // The first version saved a note per task: fold any of those into the sheet's note once.
    if (state.notes && typeof state.notes === 'object') {
      Object.entries(state.notes).forEach(([taskId, note]) => {
        if (typeof note !== 'string' || !note.trim()) return;
        const card = cards.find((c) => c.dataset.taskId === taskId);
        if (!card) return;
        const sheetId = card.closest('.phase-slide').dataset.sheet;
        const title = card.querySelector('.task-title').textContent;
        notes[sheetId] = (notes[sheetId] ? notes[sheetId] + '\n\n' : '') + title + ':\n' + note.trim();
      });
    }
    cards.forEach((card) => setDone(card, Boolean(tasks[card.dataset.taskId])));
    document.querySelectorAll('.notes-box').forEach((box) => {
      box.value = typeof notes[box.dataset.notesFor] === 'string' ? notes[box.dataset.notesFor] : '';
      updateNotesFlag(box);
    });
    if (state.notes) persist();
  }

  // ---------- Progress ----------

  function setBar(bar, percent) {
    if (!bar) return;
    bar.querySelector('.bar-fill').style.width = `${percent}%`;
    bar.setAttribute('aria-valuenow', String(percent));
    bar.classList.toggle('is-complete', percent >= 100);
  }

  function updateProgress() {
    if (!tracking) return;
    const done = cards.filter(isDone).length;
    const total = cards.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText('doneCount', String(done));
    setText('totalCount', String(total));
    setText('progressText', `${percent}%`);
    setText('heroPercent', `${percent}%`);
    setText('heroDone', String(done));
    setText('heroTotal', String(total));
    setBar(document.querySelector('.master-progress'), percent);
    setBar(document.querySelector('.hero-progress'), percent);

    document.querySelectorAll('.phase-slide').forEach((slide) => {
      const sheetCards = Array.from(slide.querySelectorAll('.task-card'));
      const sheetDone = sheetCards.filter(isDone).length;
      const sheetTotal = sheetCards.length;
      slide.querySelector('.sheet-count').textContent = `${sheetDone}/${sheetTotal}`;
      setBar(slide.querySelector('.phase-progress'), sheetTotal ? Math.round((sheetDone / sheetTotal) * 100) : 0);

      const rung = document.querySelector(`.rung[data-rung="${slide.dataset.sheet}"]`);
      if (rung) {
        rung.querySelector('.rung-count').textContent = `${sheetDone}/${sheetTotal}`;
        rung.classList.toggle('is-ok', sheetTotal > 0 && sheetDone === sheetTotal);
        rung.classList.toggle('is-run', sheetDone > 0 && sheetDone < sheetTotal);
      }
    });
  }

  // ---------- Search and filter ----------

  function applyFilters(autoNavigate) {
    const query = document.getElementById('searchBox').value.trim().toLowerCase();
    const filtering = Boolean(query) || showIncompleteOnly;
    let matches = 0;
    let firstMatch = -1;

    slides.forEach((slide, index) => {
      let slideMatches = 0;
      slide.querySelectorAll('.task-card').forEach((card) => {
        const visible = (!query || card.textContent.toLowerCase().includes(query)) && (!showIncompleteOnly || !isDone(card));
        card.hidden = !visible;
        if (visible) { slideMatches += 1; matches += 1; }
      });
      slide.querySelectorAll('.track-group').forEach((group) => {
        group.hidden = !group.querySelector('.task-card:not([hidden])');
      });
      const empty = slide.querySelector('.filter-empty');
      if (empty) empty.hidden = !filtering || slideMatches > 0;
      if (index > 0 && slideMatches > 0 && firstMatch < 0) firstMatch = index;
    });

    const status = document.getElementById('searchStatus');
    if (status) {
      status.textContent = query
        ? `${matches} match${matches === 1 ? '' : 'es'}`
        : showIncompleteOnly ? `${matches} open` : `${cards.length} ${tracking ? 'tasks' : 'items'}`;
    }
    const incompleteButton = document.getElementById('incompleteButton');
    if (incompleteButton) {
      incompleteButton.classList.toggle('is-active', showIncompleteOnly);
      incompleteButton.setAttribute('aria-pressed', String(showIncompleteOnly));
    }
    if (autoNavigate && firstMatch >= 0) {
      const activeHasMatches = slides[current].querySelector('.task-card:not([hidden])');
      if (current === 0 || !activeHasMatches) showSlide(firstMatch);
    }
  }

  // ---------- Sheet navigation ----------

  function showSlide(index) {
    current = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
    });
    slides[current].scrollTop = 0;
    document.getElementById('slideCounter').textContent = `${pad2(current + 1)} / ${pad2(slides.length)}`;
    document.getElementById('sheetTitle').textContent = current === 0
      ? `${PLAN.name} · Overview`
      : `${unit} ${sheets[current - 1].id} · ${sheets[current - 1].title}`;
  }

  // ---------- Events ----------

  function toggleTask(card) {
    setDone(card, !isDone(card));
    persist();
    updateProgress();
    applyFilters(false);
  }

  document.getElementById('prevButton').addEventListener('click', () => showSlide(current - 1));
  document.getElementById('nextButton').addEventListener('click', () => showSlide(current + 1));
  document.getElementById('searchBox').addEventListener('input', () => applyFilters(true));

  if (tracking) {
    document.getElementById('incompleteButton').addEventListener('click', () => {
      showIncompleteOnly = !showIncompleteOnly;
      applyFilters(showIncompleteOnly);
    });
    document.getElementById('allButton').addEventListener('click', () => {
      showIncompleteOnly = false;
      document.getElementById('searchBox').value = '';
      applyFilters(false);
    });
    document.getElementById('resetButton').addEventListener('click', () => {
      if (!window.confirm(`Reset all completed tasks and notes for ${PLAN.name}?`)) return;
      try { localStorage.removeItem(PLAN.key); } catch (error) { /* ignore */ }
      cards.forEach((card) => setDone(card, false));
      document.querySelectorAll('.notes-box').forEach((box) => { box.value = ''; updateNotesFlag(box); });
      showIncompleteOnly = false;
      document.getElementById('searchBox').value = '';
      updateProgress();
      applyFilters(false);
    });
  }

  document.addEventListener('click', (event) => {
    const notesToggle = event.target.closest('.notes-toggle');
    if (notesToggle) {
      const box = notesToggle.nextElementSibling;
      box.hidden = !box.hidden;
      notesToggle.setAttribute('aria-expanded', String(!box.hidden));
      if (!box.hidden) box.focus();
      return;
    }
    const promptToggle = event.target.closest('.prompt-toggle');
    if (promptToggle) {
      const wrap = promptToggle.nextElementSibling;
      wrap.hidden = !wrap.hidden;
      promptToggle.setAttribute('aria-expanded', String(!wrap.hidden));
      promptToggle.textContent = wrap.hidden ? '› AI prompt' : '⌄ AI prompt';
      return;
    }
    const copy = event.target.closest('.prompt-copy');
    if (copy) {
      const text = copy.previousElementSibling.textContent;
      navigator.clipboard.writeText(text).then(() => {
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy prompt'; }, 1400);
      }).catch(() => { copy.textContent = 'Select and copy manually'; });
      return;
    }
    const card = event.target.closest('.task-card');
    if (card) {
      // Selecting text to copy should not toggle the task.
      if (tracking && !String(window.getSelection())) toggleTask(card);
      return;
    }
    const go = event.target.closest('[data-go-slide]');
    if (go) showSlide(Number(go.dataset.goSlide));
  });

  document.addEventListener('keydown', (event) => {
    const card = event.target.closest && event.target.closest('.task-card');
    if (tracking && card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggleTask(card);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, button, select, a')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); showSlide(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showSlide(current - 1); }
  });

  document.addEventListener('input', (event) => {
    if (!event.target.matches('.notes-box')) return;
    updateNotesFlag(event.target);
    persist();
  });

  // Keep the deck between the fixed header and title strip whatever their height.
  function syncLayout() {
    const root = document.documentElement.style;
    root.setProperty('--topbar-h', `${Math.ceil(document.getElementById('topbar').getBoundingClientRect().height)}px`);
    root.setProperty('--strip-h', `${Math.ceil(document.getElementById('strip').getBoundingClientRect().height)}px`);
  }

  restore();
  updateProgress();
  applyFilters(false);
  showSlide(0);
  syncLayout();
  window.addEventListener('resize', syncLayout);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(syncLayout);
    observer.observe(document.getElementById('topbar'));
    observer.observe(document.getElementById('strip'));
  }
})();
