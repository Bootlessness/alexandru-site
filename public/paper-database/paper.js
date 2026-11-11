import "./pen.js";
import { folders, records } from "./records.js";
import { draw } from "./sketches.js";

const folderList = document.querySelector("#folders");
const breadcrumb = document.querySelector("#crumb");
const heading = document.querySelector("#page-title");
const eyebrow = document.querySelector("#eyebrow");
const description = document.querySelector("#page-description");
const introSketch = document.querySelector(".intro-sketch");
const databaseTitle = document.querySelector("#collection-title");
const count = document.querySelector("#record-count");
const recordList = document.querySelector("#records");
const search = document.querySelector("#search");
const sort = document.querySelector("#sort");
const viewButtons = document.querySelectorAll("[data-view]");
const menu = document.querySelector(".mobile-menu");
const settings = document.querySelector(".paper-settings");
const detail = document.querySelector("#record");
const backToRecords = document.querySelector(".close-record");
const detailContent = document.querySelector("#detail-content");
const detailFolder = document.querySelector("#detail-folder");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia("(max-width: 660px)");
const number = (value) => String(value).padStart(2, "0");
const recordNumbers = new Map(records.map(({ id }, index) => [id, number(index + 1)]));

function currentFolder() {
  const id = location.hash.slice(1);
  return Object.hasOwn(folders, id) ? id : "index";
}

let activeFolder = currentFolder();
let activeView = "gallery";
let folderTimer = 0;
let recordOpener;

function folderSize(id) {
  return id === "index" ? records.length : records.filter(record => record.folder === id).length;
}

folderList.innerHTML = Object.entries(folders).map(([id, folder]) => `
  <a class="rail-link circled" href="#${id}" data-folder="${id}">
    <canvas class="icon" data-icon="folder" aria-hidden="true"></canvas>
    <span class="marked">${folder.label}</span>
    <span class="rail-count" aria-hidden="true">${number(folderSize(id))}</span>
  </a>
`).join("");

document.querySelectorAll("canvas[data-icon]").forEach(draw);

function cover(record, extraClass = "") {
  return `<span class="card-cover tone-${record.tone} ${extraClass}"><canvas data-sketch="${record.id}" aria-hidden="true"></canvas></span>`;
}

function gallery(items) {
  return `<div class="cards">${items.map(record => `
    <button type="button" class="card tone-${record.tone}" data-record="${record.id}" aria-labelledby="title-${record.id}">
      ${cover(record)}
      <span class="card-copy circled">
        <span class="card-meta">
          <canvas class="icon" data-icon="folder" aria-hidden="true"></canvas>
          ${folders[record.folder].label}
          <span class="index-number">#${recordNumbers.get(record.id)}</span>
        </span>
        <span class="card-name"><span id="title-${record.id}">${record.title}</span><span class="arrow" aria-hidden="true">↗</span></span>
        <span class="card-description">${record.description}</span>
      </span>
    </button>
  `).join("")}</div>`;
}

function table(items) {
  return `<table class="table" aria-labelledby="collection-title">
    <thead><tr><th scope="col">File</th><th scope="col">Title</th><th scope="col">Folder</th><th scope="col">Topic</th></tr></thead>
    <tbody>${items.map(record => `
      <tr>
        <td>#${recordNumbers.get(record.id)}</td>
        <td><button type="button" class="table-title" data-record="${record.id}"><span class="marked">${record.title}</span></button></td>
        <td>${folders[record.folder].label}</td>
        <td>${record.topic}</td>
      </tr>
    `).join("")}</tbody>
  </table>`;
}

function renderRecords() {
  closeRecord();
  const query = search.value.trim().toLocaleLowerCase();
  const words = query.split(/\s+/);
  const items = records.filter(record => {
    if (query) {
      const fields = [record.title, record.description, record.topic, folders[record.folder].label, `#${recordNumbers.get(record.id)}`];
      return words.every(word => fields.some(field => field.toLocaleLowerCase().includes(word)));
    }
    return activeFolder === "index" || record.folder === activeFolder;
  });

  if (sort.value === "title") items.sort((a, b) => a.title.localeCompare(b.title));
  if (sort.value === "folder") items.sort((a, b) => folders[a.folder].label.localeCompare(folders[b.folder].label));

  databaseTitle.textContent = query ? "Search results" : activeFolder === "index" ? "All records" : "Records";
  count.textContent = `${items.length} ${items.length === 1 ? "record" : "records"}`;

  const renderView = activeView === "gallery" ? gallery : table;
  recordList.innerHTML = items.length ? renderView(items) : '<p class="empty">No matching records. Try a title, folder, or topic.</p>';
  recordList.querySelectorAll("canvas").forEach(draw);
}

function renderFolder() {
  const folder = folders[activeFolder];
  heading.textContent = folder.title ?? folder.label;
  eyebrow.textContent = folder.caption ?? "Paper Database / Folder";
  description.textContent = folder.description;
  breadcrumb.textContent = folder.label;
  introSketch.dataset.sketch = folder.sketch;
  draw(introSketch);
  for (const link of folderList.querySelectorAll("[data-folder]")) {
    if (link.dataset.folder === activeFolder) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  renderRecords();
}

function setMenu(open) {
  document.body.classList.toggle("folders-open", open);
  menu.setAttribute("aria-expanded", String(open));
}

function changeFolder() {
  const next = currentFolder();
  if (next === activeFolder && !folderTimer) return;
  clearTimeout(folderTimer);

  if (reduceMotion.matches) {
    folderTimer = 0;
    finish();
  } else {
    recordList.classList.remove("records-in");
    recordList.classList.add("records-out");
    folderTimer = window.setTimeout(finish, 150);
  }

  function finish() {
    folderTimer = 0;
    activeFolder = next;
    search.value = "";
    renderFolder();
    recordList.classList.replace("records-out", "records-in");
    window.scrollTo(0, 0);
    heading.focus({ preventScroll: true });
  }
}

window.addEventListener("hashchange", changeFolder);
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
mobile.addEventListener("change", () => setMenu(false));

document.addEventListener("click", (event) => {
  if (settings.open && !settings.contains(event.target)) settings.open = false;
  const folderLink = event.target.closest("[data-folder]");
  const openMenu = menu.getAttribute("aria-expanded") === "true";

  if (openMenu && (folderLink || !event.target.closest(".rail, .mobile-menu"))) {
    setMenu(false);
    if (folderLink?.dataset.folder === activeFolder) menu.focus();
  }

  if (folderLink?.dataset.folder === activeFolder && search.value) {
    search.value = "";
    renderRecords();
    window.scrollTo(0, 0);
  }
});

document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  heading.focus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && settings.open) {
    settings.open = false;
    settings.querySelector("summary").focus();
    return;
  }

  if (event.key === "Escape" && !detail.hidden) {
    closeRecord(true);
    return;
  }

  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }

  if (event.key === "/" && !event.target.closest("input, textarea, select, [contenteditable]") &&
      !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault();
    setMenu(false);
    search.focus();
  }
});

search.addEventListener("input", () => {
  renderRecords();
  window.scrollTo(0, 0);
});
sort.addEventListener("change", renderRecords);
viewButtons.forEach(button => button.addEventListener("click", () => {
  activeView = button.dataset.view;
  viewButtons.forEach(view => view.setAttribute("aria-pressed", String(view === button)));
  renderRecords();
}));

recordList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-record]");
  if (!button) return;
  const record = records.find(item => item.id === button.dataset.record);
  detailFolder.textContent = `${folders[record.folder].label} / #${recordNumbers.get(record.id)} / ${record.topic}`;
  detailContent.innerHTML = `
    ${cover(record, "detail-cover")}
    <div class="detail-copy">
      <h2 id="record-title">${record.title}</h2>
      <p>${record.description}</p>
      ${record.metrics ? `<details class="metrics"><summary>KPIs · sample figures</summary><dl>${record.metrics.map(([value, label]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl></details>` : ""}
      ${record.href ? `<a class="detail-link" href="${record.href}"><span class="marked">${record.link}</span> ↗</a>` : ""}
    </div>
  `;
  recordOpener = button;
  recordList.hidden = true;
  detail.hidden = false;
  draw(detailContent.querySelector("canvas"));
  backToRecords.focus({ preventScroll: true });
  detail.scrollIntoView({ block: "start" });
});

function closeRecord(restoreFocus = false) {
  if (detail.hidden) return;
  detail.hidden = true;
  recordList.hidden = false;
  if (restoreFocus) recordOpener.focus();
  recordOpener = null;
}

backToRecords.addEventListener("click", () => closeRecord(true));

renderFolder();
document.fonts.load("27px Kristi").then(() => draw(introSketch));
