"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, LibraryBig, Apple, Calendar } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/workouts", label: "Strength", icon: Dumbbell },
  { href: "/exercises", label: "Library", icon: LibraryBig },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-forge-surface border-t border-forge-border safe-area-bottom z-40 lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const isHome = href === "/";
          const active = isHome ? pathname === "/" : isActive;

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex flex-col items-center justify-center gap-0.5 w-16 h-full
                transition-colors
                ${active ? "text-forge-accent" : "text-forge-text-muted"}
              `}
              aria-label={label}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
