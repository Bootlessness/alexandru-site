import { paintText } from "./export-svg.js";
import { fly, putOnFloor, rotated } from "./shape-motion.js";

const colors = ["#b8c3ab", "#d9b6a8", "#b1bdc9", "#d6c295", "#c8b5c9"];
const boundaryWidth = 6;
const padding = 8;
const minimumArea = 90;

export function eraseSegment(context, from, to, diameter) {
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.lineWidth = diameter;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.beginPath();
  context.arc(to.x, to.y, diameter / 2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function spreadMask(mask, radius) {
  const strip = makeCanvas(mask.width, mask.height);
  const spread = makeCanvas(mask.width, mask.height);
  const horizontal = strip.getContext("2d");
  const vertical = spread.getContext("2d");

  for (let offset = -radius; offset <= radius; offset++) {
    horizontal.drawImage(mask, offset, 0);
  }
  for (let offset = -radius; offset <= radius; offset++) {
    vertical.drawImage(strip, 0, offset);
  }
  return spread;
}

function convexHull(points) {
  points.sort((a, b) => a.x - b.x || a.y - b.y);
  function half(list) {
    const result = [];
    for (const point of list) {
      while (result.length > 1) {
        const a = result[result.length - 2];
        const b = result[result.length - 1];
        if ((b.x - a.x) * (point.y - a.y) > (b.y - a.y) * (point.x - a.x)) break;
        result.pop();
      }
      result.push(point);
    }
    result.pop();
    return result;
  }
  return half(points).concat(half(points.reverse()));
}

function limit(value, magnitude) {
  return Math.max(-magnitude, Math.min(magnitude, value));
}

export function createFallingShapes(pencil, pencilContext, announce) {
  const display = document.getElementById("falling-shapes");
  const scene = display.getContext("2d");
  const topology = makeCanvas(1, 1);
  const boundary = topology.getContext("2d", { willReadFrequently: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const shapes = [];
  let ratio = 1;
  let width = 1;
  let height = 1;
  let frame = 0;
  let nextColor = 0;
  let grabbed = null;
  let age = 20;
  let inkAge = new Float32Array(1);
  let possibleCrossing = false;

  const overlap = document.getElementById("shape-text-overlap");
  let overlapFrame;

  function renderOverlap() {
    if (!overlap) return;
    if (overlap.width !== scene.canvas.width) overlap.width = scene.canvas.width;
    if (overlap.height !== scene.canvas.height) overlap.height = scene.canvas.height;
    const ink = overlap.getContext("2d");
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.clearRect(0, 0, width, height);
    if (!shapes.length) return;
    paintText(ink, null, ".crossword, .crossword-message, .drawing-tools, .drawing-hint");
    ink.globalCompositeOperation = "destination-in";
    ink.drawImage(scene.canvas, 0, 0, width, height);
    ink.globalCompositeOperation = "source-over";
  }

  if (overlap) {
    const queueOverlap = () => {
      cancelAnimationFrame(overlapFrame);
      overlapFrame = requestAnimationFrame(renderOverlap);
    };
    const titleObserver = new ResizeObserver(queueOverlap);
    titleObserver.observe(document.querySelector(".name-toggle"));
    document.body.addEventListener("playgroundchange", queueOverlap);
    const message = document.querySelector(".crossword-message");
    message?.addEventListener("transitionrun", (event) => {
      if (event.propertyName !== "top") return;
      function followMessage() {
        queueOverlap();
        if (message.getAnimations().some((animation) => animation.playState === "running")) {
          requestAnimationFrame(followMessage);
        }
      }
      requestAnimationFrame(followMessage);
    });
    const visibilityObserver = new MutationObserver(queueOverlap);
    visibilityObserver.observe(document.querySelector(".drawing-hint"), { attributeFilter: ["hidden"] });
    visibilityObserver.observe(document.querySelector(".crossword"), { attributeFilter: ["data-open"] });
    window.addEventListener("scroll", queueOverlap, { passive: true });
    document.querySelector(".crossword-settings")?.addEventListener("input", queueOverlap);
    document.fonts.ready.then(queueOverlap);
  }

  function render() {
    scene.clearRect(0, 0, width, height);
    for (const shape of shapes) {
      scene.save();
      scene.translate(shape.x, shape.y);
      scene.rotate(shape.angle);
      scene.drawImage(shape.image, -shape.centerX, -shape.centerY, shape.width, shape.height);
      scene.restore();
    }
    renderOverlap();
  }

  function scheduleRender() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      render();
    });
  }

  function launch(shape, vx, vy, spin) {
    if (reducedMotion.matches) putOnFloor(shape, height);
    else fly(shape, vx, vy, spin, () => ({ width, height }), scheduleRender);
  }

  function resize(newWidth, newHeight, newRatio) {
    const previous = makeCanvas(width, height);
    previous.getContext("2d").drawImage(topology, 0, 0);
    const tags = new Float32Array(newWidth * newHeight);
    const rowWidth = Math.min(width, newWidth);
    for (let y = 0; y < Math.min(height, newHeight); y++) {
      tags.set(inkAge.subarray(y * width, y * width + rowWidth), y * newWidth);
    }
    inkAge = tags;
    width = newWidth;
    height = newHeight;
    ratio = newRatio;
    topology.width = width;
    topology.height = height;
    boundary.drawImage(previous, 0, 0);

    display.width = pencil.width;
    display.height = pencil.height;
    scene.setTransform(ratio, 0, 0, ratio, 0, 0);
    for (const shape of shapes) {
      shape.x = Math.max(0, Math.min(width, shape.x));
      if (shape.settled && shape !== grabbed) putOnFloor(shape, height);
    }
    render();
  }

  // Use solid pencil geometry for enclosure detection. The visible graphite stays textured.
  function record(from, to, startsStroke) {
    if (startsStroke) age += 20;
    boundary.lineWidth = boundaryWidth;
    boundary.lineCap = "round";
    boundary.beginPath();
    boundary.moveTo(from.x, from.y);
    boundary.lineTo(to.x, to.y);
    boundary.stroke();

    // Look for nearby older ink so ordinary marks never need a page-wide flood fill.
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance));
    for (let step = 0; step <= steps; step++) {
      const x = Math.round(from.x + (to.x - from.x) * step / steps);
      const y = Math.round(from.y + (to.y - from.y) * step / steps);
      const at = age + distance * step / steps;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      for (let row = Math.max(0, y - boundaryWidth); row <= Math.min(height - 1, y + boundaryWidth) && !possibleCrossing; row++) {
        for (let col = Math.max(0, x - boundaryWidth); col <= Math.min(width - 1, x + boundaryWidth); col++) {
          const previous = inkAge[row * width + col];
          if (previous && at - previous > 15) {
            possibleCrossing = true;
            break;
          }
        }
      }
      inkAge[y * width + x] ||= at;
    }
    age += distance;
  }

  function makeShape(queue, count, left, top, right, bottom, point, velocity) {
    const shapeWidth = right - left + 1;
    const shapeHeight = bottom - top + 1;
    const core = makeCanvas(shapeWidth, shapeHeight);
    const coreContext = core.getContext("2d");
    const pixels = coreContext.createImageData(shapeWidth, shapeHeight);
    const leftByRow = new Int32Array(shapeHeight).fill(shapeWidth);
    const rightByRow = new Int32Array(shapeHeight).fill(-1);
    let totalX = 0;
    let totalY = 0;
    for (let i = 0; i < count; i++) {
      const cell = queue[i];
      const x = cell % width - left;
      const y = Math.floor(cell / width) - top;
      pixels.data[(y * shapeWidth + x) * 4 + 3] = 255;
      leftByRow[y] = Math.min(leftByRow[y], x);
      rightByRow[y] = Math.max(rightByRow[y], x);
      totalX += x;
      totalY += y;
    }
    coreContext.putImageData(pixels, 0, 0);
    const centerX = totalX / count;
    const centerY = totalY / count;
    const edges = [];
    for (let y = 0; y < shapeHeight; y++) {
      if (rightByRow[y] < 0) continue;
      edges.push({ x: leftByRow[y] - centerX, y: y - centerY });
      edges.push({ x: rightByRow[y] - centerX, y: y - centerY });
    }

    const cutout = spreadMask(core, padding);
    const image = makeCanvas(Math.ceil(shapeWidth * ratio), Math.ceil(shapeHeight * ratio));
    const art = image.getContext("2d", { willReadFrequently: true });
    art.setTransform(ratio, 0, 0, ratio, 0, 0);
    art.drawImage(pencil, -left, -top, pencil.width / ratio, pencil.height / ratio);
    art.globalCompositeOperation = "destination-in";
    art.drawImage(cutout, 0, 0);

    const fill = spreadMask(core, 3);
    const fillContext = fill.getContext("2d");
    fillContext.globalCompositeOperation = "source-in";
    fillContext.fillStyle = colors[nextColor++ % colors.length];
    fillContext.fillRect(0, 0, shapeWidth, shapeHeight);
    art.globalCompositeOperation = "destination-over";
    art.drawImage(fill, 0, 0);

    const x = left + centerX;
    const y = top + centerY;
    const inertia = (shapeWidth ** 2 + shapeHeight ** 2) / 12;
    const torque = (point.x - x) * velocity.y - (point.y - y) * velocity.x;
    const spin = torque * 0.23 / inertia;
    const driftSpin = limit((velocity.x || velocity.y) * 0.001, 0.18);
    const shape = {
      image, art, centerX, centerY, x, y, inertia,
      scale: ratio,
      width: shapeWidth,
      height: shapeHeight,
      outline: convexHull(edges),
      angle: 0,
      settled: false,
    };
    return {
      shape, cutout, left, top,
      vx: limit(velocity.x * 0.085, 85),
      vy: limit(velocity.y * 0.035, 40),
      spin: limit(Math.abs(spin) > 0.1 ? spin : driftSpin, 1.2),
    };
  }

  function detach(point, velocity) {
    if (!possibleCrossing) return;
    possibleCrossing = false;
    const ink = boundary.getImageData(0, 0, width, height).data;
    const cells = new Uint8Array(width * height);
    for (let i = 0; i < cells.length; i++) {
      cells[i] = ink[i * 4 + 3] >= 128 ? 1 : 0;
      if (cells[i] === 0) inkAge[i] = 0;
    }
    const queue = new Int32Array(cells.length);
    let end = 0;

    function enqueue(cell) {
      if (cells[cell] !== 0) return;
      cells[cell] = 2;
      queue[end++] = cell;
    }

    function flood() {
      for (let start = 0; start < end; start++) {
        const cell = queue[start];
        const column = cell % width;
        if (column > 0) enqueue(cell - 1);
        if (column < width - 1) enqueue(cell + 1);
        if (cell >= width) enqueue(cell - width);
        if (cell < cells.length - width) enqueue(cell + width);
      }
    }

    // Empty cells reachable from the page edge are outside. The rest are enclosed.
    for (let x = 0; x < width; x++) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      enqueue(y * width);
      enqueue((y + 1) * width - 1);
    }
    flood();

    const detached = [];
    for (let cell = 0; cell < cells.length; cell++) {
      if (cells[cell] !== 0) continue;
      end = 0;
      enqueue(cell);
      flood();
      if (end < minimumArea) continue;
      let left = width;
      let top = height;
      let right = 0;
      let bottom = 0;
      for (let i = 0; i < end; i++) {
        const x = queue[i] % width;
        const y = Math.floor(queue[i] / width);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
      detached.push(makeShape(queue, end, left - padding, top - padding, right + padding, bottom + padding, point, velocity));
    }

    if (detached.length === 0) return;
    pencilContext.save();
    pencilContext.globalCompositeOperation = "destination-out";
    boundary.globalCompositeOperation = "destination-out";
    for (const { shape, cutout, left, top, vx, vy, spin } of detached) {
      pencilContext.drawImage(cutout, left, top);
      boundary.drawImage(cutout, left, top);
      shapes.push(shape);
      launch(shape, vx, vy, spin);
    }
    boundary.globalCompositeOperation = "source-over";
    pencilContext.restore();

    render();
    announce(detached.length);
  }

  function erase(from, to, diameter) {
    eraseSegment(boundary, from, to, diameter);
    const radius = diameter / 2;
    const left = Math.min(from.x, to.x) - radius;
    const top = Math.min(from.y, to.y) - radius;
    const right = Math.max(from.x, to.x) + radius;
    const bottom = Math.max(from.y, to.y) + radius;
    let changed = false;
    for (const shape of shapes) {
      const reach = Math.hypot(shape.width, shape.height);
      if (right < shape.x - reach || left > shape.x + reach || bottom < shape.y - reach || top > shape.y + reach) continue;
      eraseSegment(shape.art, localPoint(shape, from), localPoint(shape, to), diameter);
      changed = true;
    }
    if (changed) render();
  }

  function localPoint(shape, point) {
    const local = rotated({ x: point.x - shape.x, y: point.y - shape.y }, -shape.angle);
    return { x: local.x + shape.centerX, y: local.y + shape.centerY };
  }

  function hit(point) {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const local = localPoint(shape, point);
      if (local.x < 0 || local.y < 0 || local.x >= shape.width || local.y >= shape.height) continue;
      const x = Math.floor(local.x * shape.scale);
      const y = Math.floor(local.y * shape.scale);
      if (shape.art.getImageData(x, y, 1, 1).data[3] > 80) return i;
    }
    return -1;
  }

  function grab(point) {
    const index = hit(point);
    if (index < 0) return false;
    grabbed = shapes[index];
    grabbed.tween?.kill();
    shapes.splice(index, 1);
    shapes.push(grabbed);
    grabbed.gripX = point.x - grabbed.x;
    grabbed.gripY = point.y - grabbed.y;
    render();
    return true;
  }

  function move(point) {
    grabbed.x = point.x - grabbed.gripX;
    grabbed.y = point.y - grabbed.gripY;
    render();
  }

  function toss(velocity) {
    if (!grabbed) return;
    const shape = grabbed;
    grabbed = null;
    const vx = limit(velocity.x, 1300);
    const vy = limit(velocity.y, 1300);
    const torque = shape.gripX * vy - shape.gripY * vx;
    launch(shape, vx, vy, limit(torque * 0.85 / shape.inertia, 8));
    scheduleRender();
  }

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const shape of shapes) shape.tween?.kill();
    shapes.length = 0;
    grabbed = null;
    nextColor = 0;
    age = 20;
    possibleCrossing = false;
    inkAge.fill(0);
    boundary.clearRect(0, 0, width, height);
    render();
  }

  return { resize, record, detach, erase, hit, grab, move, toss, clear };
}
