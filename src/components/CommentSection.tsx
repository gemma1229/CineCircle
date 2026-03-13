"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import db from "../lib/db";
import { id } from "@instantdb/react";

export type Comment = {
  id: string;
  movieId: string;
  text: string;
  createdAt: number;
  authorEmail?: string | null;
};

type Props = {
  movieId: string;
  comments: Comment[];
  userEmail: string | null;
};

function formatCommentTime(createdAt: number, nowMs: number) {
  const diffMs = Math.max(0, nowMs - createdAt);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMs < 60000) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const dtf = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return dtf.format(new Date(createdAt));
}

export function CommentSection({ movieId, comments, userEmail }: Props) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await db.transact(
        db.tx.comments[id()].update({
          movieId,
          text: text.trim(),
          createdAt: Date.now(),
          authorEmail: userEmail ?? undefined,
        }),
      );
      setText("");
    } catch (err) {
      console.error(err);
      setError("Could not add your comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(comment: Comment) {
    if (
      userEmail == null ||
      comment.authorEmail == null ||
      comment.authorEmail !== userEmail
    ) {
      return;
    }
    try {
      await db.transact(db.tx.comments[comment.id].delete());
    } catch (err) {
      console.error(err);
      setError("Could not delete the comment. Please try again.");
    }
  }

  const sorted = useMemo(
    () => [...comments].sort((a, b) => a.createdAt - b.createdAt),
    [comments],
  );

  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Discussion
      </h2>
      {sorted.length === 0 ? (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          No comments yet. Be the first to share why this would be a great pick for
          your next movie night.
        </p>
      ) : (
        <ul className="mb-3 space-y-2 text-xs">
          {sorted.map((comment) => {
            const canDelete =
              userEmail != null &&
              comment.authorEmail != null &&
              comment.authorEmail === userEmail;
            return (
              <li
                key={comment.id}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-zinc-800 dark:text-zinc-100">
                  {comment.text}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>{comment.authorEmail ?? "Anonymous"}</span>
                  <div className="flex items-center gap-2">
                    <span>
                      {formatCommentTime(comment.createdAt, nowMs)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment)}
                        className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="mb-2 text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          className="min-h-[100px] max-h-[120px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-amber-400 dark:focus:ring-amber-300/30"
          placeholder="Why should your circle watch this movie?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Posting..." : "Post comment"}
        </button>
      </form>
    </section>
  );
}

