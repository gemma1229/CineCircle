"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import db from "../lib/db";
import { id } from "@instantdb/react";

type Props = {
  userEmail: string | null;
};

type TMDBMovieData = {
  posterUrl: string | null;
  genre: string | null;
};

async function fetchMovieDataFromTMDB(title: string): Promise<TMDBMovieData> {
  try {
    const params = new URLSearchParams({ title });
    const res = await fetch(`/api/tmdb-poster?${params.toString()}`);
    if (!res.ok) {
      return { posterUrl: null, genre: null };
    }
    const data = (await res.json()) as {
      posterUrl?: string | null;
      genre?: string | null;
    };
    const posterUrl =
      typeof data.posterUrl === "string" && data.posterUrl.length > 0
        ? data.posterUrl
        : null;
    const genre =
      typeof data.genre === "string" && data.genre.length > 0 ? data.genre : null;
    return { posterUrl, genre };
  } catch (error) {
    console.error("Failed to fetch movie data from TMDB", error);
    return { posterUrl: null, genre: null };
  }
}

type TMDBSuggestion = {
  title: string;
  releaseYear: string | null;
  posterUrl: string | null;
  genre: string | null;
  overview: string | null;
};

export function AddMovieForm({ userEmail }: Props) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TMDBSuggestion[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<TMDBSuggestion | null>(null);
  const latestQueryRef = useRef("");

  const query = title.trim();
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    // If the user edits the title after selecting, clear selection.
    if (selectedSuggestion && selectedSuggestion.title !== title.trim()) {
      setSelectedSuggestion(null);
    }
  }, [title, selectedSuggestion]);

  useEffect(() => {
    const q = debouncedQuery;
    if (q.length < 2) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }

    latestQueryRef.current = q;
    const ac = new AbortController();

    (async () => {
      try {
        const params = new URLSearchParams({ query: q });
        const res = await fetch(`/api/tmdb-search?${params.toString()}`, {
          signal: ac.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { results?: TMDBSuggestion[] };
        if (latestQueryRef.current !== q) return;
        const results = Array.isArray(json.results) ? json.results : [];
        setSuggestions(results);
        setIsSuggestOpen(results.length > 0);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setSuggestions([]);
        setIsSuggestOpen(false);
      }
    })();

    return () => ac.abort();
  }, [debouncedQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please add a movie title.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const manualGenre = genre.trim() || null;
      const trimmedTitle = title.trim();

      const picked =
        selectedSuggestion && selectedSuggestion.title === trimmedTitle
          ? selectedSuggestion
          : null;

      const data = picked
        ? { posterUrl: picked.posterUrl, genre: picked.genre }
        : await fetchMovieDataFromTMDB(trimmedTitle);

      const finalPosterUrl = data.posterUrl;
      const finalGenre = manualGenre ?? data.genre ?? "";

      await db.transact(
        db.tx.movies[id()].update({
          title: trimmedTitle,
          genre: finalGenre,
          posterUrl: finalPosterUrl ?? null,
          voteCount: 0,
          status: "planned",
          createdAt: Date.now(),
          createdByEmail: userEmail ?? undefined,
        }),
      );
      setTitle("");
      setGenre("");
      setSelectedSuggestion(null);
      setSuggestions([]);
      setIsSuggestOpen(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while adding your movie. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const suggestionItems = useMemo(() => {
    return suggestions
      .filter((s) => s.title)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        label: `${s.title}${s.releaseYear ? ` (${s.releaseYear})` : ""}`,
      }));
  }, [suggestions]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90"
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Add a movie to your circle
      </h2>
      {error && (
        <p className="text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="relative flex-1 space-y-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Movie
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-amber-400 dark:focus:ring-amber-300/30"
            placeholder="Movie"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => {
              if (suggestionItems.length > 0) setIsSuggestOpen(true);
            }}
            onBlur={() => {
              // Allow click to register before closing.
              window.setTimeout(() => setIsSuggestOpen(false), 120);
            }}
          />
          {isSuggestOpen && suggestionItems.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-xl">
              <ul className="max-h-64 overflow-auto py-1 text-sm">
                {suggestionItems.map((s) => (
                  <li key={`${s.title}-${s.releaseYear ?? "na"}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setTitle(s.title);
                        if (!genre.trim() && s.genre) {
                          setGenre(s.genre);
                        }
                        setSelectedSuggestion(s);
                        setIsSuggestOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-zinc-100 hover:bg-zinc-800"
                    >
                      <span className="truncate">{s.title}</span>
                      {s.releaseYear && (
                        <span className="shrink-0 text-xs text-zinc-400">
                          {s.releaseYear}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Genre (optional)
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-amber-400 dark:focus:ring-amber-300/30"
            placeholder="Genre (optional)"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Adding..." : "Add movie"}
      </button>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Everyone in your circle will see new movies here. Start with 1–2 ideas and
        let your friends vote.
      </p>
    </form>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

