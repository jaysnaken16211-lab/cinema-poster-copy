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
  const isImage = buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    || buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP");
  if (!isImage) throw new Error(`Poster ${file} is not a supported image`);
  await writeFile(join(posterDir, safeFile), buffer);
}

async function updateCinema(cinemaID) {
  const movies = await fetchCinemaMovies({ cinemaID, posterPath: "static" });
  await Promise.all([...new Set(movies.map((movie) => movie.posterFile).filter(Boolean))].map(downloadPoster));

  const payload = {
    source: `https://www.cinema.com.hk/hk/cinema/${cinemaID}`,
    fetchedAt: new Date().toISOString(),
    sourceMovieIds: movies.flatMap(movie => movie.sourceMovieIds),
    cinemaID,
    movies
  };
  await writeFile(join(dataDir, `movies-${cinemaID}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Updated cinema ${cinemaID}: ${movies.length} movies`);
  console.log(`Verified source movie IDs: ${payload.sourceMovieIds.join(", ")}`);
  console.log(movies.map(movie => `${movie.id}: ${movie.titleZh}`).join("\n"));
}

await mkdir(posterDir, { recursive: true });
for (const cinemaID of cinemaIDs) {
  await updateCinema(cinemaID);
}
