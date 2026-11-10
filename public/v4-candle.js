const title = document.querySelector(".title-color");
const radius = document.getElementById("candle-radius");
const intensity = document.getElementById("candle-intensity");
const color = document.getElementById("candle-color");
const animation = document.getElementById("candle-animation");
const gridRadius = document.getElementById("grid-glow-radius");
const gridIntensity = document.getElementById("grid-glow-intensity");
const gridStutter = document.getElementById("grid-stutter");
const gridLag = document.getElementById("grid-lag");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const { gsap, Physics2DPlugin } = window;
let pointer;

for (const control of [radius, intensity, color, animation, gridRadius, gridIntensity, gridStutter, gridLag]) {
  control.addEventListener("input", () => {
    const unit = control === gridLag ? " ms" : control === radius || control === gridRadius ? " px" : "%";
    control.nextElementSibling.value = control.value + unit;
    title.style.setProperty("--candle-radius", radius.value + "px");
    title.style.setProperty("--candle-intensity", intensity.valueAsNumber / 100);
    title.style.setProperty("--candle-color", color.value + "%");
    title.style.setProperty("--candle-duration", 8 - animation.valueAsNumber * .06 + "s");
    title.style.setProperty("--candle-play-state", animation.valueAsNumber ? "running" : "paused");
    updateGridGlow();
    if (control === gridLag && pointer) moveGridGlow();
    if (control === gridStutter) flickerGrid();
    if (!animation.valueAsNumber || !intensity.valueAsNumber) clearEmbers();
  });
}

function clearEmbers() {
  for (const ember of title.querySelectorAll(".candle-ember")) {
    gsap.killTweensOf(ember);
    ember.remove();
  }
}

const gridStyle = document.body.style;
const gridPosition = { x: 0, y: 0 };
let gridVisible = false;
let flickerTimer;

function paintGridPosition() {
  gridStyle.setProperty("--grid-glow-x", gridPosition.x + "px");
  gridStyle.setProperty("--grid-glow-y", gridPosition.y + "px");
}

function updateGridGlow() {
  const reach = gridRadius.valueAsNumber;
  gridStyle.setProperty("--grid-glow-opacity", pointer && reach ? gridIntensity.valueAsNumber / 100 : 0);
  gridStyle.setProperty("--grid-glow-radius", reach + "px");
  gridStyle.setProperty("--grid-fade-duration", gridLag.valueAsNumber + "ms");
}

function flickerGrid() {
  clearTimeout(flickerTimer);
  gridStyle.setProperty("--grid-flicker", 1);
  const amount = gridStutter.valueAsNumber / 100;
  if (!pointer || reducedMotion.matches || !amount) return;
  flickerTimer = setTimeout(() => {
    gridStyle.setProperty("--grid-flicker", 1 - amount * (.4 + Math.random() * .6));
    flickerTimer = setTimeout(flickerGrid, 35 + Math.random() * 65);
  }, 220 + Math.random() * 1400 / amount);
}

function moveGridGlow() {
  const lag = gridLag.valueAsNumber / 1000;
  if (gridVisible && lag && gsap && !reducedMotion.matches) {
    gsap.to(gridPosition, { ...pointer, duration: lag, ease: "power2.out", overwrite: true, onUpdate: paintGridPosition });
  } else {
    gsap?.killTweensOf(gridPosition);
    Object.assign(gridPosition, pointer);
    paintGridPosition();
  }
}

window.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  pointer = { x: event.clientX, y: event.clientY };
  moveGridGlow();
  if (!gridVisible) flickerGrid();
  gridVisible = true;
  updateGridGlow();
}, { passive: true });

const leave = () => {
  pointer = undefined;
  gridVisible = false;
  gsap?.killTweensOf(gridPosition);
  flickerGrid();
  updateGridGlow();
  clearEmbers();
};
document.documentElement.addEventListener("pointerleave", leave);
window.addEventListener("blur", leave);
reducedMotion.addEventListener("change", leave);

if (gsap && Physics2DPlugin) {
  gsap.registerPlugin(Physics2DPlugin);

  setInterval(() => {
    const motion = animation.valueAsNumber / 100;
    if (!pointer || reducedMotion.matches || !motion || !intensity.valueAsNumber || Math.random() > motion) return;
    const { left, top, width, height } = title.getBoundingClientRect();
    const x = pointer.x - left;
    const y = pointer.y - top;
    const reach = radius.valueAsNumber;
    if (x < -reach || x > width + reach || y < -reach || y > height + reach) return;

    const ember = document.createElement("i");
    ember.className = "candle-ember";
    title.append(ember);
    const random = gsap.utils.random;
    gsap.set(ember, {
      x: gsap.utils.clamp(0, width, x) + random(-15, 15),
      y: gsap.utils.clamp(0, height, y),
      opacity: Math.min(.85, intensity.valueAsNumber / 150),
    });
    gsap.to(ember, {
      duration: random(.65, 1.2),
      physics2D: { angle: random(-112, -68), velocity: random(18, 40), gravity: -12 },
      opacity: 0,
      scale: .35,
      ease: "none",
      onComplete: () => ember.remove(),
    });
  }, 85);
}
