import { paperGrain } from "./paper-grain.js";

const filename = "alexandru-sketchpad.svg";

// Turn adjacent pixels of similar color into SVG paths. This keeps the
// pencil grain and erased areas without relying on bitmap import in Figma.
function pixelPaths(context, scale) {
  const { width, height } = context.canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const paths = new Map();

  function colorAt(index) {
    const alpha = Math.round(pixels[index + 3] * 31 / 255);
    if (!alpha) return 0;
    const channel = (offset) => Math.min(31, Math.round(pixels[index + offset] / 8));
    return (channel(0) << 15) | (channel(1) << 10) | (channel(2) << 5) | alpha;
  }

  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width;) {
      const color = colorAt(row + x * 4);
      const start = x++;
      while (x < width && colorAt(row + x * 4) === color) x++;
      if (!color) continue;

      const length = x - start;
      const run = `M${start} ${y}h${length}v1h-${length}z`;
      if (!paths.has(color)) paths.set(color, []);
      paths.get(color).push(run);
    }
  }

  const layers = [];
  for (const [color, runs] of paths) {
    const red = (color >> 15) * 8;
    const green = ((color >> 10) & 31) * 8;
    const blue = ((color >> 5) & 31) * 8;
    const fill = "#" + ((red << 16) | (green << 8) | blue).toString(16).padStart(6, "0");
    const opacity = ((color & 31) / 31).toFixed(3);
    layers.push(`<path fill="${fill}" fill-opacity="${opacity}" d="${runs.join("")}"/>`);
  }

  return `<g transform="scale(${1 / scale})">${layers.join("")}</g>`;
}

function snapshotContext(width, height, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.scale(scale, scale);
  return context;
}

function setFont(context, style) {
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
}

export function paintText(context, halo, selector = ".introduction, .drawing-tools, .drawing-hint, .crossword-settings, .crossword-message") {
  const range = document.createRange();
  for (const root of document.querySelectorAll(selector)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent.closest(".title-color, .crossword:not([data-open]) .name-rest")) continue;
      const style = getComputedStyle(parent);
      if (style.visibility !== "visible") continue;
      context.fillStyle = !halo ? "#000" : parent.classList.contains("name-glyph")
        ? style.getPropertyValue("--name-ink").trim()
        : style.color;
      setFont(context, style);
      const glow = style.textShadow.match(/^(rgba?\([^)]+\)) 0px 0px ([\d.]+)px$/);
      if (glow && halo) {
        setFont(halo, style);
        halo.shadowColor = glow[1];
        halo.shadowBlur = Number(glow[2]) * halo.getTransform().a;
        halo.shadowOffsetX = -halo.canvas.width;
      }

      const lines = [];
      let line;
      for (let i = 0; i < node.length; i++) {
        if (/\s/.test(node.data[i])) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width) continue;
        if (!line || Math.abs(line.rect.top - rect.top) > 1) {
          line = { start: i, end: i + 1, rect };
          lines.push(line);
        } else {
          line.end = i + 1;
        }
      }

      const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = context.measureText("Hg");
      for (const { start, end, rect } of lines) {
        const text = node.data.slice(start, end).replace(/\s+/g, " ");
        const baseline = rect.top + (rect.height + ascent - descent) / 2;
        context.fillText(text, rect.left, baseline);
        if (glow && halo) halo.fillText(text, rect.left + halo.canvas.width / halo.getTransform().a, baseline);
        if (style.textDecorationLine.includes("underline")) {
          context.fillStyle = style.textDecorationColor;
          context.fillRect(rect.left, baseline + 5, context.measureText(text).width, 1);
        }
      }
    }
  }
}

function gridPaths(width, height, style) {
  const color = style.getPropertyValue("--grid-line").trim();
  const size = parseFloat(style.backgroundSize);
  if (!color || !size) return "";
  const vertical = [];
  const horizontal = [];
  const offset = (length) => ((length - size) / 2 % size + size) % size + 0.5;
  for (let x = offset(width); x < width; x += size) vertical.push(`M${x} 0v${height}`);
  for (let y = offset(height); y < height; y += size) horizontal.push(`M0 ${y}h${width}`);
  const opacity = parseInt(color.slice(7), 16) / 255;
  return `<g id="Grid" fill="none" stroke="${color.slice(0, 7)}" stroke-opacity="${opacity}"><path d="${vertical.join("")}"/><path d="${horizontal.join("")}"/></g>`;
}

function captureSvg() {
  const { innerWidth: width, innerHeight: height } = window;
  const style = getComputedStyle(document.body);
  const artScale = Math.min(1, 2048 / Math.max(width, height));
  const art = snapshotContext(width, height, artScale);
  for (const id of ["falling-shapes", "drawing-canvas"]) {
    const canvas = document.getElementById(id);
    const rect = canvas.getBoundingClientRect();
    art.drawImage(canvas, rect.x, rect.y, rect.width, rect.height);
  }

  const textScale = Math.min(2, 2560 / Math.max(width, height));
  const text = snapshotContext(width, height, textScale);
  const haloScale = Math.min(0.5, artScale);
  const halo = snapshotContext(width, height, haloScale);
  paintText(text, halo);
  const overlap = document.getElementById("shape-text-overlap");
  if (overlap) text.drawImage(overlap, 0, 0, width, height);

  const icon = document.querySelector("#eraser-toggle svg");
  const bounds = icon.getBoundingClientRect();
  const vectorIcon = icon.cloneNode(true);
  vectorIcon.setAttribute("x", bounds.x);
  vectorIcon.setAttribute("y", bounds.y);
  vectorIcon.setAttribute("stroke", getComputedStyle(icon).color);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect id="Background" width="${width}" height="${height}" fill="${style.backgroundColor}"/>`,
    document.body.style.getPropertyValue("--paper-grain") ? paperGrain(width, height) : "",
    gridPaths(width, height, style),
    `<g id="Sketch">${pixelPaths(art, artScale)}</g>`,
    `<g id="Page-labels">${pixelPaths(halo, haloScale)}${pixelPaths(text, textScale)}${vectorIcon.outerHTML}</g>`,
    "</svg>",
  ].join("");
}

export async function copySketchAsSvg() {
  const svg = captureSvg();
  try {
    await navigator.clipboard.writeText(svg);
    return true;
  } catch {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return false;
  }
}
