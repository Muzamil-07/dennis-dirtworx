"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { TILT } from "./demo-config";

export interface CursorDepthRefs {
  videoLayer: RefObject<HTMLDivElement | null>;
  dustLayer: RefObject<HTMLDivElement | null>;
  atmosphereLayer: RefObject<HTMLDivElement | null>;
  contentLayer: RefObject<HTMLDivElement | null>;
}

/**
 * Subtle 2.5D camera-tilt illusion. Layers follow the cursor slowly and
 * heavily via gsap.quickTo. `tiltScaleRef` (0..1) is written by the scroll
 * timeline to fade all movement out during the dust takeover.
 * Returns a ref exposing the current normalized cursor for the dust engine.
 */
export function useCursorDepth(
  layers: CursorDepthRefs,
  tiltScaleRef: RefObject<number>,
  enabled: boolean
) {
  const cursorRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.innerWidth >= 768;
    if (!fine || reduced || !wide) return;

    const make = (el: HTMLElement | null, dur: number) =>
      el
        ? {
            x: gsap.quickTo(el, "x", { duration: dur, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: dur, ease: "power3.out" }),
            rx: gsap.quickTo(el, "rotationX", { duration: dur, ease: "power3.out" }),
            ry: gsap.quickTo(el, "rotationY", { duration: dur, ease: "power3.out" }),
          }
        : null;

    const video = make(layers.videoLayer.current, 1.2);
    const dust = make(layers.dustLayer.current, 0.9);
    const atmo = make(layers.atmosphereLayer.current, 1.4);
    const content = make(layers.contentLayer.current, 1.0);

    let raf = 0;
    let targetX = 0;
    let targetY = 0;

    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const tick = () => {
      const s = (tiltScaleRef.current ?? 1) * TILT.intensity;
      const x = targetX * s;
      const y = targetY * s;
      cursorRef.current.x = x;
      cursorRef.current.y = y;

      // Video moves opposite the cursor for parallax depth.
      video?.x(-x * TILT.video.x);
      video?.y(-y * TILT.video.y);
      video?.rx(y * TILT.video.rotX);
      video?.ry(-x * TILT.video.rotY);
      // Foreground dust: same direction as cursor (nearest layer).
      dust?.x(x * TILT.dust.x);
      dust?.y(y * TILT.dust.y);
      // Atmospheric overlay: mid drift.
      atmo?.x(-x * TILT.atmosphere.x);
      atmo?.y(-y * TILT.atmosphere.y);
      // Live content: smallest movement.
      content?.x(x * TILT.content.x);
      content?.y(y * TILT.content.y);

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled, layers.videoLayer, layers.dustLayer, layers.atmosphereLayer, layers.contentLayer, tiltScaleRef]);

  return cursorRef;
}
