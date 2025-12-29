"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Particles } from "@/components/particles";
import Image from "next/image";
import { validatePassword } from "@/lib/constants";

export default function BootstrapPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#ffffff");
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const router = useRouter();

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

    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password, 'strong');
    if (!passwordValidation.isValid) {
      setError(`Password does not meet requirements: ${passwordValidation.errors.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Redirect to login page after successful registration
      router.push("/login?message=Bootstrap admin created successfully. Please log in.");
    } catch {
      setError("Registration failed");
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
        <h1 className="mb-2 text-center text-lg font-semibold text-slate-900 dark:text-neutral-100 sm:text-xl sm:mb-3">
          Bootstrap Admin Setup
        </h1>
        <p className="mb-4 text-center text-sm text-slate-600 dark:text-neutral-400">
          Welcome to iTasks! Create your first admin account to get started.
        </p>
        {error && (
          <div className="mb-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs text-red-700 dark:text-red-400 sm:text-sm sm:py-2">
            {error}
          </div>
        )}
        <form className="space-y-2.5 sm:space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:py-2.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:py-2.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
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
              placeholder="Create a strong password"
              required
            />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
              Password must be at least 12 characters with uppercase, lowercase, numbers, and special characters.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-neutral-300" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all sm:py-2.5"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="neu-button w-full inline-flex items-center justify-center text-sm font-medium disabled:opacity-70"
            style={{ fontSize: '14px', padding: '8px 24px' }}
          >
            {loading ? "Creating Admin Account..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
