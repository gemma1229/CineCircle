import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");

  if (!title) {
    return NextResponse.json(
      { error: "Missing title parameter" },
      { status: 400 },
    );
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
  searchUrl.searchParams.set("query", title);

  try {
    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from TMDB" },
        { status: 502 },
      );
    }

    const searchData = await searchRes.json();
    const results = Array.isArray(searchData.results) ? searchData.results : [];
    const first = results[0];

    let posterUrl: string | null = null;
    let genre: string | null = null;
    let year: string | null = null;
    let rating: number | null = null;
    let overview: string | null = null;

    if (first) {
      if (first.poster_path) {
        const posterPath: string = first.poster_path;
        posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
      }

      if (first.release_date && typeof first.release_date === "string") {
        const releaseYear = first.release_date.slice(0, 4);
        if (releaseYear) year = releaseYear;
      }
      if (typeof first.vote_average === "number") {
        rating = first.vote_average;
      }
      if (typeof first.overview === "string" && first.overview.trim()) {
        overview = first.overview.trim();
      }

      const genreIds = Array.isArray(first.genre_ids) ? first.genre_ids : [];
      if (genreIds.length > 0) {
        const listUrl = new URL(
          "https://api.themoviedb.org/3/genre/movie/list",
        );
        listUrl.searchParams.set("api_key", apiKey);
        const listRes = await fetch(listUrl.toString());
        if (listRes.ok) {
          const listData = await listRes.json();
          const genres: { id: number; name: string }[] = Array.isArray(
            listData.genres,
          )
            ? listData.genres
            : [];
          const idToName = new Map(genres.map((g) => [g.id, g.name]));
          const names = genreIds
            .map((id: number) => idToName.get(id))
            .filter(Boolean) as string[];
          if (names.length > 0) {
            genre = names.join(", ");
          }
        }
      }
    }

    return NextResponse.json({
      posterUrl,
      genre,
      year,
      rating,
      overview,
    });
  } catch (error) {
    console.error("TMDB fetch error", error);
    return NextResponse.json(
      { error: "Unexpected error fetching from TMDB" },
      { status: 500 },
    );
  }
}

