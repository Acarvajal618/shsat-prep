// ─────────────────────────────────────────────────────────────
//  Password-gates the "Solution" and "Base Question" buttons on
//  exam/practice pages. Loaded with `defer`, so it always runs
//  after the page's own inline script has already wired these
//  buttons to toggleExhibit (that assignment happens synchronously
//  during initial parsing, before this deferred script executes).
//  One password unlocks both buttons for the rest of the page load.
//  The unlock does NOT persist — it resets on every page load,
//  by design (a plain closure variable, no localStorage).
// ─────────────────────────────────────────────────────────────
(function () {
  const PASSWORD = 'camellia33';
  let unlocked = false;

  function wrap(btn, mode) {
    if (!btn || typeof window.toggleExhibit !== 'function') return;
    btn.onclick = function () {
      if (unlocked) {
        window.toggleExhibit(mode);
        return;
      }
      const attempt = window.prompt('Enter the solution password to reveal this answer:');
      if (attempt === null) return;
      if (attempt.trim().toLowerCase() === PASSWORD) {
        unlocked = true;
        window.toggleExhibit(mode);
      } else {
        window.alert('Incorrect password.');
      }
    };
  }

  function gate() {
    wrap(document.getElementById('tn-show-solution'), 'solution');
    wrap(document.getElementById('tn-show-base'), 'base');
  }

  gate();
})();
