const escape = (text) => text.replace(/[&<>"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
})[char]);

const measure = document.createElement("canvas").getContext("2d");

function textLayers(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const layers = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent.closest(".title-color")) continue;
    const style = getComputedStyle(parent);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = measure.measureText("Hg");
    const lines = [];
    for (const word of node.data.matchAll(/\S+/g)) {
      range.setStart(node, word.index);
      range.setEnd(node, word.index + word[0].length);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const line = lines.at(-1);
      if (line && Math.abs(line.rect.top - rect.top) < 1) line.text += " " + word[0];
      else lines.push({ text: word[0], rect });
    }
    for (const { text, rect } of lines) {
      const y = rect.top + (rect.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
      layers.push(`<text x="${rect.left}" y="${y}" fill="${style.color}" font-family="${escape(style.fontFamily)}" font-size="${style.fontSize}" font-weight="${style.fontWeight}" letter-spacing="${style.letterSpacing === "normal" ? 0 : style.letterSpacing}"${element.matches(".portfolio-link") ? ' text-decoration="underline"' : ""}>${escape(text)}</text>`);
    }
  }
  return layers.join("");
}

function rectangle(element, fill = getComputedStyle(element).backgroundColor) {
  const { x, y, width, height } = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const radius = parseFloat(style.borderRadius) || 0;
  const stroke = parseFloat(style.borderTopWidth)
    ? ` stroke="${style.borderTopColor}" stroke-width="${style.borderTopWidth}"`
    : "";
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"${stroke}/>`;
}

function interfaceLayers() {
  const languages = document.querySelector(".v7-language");
  const buttons = [...languages.querySelectorAll("button")].map((button) =>
    `<g id="Language-${button.dataset.language}">${rectangle(button)}${textLayers(button)}</g>`);
  const coordinates = document.querySelector(".v7-coordinates");
  const settings = document.querySelector(".crossword-settings");
  const minimap = document.querySelector(".v7-minimap");
  const { x, y, width, height } = minimap.getBoundingClientRect();
  const map = minimap.cloneNode(true);
  for (const rect of map.querySelectorAll("rect")) {
    const original = minimap.querySelector(rect.matches(".v7-map-view") ? ".v7-map-view" : ".v7-map-content rect");
    const style = getComputedStyle(original);
    rect.setAttribute("fill", style.fill);
    rect.setAttribute("stroke", style.stroke);
    rect.setAttribute("vector-effect", "non-scaling-stroke");
  }
  map.removeAttribute("class");
  map.removeAttribute("style");
  for (const [key, value] of Object.entries({ x, y, width, height })) map.setAttribute(key, value);

  return [
    `<g id="Board-Coordinates">${textLayers(coordinates)}</g>`,
    `<g id="Language-Toggle">${buttons.join("")}</g>`,
    `<g id="Minimap">${rectangle(minimap)}${map.outerHTML}</g>`,
    `<g id="Settings">${rectangle(settings)}${textLayers(settings)}</g>`,
  ].join("");
}

function capture() {
  const viewport = document.querySelector(".node-viewport");
  const world = document.querySelector(".node-world");
  const { width, height } = viewport.getBoundingClientRect();
  const worldRect = world.getBoundingClientRect();
  const worldStyle = getComputedStyle(world);
  const step = parseFloat(worldStyle.backgroundSize);
  const grid = [];
  const start = (origin, size) => ((origin + (size - step) / 2) % step + step) % step;
  for (let y = start(worldRect.top, worldRect.height); y < height; y += step) {
    for (let x = start(worldRect.left, worldRect.width); x < width; x += step) {
      grid.push(`M${x} ${y}h.01`);
    }
  }

  const dock = document.querySelector(".crossword-dock");
  const items = [...dock.querySelectorAll("button, a")].map((button) => {
    const icon = button.querySelector("svg");
    let content = textLayers(button);
    if (icon) {
      const { x, y, width, height } = icon.getBoundingClientRect();
      content = `<g transform="translate(${x} ${y}) scale(${width / 24} ${height / 24})" fill="none" stroke="${getComputedStyle(icon).color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon.innerHTML}</g>`;
    }
    if (button.matches("a")) content = `<a href="${escape(button.href)}">${content}</a>`;
    return `<g id="${button.getAttribute("aria-label").split(" ")[0]}">${rectangle(button.querySelector(".dock-tile") ?? button)}${content}</g>`;
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect id="Background" width="${width}" height="${height}" fill="${getComputedStyle(document.body).backgroundColor}"/>`,
    `<path id="Grid" d="${grid.join(" ")}" fill="none" stroke="${worldStyle.getPropertyValue("--grid-dot").trim()}" stroke-width="2" stroke-linecap="round"/>`,
    `<g id="Title">${textLayers(document.getElementById("name"))}</g>`,
    `<g id="Description">${textLayers(document.querySelector(".introduction-copy"))}</g>`,
    `<g id="Bottom-Menu">${rectangle(dock)}${items.join("")}</g>`,
    interfaceLayers(),
    "</svg>",
  ].join("");
}

document.getElementById("copy-board-svg").addEventListener("click", async () => {
  const status = document.getElementById("board-export-status");
  const svg = capture();
  try {
    await navigator.clipboard.writeText(svg);
    status.value = status.dataset.copied ?? "SVG copied";
  } catch {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const download = document.createElement("a");
    download.href = url;
    download.download = "alexandru-v7.svg";
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.value = status.dataset.downloaded ?? "SVG downloaded";
  }
});
