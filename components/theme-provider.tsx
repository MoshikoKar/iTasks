"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect } from "react";

function ThemeRootClassSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const theme = resolvedTheme === "dark" ? "dark" : "light";

    const root = document.documentElement;
    const body = document.body;

    // Ensure we never end up with both `dark` and `light` at once.
    root.classList.remove("dark", "light");
    body.classList.remove("dark", "light");
    root.classList.add(theme);
    body.classList.add(theme);

    // Defensive: if any nested element has a stray `dark` class, remove it
    // so it can't force dark styles when the app is in light mode.
    if (theme !== "dark") {
      const stray = document.querySelectorAll(".dark");
      for (const el of stray) {
        if (el !== root && el !== body) el.classList.remove("dark");
      }
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeRootClassSync />
      {children}
    </NextThemesProvider>
  );
}
