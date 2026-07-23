"use client";

import { useCallback, useRef, useState } from "react";
import type { DemoVersionConfig } from "@/lib/demo-config";
import { useHeroTimeline } from "@/lib/use-hero-timeline";
import { useCursorDepth } from "@/lib/use-cursor-depth";
import { CinematicHero, type CinematicHeroRefs } from "./CinematicHero";
import { ServicesSection } from "./ServicesSection";
import { DustTransition } from "./DustTransition";
import { DemoVersionSwitcher } from "./DemoVersionSwitcher";
import { LoadingScreen } from "./LoadingScreen";

/**
 * One shared cinematic experience, fully driven by route configuration.
 * /version-a and /version-b differ only in the config object passed in.
 */
export function CinematicDemoPage({ config }: { config: DemoVersionConfig }) {
  const root = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const videoInner = useRef<HTMLDivElement | null>(null);
  const nav = useRef<HTMLElement | null>(null);
  const label = useRef<HTMLParagraphElement | null>(null);
  const line1 = useRef<HTMLSpanElement | null>(null);
  const line2 = useRef<HTMLSpanElement | null>(null);
  const paragraph = useRef<HTMLParagraphElement | null>(null);
  const ctas = useRef<HTMLDivElement | null>(null);
  const scrollHint = useRef<HTMLDivElement | null>(null);
  const headlineBlock = useRef<HTMLHeadingElement | null>(null);
  const haze = useRef<HTMLDivElement | null>(null);
  const services = useRef<HTMLElement | null>(null);
  const servicesInner = useRef<HTMLDivElement | null>(null);

  const videoLayer = useRef<HTMLDivElement | null>(null);
  const dustLayer = useRef<HTMLDivElement | null>(null);
  const atmosphereLayer = useRef<HTMLDivElement | null>(null);
  const contentLayer = useRef<HTMLDivElement | null>(null);

  const tiltScale = useRef(1);
  const dustIntensity = useRef(0.25);
  const [booted, setBooted] = useState(false);
  const handleLoaded = useCallback(() => setBooted(true), []);

  const cursor = useCursorDepth(
    { videoLayer, dustLayer, atmosphereLayer, contentLayer },
    tiltScale,
    true
  );

  useHeroTimeline(config, {
    root,
    video,
    videoInner,
    nav,
    label,
    line1,
    line2,
    paragraph,
    ctas,
    scrollHint,
    headlineBlock,
    haze,
    services,
    servicesInner,
    tiltScale,
    dustIntensity,
  }, booted);

  const heroRefs: CinematicHeroRefs = {
    root,
    video,
    videoInner,
    nav,
    label,
    line1,
    line2,
    paragraph,
    ctas,
    scrollHint,
    headlineBlock,
    videoLayer,
    dustLayer,
    atmosphereLayer,
    contentLayer,
    dustIntensity,
    cursor,
  };

  return (
    <main className="bg-ink">
      <LoadingScreen videoRef={video} onComplete={handleLoaded} />
      <CinematicHero config={config} refs={heroRefs} />
      <ServicesSection sectionRef={services} innerRef={servicesInner} />
      <DustTransition hazeRef={haze} />
      <DemoVersionSwitcher activeId={config.id} />
    </main>
  );
}
