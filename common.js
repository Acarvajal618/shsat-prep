// ────────────────────────────────────────────────────────────
//  Shared helpers for SHSAT Prep — used by index/app.js, prep, sprint
//  Exposed under window.SHSAT
// ────────────────────────────────────────────────────────────
(function () {
  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  // Parse a markdown pipe table string into an HTMLTableElement.
  // Returns null if `md` doesn't look like a pipe table.
  function renderMarkdownTable(md) {
    if (!md) return null;
    const lines = String(md).trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    if (lines.length < 2) return null;
    const parse = line => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const headers = parse(lines[0]);
    const rows = lines.slice(2).map(parse); // skip separator row
    const table = document.createElement('table');
    table.className = 'diagram-table';
    const thead = table.createTHead();
    const hrow = thead.insertRow();
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    const tbody = table.createTBody();
    rows.forEach(cells => {
      const tr = tbody.insertRow();
      cells.forEach(c => { const td = tr.insertCell(); td.textContent = c; });
    });
    return table;
  }

  // Render a problem's figure into a container.
  //   - problem.diagram_path → <img src="images/${path}">   (cropped, safe for all variations)
  //   - problem.diagram      → markdown table or freeform text
  function renderDiagram(container, problem) {
    container.innerHTML = '';
    if (!problem) return;
    if (problem.diagram_path) {
      const img = document.createElement('img');
      img.src = 'images/' + problem.diagram_path;
      img.alt = 'figure for ' + (problem.id || problem.type_id || '');
      img.className = 'problem-figure';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '0.5rem 0';
      container.appendChild(img);
    }
    if (problem.diagram) {
      const table = renderMarkdownTable(problem.diagram);
      if (table) {
        container.appendChild(table);
      } else {
        const p = document.createElement('p');
        p.className = 'diagram-text';
        p.textContent = problem.diagram;
        container.appendChild(p);
      }
    }
  }

  // HTML-string version for prep.html (which uses innerHTML).
  function renderProblemFigureHtml(problem) {
    if (!problem) return '';
    let html = '';
    if (problem.diagram_path) {
      html += '<img class="problem-figure" src="images/' + escapeHtml(problem.diagram_path) +
              '" alt="figure for ' + escapeHtml(problem.id || '') +
              '" style="max-width:100%;height:auto;display:block;margin:0.5rem 0">';
    }
    if (problem.diagram) {
      const table = renderMarkdownTable(problem.diagram);
      if (table) html += table.outerHTML;
      else html += '<p class="diagram-text">' + escapeHtml(problem.diagram) + '</p>';
    }
    return html;
  }

  // Legacy alias (still used by prep.html for the diagram text-only path)
  function renderDiagramHtml(text) {
    if (!text) return '';
    const table = renderMarkdownTable(text);
    if (table) return table.outerHTML;
    return '<p class="diagram-text">' + escapeHtml(text) + '</p>';
  }

  window.SHSAT = Object.assign(window.SHSAT || {}, {
    escapeHtml,
    renderMarkdownTable,
    renderDiagram,
    renderDiagramHtml,
    renderProblemFigureHtml,
  });
})();
