/*
 * Layout audit — paste into the browser console (or load with a <script>) on
 * the running page, then call `await audit()` at any window size.
 * It walks every level and reports: horizontal scrolling, text off-screen or
 * clipped, text under the altimeter, pinned content taller than the screen,
 * pictures overlapping text in the stacked layout, cropped illustrations, and
 * whether the Earth screen is centred, and Arabic whose diacritics or
 * descenders would be cut off.
 */
window.audit = async () => {
  const W = innerWidth, H = innerHeight, issues = [];
  const doc = document.documentElement;
  const wait = (ms = 45) => new Promise((r) => setTimeout(r, ms));
  // synchronous: layout (incl. sticky) is up to date right after scrollTo
  const go = (y) => { dispatchEvent(new Event('touchstart')); scrollTo(0, y); };
  const R = (el) => el.getBoundingClientRect();
  const hit = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const dots = [...document.querySelectorAll('.altimeter button i')].map(R);
  const dotLeft = Math.min(...dots.map((d) => d.left));
  const altTop = Math.min(...dots.map((d) => d.top)), altBot = Math.max(...dots.map((d) => d.bottom));
  const textSel = 'p, h1, h2, h3, li, blockquote, figcaption, cite, button, .vessel, .counter';
  function checkText(scope, label) {
    for (const t of scope.querySelectorAll(textSel)) {
      if (!t.offsetWidth) continue;
      const r = R(t);
      if (r.right > W + 0.5 || r.left < -0.5) issues.push(`${label}: ${t.className || t.tagName} off-screen x ${Math.round(r.left)}–${Math.round(r.right)}`);
      if (t.scrollWidth > t.clientWidth + 2 && getComputedStyle(t).overflow !== 'visible') issues.push(`${label}: ${t.className || t.tagName} text clipped`);
      if (r.top < altBot && r.bottom > altTop && r.right > dotLeft - 3 && getComputedStyle(t).opacity > 0.05) issues.push(`${label}: ${t.className || t.tagName} under altimeter (${Math.round(r.right)} > ${Math.round(dotLeft)})`);
    }
  }
  // Arabic ink (tall diacritics, deep descenders) must never be cut off: by the
  // element itself when its text is painted with background-clip:text, or by a
  // clipping ancestor. Measured from the real glyph bounds of the rendered font.
  // The font's content area (where Amiri's diacritics can reach) per line
  function inkBox(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rs = [...range.getClientRects()].filter((x) => x.height > 0);
    if (!rs.length) return null;
    return { top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) };
  }
  function checkArabic(scope, label) {
    for (const el of scope.querySelectorAll('[lang="ar"]')) {
      if (!el.offsetWidth) continue;
      const r = R(el);
      if (r.bottom < 0 || r.top > H || !el.textContent.trim()) continue;
      const ink = inkBox(el);
      if (!ink) continue;
      const cs = getComputedStyle(el);
      const clipped = cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text';
      if (clipped && (ink.top < r.top - 2 || ink.bottom > r.bottom + 2)) {
        issues.push(`${label}: Arabic cut by its own box (${el.className || el.tagName}: ${Math.round(r.top - ink.top)}px top, ${Math.round(ink.bottom - r.bottom)}px bottom)`);
      }
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const o = getComputedStyle(a);
        if (o.overflow === 'visible' && o.overflowY === 'visible') continue;
        const ar = R(a);
        if (ink.top < ar.top - 1 || ink.bottom > ar.bottom + 1) issues.push(`${label}: Arabic cut by ${a.className || a.tagName}`);
        break;
      }
    }
  }
  if (doc.scrollWidth > W + 1) issues.push('horizontal scroll: ' + doc.scrollWidth + ' > ' + W);

  // Earth screen
  const intro = document.getElementById('earth');
  const ir = R(intro);
  await go(ir.top + scrollY + (ir.height - H) / 2);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let --u settle
  const ic = R(intro.querySelector('.intro__content'));
  const up = R(intro.querySelector('.intro__go--up')), dn = R(intro.querySelector('.intro__go--down'));
  if (ic.top < 0 || ic.bottom > H) issues.push(`earth: content outside screen ${Math.round(ic.top)}–${Math.round(ic.bottom)}`);
  if (hit(ic, up) || hit(ic, dn)) issues.push('earth: buttons overlap title');
  if (dn.bottom > H + 1 || up.top < 0) issues.push('earth: buttons off-screen');
  const midC = (ic.left + ic.right) / 2, mu = (up.left + up.right) / 2, md = (dn.left + dn.right) / 2;
  if (Math.abs(mu - W / 2) > 2 || Math.abs(md - W / 2) > 2 || Math.abs(midC - W / 2) > 2) issues.push(`earth: not centred (content ${Math.round(midC)}, up ${Math.round(mu)}, down ${Math.round(md)}, mid ${W / 2})`);
  const ctrl = R(document.querySelector('.controls'));
  if (hit(ctrl, up)) issues.push('earth: controls overlap up button');
  checkText(intro, 'earth');
  checkArabic(intro, 'earth');

  for (const el of document.querySelectorAll('.level')) {
    const id = el.id, flow = el.classList.contains('level--flow'), hell = el.classList.contains('level--hell');
    const top = R(el).top + scrollY, h = el.offsetHeight;
    const content = el.querySelector('.level__content'), scene = el.querySelector('.level__scene');
    if (!flow) {
      const L = h - H;
      await go(hell ? top + 0.75 * L : top + 0.25 * L);
      const c = R(content);
      if (c.top < -1 || c.bottom > H + 1) issues.push(`${id}: pinned content outside screen ${Math.round(c.top)}–${Math.round(c.bottom)}`);
      // the visible phase of Paradise
      checkText(el, id);
      checkArabic(el, id);
    } else {
      // walk through the stacked level a screen at a time
      for (let y = top - H * 0.2; y < top + h; y += H * 0.9) {
        await go(y);
        checkText(el, id);
        checkArabic(el, id);
      }
      if (!el.classList.contains('level--ambient') && hit(R(content), R(scene))) issues.push(`${id}: picture overlaps text`);
    }
    // picture must not be cropped where the level is a single illustration
    for (const svg of el.querySelectorAll('.gate, .tree')) {
      const sr = R(svg), pr = R(el.querySelector('.level__pin'));
      if (sr.left < pr.left - 1 || sr.right > pr.right + 1) issues.push(`${id}: illustration cropped horizontally`);
    }
  }
  for (const p of document.querySelectorAll('.passage')) {
    const top = R(p).top + scrollY;
    await go(top + p.offsetHeight / 2 - H / 2);
    checkText(p, 'passage');
  }
  return { W, H, flow: document.querySelectorAll('.level--flow').length, issues: [...new Set(issues)] };
};
window.runAudit = () => { window.auditResult = 'running'; window.audit().then((r) => (window.auditResult = r)); return 'started'; };
