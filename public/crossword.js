import { pencilSegment } from "./drawing.js";

const crossword = document.querySelector(".crossword");
const title = crossword.querySelector(".name-toggle");
const menu = crossword.querySelector(".crossword-menu");
const page = crossword.closest(".page");
const sizeControl = document.getElementById("menu-size");
const settings = sizeControl?.closest(".crossword-settings");
const sizeOutput = settings?.querySelector("output");
const metrics = sizeControl && document.createElement("canvas").getContext("2d");
const range = sizeControl && document.createRange();
const glyphs = [...title.querySelectorAll(".name-glyph")];
const branches = [...menu.querySelectorAll(".crossword-word")].map((word) => ({
  word,
  joint: title.querySelector(`[data-joint="${word.dataset.word}"]`),
  gap: word.querySelector(".crossword-gap"),
}));
const stayOpenDistance = 105;
let collapseTimer;
let pointer;
let previewWord;
let outlineAnimation;
let namePreviewAnimations = [];
const revealedLetters = [...title.querySelectorAll(".name-rest .name-glyph")];
revealedLetters.forEach((letter, index) => letter.style.setProperty("--letter-order", index));

if (settings) {
  for (const { word } of branches) {
    const grainId = `outline-grain-${word.dataset.word}`;
    word.insertAdjacentHTML("beforeend", `<svg class="crossword-outline" aria-hidden="true" viewBox="0 0 52 280" preserveAspectRatio="none">
      <defs>
        <filter id="${grainId}" x="-20%" y="-10%" width="140%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".8 .46" numOctaves="3" seed="9" result="grain"/>
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="roughStroke"/>
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2 -.52" result="flecks"/>
          <feComposite in="roughStroke" in2="flecks" operator="in"/>
        </filter>
      </defs>
      <path filter="url(#${grainId})" d="M29 4 C6 -1 2 59 3 145 S11 278 25 276 C44 279 49 223 49 139 S44 6 26 3" pathLength="1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg><canvas class="crossword-outline" aria-hidden="true"></canvas>`);
  }
}

const typeGrain = settings && branches[0].word.querySelector("filter").cloneNode(true);
if (typeGrain) {
  typeGrain.id = "crossword-type-grain";
  const definitions = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  definitions.setAttribute("width", "0");
  definitions.setAttribute("height", "0");
  definitions.setAttribute("aria-hidden", "true");
  definitions.style.position = "absolute";
  definitions.append(typeGrain);
  page.append(definitions);
}

function replayOutline(word) {
  const path = word?.querySelector(".crossword-outline path");
  if (!path) return;
  cancelAnimationFrame(outlineAnimation);
  const canvas = word.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(rect.width * ratio);
  canvas.height = Math.ceil(rect.height * ratio);
  const brush = canvas.getContext("2d");
  const color = getComputedStyle(word).color;
  brush.scale(ratio, ratio);
  const length = path.getTotalLength();
  const steps = Math.ceil(Math.max(length, rect.height * 2 + rect.width * 2));
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0 : Number(settings.querySelector('[data-setting="outline-duration"]').value);
  const start = performance.now();
  let step = 0;

  function pointAt(index) {
    const point = path.getPointAtLength(index / steps * length);
    return { x: point.x * rect.width / 52, y: point.y * rect.height / 280, pressure: 0.48 };
  }

  function draw(now) {
    const progress = duration ? Math.min(1, (now - start) / duration) : 1;
    const end = Math.floor(progress * steps);
    while (step < end) {
      pencilSegment(pointAt(step), pointAt(step + 1), brush, color);
      step++;
    }
    if (step < steps) outlineAnimation = requestAnimationFrame(draw);
  }

  outlineAnimation = requestAnimationFrame(draw);
}

function alignBranches() {
  const stage = crossword.getBoundingClientRect();
  const open = crossword.hasAttribute("data-open");
  for (const { word, joint, gap } of branches) {
    const rect = joint.getBoundingClientRect();
    word.style.setProperty("--anchor", rect.left + rect.width / 2 - stage.left + "px");
    if (metrics && open) alignJoint(word, joint, gap, stage.top);
  }
  if (sizeControl) {
    const menuSize = parseFloat(getComputedStyle(branches[0].word).fontSize);
    const nameSize = parseFloat(getComputedStyle(title).fontSize);
    sizeControl.value = Math.round(menuSize / nameSize * 100);
    sizeOutput.value = sizeControl.value + "%";
    sizeControl.setAttribute("aria-valuetext", sizeControl.value + "% of name size");
    updateScrollRoom(open);
  }
  paintPointer();
}

function inkEdges(letter) {
  const style = getComputedStyle(letter);
  metrics.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const ink = metrics.measureText(letter.textContent);
  range.selectNodeContents(letter);
  const rect = range.getBoundingClientRect();
  const baseline = rect.top + (rect.height + ink.fontBoundingBoxAscent - ink.fontBoundingBoxDescent) / 2;
  return { top: baseline - ink.actualBoundingBoxAscent, bottom: baseline + ink.actualBoundingBoxDescent };
}

function alignJoint(word, joint, gap, stageTop) {
  const jointInk = inkEdges(joint);
  const spacing = parseFloat(getComputedStyle(word).fontSize) * 0.24;
  const before = gap.previousElementSibling;
  const after = gap.nextElementSibling;
  const gapTop = before
    ? jointInk.top - spacing + before.getBoundingClientRect().bottom - inkEdges(before).bottom
    : jointInk.top;
  const gapBottom = jointInk.bottom + spacing - (inkEdges(after).top - after.getBoundingClientRect().top);
  word.style.setProperty("--joint-top", gapTop - stageTop + "px");
  word.style.setProperty("--joint-height", Math.max(0, gapBottom - gapTop) + "px");
}

function updateScrollRoom(open) {
  const name = title.getBoundingClientRect();
  const margin = Math.max(100, (window.innerHeight - name.height) / 2);
  const menuBounds = open ? branches.map(({ word }) => word.getBoundingClientRect()) : [name];
  const top = Math.max(0, name.top - Math.min(...menuBounds.map((rect) => rect.top)) + 80 - margin);
  const bottom = Math.max(0, Math.max(...menuBounds.map((rect) => rect.bottom)) - name.bottom + 80 - margin);
  page.style.setProperty("--extra-top", Math.ceil(top) + "px");
  page.style.setProperty("--extra-bottom", Math.ceil(bottom) + "px");
  window.scrollBy(0, title.getBoundingClientRect().top - name.top);
}

function paintPointer() {
  if (!pointer) return;
  const rects = glyphs.map((glyph) => glyph.getBoundingClientRect());
  glyphs.forEach((glyph, index) => {
    glyph.style.setProperty("--local-x", pointer.x - rects[index].left + "px");
    glyph.style.setProperty("--local-y", pointer.y - rects[index].top + "px");
  });
}

function setOpen(open) {
  clearTimeout(collapseTimer);
  collapseTimer = undefined;
  crossword.toggleAttribute("data-open", open);
  title.setAttribute("aria-expanded", String(open));
  menu.inert = !open;
  if (open || sizeControl) alignBranches();
  if (!open) delete crossword.dataset.active;
}

const observer = new ResizeObserver(alignBranches);
observer.observe(title);
if (sizeControl) {
  window.addEventListener("resize", alignBranches);
  document.fonts.ready.then(alignBranches);
  settings.addEventListener("toggle", () => {
    if (!settings.open) {
      previewWord = undefined;
      updateActiveWord();
    }
  });
  settings.addEventListener("pointerenter", () => {
    clearTimeout(collapseTimer);
    collapseTimer = undefined;
  });
  sizeControl.addEventListener("focus", () => setOpen(true));
  sizeControl.addEventListener("input", () => {
    crossword.style.setProperty("--menu-size", `calc(var(--name-size) * ${sizeControl.value / 100})`);
    setOpen(true);
    previewWord = branches[0];
    updateActiveWord();
  });
}
title.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse" && !event.buttons) setOpen(true);
});
title.addEventListener("click", (event) => {
  setOpen(event.pointerType === "mouse" || !crossword.hasAttribute("data-open"));
});
title.addEventListener("focus", () => {
  if (title.matches(":focus-visible")) setOpen(true);
});

function updateActiveWord() {
  const active = branches.find(({ word }) => word.matches(":hover"))
    ?? branches.find(({ word }) => word.matches(":focus-visible"))
    ?? previewWord;
  for (const { word } of branches) word.toggleAttribute("data-highlighted", word === active?.word);
  if (!active) {
    delete crossword.dataset.active;
    return;
  }
  const changed = crossword.dataset.active !== active.word.dataset.word;
  crossword.dataset.active = active.word.dataset.word;
  const style = getComputedStyle(active.word);
  const ink = style.getPropertyValue(sizeControl ? "--word-highlight" : "--word-ink");
  const colorChanged = crossword.style.getPropertyValue("--active-ink") !== ink;
  crossword.style.setProperty("--active-ink", ink);
  if (changed || colorChanged) replayOutline(active.word);
}

for (const { word } of branches) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) {
    word.addEventListener(type, () => requestAnimationFrame(updateActiveWord));
  }
}

window.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || event.buttons) return;
  const { clientX: x, clientY: y } = event;
  pointer = { x, y };
  paintPointer();

  if (!crossword.hasAttribute("data-open") || document.querySelector(".crossword-panel[open]") || settings?.matches(":hover")) return;
  const bounds = [title, ...branches.map(({ word }) => word)].map((el) => el.getBoundingClientRect());
  const near = x >= Math.min(...bounds.map((rect) => rect.left)) - stayOpenDistance
    && x <= Math.max(...bounds.map((rect) => rect.right)) + stayOpenDistance
    && y >= Math.min(...bounds.map((rect) => rect.top)) - stayOpenDistance
    && y <= Math.max(...bounds.map((rect) => rect.bottom)) + stayOpenDistance;
  if (near) {
    clearTimeout(collapseTimer);
    collapseTimer = undefined;
  } else if (!collapseTimer && !crossword.querySelector(":focus-visible")) {
    collapseTimer = setTimeout(() => setOpen(false), 180);
  }
}, { passive: true });

document.documentElement.addEventListener("pointerleave", () => {
  pointer = undefined;
  for (const glyph of glyphs) {
    glyph.style.removeProperty("--local-x");
    glyph.style.removeProperty("--local-y");
  }
  if (!collapseTimer && !crossword.querySelector(":focus-visible") && !document.querySelector(".crossword-panel[open]")) {
    collapseTimer = setTimeout(() => setOpen(false), 180);
  }
});

document.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" && !crossword.contains(event.target) && !settings?.contains(event.target) && !document.querySelector(".crossword-panel[open]")) {
    setOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || document.querySelector(".crossword-panel[open]")) return;
  if (menu.contains(document.activeElement)) title.focus();
  setOpen(false);
});

for (const control of settings?.querySelectorAll("[data-setting]") ?? []) {
  control.addEventListener("input", () => {
    const value = Number(control.value);
    const property = control.dataset.setting;
    const timing = property.endsWith("duration");
    control.nextElementSibling.value = value + (timing ? " ms" : "%");
    if (property === "paper-grain") {
      document.body.style.setProperty("--paper-grain-opacity", value / 100);
    } else if (property === "type-grain") {
      setTypeGrain(value);
    } else if (property === "ink") {
      page.style.setProperty("--ink-lightness", Math.min(100, value * 0.9) + "%");
    } else if (property === "ease") {
      page.style.setProperty("--ease-in", value / 100);
      page.style.setProperty("--ease-out", (100 - value) / 100);
    } else {
      page.style.setProperty("--" + property, value + (timing ? "ms" : "%"));
    }
    setOpen(true);
    if ((property === "ease" || property === "duration") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const animation of namePreviewAnimations) animation.cancel();
      const duration = Number(settings.querySelector('[data-setting="duration"]').value);
      const ease = Number(settings.querySelector('[data-setting="ease"]').value) / 100;
      namePreviewAnimations = [...title.querySelectorAll(".name-rest")].map((part) => part.animate(
        [{ gridTemplateColumns: "0fr" }, { gridTemplateColumns: "1fr" }],
        { duration, easing: `cubic-bezier(${ease},0,${1 - ease},1)` },
      ));
      for (const letter of revealedLetters) {
        for (const animation of letter.getAnimations()) {
          if (animation.animationName === "name-letter-reveal") animation.currentTime = 0;
        }
      }
    }
    previewWord = branches[0];
    updateActiveWord();
    if (property === "outline-duration") replayOutline(previewWord.word);
  });
}

function setTypeGrain(value) {
  const strength = value / 100;
  typeGrain.querySelector("feDisplacementMap").setAttribute("scale", strength * 1.8);
  typeGrain.querySelector("feColorMatrix").setAttribute("values",
    `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${4 * strength} 0 0 0 ${1 - 2.55 * strength}`);
  document.body.style.setProperty("--type-grain", value ? "url(#crossword-type-grain)" : "none");
}

if (typeGrain) setTypeGrain(Number(settings.querySelector('[data-setting="type-grain"]').value));

document.getElementById("chalk-grain")?.addEventListener("input", () => {
  setOpen(true);
  previewWord = branches[0];
  updateActiveWord();
  replayOutline(branches.find(({ word }) => word.hasAttribute("data-highlighted"))?.word);
});

const playgroundButton = document.getElementById("dock-playground");
const homeButton = document.getElementById("dock-home");

function setPlayground(enabled) {
  document.body.dataset.playground = enabled ? "on" : "off";
  if (enabled) setOpen(false);
  page.inert = enabled;
  playgroundButton.setAttribute("aria-pressed", String(enabled));
  if (enabled) homeButton.removeAttribute("aria-current");
  else homeButton.setAttribute("aria-current", "page");
  document.body.dispatchEvent(new Event("playgroundchange"));
}

playgroundButton?.addEventListener("click", () => setPlayground(document.body.dataset.playground !== "on"));

homeButton?.addEventListener("click", () => {
  setPlayground(false);
  setOpen(false);
  window.scrollTo(0, 0);
});

for (const button of document.querySelectorAll("[data-panel]")) {
  const panel = document.getElementById(button.dataset.panel);
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-controls", panel.id);
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    panel.showModal();
    button.setAttribute("aria-expanded", "true");
  });
  panel.addEventListener("close", () => button.setAttribute("aria-expanded", "false"));
}

const dock = document.querySelector(".crossword-dock");
const grip = dock?.querySelector(".dock-grip");
if (grip) {
  let drag;
  function placeDock(left, top) {
    const maxX = Math.max(4, document.documentElement.clientWidth - dock.offsetWidth - 4);
    const maxY = Math.max(4, window.innerHeight - dock.offsetHeight - 4);
    dock.style.left = Math.min(maxX, Math.max(4, left)) + "px";
    dock.style.top = Math.min(maxY, Math.max(4, top)) + "px";
    dock.style.bottom = "auto";
    dock.style.transform = "none";
    dock.toggleAttribute("data-labels-below", parseFloat(dock.style.top) < 42);
  }
  grip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    const rect = dock.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener("pointermove", (event) => {
    if (drag?.id === event.pointerId) placeDock(event.clientX - drag.x, event.clientY - drag.y);
  });
  grip.addEventListener("lostpointercapture", () => { drag = undefined; });
  grip.addEventListener("keydown", (event) => {
    const offsets = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    const rect = dock.getBoundingClientRect();
    const [x, y] = offsets[event.key];
    placeDock(rect.left + x, rect.top + y);
  });
  window.addEventListener("resize", () => {
    if (!dock.style.top) return;
    const rect = dock.getBoundingClientRect();
    placeDock(rect.left, rect.top);
  });
}

if (settings) {
  settings.querySelector("summary").setAttribute("aria-keyshortcuts", "Meta+H");
  window.addEventListener("keydown", (event) => {
    if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== "h") return;
    event.preventDefault();
    if (event.repeat) return;
    if (settings.contains(document.activeElement)) playgroundButton?.focus();
    settings.open = false;
    settings.hidden = !settings.hidden;
  });
}

const themeToggle = document.querySelector(".theme-toggle");
if (themeToggle) {
  const root = document.documentElement;
  const elements = [
    [document.querySelector(".crossword-name"), "Name", true],
    [document.querySelector(".crossword-message"), "Description", true],
    [dock, "Dock", false],
  ];

  function measureBlueprint() {
    if (root.dataset.theme !== "light") return;
    for (const [element, label, showFont] of elements) {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const font = showFont ? " · " + style.fontFamily.split(",")[0].replaceAll('"', "") + " " + style.fontSize : "";
      element.dataset.measurement = label + " · " + Math.round(bounds.width) + " × " + Math.round(bounds.height) + " px" + font;
    }
  }

  const blueprintObserver = new ResizeObserver(measureBlueprint);
  for (const [element] of elements) blueprintObserver.observe(element);

  themeToggle.addEventListener("click", () => {
    const light = root.dataset.theme !== "light";
    root.dataset.theme = light ? "light" : "dark";
    themeToggle.setAttribute("aria-pressed", String(light));
    document.querySelector('meta[name="theme-color"]').content = light ? "#f5f3ee" : "#191b1e";
    measureBlueprint();
  });
}
