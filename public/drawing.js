import { pencilSegment } from "./pencil.js";
import { createFallingShapes, eraseSegment } from "./shapes.js";
import { copySketchAsSvg } from "./export-svg.js";
import { paperTile } from "./paper-grain.js";

(() => {
  "use strict";

  const canvas = document.getElementById("drawing-canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const cursor = document.getElementById("drawing-cursor");
  const eraserButton = document.getElementById("eraser-toggle");
  const clearButton = document.getElementById("clear-drawing");
  const status = document.getElementById("drawing-status");
  const hint = document.querySelector(".drawing-hint");
  const titleColor = document.querySelector(".title-color");
  if (titleColor || document.querySelector(".crossword")) document.body.style.setProperty("--paper-grain", paperTile());
  const shapes = createFallingShapes(canvas, context, (count) => {
    status.textContent = count === 1 ? "A shape detached." : count + " shapes detached.";
  });
  const eraserDiameter = 160 / Math.PI;
  const finePointer = window.matchMedia("(pointer: fine)");
  let pixelRatio = 1;
  let width = 0;
  let height = 0;
  let activePointer = null;
  let lastPoint = null;
  let drewPencil = false;
  let grabbing = false;
  const motion = [];
  let eraserSelected = false;
  let commandHeld = false;
  let cursorPoint = null;
  let cursorVisible = false;
  let resizeFrame = 0;

  document.documentElement.style.setProperty("--eraser-size", eraserDiameter + "px");

  function drawingEnabled() {
    return document.body.dataset.playground !== "off";
  }

  function isErasing() {
    return drawingEnabled() && (eraserSelected || commandHeld);
  }

  function updateMode() {
    const erasing = isErasing();
    document.body.dataset.drawingMode = erasing ? "eraser" : "pencil";
    eraserButton.setAttribute("aria-pressed", String(eraserSelected));
    status.textContent = erasing ? "Eraser selected." : "Pencil selected.";
    updateCursor();
  }

  function resizeCanvas() {
    const previous = document.createElement("canvas");
    previous.width = canvas.width;
    previous.height = canvas.height;
    if (width && height) previous.getContext("2d").drawImage(canvas, 0, 0);
    const oldWidth = width;
    const oldHeight = height;
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (oldWidth && oldHeight) {
      context.drawImage(previous, 0, 0, oldWidth, oldHeight);
    }
    shapes.resize(width, height, pixelRatio);
  }

  function pointFrom(event) {
    return {
      x: event.clientX,
      y: event.clientY,
      pressure: event.pointerType === "pen" ? Math.max(0.08, event.pressure) : 0.48,
      time: event.timeStamp,
    };
  }

  function track(point) {
    motion.push(point);
    while (motion.length > 2 && motion[1].time < point.time - 95) motion.shift();
    const first = motion[0];
    const seconds = Math.max(0.025, (point.time - first.time) / 1000);
    return { x: (point.x - first.x) / seconds, y: (point.y - first.y) / seconds };
  }

  const chalkControl = document.getElementById("chalk-grain");
  const chalkSample = document.getElementById("chalk-sample");

  if (chalkControl && chalkSample) {
    const sampleBrush = chalkSample.getContext("2d");
    const updateChalkSample = () => {
      chalkControl.nextElementSibling.value = chalkControl.value + "%";
      sampleBrush.clearRect(0, 0, chalkSample.width, chalkSample.height);
      pencilSegment({ x: 9, y: 16, pressure: 0.48 }, { x: 216, y: 9, pressure: 0.48 }, sampleBrush);
    };
    chalkControl.addEventListener("input", updateChalkSample);
    updateChalkSample();
  }

  function drawTo(point) {
    const from = lastPoint || point;
    const velocity = track(point);
    if (grabbing) {
      shapes.move(point);
      return velocity;
    }
    if (isErasing()) {
      eraseSegment(context, from, point, eraserDiameter);
      shapes.erase(from, point, eraserDiameter);
      drewPencil = false;
    } else {
      pencilSegment(from, point, context);
      shapes.record(from, point, !drewPencil);
      drewPencil = true;
    }
    lastPoint = point;
    return velocity;
  }

  function updateCursor() {
    const overShape = drawingEnabled() && cursorVisible && !isErasing() && activePointer === null && shapes.hit(cursorPoint) >= 0;
    canvas.dataset.cursor = grabbing ? "grabbing" : overShape ? "grab" : "draw";
    cursor.style.opacity = cursorVisible && !grabbing && !overShape ? "1" : "0";
  }

  function positionCursor(event) {
    cursorPoint = { x: event.clientX, y: event.clientY };
    const overControl = event.target.closest && event.target.closest("a, button");
    cursorVisible = finePointer.matches && event.pointerType !== "touch" && (!overControl || activePointer !== null);
    updateCursor();
    cursor.style.transform = "translate3d(" + cursorPoint.x + "px," + cursorPoint.y + "px,0) translate(-50%,-50%)";
  }

  function syncCommand(event) {
    if (commandHeld !== event.metaKey) {
      commandHeld = event.metaKey;
      updateMode();
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!drawingEnabled() || !event.isPrimary || event.button !== 0 || activePointer !== null) return;
    event.preventDefault();
    syncCommand(event);
    activePointer = event.pointerId;
    drewPencil = false;
    lastPoint = pointFrom(event);
    motion.length = 0;
    grabbing = !isErasing() && shapes.grab(lastPoint);
    canvas.setPointerCapture(event.pointerId);
    if (document.body.dataset.playground === "on" && !grabbing && !isErasing()) hint.hidden = true;
    drawTo(lastPoint);
    positionCursor(event);
  });

  canvas.addEventListener("pointermove", (event) => {
    syncCommand(event);
    if (event.pointerId !== activePointer) return;
    const points = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    let point;
    let velocity;
    for (const sample of points.length ? points : [event]) {
      point = pointFrom(sample);
      velocity = drawTo(point);
    }
    if (!grabbing && drewPencil) shapes.detach(point, velocity);
  });

  function finishStroke(event) {
    if (event.pointerId !== activePointer) return;
    let velocity = { x: 0, y: 0 };
    if (event.type === "pointerup") {
      syncCommand(event);
      const point = pointFrom(event);
      velocity = drawTo(point);
      if (!grabbing && drewPencil) shapes.detach(point, velocity);
    }
    endPointer(velocity);
    positionCursor(event);
  }

  function endPointer(velocity = { x: 0, y: 0 }) {
    if (grabbing) shapes.toss(velocity);
    grabbing = false;
    if (canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
    activePointer = null;
    lastPoint = null;
  }

  canvas.addEventListener("pointerup", finishStroke);
  canvas.addEventListener("pointercancel", finishStroke);
  canvas.addEventListener("lostpointercapture", finishStroke);

  window.addEventListener("pointermove", (event) => {
    positionCursor(event);
    if (!titleColor || event.pointerType !== "mouse") return;
    const { left, top } = titleColor.getBoundingClientRect();
    titleColor.style.setProperty("--reveal-x", event.clientX - left + "px");
    titleColor.style.setProperty("--reveal-y", event.clientY - top + "px");
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    cursorVisible = false;
    cursor.style.opacity = "0";
    titleColor?.style.removeProperty("--reveal-x");
    titleColor?.style.removeProperty("--reveal-y");
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Meta" && !commandHeld) {
      commandHeld = true;
      updateMode();
    }
    if (event.key === "Escape") {
      eraserSelected = false;
      commandHeld = false;
      updateMode();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "Meta" || !event.metaKey) {
      commandHeld = false;
      updateMode();
    }
  });
  window.addEventListener("blur", () => {
    commandHeld = false;
    if (activePointer !== null) endPointer();
    cursorVisible = false;
    updateMode();
  });

  document.body.addEventListener("playgroundchange", () => {
    hint.hidden = !drawingEnabled();
    if (!drawingEnabled()) {
      if (activePointer !== null) endPointer();
      eraserSelected = false;
      commandHeld = false;
    }
    updateMode();
  });

  eraserButton.addEventListener("click", () => {
    eraserSelected = !eraserSelected;
    updateMode();
  });
  clearButton.addEventListener("click", () => {
    if (activePointer !== null) endPointer();
    context.clearRect(0, 0, width, height);
    shapes.clear();
    status.textContent = "Drawing cleared.";
  });
  const copyButton = document.getElementById("copy-svg");
  if (copyButton) {
    let resetCopyLabel;
    copyButton.addEventListener("click", async () => {
      const copied = await copySketchAsSvg();
      const message = copied ? "Copied SVG" : "Downloaded SVG";
      status.textContent = message + ".";
      copyButton.textContent = message;
      clearTimeout(resetCopyLabel);
      resetCopyLabel = setTimeout(() => { copyButton.textContent = "Copy SVG"; }, 1800);
    });
  }
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resizeCanvas);
  });

  resizeCanvas();
  updateMode();
  document.body.classList.add("drawing-ready");
  document.querySelector(".drawing-tools").hidden = false;
  hint.hidden = false;
  if (!finePointer.matches) hint.textContent = "Draw a loop, then drag or flick it.";
})();
