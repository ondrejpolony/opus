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
      @import url('https://fonts.googleapis.com/css2?family=Rubik+Burned&family=Rubik+Glitch&family=Rubik+Dirt&family=Share+Tech+Mono&family=IBM+Plex+Mono&display=swap');

      #m02{
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
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

        /* vybarvování má plynout */
        transition: background 500ms cubic-bezier(.2,.8,.2,1);
      }

      /* linky mezi řádky v pravém sloupci */
      #m02 #m02_side tr + tr td{
        border-top: 1px solid var(--primaryColor);
      }

      /* sloupec plný -> zdivočelý shake */
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

      /* aktivní (nejhořejší vyplněný) bliká jemně */
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

      /* ===== TOAST UI (globální) ===== */
      .m02-toast{
        position: fixed;
        left: 50%;
        top: 45%;
        transform: translate(-50%, -50%) scale(0.92);
        opacity: 0;
        z-index: 10000000;
        pointer-events: none;

        transition:
          opacity 300ms ease,
          transform 300ms cubic-bezier(.2,.8,.2,1);
      }

      .m02-toast.is-visible{
  opacity: 1;
  animation: m02_toast_bounce 420ms cubic-bezier(.2,.8,.2,1);
}


      .m02-toast.is-leaving{
        opacity: 0;
        transform: translate(-50%, -60%) scale(0.96);
      }

      .m02-toast .toast-inner{
        padding: 22px 28px;
        border-radius: 18px;

        /* vyplněné pozadí */
        background: var(--secondaryColor);
        color: var(--primaryColor);

        /* dvojitý outline + “UI depth” */
        box-shadow:
          0 0 0 2px var(--primaryColor),
          0 0 0 6px var(--secondaryColor),
          0 16px 40px rgba(0,0,0,0.35);
      }

      .m02-toast .toast-title{
        font-family: var(--toast-font, monospace);
        font-weight: 700;
        font-style: normal; /* 🔧 první řádek NE italic */
        font-size: 40px;
        letter-spacing: 0.02em;
        text-align: center;

        text-shadow:
          0 2px 0 rgba(0,0,0,0.6),
          0 6px 12px rgba(0,0,0,0.4);
      }

      .m02-toast .toast-sub{
        margin-top: 6px;
        font-family: 'TT Autonomous Mono', var(--toast-font, monospace);
        font-weight: 400;
        font-style: italic;
        font-size: 18px;
        opacity: 0.88;
        text-align: center;

        text-shadow:
          0 1px 0 rgba(0,0,0,0.55);
      }
	  
	  @keyframes m02_toast_bounce{
  0% {
    transform: translate(-50%, -50%) scale(0.85);
  }
  60% {
    transform: translate(-50%, -50%) scale(1.05);
  }
  80% {
    transform: translate(-50%, -50%) scale(0.98);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
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
    </div>
  `;

  const table = root.querySelector("#m02_grid");
  const overlay = root.querySelector("#m02_overlay");
  const sideTable = root.querySelector("#m02_side");
  if (!table || !overlay || !sideTable) return () => ac.abort();

  // random start cell in 10×10 grid
  let cellIdx = Math.floor(Math.random() * (ROWS * COLS));
  let textIdx = 0;

  const startTime = performance.now();

  // disabled cells (skipped forever) – jen pro 10×10 grid
  const disabled = new Set(); // "r,c"
  const keyOf = (r, c) => `${r},${c}`;

  // ===== TOAST MESSAGES =====
  const MESSAGE_FONTS = [...FONTS];

  const MESSAGES = [
    { title: "KA–BOOM!!!", sub: "system destabi lizeddestabi lizeddest abilizeddestabilized" },
    { title: "WARNING", sub: "feedback loop detected" },
    { title: "ERROR", sub: "symbol overflow" },
    { title: "SYNC", sub: "re-calibrating grid" },
    { title: "GLITCH", sub: "noise injected" },
    { title: "PING", sub: "state updated" },
    { title: "ALERT", sub: "unusual pattern found" },
    { title: "TRACE", sub: "path extended" },
    { title: "OK", sub: "carry on" },
  ];

  let toastEl = null;
  const toastTimers = new Set();

  function clearToastTimers() {
    for (const id of toastTimers) window.clearTimeout(id);
    toastTimers.clear();
  }

  function randomMessageFont() {
    return MESSAGE_FONTS[Math.floor(Math.random() * MESSAGE_FONTS.length)];
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMessage({ title, subtitle, fontFamily, duration = 3000 }) {
    if (toastEl && toastEl.isConnected) toastEl.remove();

    const el = document.createElement("div");
    el.className = "m02-toast";
    el.style.setProperty("--toast-font", fontFamily || "monospace");

    el.innerHTML = `
      <div class="toast-inner">
        <div class="toast-title">${escapeHtml(title || "")}</div>
        <div class="toast-sub">${escapeHtml(subtitle || "")}</div>
      </div>
    `;

    document.body.appendChild(el);
    toastEl = el;

    // entry
    requestAnimationFrame(() => el.classList.add("is-visible"));

    // exit
    const t1 = window.setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.remove("is-visible");
      el.classList.add("is-leaving");
    }, duration);
    toastTimers.add(t1);

    const t2 = window.setTimeout(() => {
      if (el.isConnected) el.remove();
      if (toastEl === el) toastEl = null;
    }, duration + 520);
    toastTimers.add(t2);
  }

  function showMessageForCount(n) {
    // n = nová hodnota sideFilled (1..SIDE_ROWS)
    const pick = MESSAGES[(n - 1) % MESSAGES.length];
    showMessage({
      title: pick.title,
      subtitle: pick.sub,
      fontFamily: randomMessageFont(),
      duration: 2000,
    });
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

    // když je plno a přijde další É -> animovaný reset do 0 (NE na 1)
    if (sideFilled >= SIDE_ROWS) {
      animateResetSideTopToBottom();
      return;
    }

    sideFilled = Math.min(SIDE_ROWS, sideFilled + 1);
    renderSide();

    // 🔥 po každém přibývajícím čtverci hláška (pracovně 3000ms)
    showMessageForCount(sideFilled);
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

      if (!isShaking) td.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sc})`;

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
    clearToastTimers();
    if (toastEl && toastEl.isConnected) toastEl.remove();

    window.clearInterval(t1);
    window.clearInterval(t2);
    window.removeEventListener("resize", onResize);
    ac.abort();
  };
}
