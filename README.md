# 電影簡介圖片卡

Static GitHub Pages tool for cinema.com.hk cinema 5.

Modes:

- `故事簡介圖片`: click one poster and export a bilingual 1080 x 1920 synopsis PNG.
- `優惠暫停`: select multiple posters, edit the top message area, and export a 1080 x 1920 notice PNG with the selected movies listed below.

## Local live mode

```bash
npm start
```

Open:

```text
http://localhost:4173
```

## Static data mode

```bash
npm run fetch:data
```

This writes:

- `public/data/movies-5.json`
- `public/data/posters/*`

GitHub Actions runs the same command and deploys `public/` to GitHub Pages.
