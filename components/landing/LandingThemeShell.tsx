"use client";

import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type LandingTheme = "dark" | "light";

const STORAGE_KEY = "landing-theme";

export function LandingThemeShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<LandingTheme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }
  }, []);

  function selectTheme(nextTheme: LandingTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <div data-landing-theme={theme} className="landing-theme-root">
      <div className="landing-theme-toggle-shell fixed right-4 top-4 z-50 flex rounded-full border border-white/15 bg-black/45 p-1 shadow-2xl backdrop-blur-md">
        <ThemeButton
          label="다크"
          active={theme === "dark"}
          onClick={() => selectTheme("dark")}
          icon={<Moon className="h-4 w-4" aria-hidden />}
        />
        <ThemeButton
          label="라이트"
          active={theme === "light"}
          onClick={() => selectTheme("light")}
          icon={<Sun className="h-4 w-4" aria-hidden />}
        />
      </div>

      {children}

      <style jsx global>{`
        [data-landing-theme="light"] {
          background: #f6efdf;
          color: #17130c;
        }

        [data-landing-theme="light"] .bg-black {
          background-color: #f6efdf !important;
        }

        [data-landing-theme="light"] .text-white {
          color: #17130c !important;
        }

        [data-landing-theme="light"] [class*="text-white/"] {
          color: rgba(23, 19, 12, 0.62) !important;
        }

        [data-landing-theme="light"] [class*="border-white/"] {
          border-color: rgba(23, 19, 12, 0.14) !important;
        }

        [data-landing-theme="light"] [class*="bg-white/"] {
          background-color: rgba(255, 255, 255, 0.62) !important;
        }

        [data-landing-theme="light"] [class*="bg-black/"] {
          background-color: rgba(23, 19, 12, 0.08) !important;
        }

        [data-landing-theme="light"] .landing-theme-toggle-active {
          background: #17130c !important;
          color: #fffaf0 !important;
        }

        [data-landing-theme="light"] .landing-theme-toggle-idle {
          color: rgba(23, 19, 12, 0.68) !important;
        }

        [data-landing-theme="light"] .landing-theme-toggle-shell {
          background: rgba(255, 255, 255, 0.72) !important;
          border-color: rgba(23, 19, 12, 0.14) !important;
        }

        [data-landing-theme="light"] #grid-hero path {
          stroke: rgba(115, 115, 115, 0.22);
        }

        .landing-footer {
          background:
            radial-gradient(
              circle at 24% 0%,
              rgba(45, 91, 255, 0.12),
              transparent 34%
            ),
            #05070d !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #f7f8fb !important;
        }

        .landing-footer p,
        .landing-footer a {
          color: rgba(247, 248, 251, 0.55) !important;
        }

        .landing-footer a:hover {
          color: #ffffff !important;
        }

        [data-landing-theme="light"] .landing-footer {
          background: #f6efdf !important;
          border-color: rgba(23, 19, 12, 0.14) !important;
          color: #17130c !important;
        }

        [data-landing-theme="light"] .landing-footer p,
        [data-landing-theme="light"] .landing-footer a {
          color: rgba(23, 19, 12, 0.62) !important;
        }

        [data-landing-theme="light"] .landing-footer a:hover {
          color: #17130c !important;
        }

        .landing-cursor-glow {
          opacity: 1;
          transition: opacity 180ms ease;
        }

        .landing-cursor-glow-blob {
          position: absolute;
          display: block;
          border-radius: 9999px;
          filter: blur(90px);
          mix-blend-mode: screen;
          opacity: 1;
          transform: translate(-50%, -50%);
          will-change: left, top, transform;
        }

        .landing-cursor-glow-blob-1 {
          left: var(--cursor-glow-x, 66%);
          top: var(--cursor-glow-y, 24%);
          width: min(58rem, 72vw);
          height: min(44rem, 58vw);
          animation: landing-paint-drift-1 12s ease-in-out infinite alternate;
        }

        .landing-cursor-glow-blob-2 {
          left: var(--cursor-glow-x-2, 58%);
          top: var(--cursor-glow-y-2, 36%);
          width: min(48rem, 62vw);
          height: min(38rem, 52vw);
          animation: landing-paint-drift-2 16s ease-in-out infinite alternate;
        }

        .landing-mesh-background > div {
          opacity: 0 !important;
        }

        .landing-cursor-glow-blob-1 {
          background: radial-gradient(
            ellipse at 50% 48%,
            rgba(45, 91, 255, 0.35) 0%,
            rgba(45, 91, 255, 0.22) 38%,
            rgba(45, 91, 255, 0) 72%
          );
        }

        .landing-cursor-glow-blob-2 {
          background: radial-gradient(
            ellipse at 50% 52%,
            rgba(45, 91, 255, 0.2) 0%,
            rgba(45, 91, 255, 0.13) 40%,
            rgba(45, 91, 255, 0) 74%
          );
        }

        [data-landing-theme="light"] .landing-cursor-glow-blob {
          mix-blend-mode: multiply;
        }

        [data-landing-theme="light"] .landing-cursor-glow-blob-1 {
          background: radial-gradient(
            ellipse at 50% 48%,
            rgba(45, 91, 255, 0.2) 0%,
            rgba(86, 122, 255, 0.16) 36%,
            rgba(86, 122, 255, 0) 72%
          );
        }

        [data-landing-theme="light"] .landing-cursor-glow-blob-2 {
          background: radial-gradient(
            ellipse at 58% 42%,
            rgba(123, 148, 255, 0.16) 0%,
            rgba(160, 177, 255, 0.12) 42%,
            rgba(160, 177, 255, 0) 74%
          );
        }

        @keyframes landing-paint-drift-1 {
          from {
            transform: translate(-50%, -50%) rotate(-4deg) scale(1);
          }
          to {
            transform: translate(calc(-50% + 34px), calc(-50% - 18px))
              rotate(7deg) scale(1.08);
          }
        }

        @keyframes landing-paint-drift-2 {
          from {
            transform: translate(-50%, -50%) rotate(8deg) scale(0.96);
          }
          to {
            transform: translate(calc(-50% - 42px), calc(-50% + 28px))
              rotate(-6deg) scale(1.12);
          }
        }

        [data-landing-theme="light"] .landing-cta-section {
          background:
            radial-gradient(
              circle at 50% 18%,
              rgba(45, 91, 255, 0.14),
              transparent 36%
            ),
            #17130c !important;
          color: #fff8e8 !important;
        }

        [data-landing-theme="light"] .landing-cta-section .landing-cta-grid {
          color: rgba(255, 248, 232, 0.13) !important;
        }

        [data-landing-theme="light"] .landing-cta-section h2,
        [data-landing-theme="light"] .landing-cta-section p {
          color: #fff8e8 !important;
        }

        [data-landing-theme="light"] .landing-cta-section a {
          background: #fff8e8 !important;
          color: #17130c !important;
        }
      `}</style>
    </div>
  );
}

function ThemeButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition",
        active
          ? "landing-theme-toggle-active bg-white text-black"
          : "landing-theme-toggle-idle text-white/65 hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
