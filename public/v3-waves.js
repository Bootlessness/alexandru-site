const canvas = document.getElementById("wave-field");
const context = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const controls = ["wave-amount", "wave-speed", "pointer-reactivity", "pointer-intensity"]
  .map((id) => document.getElementById(id));
const glowRadius = document.getElementById("glow-radius");
const pointerGlow = document.getElementById("pointer-glow");
const dotColor = document.getElementById("dot-color");
const palette = [[183, 132, 207], [150, 183, 126], [217, 167, 129], [106, 169, 204], [255, 255, 255]];
const spacing = 32;
const dots = [];
let pointer;
let width, height, phase = 0, lastTime = 0, frame = 0;

function draw(now) {
  frame = 0;
  const still = reducedMotion.matches;
  const [amount, speed, reactivity, intensity] = controls.map((input) => input.valueAsNumber / 100);
  const elapsed = lastTime ? Math.min(now - lastTime, 50) : 16;
  const step = Math.min(elapsed, 16) / 1000;
  const damping = Math.exp(-24 * step);
  const radius = reactivity * 200;
  if (!still) phase += elapsed * speed * .003;
  lastTime = now;

  context.clearRect(0, 0, width, height);
  const glowReach = glowRadius.valueAsNumber;
  const haloStrength = pointerGlow.valueAsNumber / 100;
  const colorMix = dotColor.valueAsNumber / 100;
  if (pointer && haloStrength) {
    const halo = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 18);
    halo.addColorStop(0, `rgba(255, 255, 255, ${haloStrength * .7})`);
    halo.addColorStop(1, "rgba(219, 231, 226, 0)");
    context.fillStyle = halo;
    context.fillRect(pointer.x - 18, pointer.y - 18, 36, 36);
  }
  for (const dot of dots) {
    const dx = pointer ? pointer.x - dot.x : 0;
    const dy = pointer ? pointer.y - dot.y : 0;
    const distance = Math.hypot(dx, dy);
    const proximity = !still && pointer && radius ? Math.max(0, 1 - distance / radius) : 0;
    const pull = Math.min(distance, intensity * 70 * proximity ** 2);
    const scale = distance ? pull / distance : 0;
    if (still) {
      dot.offsetX = dot.offsetY = dot.velocityX = dot.velocityY = 0;
    } else {
      dot.velocityX = (dot.velocityX + (dx * scale - dot.offsetX) * 520 * step) * damping;
      dot.velocityY = (dot.velocityY + (dy * scale - dot.offsetY) * 520 * step) * damping;
      dot.offsetX += dot.velocityX * step;
      dot.offsetY += dot.velocityY * step;
    }

    const wave = still ? 0 : Math.sin(dot.x * .012 + dot.y * .016 - phase) * amount;
    const color = palette[dot.color].map((channel) => Math.round(255 + (channel - 255) * colorMix)).join(", ");
    const glow = !still && pointer && glowReach ? Math.max(0, 1 - distance / glowReach) ** 2 : 0;
    const x = dot.x + dot.offsetX + wave * 2;
    const y = dot.y + dot.offsetY + wave * 5;
    if (glow > .01) {
      const halo = context.createRadialGradient(x, y, 0, x, y, 5);
      halo.addColorStop(0, `rgba(${color}, ${glow * .45})`);
      halo.addColorStop(1, "rgba(219, 231, 226, 0)");
      context.fillStyle = halo;
      context.fillRect(x - 5, y - 5, 10, 10);
    }
    context.fillStyle = `rgba(${color}, ${.30 + wave * .09 + glow * .55})`;
    context.beginPath();
    context.arc(x, y, 1.05, 0, Math.PI * 2);
    context.fill();
  }

  if (!still) frame = requestAnimationFrame(draw);
}

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  dots.length = 0;
  for (let y = (height / 2 + spacing / 2) % spacing; y < height; y += spacing) {
    for (let x = (width / 2 + spacing / 2) % spacing; x < width; x += spacing) {
      dots.push({ x, y, offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, color: Math.floor(Math.random() * palette.length) });
    }
  }
}

if (context) {
  resize();
  draw(performance.now());
  document.body.classList.add("wave-field-ready");
  window.addEventListener("resize", () => {
    resize();
    if (!frame) draw(performance.now());
  });
  reducedMotion.addEventListener("change", () => {
    cancelAnimationFrame(frame);
    pointer = undefined;
    lastTime = 0;
    draw(performance.now());
  });

  window.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  const clearPointer = () => { pointer = undefined; };
  document.documentElement.addEventListener("pointerleave", clearPointer);
  window.addEventListener("blur", clearPointer);
}

for (const control of [...controls, glowRadius, pointerGlow, dotColor]) {
  control.addEventListener("input", () => {
    if (control === pointerGlow) document.body.classList.toggle("pointer-glow-off", !control.valueAsNumber);
    if (context && !frame) draw(performance.now());
    control.nextElementSibling.value = control.value + (control === glowRadius ? " px" : "%");
  });
}
