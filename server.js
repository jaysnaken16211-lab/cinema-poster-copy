import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCinemaMovies, POSTER_CDN } from "./lib/cinema-data.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = process.env.PORT || 4173;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const movieCache = new Map();
const imageCache = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

async function fetchMovies(searchParams) {
  const cinemaID = searchParams.get("cinemaID") || "5";
  const cacheKey = `${cinemaID}:live`;
  const cached = movieCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 10 * 60 * 1000) return cached.movies;

  const movies = await fetchCinemaMovies({ cinemaID, posterPath: "api" });
  movieCache.set(cacheKey, { time: Date.now(), movies });
  return movies;
}

async function serveImage(req, res, searchParams) {
  const file = searchParams.get("file") || "";
  if (!/^[a-z0-9_-]+\.(jpe?g|png|webp)$/i.test(file)) {
    res.writeHead(400);
    res.end("Bad image file");
    return;
  }
  if (imageCache.has(file)) {
    const cached = imageCache.get(file);
    res.writeHead(200, {
      "content-type": cached.type,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    res.end(cached.buffer);
    return;
  }

  const upstream = await fetch(`${POSTER_CDN}/${file}`, {
    headers: { "user-agent": "Mozilla/5.0 Cinema poster prototype" },
    redirect: "follow"
  });
  if (!upstream.ok) throw new Error(`Image returned ${upstream.status}`);
  const type = upstream.headers.get("content-type") || mime[extname(file)] || "image/jpeg";
  const buffer = Buffer.from(await upstream.arrayBuffer());
  imageCache.set(file, { type, buffer });
  res.writeHead(200, {
    "content-type": type,
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(buffer);
}

function serveGeneratedPoster(res, searchParams) {
  const title = (searchParams.get("title") || "MOVIE").slice(0, 80);
  const safe = title.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#151515"/><stop offset="0.5" stop-color="#8d1f2d"/><stop offset="1" stop-color="#e6c36a"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1040" fill="url(#g)"/>
  <rect x="38" y="38" width="644" height="964" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="4"/>
  <text x="360" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#fff">${safe}</text>
  <text x="360" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,.78)">Poster preview</text>
</svg>`;
  res.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(svg);
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": mime[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  try {
    if (url.pathname === "/api/movies") {
      const movies = await fetchMovies(url.searchParams);
      json(res, 200, {
        source: "https://www.cinema.com.hk/hk/cinema",
        fetchedAt: new Date().toISOString(),
        movies
      });
      return;
    }
    if (url.pathname === "/api/image") {
      await serveImage(req, res, url.searchParams);
      return;
    }
    if (url.pathname === "/api/poster") {
      serveGeneratedPoster(res, url.searchParams);
      return;
    }
    await serveStatic(url.pathname, res);
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}).listen(port, () => {
  console.log(`Cinema poster copy prototype: http://localhost:${port}`);
});
