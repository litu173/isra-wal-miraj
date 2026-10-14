/*
 * Al-Isra wal-Mi'raj — upward scroll engine.
 *
 *  - The document is rendered top = highest level, then the Earth, then the
 *    levels beneath it. The page opens on the Earth: scrolling UP ascends
 *    through the heavens, scrolling DOWN descends into the warning of the Fire.
 *  - Wheel input is smoothed with a frame-rate independent lerp; touch and
 *    scrollbar stay native.
 *  - Every level is a tall section with a sticky "pin". Its local progress is
 *    written to --s (0 = just arrived from below, 1 = about to leave above),
 *    and all reveals in styles.css are pure functions of --s. Beneath the
 *    Earth the direction is mirrored (0 = just arrived from above).
 */
window.I18N.ready.then(() => {
  'use strict';

  const ASCENT = window.JOURNEY;
  const DESCENT = window.DESCENT || [];
  const H = DESCENT.length; // number of levels beneath the Earth
  // One list, deepest first: DATA[0] = lowest depth … DATA[H] = Makkah … last = the Throne
  const DATA = [...DESCENT].reverse().map((d) => ({ ...d, hell: true })).concat(ASCENT);
  const SOURCES = window.SOURCES || [];
  const { ui, num } = window.I18N;
  localize(DATA);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CONFIG = {
    wheelEase: reduceMotion ? 1 : 0.085, // lower = silkier, higher = snappier
    wheelMultiplier: 1,
    keyStep: 140,
    starDensity: 1 / 5200, // stars per px²
    maxStars: 260,
    navTargetS: 0.7, // where a level lands when chosen in the altimeter
  };

  const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /** Swap English content for the chosen language (missing keys stay English). */
  function localize(list) {
    const t = window.I18N.t;
    for (const d of list) {
      const p = d.id;
      for (const k of ['short', 'kicker', 'title', 'place', 'gateNote', 'note']) if (d[k]) d[k] = t(`${p}.${k}`, d[k]);
      if (d.passage) d.passage = { ...d.passage, text: t(`${p}.passage`, d.passage.text) };
      if (d.meeting) d.meeting = { ...d.meeting, en: t(`${p}.meeting`, d.meeting.en), plural: d.meeting.en.includes('&') };
      if (d.greeting) d.greeting = { ...d.greeting, en: t(`${p}.greeting`, d.greeting.en) };
      if (d.quote) d.quote = { ...d.quote, en: t(`${p}.quote`, d.quote.en) };
      if (d.points) d.points = d.points.map((x, i) => ({ ...x, text: t(`${p}.points.${i}`, x.text) }));
      if (d.dialogue) d.dialogue = d.dialogue.map(([who, line], i) => [who, t(`${p}.dialogue.${i}`, line)]);
      if (d.ayah) d.ayah = { ...d.ayah, en: t(`${p}.ayah`, d.ayah.en) };
      if (d.ayah2) d.ayah2 = { ...d.ayah2, en: t(`${p}.ayah2`, d.ayah2.en) };
      if (d.rivers) d.rivers = d.rivers.map(([key, label, note], i) => [key, t(`${p}.rivers.${i}`, label), t(`${p}.rivers.${i}.note`, note)]);
    }
    SOURCES.forEach((x, i) => { x[1] = t(`sources.${i}`, x[1]); });
  }

  /* ------------------------------------------------------------------ */
  /*  Geometry helpers                                                   */
  /* ------------------------------------------------------------------ */

  function starPath(cx, cy, R, r, n = 8, rot = -Math.PI / 2) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = rot + (i * Math.PI) / n;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rad).toFixed(2) + ' ' + (cy + Math.sin(a) * rad).toFixed(2);
    }
    return d + 'Z';
  }

  function seeded(seed) {
    let s = seed % 2147483647;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function ellipsePath(cx, cy, rx, ry, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const x1 = cx + c * rx, y1 = cy + s * rx, x2 = cx - c * rx, y2 = cy - s * rx;
    const deg = (angle * 180) / Math.PI;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${rx} ${ry} ${deg.toFixed(1)} 1 0 ${x2.toFixed(1)} ${y2.toFixed(1)}A${rx} ${ry} ${deg.toFixed(1)} 1 0 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`;
  }

  /* ------------------------------------------------------------------ */
  /*  Scenes (symbolic only — no figures of any being)                   */
  /* ------------------------------------------------------------------ */

  const ARCH = 'M60 560V240C60 150 130 100 200 66C270 100 340 150 340 240V560Z';
  const ARCH_OUTER = 'M42 560V234C42 136 118 80 200 44C282 80 358 136 358 234V560';

  const SCENES = {
    gate(d, i) {
      const id = `g${i}`;
      const inner = d.inner === 'bayt' ? baytInner() : d.inner === 'fire' ? fireInner() : defaultInner(id);
      return `
      <svg class="gate" viewBox="0 -50 400 620" aria-hidden="true">
        <defs>
          <clipPath id="${id}-arch"><path d="${ARCH}"/></clipPath>
          <radialGradient id="${id}-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" style="stop-color:var(--accent)" stop-opacity=".55"/>
            <stop offset="1" style="stop-color:var(--accent)" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="${id}-in" cx="50%" cy="58%" r="62%">
            <stop offset="0" stop-color="#fff" stop-opacity="1"/>
            <stop offset=".3" style="stop-color:var(--accent)" stop-opacity=".85"/>
            <stop offset="1" style="stop-color:var(--accent)" stop-opacity=".05"/>
          </radialGradient>
          <linearGradient id="${id}-door" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${d.hell ? '#2a0d08' : '#141a33'}"/>
            <stop offset="1" stop-color="${d.hell ? '#0c0403' : '#070915'}"/>
          </linearGradient>
          <pattern id="${id}-lat" width="35" height="35" patternUnits="userSpaceOnUse">
            <path d="${starPath(17.5, 17.5, 13, 6.5)}" fill="none" style="stroke:var(--accent)" stroke-opacity=".38" stroke-width=".8"/>
            <path d="M0 0L7 7M35 0L28 7M0 35L7 28M35 35L28 28" style="stroke:var(--accent)" stroke-opacity=".25" stroke-width=".7"/>
          </pattern>
        </defs>
        <circle class="gate__halo" cx="200" cy="310" r="300" fill="url(#${id}-halo)"/>
        <g clip-path="url(#${id}-arch)">
          <rect x="40" y="40" width="320" height="540" fill="url(#${id}-in)" class="gate__light"/>
          ${inner}
          <g class="door door--l">
            <rect x="60" y="40" width="140" height="520" fill="url(#${id}-door)"/>
            <rect x="60" y="40" width="140" height="520" fill="url(#${id}-lat)"/>
            <path d="M196 40V560" style="stroke:var(--accent)" stroke-opacity=".7"/>
          </g>
          <g class="door door--r">
            <rect x="200" y="40" width="140" height="520" fill="url(#${id}-door)"/>
            <rect x="200" y="40" width="140" height="520" fill="url(#${id}-lat)"/>
            <path d="M204 40V560" style="stroke:var(--accent)" stroke-opacity=".7"/>
          </g>
        </g>
        <path d="${ARCH}" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
        <path d="${ARCH_OUTER}" fill="none" style="stroke:var(--accent)" stroke-opacity=".45" stroke-width="1"/>
        <path d="M30 560H370" style="stroke:var(--accent)" stroke-opacity=".5"/>
        <g class="rosette">
          <path class="rosette__spin" d="${starPath(200, -6, 40, 22, 8)}" fill="none" style="stroke:var(--accent)" stroke-width="1.4"/>
          <path class="rosette__spin rosette__spin--rev" d="${starPath(200, -6, 30, 18, 8, -Math.PI / 2 + Math.PI / 8)}" fill="none" style="stroke:var(--accent)" stroke-opacity=".6"/>
          <circle cx="200" cy="-6" r="17" fill="#070915" style="stroke:var(--accent)"/>
          <text x="200" y="3" text-anchor="middle" class="rosette__num">${ARABIC_DIGITS[d.n] || ''}</text>
        </g>
      </svg>`;
    },

    makkah() {
      return `
      <svg class="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="mk-ground" cx="50%" cy="100%" r="60%">
            <stop offset="0" stop-color="#e3b867" stop-opacity=".35"/>
            <stop offset="1" stop-color="#e3b867" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="mk-arc" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stop-color="#fff6dc"/>
            <stop offset="1" stop-color="#e3b867" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect x="0" y="420" width="1200" height="380" fill="url(#mk-ground)"/>
        <path class="isra-arc" pathLength="1" d="M600 572C520 470 300 430 -40 300" fill="none" stroke="url(#mk-arc)" stroke-width="3" stroke-linecap="round"/>
        <path d="M0 640L90 590L170 612L260 548L330 584L410 520L500 596L560 572L640 600L720 540L800 590L880 530L980 600L1060 560L1200 610V800H0Z" fill="#110f1f"/>
        <path d="M0 690L120 650L240 672L360 640L470 668L560 650L660 666L760 640L880 668L1000 646L1120 670L1200 656V800H0Z" fill="#0a0913"/>
        <ellipse cx="610" cy="672" rx="230" ry="26" fill="#e3b867" opacity=".08"/>
        <g class="kaaba">
          <path d="M556 580H640V668H556Z" fill="#050508"/>
          <path d="M640 580L688 562V650L640 668Z" fill="#0d0d12"/>
          <path d="M556 580L604 562H688L640 580Z" fill="#1b1b22"/>
          <path d="M556 598H640L688 580" fill="none" stroke="#e3b867" stroke-width="5"/>
          <path d="M556 606H640L688 588" fill="none" stroke="#e3b867" stroke-width="1" opacity=".6"/>
          <path d="M652 612L668 606V636L652 642Z" fill="none" stroke="#e3b867" stroke-width="1.5"/>
        </g>
      </svg>`;
    },

    aqsa() {
      return `
      <svg class="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="aq-dome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffe7a8"/>
            <stop offset="1" stop-color="#b8892e"/>
          </linearGradient>
          <linearGradient id="aq-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/>
            <stop offset="1" stop-color="#e8c47a" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="aq-arc" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stop-color="#e8c47a" stop-opacity="0"/>
            <stop offset="1" stop-color="#fff6dc"/>
          </linearGradient>
        </defs>
        <rect class="miraj-beam" x="588" y="-40" width="24" height="560" fill="url(#aq-beam)"/>
        <path class="isra-arc isra-arc--in" pathLength="1" d="M1240 560C980 560 760 500 612 470" fill="none" stroke="url(#aq-arc)" stroke-width="3" stroke-linecap="round"/>
        <path d="M0 660L110 620L230 640L330 600L450 628L560 610L700 624L820 596L940 630L1060 606L1200 640V800H0Z" fill="#12112a"/>
        <g class="dome">
          <path d="M520 548C520 470 680 470 680 548Z" fill="url(#aq-dome)"/>
          <path d="M600 472V446" stroke="#ffe7a8" stroke-width="2.5"/>
          <circle cx="600" cy="444" r="3" fill="#ffe7a8"/>
          <rect x="530" y="548" width="140" height="18" fill="#2c2a55"/>
          <rect x="500" y="566" width="200" height="74" fill="#1f1d42"/>
          <path d="M516 640V600C516 588 532 588 532 600V640M552 640V600C552 588 568 588 568 600V640M592 640V600C592 588 608 588 608 600V640M632 640V600C632 588 648 588 648 600V640M668 640V600C668 588 684 588 684 600V640" fill="none" stroke="#e8c47a" stroke-opacity=".55" stroke-width="1.5"/>
        </g>
        <g opacity=".9">
          <rect x="760" y="600" width="230" height="46" fill="#18163a"/>
          <path d="M820 600C820 572 860 572 860 600Z" fill="#2b2958"/>
        </g>
        <path d="M0 700L140 676L300 690L460 670L620 688L780 668L940 690L1100 672L1200 684V800H0Z" fill="#0a0918"/>
      </svg>`;
    },

    sidrah() {
      const { byDepth, leaves, fruits } = growTree(11, { leaves: true });
      const widths = [26, 15, 9, 5.5, 3.5, 2.2];
      const branches = byDepth
        .map((paths, dpt) => `<path d="${paths.join('')}" stroke-width="${widths[dpt]}" />`)
        .join('');

      return `
      <div class="aura" aria-hidden="true"><span></span><span></span><span></span></div>
      <svg class="tree" viewBox="-70 40 950 880" aria-hidden="true">
        <defs>
          <linearGradient id="sd-bark" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#8a6526"/>
            <stop offset="1" stop-color="#ffe2a0"/>
          </linearGradient>
          <radialGradient id="sd-leaf" cx="50%" cy="40%" r="60%">
            <stop offset="0" stop-color="#fff3c8" stop-opacity=".95"/>
            <stop offset="1" stop-color="#e2b45a" stop-opacity=".55"/>
          </radialGradient>
          <linearGradient id="sd-hidden" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/>
            <stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g class="rivers" fill="none" stroke-linecap="round">
          <path class="river river--hidden" d="M392 760C330 700 250 650 200 540" stroke="url(#sd-hidden)" stroke-width="4"/>
          <path class="river river--hidden" d="M408 760C470 700 550 650 600 540" stroke="url(#sd-hidden)" stroke-width="4"/>
          <path class="river" d="M392 764C330 800 220 812 90 900" stroke="#bfe6ff" stroke-width="4"/>
          <path class="river" d="M408 764C470 800 580 812 710 900" stroke="#bfe6ff" stroke-width="4"/>
        </g>
        <g class="river-labels">
          <text x="150" y="832" text-anchor="middle">النيل · ${esc(ui('nile'))}</text>
          <text x="650" y="832" text-anchor="middle">الفرات · ${esc(ui('euphrates'))}</text>
          <text x="190" y="520" text-anchor="middle" class="hidden-label">${esc(ui('paradiseRivers'))}</text>
        </g>
        <g class="tree__body">
          <g class="tree__branches" fill="none" stroke="url(#sd-bark)" stroke-linecap="round">${branches}</g>
          <path class="tree__leaves" d="${leaves}" fill="url(#sd-leaf)"/>
          <path class="tree__fruits" d="${fruits}" fill="#fff0c4"/>
        </g>
        <path d="M250 764H550" stroke="#ffe2a0" stroke-opacity=".35"/>
      </svg>`;
    },

    jannah() {
      // What no eye has seen — a painterly, symbolic garden of light: no sun (76:13),
      // lofty rooms like stars (Bukhari 3256), four rivers (47:15), domes of pearl.
      // The painting is rendered once into an image (see jannahPainting); only light
      // effects animate on top, so scrolling stays smooth.
      const R = seeded(77);
      let rooms = '', motes = '';
      for (let k = 0; k < 28; k++) {
        const x = 180 + R() * 840, y = 40 + R() * 230, r = 5 + R() * 7;
        rooms += `<g class="jn-room" style="--k:${k}"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="url(#jo-glow)"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="1.4" fill="#fffdf2"/></g>`;
      }
      for (let k = 0; k < 44; k++) {
        motes += `<circle style="--k:${k}" cx="${(100 + R() * 1000).toFixed(0)}" cy="${(380 + R() * 420).toFixed(0)}" r="${(3 + R() * 6).toFixed(1)}" fill="url(#jo-mote)"/>`;
      }
      const shimmer = JN_RIVERS.map(([, xb, wb, ph]) => `<path d="${riverGeom(xb, wb, ph).center}"/>`).join('');
      const arch = 'M150 800V320C150 160 380 52 600 18C820 52 1050 160 1050 320V800';
      return `
      <div class="jn-stage">
        <img class="jn-base" src="${jannahPainting()}" alt="" decoding="async">
        <svg class="jn-overlay" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            <radialGradient id="jo-glow"><stop offset="0" stop-color="#fff8dc" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe6a8" stop-opacity=".4"/><stop offset="1" stop-color="#ffe6a8" stop-opacity="0"/></radialGradient>
            <radialGradient id="jo-mote"><stop offset="0" stop-color="#fffbe6" stop-opacity="1"/><stop offset=".3" stop-color="#ffe3a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffe3a0" stop-opacity="0"/></radialGradient>
            <radialGradient id="jo-bloom" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff" stop-opacity=".85"/><stop offset=".4" stop-color="#fff2d0" stop-opacity=".35"/><stop offset="1" stop-color="#fff2d0" stop-opacity="0"/></radialGradient>
            <linearGradient id="jo-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#fff4cf"/><stop offset=".22" stop-color="#e2b75a"/><stop offset=".5" stop-color="#a8741f"/>
              <stop offset=".72" stop-color="#e9c46e"/><stop offset="1" stop-color="#6b4410"/>
            </linearGradient>
            <pattern id="jo-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="${starPath(28, 28, 22, 11)}" fill="none" stroke="#fff1c2" stroke-opacity=".55" stroke-width="1.2" transform="translate(-.8 -.8)"/>
              <path d="${starPath(28, 28, 22, 11)}" fill="none" stroke="#4a2c06" stroke-opacity=".55" stroke-width="1.2" transform="translate(.8 .8)"/>
              <path d="M0 0L12 12M56 0L44 12M0 56L12 44M56 56L44 44" stroke="#4a2c06" stroke-opacity=".4"/>
              <circle cx="28" cy="28" r="3" fill="#fff1c2" fill-opacity=".5"/>
            </pattern>
          </defs>
          <ellipse class="jn-bloom" cx="600" cy="476" rx="420" ry="120" fill="url(#jo-bloom)"/>
          <g class="jn-rooms">${rooms}</g>
          <g class="jn-shimmer" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1 34">${shimmer}</g>
          <g class="jn-motes">${motes}</g>
          <g class="jn-frame">
            <path fill-rule="evenodd" d="M-200 -200H1400V1000H-200Z ${arch}Z" fill="url(#jo-gold)"/>
            <path fill-rule="evenodd" d="M-200 -200H1400V1000H-200Z ${arch}Z" fill="url(#jo-lattice)"/>
            <path d="${arch}" fill="none" stroke="#fff6d8" stroke-opacity=".28" stroke-width="22"/>
            <path d="${arch}" fill="none" stroke="#fff6d8" stroke-width="2.5"/>
            <path d="M132 800V318C132 150 372 38 600 4C828 38 1068 150 1068 318V800" fill="none" stroke="#5a3a0c" stroke-opacity=".7" stroke-width="2"/>
            <path d="M118 800V314C118 142 364 26 600 -10C836 26 1082 142 1082 314V800" fill="none" stroke="#fff1c2" stroke-opacity=".7" stroke-width="1.5"/>
          </g>
        </svg>
      </div>`;
    },

    pens() {
      const R = seeded(5);
      let strokes = '';
      for (let k = 0; k < 18; k++) {
        // keep the "writing" to the margins of the page so it never crosses the text
        const band = k % 3;
        const x = band === 2 ? 60 + R() * 1080 : band === 0 ? 20 + R() * 180 : 1000 + R() * 160;
        const y = band === 2 ? 640 + R() * 130 : 80 + R() * 600;
        const w = band === 2 ? 140 + R() * 220 : 60 + R() * 120, h = (R() - 0.5) * 70;
        strokes += `<path pathLength="1" style="--k:${k}" d="M${x.toFixed(0)} ${y.toFixed(0)}c${(w * 0.3).toFixed(0)} ${(-h).toFixed(0)} ${(w * 0.6).toFixed(0)} ${h.toFixed(0)} ${w.toFixed(0)} ${(h * 0.3).toFixed(0)}"/>`;
      }
      return `
      <svg class="scene-svg pens-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="pn-l" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#fff6dc" stop-opacity=".6"/>
            <stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="600" cy="400" rx="560" ry="360" fill="url(#pn-l)"/>
        <g class="pen-strokes" fill="none" stroke="#fff1c9" stroke-width="1.6" stroke-linecap="round">${strokes}</g>
      </svg>`;
    },

    flames() {
      const R = seeded(23);
      const row = (base, hMin, hMax, w, n, cls) => {
        let d = '';
        for (let k = 0; k < n; k++) {
          const x = (k + 0.5) * (1300 / n) - 50 + (R() - 0.5) * 30;
          d += flamePath(x, base, w * (0.7 + R() * 0.6), hMin + R() * (hMax - hMin));
        }
        return `<g class="flame-row ${cls}"><path d="${d}"/></g>`;
      };
      return `
      <svg class="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="fl-glow" cx="50%" cy="100%" r="75%">
            <stop offset="0" stop-color="#ff7a2a" stop-opacity=".75"/>
            <stop offset=".5" stop-color="#9a1e06" stop-opacity=".3"/>
            <stop offset="1" stop-color="#4a0a02" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="fl-dark" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#050101"/><stop offset=".6" stop-color="#1c0402"/><stop offset="1" stop-color="#3a0a04" stop-opacity=".35"/></linearGradient>
          <linearGradient id="fl-a" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3a0803"/><stop offset="1" stop-color="#8a1e08" stop-opacity=".25"/></linearGradient>
          <linearGradient id="fl-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d0451b"/><stop offset="1" stop-color="#ff7a2a" stop-opacity=".15"/></linearGradient>
          <linearGradient id="fl-c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9a3a" stop-opacity=".1"/></linearGradient>
        </defs>
        <rect x="0" y="200" width="1200" height="600" fill="url(#fl-glow)"/>
        <g class="flames">
          ${row(820, 360, 520, 90, 11, 'flame-row--dark')}
          ${row(820, 260, 420, 70, 14, 'flame-row--a')}
          ${row(820, 180, 320, 52, 18, 'flame-row--b')}
          ${row(820, 90, 200, 34, 24, 'flame-row--c')}
        </g>
      </svg>`;
    },

    abyss() {
      let rings = '';
      for (let k = 0; k < 16; k++) {
        const t = k / 15, rx = 760 * Math.pow(1 - t, 1.6) + 14, cy = 470 + t * 120;
        rings += `<ellipse cx="600" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.3).toFixed(1)}" fill="none" stroke="#ff6a3a" stroke-opacity="${(0.08 + t * 0.4).toFixed(2)}" stroke-width="${(2.4 - t * 1.6).toFixed(2)}"/>`;
      }
      return `
      <svg class="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="ab-core" cx="50%" cy="74%" r="45%">
            <stop offset="0" stop-color="#ff5a1f" stop-opacity=".85"/>
            <stop offset=".25" stop-color="#7a1606" stop-opacity=".5"/>
            <stop offset="1" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect class="abyss-core" width="1200" height="800" fill="url(#ab-core)"/>
        <g class="abyss-rings">${rings}</g>
        <circle class="falling-stone" cx="600" cy="300" r="7" fill="#2a1410" stroke="#ff9a5a" stroke-width="1"/>
      </svg>`;
    },

    embers() {
      const R = seeded(31);
      let cracks = '';
      for (let k = 0; k < 16; k++) {
        let x = R() * 1200, y = 520 + R() * 280, d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
        for (let j = 0; j < 6; j++) {
          x += (R() - 0.5) * 120; y += (R() - 0.2) * 40;
          d += `L${x.toFixed(0)} ${y.toFixed(0)}`;
        }
        cracks += `<path d="${d}" style="--k:${k}"/>`;
      }
      return `
      <svg class="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="em-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1a0604" stop-opacity="0"/>
            <stop offset="1" stop-color="#3a0c05"/>
          </linearGradient>
        </defs>
        <rect x="0" y="460" width="1200" height="340" fill="url(#em-ground)"/>
        <g class="cracks" fill="none" stroke="#ff7a2a" stroke-width="2" stroke-linejoin="round">${cracks}</g>
      </svg>`;
    },

    zaqqum() {
      const { byDepth, thorns, fruits } = growTree(77, { thorns: true, spread: 0.75, len: 170 });
      const widths = [24, 13, 8, 5, 3, 2];
      const branches = byDepth.map((paths, dpt) => `<path d="${paths.join('')}" stroke-width="${widths[dpt]}"/>`).join('');
      let bubbles = '';
      for (let k = 0; k < 9; k++) bubbles += `<circle cx="${250 + k * 38}" cy="812" r="${3 + (k % 3) * 2}" style="--k:${k}"/>`;
      return `
      <svg class="tree tree--zaqqum" viewBox="-70 40 950 880" aria-hidden="true">
        <defs>
          <radialGradient id="zq-pool" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ff8a3a" stop-opacity=".9"/>
            <stop offset="1" stop-color="#7a1606" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="400" cy="800" rx="300" ry="60" fill="url(#zq-pool)"/>
        <g class="bubbles" fill="none" stroke="#ffb27a" stroke-width="1.4">${bubbles}</g>
        <g class="tree__body">
          <g class="tree__branches" fill="none" stroke="#1a0a07" stroke-linecap="round">${branches}</g>
          <g class="tree__branches tree__rim" fill="none" stroke="#ff6a3a" stroke-opacity=".35" stroke-linecap="round">${byDepth.map((p, dpt) => `<path d="${p.join('')}" stroke-width="${Math.max(1, widths[dpt] * 0.18)}"/>`).join('')}</g>
          <path class="tree__thorns" d="${thorns}" fill="none" stroke="#c2431c" stroke-width="1.4" stroke-linecap="round"/>
          <path class="tree__fruits zq-fruit" d="${fruits}" fill="#5a1206" stroke="#ff7a3a" stroke-width="1"/>
        </g>
      </svg>`;
    },

    refuge() {
      return `
      <svg class="scene-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="rf-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff2d6" stop-opacity=".55"/>
            <stop offset="1" stop-color="#fff2d6" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="rf-ember" cx="50%" cy="100%" r="70%">
            <stop offset="0" stop-color="#8a1a06" stop-opacity=".5"/>
            <stop offset="1" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#rf-ember)"/>
        <path class="mercy-beam" d="M560 -20H640L820 820H380Z" fill="url(#rf-beam)"/>
      </svg>`;
    },

    arsh() {
      let rings = '';
      for (let k = 0; k < 7; k++) {
        rings += `<circle cx="400" cy="400" r="${80 + k * 48}" fill="none" stroke="#b88a2c" stroke-opacity="${(0.42 - k * 0.05).toFixed(2)}" stroke-width="${k % 2 ? 0.8 : 1.4}" stroke-dasharray="${k % 2 ? '2 10' : 'none'}"/>`;
      }
      return `
      <div class="rays" aria-hidden="true"></div>
      <svg class="scene-svg arsh-svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="arsh-rings">${rings}</g>
        <path class="arsh-star" d="${starPath(400, 400, 64, 34, 8)}" fill="none" stroke="#b88a2c" stroke-width="1.4"/>
      </svg>`;
    },
  };

  /* ------------------------------------------------------------------ */
  /*  The Garden — painted once into an image                            */
  /* ------------------------------------------------------------------ */

  // [name, x at the bottom edge, width at the bottom edge, meander phase]
  const JN_RIVERS = [['water', 230, 120, 0.3], ['milk', 480, 96, 1.7], ['wine', 730, 96, 2.9], ['honey', 980, 120, 4.1]];
  const JN_TINT = { water: '#a9dcef', milk: '#f4efe4', wine: '#cf9aa6', honey: '#e2bd78' };

  function riverGeom(xb, wb, ph) {
    const N = 56, L = [], Rr = [], C = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, y = 496 + Math.pow(t, 1.7) * 330;
      const cx = 600 + (xb - 600) * Math.pow(t, 1.25) + Math.sin(t * Math.PI * 2.4 + ph) * 62 * Math.pow(t, 1.2);
      const w = 2 + (wb - 2) * Math.pow(t, 1.5);
      L.push([cx - w / 2, y]); Rr.push([cx + w / 2, y]); C.push([cx, y, w]);
    }
    const p = (a) => a.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    return { edge: p(L) + Rr.reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z', center: p(C), points: C };
  }

  let jannahURL = '';
  function jannahPainting() {
    if (jannahURL) return jannahURL;
    const R = seeded(2024);
    const n = (v) => v.toFixed(1);

    const ridge = (base, amp, seed) => {
      const r = seeded(seed), a = r() * 6, b = r() * 6, c = r() * 6;
      let d = `M0 ${base}`;
      for (let x = 0; x <= 1200; x += 15) {
        const y = base - amp * (0.55 * Math.sin(x * 0.0045 + a) + 0.3 * Math.sin(x * 0.012 + b) + 0.15 * Math.sin(x * 0.031 + c) + 0.6);
        d += `L${x} ${n(y)}`;
      }
      return d + 'L1200 800L0 800Z';
    };

    // A few majestic peaks far away: ridged, lit from the horizon, sunk in haze
    const mountains = (base, peak, seed, bias) => {
      const r = seeded(seed), ph = [r() * 6, r() * 6, r() * 6];
      let d = `M0 ${base}`, top = [];
      for (let x = 0; x <= 1200; x += 6) {
        const v = 0.62 * Math.pow(1 - Math.abs(Math.sin(x * 0.0042 + ph[0])), 2.2)
          + 0.28 * Math.pow(1 - Math.abs(Math.sin(x * 0.011 + ph[1])), 2)
          + 0.1 * Math.pow(1 - Math.abs(Math.sin(x * 0.034 + ph[2])), 2);
        const env = bias + (1 - bias) * Math.min(1, Math.abs(x - 600) / 520); // lower behind the palace
        const y = base - peak * v * env;
        d += `L${x} ${n(y)}`;
        top.push([x, y]);
      }
      const rim = top.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${n(y)}`).join('');
      return { body: d + 'L1200 800L0 800Z', rim };
    };
    const farRange = mountains(468, 230, 31, 0.95), nearRange = mountains(478, 120, 57, 0.8);

    // Distant palace of pearl (no figures, no crescents)
    const palace = (cx, base, s, op) => {
      const y0 = base - 30 * s;
      const dome = (x, y, w, h) => `M${n(x - w)} ${n(y)}C${n(x - w * 1.05)} ${n(y - h * 0.62)} ${n(x - w * 0.25)} ${n(y - h * 0.9)} ${n(x)} ${n(y - h)}C${n(x + w * 0.25)} ${n(y - h * 0.9)} ${n(x + w * 1.05)} ${n(y - h * 0.62)} ${n(x + w)} ${n(y)}Z`;
      let win = '';
      for (let k = -6; k <= 6; k++) win += `M${n(cx + k * 22 * s - 3 * s)} ${n(base - 4 * s)}V${n(base - 16 * s)}A${n(3 * s)} ${n(3 * s)} 0 0 1 ${n(cx + k * 22 * s + 3 * s)} ${n(base - 16 * s)}V${n(base - 4 * s)}Z`;
      const towers = [-1, 1].map((sg) => {
        const tx = cx + sg * 168 * s;
        return `<rect x="${n(tx - 6 * s)}" y="${n(base - 104 * s)}" width="${n(12 * s)}" height="${n(104 * s)}"/>
          <path d="${dome(tx, base - 104 * s, 9 * s, 20 * s)}"/>`;
      }).join('');
      return `<g opacity="${op}" filter="url(#f-haze)">
        <g fill="url(#g-ivory)">
          <rect x="${n(cx - 150 * s)}" y="${n(y0)}" width="${n(300 * s)}" height="${n(30 * s)}"/>
          <rect x="${n(cx - 46 * s)}" y="${n(y0 - 26 * s)}" width="${n(92 * s)}" height="${n(26 * s)}"/>
          <path d="${dome(cx, y0 - 26 * s, 50 * s, 78 * s)}"/>
          <path d="${dome(cx - 98 * s, y0, 26 * s, 40 * s)}"/><path d="${dome(cx + 98 * s, y0, 26 * s, 40 * s)}"/>
          ${towers}
        </g>
        <path d="${win}" fill="#ffd98a" opacity=".85"/>
        <path d="M${n(cx)} ${n(y0 - 104 * s)}v${n(-12 * s)}" stroke="#f3cf7a" stroke-width="${n(2 * s)}"/>
      </g>`;
    };

    // Trees built from thousands of small leaves, lit from the glow of the horizon
    const tree = (x, base, h, rx, ry, seed, filter, tw = 18) => {
      const r = seeded(seed), cy = base - h;
      const pal = {
        shadow: ['#10302a', '#163a30', '#1c4536'],
        mid: ['#2a5f47', '#336d4f', '#3f7d58', '#4b8a5f'],
        light: ['#7fb06c', '#9cc679', '#bcd987', '#dfe39a', '#f2e6a6'],
      };
      const bins = {};
      const add = (col, d) => { (bins[col] ||= []).push(d); };
      // the shaded body of the canopy, so the leaves read as one crown
      let mass = '';
      for (let c = 0; c < 34; c++) {
        const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.8);
        const mx = x + Math.cos(a) * rx * rr * 0.85, my = cy + Math.sin(a) * ry * rr * 0.75;
        const mr = 34 + r() * 42;
        mass += `M${n(mx - mr)} ${n(my)}a${n(mr)} ${n(mr * 0.8)} 0 1 0 ${n(2 * mr)} 0a${n(mr)} ${n(mr * 0.8)} 0 1 0 ${n(-2 * mr)} 0Z`;
      }
      for (let c = 0; c < 130; c++) {
        const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.6);
        const ccx = x + Math.cos(a) * rx * rr, ccy = cy + Math.sin(a) * ry * rr * 0.85;
        const cr = 18 + r() * 26;
        for (let l = 0; l < 30; l++) {
          const la = r() * Math.PI * 2, lr = Math.sqrt(r()) * cr;
          const lx = ccx + Math.cos(la) * lr, ly = ccy + Math.sin(la) * lr;
          // light comes from the horizon glow and from above
          const toLight = Math.atan2(420 - ly, 600 - lx);
          const facing = Math.cos(la - toLight) * (lr / cr) + (ccy < cy ? 0.25 : -0.2) + (r() - 0.5) * 0.5;
          const set = facing > 0.45 ? pal.light : facing > -0.25 ? pal.mid : pal.shadow;
          add(set[Math.floor(r() * set.length)], ellipsePath(lx, ly, 4.5 + r() * 6, 2.8 + r() * 3, r() * Math.PI));
        }
      }
      let fruit = '';
      for (let k = 0; k < 26; k++) {
        const fx = x + (r() - 0.5) * rx * 1.6, fy = cy + (r() - 0.1) * ry * 0.9;
        fruit += `<circle cx="${n(fx)}" cy="${n(fy)}" r="${n(2.5 + r() * 2.5)}" fill="url(#g-fruit)"/>`;
      }
      const bend = (r() - 0.5) * 40;
      const trunk = `M${n(x - tw * 1.8)} ${base}C${n(x - tw)} ${n(base - 30)} ${n(x - tw * 0.9 + bend)} ${n(base - h * 0.45)} ${n(x - tw * 0.45 + bend)} ${n(cy + ry * 0.2)}L${n(x + tw * 0.45 + bend)} ${n(cy + ry * 0.2)}C${n(x + tw * 0.9 + bend)} ${n(base - h * 0.45)} ${n(x + tw)} ${n(base - 30)} ${n(x + tw * 1.9)} ${base}Z`;
      let limbs = '';
      for (let k = 0; k < 9; k++) {
        const ex = x + (r() - 0.5) * rx * 1.6, ey = cy + (r() - 0.4) * ry * 0.8;
        limbs += `M${n(x + bend)} ${n(cy + ry * 0.3)}Q${n((x + bend + ex) / 2)} ${n(cy + ry * 0.05 - 30 * r())} ${n(ex)} ${n(ey)}`;
      }
      // order: shadow → mid → light so highlights sit on top
      const order = [...pal.shadow, ...pal.mid, ...pal.light];
      return `<g filter="url(#${filter})">
        <path d="${trunk}" fill="url(#g-bark)"/>
        <path d="${limbs}" fill="none" stroke="#33261a" stroke-width="${n(tw * 0.45)}" stroke-linecap="round"/>
        <path d="${mass}" fill="#173a30"/>
        ${order.filter((c) => bins[c]).map((c) => `<path d="${bins[c].join('')}" fill="${c}"/>`).join('')}
        ${fruit}
      </g>`;
    };

    // Groves on the far hills
    let groves = '';
    for (let k = 0; k < 16; k++) {
      const gx = R() * 1200, gy = 470 + R() * 16;
      if (Math.abs(gx - 600) < 190) continue;
      for (let j = 0; j < 7; j++) groves += `M${n(gx + j * 7 - 21 - 6)} ${n(gy)}a6 ${n(7 + R() * 6)} 0 1 0 12 0a6 7 0 1 0 -12 0Z`;
    }

    // Meadow flowers, larger toward the viewer
    const flowerCols = ['#ffffff', '#fff1c4', '#ffd2df', '#e9dcff', '#fff8e6'];
    const flowers = {};
    for (let k = 0; k < 520; k++) {
      const t = Math.pow(R(), 0.8), y = 500 + t * 300, x = R() * 1200, r = 0.5 + t * 2.6;
      const c = flowerCols[Math.floor(R() * flowerCols.length)];
      (flowers[c] ||= []).push(`M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`);
    }

    // Rivers and the pearl domes along their banks
    const rivers = JN_RIVERS.map(([name, xb, wb, ph]) => ({ name, ...riverGeom(xb, wb, ph) }));
    // Open pavilions of pearl along the banks: slender columns, arches glowing
    // from within (the "hollowed pearl"), a pearl dome and a golden finial
    const pavilions = [];
    const sides = { water: [], milk: [-1], wine: [1], honey: [] };
    const stations = { water: [], milk: [0.4, 0.8], wine: [0.4, 0.8], honey: [] };
    for (const rv of rivers) {
      for (const t of stations[rv.name]) {
        const [cx, cy, w] = rv.points[Math.round(t * 56)];
        const sc = 0.18 + 1.25 * Math.pow(t, 1.7);
        for (const sg of sides[rv.name]) pavilions.push([cx + sg * (w / 2 + 34 * sc), cy, sc]);
      }
    }
    const pavilion = ([x, y, k]) => {
      const W = 34 * k, colH = 36 * k, col = 2.6 * k;
      const top = y - colH, dTop = top - 7 * k;
      const domeW = W * 0.8, domeH = 58 * k;
      const onion = `M${n(x - domeW)} ${n(dTop)}C${n(x - domeW * 1.12)} ${n(dTop - domeH * 0.55)} ${n(x - domeW * 0.3)} ${n(dTop - domeH * 0.8)} ${n(x)} ${n(dTop - domeH)}C${n(x + domeW * 0.3)} ${n(dTop - domeH * 0.8)} ${n(x + domeW * 1.12)} ${n(dTop - domeH * 0.55)} ${n(x + domeW)} ${n(dTop)}Z`;
      let arches = '', cols = '';
      for (let i = 0; i < 3; i++) {
        const ax = x - W + (i + 0.5) * ((2 * W) / 3), aw = (W / 3) - col;
        arches += `M${n(ax - aw)} ${n(y)}V${n(top + aw * 0.9)}A${n(aw)} ${n(aw)} 0 0 1 ${n(ax + aw)} ${n(top + aw * 0.9)}V${n(y)}Z`;
      }
      for (let i = 0; i <= 3; i++) {
        const cx = x - W + i * ((2 * W) / 3);
        cols += `<rect x="${n(cx - col / 2)}" y="${n(top)}" width="${n(col)}" height="${n(colH)}"/>`;
      }
      return `<g>
        <ellipse cx="${n(x)}" cy="${n(y + 2 * k)}" rx="${n(W * 1.5)}" ry="${n(6 * k)}" fill="#0e2a22" opacity=".35" filter="url(#f-soft)"/>
        <path d="${arches}" fill="url(#g-inner)"/>
        <g fill="url(#g-ivory)">${cols}
          <rect x="${n(x - W - 3 * k)}" y="${n(top - 4 * k)}" width="${n(2 * W + 6 * k)}" height="${n(5 * k)}"/>
          <rect x="${n(x - domeW * 0.9)}" y="${n(dTop)}" width="${n(domeW * 1.8)}" height="${n(5 * k)}"/>
        </g>
        <path d="M${n(x - W - 3 * k)} ${n(top + 1 * k)}H${n(x + W + 3 * k)}" stroke="#e8c46e" stroke-width="${n(1.4 * k)}"/>
        <path d="${onion}" fill="url(#g-pearl)"/>
        <path d="${onion}" fill="url(#g-sheen)" opacity=".4"/>
        <ellipse cx="${n(x - domeW * 0.35)}" cy="${n(dTop - domeH * 0.55)}" rx="${n(domeW * 0.18)}" ry="${n(domeH * 0.12)}" fill="#fff" opacity=".85" filter="url(#f-soft)"/>
        <path d="M${n(x)} ${n(dTop - domeH)}v${n(-9 * k)}" stroke="#f0c869" stroke-width="${n(1.6 * k)}"/>
        <circle cx="${n(x)}" cy="${n(dTop - domeH - 10 * k)}" r="${n(2 * k)}" fill="#ffe7a8"/>
      </g>`;
    };

    let stars = '';
    for (let k = 0; k < 140; k++) stars += `<circle cx="${n(R() * 1200)}" cy="${n(R() * 230)}" r="${n(0.4 + R() * 0.9)}" fill="#fff" opacity="${n(0.15 + R() * 0.55)}"/>`;
    let bokeh = '';
    for (let k = 0; k < 12; k++) {
      const side = k % 2 ? 1 : -1;
      bokeh += `<circle cx="${n(600 + side * (420 + R() * 260))}" cy="${n(560 + R() * 260)}" r="${n(14 + R() * 30)}" fill="url(#g-bokeh)" opacity="${n(0.35 + R() * 0.4)}"/>`;
    }
    let rays = '';
    for (const a of [-62, -44, -30, -17, -6, 7, 19, 33, 47, 63]) {
      const rad = (a - 90) * Math.PI / 180, w = 0.035 + R() * 0.03;
      const x1 = 600 + Math.cos(rad - w) * 900, y1 = 472 + Math.sin(rad - w) * 900;
      const x2 = 600 + Math.cos(rad + w) * 900, y2 = 472 + Math.sin(rad + w) * 900;
      rays += `<path d="M600 472L${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}Z" opacity="${n(0.4 + R() * 0.6)}"/>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#120a2a"/><stop offset=".22" stop-color="#271a4e"/><stop offset=".38" stop-color="#4f3474"/>
          <stop offset=".5" stop-color="#9a6288"/><stop offset=".56" stop-color="#d99a80"/><stop offset=".6" stop-color="#f8cf98"/>
          <stop offset=".63" stop-color="#fff0cf"/><stop offset=".66" stop-color="#fffaf0"/>
        </linearGradient>
        <radialGradient id="g-bloom" cx="600" cy="474" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff"/><stop offset=".08" stop-color="#fffbef" stop-opacity=".95"/>
          <stop offset=".28" stop-color="#ffe2ad" stop-opacity=".5"/><stop offset=".6" stop-color="#f0a98a" stop-opacity=".12"/><stop offset="1" stop-color="#f0a98a" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="g-ray" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffaf0" stop-opacity=".7"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></linearGradient>
 <linearGradient id="g-mount-far" x1="0" y1="220" x2="0" y2="470" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff6f0"/><stop offset=".3" stop-color="#d9c3dd"/><stop offset=".75" stop-color="#a996c6"/><stop offset="1" stop-color="#c7b6d8"/>
        </linearGradient>
        <linearGradient id="g-mount-near" x1="0" y1="340" x2="0" y2="478" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#b9a7d2"/><stop offset=".6" stop-color="#8d80b2"/><stop offset="1" stop-color="#b3a7cc"/>
        </linearGradient>
        <linearGradient id="g-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff4e6" stop-opacity="0"/><stop offset=".7" stop-color="#fff4e6" stop-opacity=".55"/><stop offset="1" stop-color="#fffaf0" stop-opacity=".8"/>
        </linearGradient>
        <linearGradient id="g-hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe0e8"/><stop offset="1" stop-color="#d9c8dc"/></linearGradient>
        <linearGradient id="g-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdbfd6"/><stop offset="1" stop-color="#a99fbf"/></linearGradient>
        <linearGradient id="g-ivory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#e2d6ea"/></linearGradient>
        <linearGradient id="g-ground" x1="0" y1="490" x2="0" y2="800" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#efe8c6"/><stop offset=".12" stop-color="#c7d6a2"/><stop offset=".35" stop-color="#83b07f"/>
          <stop offset=".65" stop-color="#3f7a5c"/><stop offset="1" stop-color="#173f33"/>
        </linearGradient>
        <radialGradient id="g-pearl" cx="36%" cy="28%" r="85%">
          <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#fbf5ff"/><stop offset=".55" stop-color="#e9e5fa"/>
          <stop offset=".78" stop-color="#f1d8e8"/><stop offset="1" stop-color="#a99ac4"/>
        </radialGradient>
        <linearGradient id="g-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffd6ec" stop-opacity="0"/><stop offset=".45" stop-color="#ffd6ec"/><stop offset=".6" stop-color="#cfe6ff"/><stop offset="1" stop-color="#cfe6ff" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="g-inner" cx="50%" cy="65%" r="75%"><stop offset="0" stop-color="#fffdf2"/><stop offset=".5" stop-color="#ffe9b8"/><stop offset="1" stop-color="#c79a52"/></radialGradient>
        <radialGradient id="g-door" cx="50%" cy="70%" r="70%"><stop offset="0" stop-color="#fff0c2"/><stop offset="1" stop-color="#d9a24a"/></radialGradient>
        <radialGradient id="g-fruit"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#f5c75a"/><stop offset="1" stop-color="#b9821f" stop-opacity=".8"/></radialGradient>
        <linearGradient id="g-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1d10"/><stop offset=".6" stop-color="#4f3a22"/><stop offset="1" stop-color="#8a6a3e"/></linearGradient>
        <linearGradient id="g-reflect" x1="0" y1="490" x2="0" y2="800" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".25" stop-color="#ffe9d0" stop-opacity=".45"/>
          <stop offset=".6" stop-color="#d9c6ec" stop-opacity=".15"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="g-bokeh"><stop offset="0" stop-color="#fff6d8" stop-opacity=".5"/><stop offset=".7" stop-color="#fff6d8" stop-opacity=".18"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
        <linearGradient id="g-vignette" x1="0" y1="0" x2="0" y2="1"><stop offset=".72" stop-color="#0a1f19" stop-opacity="0"/><stop offset="1" stop-color="#0a1f19" stop-opacity=".55"/></linearGradient>
        <radialGradient id="g-edge" cx="50%" cy="55%" r="75%"><stop offset=".65" stop-color="#120a2a" stop-opacity="0"/><stop offset="1" stop-color="#120a2a" stop-opacity=".5"/></radialGradient>
        ${JN_RIVERS.map(([name]) => `<linearGradient id="g-r-${name}" x1="0" y1="490" x2="0" y2="800" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fffdf6"/><stop offset=".35" stop-color="${JN_TINT[name]}" stop-opacity=".9"/><stop offset="1" stop-color="${JN_TINT[name]}"/></linearGradient>`).join('')}

        <filter id="f-clouds" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.008" numOctaves="4" seed="9"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.84  0 0 0 0 0.8  2.4 0 0 0 -1.15"/>
          <feGaussianBlur stdDeviation="5"/>
        </filter>
        <filter id="f-grass" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.07" numOctaves="2" seed="3"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.2  0 0 0 0 0.1  1.6 0 0 0 -0.6"/>
        </filter>
        <filter id="f-organic" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="t"/>
          <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="f-organic-near" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="6" result="t"/>
          <feDisplacementMap in="SourceGraphic" in2="t" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/>
          <feGaussianBlur in="d" stdDeviation="1.1"/>
        </filter>
        <filter id="f-haze"><feGaussianBlur stdDeviation="0.6"/></filter>
        <filter id="f-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id="f-mist" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>
        <filter id="f-ray" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>
        <filter id="f-river"><feGaussianBlur stdDeviation="0.7"/></filter>
        <mask id="m-cloud"><linearGradient id="g-cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".2" stop-color="#fff" stop-opacity=".7"/><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><rect x="0" y="40" width="1200" height="420" fill="url(#g-cm)"/></mask>
        <clipPath id="c-ground"><path id="ground" d="${ridge(498, 8, 21)}"/></clipPath>
      </defs>

      <rect width="1200" height="800" fill="url(#g-sky)"/>
      <g>${stars}</g>
      <rect x="0" y="40" width="1200" height="420" filter="url(#f-clouds)" mask="url(#m-cloud)" opacity=".42"/>
      <rect width="1200" height="800" fill="url(#g-bloom)"/>
      <g fill="url(#g-ray)" filter="url(#f-ray)" opacity=".5">${rays}</g>

      <ellipse cx="300" cy="360" rx="260" ry="40" fill="#ffd9c2" opacity=".35" filter="url(#f-mist)"/>
      <ellipse cx="930" cy="340" rx="280" ry="46" fill="#ffe6c8" opacity=".35" filter="url(#f-mist)"/>
      <path d="${farRange.body}" fill="url(#g-mount-far)"/>
      <path d="${farRange.rim}" fill="none" stroke="#fffaf0" stroke-opacity=".7" stroke-width="1.6" filter="url(#f-haze)"/>
      <path d="${nearRange.body}" fill="url(#g-mount-near)"/>
      <path d="${nearRange.rim}" fill="none" stroke="#ffeede" stroke-opacity=".45" stroke-width="1.2" filter="url(#f-haze)"/>
      <rect x="0" y="380" width="1200" height="110" fill="url(#g-haze)"/>
      <path d="${ridge(470, 22, 3)}" fill="url(#g-hill1)" opacity=".85"/>
      ${palace(330, 466, 0.45, 0.55)}${palace(880, 464, 0.5, 0.55)}
      <path d="${ridge(484, 18, 8)}" fill="url(#g-hill2)" opacity=".8"/>
      <path d="${groves}" fill="#7f9c86" opacity=".55" filter="url(#f-haze)"/>
      ${palace(600, 486, 1, 0.95)}
      <ellipse cx="600" cy="486" rx="560" ry="16" fill="#fffaf0" opacity=".7" filter="url(#f-mist)"/>

      <path d="${ridge(498, 8, 21)}" fill="url(#g-ground)"/>
      <rect x="0" y="480" width="1200" height="320" filter="url(#f-grass)" clip-path="url(#c-ground)" opacity=".32"/>
      <ellipse cx="600" cy="500" rx="330" ry="11" fill="#fffdf6" filter="url(#f-soft)"/>
      ${rivers.map((rv) => {
        // ripples catching the light, wider toward the viewer
        let ripples = '';
        const rr = seeded(rv.name.length * 97 + rv.points.length);
        for (let i = 8; i < rv.points.length; i++) {
          if (rr() < 0.55) continue;
          const [cx, cy, w] = rv.points[i];
          const off = (rr() - 0.5) * w * 0.6, len = w * (0.06 + rr() * 0.18);
          ripples += `M${n(cx + off - len / 2)} ${n(cy + (rr() - 0.5) * 3)}q${n(len / 2)} ${n(-0.8 - rr())} ${n(len)} 0`;
        }
        return `<path d="${rv.edge}" fill="none" stroke="#163d30" stroke-opacity=".5" stroke-width="6" filter="url(#f-soft)"/>
        <path d="${rv.edge}" fill="url(#g-r-${rv.name})" filter="url(#f-river)"/>
        <path d="${rv.edge}" fill="url(#g-reflect)" opacity=".55"/>
        <path d="${rv.center}" fill="none" stroke="#1b3f4a" stroke-opacity=".12" stroke-width="${n(rv.points[56][2] * 0.35)}" filter="url(#f-soft)"/>
        <path d="${ripples}" fill="none" stroke="#ffffff" stroke-opacity=".38" stroke-width="1" stroke-linecap="round"/>
        <path d="${rv.edge}" fill="none" stroke="#fffdf6" stroke-opacity=".45" stroke-width="1.4" filter="url(#f-river)"/>`;
      }).join('')}
      ${Object.entries(flowers).map(([c, d]) => `<path d="${d.join('')}" fill="${c}" opacity=".6"/>`).join('')}
      <ellipse cx="380" cy="520" rx="260" ry="12" fill="#fffaf0" opacity=".35" filter="url(#f-mist)"/>
      <ellipse cx="860" cy="530" rx="260" ry="12" fill="#fffaf0" opacity=".35" filter="url(#f-mist)"/>
      ${pavilions.sort((a, b) => a[1] - b[1]).map(pavilion).join('')}

      ${tree(140, 830, 480, 220, 150, 9, 'f-organic', 15)}
      ${tree(1040, 840, 610, 310, 200, 4, 'f-organic-near', 22)}

      ${bokeh}
      <rect width="1200" height="800" fill="url(#g-vignette)"/>
      <rect width="1200" height="800" fill="url(#g-edge)"/>
    </svg>`;
    jannahURL = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    return jannahURL;
  }

  function flamePath(x, base, w, h) {
    return `M${(x - w).toFixed(1)} ${base}C${(x - w).toFixed(1)} ${(base - h * 0.45).toFixed(1)} ${(x - w * 0.15).toFixed(1)} ${(base - h * 0.55).toFixed(1)} ${x.toFixed(1)} ${(base - h).toFixed(1)}C${(x + w * 0.25).toFixed(1)} ${(base - h * 0.6).toFixed(1)} ${(x + w).toFixed(1)} ${(base - h * 0.4).toFixed(1)} ${(x + w).toFixed(1)} ${base}Z`;
  }

  function fireInner() {
    let d = '';
    for (let k = 0; k < 7; k++) d += flamePath(80 + k * 40, 570, 34, 160 + ((k * 53) % 120));
    return `<g class="gate__fire"><path d="${d}" fill="#ff7a2a" fill-opacity=".7"/></g>`;
  }

  /** Deterministic branching tree (shared by the Lote Tree and Zaqqum). */
  function growTree(seed, { leaves: withLeaves = false, thorns: withThorns = false, spread: sp = 0.55, len: L0 = 190 } = {}) {
    const R = seeded(seed);
    const byDepth = [];
    let leaves = '', fruits = '', thorns = '';
    (function grow(x, y, ang, len, depth) {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const bend = (R() - 0.5) * 0.7;
      const cx = x + Math.cos(ang + bend) * len * 0.55, cy = y + Math.sin(ang + bend) * len * 0.55;
      (byDepth[depth] ||= []).push(`M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      if (depth >= 2) {
        if (withLeaves) {
          const lx = x2 + Math.cos(ang) * 14, ly = y2 + Math.sin(ang) * 14;
          leaves += ellipsePath(lx, ly, 26 - depth * 2, 17 - depth, ang + (R() - 0.5));
        }
        if (withThorns) {
          for (let t = 0.3; t < 1; t += 0.35) {
            const tx = x + (x2 - x) * t, ty = y + (y2 - y) * t, ta = ang + (R() > 0.5 ? 1 : -1) * (0.9 + R() * 0.4);
            thorns += `M${tx.toFixed(1)} ${ty.toFixed(1)}l${(Math.cos(ta) * 11).toFixed(1)} ${(Math.sin(ta) * 11).toFixed(1)}`;
          }
        }
        if (R() > 0.55) fruits += `M${(x + x2) / 2 - 5} ${(y + y2) / 2 + 6}a5 6 0 1 0 10 0a5 6 0 1 0 -10 0Z`;
      }
      if (depth >= 5) return;
      const n = depth < 1 ? 3 : 2 + (R() > 0.55 ? 1 : 0);
      const spread = depth === 0 ? 0.95 : sp + R() * 0.25;
      for (let k = 0; k < n; k++) {
        const a = ang + (k - (n - 1) / 2) * spread + (R() - 0.5) * 0.25;
        grow(x2, y2, a, len * (0.7 + R() * 0.1), depth + 1);
      }
    })(400, 760, -Math.PI / 2, L0, 0);
    return { byDepth, leaves, fruits, thorns };
  }

  function defaultInner(id) {
    return `<g class="gate__motes">${Array.from({ length: 14 }, (_, k) => {
      const x = 90 + ((k * 53) % 220), y = 120 + ((k * 97) % 400);
      return `<circle cx="${x}" cy="${y}" r="${1 + (k % 3)}" fill="#fff" style="--k:${k}"/>`;
    }).join('')}</g>`;
  }

  function baytInner() {
    const dots = Array.from({ length: 24 }, (_, k) => {
      const a = (k / 24) * Math.PI * 2;
      return `<circle cx="${(Math.cos(a) * 120).toFixed(1)}" cy="${(Math.sin(a) * 120).toFixed(1)}" r="2.2" fill="#fff"/>`;
    }).join('');
    return `
      <g class="bayt" transform="translate(200 340)">
        <g transform="scale(1 .32)"><g class="bayt__orbit">${dots}</g></g>
        <path d="M-46 -30L0 -52L46 -30L0 -8Z" fill="#fff6dc" fill-opacity=".9"/>
        <path d="M-46 -30V40L0 62V-8Z" fill="#c9a24c"/>
        <path d="M46 -30V40L0 62V-8Z" fill="#8f6e2a"/>
        <path d="M-46 -12L0 10L46 -12" fill="none" stroke="#fff6dc" stroke-width="2"/>
      </g>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                          */
  /* ------------------------------------------------------------------ */

  // Scenes that are a picture in their own right (shown as a block when stacked)
  const PICTURE_SCENES = ['makkah', 'aqsa', 'jannah', 'flames', 'embers'];
  // Scenes that are atmosphere behind the text (stay behind it when stacked)
  const AMBIENT_SCENES = ['pens', 'arsh', 'abyss', 'refuge'];

  function renderLevel(d, i) {
    let delay = 0;
    const rv = (cls = '', step = 0.045) => {
      delay += step;
      return `class="r ${cls}" style="--d:${delay.toFixed(3)}"`;
    };

    const head = [], body = [], tail = [];
    head.push(`<p ${rv('kicker')}>${esc(d.kicker)}</p>`);
    head.push(`<h2 ${rv('level__ar')} lang="ar" dir="rtl">${esc(d.ar)}</h2>`);
    head.push(`<h3 ${rv('level__title')}>${esc(d.title)}</h3>`);
    if (d.place) head.push(`<p ${rv('level__place', 0.02)}>${esc(d.place)}</p>`);
    if (d.quote) {
      head.push(`<blockquote ${rv('hero-quote', 0.06)}>
        <p>“${esc(d.quote.en)}”</p><cite>${esc(d.quote.ref)}</cite>
      </blockquote>`);
    }

    if (d.dialogue) {
      head.push(`<ol ${rv('dialogue')} aria-label="${esc(ui('atGate'))}">${d.dialogue
        .map(([who, line], k) => `<li style="--j:${k}" class="${who === 'Jibril' ? 'is-jibril' : ''}"><span>${esc(ui(who === 'Jibril' ? 'jibril' : 'gatekeeper'))}</span>${esc(line)}</li>`)
        .join('')}</ol>`);
    } else if (d.gateNote) {
      head.push(`<p ${rv('gate-note')}>${esc(d.gateNote)}</p>`);
    }
    if (d.meeting) {
      head.push(`<div ${rv('meeting', 0.06)}>
        <span class="meeting__label">${esc(ui('metHere'))}</span>
        <p class="meeting__ar" lang="ar" dir="rtl">${esc(d.meeting.ar)}</p>
        ${d.meeting.en ? `<p class="meeting__en">${esc(d.meeting.en)} <span>(${esc(ui(d.meeting.plural ? 'pbut' : 'pbuh'))})</span></p>` : ''}
      </div>`);
    }
    if (d.greeting) {
      head.push(`<blockquote ${rv('greet')}>
        <p class="greet__ar" lang="ar" dir="rtl">${esc(d.greeting.ar)}</p>
        ${d.greeting.en ? `<p class="greet__en">“${esc(d.greeting.en)}”</p>` : ''}
      </blockquote>`);
    }

    if (d.phased) delay = 0.34;
    if (d.points?.length) {
      body.push(`<ul class="points">${d.points
        .map((p) => `<li ${rv('point', 0.05)}><p>${esc(p.text)}</p><cite>${esc(p.ref)}</cite></li>`)
        .join('')}</ul>`);
    }
    if (d.refs) body.push(`<p ${rv('refs', 0.02)}>${esc(d.refs)}</p>`);
    if (d.widget === 'choice') body.push(`<div ${rv('choice', 0.07)}>${choiceWidget()}</div>`);
    if (d.widget === 'counter') body.push(`<div ${rv('counter', 0.05)}>${counterWidget()}</div>`);

    if (d.phased) delay = 0.66;
    if (d.rivers) {
      tail.push(`<ul ${rv('rivers-legend', 0.05)} aria-label="The four rivers">${d.rivers
        .map(([key, label, sub]) => `<li class="rv rv--${key}"><i></i><span>${esc(label)}</span><small>${esc(sub)}</small></li>`)
        .join('')}</ul>`);
    }
    for (const a of [d.ayah, d.ayah2].filter(Boolean)) {
      tail.push(`<figure ${rv('ayah', 0.06)}>
        <p class="ayah__ar" lang="ar" dir="rtl">${esc(a.ar)}</p>
        <figcaption>${a.en ? `<span class="ayah__en">${esc(a.en)}</span>` : ''}<cite>${esc(a.ref)}</cite></figcaption>
      </figure>`);
    }
    if (d.note) tail.push(`<p ${rv('note', 0.04)}>${esc(d.note)}</p>`);
    if (d.widget === 'ascend') tail.push(`<div ${rv('return-wrap', 0.04)}><button class="return-btn ascend-btn" type="button">${esc(ui('riseEarth'))}</button></div>`);
    if (d.widget === 'return') tail.push(`<div ${rv('return-wrap', 0.04)}><button class="return-btn" type="button">${esc(ui('descendEarth'))}</button></div>`);

    const content = d.phased
      ? `<div class="phase phase--1" style="--a:.02;--b:.36">${head.join('')}</div>
         <div class="phase phase--2" style="--a:.34;--b:.68">${body.join('')}</div>
         <div class="phase phase--3" style="--a:.66;--b:2">${tail.join('')}</div>`
      : head.concat(body, tail).join('');

    const scene = (SCENES[d.scene] || SCENES.gate)(d, i);
    const full = PICTURE_SCENES.includes(d.scene) || AMBIENT_SCENES.includes(d.scene);
    const cls = [
      'level', `level--${d.scene}`,
      full && 'level--full',
      PICTURE_SCENES.includes(d.scene) && 'level--picture',
      AMBIENT_SCENES.includes(d.scene) && 'level--ambient',
      d.wide && 'level--wide',
      d.phased && 'level--phased',
      d.hell && 'level--hell',
      d.sealed && 'level--sealed',
    ].filter(Boolean).join(' ');

    return `
    <section class="${cls}" id="${d.id}" data-i="${i}"
      style="--h:${d.height || 260};--accent:${d.accent}" aria-label="${esc(d.short || d.title)}">
      <div class="level__pin">
        <div class="level__scene">${scene}</div>
        <div class="level__content">${content}</div>
      </div>
    </section>`;
  }

  /** A short line of narration between two levels — the thread of the story. */
  function renderPassage(p, dir) {
    if (!p) return '';
    return `
    <div class="passage passage--${dir}">
      <span class="passage__thread" aria-hidden="true"></span>
      <p class="passage__text">${esc(p.text)}</p>
      ${p.ref ? `<cite class="passage__ref">${esc(p.ref)}</cite>` : ''}
    </div>`;
  }

  function choiceWidget() {
    const cup = (fill, cls, label, sub) => `
      <div class="vessel ${cls}">
        <svg viewBox="0 0 60 70" aria-hidden="true">
          <path d="M10 12H50L44 52C43 58 38 62 30 62C22 62 17 58 16 52Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M12.5 26H47.5L44 52C43 58 38 62 30 62C22 62 17 58 16 52Z" fill="${fill}"/>
          <path d="M22 66H38" stroke="currentColor" stroke-width="1.6"/>
        </svg>
        <span>${label}</span><small>${sub}</small>
      </div>`;
    return cup('#7a1830', 'vessel--wine', esc(ui('wine')), esc(ui('declined'))) + cup('#fffaf0', 'vessel--milk', esc(ui('milk')), esc(ui('fitrah')));
  }

  function counterWidget() {
    return `
      <div class="counter__num" data-counter aria-live="off">${num(50)}</div>
      <div class="counter__meta">
        <span class="counter__label">${esc(ui('dailyPrayers'))}</span>
        <div class="counter__pips">${'<i></i>'.repeat(9)}</div>
        <span class="counter__sub" data-counter-sub>${esc(ui('enjoined'))}</span>
      </div>`;
  }

  function renderIntro() {
    return `
    <section class="intro" id="earth" aria-label="Beginning">
      <div class="intro__pin">
        <div class="intro__horizon" aria-hidden="true"></div>
        <button class="intro__go intro__go--up" type="button">
          <span class="intro__chev" aria-hidden="true"></span>
          <span>${esc(ui('scrollUp'))}</span>
        </button>
        <div class="intro__content">
          <p class="intro__bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <h1 class="intro__title"><span lang="ar" dir="rtl">الإسراء والمعراج</span>${esc(ui('title'))}</h1>
          <p class="intro__sub">${esc(ui('subtitle'))}</p>
          <button class="sound-toggle intro__sound" type="button" aria-pressed="false">
            <span class="sound-off">${esc(ui('beginSound'))}</span><span class="sound-on">${esc(ui('soundOn'))}</span>
          </button>
        </div>
        <button class="intro__go intro__go--down" type="button">
          <span>${esc(ui('scrollDown'))}</span>
          <span class="intro__chev intro__chev--down" aria-hidden="true"></span>
        </button>
      </div>
    </section>`;
  }

  const main = document.getElementById('journey');
  const html = [];
  // Heavens: highest first; each passage sits below its level (you meet it on the way up)
  for (let i = DATA.length - 1; i >= H; i--) html.push(renderLevel(DATA[i], i), renderPassage(DATA[i].passage, 'up'));
  html.push(renderIntro());
  // Beneath: each passage sits above its level (you meet it on the way down)
  for (let i = H - 1; i >= 0; i--) html.push(renderPassage(DATA[i].passage, 'down'), renderLevel(DATA[i], i));
  main.innerHTML = html.join('');

  // Altimeter (highest first, like the page)
  const navList = document.querySelector('.altimeter__list');
  const navItem = (key, label, cls = '') => `<li class="${cls}"><button type="button" data-go="${key}" aria-label="${esc(label)}"><span class="altimeter__label">${esc(label)}</span><i></i></button></li>`;
  const navHtml = DATA.map((d, i) => navItem(i, d.short || d.title, d.hell ? 'is-hell' : ''));
  navHtml.splice(H, 0, navItem('earth', ui('earth'), 'is-earth'));
  navList.innerHTML = navHtml.reverse().join('');
  const navButtons = []; // index = data index
  navList.querySelectorAll('button').forEach((b) => { if (b.dataset.go !== 'earth') navButtons[+b.dataset.go] = b; });
  const earthButton = navList.querySelector('[data-go="earth"]');

  // Sources dialog
  const dialog = document.querySelector('.sources');
  dialog.querySelector('.sources__list').innerHTML = SOURCES.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('');
  document.querySelector('.sources-btn').addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.sources__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  /* ------------------------------------------------------------------ */
  /*  Layout modes & measurement                                         */
  /*                                                                     */
  /*  pinned  desktop: the level sticks while its content plays out      */
  /*  flow    phones, tablets in portrait, or any level whose content    */
  /*          would not fit the screen: picture and text stack one after */
  /*          the other and reveal as they enter the viewport            */
  /* ------------------------------------------------------------------ */

  const root = document.documentElement;
  const flowQuery = matchMedia('(max-width: 899px), (max-height: 560px)');
  const levels = [...main.querySelectorAll('.level')].map((el) => ({
    el,
    i: +el.dataset.i,
    hell: el.classList.contains('level--hell'),
    ambient: el.classList.contains('level--ambient'),
    pin: el.querySelector('.level__pin'),
    content: el.querySelector('.level__content'),
    sceneEl: el.querySelector('.level__scene'),
    flow: false,
    top: 0, h: 0, center: 0, sTop: 0, sH: 0,
    lastS: NaN,
    counter: el.querySelector('[data-counter]'),
    counterSub: el.querySelector('[data-counter-sub]'),
    pips: el.querySelectorAll('.counter__pips i'),
    counterTimer: 0,
  }));
  const byIndex = [];
  levels.forEach((l) => (byIndex[l.i] = l));
  const passages = [...main.querySelectorAll('.passage')].map((el) => ({ el, top: 0, h: 0, lastV: NaN }));
  const skies = DATA.map((d) => d.sky.map(hexToRgb));
  const accents = DATA.map((d) => hexToRgb(d.accent));

  const intro = main.querySelector('.intro');
  let vh = innerHeight, maxScroll = 0, earthY = 0, earthCenter = 0, introTop = 0, introH = 0;

  function chooseModes() {
    const all = flowQuery.matches;
    for (const l of levels) {
      l.el.classList.toggle('level--flow', all);
      if (all) continue;
      // Desktop keeps one design in every language: when a level's words run
      // longer than the screen (longer translations, taller scripts), its text
      // is scaled down to fit rather than changing layout. Stacking is a last
      // resort for text that would have to shrink below 70%.
      const cs = getComputedStyle(l.pin);
      const room = l.pin.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let fit = 1;
      l.el.style.setProperty('--fit', 1);
      const tall = () => l.content.getBoundingClientRect().height > room + 2;
      for (let i = 0; i < 12 && tall() && fit > 0.7; i++) {
        fit = Math.max(0.7, fit * Math.min(0.97, (room / l.content.getBoundingClientRect().height) * 0.99));
        l.el.style.setProperty('--fit', fit.toFixed(3));
      }
      if (tall()) { l.el.style.setProperty('--fit', 1); l.el.classList.add('level--flow'); }
    }
    for (const l of levels) l.flow = l.el.classList.contains('level--flow');
    observeReveals();
  }

  function measure() {
    vh = innerHeight;
    maxScroll = Math.max(0, root.scrollHeight - vh);
    const y = scrollY;
    for (const l of levels) {
      const r = l.el.getBoundingClientRect();
      l.top = r.top + y;
      l.h = r.height;
      l.center = l.top + l.h / 2;
      const sr = (l.ambient ? l.el : l.sceneEl).getBoundingClientRect();
      l.sTop = sr.top + y;
      l.sH = sr.height;
    }
    for (const p of passages) {
      const r = p.el.getBoundingClientRect();
      p.top = r.top + y;
      p.h = r.height;
    }
    const ir = intro.getBoundingClientRect();
    introTop = ir.top + y;
    introH = ir.height;
    earthY = clamp(introTop + (introH - vh) / 2, 0, maxScroll); // the middle of its pinned span
    earthCenter = introTop + introH / 2;
  }

  function relayout() {
    chooseModes();
    measure();
    wake();
  }
  // the frame loop rests while the page is still; anything that moves layout wakes it
  let idleFrames = 0;
  const wake = () => { idleFrames = 0; };

  // Stacked mode: reveal each block as it scrolls into view
  let revealObserver = null;
  function observeReveals() {
    revealObserver?.disconnect();
    revealObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        revealObserver.unobserve(e.target);
        if (e.target.classList.contains('counter')) {
          const l = levels.find((x) => x.el.contains(e.target));
          if (l) playCounter(l);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    for (const l of levels) {
      if (!l.flow) continue;
      l.el.querySelectorAll('.r:not(.is-in)').forEach((el) => revealObserver.observe(el));
    }
  }

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

  /* ------------------------------------------------------------------ */
  /*  Smooth wheel scrolling                                             */
  /* ------------------------------------------------------------------ */

  let current = 0, target = 0, animating = false;

  function scrollToY(y, instant = false) {
    target = clamp(y, 0, maxScroll);
    if (instant || reduceMotion) {
      current = target;
      animating = false;
      window.scrollTo(0, current);
    } else {
      animating = true;
    }
  }

  addEventListener('wheel', (e) => {
    if (e.ctrlKey || dialog.open) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? vh : 1;
    if (!animating) target = current = scrollY;
    scrollToY(target + e.deltaY * unit * CONFIG.wheelMultiplier);
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (dialog.open || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const page = vh * 0.85;
    const map = {
      ArrowUp: -CONFIG.keyStep, ArrowDown: CONFIG.keyStep,
      PageUp: -page, PageDown: page,
      ' ': e.shiftKey ? page : -page, // space ascends — the journey's forward direction
    };
    if (e.key === 'Home') { e.preventDefault(); return scrollToY(0); }
    if (e.key === 'End') { e.preventDefault(); return scrollToY(maxScroll); }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); return scrollToY(earthY); }
    if (e.key in map) {
      e.preventDefault();
      if (!animating) target = current = scrollY;
      scrollToY(target + map[e.key]);
    }
  });

  // Touch & scrollbar are native; stop any wheel animation when they start
  addEventListener('touchstart', () => { animating = false; }, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.target === root) animating = false; });

  function levelY(l, s) {
    if (l.flow) return l.top + Math.max(0, (l.h - vh) / 2) - Math.max(0, (vh - l.h) / 2); // centre the level
    const L = l.h - vh;
    return l.hell ? l.top + s * L : l.top + (1 - s) * L;
  }
  function goToLevel(i) {
    const l = byIndex[i];
    if (l) scrollToY(levelY(l, CONFIG.navTargetS));
  }
  navButtons.forEach((b, i) => b.addEventListener('click', () => goToLevel(i)));
  earthButton.addEventListener('click', () => scrollToY(earthY));
  document.querySelector('.brand')?.addEventListener('click', (e) => { e.preventDefault(); scrollToY(earthY); });
  main.querySelector('.intro__go--up').addEventListener('click', () => goToLevel(H));
  main.querySelector('.intro__go--down').addEventListener('click', () => goToLevel(H - 1));
  main.querySelectorAll('.return-btn').forEach((b) => b.addEventListener('click', () => scrollToY(earthY)));

  /* ------------------------------------------------------------------ */
  /*  Stars                                                              */
  /* ------------------------------------------------------------------ */

  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [], cw = 0, ch = 0, dpr = 1;

  function setupStars() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cw = innerWidth; ch = innerHeight;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = seeded(42);
    const n = Math.min(CONFIG.maxStars, Math.round(cw * ch * CONFIG.starDensity));
    stars = Array.from({ length: n }, () => ({
      x: R() * cw,
      y: R() * ch,
      z: 0.15 + R() * 0.85,
      r: 0.4 + R() * 1.2,
      tw: R() * Math.PI * 2,
      ts: 0.6 + R() * 1.8,
    }));
  }

  let starRGB = [255, 255, 255], starAlpha = 1, ember = 0, drift = 0;
  function drawStars(y, vel, time, dt) {
    drift += dt * 0.05 * ember; // embers rise beneath the Earth
    ctx.clearRect(0, 0, cw, ch);
    if (starAlpha <= 0.01) return;
    ctx.fillStyle = ctx.strokeStyle = `rgb(${starRGB[0]},${starRGB[1]},${starRGB[2]})`;
    const streak = clamp(vel, -90, 90);
    for (const s of stars) {
      const py = (((s.y - y * s.z * 0.22 - drift * (0.4 + s.z)) % ch) + ch) % ch;
      const px = ember ? s.x + Math.sin(time * 0.0012 * s.ts + s.tw) * 8 * ember : s.x;
      const tw = reduceMotion ? 1 : 0.55 + 0.45 * Math.sin(time * 0.001 * s.ts + s.tw);
      ctx.globalAlpha = starAlpha * tw * (0.35 + s.z * 0.65);
      const len = streak * s.z * 0.9;
      if (Math.abs(len) > 1.5) {
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + len);
        ctx.stroke();
      } else {
        const r = s.r * (1 + ember * 0.8);
        ctx.fillRect(px, py, r, r);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ */
  /*  Frame loop                                                         */
  /* ------------------------------------------------------------------ */

  let lastY = 0, lastTime = performance.now(), activeIdx = -1, smoothVel = 0, lastU = NaN;
  // Writing a custom property invalidates styles even when the value is the same,
  // and the sky/glow layers are full-screen repaints — so only write real changes.
  const written = {};
  function setVar(name, value) {
    if (written[name] === value) return;
    written[name] = value;
    root.style.setProperty(name, value);
  }

  function update(y) {
    const P = maxScroll ? 1 - y / maxScroll : 0; // 0 = lowest depth, 1 = Throne
    setVar('--P', P.toFixed(3));

    // Per-level progress → --s
    for (const l of levels) {
      let s, near;
      if (l.flow) {
        // stacked: how centred the picture is in the viewport (0 … 1 … 0)
        const mid = l.sTop + l.sH / 2 - y;
        s = clamp(1 - Math.abs(mid - vh / 2) / (vh / 2 + l.sH / 2), 0, 1);
        near = l.top - y < vh * 1.5 && l.top + l.h - y > -vh * 0.5;
      } else {
        const L = l.h - vh;
        const rectTop = l.top - y;
        // ascending levels: 0 = arrived from below; beneath the Earth: 0 = arrived from above
        s = l.hell ? -rectTop / L : 1 + rectTop / L;
        near = s > -0.8 && s < 1.8;
      }
      l.el.classList.toggle('is-near', near);
      if (!near) continue;
      const sv = Math.round(s * 1000) / 1000;
      if (sv !== l.lastS) {
        l.lastS = sv;
        l.el.style.setProperty('--s', sv);
        if (l.counter && !l.flow) updateCounter(l, sv);
      }
    }

    // Passages: brightest when centred
    for (const p of passages) {
      const mid = p.top + p.h / 2 - y;
      if (mid < -vh || mid > vh * 2) continue;
      const v = Math.round(clamp(1 - Math.abs(mid - vh / 2) / (vh * 0.5), 0, 1) * 1000) / 1000;
      if (v !== p.lastV) { p.lastV = v; p.el.style.setProperty('--v', v); }
    }

    // Opening screen: -1 = leaving upward, 0 = centred, 1 = leaving downward
    const span = Math.max(1, (introH - vh) / 2);
    const u = Math.round(clamp((y - earthY) / span, -1.6, 1.6) * 1000) / 1000;
    if (u !== lastU) { lastU = u; intro.style.setProperty('--u', u); intro.style.setProperty('--ua', Math.abs(u)); }

    // Floating level index at viewport centre (DATA index, fractional)
    const c = y + vh / 2;
    let f = 0;
    const n = DATA.length;
    const below = byIndex[H - 1], earthLevel = byIndex[H];
    if (H && c >= earthLevel.center && c <= earthCenter) f = H; // the opening screen keeps Makkah's night
    else if (H && c > earthCenter && c < below.center) f = H - (c - earthCenter) / (below.center - earthCenter);
    else if (c <= byIndex[n - 1].center) f = n - 1;
    else if (c >= byIndex[0].center) f = 0;
    else {
      for (let i = 0; i < n - 1; i++) {
        const a = byIndex[i].center, b = byIndex[i + 1].center; // b is above a
        if (c <= a && c >= b) { f = i + (a - c) / (a - b); break; }
      }
    }
    const i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), t = smooth(f - i0);
    const tq = Math.round(t * 48) / 48; // colour steps finer than the eye can see
    setVar('--sky-top', mix(skies[i0][0], skies[i1][0], tq));
    setVar('--sky-bot', mix(skies[i0][1], skies[i1][1], tq));
    const fa = f - H; // 0 = Makkah, negative = beneath the Earth
    setVar('--glow', clamp((fa - 7) / 5, 0, 1).toFixed(2));
    const depth = clamp(-(fa + 0.15), 0, 1); // the fire's glow from below
    setVar('--hell', (depth * (1 - clamp((-fa - H + 1.6) / 1.2, 0, 0.75))).toFixed(2));

    // Stars warm toward gold in the heights; beneath the Earth they become embers
    ember = depth;
    const warm = clamp((fa - 6) / 4, 0, 1);
    starRGB = ember
      ? [255, Math.round(lerp(255, 120, ember)), Math.round(lerp(255, 50, ember))]
      : [255, Math.round(lerp(255, 226, warm)), Math.round(lerp(255, 170, warm))];
    starAlpha = 1 - clamp((fa - 10.6) / 1.2, 0, 1);

    const onEarth = Math.abs(c - earthCenter) < Math.max(vh * 0.5, span);
    // Between the Earth and the first level beneath it, f blends toward Makkah's
    // index only so the sky can share its night; the journey itself is at the
    // Earth here — Makkah is reached only by going up.
    const belowEarth = H && c > earthCenter && f > H - 1;
    const idx = onEarth ? 'earth' : belowEarth ? (f > H - 0.5 ? 'earth' : H - 1) : Math.round(f);
    if (idx !== activeIdx) {
      (activeIdx === 'earth' ? earthButton : navButtons[activeIdx])?.removeAttribute('aria-current');
      (idx === 'earth' ? earthButton : navButtons[idx])?.setAttribute('aria-current', 'step');
      activeIdx = idx;
      const a = accents[idx === 'earth' ? H : idx];
      setVar('--nav-accent', `rgb(${a[0]},${a[1]},${a[2]})`);
      root.classList.toggle('is-light', idx !== 'earth' && DATA[idx].scene === 'arsh');
    }

    // Soundscape follows the same position
    const soundA = onEarth ? 'earth' : DATA[i0].id;
    const soundB = onEarth || belowEarth ? 'earth' : DATA[i1].id;
    window.SoundScape?.setPosition(soundA, soundB, t);
  }

  const smooth = (t) => t * t * (3 - 2 * t);

  function setCounter(l, steps) {
    l.counter.textContent = num(50 - steps * 5);
    l.pips.forEach((p, k) => p.classList.toggle('on', k < steps));
    l.counterSub.textContent = steps === 0 ? ui('enjoined') : steps < 9 ? (steps === 1 ? ui('return1') : ui('returns', { n: num(steps) })) : ui('fiveFifty');
  }
  function updateCounter(l, s) {
    setCounter(l, clamp(Math.floor((s - 0.3) / 0.045), 0, 9));
  }
  // Stacked mode: count down on its own once it comes into view
  function playCounter(l) {
    clearInterval(l.counterTimer);
    let steps = 0;
    setCounter(l, 0);
    l.counterTimer = setInterval(() => {
      setCounter(l, ++steps);
      if (steps >= 9) clearInterval(l.counterTimer);
    }, reduceMotion ? 0 : 420);
  }

  function frame(time) {
    const dt = Math.min(64, time - lastTime);
    lastTime = time;
    if (animating) {
      const k = 1 - Math.pow(1 - CONFIG.wheelEase, dt / 16.667);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.3) { current = target; animating = false; }
      window.scrollTo(0, current);
    } else {
      current = scrollY;
    }
    const vel = current - lastY;
    lastY = current;
    smoothVel += (vel - smoothVel) * 0.25;
    const moving = animating || Math.abs(vel) > 0.05 || Math.abs(smoothVel) > 0.05;
    if (moving || idleFrames < 2) update(current);
    idleFrames = moving ? 0 : idleFrames + 1;
    // still page: stars only need to twinkle, so every other frame is enough
    if (moving || idleFrames % 2 === 0) drawStars(current, smoothVel, time, dt);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /*  Boot: start on the Earth                                           */
  /* ------------------------------------------------------------------ */

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function startOnEarth() {
    relayout();
    const hash = location.hash.slice(1);
    const hashed = hash && levels.find((l) => l.el.id === hash);
    current = target = hashed ? clamp(levelY(hashed, CONFIG.navTargetS), 0, maxScroll) : earthY;
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('miraj-anchor') || 'null'); sessionStorage.removeItem('miraj-anchor'); } catch (_) { /* no storage */ }
    if (saved) {
      const l = saved.id && levels.find((x) => x.el.id === saved.id);
      const c = l ? l.top + saved.t * l.h : introTop + saved.t * introH;
      current = target = clamp(c - vh / 2, 0, maxScroll);
    }
    window.scrollTo(0, current);
    lastY = current;
  }

  // Keep the viewer anchored to the same point of the story across re-layouts
  function anchor() {
    const c = scrollY + vh / 2;
    const l = levels.find((x) => c >= x.top && c < x.top + x.h);
    return l ? { l, t: (c - l.top) / l.h } : { earth: true, t: (c - introTop) / introH };
  }
  // a serialisable anchor, for coming back after a language switch
  window.MirajNav = { anchor() { const a = anchor(); return { id: a.l ? a.l.el.id : null, t: a.t }; } };
  function restore(a) {
    const c = a.l ? a.l.top + a.t * a.l.h : introTop + a.t * introH;
    scrollToY(c - vh / 2, true);
  }

  let resizeRaf = 0, lastWidth = innerWidth;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      // Mobile URL-bar show/hide only changes height: re-measure, never jump
      if (innerWidth === lastWidth) { measure(); wake(); return; }
      lastWidth = innerWidth;
      const a = anchor();
      relayout();
      setupStars();
      restore(a);
    });
  });

  setupStars();
  startOnEarth();
  document.fonts?.ready.then(() => {
    const a = anchor();
    relayout();
    restore(a);
  });
  requestAnimationFrame((t) => { lastTime = t; root.classList.add('is-ready'); frame(t); });
});
