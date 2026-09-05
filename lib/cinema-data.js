export const POSTER_CDN = "https://media.grabticks.com";

function stripHtml(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseMaybeJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
}

function decodeFlight(html) {
  let text = "";
  const re = /self\.__next_f\.push\(\[1,\"((?:\\.|[^"\\])*)\"\]\)/g;
  let match;
  while ((match = re.exec(html))) {
    try {
      text += JSON.parse(`"${match[1]}"`);
    } catch {
      // Ignore chunks that are not plain string payloads.
    }
  }
  return text;
}

function extractJsonValueAt(text, start) {
  const first = text[start];
  if (first !== "{" && first !== "[" && first !== "\"") return "";

  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
        if (first === "\"" && depth === 0) return text.slice(start, i + 1);
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

function extractFlightRefs(text) {
  const refs = new Map();
  const re = /([0-9a-z]+):T([0-9a-f]+),/g;
  let match;
  while ((match = re.exec(text))) {
    const [, id, lenText] = match;
    const start = match.index + match[0].length;
    const len = Number.parseInt(lenText, 16);
    const extracted = extractJsonValueAt(text, start);
    const candidates = extracted ? [extracted, text.slice(start, start + len)] : [text.slice(start, start + len)];
    const lineEnd = text.indexOf("\n", start);
    if (lineEnd > start) candidates.push(text.slice(start, lineEnd));

    for (const candidate of candidates) {
      try {
        refs.set(id, JSON.parse(candidate));
        break;
      } catch {
        // Some React flight lengths count bytes. The JSON extractor catches those.
      }
    }
  }
  return refs;
}

function resolveRef(value, refs) {
  if (typeof value === "string" && value.startsWith("$")) {
    return refs.get(value.slice(1)) ?? value;
  }
  return value;
}

function buildPosterUrl(posterFile, title, posterPath) {
  if (posterFile && posterPath === "static") return `data/posters/${posterFile}`;
  if (posterFile) return `api/image?file=${encodeURIComponent(posterFile)}&v=2`;
  return `api/poster?title=${encodeURIComponent(title)}`;
}

function movieFromRaw(raw, refs, posterPath = "api") {
  const titleLang = parseMaybeJson(raw.title_lang || raw.name_lang);
  const descLang = parseMaybeJson(resolveRef(raw.description_lang, refs));
  const dialectLang = parseMaybeJson(raw.dialect_lang);
  const subtitleLang = parseMaybeJson(raw.subtitle_lang);
  const posterFile = raw.images?.[0] || raw.landscapeImages?.[0] || "";

  return {
    id: raw.id,
    titleZh: titleLang.zh_hk || raw.title || raw.name || "未命名電影",
    titleEn: titleLang.en || raw.title || raw.name || "Untitled",
    synopsisZh: stripHtml(descLang.zh_hk || ""),
    synopsisEn: stripHtml(descLang.en || ""),
    category: raw.category || "",
    duration: raw.duration ? `${raw.duration} 分鐘 / ${raw.duration} mins` : "",
    openingDate: raw.openingDate ? raw.openingDate.slice(0, 10) : "",
    languageZh: dialectLang.zh_hk || raw.dialect || "",
    languageEn: dialectLang.en || raw.dialect || "",
    subtitleZh: subtitleLang.zh_hk || raw.subtitle || "",
    subtitleEn: subtitleLang.en || raw.subtitle || "",
    posterFile,
    posterUrl: buildPosterUrl(posterFile, titleLang.zh_hk || raw.title || "MOVIE", posterPath)
  };
}

function parseDetailedMovieMap(text, refs, posterPath) {
  const movies = new Map();
  const re = /\{\"id\":\d+,\"openingDate\":.*?\"maxTime\":\"[^\"]+\"\}/g;
  let match;

  while ((match = re.exec(text))) {
    try {
      const raw = JSON.parse(match[0]);
      movies.set(raw.id, movieFromRaw(raw, refs, posterPath));
    } catch {
      // Skip bad matches.
    }
  }
  return movies;
}

function parseMovieDetails(html, posterPath) {
  const text = decodeFlight(html);
  const refs = extractFlightRefs(text);
  return parseDetailedMovieMap(text, refs, posterPath);
}

function movieScore(movie) {
  const title = `${movie.titleZh} ${movie.titleEn}`.toLowerCase();
  let score = 0;
  if (/\b(imax|4dx|cgs|cinity|atmos|dolby|mx4d)\b/i.test(title)) score += 20;
  if (/特典場|special screening|tote bag|poster/i.test(title)) score += 15;
  score += Math.min(20, title.length / 20);
  return score;
}

function dedupeMovies(movies) {
  const groups = new Map();
  for (const movie of movies) {
    const synopsisKey = `${movie.duration}|${movie.synopsisZh || movie.synopsisEn}`.toLowerCase().replace(/\s+/g, " ").slice(0, 260);
    const titleKey = `${movie.titleZh}|${movie.titleEn}`.toLowerCase().replace(/\s+/g, " ");
    const key = (movie.synopsisZh || movie.synopsisEn) ? synopsisKey : titleKey;
    const current = groups.get(key);

    if (!current || movieScore(movie) < movieScore(current)) {
      groups.set(key, movie);
    }
  }
  return [...groups.values()];
}

function parseCinemaMovies(cinemaHtml, fallbackMovieDetails = new Map(), posterPath = "api") {
  const text = decodeFlight(cinemaHtml);
  const refs = extractFlightRefs(text);
  const detailedMovies = new Map([...fallbackMovieDetails, ...parseDetailedMovieMap(text, refs, posterPath)]);
  const showRe = /\{\"id\":\d+,\"published\":(?:true|false),\"hold\":.*?\"avaliable\":\d+\}/g;
  const movieShowTimes = new Map();
  let match;

  while ((match = showRe.exec(text))) {
    try {
      const show = JSON.parse(match[0]);
      const time = new Date(show.time).getTime();
      if (!show.published || show.hold || Number.isNaN(time)) continue;
      const movieId = show.movie?.id;
      if (!movieId) continue;
      const current = movieShowTimes.get(movieId);
      if (!current || time < current) movieShowTimes.set(movieId, time);
    } catch {
      // Skip malformed show fragments.
    }
  }

  const movies = [...movieShowTimes.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([movieId, firstShowTime]) => {
      const movie = detailedMovies.get(movieId);
      return movie ? { ...movie, firstShowTime: new Date(firstShowTime).toISOString() } : null;
    })
    .filter(Boolean)
    .filter((movie) => movie.synopsisZh || movie.synopsisEn);

  return dedupeMovies(movies);
}

export async function fetchCinemaMovies({ cinemaID = "5", posterPath = "api" } = {}) {
  const cinemaUrl = new URL(`https://www.cinema.com.hk/hk/cinema/${encodeURIComponent(cinemaID)}`);
  const detailUrl = new URL("https://www.cinema.com.hk/tc/movie/ticketing/bycinema");
  detailUrl.searchParams.set("cinemaID", cinemaID);

  const headers = {
    "accept-language": "zh-HK,zh;q=0.9,en;q=0.8",
    "user-agent": "Mozilla/5.0 Cinema poster prototype"
  };
  const [cinemaResponse, detailResponse] = await Promise.all([
    fetch(cinemaUrl, { headers, redirect: "follow" }),
    fetch(detailUrl, { headers, redirect: "follow" })
  ]);

  if (!cinemaResponse.ok) throw new Error(`Cinema page returned ${cinemaResponse.status}`);

  const cinemaHtml = await cinemaResponse.text();
  const detailHtml = detailResponse.ok ? await detailResponse.text() : "";
  const fallbackDetails = detailHtml ? parseMovieDetails(detailHtml, posterPath) : new Map();
  return parseCinemaMovies(cinemaHtml, fallbackDetails, posterPath);
}
