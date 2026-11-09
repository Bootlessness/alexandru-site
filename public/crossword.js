const crossword = document.querySelector(".crossword");
const title = crossword.querySelector(".name-toggle");
const menu = crossword.querySelector(".crossword-menu");
const glyphs = [...title.querySelectorAll(".name-glyph")];
const branches = [...menu.querySelectorAll(".crossword-word")].map((word) => ({
  word,
  joint: title.querySelector(`[data-joint="${word.dataset.word}"]`),
}));
const stayOpenDistance = 105;
let collapseTimer;
let pointer;

function alignBranches() {
  const left = crossword.getBoundingClientRect().left;
  for (const { word, joint } of branches) {
    const rect = joint.getBoundingClientRect();
    word.style.setProperty("--anchor", rect.left + rect.width / 2 - left + "px");
  }
  paintPointer();
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
  if (open) alignBranches();
  else delete crossword.dataset.active;
}

const observer = new ResizeObserver(alignBranches);
observer.observe(title);
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
  const active = branches.find(({ word }) => word.matches(":hover, :focus-visible"));
  if (!active) {
    delete crossword.dataset.active;
    return;
  }
  crossword.dataset.active = active.word.dataset.word;
  crossword.style.setProperty("--active-ink", getComputedStyle(active.word).getPropertyValue("--word-ink"));
}

for (const { word } of branches) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) {
    word.addEventListener(type, () => requestAnimationFrame(updateActiveWord));
  }
  if (word.dataset.panel) {
    word.addEventListener("click", () => document.getElementById(word.dataset.panel).showModal());
  }
}

window.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || event.buttons) return;
  const { clientX: x, clientY: y } = event;
  pointer = { x, y };
  paintPointer();

  if (!crossword.hasAttribute("data-open") || document.querySelector(".crossword-panel[open]")) return;
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
  if (event.pointerType !== "mouse" && !crossword.contains(event.target) && !document.querySelector(".crossword-panel[open]")) {
    setOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || document.querySelector(".crossword-panel[open]")) return;
  if (menu.contains(document.activeElement)) title.focus();
  setOpen(false);
});
