const $ = (s) => document.querySelector(s);
const msg = (t, err) => { $('#msg').textContent = t || ''; $('#msg').className = 'msg' + (err ? ' err' : ''); };
const BLOCK = /^(p|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|blockquote|hr|div|figure|pre)$/;

if (location.protocol === 'file:') {
  msg('This page was opened as a file. Run "npm start" in the project folder, then open http://localhost:3000 instead.', true);
}

/* ---------- tabs ---------- */
document.querySelectorAll('[data-in]').forEach((b) => b.onclick = () => {
  document.querySelectorAll('[data-in]').forEach((x) => x.setAttribute('aria-selected', x === b));
  ['file', 'paste', 'link'].forEach((k) => $('#in-' + k).classList.toggle('hide', k !== b.dataset.in));
  msg('');
});
document.querySelectorAll('[data-out]').forEach((b) => b.onclick = () => {
  document.querySelectorAll('[data-out]').forEach((x) => x.setAttribute('aria-selected', x === b));
  $('#out').classList.toggle('hide', b.dataset.out !== 'code');
  $('#preview').classList.toggle('hide', b.dataset.out !== 'preview');
});

/* ---------- output ---------- */
// Removes the revision-colour legend table that appears at the top of every page
function removeLegend(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('table').forEach((t) => {
    if (/revision\s*-\s*green\s*text/i.test(t.textContent)) t.remove();
  });
  return tpl.innerHTML;
}

function show(html) {
  const raw = prettyPrint(removeLegend(html));
  const pretty = raw.replace(/\[\[IMAGE\]\]/g, '<image>');
  $('#out').value = pretty;
  $('#preview').srcdoc = '<meta charset="utf-8"><body style="font:16px/1.6 Georgia,serif;max-width:680px;margin:20px auto;padding:0 16px;color:#222">' + raw.replace(/\[\[IMAGE\]\]/g, '&lt;image&gt;');
  $('#copy').disabled = !pretty;
  msg(pretty ? 'Done. Copy the HTML on the right.' : 'No content found.', !pretty);
}
$('#copy').onclick = async () => {
  await navigator.clipboard.writeText($('#out').value);
  $('#copy').textContent = 'Copied';
  setTimeout(() => $('#copy').textContent = 'Copy HTML', 1500);
};

/* ---------- upload ---------- */
const drop = $('#in-file');
drop.onclick = () => $('#file').click();
drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } };
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); upload(e.dataTransfer.files[0]); };
$('#file').onchange = (e) => upload(e.target.files[0]);

async function upload(file) {
  if (!file) return;
  if (!/\.docx$/i.test(file.name)) return msg('Please choose a .docx file. In Google Docs: File → Download → Microsoft Word.', true);
  msg('Converting ' + file.name + '…');
  api('/api/docx', file);
}

/* ---------- link ---------- */
$('#go').onclick = () => {
  msg('Downloading and converting…');
  api('/api/gdoc', JSON.stringify({ url: $('#url').value.trim() }));
};

async function api(path, body) {
  if (location.protocol === 'file:') return msg('Open http://localhost:3000 (after running "npm start") instead of the file.', true);
  try {
    const r = await fetch(path, { method: 'POST', body });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    show(j.html);
  } catch (e) { msg(e.message, true); }
}

/* ---------- paste from Google Docs ---------- */
$('#in-paste').addEventListener('paste', (e) => {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  if (!html) return msg('No formatted content on the clipboard. Copy directly from Google Docs.', true);
  show(cleanPasted(html));
});

function unwrap(el) { el.replaceWith(...el.childNodes); }
function wrap(el, tag) { const n = document.createElement(tag); n.append(...el.childNodes); el.replaceWith(n); }

function cleanPasted(html) {
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  root.querySelectorAll('style,script,meta,link').forEach((n) => n.remove());
  root.querySelectorAll('img').forEach((n) => n.replaceWith('[[IMAGE]]'));

  // inline styles -> semantic tags (deepest first)
  [...root.querySelectorAll('span,b,i,u,em,strong')].reverse().forEach((el) => {
    const bold = /^(bold|[6-9]00)$/.test(el.style.fontWeight) || el.localName === 'strong' || (el.localName === 'b' && el.style.fontWeight !== 'normal');
    const italic = el.style.fontStyle === 'italic' || el.localName === 'i' || el.localName === 'em';
    if (el.localName === 'u') return unwrap(el);
    const frag = document.createDocumentFragment();
    frag.append(...el.childNodes);
    let node = frag;
    if (italic) { const w = document.createElement('em'); w.append(node); node = w; }
    if (bold) { const w = document.createElement('strong'); w.append(node); node = w; }
    el.replaceWith(node);
  });

  // links: drop Google redirect wrapper
  root.querySelectorAll('a[href]').forEach((a) => {
    try { const u = new URL(a.href); if (u.hostname.endsWith('google.com') && u.pathname === '/url') a.setAttribute('href', u.searchParams.get('q') || a.href); } catch {}
  });

  // headings don't need bold; list items don't need paragraph wrappers
  root.querySelectorAll('h1 strong,h2 strong,h3 strong,h4 strong,h5 strong,h6 strong').forEach(unwrap);
  root.querySelectorAll('li > p').forEach(unwrap);
  root.querySelectorAll('div').forEach((d) => { if (!d.querySelector('p,h1,h2,h3,h4,h5,h6,ul,ol,table')) wrap(d, 'p'); else unwrap(d); });

  // strip attributes
  const keep = { a: ['href'], img: ['src', 'alt'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] };
  root.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((at) => { if (!(keep[el.localName] || []).includes(at.name)) el.removeAttribute(at.name); });
  });
  root.querySelectorAll('colgroup,col').forEach((n) => n.remove());

  // merge adjacent identical inline tags, drop empties
  for (let i = 0; i < 3; i++) {
    root.querySelectorAll('strong,em').forEach((el) => {
      const nx = el.nextSibling;
      if (nx && nx.nodeType === 1 && nx.localName === el.localName) { el.append(...nx.childNodes); nx.remove(); }
    });
  }
  root.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,strong,em,a,td,th').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img,br')) { if (/^(td|th)$/.test(el.localName)) el.innerHTML = ''; else el.remove(); }
  });
  return root.innerHTML;
}

/* ---------- formatting ---------- */
function prettyPrint(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.replace(/&nbsp;|\u00a0/g, ' ');
  const out = [];
  const isBlock = (n) => n.nodeType === 1 && BLOCK.test(n.localName);
  const hasBlock = (el) => [...el.children].some((c) => BLOCK.test(c.localName));
  (function walk(nodes, d) {
    const pad = '  '.repeat(d);
    nodes.forEach((n) => {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) { const s = document.createElement('i'); s.textContent = t; out.push(pad + s.innerHTML); } }
      else if (n.nodeType === 1) {
        if (isBlock(n) && hasBlock(n)) { out.push(`${pad}<${n.localName}>`); walk(n.childNodes, d + 1); out.push(`${pad}</${n.localName}>`); }
        else out.push(pad + n.outerHTML.replace(/\s{2,}/g, ' '));
      }
    });
  })(tpl.content.childNodes, 0);
  return out.join('\n');
}
