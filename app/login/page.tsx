"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Particles } from "@/components/particles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    setColor(resolvedTheme === "dark" ? "#ffffff" : "#000000");
  }, [resolvedTheme]);

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
      window.location.href = "/";
    } catch {
      setError("Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={color}
        refresh
      />
      <div className="relative z-10 mx-auto w-full max-w-md rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-neutral-100">Sign in</h1>
        {error && <div className="mb-3 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</div>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300" htmlFor="email">
              Username / Email
            </label>
            <input
              id="email"
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email or domain\username"
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
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
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="neu-button w-full inline-flex items-center justify-center text-sm font-medium disabled:opacity-70"
            style={{ fontSize: '14px', padding: '10px 30px' }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
