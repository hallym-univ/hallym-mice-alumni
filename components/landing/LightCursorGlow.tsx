"use client";

import { useEffect, useRef } from "react";

export function LightCursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!glowRef.current) return;
    const glowElement: HTMLDivElement = glowRef.current;

    const state = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      layer2X: 0,
      layer2Y: 0,
      ready: false,
    };
    let frame = 0;

    function setInitialPosition() {
      const section = glowElement.parentElement;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const x = rect.width * 0.66;
      const y = rect.height * 0.24;

      state.x = x;
      state.y = y;
      state.targetX = x;
      state.targetY = y;
      state.layer2X = rect.width * 0.08;
      state.layer2Y = rect.height * 0.78;
      state.ready = true;
    }

    function moveTarget(event: PointerEvent) {
      const section = glowElement.parentElement;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      state.targetX = event.clientX - rect.left;
      state.targetY = event.clientY - rect.top;
    }

    function render() {
      if (!state.ready) {
        setInitialPosition();
      }

      state.x += (state.targetX - state.x) * 0.045;
      state.y += (state.targetY - state.y) * 0.045;
      state.layer2X += (state.targetX - 680 - state.layer2X) * 0.018;
      state.layer2Y += (state.targetY + 430 - state.layer2Y) * 0.018;

      glowElement.style.setProperty("--cursor-glow-x", `${state.x}px`);
      glowElement.style.setProperty("--cursor-glow-y", `${state.y}px`);
      glowElement.style.setProperty("--cursor-glow-x-2", `${state.layer2X}px`);
      glowElement.style.setProperty("--cursor-glow-y-2", `${state.layer2Y}px`);

      frame = window.requestAnimationFrame(render);
    }

    setInitialPosition();
    frame = window.requestAnimationFrame(render);
    window.addEventListener("pointermove", moveTarget, { passive: true });
    window.addEventListener("resize", setInitialPosition);

    return () => {
      window.removeEventListener("pointermove", moveTarget);
      window.removeEventListener("resize", setInitialPosition);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="landing-cursor-glow pointer-events-none absolute inset-0"
    >
      <span className="landing-cursor-glow-blob landing-cursor-glow-blob-1" />
      <span className="landing-cursor-glow-blob landing-cursor-glow-blob-2" />
    </div>
  );
}
