"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import db from "../../../lib/db";
import { CommentSection, Comment } from "../../../components/CommentSection";
import { Movie } from "../../../components/MovieCard";
import { id } from "@instantdb/react";

type TMDBDetails = {
  year: string | null;
  rating: number | null;
  overview: string | null;
};

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const movieId = params.id;
  const [tmdbDetails, setTmdbDetails] = useState<TMDBDetails | null>(null);

  const { isLoading: authLoading, user } = db.useAuth();
  const { isLoading, error, data } = db.useQuery({
    movies: {
      $: {
        where: {
          id: movieId,
        },
      },
    },
    comments: {
      $: {
        where: {
          movieId,
        },
      },
    },
    votes: {
      $: {
        where: {
          movieId,
        },
      },
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const movieTitle = (data?.movies?.[0] as Movie | undefined)?.title ?? null;
  useEffect(() => {
    if (!movieTitle) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ title: movieTitle });
        const res = await fetch(`/api/tmdb-poster?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          year?: string | null;
          rating?: number | null;
          overview?: string | null;
        };
        if (cancelled) return;
        setTmdbDetails({
          year: json.year ?? null,
          rating: json.rating ?? null,
          overview: json.overview ?? null,
        });
      } catch {
        if (!cancelled) setTmdbDetails(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movieTitle]);

  const movie = (data?.movies?.[0] ?? null) as Movie | null;
  const comments = (data?.comments ?? []) as Comment[];
  const votes = (data?.votes ?? []) as {
    id: string;
    movieId: string;
    voterEmail: string;
    createdAt: number;
  }[];

  const voteCount = votes.length;
  const voterEmails = useMemo(() => {
    const set = new Set<string>();
    for (const v of votes) {
      if (typeof v.voterEmail === "string" && v.voterEmail) set.add(v.voterEmail);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [votes]);

  const myVote = user?.email
    ? votes.find((v) => v.voterEmail === user.email) ?? null
    : null;

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
          Loading movie details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
        We couldn’t load this movie right now. Please try again in a moment.
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-200">
        We couldn’t find this movie. It may have been removed.
      </div>
    );
  }

  const isWatched = movie.status === "watched";

  async function handleToggleVote() {
    try {
      if (!user?.email || !movie) return;
      if (myVote) {
        await db.transact(db.tx.votes[myVote.id].delete());
      } else {
        await db.transact(
          db.tx.votes[id()].update({
            movieId: movie!.id,
            voterEmail: user.email,
            createdAt: Date.now(),
          }),
        );
      }
    } catch (err) {
      console.error(err);
      alert("We couldn’t update your vote. Please try again.");
    }
  }

  async function handleToggleWatched() {
    try {
      if (!movie) return;
      const nextStatus = isWatched ? "planned" : "watched";
      await db.transact(
        db.tx.movies[movie.id].update({
          status: nextStatus,
        }),
      );
    } catch (err) {
      console.error(err);
      alert("We couldn’t update this movie. Please try again.");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-1 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-100 hover:underline"
        >
          ← Back to movie wall
        </button>

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 shadow-xl">
          <div className="grid gap-0 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500">
              {movie.posterUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${movie.posterUrl})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium uppercase tracking-wide text-zinc-200">
                  CineCircle
                </div>
              )}
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                {isWatched ? "Watched" : "Planned"}
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-zinc-800/80 p-4 md:border-l md:border-t-0 md:p-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                  Suggestion
                </p>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                  {movie.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                  {movie.genre && <span>{movie.genre}</span>}
                  {tmdbDetails?.year && (
                    <>
                      {movie.genre && <span>·</span>}
                      <span>{tmdbDetails.year}</span>
                    </>
                  )}
                  {tmdbDetails?.rating != null && (
                    <>
                      {(movie.genre || tmdbDetails?.year) && <span>·</span>}
                      <span>★ {tmdbDetails.rating.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </div>
              {tmdbDetails?.overview && (
                <p className="text-sm leading-relaxed text-zinc-300">
                  {tmdbDetails.overview}
                </p>
              )}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleVote}
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                >
                  {myVote ? "Voted 👍" : "Vote 👍"}
                </button>
                <span className="text-xs font-medium text-zinc-400">
                  👍 {voteCount} vote{voteCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={handleToggleWatched}
                  className={
                    isWatched
                      ? "inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-emerald-400"
                      : "inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-800"
                  }
                >
                  {isWatched ? "✓ Watched" : "Mark as watched"}
                </button>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Voted by
                </p>
                {voterEmails.length === 0 ? (
                  <p className="mt-1 text-xs text-zinc-400">No votes yet</p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-300">
                    {voterEmails.join(" · ")}
                  </p>
                )}
              </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                Tip: After you watch the movie, come back here to leave quick
                reactions or notes about how the night went.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CommentSection
        movieId={movie.id}
        comments={comments}
        userEmail={user.email ?? null}
      />
    </div>
  );
}

