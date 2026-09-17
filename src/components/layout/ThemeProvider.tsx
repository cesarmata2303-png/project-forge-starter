"use client";

import { useEffect } from "react";
import { getSettings } from "@/lib/settings";

/**
 * Applies the saved theme class on mount.
 * Must be rendered in the root layout so it runs on every page.
 */
export function ThemeProvider() {
  useEffect(() => {
    const settings = getSettings();
    const html = document.documentElement;
    if (settings.theme === "light") {
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
    }
  }, []);

  return null;
}
