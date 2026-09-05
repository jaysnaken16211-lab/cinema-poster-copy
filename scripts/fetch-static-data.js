import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fetchCinemaMovies, POSTER_CDN } from "../lib/cinema-data.js";

const cinemaIDs = (process.env.CINEMA_IDS || "5")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const dataDir = join(process.cwd(), "public", "data");
const posterDir = join(dataDir, "posters");
const mimeToExt = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

async function downloadPoster(file) {
  if (!file) return;

  const response = await fetch(`${POSTER_CDN}/${file}`, {
    headers: { "user-agent": "Mozilla/5.0 Cinema poster static updater" },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`Poster ${file} returned ${response.status}`);

  const type = response.headers.get("content-type")?.split(";")[0] || "";
  const fallbackExt = extname(file) || mimeToExt.get(type) || ".jpg";
  const safeFile = /^[a-z0-9_-]+\.(jpe?g|png|webp)$/i.test(file) ? file : `${file}${fallbackExt}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(join(posterDir, safeFile), buffer);
}

async function updateCinema(cinemaID) {
  const movies = await fetchCinemaMovies({ cinemaID, posterPath: "static" });
  await Promise.all([...new Set(movies.map((movie) => movie.posterFile).filter(Boolean))].map(downloadPoster));

  const payload = {
    source: `https://www.cinema.com.hk/hk/cinema/${cinemaID}`,
    fetchedAt: new Date().toISOString(),
    cinemaID,
    movies
  };
  await writeFile(join(dataDir, `movies-${cinemaID}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated cinema ${cinemaID}: ${movies.length} movies`);
}

await mkdir(posterDir, { recursive: true });
for (const cinemaID of cinemaIDs) {
  await updateCinema(cinemaID);
}
