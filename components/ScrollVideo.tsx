"use client";

import type { RefObject } from "react";
import type { DemoVersionConfig } from "@/lib/demo-config";

/**
 * Full-viewport, cover-fit, slightly overscaled hero video.
 * `videoInnerRef` receives the impact "camera push" scale;
 * the outer wrapper (in CursorDepthLayer) receives cursor tilt.
 */
export function ScrollVideo({
  config,
  videoRef,
  videoInnerRef,
}: {
  config: DemoVersionConfig;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoInnerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={videoInnerRef} className="absolute inset-0 will-change-transform">
      <video
        ref={videoRef}
        src={config.videoSrc}
        poster={config.posterSrc}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="absolute inset-0 h-full w-full scale-[var(--overscale-mobile)] object-cover md:scale-[var(--overscale)]"
        style={
          {
            objectPosition: config.objectPosition,
            "--overscale": config.overscaleDesktop,
            "--overscale-mobile": config.overscaleMobile,
          } as React.CSSProperties
        }
      />
      {/* Warm treatment + vignette + grain — subtle, identical on both routes */}
      <div className="scene-warmth pointer-events-none absolute inset-0" />
      <div className="scene-vignette pointer-events-none absolute inset-0" />
      <div className="film-grain pointer-events-none absolute inset-0 opacity-[0.35]" />
    </div>
  );
}
