"use client";

import Link from "next/link";
import db from "../lib/db";
import { AddMovieForm } from "../components/AddMovieForm";
import { MovieCard, Movie } from "../components/MovieCard";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SortOption = "votes" | "newest" | "title";
type StatusFilter = "all" | "planned" | "watched";

const MOVIES_PER_PAGE = 12;

export default function Home() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const { isLoading, error, data } = db.useQuery({
    movies: {},
    votes: {},
  });
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const movies: Movie[] = (data?.movies ?? []) as Movie[];
  const votes = (data?.votes ?? []) as { id: string; movieId: string; voterEmail: string; createdAt: number }[];

  const voteCountByMovieId = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of votes) {
      map.set(v.movieId, (map.get(v.movieId) ?? 0) + 1);
    }
    return map;
  }, [votes]);

  useEffect(() => {
    setPage(1);
  }, [sortBy, statusFilter]);

  const filteredMovies = useMemo(() => {
    if (statusFilter === "all") return movies;
    if (statusFilter === "watched") {
      return movies.filter((m) => m.status === "watched");
    }
    return movies.filter((m) => m.status !== "watched");
  }, [movies, statusFilter]);

  const sortedMovies = useMemo(() => {
    const copy = [...filteredMovies];
    if (sortBy === "votes") {
      copy.sort(
        (a, b) =>
          (voteCountByMovieId.get(b.id) ?? 0) -
            (voteCountByMovieId.get(a.id) ?? 0) ||
          b.createdAt - a.createdAt,
      );
    } else if (sortBy === "title") {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      copy.sort((a, b) => b.createdAt - a.createdAt);
    }
    return copy;
  }, [filteredMovies, sortBy, voteCountByMovieId]);

  const totalPages = Math.max(1, Math.ceil(sortedMovies.length / MOVIES_PER_PAGE));

  useEffect(() => {
    if (sortedMovies.length === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, sortedMovies.length]);

  const pagedMovies = useMemo(() => {
    const start = (page - 1) * MOVIES_PER_PAGE;
    return sortedMovies.slice(start, start + MOVIES_PER_PAGE);
  }, [page, sortedMovies]);

  const topPick =
    movies.length > 0
      ? movies.reduce<Movie | null>((best, current) => {
          const bestVotes = best ? voteCountByMovieId.get(best.id) ?? 0 : -1;
          const currentVotes = voteCountByMovieId.get(current.id) ?? 0;
          if (!best || currentVotes > bestVotes) return current;
          return best;
        }, null)
      : null;

  async function handleDelete(movie: Movie) {
    const confirmed = window.confirm("Delete this movie from the circle?");
    if (!confirmed) return;
    try {
      await db.transact(db.tx.movies[movie.id].delete());
    } catch (err) {
      console.error(err);
      alert("We couldn’t delete this movie. Please try again.");
    }
  }

  if (authLoading || (!user && typeof window !== "undefined")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse rounded-2xl border border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          Loading your CineCircle...
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse rounded-2xl border border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          Loading your movie wall...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
        We couldn’t load your movies right now. Please try again in a moment.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            🎬 YOUR MOVIE WALL
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-50 md:text-4xl lg:text-5xl max-w-3xl">
            Your circle decides the movie
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gray-400 md:text-lg">
            Add movie ideas, vote together, and turn the endless debate into movie
            night.
          </p>
        </div>
        <div className="w-full max-w-xs sm:w-80">
          <AddMovieForm userEmail={user?.email ?? null} />
        </div>
      </section>

      {sortedMovies.length === 0 ? (
        <section className="mt-2 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-10 text-center text-sm text-zinc-300">
          <p className="mb-2 text-base font-semibold text-zinc-50">
            {movies.length === 0
              ? "Your movie wall is empty (for now)"
              : "No movies match this filter"}
          </p>
          <p className="mb-4 max-w-md text-sm text-zinc-400">
            {movies.length === 0
              ? "Add your first movie to get the conversation started. Friends can join, vote, and comment as your wall grows."
              : "Try a different filter, or add another movie to keep your wall growing."}
          </p>
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector("form");
              form?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
          >
            Add your first movie
          </Link>
        </section>
      ) : (
        <section className="mt-2 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Shared movie wall
            </h2>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={
                    statusFilter === "all"
                      ? "rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
                  }
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("planned")}
                  className={
                    statusFilter === "planned"
                      ? "rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
                  }
                >
                  Planned
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("watched")}
                  className={
                    statusFilter === "watched"
                      ? "rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
                  }
                >
                  Watched
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs sm:justify-end">
                <p className="text-zinc-500">
                  {sortedMovies.length} movie
                  {sortedMovies.length === 1 ? "" : "s"} shown
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none ring-0 transition hover:border-zinc-500 focus:border-amber-400 focus:ring-amber-300/30"
                  >
                    <option value="votes">Most votes</option>
                    <option value="newest">Newest</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pagedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onDelete={handleDelete}
                voteCount={voteCountByMovieId.get(movie.id) ?? 0}
                isTopPick={Boolean(
                  topPick &&
                    topPick.id === movie.id &&
                    (voteCountByMovieId.get(movie.id) ?? 0) > 0,
                )}
              />
            ))}
          </div>

          {sortedMovies.length > MOVIES_PER_PAGE && (
            <nav className="mt-2 flex items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={
                    p === page
                      ? "rounded-full bg-amber-500 px-3 py-1 font-semibold text-white shadow-sm"
                      : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 font-semibold text-zinc-200 transition hover:border-zinc-500"
                  }
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}


