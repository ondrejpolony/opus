// js/modules/m02.js
export default function m02({ root, colors, complete }) {
  const ac = new AbortController();
  const { signal } = ac;

  const ROWS = 12;
  const COLS = 12;
  const EXTRA_COLS = 1;
  const TOTAL_COLS = COLS + EXTRA_COLS; // 13

  const TEXT_INTERVAL = 200;
  const DECAY_INTERVAL = 30;
  const DECAY_RAMP_MS = 15000;

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const FONTS = [
    "'Rubik Burned', sans-serif",
    "'Rubik Glitch', sans-serif",
    "'Rubik Dirt', sans-serif",
    "'Share Tech Mono', monospace",
    "'IBM Plex Mono', monospace",
  ];

  const SOURCE_TEXT_RAW = `My, občané České republiky v Čechách, na Moravě a ve Slezsku,
v čase obnovy samostatného českého státu,
věrni všem dobrým tradicím dávné státnosti zemí Koruny české i státnosti československé,
odhodláni budovat, chránit a rozvíjet Českou republiku
v duchu nedotknutelných hodnot lidské důstojnosti a svobody
jako vlast rovnoprávných, svobodných občanů,
kteří jsou si vědomi svých povinností vůči druhým a zodpovědnosti vůči celku,
jako svobodný a demokratický stát, založený na úctě k lidským právům a na zásadách občanské společnosti,
jako součást rodiny evropských a světových demokracií,
odhodláni společně střežit a rozvíjet zděděné přírodní a kulturní, hmotné a duchovní bohatství,
odhodláni řídit se všemi osvědčenými principy právního státu,
prostřednictvím svých svobodně zvolených zástupců přijímáme tuto Ústavu České republiky`;

  const SOURCE_TEXT = SOURCE_TEXT_RAW.replace(/\s+/g, "").toUpperCase();

  root.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Rubik+Burned&family=Rubik+Glitch&family=Rubik+Dirt&family=Share+Tech+Mono&family=IBM+Plex+Mono:wght@400;700&display=swap');

      #m02{
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
      }

      #m02 .stage{
        position: relative;
        display: inline-block;
      }

      #m02 table{
  border-collapse: collapse;
  table-layout: fixed;

  /* výška = 90% kratší strany */
  height: 90vmin;

  /* šířka odpovídá počtu sloupců (13) */
  width: calc(90vmin * (${TOTAL_COLS} / ${ROWS}));
}

#m02 td{
  /* buňka je čtverec podle výšky */
  width: calc(90vmin / ${ROWS});
  height: calc(90vmin / ${ROWS});

  text-align: center;
  user-select: none;
  border: none;

  color: var(--secondaryColor);
  font-size: calc((90vmin / ${ROWS}) * 0.62);
  line-height: 1;

  will-change: transform, letter-spacing, filter, opacity;
  cursor: default;
}

/* pravý speciální sloupec */
#m02 td.m02-side{
  padding: 0;
  background: transparent;
}

/* linky mezi řádky v pravém sloupci */
#m02 td.m02-side{
  border-top: 1px solid var(--secondaryColor);
}
#m02 tr:first-child td.m02-side{
  border-top: none; /* první bez horní linky */
}

      #m02 td.is-e{
        background: var(--primaryColor);
        cursor: pointer;
      }

      #m02 svg.overlay{
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      #m02 .shake{
        animation: m02_shake 0.35s infinite;
      }
      @keyframes m02_shake{
        0%{transform:translate(0,0)}
        25%{transform:translate(-1px,1px)}
        50%{transform:translate(1px,-1px)}
        75%{transform:translate(-1px,-1px)}
        100%{transform:translate(0,0)}
      }
    </style>

    <div id="m02">
      <div class="stage">
        <table id="m02_grid" aria-label="Letter grid"></table>
        <svg class="overlay" id="m02_overlay" aria-hidden="true"></svg>
      </div>
    </div>
  `;

  const table = root.querySelector("#m02_grid");
  const overlay = root.querySelector("#m02_overlay");
  if (!table || !overlay) return () => ac.abort();

  // random start cell in grid
  let cellIdx = Math.floor(Math.random() * (ROWS * COLS));
  let textIdx = 0;

  const startTime = performance.now();

  // disabled cells (skipped forever)
  const disabled = new Set(); // "r,c"
  const keyOf = (r, c) => `${r},${c}`;

  // polyline path saved as list of cells for resize-safe rebuild
  const ePathCells = []; // [{r,c}]
  let polyline = null;
  
    // === pravý (13.) sloupec: postupné barvení odspodu ===
  const sideCells = new Array(ROWS);
  let sideFill = ROWS - 1; // začínáme úplně dole

  // === počítání kliků na É ===
  let eClicks = 0;

  function paintNextSideCell() {
    if (sideFill < 0) return; // už jsme došli nahoru
    const td = sideCells[sideFill];
    if (td) td.style.background = "var(--primaryColor)";
    sideFill -= 1;
  }


  function ensurePolyline() {
    if (polyline) return;
    polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "var(--primaryColor)"); // ✅ linka = primary
    polyline.setAttribute("stroke-width", "2");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    polyline.setAttribute("opacity", "0.9");
    overlay.appendChild(polyline);
  }

  function syncOverlaySize() {
    const rect = table.getBoundingClientRect();
    overlay.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  }

  function cellCenterByRC(r, c) {
    const tableRect = table.getBoundingClientRect();
    const td = table.rows[r]?.cells[c];
    if (!td) return null;
    const tdRect = td.getBoundingClientRect();
    return {
      x: (tdRect.left - tableRect.left) + tdRect.width / 2,
      y: (tdRect.top - tableRect.top) + tdRect.height / 2,
    };
  }

  function rebuildPolylineFromPath() {
    if (!polyline) return;
    syncOverlaySize();
    const pts = [];
    for (const p of ePathCells) {
      const center = cellCenterByRC(p.r, p.c);
      if (center) pts.push(`${center.x},${center.y}`);
    }
    polyline.setAttribute("points", pts.join(" "));
  }

  function addEToPath(r, c) {
    ensurePolyline();
    ePathCells.push({ r, c });
    rebuildPolylineFromPath();
  }

  function randomLetter() {
    return LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  function randomFont() {
    return FONTS[Math.floor(Math.random() * FONTS.length)];
  }
  function randomHex() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
  }

  function nextCharFromText() {
    const ch = SOURCE_TEXT[textIdx];
    textIdx = (textIdx + 1) % SOURCE_TEXT.length;
    return ch;
  }

  function setCellByLinearIndex(i, ch) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const k = keyOf(r, c);
    if (disabled.has(k)) return;

    const td = table.rows[r].cells[c];

    // reset E state
    td.classList.remove("shake", "is-e");
    td.style.backgroundColor = "";
    td.style.cursor = "default";

    if (ch === "É") {
      td.textContent = "É";
      td.classList.add("shake", "is-e");

      // souvislá linie: přidá bod
      addEToPath(r, c);
    } else {
      td.textContent = ch;
    }
  }

  function advanceToNextWritableCell() {
    const total = ROWS * COLS;
    let tries = 0;
    do {
      cellIdx = (cellIdx + 1) % total;
      const r = Math.floor(cellIdx / COLS);
      const c = cellIdx % COLS;
      if (!disabled.has(keyOf(r, c))) return;
      tries++;
    } while (tries < total);
  }

  function writeTick() {
    const total = ROWS * COLS;

    let tries = 0;
    while (tries < total) {
      const r = Math.floor(cellIdx / COLS);
      const c = cellIdx % COLS;
      if (!disabled.has(keyOf(r, c))) break;
      cellIdx = (cellIdx + 1) % total;
      tries++;
    }
    if (tries >= total) return;

    setCellByLinearIndex(cellIdx, nextCharFromText());
    advanceToNextWritableCell();
  }

  function applyTypoDecay() {
    const t = performance.now();
    const progress = Math.min(1, (t - startTime) / DECAY_RAMP_MS);
    const touches = 1 + Math.floor(progress * 6);

    for (let k = 0; k < touches; k++) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      const kk = keyOf(r, c);
      if (disabled.has(kk)) continue;

      const td = table.rows[r].cells[c];
      if (Math.random() < (0.3 + 0.7 * progress)) td.style.fontFamily = randomFont();

      const isShaking = td.classList.contains("shake");

      const amp = 0.2 + progress * 3.2;
      const rot = (Math.random() - 0.5) * (progress * 6);
      const dx = (Math.random() - 0.5) * 2 * amp;
      const dy = (Math.random() - 0.5) * 2 * amp;
      const sc = 1 + (Math.random() - 0.5) * (progress * 0.10);

      if (!isShaking) td.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sc})`;

      const ls = Math.random() < (0.2 + 0.6 * progress)
        ? (Math.random() - 0.5) * progress * 0.5
        : 0;
      td.style.letterSpacing = `${ls}em`;

      const blur = Math.random() < (0.15 + 0.55 * progress)
        ? Math.random() * progress * 1.5
        : 0;

      const contrast = 1 + (Math.random() - 0.5) * progress * 0.8;
      const saturate = 1 + (Math.random() - 0.5) * progress * 1.2;
      td.style.filter = `blur(${blur}px) contrast(${contrast}) saturate(${saturate})`;

      const op = 1 - Math.random() * progress * 0.35;
      td.style.opacity = `${op}`;
    }
  }

  // build grid
  for (let r = 0; r < ROWS; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < COLS; c++) {
  const td = document.createElement("td");
  td.textContent = randomLetter();
  td.style.fontFamily = randomFont();
  td.dataset.r = String(r);
  td.dataset.c = String(c);

  td.addEventListener("click", () => {
    const rr = Number(td.dataset.r);
    const cc = Number(td.dataset.c);
    const k = keyOf(rr, cc);

    if (!td.classList.contains("is-e")) return;

    disabled.add(k);

    td.textContent = "";
    td.classList.remove("shake", "is-e");
    td.style.backgroundColor = "";
    td.style.cursor = "default";
    td.style.filter = "";
    td.style.opacity = "";
    td.style.letterSpacing = "";
    td.style.transform = "";
	
	        // 1) obarvi další buňku v 13. sloupci (odspodu nahoru)
        paintNextSideCell();

        // počítání kliků na É
        eClicks += 1;


    // 2) náhodná změna barvy (primary)
if (colors) {
  if (typeof colors.randomize === "function") {
    colors.randomize({ primary: true }, { duration: 500 });
  } else if (typeof colors.set === "function") {
    colors.set({ primary: randomHex() }, { duration: 500 });
  } else {
    document.documentElement.style.setProperty("--primaryColor", randomHex());
  }
} else {
  document.documentElement.style.setProperty("--primaryColor", randomHex());
}

// 3) po každých 4 kliknutích na É rotace barev
if (colors && typeof colors.rotate === "function" && eClicks % 4 === 0) {
  colors.rotate(1, { duration: 500 });
}
  }, { signal });

  tr.appendChild(td);
}

/* ✅ extra pravý sloupec – bez textu, bez dataset, bez kliků */
const side = document.createElement("td");
side.className = "m02-side";
side.textContent = "";
tr.appendChild(side);

      // ✅ uložíme referenci (podle řádku r)
      sideCells[r] = side;

table.appendChild(tr);

  }

  syncOverlaySize();
  ensurePolyline();

  const t1 = window.setInterval(writeTick, TEXT_INTERVAL);
  const t2 = window.setInterval(applyTypoDecay, DECAY_INTERVAL);

  const onResize = () => rebuildPolylineFromPath();
  window.addEventListener("resize", onResize, { signal });

  return () => {
    window.clearInterval(t1);
    window.clearInterval(t2);
    window.removeEventListener("resize", onResize);
    ac.abort();
  };
}
