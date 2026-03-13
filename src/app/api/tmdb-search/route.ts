import { NextRequest, NextResponse } from "next/server";

type TMDBMovieResult = {
  title: string;
  releaseYear: string | null;
  posterUrl: string | null;
  genre: string | null;
  overview: string | null;
};

async function fetchGenreMap(apiKey: string) {
  const url = new URL("https://api.themoviedb.org/3/genre/movie/list");
  url.searchParams.set("api_key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return new Map<number, string>();
  const json = await res.json();
  const genres: { id: number; name: string }[] = Array.isArray(json.genres)
    ? json.genres
    : [];
  return new Map(genres.map((g) => [g.id, g.name]));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] satisfies TMDBMovieResult[] });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
  searchUrl.searchParams.set("api_key", apiKey);
  searchUrl.searchParams.set("query", query);

  try {
    const [searchRes, genreMap] = await Promise.all([
      fetch(searchUrl.toString()),
      fetchGenreMap(apiKey),
    ]);

    if (!searchRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from TMDB" },
        { status: 502 },
      );
    }

    const searchJson = await searchRes.json();
    const rawResults = Array.isArray(searchJson.results) ? searchJson.results : [];

    const results: TMDBMovieResult[] = rawResults.slice(0, 5).map((r: any) => {
      const title: string = typeof r?.title === "string" ? r.title : "";
      const releaseDate: string | null =
        typeof r?.release_date === "string" ? r.release_date : null;
      const releaseYear =
        releaseDate && releaseDate.length >= 4 ? releaseDate.slice(0, 4) : null;

      const posterUrl =
        typeof r?.poster_path === "string" && r.poster_path
          ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
          : null;

      const overview =
        typeof r?.overview === "string" && r.overview.trim()
          ? r.overview.trim()
          : null;

      const genreIds: number[] = Array.isArray(r?.genre_ids) ? r.genre_ids : [];
      const names = genreIds
        .map((id) => genreMap.get(id))
        .filter(Boolean) as string[];
      const genre = names.length > 0 ? names.join(", ") : null;

      return { title, releaseYear, posterUrl, genre, overview };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB search error", error);
    return NextResponse.json(
      { error: "Unexpected error fetching from TMDB" },
      { status: 500 },
    );
  }
}

