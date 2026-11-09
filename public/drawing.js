import { createFallingShapes, eraseSegment } from "./shapes.js";

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
  const shapes = createFallingShapes(canvas, context, (count) => {
    status.textContent = count === 1 ? "A shape detached." : count + " shapes detached.";
  });
  const eraserDiameter = 160 / Math.PI;
  const finePointer = window.matchMedia("(pointer: fine)");
  const pencilColor = getComputedStyle(document.documentElement).getPropertyValue("--pencil").trim();
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

  function isErasing() {
    return eraserSelected || commandHeld;
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

  // Individual pencil flecks build up where a stroke passes repeatedly.
  function pencilSegment(from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 0.55));
    context.save();
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = pencilColor;
    context.fillStyle = pencilColor;
    context.lineWidth = 0.7;
    context.lineCap = "round";
    context.globalAlpha = 0.055;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const pressure = from.pressure + (to.pressure - from.pressure) * t;
      const spread = 1.25 + pressure * 1.8;
      const flecks = Math.ceil(3 + pressure * 4);
      for (let j = 0; j < flecks; j++) {
        const dx = (Math.random() + Math.random() - 1) * spread;
        const dy = (Math.random() + Math.random() - 1) * spread;
        const size = 0.3 + Math.random() * 0.65;
        context.globalAlpha = (0.12 + Math.random() * 0.32) * (0.55 + pressure);
        context.fillRect(x + dx, y + dy, size, size * (0.65 + Math.random() * 0.7));
      }
    }
    context.restore();
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
      pencilSegment(from, point);
      shapes.record(from, point, !drewPencil);
      drewPencil = true;
    }
    lastPoint = point;
    return velocity;
  }

  function updateCursor() {
    const overShape = cursorVisible && !isErasing() && activePointer === null && shapes.hit(cursorPoint) >= 0;
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
    if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
    event.preventDefault();
    syncCommand(event);
    activePointer = event.pointerId;
    drewPencil = false;
    lastPoint = pointFrom(event);
    motion.length = 0;
    grabbing = !isErasing() && shapes.grab(lastPoint);
    canvas.setPointerCapture(event.pointerId);
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

  window.addEventListener("pointermove", positionCursor, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    cursorVisible = false;
    cursor.style.opacity = "0";
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
