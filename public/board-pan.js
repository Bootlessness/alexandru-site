const viewport = document.querySelector(".node-viewport");
const titleColor = document.querySelector(".title-color");
viewport.scrollTo(viewport.clientWidth, viewport.clientHeight);
let pan;
viewport.addEventListener("pointerdown", (event) => {
  if (pan || event.button !== 0 || event.target.closest("button, a, .node-card")) return;
  pan = { id: event.pointerId, x: event.clientX + viewport.scrollLeft, y: event.clientY + viewport.scrollTop };
  viewport.setPointerCapture(pan.id);
  viewport.classList.add("node-panning");
});
viewport.addEventListener("pointermove", (event) => {
  if (event.pointerId === pan?.id) viewport.scrollTo(pan.x - event.clientX, pan.y - event.clientY);
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
