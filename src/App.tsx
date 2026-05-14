import { useEffect, useMemo, useState } from 'react';

type Movie = {
  id?: number;
  title: string;
  year: number;
  rating: string;
  genre: string[];
  mood: string;
  summary: string;
  poster: string;
};

type DetailMovie = Movie & {
  runtime: number | null;
  homepage?: string;
  tagline?: string;
  trailerKey?: string | null;
  watchProviders?: string[];
  watchLocation?: string;
  genres: string[];
};

const moodOptions = ['All'];
const defaultPoster = 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=800&q=80';

function App() {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [apiMovies, setApiMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [genreOptions, setGenreOptions] = useState<string[]>(['All']);
  const [apiGenreMap, setApiGenreMap] = useState<Record<number, string>>({});
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [detailMovie, setDetailMovie] = useState<DetailMovie | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newReleasesID, setNewReleasesID] = useState<Movie[]>([]);
  const [newReleasesGlobal, setNewReleasesGlobal] = useState<Movie[]>([]);
  const [upcomingID, setUpcomingID] = useState<Movie[]>([]);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [gachaMovie, setGachaMovie] = useState<Movie | null>(null);
  const [gachaLoading, setGachaLoading] = useState(false);

  const apiKey = import.meta.env.VITE_TMDB_API_KEY;

  const mapTmdbMovie = (item: any, mood: string = 'Indonesia') => ({
    id: item.id,
    title: item.title || 'Unknown Title',
    year: Number(item.release_date?.slice(0, 4)) || 0,
    rating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
    genre: item.genre_ids?.map((id: number) => apiGenreMap[id]).filter(Boolean) as string[] || ['Film'],
    mood: mood,
    summary: item.overview || 'Tanpa deskripsi.',
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : defaultPoster
  });

  useEffect(() => {
    if (!apiKey) return;

    const fetchGenres = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`
        );

        if (!response.ok) {
          throw new Error('Gagal memuat daftar genre TMDB.');
        }

        const data = await response.json();
        const genres = data.genres ?? [];
        const genreMap: Record<number, string> = {};

        genres.forEach((item: any) => {
          genreMap[item.id] = item.name;
        });

        setApiGenreMap(genreMap);
        setGenreOptions(Array.from(new Set(['All', ...genres.map((item: any) => item.name)])));
      } catch (error) {
        console.error(error);
      }
    };

    fetchGenres();
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) {
      setNewReleasesID([]);
      setNewReleasesGlobal([]);
      setReleaseError(null);
      setReleaseLoading(false);
      return;
    }

    const fetchNewReleases = async () => {
      setReleaseLoading(true);
      setReleaseError(null);

      try {
        // Menggunakan discover endpoint untuk film yang tersedia di Indonesia
        const [idRes, globalRes, upcomingRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&region=ID&release_date.gte=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&release_date.lte=${new Date().toISOString().split('T')[0]}&watch_region=ID&with_watch_monetization_types=flatrate&with_origin_country=ID&sort_by=release_date.desc&page=1`),
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&region=US&release_date.gte=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&release_date.lte=${new Date().toISOString().split('T')[0]}&watch_region=ID&with_watch_monetization_types=flatrate&sort_by=release_date.desc&page=1`),
          fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&region=ID&release_date.gte=${new Date().toISOString().split('T')[0]}&primary_release_date.gte=${new Date().toISOString().split('T')[0]}&watch_region=ID&with_watch_monetization_types=flatrate&with_origin_country=ID&sort_by=primary_release_date.asc&page=1`)
        ]);

        if (!idRes.ok || !globalRes.ok || !upcomingRes.ok) {
          throw new Error('Gagal memuat daftar rilis terbaru.');
        }

        const [idData, globalData, upcomingData] = await Promise.all([idRes.json(), globalRes.json(), upcomingRes.json()]);
        setNewReleasesID((idData.results ?? []).slice(0, 6).map((item: any) => mapTmdbMovie(item, 'Indonesia')));
        setNewReleasesGlobal((globalData.results ?? []).slice(0, 6).map((item: any) => mapTmdbMovie(item, 'Indonesia')));
        setUpcomingID((upcomingData.results ?? []).slice(0, 6).map((item: any) => mapTmdbMovie(item, 'Indonesia')));
      } catch (error) {
        setReleaseError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat rilis terbaru.');
        setNewReleasesID([]);
        setNewReleasesGlobal([]);
        setUpcomingID([]);
      } finally {
        setReleaseLoading(false);
      }
    };

    fetchNewReleases();
  }, [apiKey, apiGenreMap]);

  const filteredApiMovies = useMemo(
    () =>
      apiMovies.filter((movie) => {
        const matchesGenre = genre === 'All' || movie.genre.includes(genre);
        return matchesGenre;
      }),
    [apiMovies, genre]
  );

  const activeMovies = filteredApiMovies;

  const apiMoviePool = useMemo(() => {
    const fullPool = [...newReleasesID, ...newReleasesGlobal, ...upcomingID, ...apiMovies];
    return fullPool.filter((movie, index, self) =>
      self.findIndex((item) =>
        item.id && movie.id ? item.id === movie.id : item.title === movie.title
      ) === index
    );
  }, [newReleasesID, newReleasesGlobal, upcomingID, apiMovies]);

  const latestCount = apiMoviePool.length;

  const averageRating = useMemo(() => {
    const ratings = apiMoviePool
      .map((movie) => parseFloat(movie.rating))
      .filter((value) => !Number.isNaN(value));

    if (ratings.length === 0) {
      return 'N/A';
    }

    return (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1);
  }, [apiMoviePool]);

  const featuredGenre = useMemo(() => {
    const genreCount: Record<string, number> = {};

    apiMoviePool.forEach((movie) => {
      movie.genre.forEach((item) => {
        if (!item) return;
        genreCount[item] = (genreCount[item] ?? 0) + 1;
      });
    });

    const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
    return sortedGenres[0]?.[0] ?? 'Global';
  }, [apiMoviePool]);

  const handleGacha = () => {
    const uniquePool = apiMoviePool.filter((movie, index, self) =>
      self.findIndex((item) => item.title === movie.title) === index
    );

    if (uniquePool.length === 0) {
      return;
    }

    setGachaLoading(true);
    setTimeout(() => {
      const choice = uniquePool[Math.floor(Math.random() * uniquePool.length)];
      setGachaMovie(choice);
      setGachaLoading(false);
    }, 220);
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      setApiMovies([]);
      setApiError(null);
      return;
    }

    if (!apiKey) {
      setApiError('Tambahkan VITE_TMDB_API_KEY di file .env untuk pencarian film dunia nyata.');
      return;
    }

    setLoading(true);
    setApiError(null);
    setApiMovies([]);

    try {
      // Menggunakan discover endpoint dengan filter film Indonesia
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(
          search
        )}&watch_region=ID&with_watch_monetization_types=flatrate&with_origin_country=ID&include_adult=false&page=1`
      );

      if (!response.ok) {
        throw new Error('Gagal memuat data dari TMDB');
      }

      const data = await response.json();
      setApiMovies(
        (data.results ?? [])
          .slice(0, 12)
          .map((item: any) => mapTmdbMovie(item, 'Indonesia'))
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Terjadi kesalahan jaringan.');
      setApiMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (movie: Movie) => {
    setSelectedMovie(movie);
    setDetailMovie(null);
    setDetailLoading(true);

    if (!movie.id || !apiKey) {
      setDetailLoading(false);
      return;
    }

    try {
      const [detailRes, videoRes, providerRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&language=en-US`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${apiKey}&language=en-US`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${apiKey}`)
      ]);

      if (!detailRes.ok || !videoRes.ok || !providerRes.ok) {
        throw new Error('Tidak dapat memuat detail film.');
      }

      const detailData = await detailRes.json();
      const videoData = await videoRes.json();
      const providerData = await providerRes.json();
      const videos = videoData.results ?? [];
      const trailer = videos.find(
        (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
      ) || videos.find((video: any) => video.type === 'Teaser' && video.site === 'YouTube') || videos.find(
        (video: any) => video.site === 'YouTube'
      );

      const providerResults = providerData.results ?? {};
      const regionKey = providerResults.ID ? 'ID' : providerResults.US ? 'US' : Object.keys(providerResults)[0];
      const regionProviders = regionKey ? providerResults[regionKey] : null;
      const providerList = regionProviders
        ? [
            ...(regionProviders.flatrate || []),
            ...(regionProviders.buy || []),
            ...(regionProviders.rent || [])
          ].map((item: any) => item.provider_name)
        : [];

      setDetailMovie({
        id: movie.id,
        title: detailData.title || movie.title,
        year: Number(detailData.release_date?.slice(0, 4)) || movie.year,
        rating: detailData.vote_average ? detailData.vote_average.toFixed(1) : movie.rating,
        genre: detailData.genres?.map((item: any) => item.name) || movie.genre,
        genres: detailData.genres?.map((item: any) => item.name) || movie.genre,
        mood: movie.mood,
        summary: detailData.overview || movie.summary,
        poster: detailData.poster_path
          ? `https://image.tmdb.org/t/p/w780${detailData.poster_path}`
          : movie.poster,
        runtime: detailData.runtime || null,
        homepage: detailData.homepage || undefined,
        tagline: detailData.tagline || undefined,
        trailerKey: trailer?.key || null,
        watchProviders: Array.from(new Set(providerList)).slice(0, 5),
        watchLocation: regionKey || 'Global'
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat detail film.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedMovie(null);
    setDetailMovie(null);
    setApiError(null);
  };

  return (
    <div className="page-shell">
      <header className="hero-panel">
        <div>
          <span className="eyebrow"></span>
          <h1>NontonApa</h1>
          <p className="hero-copy">
            Website Untuk Kamu Yang Bingung Mau Nonton Apa.
          </p>
        </div>
        <div className="hero-actions">
          <div className="stat-card">
            <span>Terbaru</span>
            <strong>{latestCount} Film</strong>
          </div>
          <div className="stat-card highlight">
            <span>Rata-rata Rating</span>
            <strong>{averageRating}</strong>
          </div>
          <div className="stat-card">
            <span>Genre Unggulan</span>
            <strong>{featuredGenre}</strong>
          </div>
        </div>
      </header>

      <section className="search-panel">
        <div className="search-bar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari film, genre, atau suasana..."
          />
          <button type="button" onClick={handleSearch} disabled={loading}>
            {loading ? 'Memuat...' : 'Cari'}
          </button>
        </div>

        <div className="api-meta">
          {apiKey ? (
            <span>Mencari film Indonesia yang tersedia di platform streaming lokal.</span>
          ) : (
            <span className="warning">
              Tidak ada API key TMDB. Gunakan hasil lokal atau isi `VITE_TMDB_API_KEY` di `.env`.
            </span>
          )}
          {apiError && <span className="error">{apiError}</span>}
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Genre</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              {genreOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="gacha-row">
          <button className="gacha-button" type="button" onClick={handleGacha} disabled={gachaLoading}>
            {gachaLoading ? 'Sedang memilih...' : 'Klik untuk mendapatkan rekomendasi film hari ini'}
          </button>
        </div>

        {gachaMovie && (
          <div className="gacha-result">
            <div className="gacha-badge">Rekomendasi Hari Ini</div>
            <div className="gacha-card">
              <div className="gacha-cover" style={{ backgroundImage: `url(${gachaMovie.poster})` }} />
              <div className="gacha-copy">
                <h3>{gachaMovie.title}</h3>
                <p>{gachaMovie.summary}</p>
                <div className="gacha-meta">
                  <span>{gachaMovie.year}</span>
                  <span>{gachaMovie.rating} ⭐</span>
                  <span>{gachaMovie.genre.join(' · ')}</span>
                </div>
                <button className="detail-button" type="button" onClick={() => handleOpenDetail(gachaMovie)}>
                  Buka Detail
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="movie-grid">
        {activeMovies.length > 0 ? (
          activeMovies.map((movie) => (
            <article key={`${movie.title}-${movie.year}-${movie.rating}`} className="movie-card">
              <div className="poster" style={{ backgroundImage: `url(${movie.poster})` }} />
              <div className="movie-body">
                <div className="movie-tag">
                  <span>{movie.year}</span>
                  <strong>{movie.rating}</strong>
                </div>
                <h2>{movie.title}</h2>
                <p>{movie.summary}</p>
                <div className="chips">
                  {movie.genre.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <button className="detail-button" onClick={() => handleOpenDetail(movie)}>
                  Detail Film
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>Tidak ada hasil</h2>
            <p>Coba ubah kata kunci atau pilih genre/suasana lain untuk menemukan film yang cocok.</p>
          </div>
        )}
      </section>

      <section className="release-panel">
        <div className="release-header-row">
          <div>
            <span className="eyebrow">Baru Rilis</span>
            <h2>Film Indonesia Terbaru</h2>
            <p>Film-film Indonesia terbaru yang sedang tayang dan tersedia di platform streaming lokal.</p>
          </div>
        </div>
        <div className="release-grid">
          {apiKey ? (
            releaseLoading && newReleasesID.length === 0 ? (
              <div className="release-empty">Memuat rilis Indonesia...</div>
            ) : newReleasesID.length > 0 ? (
              newReleasesID.map((movie) => (
                <article key={`id-${movie.id}-${movie.title}`} className="release-card" onClick={() => handleOpenDetail(movie)}>
                  <div className="release-cover" style={{ backgroundImage: `url(${movie.poster})` }} />
                  <div className="release-copy">
                    <strong>{movie.title}</strong>
                    <span>{movie.year} · {movie.genre.join(' · ') || 'Film'}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="release-empty">Tidak ada data rilis Indonesia yang tersedia untuk streaming.</div>
            )
          ) : (
            <div className="release-empty">Isi API key TMDB untuk melihat rilis Indonesia terbaru yang tersedia untuk streaming.</div>
          )}
        </div>
      </section>

      <section className="release-panel">
        <div className="release-header-row">
          <div>
            <span className="eyebrow">Akan Rilis</span>
            <h2>Film Indonesia Mendatang</h2>
            <p>Film-film Indonesia mendatang yang akan segera tayang dan tersedia di platform streaming lokal.</p>
          </div>
        </div>
        <div className="release-grid">
          {apiKey ? (
            releaseLoading && upcomingID.length === 0 ? (
              <div className="release-empty">Memuat film yang akan rilis...</div>
            ) : upcomingID.length > 0 ? (
              upcomingID.map((movie) => (
                <article key={`upcoming-${movie.id}-${movie.title}`} className="release-card" onClick={() => handleOpenDetail(movie)}>
                  <div className="release-cover" style={{ backgroundImage: `url(${movie.poster})` }} />
                  <div className="release-copy">
                    <strong>{movie.title}</strong>
                    <span>{movie.year} · {movie.genre.join(' · ') || 'Film'}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="release-empty">Tidak ada data film yang akan rilis dan tersedia untuk streaming di Indonesia.</div>
            )
          ) : (
            <div className="release-empty">Isi API key TMDB untuk melihat jadwal rilis Indonesia yang tersedia untuk streaming.</div>
          )}
        </div>
      </section>

      <section className="release-panel">
        <div className="release-header-row">
          <div>
            <span className="eyebrow">Baru Rilis</span>
            <h2>Rilis terbaru Global</h2>
            <p>Rilis internasional terbaru yang tersedia di platform streaming Indonesia.</p>
          </div>
        </div>
        <div className="release-grid">
          {apiKey ? (
            releaseLoading && newReleasesGlobal.length === 0 ? (
              <div className="release-empty">Memuat rilis global...</div>
            ) : newReleasesGlobal.length > 0 ? (
              newReleasesGlobal.map((movie) => (
                <article key={`global-${movie.id}-${movie.title}`} className="release-card" onClick={() => handleOpenDetail(movie)}>
                  <div className="release-cover" style={{ backgroundImage: `url(${movie.poster})` }} />
                  <div className="release-copy">
                    <strong>{movie.title}</strong>
                    <span>{movie.year} · {movie.genre.join(' · ') || 'Film'}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="release-empty">Tidak ada data rilis global yang tersedia untuk streaming di Indonesia.</div>
            )
          ) : (
            <div className="release-empty">Isi API key TMDB untuk melihat rilis global terbaru yang tersedia untuk streaming di Indonesia.</div>
          )}
        </div>
      </section>

      {selectedMovie && (
        <div className="detail-modal-backdrop" onClick={closeDetail}>
          <aside className="detail-panel" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={closeDetail}>
              ×
            </button>
            <div className="detail-header">
              <div className="detail-cover" style={{ backgroundImage: `url(${detailMovie?.poster ?? selectedMovie.poster})` }} />
              <div className="detail-copy">
                <span className="detail-badge">{detailMovie?.genres.join(' · ') || selectedMovie.genre.join(' · ')}</span>
                <h2>{detailMovie?.title ?? selectedMovie.title}</h2>
                {detailMovie?.tagline && <p className="detail-tagline">{detailMovie.tagline}</p>}
                <div className="detail-meta">
                  <span>{detailMovie?.year ?? selectedMovie.year}</span>
                  <span>{detailMovie?.runtime ? `${detailMovie.runtime}m` : ''}</span>
                  <span>{detailMovie?.rating ?? selectedMovie.rating} ⭐</span>
                </div>
                {detailMovie?.watchProviders && detailMovie.watchProviders.length > 0 ? (
                  <div className="detail-watch">
                    <strong>Tersedia di {detailMovie.watchLocation}</strong>
                    <span>{detailMovie.watchProviders.join(' · ')}</span>
                  </div>
                ) : (
                  <div className="detail-watch detail-watch-empty">Informasi tayang belum tersedia.</div>
                )}
                <p>{detailMovie?.summary ?? selectedMovie.summary}</p>
                {detailMovie?.homepage && (
                  <a href={detailMovie.homepage} target="_blank" rel="noreferrer" className="detail-link">
                    Buka halaman resmi
                  </a>
                )}
              </div>
            </div>

            {detailLoading ? (
              <div className="detail-loading">Memuat detail film...</div>
            ) : detailMovie?.trailerKey ? (
              <div>
                <span className="detail-trailer-label">Trailer Resmi</span>
                <div className="trailer-wrapper">
                  <iframe
                    src={`https://www.youtube.com/embed/${detailMovie.trailerKey}?rel=0&showinfo=0`}
                    title="Trailer Film"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="detail-no-trailer">Trailer belum tersedia untuk film ini.</div>
            )}
          </aside>
        </div>
      )}

      <footer className="site-footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} NontonApa. Dibuat dengan ❤️ untuk para pecinta film.</p>
          <p>Data film disediakan oleh <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">The Movie Database (TMDB)</a></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
