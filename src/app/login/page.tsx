"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import db from "../../lib/db";

export default function LoginPage() {
  const router = useRouter();
  const { isLoading, user, error: authError } = db.useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || (user && typeof window !== "undefined")) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse rounded-2xl border border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          Checking your session...
        </div>
      </div>
    );
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setMessage(null);
    setIsSending(true);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep("code");
      setMessage("We’ve sent a 6-digit code to your email. It usually arrives within a few seconds.");
    } catch (err) {
      console.error(err);
      setError("We couldn’t send a code. Please double-check your email and try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    setError(null);
    setMessage(null);
    setIsVerifying(true);
    try {
      await db.auth.signInWithMagicCode({
        email: email.trim(),
        code: code.trim(),
      });
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("That code didn’t work. Please check it and try again, or request a new one.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-zinc-800/60 bg-zinc-950/70 p-6 text-zinc-50 shadow-xl backdrop-blur-md sm:p-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Welcome to CineCircle
        </h1>
        <p className="text-sm text-zinc-400">
          Sign in with a one-time code. No passwords to remember—just your email.
        </p>
        {authError && (
          <p className="text-xs font-medium text-red-400" role="alert">
            {authError.message}
          </p>
        )}
      </div>

      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium text-zinc-300"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs font-medium text-red-400" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-xs text-zinc-400" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSending}
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSending ? "Sending code..." : "Send magic code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="code"
              className="text-xs font-medium text-zinc-300"
            >
              6-digit code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="tracking-[0.4em] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-lg font-semibold text-zinc-50 outline-none ring-0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30"
              placeholder="●●●●●●"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs font-medium text-red-400" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-xs text-zinc-400" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isVerifying}
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isVerifying ? "Signing you in..." : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
              setError(null);
            }}
            className="w-full text-center text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="text-[11px] leading-relaxed text-zinc-500">
        CineCircle is designed for small groups of friends. Share your login link,
        add a few movies, and let everyone vote on what to watch next.
      </p>
    </div>
  );
}

