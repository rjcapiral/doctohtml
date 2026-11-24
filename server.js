const http = require('http');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const PORT = process.env.PORT || 3000;
const MAX = 50 * 1024 * 1024;

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on('data', (d) => {
    size += d.length;
    if (size > MAX) { reject(new Error('File too large (50 MB max).')); req.destroy(); }
    else chunks.push(d);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

async function toHtml(buffer) {
  const { value } = await mammoth.convertToHtml({ buffer });
  return value.replace(/<img[^>]*>/g, '[[IMAGE]]');
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html')), 'text/html; charset=utf-8');
    }

    if (req.method === 'GET' && url.pathname === '/app.js') {
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'app.js')), 'text/javascript; charset=utf-8');
    }

    if (req.method === 'POST' && url.pathname === '/api/docx') {
      const buf = await readBody(req);
      return send(res, 200, { html: await toHtml(buf) });
    }

    if (req.method === 'POST' && url.pathname === '/api/gdoc') {
      const { url: link } = JSON.parse((await readBody(req)).toString());
      const m = /\/document\/d\/([\w-]+)/.exec(link || '');
      if (!m) return send(res, 400, { error: 'That does not look like a Google Docs link.' });
      const r = await fetch(`https://docs.google.com/document/d/${m[1]}/export?format=docx`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (!r.ok || buf.slice(0, 2).toString() !== 'PK') {
        return send(res, 403, { error: 'Could not download the doc. In Google Docs, set sharing to "Anyone with the link" (Viewer), or use the Paste tab instead.' });
      }
      return send(res, 200, { html: await toHtml(buf) });
    }

    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: e.message || 'Conversion failed.' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`doc2html running at http://localhost:${PORT}`));
