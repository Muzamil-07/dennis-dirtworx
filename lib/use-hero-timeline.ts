"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PHASES, type DemoVersionConfig } from "./demo-config";

export interface HeroTimelineRefs {
  root: RefObject<HTMLDivElement | null>; // pinned hero section
  video: RefObject<HTMLVideoElement | null>;
  videoInner: RefObject<HTMLDivElement | null>; // scale push target
  nav: RefObject<HTMLElement | null>;
  label: RefObject<HTMLParagraphElement | null>;
  line1: RefObject<HTMLSpanElement | null>;
  line2: RefObject<HTMLSpanElement | null>;
  paragraph: RefObject<HTMLParagraphElement | null>;
  ctas: RefObject<HTMLDivElement | null>;
  scrollHint: RefObject<HTMLDivElement | null>;
  headlineBlock: RefObject<HTMLHeadingElement | null>;
  haze: RefObject<HTMLDivElement | null>; // full-viewport earth haze
  services: RefObject<HTMLElement | null>;
  servicesInner: RefObject<HTMLDivElement | null>;
  /** 0..1 — multiplies all cursor tilt; timeline decays it to 0. */
  tiltScale: RefObject<number>;
  /** Written every scroll update; the dust canvas reads it. */
  dustIntensity: RefObject<number>;
}

/**
 * One master pinned ScrollTrigger timeline per route:
 * video scrubbing, content exit, tilt decay, dust intensity, haze cover,
 * services entrance and hero release all live here.
 */
export function useHeroTimeline(
  config: DemoVersionConfig,
  refs: HeroTimelineRefs,
  /** The loading screen gates the entrance — nothing starts until true. */
  active = true
) {
  useEffect(() => {
    const rootEl = refs.root.current;
    const video = refs.video.current;
    if (!rootEl || !video || !active) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);

    const t = config.timing;
    const cleanups: (() => void)[] = [];
    const ctx = gsap.context(() => {
      /* ---------- Entrance (load) choreography ---------- */
      const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
      entrance
        .fromTo(rootEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: "power1.out" }, 0)
        .fromTo(refs.nav.current, { y: -22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, 0.35)
        .fromTo(refs.label.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.7)
        .fromTo(refs.line1.current, { yPercent: 110 }, { yPercent: 0, duration: 0.85, ease: "power4.out" }, 0.85)
        .fromTo(refs.line2.current, { yPercent: 110 }, { yPercent: 0, duration: 0.85, ease: "power4.out" }, 1.0)
        .fromTo(refs.paragraph.current, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 1.25)
        .fromTo(refs.ctas.current, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 }, 1.45)
        .fromTo(refs.scrollHint.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.9);

      if (reduced) {
        // Reduced motion: strong poster frame, simple fades, no pin/scrub.
        video.pause();
        try { video.currentTime = t.autoplayEnd; } catch { /* noop */ }
        return;
      }

      /* ---------- Initial autoplay: play ~1.4s then pause ---------- */
      let autoplayDone = false;
      const onTime = () => {
        if (!autoplayDone && video.currentTime >= t.autoplayEnd) {
          autoplayDone = true;
          video.pause();
          video.removeEventListener("timeupdate", onTime);
        }
      };
      video.addEventListener("timeupdate", onTime);
      video.play().catch(() => {
        // Autoplay blocked — sit on the poster-equivalent stable frame.
        autoplayDone = true;
        try { video.currentTime = t.autoplayEnd; } catch { /* noop */ }
      });

      /* ---------- Scroll progress → video time mapping ---------- */
      const P = PHASES;
      const progressToTime = (p: number): number => {
        if (p <= P.stableEnd) return t.scrubStart;
        if (p <= P.progressEnd) {
          const k = (p - P.stableEnd) / (P.progressEnd - P.stableEnd);
          return t.scrubStart + k * (t.impactTime - t.scrubStart);
        }
        if (p <= P.impactEnd) {
          const k = (p - P.progressEnd) / (P.impactEnd - P.progressEnd);
          return t.impactTime + k * (t.dustTakeoverTime - t.impactTime);
        }
        // Reach the fully-covered frame by `videoEndAt`, then hold it
        // while the next section rises through the real dust.
        const finalFrame = t.fullCoverTime;
        if (p >= P.videoEndAt) return finalFrame;
        const k = (p - P.impactEnd) / (P.videoEndAt - P.impactEnd);
        return t.dustTakeoverTime + k * (finalFrame - t.dustTakeoverTime);
      };

      /* ---------- Smooth video seeking loop ---------- */
      let targetTime = t.scrubStart;
      let raf = 0;
      let seeking = false;
      const hasRVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;

      const seekLoop = () => {
        raf = requestAnimationFrame(seekLoop);
        if (!autoplayDone || document.hidden) return;
        const diff = targetTime - video.currentTime;
        if (Math.abs(diff) < 0.02) return;
        const next = video.currentTime + diff * 0.16;
        if (hasRVFC) {
          if (!seeking) {
            seeking = true;
            video.currentTime = next;
            (video as HTMLVideoElement & {
              requestVideoFrameCallback: (cb: () => void) => number;
            }).requestVideoFrameCallback(() => { seeking = false; });
          }
        } else {
          video.currentTime = next;
        }
      };
      raf = requestAnimationFrame(seekLoop);

      const onVisibility = () => {
        if (document.hidden) video.pause();
      };
      document.addEventListener("visibilitychange", onVisibility);
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVisibility);
        video.removeEventListener("timeupdate", onTime);
      });

      /* ---------- Master pinned timeline ---------- */
      const master = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: rootEl,
          start: "top top",
          // ScrollTrigger end strings are px-based — convert vh manually.
          end: () => `+=${Math.round(window.innerHeight * (config.scrollDistanceVh / 100))}`,
          invalidateOnRefresh: true,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate(self) {
            const p = self.progress;
            if (p > P.stableEnd + 0.01 && !autoplayDone) {
              autoplayDone = true;
              video.pause();
              video.removeEventListener("timeupdate", onTime);
            }
            targetTime = progressToTime(p);

            // Dust intensity: ambient 0.25 → full 1 through impact + takeover.
            const d =
              p < P.tiltDecayStart
                ? 0.25 + (p / P.tiltDecayStart) * 0.15
                : 0.4 + ((p - P.tiltDecayStart) / (1 - P.tiltDecayStart)) * 0.6;
            refs.dustIntensity.current = d;

            // Cursor tilt decays to zero during the takeover.
            const ts =
              p <= P.tiltDecayStart
                ? 1
                : p >= P.tiltDecayEnd
                  ? 0
                  : 1 - (p - P.tiltDecayStart) / (P.tiltDecayEnd - P.tiltDecayStart);
            refs.tiltScale.current = ts;
          },
        },
      });

      const D = (a: number, b: number) => ({ start: a, dur: b - a }); // fractions

      // Scroll hint disappears as soon as real scrolling starts.
      master.to(refs.scrollHint.current, { autoAlpha: 0, duration: 0.05 }, 0.06);

      // Minimal upward drift of content through the mid hero (keeps it readable).
      master.to(refs.headlineBlock.current, { y: -24, duration: P.paragraphExitStart }, 0);

      // Exit choreography: paragraph → CTAs → headline → nav.
      const pe = D(P.paragraphExitStart, P.paragraphExitStart + 0.08);
      master.to(refs.paragraph.current, { autoAlpha: 0, y: -14, duration: pe.dur }, pe.start);
      const ce = D(P.ctaExitStart, P.ctaExitStart + 0.08);
      master.to(refs.ctas.current, { autoAlpha: 0, y: -12, duration: ce.dur }, ce.start);
      master.to(refs.label.current, { autoAlpha: 0, duration: 0.06 }, P.headlineExitStart);
      const he = D(P.headlineExitStart, P.headlineExitStart + 0.12);
      master.to(refs.headlineBlock.current, { autoAlpha: 0, y: -60, duration: he.dur }, he.start);
      const ne = D(P.navExitStart, P.navExitStart + 0.1);
      master.to(refs.nav.current, { autoAlpha: 0, duration: ne.dur }, ne.start);

      // Camera push toward the rocky logo during impact → takeover.
      master.to(refs.videoInner.current, { scale: 1.07, duration: 1 - P.tiltDecayStart, ease: "power1.in" }, P.tiltDecayStart);

      // Earth haze completes the dust cover (video's final frame isn't 100% opaque).
      const hz = D(P.hazeCoverStart, P.hazeCoverEnd);
      master.to(refs.haze.current, { autoAlpha: 1, duration: hz.dur, ease: "power1.in" }, hz.start);

      // The services section overlaps the pinned hero through its negative
      // top margin (see ServicesSection) — it scrolls up over the dust cover
      // naturally during the final 10% of the pin. Here we only reveal its
      // inner content through the thinning particles.
      if (refs.servicesInner.current) {
        master.fromTo(
          refs.servicesInner.current,
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 1 - P.nextSectionStart, ease: "power1.out" },
          P.nextSectionStart
        );
      }

      /* ---------- Post-release: thin the dust over the services section ---------- */
      if (refs.services.current) {
        gsap.to(refs.haze.current, {
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: {
            trigger: refs.services.current,
            start: "top 45%",
            end: "top 5%",
            scrub: 0.5,
            onUpdate(self) {
              // Fade ambient dust out as the services section takes over.
              refs.dustIntensity.current = Math.max(0, 1 - self.progress) * 0.9;
            },
          },
        });
      }
    }, rootEl);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
      video.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id, active]);
}
