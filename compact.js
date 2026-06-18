// ─────────────────────────────────────────────────────────────
//  Compact layout — opt-in via ?compact=1 (or auto-enabled by
//  ?scratchpad=1). Left-aligns the prep panel and shrinks text.
//
//  Useful on iPad where the default centered + large text layout
//  leaves no room for drawing alongside the questions.
// ─────────────────────────────────────────────────────────────
(function () {
  const style = document.createElement('style');
  style.id = 'shsat-compact-style';
  style.textContent = `
    body.shsat-compact .hw-list,
    body.shsat-compact #hw-session,
    body.shsat-compact #hw-unlock {
      max-width: 58% !important;
      margin-left: 1.25rem !important;
      margin-right: auto !important;
    }
    body.shsat-compact h1 { font-size: 1.15rem !important; margin-bottom: 0.4rem !important; }
    body.shsat-compact .hw-title { font-size: 0.95rem !important; }
    body.shsat-compact .hw-date { font-size: 0.7rem !important; }
    body.shsat-compact .hw-meta { font-size: 0.72rem !important; }
    body.shsat-compact .hw-q-text { font-size: 0.85rem !important; line-height: 1.4 !important; }
    body.shsat-compact .hw-q-number { font-size: 0.65rem !important; }
    body.shsat-compact .hw-option { font-size: 0.82rem !important; padding: 0.45rem 0.7rem !important; }
    body.shsat-compact .hw-option-letter { font-size: 0.85rem !important; }
    body.shsat-compact .hw-submit { font-size: 0.82rem !important; padding: 0.45rem 0.95rem !important; }
    body.shsat-compact .hw-q-type-link { font-size: 0.72rem !important; }
    body.shsat-compact .hw-question-block { padding: 0.85rem 1rem !important; }
    body.shsat-compact .hw-solution { font-size: 0.78rem !important; }
    body.shsat-compact .hw-diagram { font-size: 0.78rem !important; padding: 0.6rem 0.85rem !important; }
    body.shsat-compact .hw-progress-label { font-size: 0.7rem !important; }
    body.shsat-compact .hw-summary h3 { font-size: 1.1rem !important; }
    body.shsat-compact .hw-summary .score { font-size: 2rem !important; }
    body.shsat-compact main.main { padding: 1rem 0.5rem !important; }
    @media (max-width: 900px) {
      body.shsat-compact .hw-list,
      body.shsat-compact #hw-session,
      body.shsat-compact #hw-unlock {
        max-width: 65% !important;
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
