// js/modules/m02.js
export default function m02({ root, colors, complete }) {
  const ac = new AbortController();
  const { signal } = ac;

  // TEXT GRID
  const ROWS = 10;
  const COLS = 10;

  // RIGHT COLUMN
  const SIDE_ROWS = 15;

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

  // ===== TOAST / UI MESSAGES =====
  const TOAST_DURATION = 3000; // ⏱ doba zobrazení jedné hlášky
  const TOAST_GAP_MS = 120; // krátká mezera mezi hláškami ve frontě
  const TOAST_FONT_SIZE_1 = 44; // 🔠 první řádek
  const TOAST_FONT_SIZE_2 = 18; // 🔠 druhý řádek

  // Základní pool (používá se cyklicky)
  const TOAST_MESSAGES = [
    ["KA–BOOM!!!", "lov začíná"], // 0 (první vybarvení)
    ["COMBO", "dobrá trefa" ],
    ["HATTRICK", "vyplň lištu a odemkni prémiový obsah" ],
    ["SUPERSHOT", "jen tak dál" ],
    ["BULLSEYE", "už jen 10 zásahů" ],
    ["HO HO HO", "dokážeš ulovit své duchovní zvíře?" ],
    ["MEGASNIPER", "čistá práce" ],
    ["SURESHOT", "jsi v půli cesty k prémiovému obsahu" ],
    ["9OK", "carry on" ],
    ["10WARNING", "" ],
    ["11ERROR", "po odemčení prémiového obsahu poznáš své duchovní zvíře" ],
    ["12SYNC", "myslíš, že jsi hoden?" ],
    ["13GLITCH", "cíl se blíží, nepolevuj" ],
    ["14PING", "jsi připraven?" ],
  ];

  // Speciální hlášky
  const TOAST_FULL_RESET = ["OOOPS", "minul jsi"]; // klik na É při plném sloupci
  const TOAST_15_A = ["PRÉMIOVÝ OBSAH ODEMČEN", "duchovní zvíře bylo vypuštěno"]; // 15. čtverec – hláška 1
  const TOAST_15_B = ["LET´S HUNT", " "]; // 15. čtverec – hláška 2

  const SOURCE_TEXT_RAW = `My, občané České repuéblikyé év Čéééeécééhách, naéé Moravě a ve Slezsku,
v čase obnovy samostatného českého státu,éé
věrni všem dobrým tradicím dávné státnosti éézemí Koruny české i státnosti československé,
odhodláni budovat, chránit a rozvíjet Českou ééérepubliku
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
      @import url('https://fonts.googleapis.com/css2?family=Rubik+Burned&family=Rubik+Glitch&family=Rubik+Dirt&family=Share+Tech+Mono&family=IBM+Plex+Mono&display=swap');

      #m02{
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        position: relative;
      }

      #m02 .wrap{
        display: flex;
        align-items: flex-start;
        gap: 0;
      }

      /* ===== LEFT (10×10) ===== */
      #m02 .stage{
        position: relative;
        display: inline-block;
      }

      #m02 table{
        border-collapse: collapse;
        table-layout: fixed;
      }

      #m02 #m02_grid{
        width: 80vmin;
        height: 80vmin;
      }

      #m02 #m02_grid td{
        width: calc(80vmin / ${ROWS});
        height: calc(80vmin / ${ROWS});
        text-align: center;
        user-select: none;
        border: none;

        color: var(--primaryColor);
        font-size: calc((80vmin / ${ROWS}) * 0.62);
        line-height: 1;

        will-change: transform, letter-spacing, filter, opacity;
        cursor: default;
      }

      #m02 #m02_grid td.is-e{
        background: var(--secondaryColor);
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

      /* ===== RIGHT (15×1) ===== */
      #m02 #m02_side{
        height: 80vmin;
      }

      #m02 #m02_side td{
        width: calc(80vmin / ${SIDE_ROWS});
        height: calc(80vmin / ${SIDE_ROWS});
        border: none;
        padding: 0;
        background: transparent;

        transition: background 500ms cubic-bezier(.2,.8,.2,1);
      }

      #m02 #m02_side tr + tr td{
        border-top: 1px solid var(--primaryColor);
      }

      #m02 #m02_side.is-full{
        animation: m02_side_shake 0.18s infinite;
        transform-origin: center;
      }
      @keyframes m02_side_shake{
        0%{transform:translate(0,0) rotate(0deg)}
        10%{transform:translate(-2px,1px) rotate(-1deg)}
        20%{transform:translate(2px,-1px) rotate(1deg)}
        30%{transform:translate(-3px,2px) rotate(-1.2deg)}
        40%{transform:translate(3px,-2px) rotate(1.2deg)}
        50%{transform:translate(-2px,-2px) rotate(-0.8deg)}
        60%{transform:translate(2px,2px) rotate(0.8deg)}
        70%{transform:translate(-3px,1px) rotate(-1deg)}
        80%{transform:translate(3px,-1px) rotate(1deg)}
        90%{transform:translate(-1px,2px) rotate(-0.6deg)}
        100%{transform:translate(0,0) rotate(0deg)}
      }

      #m02 #m02_side td.is-top{
        will-change: background;
        animation: m02_side_blink 380ms ease-in-out infinite;
      }
      @keyframes m02_side_blink{
        0%, 100% { background: var(--secondaryColor); }
        50% {
          background: color-mix(in srgb, var(--primaryColor) 75%, transparent);
        }
      }

      /* =========================
         TOAST / UI HLÁŠKY
      ========================= */
      #m02_toast{
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate3d(-50%, -50%, 0);
        z-index: 99999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 180ms ease;
      }
      #m02_toast.is-visible{
        opacity: 1;
      }

      #m02_toast .toast-inner{
        padding: 22px 28px;
        border-radius: 18px;

        background: var(--secondaryColor);

        border: 2px solid var(--primaryColor);
        outline: 2px solid var(--primaryColor);
        outline-offset: 3px;

        transform: scale(0.92);
        will-change: transform;
        backface-visibility: hidden;

        box-shadow:
          0 20px 50px rgba(0,0,0,.35),
          inset 0 0 0 1px rgba(255,255,255,.05);
      }

      #m02_toast.is-visible .toast-inner{
        animation: m02_toast_bounce 420ms cubic-bezier(.2,.8,.2,1);
      }

      @keyframes m02_toast_bounce{
        0%   { transform: scale(0.92); }
        60%  { transform: scale(1.06); }
        80%  { transform: scale(0.985); }
        100% { transform: scale(1); }
      }

      #m02_toast h1{
        margin: 0;
        padding: 0;
        font-size: ${TOAST_FONT_SIZE_1}px;
        line-height: 1;
        color: var(--primaryColor);
        text-align: center;
        font-style: normal;
        text-shadow:
          0 2px 6px rgba(0,0,0,.45),
          0 0 12px rgba(0,0,0,.25);
      }

      #m02_toast p{
        margin: 6px 0 0;
        padding: 0;
        font-size: ${TOAST_FONT_SIZE_2}px;
        color: var(--primaryColor);
        opacity: .85;
        text-align: center;
        font-style: italic;
        letter-spacing: .02em;
        text-shadow:
          0 1px 4px rgba(0,0,0,.4);
      }
    </style>

    <div id="m02">
      <div class="wrap">
        <div class="stage">
          <table id="m02_grid" aria-label="Letter grid"></table>
          <svg class="overlay" id="m02_overlay" aria-hidden="true"></svg>
        </div>

        <table id="m02_side" aria-label="Side column"></table>
      </div>

      <div id="m02_toast" aria-live="polite">
        <div class="toast-inner">
          <h1></h1>
          <p></p>
        </div>
      </div>
    </div>
  `;

  const table = root.querySelector("#m02_grid");
  const overlay = root.querySelector("#m02_overlay");
  const sideTable = root.querySelector("#m02_side");
  const toastEl = root.querySelector("#m02_toast");
  const toastH1 = toastEl?.querySelector("h1");
  const toastP = toastEl?.querySelector("p");

  if (!table || !overlay || !sideTable || !toastEl || !toastH1 || !toastP) {
    return () => ac.abort();
  }

  // random start cell in 10×10 grid
  let cellIdx = Math.floor(Math.random() * (ROWS * COLS));
  let textIdx = 0;

  const startTime = performance.now();

  // disabled cells (skipped forever) – jen pro 10×10 grid
  const disabled = new Set(); // "r,c"
  const keyOf = (r, c) => `${r},${c}`;

  // ===== TOAST QUEUE =====
  let toastTimer = null;
  let toastGapTimer = null;
  let toastIsShowing = false;
  const toastQueue = []; // { title, sub, duration }

  function pickFirstLineFont() {
    return FONTS[Math.floor(Math.random() * FONTS.length)];
  }

  function applyToastContent(title, sub) {
    toastH1.textContent = title;
    toastP.textContent = sub;

    // první řádek náhodně jedním fontem z tabulky
    toastH1.style.fontFamily = pickFirstLineFont();
    // druhý řádek konzistentní
    toastP.style.fontFamily = "'IBM Plex Mono', monospace";
  }

  function runNextToastFromQueue() {
    if (toastIsShowing) return;
    const next = toastQueue.shift();
    if (!next) return;

    toastIsShowing = true;
    applyToastContent(next.title, next.sub);
    toastEl.classList.add("is-visible");

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");

      if (toastGapTimer) window.clearTimeout(toastGapTimer);
      toastGapTimer = window.setTimeout(() => {
        toastIsShowing = false;
        runNextToastFromQueue();
      }, TOAST_GAP_MS);
    }, next.duration);
  }

  function enqueueToast(title, sub, duration = TOAST_DURATION) {
    toastQueue.push({ title, sub, duration });
    runNextToastFromQueue();
  }

  function enqueueToastFromPoolByCount(count) {
    // count = 1..15 (po přidání)
    if (count === 1) {
      // první vybarvení = Ka–boom (pevně)
      const m = TOAST_MESSAGES[0];
      enqueueToast(m[0], m[1]);
      return;
    }

    // pro ostatní si vezmeme cyklicky z poolu (kromě [0])
    const pool = TOAST_MESSAGES.slice(1);
    const idx = (count - 2) % pool.length;
    const m = pool[idx];
    enqueueToast(m[0], m[1]);
  }

  // ===== RIGHT COLUMN STATE =====
  const sideCells = new Array(SIDE_ROWS);
  let sideFilled = 0; // 0..SIDE_ROWS

  // reset animace
  let isResettingSide = false;
  const RESET_STEP_MS = 60;
  const resetTimers = new Set();

  function clearResetTimers() {
    for (const id of resetTimers) window.clearTimeout(id);
    resetTimers.clear();
  }

  function animateResetSideTopToBottom() {
    if (isResettingSide) return;
    isResettingSide = true;

    // okamžitě zruš shake
    sideTable.classList.remove("is-full");

    // během resetu nic neklikat a žádné blikání
    for (const td of sideCells) {
      if (!td) continue;
      td.classList.remove("is-top");
      td.style.pointerEvents = "none";
      td.style.cursor = "default";
      td.dataset.active = "0";
    }

    clearResetTimers();

    // odbarvuj shora dolů (0 -> 14)
    for (let i = 0; i < SIDE_ROWS; i++) {
      const id = window.setTimeout(() => {
        const td = sideCells[i];
        if (!td) return;
        td.style.background = "transparent";
        td.dataset.filled = "0";
      }, i * RESET_STEP_MS);
      resetTimers.add(id);
    }

    // po doběhnutí nastav stav = 0 a překresli
    const doneId = window.setTimeout(() => {
      sideFilled = 0;
      isResettingSide = false;
      renderSide();
    }, SIDE_ROWS * RESET_STEP_MS + 40);

    resetTimers.add(doneId);
  }

  function renderSide() {
    const isFull = sideFilled >= SIDE_ROWS;
    sideTable.classList.toggle("is-full", isFull);

    // nejhořejší vyplněný index (0..14), nebo -1
    const topIndex = sideFilled > 0 ? SIDE_ROWS - sideFilled : -1;

    // jen pokud sloupec NENÍ plný
    const allowTopInteraction = topIndex !== -1 && !isFull;

    for (let i = 0; i < SIDE_ROWS; i++) {
      const td = sideCells[i];
      if (!td) continue;

      const shouldBeOn = i >= SIDE_ROWS - sideFilled;
      td.style.background = shouldBeOn ? "var(--primaryColor)" : "transparent";
      td.dataset.filled = shouldBeOn ? "1" : "0";

      td.classList.remove("is-top");
      td.dataset.active = "0";
      td.style.pointerEvents = "none";
      td.style.cursor = "default";

      if (allowTopInteraction && i === topIndex) {
        td.classList.add("is-top");
        td.dataset.active = "1";
        td.style.pointerEvents = "auto";
        td.style.cursor = "pointer";
      }
    }
  }

  function advanceSideByOne() {
    if (isResettingSide) return;

    // když je plno a přijde další É:
    // 1) ukázat speciální hlášku
    // 2) pak reset animace
    if (sideFilled >= SIDE_ROWS) {
      enqueueToast(TOAST_FULL_RESET[0], TOAST_FULL_RESET[1]);
      animateResetSideTopToBottom();
      return;
    }

    const prev = sideFilled;
    sideFilled = Math.min(SIDE_ROWS, sideFilled + 1);
    renderSide();

    const now = sideFilled;

    // 🔧 ÚPRAVA:
    // když právě doplňujeme 15. čtverec (poslední É před zaplněním),
    // nepouštěj "normální" hlášku z poolu — rovnou jen speciální dvě.
    if (prev === SIDE_ROWS - 1 && now === SIDE_ROWS) {
      enqueueToast(TOAST_15_A[0], TOAST_15_A[1]);
      enqueueToast(TOAST_15_B[0], TOAST_15_B[1]);
      return;
    }

    // jinak standardní hláška po přidání čtverce
    enqueueToastFromPoolByCount(now);
  }

  // ===== polyline path (jen nad levým gridem) =====
  const ePathCells = [];
  let polyline = null;

  function ensurePolyline() {
    if (polyline) return;
    polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "var(--secondaryColor)");
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
      x: tdRect.left - tableRect.left + tdRect.width / 2,
      y: tdRect.top - tableRect.top + tdRect.height / 2,
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

    td.classList.remove("shake", "is-e");
    td.style.backgroundColor = "";
    td.style.cursor = "default";

    if (ch === "É") {
      td.textContent = "É";
      td.classList.add("shake", "is-e");
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
      if (Math.random() < 0.3 + 0.7 * progress) td.style.fontFamily = randomFont();

      const isShaking = td.classList.contains("shake");

      const amp = 0.2 + progress * 3.2;
      const rot = (Math.random() - 0.5) * (progress * 6);
      const dx = (Math.random() - 0.5) * 2 * amp;
      const dy = (Math.random() - 0.5) * 2 * amp;
      const sc = 1 + (Math.random() - 0.5) * (progress * 0.10);

      if (!isShaking) {
        td.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sc})`;
      }

      const ls = Math.random() < 0.2 + 0.6 * progress ? (Math.random() - 0.5) * progress * 0.5 : 0;
      td.style.letterSpacing = `${ls}em`;

      const blur = Math.random() < 0.15 + 0.55 * progress ? Math.random() * progress * 1.5 : 0;

      const contrast = 1 + (Math.random() - 0.5) * progress * 0.8;
      const saturate = 1 + (Math.random() - 0.5) * progress * 1.2;
      td.style.filter = `blur(${blur}px) contrast(${contrast}) saturate(${saturate})`;

      const op = 1 - Math.random() * progress * 0.35;
      td.style.opacity = `${op}`;
    }
  }

  // ===== build LEFT 10×10 =====
  for (let r = 0; r < ROWS; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < COLS; c++) {
      const td = document.createElement("td");
      td.textContent = randomLetter();
      td.style.fontFamily = randomFont();
      td.dataset.r = String(r);
      td.dataset.c = String(c);

      td.addEventListener(
        "click",
        () => {
          const rr = Number(td.dataset.r);
          const cc = Number(td.dataset.c);
          const k = keyOf(rr, cc);

          if (!td.classList.contains("is-e")) return;

          // vyřadit buňku
          disabled.add(k);

          td.textContent = "";
          td.classList.remove("shake", "is-e");
          td.style.backgroundColor = "";
          td.style.cursor = "default";
          td.style.filter = "";
          td.style.opacity = "";
          td.style.letterSpacing = "";
          td.style.transform = "";

          // 1) pravý sloupec – přidat / reset s animací (když byl plný)
          advanceSideByOne();

          // 2) náhodná změna primaryColor (správné API: randomizeOne)
          if (!isResettingSide) {
            colors?.randomizeOne?.("primary", { duration: 500 });
          }
        },
        { signal }
      );

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  // ===== build RIGHT 15×1 =====
  for (let r = 0; r < SIDE_ROWS; r++) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    tr.appendChild(td);
    sideTable.appendChild(tr);
    sideCells[r] = td;

    td.addEventListener(
      "click",
      () => {
        if (isResettingSide) return;
        if (td.dataset.active !== "1") return;

        colors?.rotate?.(1, { duration: 500 });

        sideFilled = Math.max(0, sideFilled - 1);
        renderSide();
      },
      { signal }
    );
  }

  renderSide();

  syncOverlaySize();
  ensurePolyline();

  const t1 = window.setInterval(writeTick, TEXT_INTERVAL);
  const t2 = window.setInterval(applyTypoDecay, DECAY_INTERVAL);

  const onResize = () => rebuildPolylineFromPath();
  window.addEventListener("resize", onResize, { signal });

  return () => {
    clearResetTimers();
    if (toastTimer) window.clearTimeout(toastTimer);
    if (toastGapTimer) window.clearTimeout(toastGapTimer);
    window.clearInterval(t1);
    window.clearInterval(t2);
    window.removeEventListener("resize", onResize);
    ac.abort();
  };
}
