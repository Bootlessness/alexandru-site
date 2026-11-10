import { stopBoardPan } from "./board-pan.js?smooth=3";

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

const languages = document.querySelectorAll("[data-language]");
const description = document.querySelector(".introduction-copy");
const englishDescription = description.innerHTML;

function prepareWave(phrase, stagger = 12) {
    const letters = new Intl.Segmenter(document.documentElement.lang, { granularity: "grapheme" });
    let index = 0;
    const parts = phrase.textContent.split(/(\s+)/).map((part) => {
      if (!part.trim()) return part;
      const word = document.createElement("span");
      word.className = "phrase-wave-word";
      for (const { segment } of letters.segment(part)) {
        const letter = document.createElement("span");
        letter.textContent = segment;
        letter.style.setProperty("--wave-delay", `${index++ * stagger}ms`);
        word.append(letter);
      }
      return word;
    });
    phrase.replaceChildren(...parts);
}

function preparePhraseWaves() {
  for (const phrase of description.querySelectorAll(".message-role, .message-study, .message-fintech, .message-trust, .message-ai")) {
    prepareWave(phrase);
  }
}

preparePhraseWaves();
const translations = {
  en: ["Language", "Settings", "Versions", "Copy SVG", "Home", "About", "Works", "Writing",
    "Move dock with arrow keys", "Drag to move the dock", "SVG copied", "SVG downloaded"],
  fr: ["Langue", "Réglages", "Versions", "Copier le SVG", "Accueil", "À propos", "Projets", "Écrits",
    "Déplacer le menu avec les flèches", "Faire glisser pour déplacer le menu", "SVG copié", "SVG téléchargé"],
  ro: ["Limbă", "Setări", "Versiuni", "Copiază SVG", "Acasă", "Despre mine", "Proiecte", "Articole",
    "Mută meniul cu tastele săgeată", "Trage pentru a muta meniul", "SVG copiat", "SVG descărcat"],
};
const descriptions = {
  fr: 'Salut ! Je suis <strong class="message-role">designer produit</strong>. Je termine un <strong class="message-study">MSc en management de produit et design UX</strong>, en étudiant comment les utilisateurs gagnent la <strong class="message-trust">confiance</strong> à l’ère de l’<strong class="message-ai">IA</strong>',
  ro: 'Salut! Sunt <strong class="message-role">designer de produs</strong>, urmez un <strong class="message-study">master în management de produs și design UX</strong> cu accent pe modul în care utilizatorii câștigă <strong class="message-trust">încrederea</strong> în era <strong class="message-ai">IA</strong>',
};

function setLanguage(language) {
  const [languageLabel, settings, versions, copy, home, about, works, writing,
    gripLabel, gripTitle, copied, downloaded] = translations[language];
  document.documentElement.lang = language;
  description.innerHTML = descriptions[language] ?? englishDescription;
  preparePhraseWaves();
  document.querySelector(".v7-language").setAttribute("aria-label", languageLabel);
  document.querySelector(".crossword-settings summary").textContent = settings;
  const versionMenu = document.querySelector(".version-menu");
  versionMenu.setAttribute("aria-label", versions);
  versionMenu.querySelector("span").textContent = versions;
  const archiveMenu = document.querySelector(".archive-menu");
  const archives = language === "ro" ? "Arhive" : "Archives";
  archiveMenu.setAttribute("aria-label", archives);
  archiveMenu.querySelector("span").textContent = archives;
  document.getElementById("copy-board-svg").textContent = copy;
  for (const [selector, label] of [["#dock-home", home], ['[data-destination="about"]', about],
    ['[data-destination="works"]', works], ['[data-destination="writing"]', writing]]) {
    dock.querySelector(selector).setAttribute("aria-label", label);
  }
  grip.setAttribute("aria-label", gripLabel);
  grip.title = gripTitle;
  const status = document.getElementById("board-export-status");
  status.value = "";
  Object.assign(status.dataset, { copied, downloaded });
  for (const button of languages) button.setAttribute("aria-pressed", String(button.dataset.language === language));
}

for (const button of languages) button.addEventListener("click", () => setLanguage(button.dataset.language));

const viewport = document.querySelector(".node-viewport");
const world = viewport.querySelector(".node-world");
world.querySelector(".contact-card form").addEventListener("submit", (event) => event.preventDefault());
const detail = document.createElement("dialog");
detail.className = "card-detail";
detail.setAttribute("aria-labelledby", "card-detail-title");
detail.innerHTML = `
  <button type="button" autofocus>← Back</button>
  <section>
    <h2 id="card-detail-title"></h2>
    <p></p>
    <a hidden>View sample CV</a>
  </section>
`;
document.body.append(detail);
const detailTitle = detail.querySelector("h2");
const detailCopy = detail.querySelector("p");
const detailLink = detail.querySelector("a");
let detailCard;

function setDetailBounds(card) {
  const bounds = card.getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  const edges = [bounds.top, clientWidth - bounds.right, clientHeight - bounds.bottom, bounds.left];
  detail.style.setProperty("--card-detail-start", edges.map((edge) => `${Math.max(0, edge)}px`).join(" "));
}

function closeDetail() {
  if (detail.hasAttribute("data-closing")) return;
  if (motionPreference.matches) {
    detail.close();
    return;
  }
  setDetailBounds(detailCard);
  detail.setAttribute("data-closing", "");
}

detail.querySelector("button").addEventListener("click", closeDetail);
detail.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDetail();
});
detail.addEventListener("animationend", (event) => {
  if (event.target === detail && event.animationName === "card-detail-out") detail.close();
});
detail.addEventListener("close", () => detail.removeAttribute("data-closing"));

for (const card of world.querySelectorAll(".card-group--works .showcase-card, .card-group--about .showcase-card")) {
  const label = card.querySelector("header > span");
  const title = label.textContent;
  const opener = document.createElement("button");
  opener.type = "button";
  opener.className = "card-detail-trigger";
  opener.textContent = title;
  opener.setAttribute("aria-haspopup", "dialog");
  label.replaceWith(opener);
  const cardLink = card.querySelector("footer a");
  const cv = cardLink?.getAttribute("href") === "/sample-cv.html";
  if (cardLink) {
    cardLink.setAttribute("aria-label", `Open ${title}`);
    cardLink.setAttribute("aria-haspopup", "dialog");
  }
  card.addEventListener("click", (event) => {
    if (event.target.closest(".card-grip")) return;
    event.preventDefault();
    stopReturn();
    stopBoardPan();
    detailTitle.textContent = title;
    detailCopy.textContent = card.matches(".showcase-card--multiple")
      ? "Away from my desk, I spend time painting and playing guitar. Both give me a different way to think about rhythm and composition."
      : card.querySelector("footer p").textContent;
    detailLink.hidden = !cv;
    if (cv) detailLink.href = cardLink.href;
    detailCard = card;
    setDetailBounds(card);
    detail.showModal();
  });
}
const [coordinateX, coordinateY] = document.querySelectorAll(".v7-coordinates span");
let cursor;

function updateCoordinates() {
  if (!cursor) return;
  const bounds = world.getBoundingClientRect();
  coordinateX.textContent = Math.round(cursor.x - bounds.left - bounds.width / 2);
  coordinateY.textContent = Math.round(cursor.y - bounds.top - bounds.height / 2);
}

viewport.addEventListener("pointermove", (event) => {
  cursor = { x: event.clientX, y: event.clientY };
  updateCoordinates();
}, { passive: true });
viewport.addEventListener("scroll", updateCoordinates, { passive: true });
window.addEventListener("resize", updateCoordinates);

const minimap = document.querySelector(".v7-minimap");
const mapContent = minimap.querySelector(".v7-map-content");
const mapView = minimap.querySelector(".v7-map-view");

function placeMapRect(rect, x, y, width, height) {
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
}

function updateMapView() {
  placeMapRect(mapView, viewport.scrollLeft, viewport.scrollTop, viewport.clientWidth, viewport.clientHeight);
}

function layoutMinimap() {
  const bounds = world.getBoundingClientRect();
  minimap.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  minimap.style.aspectRatio = bounds.width + " / " + bounds.height;
  const markers = [...world.querySelectorAll("h1, .introduction-copy, .node-card, .showcase-card")].map((element) => {
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const rect = element.getBoundingClientRect();
    placeMapRect(marker, rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height);
    return marker;
  });
  mapContent.replaceChildren(...markers);
  updateMapView();
}

viewport.addEventListener("scroll", updateMapView, { passive: true });
const mapLayout = new ResizeObserver(layoutMinimap);
mapLayout.observe(world);
mapLayout.observe(description);

for (const card of world.querySelectorAll(".showcase-card")) {
  const handle = card.querySelector(".card-grip");
  let x = 0;
  let y = 0;
  let drag;

  function moveCard(nextX, nextY) {
    const bounds = world.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    x = Math.min(x + bounds.right - rect.right, Math.max(x + bounds.left - rect.left, nextX));
    y = Math.min(y + bounds.bottom - rect.bottom, Math.max(y + bounds.top - rect.top, nextY));
    card.style.translate = `${x}px ${y}px`;
    layoutMinimap();
    syncDestination();
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    stopBoardPan();
    drag = {
      id: event.pointerId,
      x: event.clientX + viewport.scrollLeft - x,
      y: event.clientY + viewport.scrollTop - y,
    };
    handle.setPointerCapture(event.pointerId);
    card.setAttribute("data-dragging", "");
  });
  handle.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    moveCard(event.clientX + viewport.scrollLeft - drag.x, event.clientY + viewport.scrollTop - drag.y);
  });
  handle.addEventListener("lostpointercapture", () => {
    drag = undefined;
    card.removeAttribute("data-dragging");
  });
  handle.addEventListener("keydown", (event) => {
    const steps = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (!Object.hasOwn(steps, event.key)) return;
    event.preventDefault();
    const [dx, dy] = steps[event.key];
    moveCard(x + dx, y + dy);
  });
}

const home = document.getElementById("dock-home");
const destinations = new Map([
  [home, document.getElementById("name")],
  [dock.querySelector('[data-destination="works"]'), world.querySelector(".card-group--works")],
  [dock.querySelector('[data-destination="about"]'), world.querySelector(".card-group--about")],
  [dock.querySelector('[data-destination="writing"]'), world.querySelector(".card-group--writing")],
  [dock.querySelector('[data-destination="contact"]'), world.querySelector(".contact-card")],
]);
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let returnFrame = 0;
let dockBounce;

function centeredPosition(element) {
  const rect = element.getBoundingClientRect();
  const bounds = world.getBoundingClientRect();
  const x = rect.left - bounds.left + (rect.width - viewport.clientWidth) / 2;
  const y = rect.top - bounds.top + (rect.height - viewport.clientHeight) / 2;
  return {
    x: Math.max(0, Math.min(x, viewport.scrollWidth - viewport.clientWidth)),
    y: Math.max(0, Math.min(y, viewport.scrollHeight - viewport.clientHeight)),
  };
}

function syncDestination() {
  let current;
  let nearest = 2;
  for (const [button, element] of destinations) {
    const target = centeredPosition(element);
    const distance = Math.hypot(viewport.scrollLeft - target.x, viewport.scrollTop - target.y);
    if (distance < nearest) {
      nearest = distance;
      current = button;
    }
  }
  for (const button of destinations.keys()) {
    if (button === current) button.setAttribute("aria-current", "location");
    else button.removeAttribute("aria-current");
  }
}

function stopReturn() {
  cancelAnimationFrame(returnFrame);
  returnFrame = 0;
  syncDestination();
}

function bounce(button, frames) {
  if (motionPreference.matches) return;
  const tile = button.querySelector(".dock-tile");
  if (dockBounce) {
    dockBounce.button.classList.remove("dock-feedback");
    dockBounce.animation.cancel();
  }
  const animation = tile.animate(frames, { duration: 420, easing: "ease-in-out" });
  dockBounce = { button, animation };
  button.classList.add("dock-feedback");
  animation.finished.then(() => {
    if (dockBounce?.animation !== animation) return;
    button.classList.remove("dock-feedback");
    dockBounce = undefined;
  }, () => {});
}

function panTo(element) {
  stopReturn();
  stopBoardPan();
  const fromX = viewport.scrollLeft;
  const fromY = viewport.scrollTop;
  const { x: toX, y: toY } = centeredPosition(element);
  if (motionPreference.matches) {
    viewport.scrollTo(toX, toY);
    syncDestination();
    return;
  }
  const start = performance.now();
  function recenter(now) {
    const progress = Math.min(1, (now - start) / 700);
    const eased = (1 - Math.cos(Math.PI * progress)) / 2;
    viewport.scrollTo(fromX + (toX - fromX) * eased, fromY + (toY - fromY) * eased);
    returnFrame = progress < 1 ? requestAnimationFrame(recenter) : 0;
  }
  returnFrame = requestAnimationFrame(recenter);
}

for (const [button, element] of destinations) {
  button.addEventListener("click", () => {
    bounce(button, [1, .8, 1.18, 1].map((scale) => ({ transform: `scale(${scale})` })));
    panTo(element);
  });
}

viewport.addEventListener("scroll", syncDestination, { passive: true });
viewport.addEventListener("pointerdown", stopReturn);
viewport.addEventListener("wheel", stopReturn, { passive: true });
window.addEventListener("resize", stopReturn);
const initialHome = centeredPosition(destinations.get(home));
viewport.scrollTo(initialHome.x, initialHome.y);
syncDestination();

if (!motionPreference.matches) {
  const title = destinations.get(home);
  const originalName = title.firstChild;
  const waveName = document.createElement("span");
  waveName.className = "name-wave";
  waveName.textContent = originalName.textContent;
  prepareWave(waveName, 42);
  originalName.replaceWith(waveName);
  waveName.lastElementChild.lastElementChild.addEventListener("animationend", () => {
    waveName.replaceWith(originalName);
  }, { once: true });
  const controls = [...document.body.children].filter((element) => element instanceof HTMLElement && !element.inert);
  controls.forEach((element) => { element.inert = true; });
  const svgNS = "http://www.w3.org/2000/svg";
  const dots = document.createElementNS(svgNS, "svg");
  dots.classList.add("intro-dots");
  dots.setAttribute("aria-hidden", "true");
  dots.setAttribute("width", "100%");
  dots.setAttribute("height", "100%");
  dots.innerHTML = '<defs><radialGradient id="intro-dot"><stop offset="66.67%" stop-color="var(--grid-dot)"/><stop offset="100%" stop-color="var(--grid-dot)" stop-opacity="0"/></radialGradient></defs>';
  dots.setAttribute("fill", "url(#intro-dot)");
  const step = 32;
  const bounds = world.getBoundingClientRect();
  // Match the resting background's center minus half a tile.
  const firstDot = (size, scroll) => scroll + ((size - step) / 2 - scroll) % step - step;
  const firstX = firstDot(bounds.width, viewport.scrollLeft);
  const firstY = firstDot(bounds.height, viewport.scrollTop);
  for (let y = firstY; y <= viewport.scrollTop + viewport.clientHeight + step; y += step) {
    for (let x = firstX; x <= viewport.scrollLeft + viewport.clientWidth + step; x += step) {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      dot.setAttribute("r", "1.35");
      dot.style.setProperty("--dot-delay", `${Math.random() * 1450}ms`);
      dots.append(dot);
    }
  }
  world.prepend(dots);
  window.setTimeout(() => {
    document.body.classList.remove("v7-intro");
    dots.remove();
    controls.forEach((element) => { element.inert = false; });
  }, 1770);
}
