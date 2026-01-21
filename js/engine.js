import m01 from "./modules/m01.js";
import placeholder from "./modules/placeholder.js";
import m02 from "./modules/m02.js";

const DEV_UI = true; // v ostré verzi false

const ALL_MODULES = [
  { id: "m01", fn: m01 },             // vždy první
  { id: "ph001", fn: placeholder },   // další náhodně (neopakují se)
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

  // Color controller (globální stav barev)
  const colors = createColorsController();

  // Dev reset button (globální)
  if (DEV_UI) {
    document.body.appendChild(
      createDevResetButton(() => {
        resetProgress();
        window.location.reload();
      })
    );
  }

  const order = getOrCreateOrder(ALL_MODULES);

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

  // vyrenderuj všechny doposud "odkryté" moduly: 0..activeIndex
  for (let i = 0; i <= activeIndex; i++) {
    const isLast = i === activeIndex;

    renderModule(app, order[i], {
      onComplete: isLast ? () => completeCurrent(order, activeIndex, app, colors) : null,
      devCompleteEnabled: isLast, // dokončovací tlačítko jen na aktivním modulu
      colors,
    });
  }

  // scroll na aktivní (poslední)
  const lastSection = app.querySelector("section[data-module]:last-of-type");
  if (lastSection) lastSection.scrollIntoView({ behavior: "auto", block: "start" });
}

function completeCurrent(order, activeIndex, app, colors) {
  const nextIndex = activeIndex + 1;

  // dokončeny všechny -> reset + reload na začátek
  if (nextIndex >= order.length) {
    resetProgress();
    window.location.reload();
    return;
  }

  setStoredIndex(nextIndex);

  // vyrenderuj další modul a scrollni na něj
  renderModule(app, order[nextIndex], {
    onComplete: () => completeCurrent(order, nextIndex, app, colors),
    devCompleteEnabled: true,
    colors,
  });

  const lastSection = app.querySelector("section[data-module]:last-of-type");
  if (lastSection) lastSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getOrCreateOrder(all) {
  // zkus načíst
  const stored = safeParseJSON(localStorage.getItem(LS_ORDER));

  if (Array.isArray(stored) && stored.length) {
    // validace: všechny existují v ALL_MODULES
    const validIds = new Set(all.map(m => m.id));
    const ok = stored.every(id => validIds.has(id));

    // navíc: m01 musí být první (nebo obecně all[0])
    if (ok && stored[0] === all[0].id) {
      // mapni na {id, fn}
      return stored.map(id => all.find(m => m.id === id));
    }
  }

  // vytvoř nové pořadí
  const first = all[0];
  const rest = all.slice(1);
  shuffleInPlace(rest);
  const newOrder = [first, ...rest];

  localStorage.setItem(LS_ORDER, JSON.stringify(newOrder.map(m => m.id)));
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
  try { return JSON.parse(s); } catch { return null; }
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
    section.appendChild(createDevCompleteButton(() => onComplete()));
  }

  app.appendChild(section);

  // Spusť modul
  mod.fn({
    root,
    complete: () => onComplete?.(),
    colors, // 👈 tady je to důležité
  });
}

/* =======================
   COLOR CONTROLLER
   ======================= */

function createColorsController() {
  // 1) načti z LS, nebo default
  const stored = safeParseJSON(localStorage.getItem(LS_COLORS));
  let state = normalizeColors(stored) || { ...DEFAULT_COLORS };

  // 2) aplikuj do CSS hned při startu
  applyColorsToCss(state);

  // 3) API
  const api = {
    get() {
      return { ...state };
    },

    set(next = {}) {
      state = normalizeColors({ ...state, ...next }) || { ...DEFAULT_COLORS };
      applyColorsToCss(state);
      persist();
      return api.get();
    },

    reset() {
      state = { ...DEFAULT_COLORS };
      applyColorsToCss(state);
      persist();
      return api.get();
    },

    randomize({ primary = false, secondary = false, tertiary = false } = {}) {
      const next = { ...state };
      if (primary) next.primary = randomHex();
      if (secondary) next.secondary = randomHex();
      if (tertiary) next.tertiary = randomHex();
      return api.set(next);
    },

    // rotate(1): primary→secondary→tertiary→primary
    // prakticky: [p,s,t] -> [t,p,s]
    rotate(steps = 1) {
      let s = steps | 0;
      if (s === 0) return api.get();

      // normalizace na rozsah 0..2
      s = ((s % 3) + 3) % 3;

      if (s === 1) {
        const { primary: p, secondary: sec, tertiary: t } = state;
        return api.set({ primary: t, secondary: p, tertiary: sec });
      }

      if (s === 2) {
        // rotace o 2 je totéž jako -1
        const { primary: p, secondary: sec, tertiary: t } = state;
        return api.set({ primary: sec, secondary: t, tertiary: p });
      }

      return api.get();
    },
  };

  function persist() {
    localStorage.setItem(LS_COLORS, JSON.stringify(state));
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
  return { primary, secondary, tertiary };
}

function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
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
