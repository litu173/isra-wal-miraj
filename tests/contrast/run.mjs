/*
 * Contrast audit, step 1 — capture.
 *
 *   node tests/contrast/run.mjs <outDir> [base=http://localhost:5173/] [langs=en,bn] [sizes=1440x900,390x844]
 *
 * Drives headless Chrome over the DevTools protocol. At each stop of the journey
 * it records every visible run of text (colour, effective opacity, size) and a
 * screenshot of the same view with all text hidden — the real pixels behind
 * the words. tests/contrast/analyze.py turns that into WCAG ratios.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [outDir, base = 'http://localhost:5173/', langArg = 'en', sizeArg = '1440x900'] = process.argv.slice(2);
const langs = langArg.split(','), sizes = sizeArg.split(',').map((s) => s.split('x').map(Number));
mkdirSync(outDir, { recursive: true });

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'contrast-'))}`,
  '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', '--mute-audio', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => (ws.onopen = r));
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
        return;
      }
    } catch (_) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}

// In-page helpers: the stops of the journey, and the text on screen
const PAGE_HELPERS = String.raw`
window.__stops = () => {
  const vh = innerHeight, out = [], top = (el) => el.getBoundingClientRect().top + scrollY;
  const intro = document.getElementById('earth');
  out.push({ name: 'earth', y: top(intro) + (intro.offsetHeight - vh) / 2 });
  for (const el of document.querySelectorAll('.level')) {
    const t = top(el), h = el.offsetHeight, L = h - vh, hell = el.classList.contains('level--hell');
    if (el.classList.contains('level--flow')) {
      for (let y = t - vh * 0.1, k = 0; y < t + h - vh * 0.3; y += vh * 0.75, k++) out.push({ name: el.id + '#' + k, y });
    } else {
      const ss = el.classList.contains('level--phased') ? [0.2, 0.5, 0.85] : el.classList.contains('level--abyss') ? [0.3] : [0.75];
      for (const s of ss) out.push({ name: el.id + '@' + s, y: hell ? t + s * L : t + (1 - s) * L });
    }
  }
  document.querySelectorAll('.passage').forEach((p, k) => out.push({ name: 'passage' + k, y: top(p) + p.offsetHeight / 2 - vh / 2 }));
  return out;
};
window.__go = async (y) => {
  dispatchEvent(new Event('touchstart'));
  scrollTo(0, y);
  await new Promise((r) => setTimeout(r, 1300)); // let scroll-driven reveals and transitions settle
};
window.__text = () => {
  const items = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  // text momentarily scrolling under the fixed brand, buttons or level list is covered, not shown
  const chrome = [...document.querySelectorAll('.brand, .controls, .altimeter__list button i')].map((e) => e.getBoundingClientRect());
  const covered = (r) => chrome.some((c) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top);
  for (let n; (n = w.nextNode());) {
    const text = n.textContent.trim();
    if (!text) continue;
    const el = n.parentElement;
    if (el.closest('svg, script, style, dialog, [hidden], .lang-menu')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let op = 1, zoom = 1;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); op *= +s.opacity; zoom *= +(s.zoom || 1); if (op < 0.05) break; }
    if (op < 0.9) continue; // mid-transition; judged when settled
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 3 && r.height > 3 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth)
      .filter((r) => el.closest('.brand, .controls, .altimeter') || !covered(r))
      .map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]);
    if (!rects.length) continue;
    let fg = [parse(cs.color)];
    if ((fg[0]?.[3] ?? 1) === 0 && /text/.test(cs.backgroundClip + cs.webkitBackgroundClip)) {
      fg = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse); // gradient-painted text: test each stop
    }
    fg = fg.filter(Boolean).map((c) => [c[0], c[1], c[2], c[3] * op]);
    if (!fg.length) continue;
    const section = el.closest('section, .passage')?.id || (el.closest('.passage') ? 'passage' : el.closest('.controls, .brand, .altimeter') ? 'chrome' : '?');
    items.push({ text: text.slice(0, 48), cls: String(el.className).slice(0, 40), tag: el.tagName, section,
      px: +(parseFloat(cs.fontSize) * zoom).toFixed(1), weight: +cs.fontWeight, fg, rects });
  }
  return items;
};
window.__hideText = (on) => {
  let st = document.getElementById('__hide');
  if (!on) { st?.remove(); return; }
  st = document.createElement('style'); st.id = '__hide';
  st.textContent = '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}' +
    ':is(.level__ar,.intro__title span,.hero-quote p){background:none!important;filter:none!important}';
  document.head.append(st);
};`;

await connect();
await send('Page.enable');
await send('Runtime.enable');
const report = [];
for (const [W, H] of sizes) {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
  for (const lang of langs) {
    await send('Page.navigate', { url: `${base}?lang=${lang}` });
    await sleep(3000);
    await evaluate('document.fonts.ready.then(() => 1)');
    await sleep(600);
    await evaluate(PAGE_HELPERS);
    const stops = await evaluate('__stops()');
    for (const [k, stop] of stops.entries()) {
      await evaluate(`__go(${stop.y})`);
      const items = await evaluate('__text()');
      await evaluate('__hideText(true)');
      await sleep(120);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await evaluate('__hideText(false)');
      const file = `${W}x${H}-${lang}-${String(k).padStart(2, '0')}.png`;
      writeFileSync(join(outDir, file), Buffer.from(shot.result.data, 'base64'));
      report.push({ size: `${W}x${H}`, lang, stop: stop.name, shot: file, items });
      process.stdout.write(`${W}x${H} ${lang} ${k + 1}/${stops.length} ${stop.name}\n`);
    }
  }
}
writeFileSync(join(outDir, 'capture.json'), JSON.stringify(report));
ws.close();
chrome.kill();
console.log('done', report.length, 'stops');
