import "./board-pan.js";

const board = document.querySelector(".node-board");
const wire = board.querySelector(".node-wires path");
const input = board.querySelector(".node-output .node-port");
const dialog = document.querySelector("#node-module-title").closest("dialog");
let source;
let drag;
let connected = false;
let opening = false;
let wireEnd;
let wireStart;
let wireFrame = 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

dialog.querySelector(".node-module-close").addEventListener("click", () => dialog.close());

function center(port) {
  const rect = port.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function draw(end = center(input)) {
  if (!source) return;
  const { left, top } = board.getBoundingClientRect();
  const start = center(source);
  const x1 = start.x - left;
  const y1 = start.y - top;
  const x2 = end.x - left;
  const y2 = end.y - top;
  const curve = Math.max(24, Math.abs(x2 - x1) * .45);
  wire.setAttribute("d", `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`);
}

function refreshWire() {
  wireFrame = 0;
  if (!connected && drag === undefined) return;
  draw(connected ? undefined : wireEnd);
  if (!connected && !reducedMotion.matches) wireFrame = requestAnimationFrame(refreshWire);
}

function updateWire() {
  if (!wireFrame) refreshWire();
}

function select(port) {
  source?.closest(".node-card").classList.remove("node-connected");
  input.closest(".node-card").classList.remove("node-connected");
  source?.setAttribute("aria-pressed", "false");
  source = port;
  connected = false;
  source?.setAttribute("aria-pressed", "true");
  wire.removeAttribute("d");
  if (port) wire.style.color = getComputedStyle(port).getPropertyValue("--node-color");
}

async function connect() {
  if (!source || opening || dialog.open) return;
  opening = true;
  connected = true;
  source.setAttribute("aria-pressed", "false");
  source.closest(".node-card").classList.add("node-connected");
  input.closest(".node-card").classList.add("node-connected");
  draw();
  if (!reducedMotion.matches) {
    await input.animate(
      [{ scale: 1 }, { scale: 1.65, offset: .4 }, { scale: 1 }],
      { duration: 230, easing: "ease-out" },
    ).finished;
  }
  dialog.querySelector("h2").textContent = source.closest("article").querySelector("h2").textContent;
  dialog.showModal();
  opening = false;
}

for (const port of board.querySelectorAll(".node-sources .node-port")) {
  port.addEventListener("click", (event) => {
    if (event.detail === 0 && !opening && source !== port) select(port);
  });
  port.addEventListener("pointerdown", (event) => {
    if (opening || event.button !== 0) return;
    select(port);
    drag = event.pointerId;
    port.setPointerCapture(drag);
    wireEnd = { x: event.clientX, y: event.clientY };
    wireStart = wireEnd;
    updateWire();
  });
  port.addEventListener("pointermove", (event) => {
    if (event.pointerId !== drag) return;
    wireEnd = { x: event.clientX, y: event.clientY };
    updateWire();
  });
  port.addEventListener("pointerup", (event) => {
    if (event.pointerId !== drag) return;
    drag = undefined;
    const target = center(input);
    if (Math.hypot(event.clientX - target.x, event.clientY - target.y) <= 22) connect();
    else if (Math.hypot(event.clientX - wireStart.x, event.clientY - wireStart.y) > 5) select(undefined);
    else wire.removeAttribute("d");
  });
  port.addEventListener("pointercancel", () => {
    drag = undefined;
    select(undefined);
  });
}
input.addEventListener("click", connect);
window.addEventListener("resize", updateWire);
reducedMotion.addEventListener("change", updateWire);

for (const card of board.querySelectorAll(".node-card")) {
  let held;
  let x = 0;
  let y = 0;
  card.addEventListener("pointerdown", (event) => {
    if (held || event.button !== 0 || event.target.closest(".node-port")) return;
    held = { id: event.pointerId, x: event.clientX - x, y: event.clientY - y };
    card.setPointerCapture(held.id);
    card.classList.add("node-moving");
  });
  card.addEventListener("pointermove", (event) => {
    if (event.pointerId !== held?.id) return;
    x = event.clientX - held.x;
    y = event.clientY - held.y;
    card.style.translate = `${x}px ${y}px`;
    updateWire();
  });
  card.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId !== held?.id) return;
    held = undefined;
    card.classList.remove("node-moving");
  });
}
