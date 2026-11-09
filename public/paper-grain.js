const tileSize = 96;
let seed = 42;
function nextCoordinate() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed >>> 16) % tileSize;
}

const flecks = Array.from({ length: 72 }, () => [nextCoordinate(), nextCoordinate()]);

function fleckPath(left, top, width, height) {
  return flecks
    .filter(([x, y]) => left + x < width && top + y < height)
    .map(([x, y]) => `M${left + x} ${top + y}h1v1h-1z`)
    .join("");
}

export function paperGrain(width, height) {
  const tiles = [];
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      tiles.push(`<path d="${fleckPath(x, y, width, height)}"/>`);
    }
  }
  return `<g id="Paper-grain" fill="#fff" fill-opacity="0.05">${tiles.join("")}</g>`;
}

export function paperTile() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">${paperGrain(tileSize, tileSize)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
