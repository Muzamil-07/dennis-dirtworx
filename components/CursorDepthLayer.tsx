"use client";

import type { ReactNode, RefObject } from "react";

/**
 * A layer participating in the 2.5D cursor-tilt illusion.
 * The parent supplies CSS perspective; the hook writes transforms to the ref.
 */
export function CursorDepthLayer({
  layerRef,
  className = "",
  bleedPx = 0,
  children,
}: {
  layerRef: RefObject<HTMLDivElement | null>;
  className?: string;
  /** Oversize the layer beyond the viewport so tilt never exposes its edges. */
  bleedPx?: number;
  children?: ReactNode;
}) {
  return (
    <div
      ref={layerRef}
      className={`absolute will-change-transform [transform-style:preserve-3d] ${className}`}
      style={{ inset: -bleedPx }}
    >
      {children}
    </div>
  );
}
