/**
 * Central demo configuration.
 * All video timing values were measured by inspecting the supplied renders.
 * Adjust here — never inside components.
 */

/** Set to false to remove the bottom-right demo version switcher. */
export const SHOW_DEMO_SWITCHER = true;

/**
 * Cursor-depth (2.5D tilt) tuning.
 * `intensity` is the master dial — 1 = base feel, higher = more parallax.
 * Per-layer values are max offsets in px (and degrees for rotation).
 */
export const TILT = {
  intensity: 1.6,
  video: { x: 10, y: 7, rotX: 1.0, rotY: 1.1 },
  dust: { x: 7, y: 5 }, // kept small — big values visually cancel the wind drift
  atmosphere: { x: 5, y: 4 },
  content: { x: 3, y: 2 },
} as const;

export interface HeroTiming {
  /** Full video duration in seconds. */
  duration: number;
  /** End of the initial autoplay movement — the safest stable pause frame. */
  autoplayEnd: number;
  /** Where scroll-controlled scrubbing begins (usually === autoplayEnd). */
  scrubStart: number;
  /** When the primary action (excavator entering) begins. */
  actionStart: number;
  /** Bucket-on-logo impact moment. */
  impactTime: number;
  /** When the final dust takeover begins. */
  dustTakeoverTime: number;
  /**
   * Timestamp where the dust fully covers the screen. The scrub stops and
   * holds this frame while the next section transitions in through it.
   */
  fullCoverTime: number;
  /**
   * Whether the last frame fully covers the scene with dust.
   * When false, the Canvas dust + haze overlay complete the cover.
   */
  finalFrameFullyCovered: boolean;
}

export interface DemoVersionConfig {
  id: "version-a" | "version-b";
  label: string;
  videoSrc: string;
  posterSrc: string;
  /** object-position for the cover-fit video. */
  objectPosition: string;
  mobileObjectPosition: string;
  /** Desktop / mobile overscale so cursor tilt never exposes edges. */
  overscaleDesktop: number;
  overscaleMobile: number;
  /** Total pinned scroll distance for the hero, in vh. */
  scrollDistanceVh: number;
  timing: HeroTiming;
}

export const DEMO_VERSIONS: Record<string, DemoVersionConfig> = {
  "version-a": {
    id: "version-a",
    label: "Version A",
    videoSrc: "/media/hero-version-a.mp4",
    posterSrc: "/media/poster-version-a.jpg",
    objectPosition: "50% 42%",
    mobileObjectPosition: "62% 42%",
    overscaleDesktop: 1.08,
    overscaleMobile: 1.03,
    scrollDistanceVh: 400,
    timing: {
      duration: 10.0,
      autoplayEnd: 2.85, // client-requested first stop point (0:02.22)
      scrubStart: 2.85,
      actionStart: 4.8, // excavator enters frame right
      impactTime: 6.2, // bucket strikes the logo
      dustTakeoverTime: 8.0, // dust plume overtakes the scene
      fullCoverTime: 9.4, // dust covers the screen to its fullest here
      finalFrameFullyCovered: true, // held as the transition backdrop
    },
  },
  "version-b": {
    id: "version-b",
    label: "Version B",
    videoSrc: "/media/hero-version-b.mp4",
    posterSrc: "/media/poster-version-b.jpg",
    objectPosition: "50% 42%",
    mobileObjectPosition: "62% 42%",
    overscaleDesktop: 1.08,
    overscaleMobile: 1.03,
    scrollDistanceVh: 400,
    timing: {
      duration: 10.04,
      autoplayEnd: 2.18, // logo monolith settled after rising from the earth
      scrubStart: 2.18,
      actionStart: 3.5, // excavator bucket enters top-left
      impactTime: 4.8, // bucket digs into the logo face
      dustTakeoverTime: 7.6, // dust plume overtakes the scene
      fullCoverTime: 9.4, // pale dust covers the screen to its fullest
      finalFrameFullyCovered: true,
    },
  },
};

/**
 * Master timeline phase map (fractions of total pinned scroll progress).
 * 0–12%   autoplay handoff / stable hero
 * 12–70%  scroll-controlled video progression (scrubStart → impactTime)
 * 70–82%  impact and dust buildup (impactTime → dustTakeoverTime)
 * 82–100% dust takeover + next-section transition (→ duration)
 */
export const PHASES = {
  stableEnd: 0.12,
  progressEnd: 0.7,
  impactEnd: 0.82,
  /**
   * Progress at which the video reaches its final, fully dust-covered frame.
   * The footage itself completes the cover; the video then holds that frame
   * while the services section rises through it.
   */
  videoEndAt: 0.9,
  // Content choreography
  paragraphExitStart: 0.62,
  ctaExitStart: 0.68,
  headlineExitStart: 0.72,
  navExitStart: 0.82,
  tiltDecayStart: 0.7,
  tiltDecayEnd: 0.86,
  hazeCoverStart: 0.86,
  hazeCoverEnd: 0.93,
  nextSectionStart: 0.9,
  /**
   * The services section overlaps the pinned hero via a negative top margin
   * of this many vh — it scrolls up over the dust-covered hero during the
   * final 10% of the pin, with no transforms and no layout gaps.
   */
  nextSectionRiseVh: 40,
} as const;
