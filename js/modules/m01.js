// js/modules/m01.js

export default function m01({ root, colors /*, complete */ }) {
  const patternIdB = `m01__dots_B`;
  const patternIdD = `m01__lines_D`;
  const filterIdD = `m01__displacementFilter_D`;

  // ✅ nový objekt C (vlnící se čáry)
  const opIdC = `m01__op_001_C`;

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

      #m01_B, #m01_D {
        transition: fill 500ms cubic-bezier(.2,.8,.2,1);
        cursor: grab;
      }

      /* ✅ Pattern prvky: aby rotace barev byla plynulá (~500ms) */
      .m01-pattern-dot {
        fill: var(--primaryColor);
        transition: fill 500ms cubic-bezier(.2,.8,.2,1);
      }
      .m01-pattern-line {
        stroke: var(--primaryColor);
        transition: stroke 500ms cubic-bezier(.2,.8,.2,1);
      }

      /* ✅ OP_001_C: vlnící se čáry */
      #${opIdC} {
        mix-blend-mode: multiply;
        pointer-events: none; /* ať se netluče s drag */
      }
      .m01-opc-line {
        fill: none;
        stroke: var(--primaryColor);
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: stroke 500ms cubic-bezier(.2,.8,.2,1);
        opacity: .65;
      }
      .m01-opc-line.alt {
        stroke: var(--tertiaryColor);
      }
    </style>

    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style="display:block;width:100%;height:100%;touch-action:none;">

      <defs>
        <!-- Pattern pro B (tečky) -->
        <pattern
          id="${patternIdB}"
          patternUnits="userSpaceOnUse"
          width="1.2"
          height="1.2"
          patternTransform="rotate(-45)"
        >
          <circle class="m01-pattern-dot" cx="0.8" cy="0.8" r="0.4"/>
        </pattern>

        <!-- Pattern pro D (linky) -->
        <pattern
          id="${patternIdD}"
          patternUnits="userSpaceOnUse"
          width="4"
          height="1"
          patternTransform="rotate(0)"
        >
          <line class="m01-pattern-line" x1="0" y1="0.5" x2="4" y2="0.5" stroke-width="0.5" />
        </pattern>

        <!-- Displacement filter (permanentně pro D) -->
        <filter id="${filterIdD}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.1"
            numOctaves="1"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="B"
          >
            <animate
              attributeName="scale"
              values="0;15;0;0;-15;0;0"
              dur="5s"
              calcMode="spline"
              keySplines="
                0.1 0.8 0.2 1;
                0.1 0.8 0.2 1;
                0.1 0.8 0.2 1;
                0.1 0.8 0.2 1;
                0.1 0.8 0.2 1;
                0.1 0.8 0.2 1
              "
              repeatCount="indefinite"
            />
          </feDisplacementMap>
        </filter>
      </defs>

      <!-- ✅ OP_001_C (vlnící se čáry) se vloží dynamicky jako <g id="m01__op_001_C"> ... -->

      <!-- ============ B ============ -->

      <!-- oko (nad objektem B) -->
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

      <!-- ============ D ============ -->

      <!-- oko (nad objektem D) -->
      <circle
        id="m01_D_oko"
        class="m01-eye draggable"
        cx="73"
        cy="62"
        r="0"
        data-open="0"
        transform="translate(0 0)"
      />

      <path id="m01_D" class="draggable"
        fill="url(#${patternIdD})"
        filter="url(#${filterIdD})"
        d="M67.857,88.306c-5.862,0-8.757,2.754-11.511,2.754-1.765,0-2.119-.92-2.119-1.978,0-6.075,5.58-15.113,5.58-21.821,0-9.111-5.931-18.218-5.931-21.749,0-1.412.917-2.191,2.682-2.191,2.119,0,12.287,1.837,15.251,1.837,3.884,0,6.287-2.472,10.171-2.472,3.74,0,7.978,4.378,7.978,15.608,0,11.934-5.79,24.149-12.71,24.149-4.873,0-7.274-4.025-7.274-7.909,0-1.202.707-2.047,2.119-2.047,1.34,0,6.354,2.401,7.909,2.401,1.624,0,2.823-.848,2.823-4.873,0-11.865-3.953-21.395-11.862-21.395-5.014,0-7.205,9.884-7.205,15.392,0,10.876,7.133,18.713,7.133,22.174,0,1.552-1.343,2.119-3.036,2.119Z"
      />
    </svg>
  `;

  const svg = root.querySelector("svg");
  const blobB = root.querySelector("#m01_B");
  const eyeB = root.querySelector("#m01_B_oko");
  const blobD = root.querySelector("#m01_D");
  const eyeD = root.querySelector("#m01_D_oko");
  if (!svg || !blobB || !eyeB || !blobD || !eyeD) return;

  const ac = new AbortController();
  const { signal } = ac;

  // --------- “globální” drag stav (vždy jen 1 aktivní prvek)
  let activeDrag = null; // "B" | "B_eye" | "D" | "D_eye" | null
  let startPt = null;
  let startT = { x: 0, y: 0 };
  let downAt = null;

  // ======= OP_001_C: vytvoření + animace (vlnící se čáry)
  const opC = createOp001C(svg, { id: opIdC, lines: 12, samples: 90 });

  // vlož opC co nejvíc „do pozadí“ (hned za <defs>)
  const defs = svg.querySelector("defs");
  if (defs) {
    // pokud je <defs>, vložíme g hned za něj, aby byl pod B a D
    const afterDefs = defs.nextSibling;
    svg.insertBefore(opC.g, afterDefs);
  } else {
    svg.insertBefore(opC.g, svg.firstChild);
  }

  // rAF loop jen pro opC (lehké), zruší se při abort
  let rafId = 0;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    op001C_update(opC, dt);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  signal.addEventListener(
    "abort",
    () => {
      if (rafId) cancelAnimationFrame(rafId);
    },
    { once: true }
  );

  // ======= Pattern hover na B (jen když nedraguju)
  blobB.addEventListener(
    "pointerenter",
    () => {
      if (activeDrag) return;
      blobB.setAttribute("fill", `url(#${patternIdB})`);
    },
    { signal }
  );

  blobB.addEventListener(
    "pointerleave",
    () => {
      if (activeDrag) return;
      blobB.setAttribute("fill", "var(--primaryColor)");
    },
    { signal }
  );

  // ======= Hover “rozšpičatělá” varianta pro D (skokově, jako ve staré verzi)
  const D_NORMAL = blobD.getAttribute("d");
  const D_SPIKY =
    "M67.857,92.306l-.808-7.985-.225,8.023-1.404-7.903.386,8.017-2.006-7.771,1.004,7.963-2.582-7.599,1.573,7.871-3.085-7.41,2.035,7.765-3.444-7.25,2.31,7.688-3.56-7.194,2.239,7.71-3.256-7.334,1.581,7.867-2.183-7.711-.088,8.008-.029-8-.696,7.97.722-7.967-1.559,7.845,1.733-7.806-2.714,7.52,3.082-7.372-4.215,6.786,4.735-6.429-5.813,5.471,6.283-4.926-7.053,3.745,7.309-3.227-7.71,2.106,7.793-1.789-7.951.858,7.964-.751-8-.011,8.048-.825-7.724-2.403,8.084.453-7.408-3.265,8.021,1.113-7.206-3.693,7.969,1.438-7.111-3.874,7.952,1.534-7.106-3.884,7.968,1.451-7.188-3.729,8.013,1.178-7.357-3.38,8.071.66-7.615-2.743,8.092-.234-7.923-1.619,7.957-1.488-8.075-.591,7.761-2.305-8.096.164,7.542-2.945-8.062.765,7.334-3.433-8.005,1.226,7.154-3.794-7.948,1.559,7.022-4.035-7.906,1.761,6.96-4.14-7.902,1.782,7.015-4.043-7.967,1.459,7.348-3.367-8.064-.324,7.997.069-7.917-1.124,7.873,1.387-7.561-2.588,7.401,3.008-6.763-4.25,6.449,4.712-5.504-5.789,5.115,6.138-4.03-6.901,3.712,7.08-2.671-7.537,2.492,7.6-1.538-7.849,1.496,7.859-.649-7.974.714,7.969.067-8.001.484,8.034,1.679-7.866-.134,8.045,1.901-7.817-.255,8.041,1.971-7.8-.296,8.04,1.989-7.795-.297,8.04,1.982-7.798-.271,8.041,1.941-7.808-.21,8.043,1.859-7.828-.088,8.045,1.681-7.867.2,8.044,1.116-7.957.844,7.973-.182-8.016,1.831,7.806-1.127-7.939,2.655,7.567-1.853-7.804,3.211,7.349-2.277-7.692,3.452,7.24-2.362-7.666,3.369,7.279-2.106-7.74,2.967,7.45-1.523-7.874,2.269,7.69-.673-7.99,1.348,7.903.329-8.011.193,8.022,3.508-7.222-2.955,7.479,5.813-5.562-5.083,6.25,7.053-3.895-6.322,5.005,7.656-2.532-7.032,3.953,7.931-1.476-7.449,3.099,8.041-.657-7.7,2.413h8.069s-7.855,1.849-7.855,1.849l8.053.528-7.952,1.381,8.012.973-8.032,1.461,7.876,2.148-8.127.779,7.672,2.791-8.163.111,7.416,3.413-8.143-.575,7.09,4.049-8.056-1.32,6.652,4.733-7.861-2.193,6.018,5.514-7.46-3.297,4.978,6.463-6.577-4.801,3.03,7.556-4.471-6.763-.551,8.078-.353-8.014-1.639,7.852,1.023-7.954-3.047,7.417,2.54-7.604-4.472,6.654,4.038-6.926-5.733,5.605,5.342-5.98-6.71,4.391,6.358-4.889-7.38,3.141,7.089-3.755-7.788,1.923,7.58-2.628-7.987.754,7.879-1.511-8.014-.385,7.998.069-7.937-.98,7.906,1.196-7.687-2.199,7.586,2.52-7.15-3.572,6.937,3.966-6.246-4.983,5.913,5.373-5-6.232,4.607,6.529-3.594-7.138,3.235,7.31-2.225-7.679,1.964,7.752-1.038-7.93.888,7.949-.038-7.999-.346,7.976,2.314-7.665-1.831,7.801,2.923-7.46-2.182,7.71,3.127-7.377-2.32,7.67,3.208-7.343-2.351,7.661,3.214-7.341-2.306,7.675,3.132-7.376-2.188,7.709,2.957-7.448-1.908,7.783,2.54-7.598-1.212,7.918,1.138-7.894.713,7.969-.83-7.95,2.567,7.563-3.105-7.348,4.929,6.27-5.448-5.831,6.7,4.347-6.873-4.085,7.528,2.705-7.512-2.761,7.847,1.578-7.787-1.858,7.964.818-7.912-1.233,8.002.276-7.97-.775,8.007-.122-7.996-.436,7.977-1.621-8.058-1.15,7.862-2.108-8.115-.616,7.692-2.66-8.138.016,7.436-3.308-8.098.792,7.031-4.098-7.933,1.796,6.36-5.071-7.503,3.124,5.197-6.25-6.524,4.829,3.229-7.445-4.656,6.638.52-8.091-2.141,7.828-2.091-7.711,2.176,7.702-5.509-5.827,5.059,6.256-7.038-3.905,6.365,4.943-7.622-2.617,6.991,4.015-7.873-1.734,7.344,3.328-7.991-1.072,7.571,2.775-8.047-.523,7.734,2.282-8.064-.017,7.863,1.787-8.047.521,7.973,1.189-7.96,1.517,8.075.684-7.765,2.318,8.104-.113-7.513,3.037,8.062-.836-7.234,3.654,7.973-1.458-6.957,4.158,7.866-1.958-6.718,4.534,7.769-2.315-6.563,4.756,7.726-2.458-6.572,4.742,7.811-2.174-7.019,4.008,8.049.077-7.993-.141,7.867,1.408-7.771-1.849,7.294,3.251-7.018-3.806,6.143,5.101-5.746-5.547,4.658,6.491-4.321-6.724,3.241,7.309-3.062-7.388,2.092,7.72-2.063-7.73,1.192,7.911-1.276-7.899.476,7.988-.641-7.976-.107,8.002Z";

  blobD.addEventListener(
    "pointerenter",
    () => {
      if (activeDrag) return;
      blobD.setAttribute("fill", "var(--primaryColor)");
      blobD.setAttribute("d", D_SPIKY);
    },
    { signal }
  );

  blobD.addEventListener(
    "pointerleave",
    () => {
      if (activeDrag) return;
      blobD.setAttribute("fill", `url(#${patternIdD})`);
      blobD.setAttribute("d", D_NORMAL);
    },
    { signal }
  );

  // ======= Helpers pro oči
  const isEyeOpen = (eye) => eye.dataset.open === "1";
  const setEyeOpen = (eye, open) => {
    eye.dataset.open = open ? "1" : "0";
    eye.setAttribute("r", open ? "8" : "0");
  };

  // ======= Oko hover (sekundární), jen když je otevřené a nedraguju
  function bindEyeHover(eye) {
    eye.addEventListener(
      "pointerenter",
      () => {
        if (activeDrag) return;
        if (!isEyeOpen(eye)) return;
        eye.classList.add("is-hover");
      },
      { signal }
    );

    eye.addEventListener(
      "pointerleave",
      () => {
        eye.classList.remove("is-hover");
      },
      { signal }
    );
  }
  bindEyeHover(eyeB);
  bindEyeHover(eyeD);

  // ======= PointerDown (B)
  blobB.addEventListener(
    "pointerdown",
    (e) => {
      activeDrag = "B";
      blobB.setPointerCapture?.(e.pointerId);
      startPt = clientToSvg(svg, e.clientX, e.clientY);
      startT = readTranslate(blobB);
      downAt = { x: e.clientX, y: e.clientY };
      blobB.style.cursor = "grabbing";
      eyeB.style.cursor = "grabbing";
    },
    { signal }
  );

  eyeB.addEventListener(
    "pointerdown",
    (e) => {
      activeDrag = "B_eye";
      eyeB.setPointerCapture?.(e.pointerId);
      startPt = clientToSvg(svg, e.clientX, e.clientY);
      startT = readTranslate(eyeB);
      downAt = { x: e.clientX, y: e.clientY };
      eyeB.style.cursor = "grabbing";
      blobB.style.cursor = "grabbing";
    },
    { signal }
  );

  // ======= PointerDown (D)
  blobD.addEventListener(
    "pointerdown",
    (e) => {
      activeDrag = "D";
      blobD.setPointerCapture?.(e.pointerId);
      startPt = clientToSvg(svg, e.clientX, e.clientY);
      startT = readTranslate(blobD);
      downAt = { x: e.clientX, y: e.clientY };
      blobD.style.cursor = "grabbing";
      eyeD.style.cursor = "grabbing";
    },
    { signal }
  );

  eyeD.addEventListener(
    "pointerdown",
    (e) => {
      activeDrag = "D_eye";
      eyeD.setPointerCapture?.(e.pointerId);
      startPt = clientToSvg(svg, e.clientX, e.clientY);
      startT = readTranslate(eyeD);
      downAt = { x: e.clientX, y: e.clientY };
      eyeD.style.cursor = "grabbing";
      blobD.style.cursor = "grabbing";
    },
    { signal }
  );

  // ======= Move (drag + OP_001_C pointer)
  svg.addEventListener(
    "pointermove",
    (e) => {
      // OP_001_C pointer (i při dragu to nevadí; jen „dýchá“ na pozadí)
      {
        const p = clientToSvg(svg, e.clientX, e.clientY);
        const vb = svg.viewBox?.baseVal;
        const w = vb?.width || 100;
        const h = vb?.height || 100;
        const xN = w ? p.x / w : 0.5;
        const yN = h ? p.y / h : 0.5;
        op001C_setPointer(opC, xN, yN, 1);
      }

      if (!activeDrag || !startPt) return;

      const p = clientToSvg(svg, e.clientX, e.clientY);
      const dx = p.x - startPt.x;
      const dy = p.y - startPt.y;

      // B skupina
      if (activeDrag === "B" || activeDrag === "B_eye") {
        const nx = startT.x + dx;
        const ny = startT.y + dy;
        writeTranslate(blobB, nx, ny);
        writeTranslate(eyeB, nx, ny);
        return;
      }

      // D skupina
      if (activeDrag === "D" || activeDrag === "D_eye") {
        const nx = startT.x + dx;
        const ny = startT.y + dy;
        writeTranslate(blobD, nx, ny);
        writeTranslate(eyeD, nx, ny);
        return;
      }
    },
    { signal }
  );

  // ======= End: click vs drag + akce
  const end = (e) => {
    if (!activeDrag) return;

    const was = activeDrag;
    activeDrag = null;
    startPt = null;

    blobB.style.cursor = "grab";
    eyeB.style.cursor = "grab";
    blobD.style.cursor = "grab";
    eyeD.style.cursor = "grab";

    // click detekce
    if (downAt && e) {
      const dist = Math.hypot(
        (e.clientX ?? downAt.x) - downAt.x,
        (e.clientY ?? downAt.y) - downAt.y
      );
      const isClick = dist < 6;

      if (isClick) {
        // klik na písmeno: toggle oko
        if (was === "B") setEyeOpen(eyeB, !isEyeOpen(eyeB));
        if (was === "D") setEyeOpen(eyeD, !isEyeOpen(eyeD));

        // klik na oko: akce (jen když je otevřené)
        if (was === "B_eye" && isEyeOpen(eyeB)) {
          setPrimaryColor(randomHex());
        }
        if (was === "D_eye" && isEyeOpen(eyeD)) {
          // ✅ rotace barev se teď vizuálně přelije díky transition na fill/stroke
          rotateProjectColors();
        }
      }
    }

    downAt = null;
  };

  window.addEventListener("pointerup", end, { signal });
  window.addEventListener("pointercancel", end, { signal });

  // ======= Barvy: preferuj controller z engine (persist + sdílení), fallback na CSS vars
  function setPrimaryColor(hex) {
    if (colors && typeof colors.set === "function") {
      colors.set({ primary: hex });
    } else {
      document.documentElement.style.setProperty("--primaryColor", hex);
    }
  }

  function rotateProjectColors() {
    if (colors && typeof colors.rotate === "function") {
      colors.rotate(1);
      return;
    }

    // fallback: přečti z :root a proveď rotaci
    const r = document.documentElement;
    const cs = getComputedStyle(r);
    const p = cs.getPropertyValue("--primaryColor").trim();
    const s = cs.getPropertyValue("--secondaryColor").trim();
    const t = cs.getPropertyValue("--tertiaryColor").trim();
    r.style.setProperty("--primaryColor", t);
    r.style.setProperty("--secondaryColor", p);
    r.style.setProperty("--tertiaryColor", s);
  }

  // ======= Helpers
  function randomHex() {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
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

  // ======= OP_001_C internals (bez závislostí)
  function createOp001C(svgEl, opts = {}) {
    const {
      id = "m01__op_001_C",
      lines = 10,
      samples = 80,
      padding = 10, // v jednotkách viewBoxu (0..100)
      amp = 2.8,    // amplituda ve viewBox jednotkách
      freq = 1.6,
      speed = 0.85,
      strokeWidth = 0.35,
    } = opts;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);

    const paths = [];
    const meta = [];

    for (let i = 0; i < lines; i++) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("class", `m01-opc-line${i % 2 ? " alt" : ""}`);
      p.setAttribute("stroke-width", String(strokeWidth));
      g.appendChild(p);
      paths.push(p);

      meta.push({
        phase: Math.random() * Math.PI * 2,
        ampMul: 0.55 + Math.random() * 0.9,
        freqMul: 0.75 + Math.random() * 0.7,
      });
    }

    const vb = svgEl.viewBox?.baseVal;
    const w = vb?.width || 100;
    const h = vb?.height || 100;

    return {
      g,
      paths,
      meta,
      t: 0,
      w,
      h,
      padding,
      samples,
      amp,
      freq,
      speed,
      pointerX: 0.5,
      pointerY: 0.5,
      pointerPower: 0.0,
    };
  }

  function op001C_setPointer(st, xNorm, yNorm, power = 1) {
    st.pointerX = Math.max(0, Math.min(1, xNorm));
    st.pointerY = Math.max(0, Math.min(1, yNorm));
    st.pointerPower = Math.max(st.pointerPower, Math.max(0, Math.min(1, power)));
  }

  function op001C_noise1(n) {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  }

  function op001C_update(st, dt) {
    // kdyby někdo změnil viewBox za běhu
    const vb = svg.viewBox?.baseVal;
    st.w = vb?.width || 100;
    st.h = vb?.height || 100;

    st.t += dt * st.speed;

    const w = st.w;
    const h = st.h;
    const pad = st.padding;

    const x0 = pad;
    const x1 = Math.max(pad + 1, w - pad);
    const usableW = x1 - x0;

    const top = pad;
    const bottom = Math.max(top + 1, h - pad);
    const span = bottom - top;

    const lines = st.paths.length;
    const samples = st.samples;

    const px = x0 + usableW * st.pointerX;
    const py = top + span * st.pointerY;
    const influenceR = usableW * (0.18 + 0.22 * st.pointerPower);

    for (let i = 0; i < lines; i++) {
      const p = st.paths[i];
      const m = st.meta[i];

      const yBase = top + (span * (i + 1)) / (lines + 1);

      const A = st.amp * m.ampMul * (0.9 + 0.25 * Math.sin(st.t * 0.6 + i));
      const F = st.freq * m.freqMul;

      let d = "";

      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const x = x0 + u * usableW;

        let y =
          yBase +
          Math.sin(u * Math.PI * 2 * F + st.t + m.phase) * A;

        y +=
          Math.sin(u * Math.PI * 2 * (F * 2.15) + st.t * 1.35 + m.phase * 1.7) *
          (A * 0.22);

        const nn = op001C_noise1(u * 80 + i * 10 + st.t * 0.25);
        y += (nn - 0.5) * (A * 0.12);

        if (st.pointerPower > 0.001) {
          const dx = x - px;
          const dy = yBase - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const k = Math.max(0, 1 - dist / influenceR);

          y += (py - yBase) * k * 0.22 * st.pointerPower;
          y += Math.sin(st.t * 3.0 + u * 9 + i) * (A * 0.10) * k * st.pointerPower;
        }

        if (s === 0) d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
        else d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }

      p.setAttribute("d", d);
    }

    st.pointerPower *= 0.94;
  }

  // ✅ umožní engine uklidit eventy a rAF při přepnutí modulu
  return () => ac.abort();
}
