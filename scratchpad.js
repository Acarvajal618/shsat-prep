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

  const STROKE_WIDTH = 2.5;
  const DEFAULT_COLOR = '#1a73e8';
  let strokes = [];
  let currentStroke = null;
  let drawing = false;
  let mode = 'scroll';      // 'scroll' | 'draw'
  let color = DEFAULT_COLOR;

  // ── Canvas (page-sized, behind toolbar) ──
  const canvas = document.createElement('canvas');
  canvas.id = 'scratchpad-canvas';
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
      ctx.lineWidth = s.width || STROKE_WIDTH;
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

  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    currentStroke = { color, width: STROKE_WIDTH, points: [pageCoord(e)] };
    strokes.push(currentStroke);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    currentStroke.points.push(pageCoord(e));
    redraw();
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

  // ── Toolbar (fixed floating UI) ──
  const toolbar = document.createElement('div');
  toolbar.id = 'scratchpad-toolbar';
  toolbar.innerHTML = `
    <button id="sp-mode" type="button" title="Toggle draw / scroll">✏️</button>
    <input type="color" id="sp-color" value="${DEFAULT_COLOR}" title="Stroke color">
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
    #sp-status {
      font-size: 13px; font-weight: 600;
      color: #555; min-width: 44px; text-align: left;
    }
    body.scratchpad-draw-mode #sp-status { color: #1a73e8; }
    body.scratchpad-draw-mode { overflow-x: hidden; }

    /* Prevent iPad/iOS from triggering text selection, copy popup, or the
       magnifier loupe when the Apple Pencil is dragging across content. */
    body.scratchpad-draw-mode,
    body.scratchpad-draw-mode * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    body.scratchpad-draw-mode {
      touch-action: none;
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
    canvas.style.pointerEvents = (mode === 'draw') ? 'auto' : 'none';
    canvas.style.touchAction = (mode === 'draw') ? 'none' : 'auto';
    canvas.style.cursor = (mode === 'draw') ? 'crosshair' : 'default';
    document.body.classList.toggle('scratchpad-draw-mode', mode === 'draw');
    const btn = document.getElementById('sp-mode');
    btn.classList.toggle('active', mode === 'draw');
    btn.textContent = (mode === 'draw') ? '🖊️' : '✏️';
    document.getElementById('sp-status').textContent = (mode === 'draw') ? 'Draw' : 'Scroll';
  }

  // ── Wire everything once DOM is ready ──
  function init() {
    document.body.appendChild(canvas);
    document.body.appendChild(toolbar);
    document.getElementById('sp-mode').addEventListener('click', () => {
      setMode(mode === 'draw' ? 'scroll' : 'draw');
    });
    document.getElementById('sp-color').addEventListener('input', (e) => {
      color = e.target.value;
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
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        strokes.pop();
        redraw();
      }
    });

    console.log('[scratchpad] active — toggle with toolbar or "d" key');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
