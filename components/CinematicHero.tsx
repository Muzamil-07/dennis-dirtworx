"use client";

import type { RefObject } from "react";
import type { DemoVersionConfig } from "@/lib/demo-config";
import { CursorDepthLayer } from "./CursorDepthLayer";
import { ScrollVideo } from "./ScrollVideo";
import { AtmosphericDust } from "./AtmosphericDust";
import { HeroNavigation } from "./HeroNavigation";
import { HeroContent, type HeroContentRefs } from "./HeroContent";

export interface CinematicHeroRefs extends HeroContentRefs {
  root: RefObject<HTMLDivElement | null>;
  video: RefObject<HTMLVideoElement | null>;
  videoInner: RefObject<HTMLDivElement | null>;
  nav: RefObject<HTMLElement | null>;
  videoLayer: RefObject<HTMLDivElement | null>;
  dustLayer: RefObject<HTMLDivElement | null>;
  atmosphereLayer: RefObject<HTMLDivElement | null>;
  contentLayer: RefObject<HTMLDivElement | null>;
  dustIntensity: RefObject<number>;
  cursor: RefObject<{ x: number; y: number }>;
}

export function CinematicHero({
  config,
  refs,
}: {
  config: DemoVersionConfig;
  refs: CinematicHeroRefs;
}) {
  return (
    <section
      ref={refs.root}
      className="relative h-screen overflow-hidden bg-ink opacity-0 [perspective:1200px]"
      aria-label="Dennis Dirtworx cinematic hero"
    >
      {/* 1. Video layer (tilt: opposite cursor, slow + heavy) */}
      <CursorDepthLayer layerRef={refs.videoLayer}>
        <ScrollVideo config={config} videoRef={refs.video} videoInnerRef={refs.videoInner} />
      </CursorDepthLayer>

      {/* Left text-safe gradient — sits with the scene, not the content */}
      <div className="hero-text-gradient pointer-events-none absolute inset-0 z-10" />

      {/* 2. Atmospheric overlay (soft warm depth haze) */}
      <CursorDepthLayer layerRef={refs.atmosphereLayer} className="z-[15] pointer-events-none" bleedPx={24}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 70% 60%, rgba(180,140,90,0.07) 0%, transparent 60%)",
          }}
        />
      </CursorDepthLayer>

      {/* 3. Foreground Canvas dust (tilt: with cursor, nearest layer) */}
      <CursorDepthLayer layerRef={refs.dustLayer} className="z-20 pointer-events-none" bleedPx={56}>
        <AtmosphericDust intensityRef={refs.dustIntensity} cursorRef={refs.cursor} />
      </CursorDepthLayer>

      {/* 4. Live content (tilt: 2–4px only) */}
      <CursorDepthLayer layerRef={refs.contentLayer} className="z-30">
        <HeroContent refs={refs} />
      </CursorDepthLayer>

      <HeroNavigation navRef={refs.nav} />
    </section>
  );
}
