# 電影簡介圖片卡

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
