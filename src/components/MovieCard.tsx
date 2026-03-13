import Link from "next/link";

export type Movie = {
  id: string;
  title: string;
  genre: string;
  posterUrl?: string | null;
  createdAt: number;
  status: string;
};

type Props = {
  movie: Movie;
  voteCount: number;
  onDelete?: (movie: Movie) => void;
  isTopPick?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  watched: "Watched",
};

export function MovieCard({ movie, voteCount, onDelete, isTopPick }: Props) {
  const statusLabel = STATUS_LABELS[movie.status] ?? movie.status;
  const isWatched = movie.status === "watched";

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(movie);
          }}
          className="absolute right-2 top-2 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-red-900/60 bg-black/70 text-xs font-bold text-red-200 opacity-0 shadow-sm transition hover:border-red-400 hover:bg-red-900/80 hover:text-red-100 group-hover:flex group-hover:opacity-100"
          aria-label="Delete movie"
        >
          ×
        </button>
      )}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500">
        {/* Poster image via CSS background to keep it simple without next/image configuration */}
        {movie.posterUrl ? (
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${movie.posterUrl})` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium uppercase tracking-wide text-zinc-200">
            CineCircle
          </div>
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
          {isTopPick && (
            <div className="w-fit rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
              ⭐ Top Pick
            </div>
          )}
          <div className="w-fit rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
            {isWatched ? "✔ Watched" : "📌 Planned"}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          👍 {voteCount}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 py-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {movie.title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {movie.genre || "Genre unknown"}
        </p>
      </div>
    </Link>
  );
}

