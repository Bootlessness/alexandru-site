const viewport = document.querySelector(".node-viewport");
const titleColor = document.querySelector(".title-color");
viewport.scrollTo(viewport.clientWidth, viewport.clientHeight);
let pan;
const smooth = viewport.closest(".v7-page");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let frame = 0;
let targetX, targetY, currentX, currentY, previousTime;

export function stopBoardPan() {
  cancelAnimationFrame(frame);
  frame = 0;
}

function moveBoard(x, y) {
  if (!smooth || reducedMotion.matches) {
    stopBoardPan();
    viewport.scrollTo(x, y);
    return;
  }
  targetX = Math.max(0, Math.min(x, viewport.scrollWidth - viewport.clientWidth));
  targetY = Math.max(0, Math.min(y, viewport.scrollHeight - viewport.clientHeight));
  if (frame) return;
  currentX = viewport.scrollLeft;
  currentY = viewport.scrollTop;
  previousTime = performance.now();
  frame = requestAnimationFrame(settle);
}

function settle(now) {
  const easing = 1 - Math.exp(-Math.max(0, now - previousTime) / 48);
  previousTime = now;
  currentX += (targetX - currentX) * easing;
  currentY += (targetY - currentY) * easing;
  if (Math.hypot(targetX - currentX, targetY - currentY) < .5) {
    frame = 0;
    viewport.scrollTo(targetX, targetY);
    return;
  }
  viewport.scrollTo(currentX, currentY);
  frame = requestAnimationFrame(settle);
}

if (smooth) {
  viewport.addEventListener("wheel", (event) => {
    if (event.ctrlKey || reducedMotion.matches) return;
    event.preventDefault();
    if (pan) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    moveBoard((frame ? targetX : viewport.scrollLeft) + event.deltaX * unit,
      (frame ? targetY : viewport.scrollTop) + event.deltaY * unit);
  }, { passive: false });
  reducedMotion.addEventListener("change", stopBoardPan);
}
viewport.addEventListener("pointerdown", (event) => {
  if (pan || event.button !== 0 || event.target.closest("button, a, .node-card")) return;
  stopBoardPan();
  pan = { id: event.pointerId, x: event.clientX + viewport.scrollLeft, y: event.clientY + viewport.scrollTop };
  viewport.setPointerCapture(pan.id);
  viewport.classList.add("node-panning");
});
viewport.addEventListener("pointermove", (event) => {
  if (event.pointerId === pan?.id) moveBoard(pan.x - event.clientX, pan.y - event.clientY);
  if (event.pointerType !== "mouse") return;
  const { left, top } = titleColor.getBoundingClientRect();
  titleColor.style.setProperty("--reveal-x", event.clientX - left + "px");
  titleColor.style.setProperty("--reveal-y", event.clientY - top + "px");
});
viewport.addEventListener("lostpointercapture", (event) => {
  if (event.pointerId !== pan?.id) return;
  pan = undefined;
  viewport.classList.remove("node-panning");
});
viewport.addEventListener("pointerleave", () => {
  titleColor.style.removeProperty("--reveal-x");
  titleColor.style.removeProperty("--reveal-y");
});
