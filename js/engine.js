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

  // Color controller (globální stav barev) — teď s plynulou animací CSS vars
  const colors = createColorsController({ duration: 500 });

  // Dev reset button (globální)
  if (DEV_UI) {
    document.body.appendChild(
      createDevResetButton(() => {
        resetProgress();
        window.location.reload();
      })
    );
  }
  
  
  startGlobalDisturber();

  const order = getOrCreateOrder(ALL_MODULES);
  
   if (DEV_UI) {
    createDevModuleSwitcher(order);
  }

  // activeIndex = index aktuálního modulu (0 = první)
  let activeIndex = getStoredIndex();

  // pojistky
  if (activeIndex < 0) activeIndex = 0;
  if (activeIndex > order.length) activeIndex = 0;

  // Pokud už by byl za koncem (nemělo by nastat), reset
  if (activeIndex >= order.length) {
    resetProgress();
    window.location.reload();
    return;
  }

// vyrenderuj pouze aktivní modul (dokončené už nemají být vidět)
renderModule(app, order[activeIndex], {
  onComplete: (section) => completeCurrent(order, activeIndex, app, colors, section),
  devCompleteEnabled: true,
  colors,
});

  // scroll na aktivní (poslední)
  const lastSection = app.querySelector("section[data-module]:last-of-type");
  if (lastSection) lastSection.scrollIntoView({ behavior: "auto", block: "start" });
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
    onComplete: (section) => completeCurrent(order, nextIndex, app, colors, section),
    devCompleteEnabled: true,
    colors,
  });

  // 1) scroll na další modul
  nextSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // 2) dokončený modul zmizí (odstraníme z DOM až po rozjezdu scrollu)
  // Pozn.: čas je záměrně krátký, aby scroll „chytil“ nový section.
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

  // 👇 DŮLEŽITÉ: vracíme celý <section>, aby ho engine mohl později odstranit
  return section;
}

/* =======================
   COLOR CONTROLLER (plynulá rotace)
   - animuje změny přes CSS vars (pro celý projekt: pozadí, tečky, patterny, atd.)
   - persistuje finální stav po doběhnutí animace
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
      const nextState = normalizeColors({ ...state, ...next }) || { ...DEFAULT_COLORS };

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

    randomize({ primary = false, secondary = false, tertiary = false } = {}, opts = {}) {
      const next = { ...state };
      if (primary) next.primary = randomHex();
      if (secondary) next.secondary = randomHex();
      if (tertiary) next.tertiary = randomHex();
      return api.set(next, opts);
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

      // defaultně chceme 500ms (nebo duration z controlleru)
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
        // na konci nastav přesně cílový stav (kvůli zaokrouhlení) a persist
        applyColorsToCss(state);
        if (pendingPersist) persist();
        pendingPersist = false;
      }
    };

    raf = requestAnimationFrame(tick);
  }

  // okamžité přečtení aktuálních CSS vars
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

  // minimální "normalizace" na #RRGGBB (kvůli interpolaci)
  const p = normalizeHex(primary);
  const s = normalizeHex(secondary);
  const t = normalizeHex(tertiary);
  if (!p || !s || !t) return null;

  return { primary: p, secondary: s, tertiary: t };
}

function normalizeHex(hex) {
  const h = (hex || "").trim();

  // #rgb -> #rrggbb
  const m3 = h.match(/^#([0-9a-f]{3})$/i);
  if (m3) {
    const x = m3[1];
    return (
      "#" +
      x[0] + x[0] +
      x[1] + x[1] +
      x[2] + x[2]
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

function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}


function startGlobalDisturber() {
  // pojistka proti duplikaci
  const old = document.getElementById("laborator-disturber");
  if (old) old.remove();

  const svgNS = "http://www.w3.org/2000/svg";

  // Overlay SVG přes CELÝ viewport
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
    // mixBlendMode: "difference", // můžeš zapnout pro větší "rušení"
  });

  // viewBox = pixelové souřadnice okna (body létají po celé obrazovce)
  function setViewBox() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  setViewBox();

  // ---------- defs + pattern (transparentní bg, barva = secondaryColor) ----------
  const defs = document.createElementNS(svgNS, "defs");

  const pattern = document.createElementNS(svgNS, "pattern");
  pattern.id = "op_001_pattern_A";
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", "10");
  pattern.setAttribute("height", "10");
  pattern.setAttribute("patternTransform", "rotate(-36)");
  
    // transparentní pozadí: rect není potřeba vůbec (necháme pattern "prázdný")

  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", "7");
  dot.setAttribute("cy", "7");
  dot.setAttribute("r", "2");
  // 👇 barva patternu = secondaryColor z CSS proměnné
  dot.setAttribute("fill", "var(--secondaryColor)");

  pattern.appendChild(dot);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  // ---------- polygon ----------
  const poly = document.createElementNS(svgNS, "polygon");
  poly.setAttribute("fill", "url(#op_001_pattern_A)");
  poly.setAttribute("stroke", "none");
  svg.appendChild(poly);

  document.body.appendChild(svg);

  // ---------- helpers ----------
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }
  function setPoints(arr) {
    poly.setAttribute(
      "points",
      arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    );
  }

  // aktuální velikost viewportu (pro cíle bodů)
  let vw = window.innerWidth;
  let vh = window.innerHeight;

  function updateSize() {
    vw = Math.max(1, window.innerWidth);
    vh = Math.max(1, window.innerHeight);
    setViewBox();
  }

  window.addEventListener("resize", updateSize, { passive: true });

  // ---------- počáteční body ----------
  let pts = [
    { x: vw * 0.5 - 80, y: vh * 0.5 - 60 },
    { x: vw * 0.5 + 60, y: vh * 0.5 - 20 },
    { x: vw * 0.5 - 40, y: vh * 0.5 + 70 },
    { x: vw * 0.5 + 90, y: vh * 0.5 + 60 },
  ];
  setPoints(pts);

  // ---------- LINEÁRNÍ nekonečné morfování ----------
  // vždy nový target; žádná easing křivka, jen konstantní rychlost
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
    const t = Math.min(1, (now - legStart) / legMs); // 👈 LINEÁRNÍ t

    pts = from.map((p, i) => ({
      x: p.x + (target[i].x - p.x) * t,
      y: p.y + (target[i].y - p.y) * t,
    }));

    setPoints(pts);

    if (t >= 1) startNewLeg(now);
    rafMorph = requestAnimationFrame(morphTick);
  }

  rafMorph = requestAnimationFrame(morphTick);

  // cleanup
  return () => {
    if (rafMorph) cancelAnimationFrame(rafMorph);
    window.removeEventListener("resize", updateSize);
    svg.remove();
  };
}





/* =======================
   DEV UI buttons
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
  btn.style.font = "12px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
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
  btn.style.font = "12px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  btn.style.webkitTapHighlightColor = "transparent";

  return btn;
}

function createDevModuleSwitcher(order) {
  // pojistka proti duplicitě
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

    btn.addEventListener("click", () => {
      localStorage.setItem(LS_INDEX, String(index));
      // DOM čistíme natvrdo
      const app = document.getElementById("app");
      if (app) app.innerHTML = "";
      startLaborator();
    });

    wrap.appendChild(btn);
  });

  document.body.appendChild(wrap);
}

