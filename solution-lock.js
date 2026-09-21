// ─────────────────────────────────────────────────────────────
//  Password-gates the "Solution" button on exam/practice pages.
//  Loaded with `defer`, so it always runs after the page's own
//  inline script has already wired tn-show-solution to
//  toggleExhibit (that assignment happens synchronously during
//  initial parsing, before this deferred script executes).
//  The unlock does NOT persist — it resets on every page load,
//  by design (a plain closure variable, no localStorage).
// ─────────────────────────────────────────────────────────────
(function () {
  const PASSWORD = 'camellia33';
  let unlocked = false;

  function gate() {
    const btn = document.getElementById('tn-show-solution');
    const original = window.toggleExhibit;
    if (!btn || typeof original !== 'function') return;

    btn.onclick = function () {
      if (unlocked) {
        original();
        return;
      }
      const attempt = window.prompt('Enter the solution password to reveal this answer:');
      if (attempt === null) return;
      if (attempt.trim().toLowerCase() === PASSWORD) {
        unlocked = true;
        original();
      } else {
        window.alert('Incorrect password.');
      }
    };
  }

  gate();
})();
