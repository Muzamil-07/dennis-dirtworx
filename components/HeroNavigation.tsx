"use client";

import { useState, type RefObject } from "react";
import Image from "next/image";
import { HERO_CONTENT } from "@/lib/hero-content";

export function HeroNavigation({ navRef }: { navRef: RefObject<HTMLElement | null> }) {
  const [open, setOpen] = useState(false);
  const c = HERO_CONTENT;

  return (
    <header
      ref={navRef}
      className="absolute inset-x-0 top-0 z-40 opacity-0"
      style={{ visibility: "hidden" }}
    >
      <div className="nav-gradient pointer-events-none absolute inset-x-0 top-0 h-28" />
      <nav className="relative mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-4 md:px-10 md:py-5">
        {/* Logo */}
        <a href="#" className="flex shrink-0 items-center" aria-label="Dennis Dirtworx — Home">
          {/* Starts invisible — the loading screen's logo flies in and docks
              here, then flips this to visible (inline style survives re-renders). */}
          <Image
            src="/brand/dennis-dirtworx-logo.png"
            alt="Dennis Dirtworx Ltd."
            width={152}
            height={53}
            priority
            data-nav-logo
            className="h-10 w-auto opacity-0 md:h-12"
          />
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-7 lg:flex">
          {c.navLinks.map((link, i) => (
            <li key={link.label}>
              <a
                href={link.href}
                className={`text-[13px] font-medium tracking-[0.14em] uppercase transition-colors hover:text-orange ${
                  i === 0 ? "text-orange" : "text-cream/85"
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Phone + CTA */}
        <div className="flex items-center gap-5">
          <a
            href={`tel:${c.phone}`}
            className="hidden text-[13px] font-medium tracking-wide text-cream/85 transition-colors hover:text-orange md:block"
          >
            {c.phone}
          </a>
          <a
            href="#"
            className="hidden bg-orange px-5 py-2.5 text-[12px] font-semibold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-orange-dark sm:block"
          >
            {c.quoteCta}
          </a>
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 border border-line lg:hidden"
          >
            <span className={`block h-px w-5 bg-cream transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
            <span className={`block h-px w-5 bg-cream transition-transform ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="relative border-t border-line bg-ink/95 backdrop-blur-sm lg:hidden">
          <ul className="flex flex-col px-6 py-4">
            {c.navLinks.map((link, i) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-line/50 py-3.5 text-sm font-medium tracking-[0.14em] uppercase ${
                    i === 0 ? "text-orange" : "text-cream/85"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-4 sm:hidden">
              <a
                href="#"
                className="block bg-orange px-5 py-3 text-center text-[12px] font-semibold tracking-[0.14em] text-ink uppercase"
              >
                {c.quoteCta}
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
