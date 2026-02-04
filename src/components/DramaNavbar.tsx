"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Star, Clock, Film, Heart, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Beranda",
    href: "/drama",
    icon: Home,
  },
  {
    title: "Terbaru",
    href: "/drama/terbaru",
    icon: Clock,
  },
  {
    title: "Terpopuler",
    href: "/drama/terpopuler",
    icon: TrendingUp,
  },
  {
    title: "Favorit",
    href: "/drama/favorit",
    icon: Heart,
  },
  {
    title: "Genre",
    href: "/drama/genre",
    icon: Film,
  },
  {
    title: "Dubindo",
    href: "/drama/dubindo",
    icon: Star,
  },
  {
    title: "Rekomendasi",
    href: "/drama/rekomendasi",
    icon: BookOpen,
  },
];

export function DramaNavbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-20 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto py-3 hide-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Styles for hiding scrollbar on the navbar
const hideScrollbarStyles = `
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

// Inject the styles
if (typeof document !== "undefined") {
  if (!document.querySelector("#hide-scrollbar-styles")) {
    const style = document.createElement("style");
    style.id = "hide-scrollbar-styles";
    style.textContent = hideScrollbarStyles;
    document.head.appendChild(style);
  }
}