// js/engine.js

import m01 from "./modules/m01.js";
import placeholder from "./modules/placeholder.js";
import m02 from "./modules/m02.js";

const DEV_UI = true; // v ostré verzi false

const ALL_MODULES = [
  { id: "m01", fn: m01 }, // vždy první
  { id: "ph001", fn: placeholder }, // další náhodně (neopakují se)
  { id: "m02", fn: m02 },
];

// localStorage keys
const LS_ORDER = "laborator_order_v1";
const LS_INDEX = "laborator_index_v1";
const LS_COLORS = "laborator_colors_v1";

// Default barvy projektu
const DEFAULT_COLORS = {
  primary: "#5fffbf",
  secondary: "#000000",
  tertiary: "#ffffff",
};

export function startLaborator() {
  const app = document.getElementById("app");
  if (!app) throw new Error('Chybí <div id="app"></div>');

  app.innerHTML = "";

  // Color controller (globální stav barev) — plynulá animace CSS vars
  const colors = createColorsController({ duration: 500 });

  // Dev reset button (globální)
  if (DEV_UI) {
    const old = document.getElementById("dev-reset");
    if (old) old.remove();

    const btn = createDevResetButton(() => {
      resetProgress();
      window.location.reload();
    });
    btn.id = "dev-reset";
    document.body.appendChild(btn);
  }

  // Globální rušič (nad vším)
  startGlobalDisturber();

  const order = getOrCreateOrder(ALL_MODULES);

  // DEV: přepínač modulů
  if (DEV_UI) {
    createDevModuleSwitcher(order);
  }

  // activeIndex = index aktuálního modulu (0 = první)
  let activeIndex = getStoredIndex();

  // pojistky
  if (activeIndex < 0) activeIndex = 0;
  if (activeIndex >= order.length) activeIndex = 0;

  // vyrenderuj pouze aktivní modul (dokončené nemají být vidět)
  const activeSection = renderModule(app, order[activeIndex], {
    onComplete: (section) =>
      completeCurrent(order, activeIndex, app, colors, section),
    devCompleteEnabled: true,
    colors,
  });

  // scroll na aktivní
  if (activeSection) {
    activeSection.scrollIntoView({ behavior: "auto", block: "start" });
  }
}

function completeCurrent(order, activeIndex, app, colors, completedSection) {
  const nextIndex = activeIndex + 1;

  // dokončeny všechny -> reset + reload na začátek
  if (nextIndex >= order.length) {
    resetProgress();
    window.location.reload();
    return;
  }

  setStoredIndex(nextIndex);

  // vyrenderuj další modul
  const nextSection = renderModule(app, order[nextIndex], {
    onComplete: (section) =>
      completeCurrent(order, nextIndex, app, colors, section),
    devCompleteEnabled: true,
    colors,
  });

  // 1) scroll na další modul
  nextSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // 2) dokončený modul zmizí (remove po rozjezdu scrollu)
  if (completedSection && completedSection.isConnected) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => completedSection.remove(), 250);
      });
    });
  }
}

function getOrCreateOrder(all) {
  // zkus načíst
  const stored = safeParseJSON(localStorage.getItem(LS_ORDER));

  if (Array.isArray(stored) && stored.length) {
    // validace: všechny existují v ALL_MODULES
    const validIds = new Set(all.map((m) => m.id));
    const ok = stored.every((id) => validIds.has(id));

    // navíc: m01 musí být první (nebo obecně all[0])
    if (ok && stored[0] === all[0].id) {
      // mapni na {id, fn}
      return stored.map((id) => all.find((m) => m.id === id));
    }
  }

  // vytvoř nové pořadí
  const first = all[0];
  const rest = all.slice(1);
  shuffleInPlace(rest);
  const newOrder = [first, ...rest];

  localStorage.setItem(LS_ORDER, JSON.stringify(newOrder.map((m) => m.id)));
  localStorage.setItem(LS_INDEX, "0");

  return newOrder;
}

function getStoredIndex() {
  const raw = localStorage.getItem(LS_INDEX);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function setStoredIndex(n) {
  localStorage.setItem(LS_INDEX, String(n));
}

function resetProgress() {
  localStorage.removeItem(LS_ORDER);
  localStorage.removeItem(LS_INDEX);
  localStorage.removeItem(LS_COLORS);
}

function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderModule(app, mod, { onComplete, devCompleteEnabled, colors } = {}) {
  const section = document.createElement("section");
  section.dataset.module = mod.id;

  // Layout nech na CSS (base.css), tady jen pojistky:
  section.style.position = "relative";
  section.style.overflow = "hidden";

  const root = document.createElement("div");
  root.className = "module-root";
  root.style.height = "100%";
  root.style.width = "100%";
  root.style.position = "relative";
  root.style.overflow = "hidden";

  section.appendChild(root);

  // DEV: dokonči modul (jen u aktivního)
  if (DEV_UI && devCompleteEnabled && typeof onComplete === "function") {
    section.appendChild(createDevCompleteButton(() => onComplete(section)));
  }

  app.appendChild(section);

  // Spusť modul
  mod.fn({
    root,
    complete: () => onComplete?.(section),
    colors,
  });

  return section;
}

/* =======================
   COLOR CONTROLLER (plynulá rotace)
   - animuje změny přes CSS vars (pro celý projekt)
   - persistuje finální stav po doběhnutí animace
   - randomize umí HSL + minimální kontrast + minimální rozdíl odstínu
   ======================= */

function createColorsController({ duration = 500 } = {}) {
  // 1) načti z LS, nebo default
  const stored = safeParseJSON(localStorage.getItem(LS_COLORS));
  let state = normalizeColors(stored) || { ...DEFAULT_COLORS };

  // 2) aplikuj do CSS hned při startu
  applyColorsToCss(state);

  // 3) animace interně
  let raf = null;
  let animStart = 0;
  let animDur = duration;
  let fromRGB = null;
  let toRGB = null;
  let pendingPersist = false;

  const api = {
    get() {
      return { ...state };
    },

    // set(next, { duration, animate })
    set(next = {}, opts = {}) {
      const nextState = normalizeColors({ ...state, ...next }) || {
        ...DEFAULT_COLORS,
      };

      const dur = typeof opts.duration === "number" ? opts.duration : duration;
      const animate = opts.animate !== false && dur > 0;

      if (!animate) {
        cancelAnim();
        state = nextState;
        applyColorsToCss(state);
        persist();
        return api.get();
      }

      // animuj z aktuálně spočtených CSS vars (aby to sedělo i během běžící animace)
      const cssNow = readCssVars();
      const from = normalizeColors(cssNow) || state;

      startAnim(from, nextState, dur);
      state = nextState; // cíl je nová "pravda", ale persist až na konci
      return api.get();
    },

    reset(opts = {}) {
      return api.set({ ...DEFAULT_COLORS }, opts);
    },

    // HSL randomize + volitelný minimální kontrast + minimální "odlišnost"
    randomize(
      {
        primary = false,
        secondary = false,
        tertiary = false,
        ensureContrast = false,

        satRange = [0.65, 1.0],
        lightRange = [0.25, 0.85],

        // minimální rozdíl světlosti v HSL (jen rychlá pojistka)
        minLightDiff = 0.28,

        // minimální rozdíl odstínu (Hue) v ° — hlavní "odlišnost"
        minHueDiff = 80,

        // minimální kontrasty (doporučené pro 3 barevné barvy)
        minPS = 4.5,
        minST = 4.5,
        minPT = 4.5,

        // minimální rozdíl relativní luminance (extra pojistka proti "podobnosti")
        minLumDiff = 0.26,
      } = {},
      opts = {}
    ) {
      function randInRange([a, b]) {
        return a + Math.random() * (b - a);
      }

      function genHsl() {
        return {
          h: Math.random() * 360,
          s: randInRange(satRange),
          l: randInRange(lightRange),
        };
      }

      function tooCloseL(a, b) {
        return Math.abs(a.l - b.l) < minLightDiff;
      }

      function hueDist(a, b) {
        const d = Math.abs(a.h - b.h) % 360;
        return Math.min(d, 360 - d);
      }
	  
	  function findColorAgainstBoth({ againstA, againstB, min, tries }) {
		for (let i = 0; i < tries; i++) {
			const cand = hslToHex(
				Math.random() * 360,
				randInRange(satRange),
				randInRange(lightRange)
			);

			if (contrastRatio(cand, againstA) >= min && contrastRatio(cand, againstB) >= min) {
				return cand;
			}
		}
		return null;
	  }


      // bez kontrastu = hezký HSL random, ale držíme minLightDiff + minHueDiff
      if (!ensureContrast) {
        const next = { ...state };

        let A = genHsl();
        let B = genHsl();
        let C = genHsl();

        let guard = 0;
        while (
          (tooCloseL(A, B) ||
            tooCloseL(B, C) ||
            tooCloseL(A, C) ||
            hueDist(A, B) < minHueDiff ||
            hueDist(B, C) < minHueDiff ||
            hueDist(A, C) < minHueDiff) &&
          guard++ < 200
        ) {
          B = genHsl();
          C = genHsl();
        }

        if (primary) next.primary = hslToHex(A.h, A.s, A.l);
        if (secondary) next.secondary = hslToHex(B.h, B.s, B.l);
        if (tertiary) next.tertiary = hslToHex(C.h, C.s, C.l);
        return api.set(next, opts);
      }

      // ensureContrast = generuj dokud neprojde kontrast + světlost + hue
      const maxTries = 1200;
      for (let i = 0; i < maxTries; i++) {
        const next = { ...state };

        // vždy generuj 3 HSL kandidáty (když nechceš měnit některou barvu, nastav primary/secondary/tertiary true)
        const A = genHsl();
        const B = genHsl();
        const C = genHsl();

        // 0) odlišnost odstínů
        if (
          hueDist(A, B) < minHueDiff ||
          hueDist(B, C) < minHueDiff ||
          hueDist(A, C) < minHueDiff
        )
          continue;

        // 0b) odlišnost světlosti v HSL
        if (tooCloseL(A, B) || tooCloseL(B, C) || tooCloseL(A, C)) continue;

        const hexP = hslToHex(A.h, A.s, A.l);
        const hexS = hslToHex(B.h, B.s, B.l);
        const hexT = hslToHex(C.h, C.s, C.l);

        // 1) kontrastní testy
        const ps = contrastRatio(hexP, hexS);
        const st = contrastRatio(hexS, hexT);
        const pt = contrastRatio(hexP, hexT);
        if (ps < minPS || st < minST || pt < minPT) continue;

        // 2) luminance distance (pojistka "podobnosti")
        const Lp = relLuminance(hexToRgb(hexP));
        const Ls = relLuminance(hexToRgb(hexS));
        const Lt = relLuminance(hexToRgb(hexT));
        if (
          Math.abs(Lp - Ls) < minLumDiff ||
          Math.abs(Ls - Lt) < minLumDiff ||
          Math.abs(Lp - Lt) < minLumDiff
        )
          continue;

        // prošlo -> zapiš (všechno barevné)
        next.primary = hexP;
        next.secondary = hexS;
        next.tertiary = hexT;

        return api.set(next, opts);
      }

      // fallback (stále barevné): zkus mírnější pravidla, ale zachovej hue rozdíl
      for (let i = 0; i < 1200; i++) {
        const next = { ...state };
        const A = genHsl();
        const B = genHsl();
        const C = genHsl();

        if (
          hueDist(A, B) < Math.max(50, minHueDiff - 20) ||
          hueDist(B, C) < Math.max(50, minHueDiff - 20) ||
          hueDist(A, C) < Math.max(50, minHueDiff - 20)
        )
          continue;

        const hexP = hslToHex(A.h, A.s, A.l);
        const hexS = hslToHex(B.h, B.s, B.l);
        const hexT = hslToHex(C.h, C.s, C.l);

        const ps = contrastRatio(hexP, hexS);
        const st = contrastRatio(hexS, hexT);
        const pt = contrastRatio(hexP, hexT);
        if (ps < 3.0 || st < 3.0 || pt < 3.0) continue;

        next.primary = hexP;
        next.secondary = hexS;
        next.tertiary = hexT;
        return api.set(next, opts);
      }

      // úplně poslední nouze: čistý HSL random (3 barevné, bez garancí)
      const next = { ...state };
      next.primary = hslToHex(Math.random() * 360, randInRange(satRange), randInRange(lightRange));
      next.secondary = hslToHex(Math.random() * 360, randInRange(satRange), randInRange(lightRange));
      next.tertiary = hslToHex(Math.random() * 360, randInRange(satRange), randInRange(lightRange));
      return api.set(next, opts);
    },
	
	// Vygeneruje JEDNU barvu tak, aby byla čitelná proti oběma zbylým barvám.
// Použití: colors.randomizeOneSafe("primary", { min: 4.5 })
randomizeOneSafe(which = "primary", opts = {}) {
  const cur = api.get();

  const key = String(which);
  if (key !== "primary" && key !== "secondary" && key !== "tertiary") {
    return cur;
  }

  const min = typeof opts.min === "number" ? opts.min : 2.0;
  const tries = typeof opts.tries === "number" ? opts.tries : 1200;

  // cílová barva má projít proti oběma ostatním
  const againstA = key === "primary" ? cur.secondary : cur.primary;
  const againstB = key === "tertiary" ? cur.secondary : cur.tertiary;

  // využijeme stejný "look" jako randomize: HSL v satRange/lightRange
  // ale dovolíme lokálně přebít rozsahy:
  const satR = Array.isArray(opts.satRange) ? opts.satRange : [0.65, 1.0];
  const lightR = Array.isArray(opts.lightRange) ? opts.lightRange : [0.25, 0.85];

  function randInRangeLocal([a, b]) {
    return a + Math.random() * (b - a);
  }

  let picked = null;

  const minSteps = [
    min,
    Math.min(min, 4.5),
    Math.min(min, 3.0),
    Math.min(min, 2.0),
  ];

  const ranges = [
    { sat: satR, light: lightR },
    {
      sat: [Math.max(0, satR[0] - 0.1), Math.min(1, satR[1] + 0.1)],
      light: [0.10, 0.93],
    },
    {
      sat: [0.35, 1.0],
      light: [0.05, 0.97],
    },
  ];

  for (const minTry of minSteps) {
    for (const rg of ranges) {
      for (let i = 0; i < tries; i++) {
        const cand = hslToHex(
          Math.random() * 360,
          randInRangeLocal(rg.sat),
          randInRangeLocal(rg.light)
        );

        if (
          contrastRatio(cand, againstA) >= minTry &&
          contrastRatio(cand, againstB) >= minTry
        ) {
          picked = cand;
          break;
        }
      }
      if (picked) break;
    }
    if (picked) break;
  }

  if (!picked) return cur;

  return api.set({ [key]: picked }, opts);

},


    // rotate(1): [p,s,t] -> [t,p,s]
    rotate(steps = 1, opts = {}) {
      let s = steps | 0;
      if (s === 0) return api.get();
      s = ((s % 3) + 3) % 3;

      let next = { ...state };

      if (s === 1) {
        const { primary: p, secondary: sec, tertiary: t } = state;
        next = { primary: t, secondary: p, tertiary: sec };
      } else if (s === 2) {
        const { primary: p, secondary: sec, tertiary: t } = state;
        next = { primary: sec, secondary: t, tertiary: p };
      }

      return api.set(next, opts);
    },
  };

  function persist() {
    localStorage.setItem(LS_COLORS, JSON.stringify(state));
  }

  function cancelAnim() {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    pendingPersist = false;
  }

  function startAnim(from, to, dur) {
    cancelAnim();

    animStart = performance.now();
    animDur = dur;

    fromRGB = {
      primary: hexToRgb(from.primary),
      secondary: hexToRgb(from.secondary),
      tertiary: hexToRgb(from.tertiary),
    };

    toRGB = {
      primary: hexToRgb(to.primary),
      secondary: hexToRgb(to.secondary),
      tertiary: hexToRgb(to.tertiary),
    };

    pendingPersist = true;

    const tick = (now) => {
      const t = clamp01((now - animStart) / animDur);
      const e = easeInOutCubic(t);

      const cur = {
        primary: rgbToHex(lerpRGB(fromRGB.primary, toRGB.primary, e)),
        secondary: rgbToHex(lerpRGB(fromRGB.secondary, toRGB.secondary, e)),
        tertiary: rgbToHex(lerpRGB(fromRGB.tertiary, toRGB.tertiary, e)),
      };

      applyColorsToCss(cur);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
        applyColorsToCss(state);
        if (pendingPersist) persist();
        pendingPersist = false;
      }
    };

    raf = requestAnimationFrame(tick);
  }

  function readCssVars() {
    const r = document.documentElement;
    const cs = getComputedStyle(r);
    return {
      primary: cs.getPropertyValue("--primaryColor").trim(),
      secondary: cs.getPropertyValue("--secondaryColor").trim(),
      tertiary: cs.getPropertyValue("--tertiaryColor").trim(),
    };
  }

  return api;
}

function applyColorsToCss({ primary, secondary, tertiary }) {
  const r = document.documentElement;
  r.style.setProperty("--primaryColor", primary);
  r.style.setProperty("--secondaryColor", secondary);
  r.style.setProperty("--tertiaryColor", tertiary);
}

function normalizeColors(obj) {
  if (!obj || typeof obj !== "object") return null;

  const primary = typeof obj.primary === "string" ? obj.primary : null;
  const secondary = typeof obj.secondary === "string" ? obj.secondary : null;
  const tertiary = typeof obj.tertiary === "string" ? obj.tertiary : null;

  if (!primary || !secondary || !tertiary) return null;

  const p = normalizeHex(primary);
  const s = normalizeHex(secondary);
  const t = normalizeHex(tertiary);
  if (!p || !s || !t) return null;

  return { primary: p, secondary: s, tertiary: t };
}

function normalizeHex(hex) {
  const h = (hex || "").trim();

  const m3 = h.match(/^#([0-9a-f]{3})$/i);
  if (m3) {
    const x = m3[1];
    return (
      "#" +
      x[0] +
      x[0] +
      x[1] +
      x[1] +
      x[2] +
      x[2]
    ).toLowerCase();
  }

  const m6 = h.match(/^#([0-9a-f]{6})$/i);
  if (m6) return ("#" + m6[1]).toLowerCase();

  return null;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex) || "#000000";
  const n = h.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }) {
  const rr = clamp255(Math.round(r)).toString(16).padStart(2, "0");
  const gg = clamp255(Math.round(g)).toString(16).padStart(2, "0");
  const bb = clamp255(Math.round(b)).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

function lerpRGB(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function clamp255(x) {
  return Math.max(0, Math.min(255, x));
}

/* =======================
   HSL + kontrast helpery
   ======================= */

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function hslToHex(h, s, l) {
  return rgbToHex(hslToRgb(h, s, l));
}

function relLuminance({ r, g, b }) {
  const srgb = [r, g, b]
    .map((v) => v / 255)
    .map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(hexA, hexB) {
  const a = relLuminance(hexToRgb(hexA));
  const b = relLuminance(hexToRgb(hexB));
  const L1 = Math.max(a, b);
  const L2 = Math.min(a, b);
  return (L1 + 0.05) / (L2 + 0.05);
}

/* =======================
   GLOBAL DISTURBER (rušič)
   - fixed SVG přes celý viewport
   - tvar se nehýbe; pohyb dělají jen 4 body polygonu
   - lineární (bez ease)
   - pattern: transparent bg, tečky = secondaryColor
   ======================= */

function startGlobalDisturber() {
  const old = document.getElementById("laborator-disturber");
  if (old) old.remove();

  const svgNS = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgNS, "svg");
  svg.id = "laborator-disturber";

  Object.assign(svg.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    zIndex: "9999999",
    pointerEvents: "none",
    opacity: "0.9",
    // mixBlendMode: "difference",
  });

  function setViewBox() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  setViewBox();

  const defs = document.createElementNS(svgNS, "defs");

  const pattern = document.createElementNS(svgNS, "pattern");
  pattern.id = "op_001_pattern_A";
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", "10");
  pattern.setAttribute("height", "10");
  pattern.setAttribute("patternTransform", "rotate(-36)");

  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", "7");
  dot.setAttribute("cy", "7");
  dot.setAttribute("r", "2");

  const style = document.createElementNS(svgNS, "style");
  style.textContent = `
    #laborator-disturber .opA-dot { fill: var(--secondaryColor); }
  `;
  dot.setAttribute("class", "opA-dot");

  pattern.appendChild(dot);
  defs.appendChild(pattern);
  svg.appendChild(defs);
  svg.appendChild(style);

  const poly = document.createElementNS(svgNS, "polygon");
  poly.setAttribute("fill", "url(#op_001_pattern_A)");
  poly.setAttribute("stroke", "none");
  svg.appendChild(poly);

  document.body.appendChild(svg);

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function setPoints(arr) {
    poly.setAttribute(
      "points",
      arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    );
  }

  let vw = window.innerWidth;
  let vh = window.innerHeight;

  function updateSize() {
    vw = Math.max(1, window.innerWidth);
    vh = Math.max(1, window.innerHeight);
    setViewBox();
  }
  window.addEventListener("resize", updateSize, { passive: true });

  // počáteční body
  let pts = [
    { x: vw * 0.5 - 80, y: vh * 0.5 - 60 },
    { x: vw * 0.5 + 60, y: vh * 0.5 - 20 },
    { x: vw * 0.5 - 40, y: vh * 0.5 + 70 },
    { x: vw * 0.5 + 90, y: vh * 0.5 + 60 },
  ];
  setPoints(pts);

  let rafMorph = null;

  let from = pts.map((p) => ({ ...p }));
  let target = makeTarget();
  let legMs = rand(3000, 4000);
  let legStart = performance.now();

  function makeTarget() {
    const pad = 40;
    const xMin = Math.max(0, pad);
    const yMin = Math.max(0, pad);
    const xMax = Math.max(xMin + 1, vw - pad);
    const yMax = Math.max(yMin + 1, vh - pad);

    return Array.from({ length: 4 }, () => ({
      x: rand(xMin, xMax),
      y: rand(yMin, yMax),
    }));
  }

  function startNewLeg(now) {
    from = pts.map((p) => ({ ...p }));
    target = makeTarget();
    legMs = rand(3000, 4000);
    legStart = now;
  }

  function morphTick(now) {
    const t = Math.min(1, (now - legStart) / legMs); // LINEÁRNĚ

    pts = from.map((p, i) => ({
      x: p.x + (target[i].x - p.x) * t,
      y: p.y + (target[i].y - p.y) * t,
    }));

    setPoints(pts);

    if (t >= 1) startNewLeg(now);
    rafMorph = requestAnimationFrame(morphTick);
  }

  rafMorph = requestAnimationFrame(morphTick);

  return () => {
    if (rafMorph) cancelAnimationFrame(rafMorph);
    window.removeEventListener("resize", updateSize);
    svg.remove();
  };
}

/* =======================
   DEV UI buttons + switcher
   ======================= */

function createDevCompleteButton(onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Dokonči modul";
  btn.addEventListener("click", onClick);

  btn.style.position = "absolute";
  btn.style.left = "12px";
  btn.style.bottom = "12px";
  btn.style.zIndex = "9999";
  btn.style.padding = "8px 10px";
  btn.style.borderRadius = "10px";
  btn.style.border = "1px solid rgba(0,0,0,0.25)";
  btn.style.background = "rgba(255,255,255,0.85)";
  btn.style.color = "#000";
  btn.style.cursor = "pointer";
  btn.style.userSelect = "none";
  btn.style.font =
    "12px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  btn.style.webkitTapHighlightColor = "transparent";

  return btn;
}

function createDevResetButton(onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Reset progress";
  btn.addEventListener("click", onClick);

  btn.style.position = "fixed";
  btn.style.left = "12px";
  btn.style.top = "12px";
  btn.style.zIndex = "99999";
  btn.style.padding = "8px 10px";
  btn.style.borderRadius = "10px";
  btn.style.border = "1px solid rgba(0,0,0,0.25)";
  btn.style.background = "rgba(255,255,255,0.85)";
  btn.style.color = "#000";
  btn.style.cursor = "pointer";
  btn.style.userSelect = "none";
  btn.style.font =
    "12px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  btn.style.webkitTapHighlightColor = "transparent";

  return btn;
}

function createDevModuleSwitcher(order) {
  const old = document.getElementById("dev-module-switcher");
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = "dev-module-switcher";

  Object.assign(wrap.style, {
    position: "fixed",
    left: "12px",
    top: "60px",
    zIndex: "99999",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(4px)",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.15)",
    font: "12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  });

  const activeIndex = getStoredIndex();

  order.forEach((mod, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = mod.id;

    Object.assign(btn.style, {
      padding: "6px 8px",
      borderRadius: "8px",
      border: "1px solid rgba(0,0,0,0.2)",
      background: "rgba(255,255,255,0.9)",
      cursor: "pointer",
      textAlign: "left",
      whiteSpace: "nowrap",
    });

    if (index === activeIndex) {
      btn.style.background = "var(--primaryColor)";
      btn.style.color = "#000";
      btn.style.fontWeight = "600";
    }

    btn.addEventListener("click", () => {
      localStorage.setItem(LS_INDEX, String(index));
      const app = document.getElementById("app");
      if (app) app.innerHTML = "";
      startLaborator();
    });

    wrap.appendChild(btn);
  });

  document.body.appendChild(wrap);
}
