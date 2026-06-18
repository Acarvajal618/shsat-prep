// ─────────────────────────────────────────────────────────────
//  Compact layout — opt-in via ?compact=1 (or auto-enabled by
//  ?scratchpad=1). Squishes the prep panel to the left and
//  leaves the right side clear for drawing/notes.
//
//  Font sizes are intentionally left at their defaults; only
//  the column width and margins change.
// ─────────────────────────────────────────────────────────────
(function () {
  const style = document.createElement('style');
  style.id = 'shsat-compact-style';
  style.textContent = `
    body.shsat-compact .hw-list,
    body.shsat-compact #hw-session,
    body.shsat-compact #hw-unlock {
      max-width: 42% !important;
      margin-left: 0.75rem !important;
      margin-right: auto !important;
    }
    body.shsat-compact main.main { padding-right: 0.5rem !important; }
    @media (max-width: 1100px) {
      body.shsat-compact .hw-list,
      body.shsat-compact #hw-session,
      body.shsat-compact #hw-unlock {
        max-width: 52% !important;
      }
    }
    @media (max-width: 900px) {
      body.shsat-compact .hw-list,
      body.shsat-compact #hw-session,
      body.shsat-compact #hw-unlock {
        max-width: 62% !important;
      }
    }
    @media (max-width: 700px) {
      body.shsat-compact .hw-list,
      body.shsat-compact #hw-session,
      body.shsat-compact #hw-unlock {
        max-width: 100% !important;
        margin-left: 0.5rem !important;
      }
    }
  `;
  document.head.appendChild(style);

  function activate() {
    document.body.classList.add('shsat-compact');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate);
  } else {
    activate();
  }
})();
