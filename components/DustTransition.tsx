"use client";

import type { RefObject } from "react";

/**
 * Thin, footage-matched dust veil. The video's own final frames fully cover
 * the scene (avg tone ≈ #977958), so this layer only unifies the handoff:
 * it hides the last ghost of the logo, tone-bridges into the services
 * section, and thins out again as that section takes control.
 * Opacity is driven entirely by the master timeline.
 */
export function DustTransition({ hazeRef }: { hazeRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={hazeRef}
      className="pointer-events-none fixed inset-0 z-[60] opacity-0"
      style={{ visibility: "hidden" }}
      aria-hidden
    >
      {/* Soft, even veil matched to the footage's final dust tone — no
          vertical banding, so the rising section stays submerged in one hue */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(140% 120% at 50% 55%, rgba(170,138,100,0.3) 0%, rgba(151,121,88,0.5) 55%, rgba(134,106,78,0.62) 100%)",
        }}
      />
      <div className="film-grain absolute inset-0 opacity-50" />
    </div>
  );
}
