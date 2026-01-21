// js/colors.js

const ROOT = document.documentElement;

function readVar(name) {
  return getComputedStyle(ROOT).getPropertyValue(name).trim();
}

export function getColors() {
  return {
    primary: readVar("--primaryColor"),
    secondary: readVar("--secondaryColor"),
    tertiary: readVar("--tertiaryColor"),
  };
}

export function setColors({ primary, secondary, tertiary } = {}) {
  if (primary != null) ROOT.style.setProperty("--primaryColor", primary);
  if (secondary != null) ROOT.style.setProperty("--secondaryColor", secondary);
  if (tertiary != null) ROOT.style.setProperty("--tertiaryColor", tertiary);
}

export function rotateColors() {
  const { primary, secondary, tertiary } = getColors();
  // primární > sekundární > terciární > primární (cyklus)
  setColors({
    primary: tertiary,
    secondary: primary,
    tertiary: secondary,
  });
}

export function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

export function randomizePrimary() {
  setColors({ primary: randomHex() });
}
