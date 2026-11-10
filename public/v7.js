import "./board-pan.js";

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
const translations = {
  en: ["Language", "Settings", "Versions", "Copy SVG", "Home", "About", "Works", "Writing",
    "Move dock with arrow keys", "Drag to move the dock", "SVG copied", "SVG downloaded"],
  fr: ["Langue", "Réglages", "Versions", "Copier le SVG", "Accueil", "À propos", "Projets", "Écrits",
    "Déplacer le menu avec les flèches", "Faire glisser pour déplacer le menu", "SVG copié", "SVG téléchargé"],
  ro: ["Limbă", "Setări", "Versiuni", "Copiază SVG", "Acasă", "Despre mine", "Proiecte", "Articole",
    "Mută meniul cu tastele săgeată", "Trage pentru a muta meniul", "SVG copiat", "SVG descărcat"],
};
const descriptions = {
  fr: '<span class="message-role">Designer produit</span>, je termine actuellement un <span class="message-study">MSc en management de produit et design UX</span> et je conçois des produits <span class="message-fintech">fintech</span> qui inspirent <span class="message-trust">confiance</span> par leur clarté et leur sobriété.',
  ro: '<span class="message-role">Designer de produs</span>, urmez în prezent un <span class="message-study">master în management de produs și design UX</span> și proiectez produse <span class="message-fintech">fintech</span> care câștigă <span class="message-trust">încrederea</span> prin claritate și simplitate.',
};

function setLanguage(language) {
  const [languageLabel, settings, versions, copy, home, about, works, writing,
    gripLabel, gripTitle, copied, downloaded] = translations[language];
  document.documentElement.lang = language;
  description.innerHTML = descriptions[language] ?? englishDescription;
  document.querySelector(".v7-language").setAttribute("aria-label", languageLabel);
  document.querySelector(".crossword-settings summary").textContent = settings;
  const versionMenu = document.querySelector(".version-menu");
  versionMenu.setAttribute("aria-label", versions);
  versionMenu.querySelector("span").textContent = versions;
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
  const markers = [...world.querySelectorAll("h1, .introduction-copy, .node-card")].map((element) => {
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

const home = document.getElementById("dock-home");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let returnFrame = 0;

function homePosition() {
  const title = document.getElementById("name").getBoundingClientRect();
  const bounds = world.getBoundingClientRect();
  return {
    x: title.left - bounds.left + (title.width - viewport.clientWidth) / 2,
    y: title.top - bounds.top + (title.height - viewport.clientHeight) / 2,
  };
}

function syncHome() {
  const target = homePosition();
  const centered = Math.abs(viewport.scrollLeft - target.x) < 2
    && Math.abs(viewport.scrollTop - target.y) < 2;
  if (centered) home.setAttribute("aria-current", "page");
  else home.removeAttribute("aria-current");
}

function stopReturn() {
  cancelAnimationFrame(returnFrame);
  returnFrame = 0;
  syncHome();
}

function bounce(button, frames) {
  if (motionPreference.matches) return;
  const tile = button.querySelector(".dock-tile");
  tile.getAnimations().filter((animation) => animation.id === "dock-click").forEach((animation) => animation.cancel());
  const animation = tile.animate(frames, { duration: 330, easing: "ease-out" });
  animation.id = "dock-click";
  button.classList.add("dock-feedback");
  animation.finished.then(() => button.classList.remove("dock-feedback"), () => {});
}

home.addEventListener("click", () => {
  stopReturn();
  bounce(home, [{ transform: "scale(1)" }, { transform: "scale(.8)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }]);
  const fromX = viewport.scrollLeft;
  const fromY = viewport.scrollTop;
  const { x: toX, y: toY } = homePosition();
  if (motionPreference.matches) {
    viewport.scrollTo(toX, toY);
    syncHome();
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
});

for (const button of dock.querySelectorAll("[data-destination]")) {
  button.addEventListener("click", () => bounce(button, [0, -6, 5, -3, 2, 0].map((x) => ({
    transform: `translateX(${x}px)`,
  }))));
}

viewport.addEventListener("scroll", syncHome, { passive: true });
viewport.addEventListener("pointerdown", stopReturn);
viewport.addEventListener("wheel", stopReturn, { passive: true });
window.addEventListener("resize", stopReturn);
const initialHome = homePosition();
viewport.scrollTo(initialHome.x, initialHome.y);
syncHome();
