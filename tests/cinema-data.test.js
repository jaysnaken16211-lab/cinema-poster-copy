import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCinemaMovies } from "../lib/cinema-data.js";

function page(shows) {
  const payload = `1:${JSON.stringify({ data: { shows } })}\n`;
  return `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
}
const show = id => ({ time: "2026-10-01T12:00:00Z", movie: { id }, published: true, hold: false, id });
const movie = (id, synopsisZh = "") => ({ id, titleZh: `Movie ${id}`, titleEn: `Movie ${id}`, synopsisZh, synopsisEn: "", duration: "100" });

test("keeps films without synopses and handles reordered show fields without availability", () => {
  const result = parseCinemaMovies(page([show(1), show(2)]), new Map([[1, movie(1)], [2, movie(2)]]));
  assert.deepEqual(result.map(m => m.id), [1, 2]);
});

test("rejects missing movie details instead of silently dropping movies", () => {
  assert.throws(() => parseCinemaMovies(page([show(1)])), /Incomplete cinema movie details: 1/);
});

test("rejects queue pages and empty show lists", () => {
  assert.throws(() => parseCinemaMovies("<html>Queue</html>"), /no show list/);
  assert.throws(() => parseCinemaMovies(page([])), /no published movies/);
});

test("does not merge distinct films sharing a long synopsis prefix", () => {
  const prefix = "a".repeat(300);
  const result = parseCinemaMovies(page([show(1), show(2)]), new Map([[1, movie(1, prefix + "one")], [2, movie(2, prefix + "two")]]));
  assert.equal(result.length, 2);
});

test("records every source ID when grouping identical versions", () => {
  const result = parseCinemaMovies(page([show(1), show(2)]), new Map([[1, movie(1, "same")], [2, movie(2, "same")]]));
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sourceMovieIds, [1, 2]);
});
