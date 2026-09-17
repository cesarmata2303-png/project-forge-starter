"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm text-forge-text-muted font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-forge-surface-elevated border border-forge-border
            rounded-lg px-3 py-2.5 text-forge-text
            placeholder:text-forge-text-muted/50
            focus:outline-none focus:border-forge-accent focus:ring-1 focus:ring-forge-accent
            transition-colors
            ${error ? "border-forge-danger" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs text-forge-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
