// ─────────────────────────────────────────────────────────────
//  Password-gates the "Solution" and "Base Question" buttons on
//  worksheet-27.html (the non-exam-mode companion to the 10/29
//  half exam, worksheet-24.html) — same mechanism as the site-wide
//  solution-lock.js, but with its OWN password. That password is
//  deliberately not the site-wide one: it's only revealed on
//  worksheet-24.html's results page, once the exam-mode version has
//  actually been finished, so review access is earned by attempting
//  the real exam first rather than being available up front.
//  The unlock does NOT persist — resets on every page load.
// ─────────────────────────────────────────────────────────────
(function () {
  const PASSWORD = 'unlockhe5';
  let unlocked = false;

  function wrap(btn, mode) {
    if (!btn || typeof window.toggleExhibit !== 'function') return;
    btn.onclick = function () {
      if (unlocked) {
        window.toggleExhibit(mode);
        return;
      }
      const attempt = window.prompt('Enter the review password (shown on the 10/29 exam results page after finishing) to reveal this answer:');
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
