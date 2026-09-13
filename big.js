// ─────────────────────────────────────────────────────────────
//  Big-text layout — opt-in via ?big=1. For the TestNav-style
//  exam/worksheet pages (exam-*.html, worksheet-*.html): widens
//  the card to fill the page and scales up the question,
//  options, and solution text substantially.
// ─────────────────────────────────────────────────────────────
(function () {
  const style = document.createElement('style');
  style.id = 'shsat-big-style';
  style.textContent = `
    body.shsat-big .tn-main {
      max-width: 96% !important;
      margin: 16px auto !important;
      padding: 0 12px !important;
    }
    body.shsat-big .tn-card {
      padding: 40px 48px !important;
      min-height: 70vh !important;
    }
    body.shsat-big .tn-question {
      font-size: 30px !important;
      line-height: 1.5 !important;
    }
    body.shsat-big .tn-options {
      margin-top: 30px !important;
      gap: 14px !important;
    }
    body.shsat-big .tn-option {
      padding: 14px 16px !important;
    }
    body.shsat-big .tn-letter,
    body.shsat-big .tn-option-text {
      font-size: 26px !important;
    }
    body.shsat-big .tn-figure svg {
      max-width: 700px !important;
    }
    body.shsat-big .tn-exhibit-body {
      font-size: 22px !important;
      line-height: 1.6 !important;
    }
    body.shsat-big .tn-grid-label,
    body.shsat-big .tn-keypad-input {
      font-size: 22px !important;
    }
  `;
  document.head.appendChild(style);

  function activate() {
    document.body.classList.add('shsat-big');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate);
  } else {
    activate();
  }
})();
