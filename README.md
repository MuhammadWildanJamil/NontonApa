# NontonApa

Website rekomendasi film modern dengan UI/UX bergaya 2026, dibuat menggunakan React + TypeScript + Vite.

## Menjalankan proyek

1. Jalankan `npm install`
2. Salin `.env.example` menjadi `.env`
3. Isi `VITE_TMDB_API_KEY` dengan API key TMDB Anda
4. Jalankan `npm run dev`
5. Buka alamat yang ditampilkan, biasanya `http://localhost:5173`

## Fitur

- Pencarian film lokal dan global
- Integrasi TMDB API untuk data film dunia nyata
- Seksi homepage baru: rilis terbaru Indonesia dan global
- Filter genre dari TMDB dan suasana lokal
- Detail film lengkap dari TMDB
- Trailer YouTube langsung dalam modal
- Desain interface modern dengan efek glassmorphism
- Responsif untuk desktop dan mobile

## API TMDB

1. Daftar di https://www.themoviedb.org/
2. Buka Settings > API > Create API Key
3. Masukkan key ke file `.env` sebagai `VITE_TMDB_API_KEY`
