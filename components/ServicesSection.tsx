"use client";

import type { RefObject } from "react";
import { PHASES } from "@/lib/demo-config";
import { SERVICES_SECTION, type ServiceItem } from "@/lib/services-content";

function ServiceIcon({ icon }: { icon: ServiceItem["icon"] }) {
  const common = {
    className: "h-9 w-9 text-orange",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 32 32",
  };
  switch (icon) {
    case "site-prep": // bulldozer blade / cleared ground
      return (
        <svg {...common} aria-hidden>
          <path d="M3 24h26M6 24v-5h10l4 5M8 19v-6l6 2v4M22 24v-4h5v4" />
          <circle cx="10" cy="24" r="0.5" />
        </svg>
      );
    case "grading": // level line over slope
      return (
        <svg {...common} aria-hidden>
          <path d="M3 25h26M3 20l10-6 8 3 8-5" />
          <path d="M25 9v3M25 12h3" />
        </svg>
      );
    case "excavation": // excavator arm + bucket
      return (
        <svg {...common} aria-hidden>
          <path d="M3 26h26M7 26v-4h8v4M9 22v-5l8-6 6 4-3 4M20 19l5 5" />
        </svg>
      );
    case "hauling": // dump truck
      return (
        <svg {...common} aria-hidden>
          <path d="M3 22h20v-7H9l-3 4H3v3zM23 18h4l2 3v1h-6" />
          <circle cx="9" cy="24" r="2" />
          <circle cx="24" cy="24" r="2" />
        </svg>
      );
  }
}

export function ServicesSection({
  sectionRef,
  innerRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
}) {
  const s = SERVICES_SECTION;
  return (
    <section
      id="services"
      ref={sectionRef}
      className="services-rise relative z-50 will-change-transform"
      // Compensate layout for the takeover rise so no gap trails the page
      // (disabled for prefers-reduced-motion via the .services-rise rule).
      style={{ "--rise": `${PHASES.nextSectionRiseVh}vh` } as React.CSSProperties}
    >
      {/* Submerged opening: transparent at the top so the video's real dust
          shows through, then the exact dust tone (#977958 family) slowly
          thickens and deepens into earth brown — no hard seam, no black. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(151,121,88,0) 0vh, rgba(151,121,88,0.14) 6vh, rgba(151,121,88,0.36) 12vh, rgba(151,121,88,0.6) 18vh, rgba(151,121,88,0.82) 24vh, rgba(138,111,82,0.95) 30vh, #8a6f52 36vh, #6b543e 54vh, #46362a 74vh, #2b2118 90vh, #141513 104vh)",
        }}
      />
      {/* Faint drifting grain inside the blend zone keeps it alive */}
      <div
        className="film-grain pointer-events-none absolute inset-x-0 top-0 h-[100vh] opacity-40"
        style={{
          maskImage: "linear-gradient(180deg, transparent 0vh, black 26vh, black 80vh, transparent 100vh)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0vh, black 26vh, black 80vh, transparent 100vh)",
        }}
      />
      <div className="relative pt-[24vh]">
        <div ref={innerRef} className="relative mx-auto max-w-[1400px] px-5 py-24 md:px-10 md:py-32 lg:px-14">
          <p className="text-[11px] font-semibold tracking-[0.32em] text-orange uppercase md:text-xs">
            {s.label}
          </p>
          <h2 className="font-display mt-4 max-w-[16ch] text-[10vw] leading-[0.96] font-bold text-cream uppercase md:text-6xl lg:text-7xl">
            {s.heading}
          </h2>

          <div className="mt-16 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {s.items.map((item) => (
              <article
                key={item.title}
                className="group bg-charcoal p-8 transition-colors duration-300 hover:bg-earth/60"
              >
                <div className="transition-transform duration-300 group-hover:-translate-y-1">
                  <ServiceIcon icon={item.icon} />
                </div>
                <h3 className="font-display mt-6 text-2xl font-bold tracking-wide text-cream uppercase">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                <span className="mt-6 block h-px w-8 bg-orange/60 transition-all duration-300 group-hover:w-14 group-hover:bg-orange" />
              </article>
            ))}
          </div>

          {/* Results */}
          <div className="mt-20 grid grid-cols-1 gap-10 border-t border-line pt-14 sm:grid-cols-3">
            {s.results.map((r) => (
              <div key={r.label}>
                <p className="font-display text-6xl font-bold text-orange md:text-7xl">{r.value}</p>
                <p className="mt-2 text-[12px] font-medium tracking-[0.22em] text-muted uppercase">
                  {r.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="relative border-t border-line">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 px-5 py-8 text-[12px] tracking-wide text-muted md:flex-row md:items-center md:px-10 lg:px-14">
            <span>© {new Date().getFullYear()} Dennis Dirtworx Ltd.</span>
            <span className="uppercase tracking-[0.2em]">Excavation · Grading · Site Prep</span>
          </div>
        </footer>
      </div>
    </section>
  );
}
