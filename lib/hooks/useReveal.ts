"use client";

import { useEffect, useRef } from "react";

/**
 * 스크롤 진입 시 요소를 페이드업으로 노출하는 훅 (무의존성).
 *
 * 사용:
 *   const ref = useReveal<HTMLDivElement>();
 *   <div ref={ref} data-reveal>…</div>
 *
 * - 실제 전환은 globals.css 의 `[data-reveal]` 규칙이 담당(이 훅은 "shown" 토글만).
 * - IntersectionObserver 미지원/SSR 환경에선 즉시 노출(데이터 숨김 방지).
 * - prefers-reduced-motion 사용자는 globals.css 에서 전환이 무력화된다.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-reveal", "shown");
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal", "shown");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px", ...options },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [options]);

  return ref;
}
