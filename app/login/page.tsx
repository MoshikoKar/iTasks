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
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.orgLogo && data.orgLogo.trim() !== '') {
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
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden">
      <Particles
        className="fixed inset-0 z-0"
        quantity={100}
        ease={80}
        color={color}
        refresh
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center w-full px-4 py-4">
        <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 sm:p-4 md:p-5 shadow-sm">
          <div className="mb-1.5 flex flex-row items-center justify-center gap-2 sm:mb-2 sm:gap-3 md:mb-3 md:gap-4">
            <div className="relative h-8 w-auto sm:h-9 md:h-11">
              <Image
                src="/itasks_logo.png"
                alt="iTasks Logo"
                width={200}
                height={48}
                className="h-8 w-auto object-contain sm:h-9 md:h-11"
                priority
              />
            </div>
            {customLogo && (
              <div className="relative h-8 w-auto sm:h-9 md:h-11">
                <img
                  src={customLogo}
                  alt="Organization Logo"
                  className="h-8 w-auto max-w-[140px] object-contain sm:h-9 sm:max-w-[160px] md:h-11 md:max-w-[180px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <h1 className="mb-1.5 text-center text-base font-semibold text-slate-900 dark:text-neutral-100 sm:text-lg md:text-xl sm:mb-2 md:mb-3">Sign in</h1>
          {error && <div className="mb-1.5 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs text-red-700 dark:text-red-400 sm:px-3 sm:py-1.5 sm:text-sm md:mb-2">{error}</div>}
          <form className="space-y-2 sm:space-y-2.5 md:space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-700 dark:text-neutral-300 sm:text-sm sm:mb-1" htmlFor="email">
                Username / Email
              </label>
              <input
                id="email"
                type="text"
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:px-4 sm:py-2 sm:text-sm md:py-2.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email or domain\username"
                required
              />
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-neutral-400 sm:text-xs">
                Supports: <code className="bg-slate-100 dark:bg-neutral-700 px-0.5 rounded text-slate-900 dark:text-neutral-100 sm:px-1">username@domain.com</code> or <code className="bg-slate-100 dark:bg-neutral-700 px-0.5 rounded text-slate-900 dark:text-neutral-100 sm:px-1">domain\username</code>
              </p>
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-700 dark:text-neutral-300 sm:text-sm sm:mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:px-4 sm:py-2 sm:text-sm md:py-2.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="neu-button w-full inline-flex items-center justify-center text-xs font-medium disabled:opacity-70 sm:text-sm"
              style={{ fontSize: '12px', padding: '6px 20px' }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
