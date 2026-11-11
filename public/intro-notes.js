import { stopBoardPan } from "./board-pan.js?smooth=3";

const copy = {
  en: {
    role: "I turn complex decisions into clearer interfaces. In my ETF screener work, that meant helping investors find and compare products more easily.",
    study: "My MSc brings product management and UX together. I’m learning to connect what a product should do with what people need from it.",
    trust: "I want people to see why a recommendation was made, what the trade-offs are, and where they can check the details.",
    ai: "I’m exploring where AI can help people make sense of a decision, and how an interface can make uncertainty visible.",
    close: "Close note",
  },
  fr: {
    role: "Je rends les décisions complexes plus simples à prendre. Pour mon outil de recherche d’ETF, cela voulait dire aider les investisseurs à trouver et à comparer les produits.",
    study: "Mon master réunit le management de produit et le design UX. J’y apprends à relier les objectifs d’un produit aux besoins des personnes qui l’utilisent.",
    trust: "Je veux que chacun puisse comprendre l’origine d’une recommandation, voir les compromis et vérifier les détails.",
    ai: "J’explore comment l’IA peut aider à comprendre une décision et comment une interface peut rendre l’incertitude visible.",
    close: "Fermer la note",
  },
  ro: {
    role: "Transform deciziile complexe în interfețe mai clare. La filtrul de ETF-uri, asta a însemnat să ajut investitorii să găsească și să compare mai ușor produsele.",
    study: "Masterul meu îmbină managementul de produs cu designul UX. Învăț să leg obiectivele unui produs de nevoile celor care îl folosesc.",
    trust: "Vreau ca oamenii să înțeleagă de ce primesc o recomandare, ce compromisuri implică și unde pot verifica detaliile.",
    ai: "Explorez cum poate IA să ajute oamenii să înțeleagă o decizie și cum poate o interfață să facă vizibilă incertitudinea.",
    close: "Închide nota",
  },
};
const colors = { role: "#b784cf", study: "#96b77e", trust: "#6aa9cc", ai: "#e2c36f" };

const scene = document.querySelector(".node-scene");
const viewport = scene.closest(".node-viewport");
const description = scene.querySelector(".introduction-copy");
const dock = document.querySelector(".crossword-dock");
const card = scene.querySelector("#intro-note");
const title = card.querySelector("h2");
const blurb = card.querySelector("p");
const dismiss = card.querySelector("button");
const wire = scene.querySelector(".intro-note-wire");
const path = wire.querySelector("path");
const sourcePort = wire.querySelector("circle");
let trigger;

function prepareTriggers() {
  const phrases = description.querySelectorAll("strong:is(.message-role, .message-study, .message-trust, .message-ai)");
  if (!phrases.length) return;
  closeNote();
  for (const phrase of phrases) {
    const link = document.createElement("a");
    link.className = phrase.className + " intro-note-trigger";
    link.href = "#intro-note";
    link.setAttribute("role", "button");
    link.setAttribute("aria-label", phrase.textContent);
    link.setAttribute("aria-controls", card.id);
    link.setAttribute("aria-expanded", "false");
    link.dataset.note = [...phrase.classList].find(name => name.startsWith("message-")).slice(8);
    link.append(...phrase.childNodes);
    phrase.replaceWith(link);
  }
}

function positionNote() {
  if (!trigger) return;

  const bounds = scene.getBoundingClientRect();
  const paragraph = description.getBoundingClientRect();
  const rect = [...trigger.getClientRects()].at(-1);
  const x = rect.left + rect.width / 2 - bounds.left;
  const y = rect.bottom - bounds.top + 2;
  const leftSide = x < paragraph.left + paragraph.width / 2 - bounds.left;
  const edge = leftSide ? paragraph.left - bounds.left - 9 : paragraph.right - bounds.left + 9;
  const top = paragraph.bottom - bounds.top + 30;
  const inset = 16;
  const left = Math.max(inset, Math.min(x - card.offsetWidth / 2, bounds.width - card.offsetWidth - inset));
  const port = left + (leftSide ? 23 : card.offsetWidth - 23);

  card.style.left = left + "px";
  card.style.top = top + "px";
  card.style.setProperty("--note-port", (port - left) + "px");
  sourcePort.setAttribute("cx", x);
  sourcePort.setAttribute("cy", y);
  path.setAttribute("d", `M ${x} ${y} L ${edge} ${y} V ${top - 12} H ${port} V ${top}`);
}

function closeNote(restoreFocus = false) {
  if (!trigger) return;
  trigger.setAttribute("aria-expanded", "false");
  card.hidden = true;
  wire.classList.remove("is-open");
  if (restoreFocus) trigger.focus({ preventScroll: true });
  trigger = undefined;
}

function openNote(link) {
  stopBoardPan();
  const previous = trigger;
  closeNote();
  if (link === previous) return;

  trigger = link;
  const language = copy[document.documentElement.lang] ?? copy.en;
  const color = colors[link.dataset.note];
  title.textContent = link.textContent;
  blurb.textContent = language[link.dataset.note];
  dismiss.setAttribute("aria-label", language.close);
  card.style.setProperty("--note-ink", color);
  wire.style.setProperty("--note-ink", color);
  card.hidden = false;
  positionNote();
  link.setAttribute("aria-expanded", "true");
  // Restart the wire drawing when switching phrases as well as when first opening.
  wire.getBoundingClientRect();
  wire.classList.add("is-open");

  const bounds = card.getBoundingClientRect();
  const dockBounds = dock.getBoundingClientRect();
  const overlapsDock = bounds.left < dockBounds.right && bounds.right > dockBounds.left && bounds.top < dockBounds.bottom;
  const bottom = Math.min(viewport.getBoundingClientRect().bottom, overlapsDock ? dockBounds.top : Infinity) - 12;
  if (bounds.bottom > bottom) viewport.scrollTop += Math.ceil(bounds.bottom - bottom);
}

description.addEventListener("click", (event) => {
  const link = event.target.closest(".intro-note-trigger");
  if (!link) return;
  event.preventDefault();
  openNote(link);
});
description.addEventListener("keydown", (event) => {
  if (event.key === " " && event.target.matches(".intro-note-trigger")) {
    event.preventDefault();
    openNote(event.target);
  }
});
card.addEventListener("pointerdown", (event) => event.stopPropagation());
dismiss.addEventListener("click", () => closeNote(true));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && trigger && !document.querySelector("dialog[open]")) closeNote(true);
});
new MutationObserver(prepareTriggers).observe(description, { childList: true });
const layout = new ResizeObserver(positionNote);
layout.observe(scene);
layout.observe(description);
layout.observe(card);
prepareTriggers();
