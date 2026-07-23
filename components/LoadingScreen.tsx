"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import gsap from "gsap";
import { SandRevealTransition } from "./SandRevealTransition";

const MIN_DISPLAY_MS = 900; // never flash
const SAFETY_TIMEOUT_MS = 6000; // proceed even on slow networks

/**
 * Branded loading screen shown while the hero video buffers.
 * Tracks real buffering progress, guarantees a minimum display time,
 * then fades out and calls onComplete — which starts the cinematic entrance.
 */
export function LoadingScreen({
  videoRef,
  onComplete,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  onComplete: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const fadeRef = useRef<HTMLDivElement | null>(null); // tagline + bar (fade first)
  const logoWrapRef = useRef<HTMLDivElement | null>(null);
  const flightRef = useRef<HTMLDivElement | null>(null);
  const [gone, setGone] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [flight, setFlight] = useState<{ left: number; top: number; width: number } | null>(
    null
  );
  const doneRef = useRef(false);
  const completedRef = useRef(false);
  const completeOnce = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  useEffect(() => {
    // The experience must always start from the top: kill the browser's
    // scroll restoration and lock scrolling while the loader is up.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const mountedAt = performance.now();
    const bar = barRef.current;
    let raf = 0;
    let timeout = 0;
    // Displayed progress eases toward the real value so it always feels alive.
    let shown = 0;
    let real = 0.08;

    const measure = () => {
      const v = videoRef.current;
      if (!v) return;
      if (v.readyState >= 4) {
        real = 1;
        return;
      }
      try {
        if (v.buffered.length && v.duration) {
          real = Math.max(real, Math.min(1, v.buffered.end(v.buffered.length - 1) / v.duration));
        }
      } catch {
        /* noop */
      }
      // readyState milestones keep the bar honest even before `progress` fires.
      real = Math.max(real, [0.08, 0.2, 0.45, 0.7, 1][v.readyState] ?? 0.08);
    };

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      const wait = Math.max(0, MIN_DISPLAY_MS - (performance.now() - mountedAt));
      window.setTimeout(() => {
        // Unlock scroll and hand off from the very top of the page.
        window.scrollTo(0, 0);
        html.style.overflow = prevOverflow;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          // Simple dissolve for reduced motion; nav logo appears directly.
          const tl = gsap.timeline({
            onComplete: () => {
              const nav = document.querySelector("[data-nav-logo]") as HTMLElement | null;
              if (nav) nav.style.opacity = "1";
              setGone(true);
            },
          });
          tl.to(bar, { scaleX: 1, duration: 0.22, ease: "power1.out" }, 0)
            .call(() => completeOnce(), [], 0.3)
            .to(rootRef.current, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" }, 0.35);
          return;
        }

        // Sand-erosion unveil + logo flight: the bar and tagline fade, the
        // logo stays alone on the dark surface while the WebGL cover takes
        // over and erodes away — then the logo flies up and docks into its
        // (initially empty) navbar slot.
        const tl = gsap.timeline();
        tl.to(bar, { scaleX: 1, duration: 0.22, ease: "power1.out" }, 0)
          .to(
            fadeRef.current,
            { autoAlpha: 0, y: -12, duration: 0.4, ease: "power2.in" },
            0.15
          )
          .call(() => setReveal(true), [], 0.5);
      }, wait);
    };

    const tick = () => {
      measure();
      shown += (Math.min(real, 0.98) - shown) * 0.08;
      if (bar) bar.style.transform = `scaleX(${shown})`;
      if (real >= 1 && shown > 0.85) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const v = videoRef.current;
    const onReady = () => {
      real = 1;
    };
    v?.addEventListener("canplaythrough", onReady);
    timeout = window.setTimeout(() => {
      real = 1;
      finish();
    }, SAFETY_TIMEOUT_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      v?.removeEventListener("canplaythrough", onReady);
      html.style.overflow = prevOverflow;
    };
  }, [videoRef, onComplete]);

  /* Logo flight: triggered by the erosion's own progress (at ~30% unveiled).
     The nav may still be sliding in, so the landing spot is measured with
     its in-flight transform compensated out. */
  const flightStartedRef = useRef(false);
  const flightTweenRef = useRef<gsap.core.Tween | null>(null);
  const startFlight = () => {
    if (flightStartedRef.current || !flightRef.current) return;
    flightStartedRef.current = true;
    const nav = document.querySelector("[data-nav-logo]") as HTMLElement | null;
    if (!nav) {
      setFlight(null);
      return;
    }
    const A = flightRef.current.getBoundingClientRect();
    const B = nav.getBoundingClientRect();
    // The header is animating y:-22 → 0 during entrance; subtract its
    // current offset so we aim at the logo's FINAL resting position.
    const header = nav.closest("header");
    const headerY = header ? Number(gsap.getProperty(header, "y")) || 0 : 0;
    flightTweenRef.current = gsap.to(flightRef.current, {
      x: B.left + B.width / 2 - (A.left + A.width / 2),
      y: B.top - headerY + B.height / 2 - (A.top + A.height / 2),
      scale: B.width / A.width,
      duration: 1.1,
      ease: "power3.inOut",
      onComplete: () => {
        nav.style.opacity = "1"; // inline style survives re-renders
        setFlight(null);
      },
    });
  };
  useEffect(() => {
    return () => {
      flightTweenRef.current?.kill();
      // Defensive: never leave the nav logo hidden.
      const nav = document.querySelector("[data-nav-logo]") as HTMLElement | null;
      if (nav) nav.style.opacity = "1";
    };
  }, []);

  if (gone && !reveal && !flight) return null;

  return (
    <>
      {reveal && (
        <SandRevealTransition
          onCovered={() => {
            // The erosion cover has painted its first opaque frame — hand
            // the logo to its flight wrapper (same screen position), drop
            // the DOM loader and start the hero entrance beneath.
            const a = logoWrapRef.current?.getBoundingClientRect();
            if (a) setFlight({ left: a.left, top: a.top, width: a.width });
            setGone(true);
            completeOnce();
          }}
          onDone={() => setReveal(false)}
          onProgress={(p) => {
            // Start the logo's move to the navbar once ~18% is unveiled.
            if (p >= 0.13) startFlight();
          }}
        />
      )}
      {flight && (
        <div
          ref={flightRef}
          className="pointer-events-none fixed z-[120]"
          style={{ left: flight.left, top: flight.top, width: flight.width }}
        >
          <Image
            src="/brand/dennis-dirtworx-logo.png"
            alt=""
            width={228}
            height={80}
            priority
            className="h-auto w-full opacity-90"
          />
        </div>
      )}
      {!gone && (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-ink"
      aria-label="Loading"
      role="status"
    >
      {/* Warm ground haze — the loader already lives in the sandy world */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 108%, rgba(151,121,88,0.34) 0%, rgba(107,84,62,0.16) 38%, transparent 66%)",
        }}
      />
      {/* Slow drifting dust wisps (pure CSS — cheap) */}
      <div className="loader-wisp pointer-events-none absolute bottom-[-12%] left-[-18%] h-[55vh] w-[70vw] rounded-full" />
      <div
        className="loader-wisp pointer-events-none absolute bottom-[-20%] right-[-15%] h-[48vh] w-[60vw] rounded-full"
        style={{ animationDelay: "-9s", animationDuration: "26s" }}
      />
      <div className="film-grain pointer-events-none absolute inset-0 opacity-30" />

      <div ref={contentRef} className="loader-content relative flex flex-col items-center">
        <div ref={logoWrapRef}>
          <Image
            src="/brand/dennis-dirtworx-logo.png"
            alt="Dennis Dirtworx Ltd."
            width={228}
            height={80}
            priority
            className="h-14 w-auto opacity-90 md:h-16"
          />
        </div>
        <div ref={fadeRef} className="flex flex-col items-center">
          <p className="mt-6 text-[10px] font-medium tracking-[0.34em] text-muted uppercase">
            Excavation · Grading · Site Prep
          </p>
          <div className="mt-8 h-px w-44 overflow-hidden bg-white/10 md:w-56">
            <div
              ref={barRef}
              className="h-full w-full origin-left bg-orange"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <p className="mt-4 text-[9px] font-medium tracking-[0.3em] text-muted/60 uppercase">
            Preparing the site
          </p>
        </div>
      </div>

    </div>
      )}
    </>
  );
}
