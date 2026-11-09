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
  const eraserDiameter = 160 / Math.PI;
  const finePointer = window.matchMedia("(pointer: fine)");
  let pixelRatio = 1;
  let width = 0;
  let height = 0;
  let activePointer = null;
  let lastPoint = null;
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
  }

  function pointFrom(event) {
    return {
      x: event.clientX,
      y: event.clientY,
      pressure: event.pointerType === "pen" ? Math.max(0.08, event.pressure) : 0.48,
    };
  }

  // Individual graphite flecks build up darker where a stroke passes repeatedly.
  function pencilSegment(from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 0.55));
    context.save();
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "#514b42";
    context.fillStyle = "#514b42";
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

  function eraseSegment(from, to) {
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.globalAlpha = 1;
    context.lineWidth = eraserDiameter;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.beginPath();
    context.arc(to.x, to.y, eraserDiameter / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawTo(point) {
    if (isErasing()) eraseSegment(lastPoint || point, point);
    else pencilSegment(lastPoint || point, point);
    lastPoint = point;
  }

  function positionCursor(event) {
    cursorPoint = { x: event.clientX, y: event.clientY };
    const overControl = event.target.closest && event.target.closest("a, button");
    cursorVisible = finePointer.matches && event.pointerType !== "touch" && (!overControl || activePointer !== null);
    cursor.style.opacity = cursorVisible ? "1" : "0";
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
    lastPoint = pointFrom(event);
    canvas.setPointerCapture(event.pointerId);
    drawTo(lastPoint);
    positionCursor(event);
  });

  canvas.addEventListener("pointermove", (event) => {
    syncCommand(event);
    if (event.pointerId !== activePointer) return;
    const points = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    for (const sample of points.length ? points : [event]) drawTo(pointFrom(sample));
  });

  function finishStroke(event) {
    if (event.pointerId !== activePointer) return;
    if (event.type === "pointerup") drawTo(pointFrom(event));
    if (canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
    activePointer = null;
    lastPoint = null;
  }

  canvas.addEventListener("pointerup", finishStroke);
  canvas.addEventListener("pointercancel", finishStroke);
  canvas.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === activePointer) {
      activePointer = null;
      lastPoint = null;
    }
  });

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
    activePointer = null;
    lastPoint = null;
    cursor.style.opacity = "0";
    updateMode();
  });

  eraserButton.addEventListener("click", () => {
    eraserSelected = !eraserSelected;
    updateMode();
  });
  clearButton.addEventListener("click", () => {
    context.clearRect(0, 0, width, height);
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
  if (!finePointer.matches) hint.textContent = "Draw with your finger. Tap Eraser to erase.";
})();
