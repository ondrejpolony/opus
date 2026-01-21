// js/modules/m02.js

import { rotateColors, randomizePrimary } from "../colors.js";

export default function m02({ root, complete }) {
  root.innerHTML = `
    <section class="m02">
      <div class="m02-center">
        <button class="m02-action">Akce</button>
        <button class="m02-rotate">Rotate</button>
      </div>
    </section>
  `;

  const actionBtn = root.querySelector(".m02-action");
  const rotateBtn = root.querySelector(".m02-rotate");

  const style = document.createElement("style");
  style.textContent = `
    .m02 { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
    .m02-center { display:flex; gap:12px; }
    .m02-action, .m02-rotate {
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.25);
      background: rgba(255,255,255,.9);
      color: #000;
      cursor: pointer;
      font: 14px/1 system-ui, sans-serif;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
  `;
  root.appendChild(style);

  actionBtn.addEventListener("click", () => {
    // ukázka: náhodná primární
    randomizePrimary();
  });

  rotateBtn.addEventListener("click", () => {
    // TADY je klíč: rotate bere AKTUÁLNÍ hodnoty z :root,
    // takže se projeví i náhodná barva z m01.
    rotateColors();
  });
}
