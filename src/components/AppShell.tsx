"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import db from "../lib/db";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, user, error } = db.useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
        <div className="animate-pulse rounded-2xl border border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          Loading your CineCircle...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-md rounded-2xl border border-red-500/40 bg-red-950/40 px-6 py-4 text-sm">
          <h1 className="mb-2 text-base font-semibold text-red-300">
            Something went wrong
          </h1>
          <p className="text-sm text-red-100">{error.message}</p>
        </div>
      </div>
    );
  }

  const isOnLogin = pathname === "/login";

  async function handleSignOut() {
    await db.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-50">
      <header className="border-b border-zinc-800/70 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-zinc-950 shadow-sm">
              CC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                CineCircle
              </span>
              <span className="text-[11px] text-zinc-400">
                Decide what to watch together
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {user && !isOnLogin && (
              <p className="hidden text-xs text-zinc-400 sm:block">
                Signed in as{" "}
                <span className="font-medium text-zinc-200">
                  {user.email ?? "movie fan"}
                </span>
              </p>
            )}
            {user && !isOnLogin && (
              <button
                onClick={handleSignOut}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

