const SERIF = "Iowan Old Style, Palatino, Georgia, serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const MARGIN = 12;
const DESK = "#cfc3b3";
const BONE = "#f4efe6";
const CUT = "#1c1916";
const BLEED = "#c23b2e";

const SAMPLES = {
  sticker: "Midnight fox sticker for a small press, gold on black",
  pin: "Paper crane pin, cream and ink",
  card: "Cherry cake birthday card, warm red on cream",
  tag: "Pine branch tag, copper on cream",
  box: "Steeping tea box, soft green and cream",
};

const PALETTES = [
  { name: "Midnight", test: /midnight|black|fox/, ground: "#141210", ink: "#f3ead7", accent: "#e2b657" },
  { name: "Bakery", test: /cake|birthday|cherry|warm/, ground: "#f7f1e7", ink: "#6e2430", accent: "#e07a5f" },
  { name: "Tea", test: /tea|steep|green/, ground: "#e5f0e2", ink: "#1d3a2f", accent: "#c47a3a" },
  { name: "Pine", test: /pine|forest|winter/, ground: "#1c3530", ink: "#f3efe4", accent: "#d08a4c" },
  { name: "Ocean", test: /sea|ocean|wave|blue/, ground: "#123044", ink: "#f4f7f8", accent: "#7eb8c9" },
];

const INK = { name: "Ink", ground: "#f6f1e6", ink: "#1c1916", accent: "#9c3b2e" };

const STOP = new Set(["a", "an", "the", "small", "little", "tiny", "for", "of", "with", "and", "on", "in", "to", "my", "your"]);
const FORMAT_WORDS = {
  sticker: ["sticker", "stickers"],
  pin: ["pin", "pins"],
  card: ["card", "cards"],
  tag: ["tag", "tags"],
  box: ["box", "boxes"],
};

const MOTIFS = [
  { id: "fox", test: /fox|wolf/, draw: drawFox },
  { id: "crane", test: /crane|bird/, draw: drawCrane },
  { id: "cake", test: /cake|cherry|birthday/, draw: drawCake },
  { id: "leaf", test: /pine|leaf|branch|forest/, draw: drawLeaf },
  { id: "cup", test: /tea|cup|steep/, draw: drawCup },
  { id: "wave", test: /wave|sea|ocean/, draw: drawWave },
  { id: "moon", test: /moon|night|star/, draw: drawMoon },
  { id: "heart", test: /love|heart|friend/, draw: drawHeart },
  { id: "sun", test: /sun|summer|gold/, draw: drawSun },
];

const state = {
  format: "sticker",
  brief: SAMPLES.sticker,
  briefIsSample: true,
  title: "",
  ground: INK.ground,
  ink: INK.ink,
  accent: INK.accent,
  motif: "diamond",
  paletteName: INK.name,
  scale: 1,
  selection: "motif",
};

const briefEl = document.querySelector("#brief");
const titleEl = document.querySelector("#title");
const groundEl = document.querySelector("#ground");
const inkEl = document.querySelector("#ink");
const accentEl = document.querySelector("#accent");
const scaleEl = document.querySelector("#scale");
const sheetWrap = document.querySelector("#sheet-wrap");
const readingEl = document.querySelector("#reading");
const specEl = document.querySelector("#spec");
const legendEl = document.querySelector("#legend");

document.querySelector("#ticket").addEventListener("submit", (event) => {
  event.preventDefault();
  state.brief = briefEl.value.trim() || "Untitled";
  state.briefIsSample = briefEl.value.trim() === SAMPLES[state.format];
  applyReading();
  render();
});

briefEl.addEventListener("input", () => {
  state.briefIsSample = briefEl.value.trim() === SAMPLES[state.format];
});

titleEl.addEventListener("input", () => {
  state.title = titleEl.value;
  draw();
});

groundEl.addEventListener("input", () => {
  state.ground = groundEl.value;
  draw();
});

inkEl.addEventListener("input", () => {
  state.ink = inkEl.value;
  draw();
});

accentEl.addEventListener("input", () => {
  state.accent = accentEl.value;
  draw();
});

scaleEl.addEventListener("input", () => {
  state.scale = Number(scaleEl.value);
  draw();
});

document.querySelector("#reset").addEventListener("click", () => {
  state.brief = briefEl.value.trim() || "Untitled";
  applyReading();
  render();
});

document.querySelector("#export").addEventListener("click", download);

document.querySelector(".formats").addEventListener("click", (event) => {
  const button = event.target.closest("[data-format]");
  if (!button) return;
  chooseFormat(button.dataset.format);
});

sheetWrap.addEventListener("click", (event) => {
  const part = event.target.closest("[data-part]");
  if (!part) return;
  state.selection = part.dataset.part;
  draw();
});

applyReading();
briefEl.value = state.brief;
render();
window.addEventListener("resize", draw);

function chooseFormat(format) {
  state.format = format;
  if (state.briefIsSample) {
    state.brief = SAMPLES[format];
    briefEl.value = state.brief;
  } else {
    state.brief = briefEl.value.trim() || "Untitled";
  }
  applyReading();
  render();
}

function applyReading() {
  const text = state.brief.toLowerCase();
  const palette = PALETTES.find((item) => item.test.test(text)) || INK;
  const motif = MOTIFS.find((item) => item.test.test(text));
  state.paletteName = palette.name;
  state.ground = palette.ground;
  state.ink = palette.ink;
  state.accent = palette.accent;
  state.motif = motif ? motif.id : "diamond";
  state.title = titleFrom(state.brief);
  state.scale = 1;
}

function render() {
  draw();
  syncControls();
  syncMeta();
}

function syncControls() {
  setIdle(titleEl, state.title);
  setIdle(groundEl, state.ground);
  setIdle(inkEl, state.ink);
  setIdle(accentEl, state.accent);
  setIdle(scaleEl, String(state.scale));
  document.querySelectorAll("[data-format]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.format === state.format));
  });
}

function syncMeta() {
  const motifName = state.motif.charAt(0).toUpperCase() + state.motif.slice(1);
  readingEl.textContent = `Read as ${state.paletteName} · ${motifName} · ${formatName(state.format)}`;
  legendEl.textContent = state.format === "box"
    ? "Solid line is a cut. Dashed line is a fold. Artwork sits on the front panel."
    : "Solid line is the cut. The red hairline outside it is the bleed.";
}

function draw() {
  const layout = buildLayout();
  const totalW = layout.sheetW + MARGIN * 2;
  const totalH = layout.sheetH + MARGIN * 2;
  const available = Math.max(260, document.querySelector(".stage").clientWidth || 640);
  const px = Math.min(available / totalW, 680 / totalH);
  sheetWrap.innerHTML = `<svg id="design" xmlns="http://www.w3.org/2000/svg" viewBox="${-MARGIN} ${-MARGIN} ${totalW} ${totalH}" width="${totalW}mm" height="${totalH}mm" role="img" aria-label="${escapeXml(state.title)}, ${formatName(state.format)}">${layout.body}</svg>`;
  const svg = sheetWrap.querySelector("svg");
  svg.style.width = `${Math.floor(totalW * px)}px`;
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  specEl.textContent = layout.spec;
  highlight();
}

function buildLayout() {
  if (state.format === "box") return layoutBox();
  if (state.format === "card") {
    return layoutRect({ w: 127, h: 178, bleed: 3, radius: 0, hole: false, titleSize: 9.5, motif: 0.34, maxChars: 14 });
  }
  if (state.format === "tag") {
    return layoutRect({ w: 51, h: 89, bleed: 2.5, radius: 3, hole: true, titleSize: 5.2, motif: 0.42, maxChars: 11 });
  }
  if (state.format === "pin") {
    return layoutCircle({ trim: 32, bleed: 1.5, titleSize: 2.35, motif: 0.46, maxChars: 12, motifDrop: 0.16, titleDrop: 0.33 });
  }
  return layoutCircle({ trim: 70, bleed: 3, titleSize: 6, motif: 0.42, maxChars: 12, motifDrop: 0.12, titleDrop: 0.26 });
}

function layoutCircle({ trim, bleed, titleSize, motif, maxChars, motifDrop, titleDrop }) {
  const sheet = trim + bleed * 2;
  const c = sheet / 2;
  const trimR = trim / 2;
  const motifSize = trim * motif * state.scale;
  const line = cutInk(state.ground);
  const body = [
    desk(sheet, sheet),
    `<rect x="0" y="0" width="${sheet}" height="${sheet}" fill="${BONE}"/>`,
    `<circle data-part="paper" cx="${c}" cy="${c}" r="${trimR + bleed - 0.15}" fill="${safeColor(state.ground)}"/>`,
    `<g data-part="motif">${drawMotif(c, c - trim * motifDrop, motifSize)}</g>`,
    titleGroup(c, c + trim * titleDrop, titleSize, maxChars),
    `<g pointer-events="none">`,
    `<circle cx="${c}" cy="${c}" r="${trimR}" fill="none" stroke="${line}" stroke-width="0.45"/>`,
    `<circle cx="${c}" cy="${c}" r="${trimR + bleed - 0.25}" fill="none" stroke="${BLEED}" stroke-width="0.4" stroke-dasharray="0.8 0.55"/>`,
    cropMarks(bleed, bleed, trim, trim),
    sizeText(sheet / 2, sheet + 6.5, `${trim} × ${trim} mm`, sheet),
    `</g>`,
  ].join("");
  return { sheetW: sheet, sheetH: sheet, body, spec: `Trim ${trim} × ${trim} mm · Bleed ${bleed} mm` };
}

function layoutRect({ w, h, bleed, radius, hole, titleSize, motif, maxChars }) {
  const sheetW = w + bleed * 2;
  const sheetH = h + bleed * 2;
  const motifSize = Math.min(w, h) * motif * state.scale;
  const cx = sheetW / 2;
  const motifY = hole ? bleed + h * 0.42 : bleed + h * 0.34;
  const titleY = hole ? bleed + h * 0.7 : bleed + h * 0.62;
  const holeY = bleed + 9;
  const line = cutInk(state.ground);
  const body = [
    desk(sheetW, sheetH),
    `<rect data-part="paper" x="0.2" y="0.2" width="${sheetW - 0.4}" height="${sheetH - 0.4}" rx="${radius}" fill="${safeColor(state.ground)}"/>`,
    hole ? `<circle cx="${cx}" cy="${holeY}" r="3.2" fill="${DESK}" stroke="${line}" stroke-width="0.4"/>` : "",
    `<g data-part="motif">${drawMotif(cx, motifY, motifSize)}</g>`,
    `<line x1="${cx - w * 0.16}" y1="${(motifY + titleY) / 2}" x2="${cx + w * 0.16}" y2="${(motifY + titleY) / 2}" stroke="${safeColor(state.accent)}" stroke-width="0.45" pointer-events="none"/>`,
    titleGroup(cx, titleY, titleSize, maxChars),
    `<g pointer-events="none">`,
    `<rect x="${bleed}" y="${bleed}" width="${w}" height="${h}" rx="${Math.max(0, radius - 0.6)}" fill="none" stroke="${line}" stroke-width="0.45"/>`,
    `<rect x="0.3" y="0.3" width="${sheetW - 0.6}" height="${sheetH - 0.6}" rx="${radius}" fill="none" stroke="${BLEED}" stroke-width="0.4" stroke-dasharray="0.9 0.6"/>`,
    cropMarks(bleed, bleed, w, h),
    sizeText(sheetW / 2, sheetH + 6.5, `${w} × ${h} mm`, Math.max(sheetW, sheetH)),
    `</g>`,
  ].join("");
  return { sheetW, sheetH, body, spec: `Trim ${w} × ${h} mm · Bleed ${bleed} mm` };
}

function layoutBox() {
  const W = 78;
  const D = 36;
  const H = 56;
  const glue = 12;
  const tuck = 14;
  const x0 = 0;
  const x1 = glue;
  const x2 = glue + D;
  const x3 = x2 + W;
  const x4 = x3 + D;
  const y0 = 0;
  const y1 = tuck;
  const y2 = tuck + D;
  const y3 = y2 + H;
  const y4 = y3 + D;
  const y5 = y4 + tuck;
  const outline = `M ${x2} ${y0} H ${x3} V ${y2} H ${x4} V ${y3} H ${x3} V ${y5} H ${x2} V ${y3} H ${x0} V ${y2} H ${x2} V ${y0} Z`;
  const folds = [
    [x2, y1, x3, y1],
    [x2, y2, x3, y2],
    [x2, y3, x3, y3],
    [x2, y4, x3, y4],
    [x1, y2, x1, y3],
    [x2, y2, x2, y3],
    [x3, y2, x3, y3],
  ];
  const motifSize = Math.min(W, H) * 0.62 * state.scale;
  const body = [
    desk(x4, y5),
    `<path d="${outline}" fill="${BONE}"/>`,
    `<rect data-part="paper" x="${x2}" y="${y2}" width="${W}" height="${H}" fill="${safeColor(state.ground)}"/>`,
    `<g clip-path="url(#front-clip)">`,
    `<g data-part="motif">${drawMotif(x2 + W / 2, y2 + H * 0.36, motifSize)}</g>`,
    titleGroup(x2 + W / 2, y2 + H * 0.74, 5.2, 12),
    `</g>`,
    panelLabel(x0 + glue / 2, y2 + H / 2, "glue", true),
    panelLabel(x1 + D / 2, y2 + H / 2, "side"),
    panelLabel(x3 + D / 2, y2 + H / 2, "side"),
    panelLabel(x2 + W / 2, y1 + D / 2, "lid"),
    panelLabel(x2 + W / 2, y0 + tuck / 2, "tuck"),
    panelLabel(x2 + W / 2, y3 + D / 2, "base"),
    panelLabel(x2 + W / 2, y4 + tuck / 2, "tuck"),
    `<g pointer-events="none">`,
    folds.map(([x1p, y1p, x2p, y2p]) => `<line x1="${x1p}" y1="${y1p}" x2="${x2p}" y2="${y2p}" stroke="${CUT}" stroke-width="0.35" stroke-dasharray="1.3 0.9"/>`).join(""),
    `<path d="${outline}" fill="none" stroke="${CUT}" stroke-width="0.55" stroke-linejoin="miter"/>`,
    sizeText(x4 / 2, y5 + 6.5, `${W} × ${D} × ${H} mm`, Math.max(x4, y5)),
    `</g>`,
    `<clipPath id="front-clip"><rect x="${x2 + 3}" y="${y2 + 2}" width="${W - 6}" height="${H - 4}"/></clipPath>`,
  ].join("");
  return { sheetW: x4, sheetH: y5, body, spec: `Box ${W} × ${D} × ${H} mm · Tuck carton net` };
}

function drawMotif(cx, cy, size) {
  const motif = MOTIFS.find((item) => item.id === state.motif);
  const draw = motif ? motif.draw : drawDiamond;
  return draw(cx, cy, size, safeColor(state.ink), safeColor(state.accent), safeColor(state.ground));
}

function titleGroup(x, y, size, maxChars) {
  const lines = wrap(state.title || "Untitled", maxChars);
  const lineHeight = size * 1.12;
  const width = Math.max(...lines.map((line) => line.length), 1) * size * 0.56;
  const top = y - size * 0.82;
  const text = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");
  return `<g data-part="title"><rect x="${x - width / 2}" y="${top}" width="${width}" height="${lines.length * lineHeight}" fill="transparent"/>${svgText(x, y, text, size, safeColor(state.ink))}</g>`;
}

function svgText(x, y, inner, size, fill) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="middle" font-family="${SERIF}">${inner}</text>`;
}

function desk(sheetW, sheetH) {
  return `<rect class="desk" x="${-MARGIN}" y="${-MARGIN}" width="${sheetW + MARGIN * 2}" height="${sheetH + MARGIN * 2}" fill="${DESK}"/>`;
}

function cropMarks(x, y, w, h) {
  const len = Math.min(4.5, Math.max(2, Math.min(w, h) * 0.09));
  const gap = Math.min(1.5, len * 0.35);
  const stroke = Math.min(0.28, Math.max(0.16, Math.min(w, h) * 0.006));
  const marks = [
    [x - gap - len, y, x - gap, y],
    [x, y - gap - len, x, y - gap],
    [x + w + gap, y, x + w + gap + len, y],
    [x + w, y - gap - len, x + w, y - gap],
    [x - gap - len, y + h, x - gap, y + h],
    [x, y + h + gap, x, y + h + gap + len],
    [x + w + gap, y + h, x + w + gap + len, y + h],
    [x + w, y + h + gap, x + w, y + h + gap + len],
  ];
  return marks.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CUT}" stroke-width="${stroke}"/>`).join("");
}

function sizeText(x, y, label, sheet) {
  const font = Math.min(3.1, Math.max(1.45, sheet * 0.038));
  return `<text x="${x}" y="${y}" fill="#2c2824" font-size="${font}" text-anchor="middle" font-family="${MONO}">${escapeXml(label)}</text>`;
}

function panelLabel(x, y, label, vertical) {
  const transform = vertical ? ` transform="rotate(-90 ${x} ${y})"` : "";
  return `<text x="${x}" y="${y}"${transform} fill="#8a8175" font-size="2.5" text-anchor="middle" dominant-baseline="middle" font-family="${MONO}" pointer-events="none">${escapeXml(label)}</text>`;
}

function highlight() {
  if (!state.selection) return;
  const part = sheetWrap.querySelector(`[data-part="${state.selection}"]`);
  if (!part || typeof part.getBBox !== "function") return;
  const box = part.getBBox();
  if (!box.width && !box.height) return;
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  ring.setAttribute("class", "selection-ring");
  ring.setAttribute("x", String(box.x - 1.2));
  ring.setAttribute("y", String(box.y - 1.2));
  ring.setAttribute("width", String(box.width + 2.4));
  ring.setAttribute("height", String(box.height + 2.4));
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", safeColor(state.accent));
  ring.setAttribute("stroke-width", "0.45");
  ring.setAttribute("stroke-dasharray", "1.1 0.8");
  ring.setAttribute("pointer-events", "none");
  part.appendChild(ring);
}

function download() {
  const svg = sheetWrap.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.querySelectorAll(".desk, .selection-ring").forEach((node) => node.remove());
  clone.removeAttribute("style");
  const file = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `paperroom-${state.format}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function titleFrom(brief) {
  const cut = brief.split(",")[0];
  const beforeFor = cut.split(/\s+for\s+/i)[0];
  const short = contentWords(beforeFor);
  const words = short.length >= 2 ? short : contentWords(cut);
  const picked = (words.length ? words : ["Untitled"]).slice(0, 4);
  return picked.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function contentWords(text) {
  const drop = new Set(Object.values(FORMAT_WORDS).flat());
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word) && !drop.has(word));
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function formatName(format) {
  return { sticker: "Sticker", pin: "Pin", card: "Card", tag: "Tag", box: "Box" }[format] || "Sheet";
}

function setIdle(input, value) {
  if (document.activeElement === input) return;
  if (input.value !== value) input.value = value;
}

function safeColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#1c1916";
}

function cutInk(ground) {
  const hex = safeColor(ground).slice(1);
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? CUT : "#f6f1e6";
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function drawFox(cx, cy, s, ink, accent, ground) {
  const u = s / 100;
  const p = (x, y) => `${cx + x * u},${cy + y * u}`;
  return [
    `<polygon points="${p(-30, -6)} ${p(-16, -46)} ${p(-2, -14)}" fill="${ink}"/>`,
    `<polygon points="${p(30, -6)} ${p(16, -46)} ${p(2, -14)}" fill="${ink}"/>`,
    `<polygon points="${p(0, -20)} ${p(-36, 10)} ${p(-24, 38)} ${p(24, 38)} ${p(36, 10)}" fill="${ink}"/>`,
    `<polygon points="${p(0, 8)} ${p(-16, 34)} ${p(16, 34)}" fill="${accent}"/>`,
    `<circle cx="${cx - 11 * u}" cy="${cy + 2 * u}" r="${2.4 * u}" fill="${ground}"/>`,
    `<circle cx="${cx + 11 * u}" cy="${cy + 2 * u}" r="${2.4 * u}" fill="${ground}"/>`,
    `<circle cx="${cx}" cy="${cy + 16 * u}" r="${1.7 * u}" fill="${ground}"/>`,
  ].join("");
}

function drawCrane(cx, cy, s, ink, accent) {
  const u = s / 100;
  const sw = Math.max(0.55, s / 28);
  return [
    `<path d="M ${cx - 6 * u} ${cy + 8 * u} C ${cx + 16 * u} ${cy + 14 * u} ${cx + 30 * u} ${cy - 6 * u} ${cx + 42 * u} ${cy - 20 * u} L ${cx + 16 * u} ${cy - 4 * u} C ${cx + 6 * u} ${cy + 4 * u} ${cx - 8 * u} ${cy + 2 * u} ${cx - 20 * u} ${cy - 10 * u} Z" fill="${ink}"/>`,
    `<path d="M ${cx - 18 * u} ${cy - 6 * u} L ${cx + 4 * u} ${cy + 10 * u}" stroke="${accent}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`,
  ].join("");
}

function drawCake(cx, cy, s, ink, accent) {
  const w = s * 0.32;
  const h = s * 0.2;
  return [
    `<rect x="${cx - w}" y="${cy - h * 0.15}" width="${w * 2}" height="${h}" fill="${ink}"/>`,
    `<rect x="${cx - w * 0.78}" y="${cy - h * 0.85}" width="${w * 1.56}" height="${h * 0.72}" fill="${accent}"/>`,
    `<rect x="${cx - s * 0.018}" y="${cy - h * 1.35}" width="${s * 0.036}" height="${h * 0.5}" fill="${ink}"/>`,
    `<circle cx="${cx}" cy="${cy - h * 1.42}" r="${s * 0.035}" fill="${accent}"/>`,
  ].join("");
}

function drawLeaf(cx, cy, s, ink, accent) {
  const sw = Math.max(0.45, s / 40);
  return `<g transform="rotate(-38 ${cx} ${cy})"><ellipse cx="${cx - s * 0.02}" cy="${cy - s * 0.02}" rx="${s * 0.12}" ry="${s * 0.26}" fill="${ink}"/><ellipse cx="${cx + s * 0.14}" cy="${cy + s * 0.1}" rx="${s * 0.08}" ry="${s * 0.16}" fill="${accent}"/><path d="M ${cx - s * 0.02} ${cy + s * 0.22} L ${cx - s * 0.02} ${cy - s * 0.2}" stroke="${accent}" stroke-width="${sw}" fill="none"/></g>`;
}

function drawCup(cx, cy, s, ink, accent) {
  const w = s * 0.4;
  const h = s * 0.3;
  const sw = Math.max(0.7, s / 30);
  return [
    `<path d="M ${cx - w} ${cy - h * 0.15} L ${cx - w * 0.78} ${cy + h} H ${cx + w * 0.78} L ${cx + w} ${cy - h * 0.15} Z" fill="${ink}"/>`,
    `<path d="M ${cx + w * 0.72} ${cy} Q ${cx + w * 1.45} ${cy + h * 0.2} ${cx + w * 0.7} ${cy + h * 0.72}" fill="none" stroke="${accent}" stroke-width="${sw}" stroke-linecap="round"/>`,
    `<rect x="${cx - w * 0.72}" y="${cy - h * 0.55}" width="${w * 1.44}" height="${Math.max(0.8, s * 0.045)}" fill="${accent}"/>`,
  ].join("");
}

function drawWave(cx, cy, s, ink, accent) {
  const w = s * 0.42;
  const h = s * 0.14;
  const sw = Math.max(0.7, s / 32);
  const path = (dy) => `M ${cx - w} ${cy + dy} Q ${cx - w / 2} ${cy + dy - h} ${cx} ${cy + dy} T ${cx + w} ${cy + dy}`;
  return `<path d="${path(-h * 0.2)}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/><path d="${path(h * 0.55)}" fill="none" stroke="${accent}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

function drawMoon(cx, cy, s, ink, accent, ground) {
  const r = s * 0.26;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/><circle cx="${cx + r * 0.42}" cy="${cy - r * 0.12}" r="${r * 0.78}" fill="${ground}"/><circle cx="${cx - r * 0.35}" cy="${cy + r * 0.55}" r="${Math.max(0.7, s * 0.035)}" fill="${accent}"/>`;
}

function drawHeart(cx, cy, s, ink) {
  const u = s / 100;
  return `<path d="M ${cx} ${cy + 30 * u} C ${cx - 46 * u} ${cy + 2 * u} ${cx - 30 * u} ${cy - 32 * u} ${cx} ${cy - 8 * u} C ${cx + 30 * u} ${cy - 32 * u} ${cx + 46 * u} ${cy + 2 * u} ${cx} ${cy + 30 * u} Z" fill="${ink}"/>`;
}

function drawSun(cx, cy, s, ink, accent) {
  const r = s * 0.16;
  const sw = Math.max(0.6, s / 36);
  let rays = "";
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    rays += `<line x1="${cx + Math.cos(angle) * r * 1.45}" y1="${cy + Math.sin(angle) * r * 1.45}" x2="${cx + Math.cos(angle) * r * 2.05}" y2="${cy + Math.sin(angle) * r * 2.05}" stroke="${accent}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  return `${rays}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/>`;
}

function drawDiamond(cx, cy, s, ink, accent) {
  const u = s * 0.28;
  return `<polygon points="${cx},${cy - u} ${cx + u},${cy} ${cx},${cy + u} ${cx - u},${cy}" fill="${ink}"/><circle cx="${cx}" cy="${cy}" r="${s * 0.045}" fill="${accent}"/>`;
}
