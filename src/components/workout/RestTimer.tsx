"use client";

import { useRestTimer } from "@/lib/store";
import { Timer, X } from "lucide-react";

export function RestTimer() {
  const { is_running, remaining_seconds, duration_seconds, stop } =
    useRestTimer();

  if (!is_running) return null;

  const progress = 1 - remaining_seconds / duration_seconds;
  const minutes = Math.floor(remaining_seconds / 60);
  const seconds = remaining_seconds % 60;

  return (
    <div className="fixed top-4 right-4 z-50 bg-forge-surface-elevated border border-forge-border rounded-xl p-3 shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-forge-border"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="text-forge-accent"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${progress * 100}, 100`}
            strokeLinecap="round"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <Timer size={14} className="absolute inset-0 m-auto text-forge-accent" />
      </div>
      <span className="text-lg font-mono font-semibold text-forge-text tabular-nums">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
      <button
        onClick={stop}
        className="p-1.5 text-forge-text-muted hover:text-forge-danger transition-colors"
        aria-label="Stop timer"
      >
        <X size={16} />
      </button>
    </div>
  );
}
