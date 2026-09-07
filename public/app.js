const appShell = document.querySelector("#appShell");
const authScreen = document.querySelector("#authScreen");
const authForm = document.querySelector("#authForm");
const passwordInput = document.querySelector("#passwordInput");
const authError = document.querySelector("#authError");
const modeButtons = document.querySelectorAll("[data-mode]");
const posterGrid = document.querySelector("#posterGrid");
const countLabel = document.querySelector("#countLabel");
const posterPanelTitle = document.querySelector("#posterPanelTitle");
const previewTitle = document.querySelector("#previewTitle");
const refreshBtn = document.querySelector("#refreshBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const statusEl = document.querySelector("#status");

const storyCard = document.querySelector("#card");
const pauseCard = document.querySelector("#pauseCard");
const pauseMessage = document.querySelector("#pauseMessage");
const pausePosterGrid = document.querySelector("#pausePosterGrid");
const pauseEmpty = document.querySelector("#pauseEmpty");
const cardPoster = document.querySelector("#cardPoster");
const cardMeta = document.querySelector("#cardMeta");
const titleZh = document.querySelector("#titleZh");
const synopsisZh = document.querySelector("#synopsisZh");
const titleEn = document.querySelector("#titleEn");
const synopsisEn = document.querySelector("#synopsisEn");
const creditsZhLine = document.querySelector("#creditsZhLine");
const creditsEnLine = document.querySelector("#creditsEnLine");
const sourceLine = document.querySelector("#sourceLine");

const CINEMA_ID = "5";
const APP_VERSION = "20260907-pauseterms1";
const AUTH_KEY = "cinemaCardAuthorized";
const PASSWORD_HASH = "e7a03d87e87b1a33a06c9d62d24d37f41e218b13f856e66a65abd70de854b1f5";
const DEFAULT_PAUSE_MESSAGE = `MOKO商場買一送一優惠券
不適用於公眾假日,3D電影
IMAX及以下因票價調整的電影
MOKO shopping mall buy one get one free coupon
not applicable on Public Holiday,3D Movie
IMAX and the following movies with price adjustments`;

const sampleMovies = [
  {
    id: "sample-1",
    titleZh: "寒戰 1994",
    titleEn: "Cold War 1994",
    synopsisZh: "香港保安局高層突然失蹤，警隊內外陷入權力與信任的角力。各方人物被迫在危機中作出選擇，事件亦逐步揭開更深層的陰謀。",
    synopsisEn: "A senior security official disappears, pulling Hong Kong's police force into a struggle of power, loyalty, and hidden agendas.",
    category: "IIB",
    duration: "120 分鐘 / 120 mins",
    openingDate: "2026-05-01",
    languageZh: "粵語",
    languageEn: "Cantonese",
    subtitleZh: "中英文",
    subtitleEn: "Chinese, English",
    directorZh: "陸劍青、梁樂民",
    directorEn: "Longman Leung, Sunny Luk",
    castZh: "梁家輝、郭富城、周潤發",
    castEn: "Tony Leung Ka-fai, Aaron Kwok, Chow Yun-fat",
    posterUrl: "api/poster?title=%E5%AF%92%E6%88%B0%201994"
  },
  {
    id: "sample-2",
    titleZh: "三樓的兇案",
    titleEn: "Murder in the Building",
    synopsisZh: "一對夫婦懷疑新鄰居涉及命案，原本像電影情節般的推理，漸漸變成危險而真實的調查。",
    synopsisEn: "A film-loving couple suspects their new neighbour of murder, turning a playful investigation into something genuinely risky.",
    category: "IIA",
    duration: "104 分鐘 / 104 mins",
    openingDate: "2026-05-21",
    languageZh: "法語, 英文",
    languageEn: "French, English",
    subtitleZh: "英文",
    subtitleEn: "English",
    directorZh: "範例導演",
    directorEn: "Sample Director",
    castZh: "範例演員",
    castEn: "Sample Cast",
    posterUrl: "api/poster?title=Murder%20in%20the%20Building"
  }
];

let movies = [];
let selectedMovie = null;
let currentMode = "story";
const pauseMovieIds = new Set();
let hasLoadedMovies = false;

function setStatus(message) {
  statusEl.textContent = message;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unlockApp() {
  document.body.classList.remove("is-locked");
  appShell.removeAttribute("aria-hidden");
  authScreen.hidden = true;
  if (!hasLoadedMovies) {
    hasLoadedMovies = true;
    loadMovies();
  }
}

function getSelectedPauseMovies() {
  return movies.filter((movie) => pauseMovieIds.has(String(movie.id)));
}

function getPauseGridColumns(count) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

function updateCountLabel() {
  if (currentMode === "pause") {
    countLabel.textContent = `${getSelectedPauseMovies().length}/${movies.length} 已選`;
  } else {
    countLabel.textContent = `${movies.length} 套電影`;
  }
}

function updatePosterStates() {
  document.querySelectorAll(".poster-button").forEach((button) => {
    const id = button.dataset.id;
    const isActive = currentMode === "pause" ? pauseMovieIds.has(id) : String(selectedMovie?.id) === id;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function updatePausePreview() {
  const selected = getSelectedPauseMovies();
  pausePosterGrid.innerHTML = "";
  pausePosterGrid.style.setProperty("--pause-cols", String(getPauseGridColumns(selected.length)));
  pauseEmpty.hidden = selected.length > 0;

  if (!selected.length) {
    updateCountLabel();
    return;
  }

  for (const movie of selected) {
    const tile = document.createElement("div");
    tile.className = "pause-poster-tile";

    const img = document.createElement("img");
    img.src = movie.posterUrl;
    img.alt = movie.titleZh || movie.titleEn || "電影海報";
    img.loading = "lazy";

    tile.append(img);
    pausePosterGrid.append(tile);
  }

  updateCountLabel();
}

function togglePauseMovie(movie) {
  const id = String(movie.id);
  if (pauseMovieIds.has(id)) {
    pauseMovieIds.delete(id);
  } else {
    pauseMovieIds.add(id);
  }
  updatePausePreview();
  updatePosterStates();
}

function setMode(mode) {
  currentMode = mode === "pause" ? "pause" : "story";
  document.body.dataset.mode = currentMode;
  storyCard.hidden = currentMode !== "story";
  pauseCard.hidden = currentMode !== "pause";
  posterPanelTitle.textContent = currentMode === "pause" ? "選擇電影" : "點擊 Poster";
  previewTitle.textContent = currentMode === "pause" ? "優惠暫停預覽" : "圖片預覽";

  for (const button of modeButtons) {
    const isActive = button.dataset.mode === currentMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }

  if (currentMode === "pause" && pauseMovieIds.size === 0 && selectedMovie) {
    pauseMovieIds.add(String(selectedMovie.id));
  }

  updatePausePreview();
  updatePosterStates();
}

async function handleAuth(event) {
  event.preventDefault();
  authError.textContent = "";

  if (!globalThis.crypto?.subtle) {
    authError.textContent = "此瀏覽器未支援密碼驗證。";
    return;
  }

  const hash = await sha256Hex(passwordInput.value);
  if (hash !== PASSWORD_HASH) {
    authError.textContent = "密碼不正確。";
    passwordInput.select();
    return;
  }

  localStorage.setItem(AUTH_KEY, "1");
  passwordInput.value = "";
  unlockApp();
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildMetaLines(movie) {
  const language = [
    movie.languageZh,
    movie.languageEn && movie.languageEn !== movie.languageZh ? movie.languageEn : ""
  ].filter(Boolean).join(" / ");
  const subtitle = [
    movie.subtitleZh,
    movie.subtitleEn && movie.subtitleEn !== movie.subtitleZh ? movie.subtitleEn : ""
  ].filter(Boolean).join(" / ");

  return [
    [movie.category, movie.duration, movie.openingDate].filter(Boolean).join("  ·  "),
    language ? `語言 Language: ${language}` : "",
    subtitle ? `字幕 Subtitles: ${subtitle}` : ""
  ].filter(Boolean);
}

function buildCreditSections(movie) {
  return {
    zh: [
      movie.directorZh ? `導演：${movie.directorZh}` : "",
      movie.castZh ? `演員：${movie.castZh}` : ""
    ].filter(Boolean),
    en: [
      movie.directorEn && movie.directorEn !== movie.directorZh ? `Director: ${movie.directorEn}` : "",
      movie.castEn && movie.castEn !== movie.castZh ? `Cast: ${movie.castEn}` : ""
    ].filter(Boolean)
  };
}

function selectMovie(movie) {
  selectedMovie = movie;
  cardPoster.src = movie.posterUrl;
  cardPoster.alt = movie.titleZh;
  cardMeta.textContent = buildMetaLines(movie).join("\n");
  titleZh.textContent = movie.titleZh;
  synopsisZh.textContent = movie.synopsisZh || "暫時未有中文故事簡介。";
  titleEn.textContent = movie.titleEn;
  synopsisEn.textContent = movie.synopsisEn || "English synopsis is not available yet.";
  const creditSections = buildCreditSections(movie);
  creditsZhLine.textContent = creditSections.zh.join("\n");
  creditsZhLine.hidden = creditSections.zh.length === 0;
  creditsEnLine.textContent = creditSections.en.join("\n");
  creditsEnLine.hidden = creditSections.en.length === 0;
  sourceLine.textContent = "Source: cinema.com.hk";
  updatePosterStates();
}

function renderMovies(list) {
  posterGrid.innerHTML = "";

  for (const movie of list) {
    const button = document.createElement("button");
    button.className = "poster-button";
    button.dataset.id = movie.id;
    button.type = "button";
    button.setAttribute("aria-pressed", "false");

    const img = document.createElement("img");
    img.src = movie.posterUrl;
    img.alt = movie.titleZh;
    img.loading = "lazy";

    const mark = document.createElement("span");
    mark.className = "poster-check";
    mark.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.textContent = truncate(movie.titleZh, 34);

    button.append(img, mark, label);
    button.addEventListener("click", () => {
      if (currentMode === "pause") {
        togglePauseMovie(movie);
      } else {
        selectMovie(movie);
      }
    });
    posterGrid.append(button);
  }

  const existing = selectedMovie ? list.find((movie) => String(movie.id) === String(selectedMovie.id)) : null;
  if (existing || list[0]) selectMovie(existing || list[0]);
  updatePausePreview();
  updatePosterStates();
}

async function loadMovies() {
  setStatus("正在讀取電影資料...");
  refreshBtn.disabled = true;

  try {
    const payload = await fetchMoviePayload();
    movies = payload.movies?.length ? payload.movies : sampleMovies;
    renderMovies(movies);
    setStatus(payload.movies?.length ? `已更新：${new Date(payload.fetchedAt).toLocaleString()}` : "未讀到即時資料，已顯示 sample。");
  } catch (error) {
    movies = sampleMovies;
    renderMovies(movies);
    setStatus(`即時抓取暫時失敗，已顯示 sample：${error.message}`);
  } finally {
    refreshBtn.disabled = false;
  }
}

async function fetchMoviePayload() {
  const staticResponse = await fetch(`data/movies-${CINEMA_ID}.json?v=${APP_VERSION}`, { cache: "no-store" });
  if (staticResponse.ok) return staticResponse.json();

  const apiResponse = await fetch(`api/movies`);
  const payload = await apiResponse.json();
  if (!apiResponse.ok) throw new Error(payload.error || "讀取失敗");
  return payload;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawContain(ctx, img, x, y, width, height) {
  const scale = Math.min(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, width, height);
  ctx.drawImage(img, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getWrappedLines(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text || "").split("\n");

  for (const paragraph of paragraphs) {
    const chars = [...paragraph];
    let line = "";

    for (const char of chars) {
      const next = line + char;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line.trim());
        line = char;
      } else {
        line = next;
      }
    }

    if (line.trim()) lines.push(line.trim());
    if (!paragraph.trim()) lines.push("");
  }

  return lines.length ? lines : [""];
}

function drawLines(ctx, lines, x, y, lineHeight) {
  for (const line of lines) {
    if (line) ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  return drawLines(ctx, getWrappedLines(ctx, text, maxWidth), x, y, lineHeight);
}

function ellipsizeLines(lines, maxLines) {
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  trimmed[trimmed.length - 1] = `${trimmed[trimmed.length - 1].replace(/…$/, "")}…`;
  return trimmed;
}

function wrapTextLimited(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = [...String(text || "")];
  let line = "";
  let lines = 0;

  for (let i = 0; i < chars.length; i += 1) {
    const next = line + chars[i];
    if (chars[i] === "\n" || ctx.measureText(next).width > maxWidth) {
      ctx.fillText(line.trim(), x, y);
      y += lineHeight;
      lines += 1;
      line = chars[i] === "\n" ? "" : chars[i];
      if (lines >= maxLines) return y;
    } else {
      line = next;
    }
  }

  if (line && lines < maxLines) {
    ctx.fillText(line.trim(), x, y);
    y += lineHeight;
  }
  return y;
}

function setCanvasFont(ctx, weight, size) {
  ctx.font = `${weight} ${Math.round(size)}px Arial, sans-serif`;
}

function buildExportLayout(ctx, movie) {
  const maxWidth = 932;
  const bottom = 1830;
  const metaLines = buildMetaLines(movie);
  const metaLineHeight = 34;
  const creditSections = buildCreditSections(movie);
  const creditLineHeight = 33;
  const synopsisZh = movie.synopsisZh || "暫時未有中文故事簡介。";
  const synopsisEn = movie.synopsisEn || "English synopsis is not available yet.";

  function make(scale, clamp) {
    const sizes = {
      meta: 26 * scale,
      titleZh: 56 * scale,
      synopsisZh: 32 * scale,
      titleEn: 38 * scale,
      synopsisEn: 28 * scale,
      credits: 24 * scale
    };
    const lineHeights = {
      titleZh: 64 * scale,
      synopsisZh: 50 * scale,
      titleEn: 46 * scale,
      synopsisEn: 40 * scale,
      credits: creditLineHeight * scale
    };

    setCanvasFont(ctx, 700, sizes.meta);
    const wrappedMetaLines = metaLines.flatMap((line) => getWrappedLines(ctx, line, maxWidth));
    const metaAdvance = wrappedMetaLines.length * metaLineHeight * scale + 36 * scale;

    setCanvasFont(ctx, 700, sizes.credits);
    const wrappedZhCreditLines = ellipsizeLines(creditSections.zh.flatMap((line) => getWrappedLines(ctx, line, maxWidth)), 3);
    const wrappedEnCreditLines = ellipsizeLines(creditSections.en.flatMap((line) => getWrappedLines(ctx, line, maxWidth)), 3);
    const zhCreditAdvance = wrappedZhCreditLines.length ? 24 * scale + wrappedZhCreditLines.length * lineHeights.credits : 0;
    const enCreditAdvance = wrappedEnCreditLines.length ? 24 * scale + wrappedEnCreditLines.length * lineHeights.credits : 0;

    setCanvasFont(ctx, 800, sizes.titleZh);
    const titleZhLines = ellipsizeLines(getWrappedLines(ctx, movie.titleZh, maxWidth), 2);

    setCanvasFont(ctx, 400, sizes.synopsisZh);
    let synopsisZhLines = getWrappedLines(ctx, synopsisZh, maxWidth);

    setCanvasFont(ctx, 800, sizes.titleEn);
    const titleEnLines = ellipsizeLines(getWrappedLines(ctx, movie.titleEn, maxWidth), 2);

    setCanvasFont(ctx, 400, sizes.synopsisEn);
    let synopsisEnLines = getWrappedLines(ctx, synopsisEn, maxWidth);

    if (clamp) {
      const fixedHeight =
        metaAdvance +
        titleZhLines.length * lineHeights.titleZh +
        22 * scale +
        38 * scale +
        58 * scale +
        titleEnLines.length * lineHeights.titleEn +
        20 * scale +
        zhCreditAdvance +
        enCreditAdvance;
      const remaining = Math.max(0, bottom - 830 - fixedHeight);
      const zhWanted = synopsisZhLines.length * lineHeights.synopsisZh;
      const enWanted = synopsisEnLines.length * lineHeights.synopsisEn;
      const zhShare = zhWanted + enWanted > 0 ? zhWanted / (zhWanted + enWanted) : 0.55;
      const maxZhLines = Math.max(2, Math.floor((remaining * zhShare) / lineHeights.synopsisZh));
      const maxEnLines = Math.max(2, Math.floor((remaining - maxZhLines * lineHeights.synopsisZh) / lineHeights.synopsisEn));
      synopsisZhLines = ellipsizeLines(synopsisZhLines, maxZhLines);
      synopsisEnLines = ellipsizeLines(synopsisEnLines, maxEnLines);
    }

    const height =
      metaAdvance +
      titleZhLines.length * lineHeights.titleZh +
      22 * scale +
      synopsisZhLines.length * lineHeights.synopsisZh +
      zhCreditAdvance +
      38 * scale +
      58 * scale +
      titleEnLines.length * lineHeights.titleEn +
      20 * scale +
      synopsisEnLines.length * lineHeights.synopsisEn +
      enCreditAdvance;

    return {
      scale,
      sizes,
      lineHeights,
      metaLines: wrappedMetaLines,
      metaLineHeight,
      titleZhLines,
      synopsisZhLines,
      zhCreditLines: wrappedZhCreditLines,
      titleEnLines,
      synopsisEnLines,
      enCreditLines: wrappedEnCreditLines,
      height
    };
  }

  for (let scale = 1; scale >= 0.68; scale -= 0.04) {
    const layout = make(scale, false);
    if (830 + layout.height <= bottom) return layout;
  }

  return make(0.68, true);
}

function fitWrappedText(ctx, text, { maxWidth, maxHeight, weight, maxSize, minSize, lineHeightFactor }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    setCanvasFont(ctx, weight, size);
    const lineHeight = size * lineHeightFactor;
    const lines = getWrappedLines(ctx, text, maxWidth);
    if (lines.length * lineHeight <= maxHeight) return { size, lineHeight, lines };
  }

  setCanvasFont(ctx, weight, minSize);
  const lineHeight = minSize * lineHeightFactor;
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  return {
    size: minSize,
    lineHeight,
    lines: ellipsizeLines(getWrappedLines(ctx, text, maxWidth), maxLines)
  };
}

function getPausePosterLayout(count, width, height) {
  let best = null;

  for (let cols = 1; cols <= Math.min(count, 6); cols += 1) {
    const rows = Math.ceil(count / cols);
    const gap = cols >= 5 || rows >= 4 ? 18 : 24;
    const cellWidth = (width - (cols - 1) * gap) / cols;
    const cellHeight = (height - (rows - 1) * gap) / rows;
    let posterWidth = Math.min(cellWidth, cellHeight * (2 / 3));
    let posterHeight = posterWidth * 1.5;

    if (posterHeight > cellHeight) {
      posterHeight = cellHeight;
      posterWidth = posterHeight * (2 / 3);
    }

    const posterArea = posterWidth * posterHeight;
    if (!best || posterArea > best.posterArea) {
      best = { cols, rows, gap, posterWidth, posterHeight, posterArea };
    }
  }

  return best;
}

function drawPosterFallback(ctx, movie, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#f6f2ec";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#ded9d2";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#555555";
  ctx.textAlign = "center";
  setCanvasFont(ctx, 700, 24);
  const title = movie.titleZh || movie.titleEn || "電影海報";
  const lines = ellipsizeLines(getWrappedLines(ctx, title, width - 32), 3);
  const lineHeight = 32;
  const startY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + 8;
  drawLines(ctx, lines, x + width / 2, startY, lineHeight);
  ctx.restore();
}

function drawPosterTile(ctx, img, movie, x, y, width, height) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);
  ctx.restore();

  if (img) {
    drawContain(ctx, img, x, y, width, height);
  } else {
    drawPosterFallback(ctx, movie, x, y, width, height);
  }

  ctx.strokeStyle = "#e4ded6";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
}

async function makePauseCanvas() {
  const selectedMovies = getSelectedPauseMovies();
  if (!selectedMovies.length) throw new Error("請先選擇至少一套電影。");

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const message = pauseMessage.value.trim() || DEFAULT_PAUSE_MESSAGE;
  const posterImages = await Promise.all(selectedMovies.map(async (movie) => {
    try {
      return await loadImage(movie.posterUrl);
    } catch {
      return null;
    }
  }));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8f4ed";
  ctx.fillRect(0, 0, canvas.width, 840);

  const infoBox = { x: 110, y: 86, width: 860, height: 680 };
  roundedRectPath(ctx, infoBox.x, infoBox.y, infoBox.width, infoBox.height, 92);
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.fill();
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 3;
  ctx.stroke();

  const topText = fitWrappedText(ctx, message, {
    maxWidth: 760,
    maxHeight: 520,
    weight: 800,
    maxSize: 46,
    minSize: 24,
    lineHeightFactor: 1.32
  });
  ctx.fillStyle = "#171717";
  ctx.textAlign = "center";
  setCanvasFont(ctx, 800, topText.size);
  const topTextHeight = topText.lines.length * topText.lineHeight;
  drawLines(ctx, topText.lines, 540, infoBox.y + infoBox.height / 2 - topTextHeight / 2 + topText.size, topText.lineHeight);
  ctx.textAlign = "left";

  ctx.fillStyle = "#b82435";
  ctx.fillRect(0, 840, 1080, 12);

  const x = 74;
  const posterArea = { x, y: 900, width: 932, height: 850 };
  const layout = getPausePosterLayout(selectedMovies.length, posterArea.width, posterArea.height);
  const gridWidth = layout.cols * layout.posterWidth + (layout.cols - 1) * layout.gap;
  const gridHeight = layout.rows * layout.posterHeight + (layout.rows - 1) * layout.gap;
  const startX = posterArea.x + (posterArea.width - gridWidth) / 2;
  const startY = posterArea.y + (posterArea.height - gridHeight) / 2;

  selectedMovies.forEach((movie, index) => {
    const col = index % layout.cols;
    const row = Math.floor(index / layout.cols);
    const posterX = startX + col * (layout.posterWidth + layout.gap);
    const posterY = startY + row * (layout.posterHeight + layout.gap);
    drawPosterTile(ctx, posterImages[index], movie, posterX, posterY, layout.posterWidth, layout.posterHeight);
  });

  ctx.fillStyle = "#777777";
  setCanvasFont(ctx, 400, 22);
  ctx.fillText("Source: cinema.com.hk", x, 1874);
  return canvas;
}

async function makeStoryCanvas() {
  if (!selectedMovie) throw new Error("未揀電影");

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const layout = buildExportLayout(ctx, selectedMovie);
  const img = await loadImage(selectedMovie.posterUrl);

  ctx.fillStyle = "#f8f4ed";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawContain(ctx, img, 0, 0, 1080, 760);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 760, 1080, 1160);
  ctx.fillStyle = "#b82435";
  ctx.fillRect(0, 760, 1080, 12);

  const x = 74;
  let y = 830;

  ctx.fillStyle = "#b82435";
  setCanvasFont(ctx, 700, layout.sizes.meta);
  y = drawLines(ctx, layout.metaLines, x, y, layout.metaLineHeight * layout.scale) + 36 * layout.scale;

  ctx.fillStyle = "#171717";
  setCanvasFont(ctx, 800, layout.sizes.titleZh);
  y = drawLines(ctx, layout.titleZhLines, x, y, layout.lineHeights.titleZh) + 22 * layout.scale;

  setCanvasFont(ctx, 400, layout.sizes.synopsisZh);
  ctx.fillStyle = "#2b2b2b";
  y = drawLines(ctx, layout.synopsisZhLines, x, y, layout.lineHeights.synopsisZh);

  if (layout.zhCreditLines.length) {
    y += 24 * layout.scale;
    ctx.fillStyle = "#555555";
    setCanvasFont(ctx, 600, layout.sizes.credits);
    y = drawLines(ctx, layout.zhCreditLines, x, y, layout.lineHeights.credits);
  }

  y += 38 * layout.scale;

  ctx.strokeStyle = "#ded9d2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(1006, y);
  ctx.stroke();
  y += 58 * layout.scale;

  ctx.fillStyle = "#171717";
  setCanvasFont(ctx, 800, layout.sizes.titleEn);
  y = drawLines(ctx, layout.titleEnLines, x, y, layout.lineHeights.titleEn) + 20 * layout.scale;

  setCanvasFont(ctx, 400, layout.sizes.synopsisEn);
  ctx.fillStyle = "#333333";
  y = drawLines(ctx, layout.synopsisEnLines, x, y, layout.lineHeights.synopsisEn);

  if (layout.enCreditLines.length) {
    y += 24 * layout.scale;
    ctx.fillStyle = "#555555";
    setCanvasFont(ctx, 600, layout.sizes.credits);
    drawLines(ctx, layout.enCreditLines, x, y, layout.lineHeights.credits);
  }

  ctx.fillStyle = "#777";
  setCanvasFont(ctx, 400, 22);
  ctx.fillText("Source: cinema.com.hk", x, 1874);
  return canvas;
}

async function makeCanvas() {
  return currentMode === "pause" ? makePauseCanvas() : makeStoryCanvas();
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
}

async function copyImage() {
  setStatus("正在製作圖片...");
  const canvas = await makeCanvas();
  const blob = await canvasToBlob(canvas);
  if (!navigator.clipboard || !window.ClipboardItem) {
    downloadBlob(blob);
    setStatus("瀏覽器未支援直接複製圖片，已改為下載 PNG。");
    return;
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setStatus("已複製成圖片，可以直接貼上。");
  } catch (error) {
    downloadBlob(blob);
    setStatus(`瀏覽器未允許直接複製圖片，已改為下載 PNG。`);
  }
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const rawName = currentMode === "pause"
    ? `優惠暫停-${new Date().toISOString().slice(0, 10)}`
    : selectedMovie?.titleEn || selectedMovie?.titleZh || "movie";
  const name = rawName.replace(/[^\w\u4e00-\u9fff]+/g, "-");
  a.href = url;
  a.download = `${name}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadImage() {
  setStatus("正在輸出 PNG...");
  const canvas = await makeCanvas();
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob);
  setStatus("PNG 已下載。");
}

refreshBtn.addEventListener("click", loadMovies);
copyBtn.addEventListener("click", () => copyImage().catch((error) => setStatus(`複製失敗：${error.message}`)));
downloadBtn.addEventListener("click", () => downloadImage().catch((error) => setStatus(`下載失敗：${error.message}`)));
for (const button of modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}
authForm.addEventListener("submit", (event) => {
  handleAuth(event).catch(() => {
    authError.textContent = "密碼驗證失敗。";
  });
});

setMode("story");

if (localStorage.getItem(AUTH_KEY) === "1") {
  unlockApp();
} else {
  passwordInput.focus();
}
