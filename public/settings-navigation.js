const placeholder = document.querySelector("[data-settings-navigation]");
const page = location.pathname.replace(/\/index\.html$/, "/");
const current = page === "/v7/" ? "/" : page;
const versions = [
  ["/", "MAIN"], ["/versions/v1.html", "V1"], ["/v2/", "V2"], ["/v3/", "V3"],
  ["/v4/", "V4"], ["/v5/", "V5"], ["/v6/", "V6"], ["/v8/", "V8"],
];
const archives = [["/a1/", "A1"], ["/a2/", "A2"]];
const links = (items) => items.map(([href, label]) =>
  `<a href="${href}"${href === current ? ' aria-current="page"' : ""}>${label}</a>`
).join(" ");
placeholder.outerHTML = `
  <nav class="version-menu" aria-label="Site versions"><span>Versions</span> ${links(versions)}</nav>
  <nav class="version-menu archive-menu" aria-label="Archives"><span>Archives</span> ${links(archives)}</nav>
`;
