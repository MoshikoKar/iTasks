"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { Particles } from "@/components/particles";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#ffffff");
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    setColor(resolvedTheme === "dark" ? "#ffffff" : "#000000");
  }, [resolvedTheme]);

  useEffect(() => {
    fetch("/api/branding")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.orgLogo && data.orgLogo.trim() !== '') {
          setCustomLogo(data.orgLogo);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch branding:", err);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Login failed");
        setLoading(false);
        return;
      }
      // Use full page reload to ensure server-side layout re-renders with auth state
      const redirectTo = searchParams.get("from") || "/";
      window.location.href = redirectTo;
    } catch {
      setError("Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={color}
        refresh
      />
      <div className="relative z-10 mx-auto w-full max-w-md rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 sm:p-5 shadow-sm">
        <div className="mb-2 flex flex-row items-center justify-center gap-3 sm:mb-3 sm:gap-4">
          <div className="relative h-9 w-auto sm:h-11">
            <Image
              src="/itasks_logo.png"
              alt="iTasks Logo"
              width={200}
              height={48}
              className="h-9 w-auto object-contain sm:h-11"
              priority
            />
          </div>
          {customLogo && (
            <div className="relative h-9 w-auto sm:h-11">
              <img
                src={customLogo}
                alt="Organization Logo"
                className="h-9 w-auto max-w-[160px] object-contain sm:h-11 sm:max-w-[180px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
        <h1 className="mb-2 text-center text-lg font-semibold text-slate-900 dark:text-neutral-100 sm:text-xl sm:mb-3">Sign in</h1>
        {error && <div className="mb-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs text-red-700 dark:text-red-400 sm:text-sm sm:py-2">{error}</div>}
        <form className="space-y-2.5 sm:space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300" htmlFor="email">
              Username / Email
            </label>
            <input
              id="email"
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:py-2.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email or domain\username"
              required
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              Supports: <code className="bg-slate-100 dark:bg-neutral-700 px-1 rounded text-slate-900 dark:text-neutral-100">username@domain.com</code> or <code className="bg-slate-100 dark:bg-neutral-700 px-1 rounded text-slate-900 dark:text-neutral-100">domain\username</code>
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:py-2.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="neu-button w-full inline-flex items-center justify-center text-sm font-medium disabled:opacity-70"
            style={{ fontSize: '14px', padding: '8px 24px' }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
