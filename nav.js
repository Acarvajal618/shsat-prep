// ────────────────────────────────────────────────────────────
//  Shared navigation bar for SHSAT Prep
//  Injects a consistent header into every page.
//
//  Usage on a page:
//    <body>
//      <div id="nav-root"></div>
//      ...
//      <script src="nav.js"></script>
//
//  The current page is auto-detected from the URL; matching link is marked active.
// ────────────────────────────────────────────────────────────
(function () {
  // Single source of truth for nav items. Order = display order.
  // `match` is a list of pathname endings that should mark this item active.
  const ITEMS = [
    { label: 'Dashboard',   href: 'index.html#dashboard', match: ['/', 'index.html'] },
    { label: 'Practice',    href: 'index.html#practice',  match: [] },  // hash-only nav stays on index
    { label: 'Exam',        href: 'index.html#exam',      match: [] },
    { label: 'Prep',        href: 'prep.html',            match: ['prep.html', 'homework.html'] },
    { label: 'Trainers',    href: 'trainers.html',        match: ['trainers.html', 'trainer.html', 'percentage-trainer.html', 'ratio-trainer.html', 'word-equation-trainer.html', 'equation-cheatsheet.html'] },
    { label: 'My Progress', href: 'progress.html',        match: ['progress.html'] },
  ];

  // Inline styles so the nav looks right on pages that don't import styles.css.
  const CSS = `
    .shsat-header {
      background: #4c1d63;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      height: 52px;
      position: sticky;
      top: 0;
      z-index: 1000;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .shsat-logo {
      font-weight: 800;
      font-size: 1.05rem;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.01em;
      flex-shrink: 0;
    }
    .shsat-nav {
      display: flex;
      gap: 0.2rem;
      margin-left: auto;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      min-width: 0;
    }
    .shsat-nav::-webkit-scrollbar { display: none; }
    .shsat-nav a {
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.9rem;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .shsat-nav a:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .shsat-nav a.active {
      color: #fff;
      background: rgba(255,255,255,0.18);
      font-weight: 600;
    }
    @media (max-width: 700px) {
      .shsat-header { padding: 0 0.75rem; gap: 0.5rem; }
      .shsat-logo { font-size: 0.95rem; }
      .shsat-nav a { padding: 0.35rem 0.55rem; font-size: 0.8rem; }
    }
    @media (max-width: 480px) {
      .shsat-nav a { padding: 0.3rem 0.45rem; font-size: 0.75rem; }
    }
  `;

  function currentMatch() {
    const path = window.location.pathname.split('/').pop() || '/';
    for (const item of ITEMS) {
      for (const m of item.match) {
        if (m === path || (m === '/' && (path === '' || path === 'index.html'))) {
          return item.label;
        }
      }
    }
    return null;
  }

  function render() {
    const root = document.getElementById('nav-root');
    if (!root) return;

    // Inject styles once
    if (!document.getElementById('shsat-nav-style')) {
      const style = document.createElement('style');
      style.id = 'shsat-nav-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const active = currentMatch();
    const links = ITEMS.map(it => {
      const cls = it.label === active ? ' class="active"' : '';
      return `<a href="${it.href}"${cls}>${it.label}</a>`;
    }).join('');

    root.outerHTML =
      '<header class="shsat-header">' +
        '<a href="index.html" class="shsat-logo">SHSAT Prep</a>' +
        '<nav class="shsat-nav">' + links + '</nav>' +
      '</header>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // Optional opt-in features — both controlled by URL params.
  // Scratchpad mode also enables the compact layout automatically.
  const _q = window.location.search;
  const _scratchpad = _q.indexOf('scratchpad=1') !== -1;
  const _compact = _q.indexOf('compact=1') !== -1 || _scratchpad;
  if (_compact) {
    const c = document.createElement('script');
    c.src = 'compact.js?v=2';
    c.async = true;
    document.head.appendChild(c);
  }
  if (_scratchpad) {
    const s = document.createElement('script');
    s.src = 'scratchpad.js?v=7';
    s.async = true;
    document.head.appendChild(s);
  }
})();
