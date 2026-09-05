const posterGrid = document.querySelector("#posterGrid");
const countLabel = document.querySelector("#countLabel");
const refreshBtn = document.querySelector("#refreshBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const statusEl = document.querySelector("#status");

const cardPoster = document.querySelector("#cardPoster");
const cardMeta = document.querySelector("#cardMeta");
const titleZh = document.querySelector("#titleZh");
const synopsisZh = document.querySelector("#synopsisZh");
const titleEn = document.querySelector("#titleEn");
const synopsisEn = document.querySelector("#synopsisEn");
const creditsLine = document.querySelector("#creditsLine");
const sourceLine = document.querySelector("#sourceLine");

const CINEMA_ID = "5";
const APP_VERSION = "20260905-credits3";

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

function setStatus(message) {
  statusEl.textContent = message;
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

function buildCreditLines(movie) {
  return [
    movie.directorZh ? `導演：${movie.directorZh}` : "",
    movie.castZh ? `演員：${movie.castZh}` : "",
    movie.directorEn && movie.directorEn !== movie.directorZh ? `Director: ${movie.directorEn}` : "",
    movie.castEn && movie.castEn !== movie.castZh ? `Cast: ${movie.castEn}` : ""
  ].filter(Boolean);
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
  const creditLines = buildCreditLines(movie);
  creditsLine.textContent = creditLines.join("\n");
  creditsLine.hidden = creditLines.length === 0;
  sourceLine.textContent = "Source: cinema.com.hk";

  document.querySelectorAll(".poster-button").forEach((button) => {
    button.classList.toggle("is-active", String(button.dataset.id) === String(movie.id));
  });
}

function renderMovies(list) {
  posterGrid.innerHTML = "";
  countLabel.textContent = `${list.length} 套電影`;

  for (const movie of list) {
    const button = document.createElement("button");
    button.className = "poster-button";
    button.dataset.id = movie.id;
    button.type = "button";

    const img = document.createElement("img");
    img.src = movie.posterUrl;
    img.alt = movie.titleZh;
    img.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = truncate(movie.titleZh, 34);

    button.append(img, label);
    button.addEventListener("click", () => selectMovie(movie));
    posterGrid.append(button);
  }

  if (list[0]) selectMovie(list[0]);
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
  const creditLines = buildCreditLines(movie);
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
    const wrappedCreditLines = ellipsizeLines(creditLines.flatMap((line) => getWrappedLines(ctx, line, maxWidth)), 6);
    const creditAdvance = wrappedCreditLines.length ? 28 * scale + wrappedCreditLines.length * lineHeights.credits : 0;

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
        creditAdvance;
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
      38 * scale +
      58 * scale +
      titleEnLines.length * lineHeights.titleEn +
      20 * scale +
      synopsisEnLines.length * lineHeights.synopsisEn +
      creditAdvance;

    return { scale, sizes, lineHeights, metaLines: wrappedMetaLines, metaLineHeight, titleZhLines, synopsisZhLines, titleEnLines, synopsisEnLines, creditLines: wrappedCreditLines, height };
  }

  for (let scale = 1; scale >= 0.68; scale -= 0.04) {
    const layout = make(scale, false);
    if (830 + layout.height <= bottom) return layout;
  }

  return make(0.68, true);
}

async function makeCanvas() {
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
  y = drawLines(ctx, layout.synopsisZhLines, x, y, layout.lineHeights.synopsisZh) + 38 * layout.scale;

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

  if (layout.creditLines.length) {
    y += 28 * layout.scale;
    ctx.fillStyle = "#555555";
    setCanvasFont(ctx, 600, layout.sizes.credits);
    drawLines(ctx, layout.creditLines, x, y, layout.lineHeights.credits);
  }

  ctx.fillStyle = "#777";
  setCanvasFont(ctx, 400, 22);
  ctx.fillText("Source: cinema.com.hk", x, 1874);
  return canvas;
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
  const name = (selectedMovie?.titleEn || selectedMovie?.titleZh || "movie").replace(/[^\w\u4e00-\u9fff]+/g, "-");
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

loadMovies();
