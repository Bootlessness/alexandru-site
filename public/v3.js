import { pencilSegment } from "./pencil.js";

const identity = document.querySelector(".v3-identity");
const nameButton = document.querySelector(".v3-name button");
const colorHover = document.body.classList.contains("v5-page");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const distance = document.getElementById("letter-distance");
const speed = document.getElementById("letter-speed");
const rows = [...document.querySelectorAll(".v3-name-row")];
const letters = rows.flatMap((row, rowIndex) => {
  const glyphs = [...row.querySelectorAll(".v3-letter")];
  return glyphs.map((anchor, index) => ({
    anchor,
    verticalDirection: rowIndex === 0 ? -1 : 1,
    glyph: anchor.firstElementChild,
    edge: index === 0 ? -1 : index === glyphs.length - 1 ? 1 : 0,
    x: 0,
    y: 0,
  }));
});

letters.filter(({ anchor }) => anchor.closest(".v3-rest")).forEach(({ anchor }, index) => {
  anchor.style.setProperty("--order", index);
});

function reveal() {
  if (identity.hasAttribute("data-revealed")) return;
  identity.setAttribute("data-revealed", "");
  setTimeout(() => identity.setAttribute("data-ready", ""), reducedMotion.matches ? 0 : 490);
}

nameButton.addEventListener("pointerenter", reveal);
nameButton.addEventListener("focus", reveal);
nameButton.addEventListener("click", reveal);

let pointer;
let frame = 0;
let lastTime;
let previewStart;
let previewUntil = 0;

if (colorHover) {
  for (const { glyph } of letters) glyph.dataset.letter = glyph.textContent;
}

function updateTitleColor(target) {
  if (!colorHover) return;
  const nameBounds = nameButton.getBoundingClientRect();
  for (const { glyph } of letters) {
    const bounds = glyph.getBoundingClientRect();
    glyph.style.setProperty("--name-width", nameBounds.width + "px");
    glyph.style.setProperty("--spectrum-x", nameBounds.left - bounds.left + "px");
    glyph.style.setProperty("--reveal-x", target ? target.x - bounds.left + "px" : "-100px");
    glyph.style.setProperty("--reveal-y", target ? target.y - bounds.top + "px" : "-100px");
  }
}

function schedule() {
  if (!frame && !reducedMotion.matches) frame = requestAnimationFrame(moveLetters);
}

function moveLetters(now) {
  frame = 0;
  const previewing = now < previewUntil;
  let target = pointer;
  if (previewing) {
    const cycle = ((now - previewStart) / 950) % 2;
    const bounds = rows[Math.floor(cycle)].getBoundingClientRect();
    target = { x: bounds.left + (cycle % 1) * bounds.width, y: bounds.top + bounds.height / 2 };
  }

  const dt = lastTime ? Math.min(40, now - lastTime) : 16;
  lastTime = now;
  const response = 1 - Math.exp(-dt * (0.0015 + Number(speed.value) * 0.00021));
  const radius = Math.max(60, nameButton.getBoundingClientRect().height * 0.58);
  let unsettled = false;
  for (const letter of letters) {
    const { anchor, glyph, edge, verticalDirection } = letter;
    const bounds = anchor.getBoundingClientRect();
    const dx = target ? bounds.left + bounds.width / 2 - target.x : Infinity;
    const dy = target ? bounds.top + bounds.height / 2 - target.y : Infinity;
    const proximity = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
    const lift = Number(distance.value) * proximity ** 1.25;
    const x = edge ? edge * lift * 0.75 : 0;
    const y = verticalDirection * lift * (edge ? 0.63 : 1);
    letter.x += (x - letter.x) * response;
    letter.y += (y - letter.y) * response;
    if (Math.abs(x - letter.x) + Math.abs(y - letter.y) > 0.1) unsettled = true;
    glyph.style.transform = `translate(${letter.x.toFixed(2)}px, ${letter.y.toFixed(2)}px)`;
  }

  if (previewing || unsettled) schedule();
  else lastTime = undefined;
}

window.addEventListener("pointermove", (event) => {
  if (!identity.hasAttribute("data-revealed") || event.pointerType !== "mouse") return;
  pointer = { x: event.clientX, y: event.clientY };
  if (colorHover) return updateTitleColor(pointer);
  schedule();
}, { passive: true });

document.documentElement.addEventListener("pointerleave", () => {
  pointer = undefined;
  if (colorHover) return updateTitleColor();
  schedule();
});

for (const [control, unit] of [[distance, " px"], [speed, "%"]]) {
  control?.addEventListener("input", () => {
    control.nextElementSibling.value = control.value + unit;
    reveal();
    const now = performance.now();
    if (now >= previewUntil) previewStart = now;
    previewUntil = now + 1900;
    schedule();
  });
}

function circleMenu(button) {
  const canvas = button.querySelector("canvas");
  let animation;
  function drawOutline() {
    cancelAnimationFrame(animation);
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    const ink = getComputedStyle(button).color;
    const start = performance.now();
    const steps = Math.ceil((width + height) * 1.6);
    let step = 0;
    const point = (index) => {
      const angle = index / steps * Math.PI * 2 - 0.9;
      const wobble = Math.sin(angle * 3) * 0.9;
      return {
        x: width / 2 + (width / 2 - 3 + wobble) * Math.cos(angle),
        y: height / 2 + (height / 2 - 4 + wobble) * Math.sin(angle),
        pressure: 0.48,
      };
    };
    function draw(now) {
      const progress = reducedMotion.matches ? 1 : Math.min(1, (now - start) / 180);
      const end = Math.floor(progress * steps);
      while (step < end) {
        pencilSegment(point(step), point(step + 1), context, ink);
        step++;
      }
      if (step < steps) animation = requestAnimationFrame(draw);
    }
    animation = requestAnimationFrame(draw);
  }

  function clearOutline() {
    if (button.matches(":hover, :focus-visible")) return;
    cancelAnimationFrame(animation);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  button.addEventListener("pointerenter", drawOutline);
  button.addEventListener("focus", drawOutline);
  button.addEventListener("pointerleave", clearOutline);
  button.addEventListener("blur", clearOutline);
}

for (const button of document.querySelectorAll(".v3-nav button")) {
  if (button.querySelector("canvas")) circleMenu(button);
  button.addEventListener("click", () => {
    reveal();
    document.getElementById(button.getAttribute("aria-controls")).showModal();
  });
}
