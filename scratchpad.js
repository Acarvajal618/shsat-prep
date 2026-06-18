// ─────────────────────────────────────────────────────────────
//  Scratchpad overlay — opt-in via ?scratchpad=1 URL param
//
//  When activated, draws a transparent canvas across the entire
//  document (not viewport — anchored to page so strokes stay
//  with the text as you scroll). A floating toolbar lets you
//  toggle between scroll-mode (default) and draw-mode.
//
//  Designed for iPad + Apple Pencil one-take screen recordings.
//  No persistence — strokes vanish on page reload.
// ─────────────────────────────────────────────────────────────
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('scratchpad') !== '1') return;

  const DEFAULT_COLOR = '#1a73e8';
  const PEN_SIZES = [1.5, 2.5, 4, 6, 9];  // S, M (default), L, XL, XXL
  const ERASER_SIZES = [16, 22, 32, 48];  // S, M (default), L, XL
  const QUICK_COLORS = [
    { name: 'black',  hex: '#000000' },
    { name: 'red',    hex: '#d93025' },
    { name: 'green',  hex: '#137333' },
    { name: 'purple', hex: '#9b1cbf' },
    { name: 'orange', hex: '#f29900' },
    { name: 'blue',   hex: '#1a73e8' },
  ];
  let strokes = [];
  let currentStroke = null;
  let drawing = false;
  let mode = 'scroll';      // 'scroll' | 'draw' | 'erase'
  let color = DEFAULT_COLOR;
  let penSize = PEN_SIZES[1];
  let eraserRadius = ERASER_SIZES[1];

  // ── Canvas (page-sized, behind toolbar) ──
  const canvas = document.createElement('canvas');
  canvas.id = 'scratchpad-canvas';
  // role=application tells iOS "this is a custom widget; don't apply default
  // text-selection / Scribble behavior over it". Combined with the
  // touchstart preventDefault below, this stops Apple Pencil from firing the
  // system "double-tap to select word" gesture between strokes.
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'scratchpad drawing surface');
  Object.assign(canvas.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
    zIndex: '500',
    touchAction: 'auto',
  });

  function resize() {
    const doc = document.documentElement;
    const w = Math.max(doc.scrollWidth, doc.clientWidth);
    const h = Math.max(doc.scrollHeight, doc.clientHeight);
    if (canvas.width === w && canvas.height === h) return;
    // Preserve drawing by re-rendering after resize
    canvas.width = w;
    canvas.height = h;
    redraw();
  }

  function redraw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) {
      if (s.points.length < 1) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || penSize;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      // Single dot if only one point
      if (s.points.length === 1) {
        ctx.lineTo(s.points[0].x + 0.1, s.points[0].y + 0.1);
      }
      ctx.stroke();
    }
  }

  function pageCoord(e) {
    return { x: e.pageX, y: e.pageY };
  }

  function eraseAt(x, y) {
    const r2 = eraserRadius * eraserRadius;
    const before = strokes.length;
    strokes = strokes.filter((s) => {
      for (let i = 0; i < s.points.length; i++) {
        const dx = s.points[i].x - x;
        const dy = s.points[i].y - y;
        if (dx * dx + dy * dy < r2) return false;
      }
      return true;
    });
    if (strokes.length !== before) redraw();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'scroll') return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    if (mode === 'draw') {
      drawing = true;
      currentStroke = { color, width: penSize, points: [pageCoord(e)] };
      strokes.push(currentStroke);
      redraw();
    } else if (mode === 'erase') {
      drawing = true;
      const pt = pageCoord(e);
      eraseAt(pt.x, pt.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    if (mode === 'draw') {
      currentStroke.points.push(pageCoord(e));
      redraw();
    } else if (mode === 'erase') {
      const pt = pageCoord(e);
      eraseAt(pt.x, pt.y);
    }
  });
  function endStroke(e) {
    if (!drawing) return;
    drawing = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    currentStroke = null;
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('pointerleave', endStroke);

  // Block iPadOS's system-level Pencil gestures (double-tap-to-select,
  // Scribble handwriting recognition, gesture pinch) by aggressively
  // preventDefault-ing every native touch/gesture event on the canvas.
  // These run BEFORE pointer events and need passive:false to actually
  // cancel anything.
  const swallow = (e) => {
    if (mode === 'scroll') return;
    e.preventDefault();
  };
  canvas.addEventListener('touchstart', swallow, { passive: false });
  canvas.addEventListener('touchmove',  swallow, { passive: false });
  canvas.addEventListener('touchend',   swallow, { passive: false });
  canvas.addEventListener('gesturestart',  swallow, { passive: false });
  canvas.addEventListener('gesturechange', swallow, { passive: false });
  canvas.addEventListener('gestureend',    swallow, { passive: false });

  // ── Toolbar (fixed floating UI) ──
  const toolbar = document.createElement('div');
  toolbar.id = 'scratchpad-toolbar';
  const swatchesHtml = QUICK_COLORS.map(c =>
    `<button class="sp-swatch" type="button" data-color="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`
  ).join('');
  toolbar.innerHTML = `
    <button id="sp-mode" type="button" title="Draw mode">✏️</button>
    <button id="sp-erase" type="button" title="Eraser (removes whole strokes)">🩹</button>
    <div id="sp-swatches">${swatchesHtml}</div>
    <input type="color" id="sp-color" value="${DEFAULT_COLOR}" title="Custom color">
    <div id="sp-size-wrap" title="Pen / eraser size">
      <span id="sp-size-preview"></span>
      <input type="range" id="sp-size" min="0" max="${PEN_SIZES.length - 1}" step="1" value="1">
    </div>
    <button id="sp-undo" type="button" title="Undo last stroke">↶</button>
    <button id="sp-clear" type="button" title="Clear all">🗑️</button>
    <span id="sp-status">Scroll</span>
  `;
  const tbStyle = document.createElement('style');
  tbStyle.textContent = `
    #scratchpad-toolbar {
      position: fixed; bottom: 16px; right: 16px;
      background: rgba(255,255,255,0.96);
      border: 1px solid #d0d0d8; border-radius: 14px;
      padding: 8px 12px; display: flex; gap: 8px;
      align-items: center; box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      z-index: 9999; font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
    }
    #scratchpad-toolbar button {
      background: #f4f4f7; border: 1px solid #d0d0d8; border-radius: 8px;
      width: 38px; height: 38px; font-size: 18px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0;
    }
    #scratchpad-toolbar button:hover { background: #e8e8ef; }
    #scratchpad-toolbar button.active { background: #1a73e8; color: #fff; border-color: #1a73e8; }
    #scratchpad-toolbar input[type=color] {
      width: 38px; height: 38px; border: 1px solid #d0d0d8;
      border-radius: 8px; cursor: pointer; padding: 2px; background: #fff;
    }
    #sp-size-wrap {
      display: flex; align-items: center; gap: 6px;
      padding: 0 4px; border: 1px solid #d0d0d8; border-radius: 8px;
      height: 38px; background: #f4f4f7;
    }
    #sp-size-wrap input[type=range] {
      width: 70px; margin: 0;
    }
    #sp-size-preview {
      display: inline-block;
      background: currentColor;
      border-radius: 50%;
      flex-shrink: 0;
    }
    #sp-swatches {
      display: flex; gap: 4px;
      padding: 0 4px;
    }
    .sp-swatch {
      width: 26px; height: 26px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px #d0d0d8;
      cursor: pointer; padding: 0;
      transition: transform 0.1s;
    }
    .sp-swatch:hover { transform: scale(1.08); }
    .sp-swatch.active {
      box-shadow: 0 0 0 2px #333;
      transform: scale(1.12);
    }
    @media (max-width: 600px) {
      .sp-swatch { width: 22px; height: 22px; }
    }
    #sp-status {
      font-size: 13px; font-weight: 600;
      color: #555; min-width: 44px; text-align: left;
    }
    body.scratchpad-draw-mode #sp-status { color: #1a73e8; }
    body.scratchpad-draw-mode { overflow-x: hidden; }

    /* Whenever the scratchpad is loaded (even in scroll mode), suppress
       iOS text selection, the "Copy / Search / Ask AI" callout, the magnifier
       loupe, and Apple Pencil's Scribble "select with pen" gesture. */
    body.scratchpad-loaded,
    body.scratchpad-loaded * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent !important;
      -webkit-user-drag: none !important;
    }
    /* Block all gestures except vertical/horizontal scroll — this is the
       big one for iPadOS: it prevents Pencil-drag-to-select from firing. */
    body.scratchpad-loaded {
      touch-action: pan-x pan-y !important;
    }
    /* Keep form inputs (password box) usable */
    body.scratchpad-loaded input,
    body.scratchpad-loaded textarea {
      -webkit-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: default !important;
      touch-action: auto !important;
    }
    body.scratchpad-draw-mode {
      touch-action: none !important;
    }

    /* iPad's "double-tap with Pencil to select word" gesture works at a
       lower level than JS pointer events. The only reliable way to block
       it is to make text content non-tappable, so iOS never registers
       a pen-on-text event. Interactive elements stay tappable. */
    body.scratchpad-loaded .hw-q-text,
    body.scratchpad-loaded .hw-q-number,
    body.scratchpad-loaded .hw-q-type-link,
    body.scratchpad-loaded .hw-solution,
    body.scratchpad-loaded .hw-diagram,
    body.scratchpad-loaded .hw-title,
    body.scratchpad-loaded .hw-date,
    body.scratchpad-loaded .hw-meta,
    body.scratchpad-loaded .hw-progress-label,
    body.scratchpad-loaded .hw-locked-hint,
    body.scratchpad-loaded .hw-locked-badge,
    body.scratchpad-loaded .hw-sets-badge,
    body.scratchpad-loaded .hw-type-badge,
    body.scratchpad-loaded h1, body.scratchpad-loaded h2, body.scratchpad-loaded h3,
    body.scratchpad-loaded p, body.scratchpad-loaded li,
    body.scratchpad-loaded .session-header h2,
    body.scratchpad-loaded .hw-summary {
      pointer-events: none !important;
    }
    /* But keep interactive elements working */
    body.scratchpad-loaded .hw-option,
    body.scratchpad-loaded .hw-submit,
    body.scratchpad-loaded .btn-back,
    body.scratchpad-loaded .hw-card,
    body.scratchpad-loaded button,
    body.scratchpad-loaded .unlock-btn,
    body.scratchpad-loaded .unlock-input,
    body.scratchpad-loaded a {
      pointer-events: auto !important;
    }

    @media (max-width: 600px) {
      #scratchpad-toolbar { bottom: 10px; right: 10px; padding: 6px 8px; gap: 6px; }
      #scratchpad-toolbar button { width: 34px; height: 34px; font-size: 16px; }
      #scratchpad-toolbar input[type=color] { width: 34px; height: 34px; }
      #sp-status { font-size: 12px; min-width: 36px; }
    }
  `;
  document.head.appendChild(tbStyle);

  function setMode(next) {
    mode = next;
    const interactive = (mode !== 'scroll');
    canvas.style.pointerEvents = interactive ? 'auto' : 'none';
    canvas.style.touchAction = interactive ? 'none' : 'auto';
    canvas.style.cursor = mode === 'draw' ? 'crosshair' : (mode === 'erase' ? 'cell' : 'default');
    // body class disables text-selection/iOS callout while drawing or erasing
    document.body.classList.toggle('scratchpad-draw-mode', interactive);
    document.getElementById('sp-mode').classList.toggle('active', mode === 'draw');
    document.getElementById('sp-erase').classList.toggle('active', mode === 'erase');
    document.getElementById('sp-mode').textContent = (mode === 'draw') ? '🖊️' : '✏️';
    const label = mode === 'draw' ? 'Draw' : (mode === 'erase' ? 'Erase' : 'Scroll');
    document.getElementById('sp-status').textContent = label;
    syncSizeSlider();
  }

  function syncSizeSlider() {
    const slider = document.getElementById('sp-size');
    if (!slider) return;
    const sizes = (mode === 'erase') ? ERASER_SIZES : PEN_SIZES;
    slider.max = sizes.length - 1;
    if (mode === 'erase') {
      // Find the closest matching index for current eraserRadius
      let idx = ERASER_SIZES.indexOf(eraserRadius);
      if (idx < 0) idx = 1;
      slider.value = idx;
    } else {
      let idx = PEN_SIZES.indexOf(penSize);
      if (idx < 0) idx = 1;
      slider.value = idx;
    }
    updateSizePreview();
  }

  function setColor(hex) {
    color = hex.toLowerCase();
    document.getElementById('sp-color').value = color;
    document.querySelectorAll('.sp-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color.toLowerCase() === color);
    });
    updateSizePreview();
    // Switching color while erasing should switch back to drawing — the
    // user clearly wants to ink.
    if (mode === 'erase') setMode('draw');
  }

  function updateSizePreview() {
    const preview = document.getElementById('sp-size-preview');
    if (!preview) return;
    if (mode === 'erase') {
      // Cap visual at 18px so the toolbar stays compact
      const visual = Math.min(eraserRadius / 2, 18);
      preview.style.width = visual + 'px';
      preview.style.height = visual + 'px';
      preview.style.color = '#999';
    } else {
      const visual = Math.min(Math.max(penSize * 2, 4), 18);
      preview.style.width = visual + 'px';
      preview.style.height = visual + 'px';
      preview.style.color = color;
    }
  }

  // ── Wire everything once DOM is ready ──
  function init() {
    document.body.classList.add('scratchpad-loaded');
    document.body.appendChild(canvas);
    document.body.appendChild(toolbar);

    // Intercept the JS events that fire just before the iOS selection
    // menu appears. selectstart precedes a text selection; contextmenu
    // precedes the long-press / right-click menu. Both must be cancelled
    // outside of form inputs.
    const inForm = (e) => {
      const t = e.target;
      if (!t || !t.tagName) return false;
      return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    };
    document.addEventListener('selectstart', (e) => { if (!inForm(e)) e.preventDefault(); }, true);
    document.addEventListener('contextmenu',  (e) => { if (!inForm(e)) e.preventDefault(); }, true);
    // iPadOS Scribble fires a "touchstart" with touchType "stylus" when the
    // Pencil drags over text. We only want to suppress it on regular page
    // content — never on the toolbar or canvas, otherwise the user can't
    // toggle modes or draw.
    const inToolbarOrCanvas = (e) => {
      const t = e.target;
      if (!t || !t.closest) return false;
      return !!t.closest('#scratchpad-toolbar') || t.id === 'scratchpad-canvas';
    };
    document.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches[0]) return;
      if (e.touches[0].touchType !== 'stylus') return;
      if (inForm(e) || inToolbarOrCanvas(e)) return;
      e.preventDefault();
    }, { passive: false, capture: true });

    // Pencil pointerdown fires before touchstart/selectstart and is what
    // actually triggers iPadOS's "look up / Ask AI" popover when the pen
    // lands on text. Cancel pen pointerdown on regular page content;
    // toolbar/canvas/form inputs are exempted.
    const blockPenPointer = (e) => {
      if (e.pointerType !== 'pen') return;
      if (inForm(e) || inToolbarOrCanvas(e)) return;
      e.preventDefault();
      // Don't stopPropagation — answer-option onclick handlers still need
      // to receive synthetic click events that follow.
    };
    document.addEventListener('pointerdown', blockPenPointer, { capture: true });
    document.addEventListener('pointerup',   blockPenPointer, { capture: true });
    document.getElementById('sp-mode').addEventListener('click', () => {
      setMode(mode === 'draw' ? 'scroll' : 'draw');
    });
    document.getElementById('sp-erase').addEventListener('click', () => {
      setMode(mode === 'erase' ? 'scroll' : 'erase');
    });
    document.getElementById('sp-color').addEventListener('input', (e) => {
      setColor(e.target.value);
    });
    document.querySelectorAll('.sp-swatch').forEach(btn => {
      btn.addEventListener('click', () => setColor(btn.dataset.color));
    });
    document.getElementById('sp-size').addEventListener('input', (e) => {
      const idx = parseInt(e.target.value, 10);
      if (mode === 'erase') {
        eraserRadius = ERASER_SIZES[idx];
      } else {
        penSize = PEN_SIZES[idx];
      }
      updateSizePreview();
    });
    document.getElementById('sp-undo').addEventListener('click', () => {
      strokes.pop();
      redraw();
    });
    document.getElementById('sp-clear').addEventListener('click', () => {
      if (strokes.length === 0) return;
      if (confirm('Clear all drawings?')) {
        strokes = [];
        redraw();
      }
    });
    syncSizeSlider();
    setColor(DEFAULT_COLOR);  // marks the matching swatch active
    resize();

    // Resize watcher (content changes as prep questions load / images fetch)
    let resizeTimer;
    const reschedule = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    };
    window.addEventListener('resize', reschedule);
    new MutationObserver(reschedule).observe(document.body, { childList: true, subtree: true });
    // Hash changes (prep day navigation) trigger content swap
    window.addEventListener('hashchange', reschedule);

    // Keyboard shortcuts (handy when toolbar is small)
    document.addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'd' || e.key === 'D') setMode(mode === 'draw' ? 'scroll' : 'draw');
      if (e.key === 'e' || e.key === 'E') setMode(mode === 'erase' ? 'scroll' : 'erase');
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        strokes.pop();
        redraw();
      }
    });

    console.log('[scratchpad] active — d=draw, e=erase, ⌘Z=undo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
