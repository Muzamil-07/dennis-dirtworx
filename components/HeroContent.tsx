"use client";

import type { RefObject } from "react";
import { HERO_CONTENT } from "@/lib/hero-content";

export interface HeroContentRefs {
  label: RefObject<HTMLParagraphElement | null>;
  line1: RefObject<HTMLSpanElement | null>;
  line2: RefObject<HTMLSpanElement | null>;
  paragraph: RefObject<HTMLParagraphElement | null>;
  ctas: RefObject<HTMLDivElement | null>;
  scrollHint: RefObject<HTMLDivElement | null>;
  headlineBlock: RefObject<HTMLHeadingElement | null>;
}

export function HeroContent({ refs }: { refs: HeroContentRefs }) {
  const c = HERO_CONTENT;
  return (
    <div className="relative z-30 flex h-full items-center">
      {/* Left text-safe area: ~38–42% of the desktop viewport */}
      <div className="w-full px-5 pt-16 md:w-[42%] md:min-w-[520px] md:px-10 lg:pl-14">
        <p
          ref={refs.label}
          className="mb-4 text-[11px] font-semibold tracking-[0.32em] text-orange uppercase opacity-0 md:text-xs"
          style={{ visibility: "hidden" }}
        >
          {c.label}
        </p>

        <h1
          ref={refs.headlineBlock}
          className="font-display text-cream uppercase leading-[0.94] font-bold tracking-[-0.01em]"
        >
          <span className="block overflow-hidden">
            <span ref={refs.line1} className="block text-[15vw] md:text-[6.2vw] lg:text-[5.6vw]">
              {c.headlineLine1}
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              ref={refs.line2}
              className="block text-[15vw] text-orange md:text-[6.2vw] lg:text-[5.6vw]"
            >
              {c.headlineLine2}
            </span>
          </span>
        </h1>

        <p
          ref={refs.paragraph}
          className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted opacity-0 md:text-base"
          style={{ visibility: "hidden" }}
        >
          {c.paragraph}
        </p>

        <div
          ref={refs.ctas}
          className="mt-8 flex flex-col gap-3 opacity-0 sm:flex-row sm:gap-4"
          style={{ visibility: "hidden" }}
        >
          <a
            href="#services"
            className="inline-flex items-center justify-center gap-2 bg-orange px-7 py-3.5 text-[13px] font-semibold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-orange-dark"
          >
            {c.primaryCta}
            <span aria-hidden>→</span>
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 border border-line px-7 py-3.5 text-[13px] font-semibold tracking-[0.14em] text-cream uppercase transition-colors hover:border-cream/40 hover:bg-white/5"
          >
            {c.secondaryCta}
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={refs.scrollHint}
        className="absolute bottom-7 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3 opacity-0"
        style={{ visibility: "hidden" }}
      >
        <span className="text-[10px] font-medium tracking-[0.3em] text-cream/70 uppercase">
          {c.scrollHint}
        </span>
        <span className="flex h-9 w-[22px] items-start justify-center rounded-full border border-line pt-1.5">
          <span className="scroll-dot block h-1.5 w-1.5 rounded-full bg-orange" />
        </span>
      </div>
    </div>
  );
}
