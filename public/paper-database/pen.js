// Each loop has its own silhouette and a different point where the pen lands.
const loops = [
  { start: 1, points: [[.04,.24],[.17,.08],[.48,.065],[.82,.09],[.955,.17],[.986,.49],[.958,.81],[.82,.92],[.51,.95],[.19,.92],[.044,.83],[.014,.51]] },
  { start: 6, points: [[.03,.27],[.19,.13],[.47,.075],[.78,.06],[.94,.13],[.987,.44],[.974,.73],[.85,.90],[.54,.95],[.24,.94],[.061,.85],[.013,.56]] },
  { start: 8, points: [[.029,.19],[.22,.065],[.53,.08],[.83,.115],[.955,.21],[.985,.55],[.941,.83],[.75,.94],[.45,.95],[.16,.89],[.034,.77],[.012,.48]] },
  { start: 4, points: [[.047,.21],[.21,.11],[.49,.09],[.79,.062],[.948,.13],[.987,.42],[.968,.76],[.84,.89],[.56,.92],[.27,.96],[.078,.88],[.014,.60]] },
  { start: 11, points: [[.033,.23],[.15,.11],[.43,.075],[.73,.08],[.922,.115],[.976,.34],[.984,.66],[.905,.86],[.67,.94],[.34,.95],[.09,.90],[.015,.66]] },
];

const controls = ".rail-link, .card, .views button, .table-title, .detail-link, .paper-settings .style-menu a";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const frames = new WeakMap();
let nextLoop = 0;

function curve(a, b, c, d, t) {
  // Catmull–Rom interpolation keeps the turns continuous through each anchor.
  return b + .5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}

function trace({ points, start }, width, height) {
  const stretch = height > 70 ? .28 : 0;
  const anchors = points.map(([x, y]) => {
    const offset = y - .5;
    const edge = y + stretch * offset * (1 - 4 * offset ** 2);
    return [2 + x * (width - 4), 2 + edge * (height - 4)];
  });
  const size = anchors.length;
  const at = index => anchors[(index + size) % size];
  const marks = [at(start)];

  for (let step = 0; step <= size; step++) {
    const index = start + step;
    const [a, b, c, d] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
    const samples = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 1.5);
    // Let the end of the stroke pass its starting point before lifting.
    const limit = step === size ? Math.ceil(samples * .39) : samples;
    for (let i = 1; i <= limit; i++) {
      const t = i / samples;
      const overlap = step === size ? 1.3 * Math.sin(t * Math.PI) : 0;
      marks.push([
        curve(a[0], b[0], c[0], d[0], t) + overlap + (Math.random() - .5) * .34,
        curve(a[1], b[1], c[1], d[1], t) + overlap + (Math.random() - .5) * .34,
      ]);
    }
  }
  return marks;
}

function drawLoop(canvas, loop) {
  cancelAnimationFrame(frames.get(canvas));
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 5 || height < 5) return;

  const scale = Math.max(2, Math.min(devicePixelRatio, 3));
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(canvas.width / width, canvas.height / height);
  ctx.strokeStyle = ctx.fillStyle = getComputedStyle(canvas).color;
  ctx.lineCap = "round";
  const marks = trace(loop, width, height);
  const startTime = performance.now();
  let index = 1;

  function drawFrame(time) {
    const progress = reducedMotion.matches ? 1 : Math.min((time - startTime) / 255, 1);
    const end = Math.min(marks.length, Math.ceil(marks.length * progress));
    for (; index < end; index++) {
      const [x, y] = marks[index];
      const pressure = .55 + .27 * Math.sin(index / 21) + .18 * Math.sin(index / 9);
      const taper = Math.min(1, index / 6, (marks.length - index) / 9);
      ctx.lineWidth = (1.55 + 1.15 * pressure) * (.58 + .42 * taper);
      ctx.globalAlpha = .47 + Math.random() * .46;
      ctx.beginPath();
      ctx.moveTo(...marks[index - 1]);
      ctx.lineTo(x, y);
      ctx.stroke();

      if (Math.random() < .28) {
        // Tiny voids in the ink give the edge the grain of a ballpoint stroke.
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = .27 + Math.random() * .35;
        ctx.fillRect(x + (Math.random() - .5) * 1.8, y + (Math.random() - .5) * 1.8, .52, .55);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    if (progress < 1 && canvas.isConnected) frames.set(canvas, requestAnimationFrame(drawFrame));
  }

  drawFrame(startTime);
}

function startOutline(control) {
  const target = control.matches(".circled") ? control : control.querySelector(".card-copy, .marked");
  if (!target) return;

  let canvas = target.querySelector(":scope > .pen-outline");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "pen-outline";
    canvas.setAttribute("aria-hidden", "true");
    target.append(canvas);
  }

  drawLoop(canvas, loops[nextLoop]);
  nextLoop = (nextLoop + 1) % loops.length;
}

document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const control = event.target.closest(controls);
  if (control && !control.contains(event.relatedTarget)) startOutline(control);
});

document.addEventListener("focusin", (event) => {
  if (event.target.matches(controls) && event.target.matches(":focus-visible")) startOutline(event.target);
});
