// js/modules/m01.js

export default function m01({ root /*, complete */ }) {
  const patternId = `m01__dots`;

  root.innerHTML = `
    <style>
      /* Lokální styly jen pro tento modul */
      .m01-eye {
        fill: var(--primaryColor);
        transition:
          r 500ms cubic-bezier(.2,.8,.2,1),
          fill 500ms cubic-bezier(.2,.8,.2,1);
        cursor: grab;
      }
      .m01-eye.is-hover {
        fill: var(--secondaryColor);
      }

      #m01_B {
        transition: fill 500ms cubic-bezier(.2,.8,.2,1);
        cursor: grab;
      }
    </style>

    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style="display:block;width:100%;height:100%;touch-action:none;">

      <defs>
        <pattern
          id="${patternId}"
          patternUnits="userSpaceOnUse"
          width="1.2"
          height="1.2"
          patternTransform="rotate(-45)"
        >
          <circle cx="0.8" cy="0.8" r="0.4" fill="var(--primaryColor)"/>
        </pattern>
      </defs>

      <!-- oko (nad objektem) -->
      <circle
        id="m01_B_oko"
        class="m01-eye draggable"
        cx="30"
        cy="30"
        r="0"
        data-open="0"
        transform="translate(0 0)"
      />

      <path id="m01_B" class="draggable"
        fill="var(--primaryColor)"
        d="M30.577,13.662c3.108,0,6.003-.845,8.757-.845,6.992,0,8.616,10.028,8.616,15.959,0,15.818-8.05,23.445-17.373,23.445-9.18,0-18.359-7.627-18.359-22.597,0-3.533,1.412-16.807,9.111-16.807,3.246,0,6.144.845,9.249.845ZM23.094,20.09c-4.591,0-6.216,1.765-6.216,5.859,0,9.746,8.544,16.738,19.066,16.738,4.591,0,6.638-2.685,6.638-6.428,0-7.978-6.71-16.168-19.489-16.168Z">
        <animate attributeName="d" dur="3s" repeatCount="indefinite"
          values="
M30.577,13.662c3.108,0,6.003-.845,8.757-.845,6.992,0,8.616,10.028,8.616,15.959,0,15.818-8.05,23.445-17.373,23.445-9.18,0-18.359-7.627-18.359-22.597,0-3.533,1.412-16.807,9.111-16.807,3.246,0,6.144.845,9.249.845ZM23.094,20.09c-4.591,0-6.216,1.765-6.216,5.859,0,9.746,8.544,16.738,19.066,16.738,4.591,0,6.638-2.685,6.638-6.428,0-7.978-6.71-16.168-19.489-16.168Z;
M30.577,13.662c3.108,0,4.939,5.817,7.693,5.817,6.992,0,15.618,4.612,12.255,9.498-5.413,7.864-10.213,18.638-19.949,23.244-8.298,3.925-17.165-9.44-20.698-22.273-.938-3.407,8.177-25.638,11.796-18.843,2.094,3.932,5.798,2.558,8.902,2.558ZM23.513,25.657c-4.591,0-10.468-1.183-10.468,2.911,0,9.746,12.377,14.119,22.9,14.119,4.591,0,6.638-2.685,6.638-6.428,0-7.978-6.291-10.601-19.07-10.601Z;
M30.084,16.364c3.108,0,6.496-3.547,9.25-3.547,6.992,0,8.616,10.028,8.616,15.959,0,15.818-13.402,31.88-17.373,23.445-1.447-3.074-7.779-16.146-18.359-22.597-3.017-1.839,7.542-24.344,9.111-16.807,1.163,5.59,5.651,3.547,8.756,3.547ZM23.094,20.09c-4.591,0-6.216,1.765-6.216,5.859,0,9.746,15.621,6.796,19.066,16.738,1.407,4.06,8.828-4.316,9.424-6,1.785-5.044-9.496-16.597-22.275-16.597Z;
M30.577,13.662c3.108,0,6.003-.845,8.757-.845,6.992,0,8.616,10.028,8.616,15.959,0,15.818-8.05,23.445-17.373,23.445-9.18,0-18.359-7.627-18.359-22.597,0-3.533,1.412-16.807,9.111-16.807,3.246,0,6.144.845,9.249.845ZM23.094,20.09c-4.591,0-6.216,1.765-6.216,5.859,0,9.746,8.544,16.738,19.066,16.738,4.591,0,6.638-2.685,6.638-6.428,0-7.978-6.71-16.168-19.489-16.168Z
          " />
      </path>
    </svg>
  `;

  const svg = root.querySelector("svg");
  const blob = root.querySelector("#m01_B");
  const eye = root.querySelector("#m01_B_oko");
  if (!svg || !blob || !eye) return;

  const ac = new AbortController();
  const { signal } = ac;

  let activeDrag = null; // "blob" | "eye" | null
  let startPt = null;
  let startT = { x: 0, y: 0 };

  // ======= Pattern hover na blob (jen když nedraguju)
  blob.addEventListener("pointerenter", () => {
    if (activeDrag) return;
    blob.setAttribute("fill", `url(#${patternId})`);
  }, { signal });

  blob.addEventListener("pointerleave", () => {
    if (activeDrag) return;
    blob.setAttribute("fill", "var(--primaryColor)");
  }, { signal });

  // ======= Stav oka
  const isEyeOpen = () => eye.dataset.open === "1";
  const setEyeOpen = (open) => {
    eye.dataset.open = open ? "1" : "0";
    eye.setAttribute("r", open ? "8" : "0"); // animuje se přes CSS transition
  };

  // klik na blob: toggle open/close oka (jen když se nejedná o drag)
  let downAt = null;
  blob.addEventListener("pointerdown", (e) => {
    activeDrag = "blob";
    blob.setPointerCapture?.(e.pointerId);

    startPt = clientToSvg(svg, e.clientX, e.clientY);
    startT = readTranslate(blob);
    downAt = { x: e.clientX, y: e.clientY };

    blob.style.cursor = "grabbing";
    eye.style.cursor = "grabbing";
  }, { signal });

  // ======= Oko hover: sekundární (jen když je otevřené a nedraguju)
  eye.addEventListener("pointerenter", () => {
    if (activeDrag) return;
    if (!isEyeOpen()) return;
    eye.classList.add("is-hover");
  }, { signal });

  eye.addEventListener("pointerleave", () => {
    eye.classList.remove("is-hover");
  }, { signal });

  // ======= Drag na oko (hýbe i blobem)
  eye.addEventListener("pointerdown", (e) => {
    activeDrag = "eye";
    eye.setPointerCapture?.(e.pointerId);

    startPt = clientToSvg(svg, e.clientX, e.clientY);
    startT = readTranslate(eye);
    downAt = { x: e.clientX, y: e.clientY };

    eye.style.cursor = "grabbing";
    blob.style.cursor = "grabbing";
  }, { signal });

  // ======= Společný move pro drag (podle activeDrag)
  svg.addEventListener("pointermove", (e) => {
    if (!activeDrag || !startPt) return;

    const p = clientToSvg(svg, e.clientX, e.clientY);
    const dx = p.x - startPt.x;
    const dy = p.y - startPt.y;

    if (activeDrag === "blob") {
      const nx = startT.x + dx;
      const ny = startT.y + dy;
      writeTranslate(blob, nx, ny);
      writeTranslate(eye, nx, ny); // oko vždy drží stejný translate jako blob
    } else if (activeDrag === "eye") {
      const nx = startT.x + dx;
      const ny = startT.y + dy;
      writeTranslate(eye, nx, ny);
      writeTranslate(blob, nx, ny); // blob jde s okem
    }
  }, { signal });

  // ======= Click vs drag rozlišení + ukončení drag
  const end = (e) => {
    if (!activeDrag) return;

    const was = activeDrag;
    activeDrag = null;
    startPt = null;

    blob.style.cursor = "grab";
    eye.style.cursor = "grab";

    // pokud to byl "klik" (malý pohyb), spouštíme akce:
    if (downAt && e) {
      const dist = Math.hypot((e.clientX ?? downAt.x) - downAt.x, (e.clientY ?? downAt.y) - downAt.y);
      const isClick = dist < 6;

      if (isClick) {
        if (was === "blob") {
          setEyeOpen(!isEyeOpen());
        } else if (was === "eye") {
          if (isEyeOpen()) {
            // klik na otevřené oko -> random primární
            setPrimaryColor(randomHex());
          }
        }
      }
    }

    downAt = null;
  };

  window.addEventListener("pointerup", end, { signal });
  window.addEventListener("pointercancel", end, { signal });

  // ======= Helpers

  function setPrimaryColor(hex) {
    // DŮLEŽITÉ: měníme jen CSS proměnnou.
    // Všechny prvky, které mají fill přes var(--primaryColor), se přebarví plynule díky transition.
    document.documentElement.style.setProperty("--primaryColor", hex);
  }

  function randomHex() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
  }

  function clientToSvg(svgEl, clientX, clientY) {
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }

  function readTranslate(target) {
    const t = target.getAttribute("transform") || "";
    const m = t.match(/translate\(\s*([-\d.]+)[ ,]([-\d.]+)\s*\)/);
    if (!m) return { x: 0, y: 0 };
    return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
  }

  function writeTranslate(target, x, y) {
    target.setAttribute("transform", `translate(${x} ${y})`);
  }
}
