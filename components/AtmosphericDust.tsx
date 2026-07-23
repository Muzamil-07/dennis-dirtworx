"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createDustEngine, type DustEngine } from "@/lib/dust-engine";
import { createSandEngine } from "@/lib/sand-engine";

/**
 * Canvas dust above the video. Reads `intensityRef` (written by the scroll
 * timeline) and `cursorRef` (from the cursor-depth hook) every frame.
 */
export function AtmosphericDust({
  intensityRef,
  cursorRef,
}: {
  intensityRef: RefObject<number>;
  cursorRef: RefObject<{ x: number; y: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let engine: DustEngine;
    if (reduced) {
      engine = createDustEngine(canvas, { reducedMotion: true });
    } else {
      try {
        // GPU surface-level sand (three.js) — one draw call, shader-driven.
        engine = createSandEngine(canvas);
      } catch {
        engine = createDustEngine(canvas, { reducedMotion: reduced });
      }
    }
    engine.resize();
    engine.start();

    let syncRaf = 0;
    const sync = () => {
      engine.setIntensity(intensityRef.current ?? 0.25);
      const c = cursorRef.current;
      if (c) engine.setCursorInfluence(c.x, c.y);
      syncRaf = requestAnimationFrame(sync);
    };
    syncRaf = requestAnimationFrame(sync);

    const onResize = () => engine.resize();
    const onVisibility = () => (document.hidden ? engine.stop() : engine.start());
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(syncRaf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.destroy();
    };
  }, [intensityRef, cursorRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
