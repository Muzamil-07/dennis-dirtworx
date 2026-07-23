/**
 * Lightweight Canvas dust particle engine.
 * Earth-toned motes drifting sideways with soft edges — not snow, not circles.
 * `intensity` (0..1) is driven by the hero scroll timeline:
 *   ~0.25 = ambient hero dust, 1 = full takeover.
 */

interface Particle {
  x: number;
  y: number;
  /** Base horizontal / vertical drift (px/s at intensity 0). */
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  tone: number; // 0..1 pick between dust tones
  wobblePhase: number;
  wobbleSpeed: number;
  stretch: number; // horizontal elongation for a wind-blown look
  depth: number; // 0 far .. 1 near — scales cursor response + takeover growth
}

export interface DustEngine {
  setIntensity(v: number): void;
  setCursorInfluence(x: number, y: number): void;
  resize(): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

export function createDustEngine(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion?: boolean } = {}
): DustEngine {
  const ctx = canvas.getContext("2d");
  let particles: Particle[] = [];
  let raf = 0;
  let running = false;
  let last = 0;
  let intensity = 0.25;
  let cursorX = 0; // -1..1 smoothed externally
  let cursorY = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;

  // Pre-rendered soft sprite (radial falloff) to keep per-frame cost low.
  const sprite = document.createElement("canvas");
  const SPRITE = 64;
  sprite.width = SPRITE;
  sprite.height = SPRITE;
  const sctx = sprite.getContext("2d")!;
  const grad = sctx.createRadialGradient(
    SPRITE / 2, SPRITE / 2, 0,
    SPRITE / 2, SPRITE / 2, SPRITE / 2
  );
  grad.addColorStop(0, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, SPRITE, SPRITE);

  function particleCount(): number {
    if (opts.reducedMotion) return 0;
    const area = width * height;
    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const base = Math.round(area / 24000); // ~90 on 1080p
    const capability = cores <= 4 ? 0.55 : 1;
    const mobile = width < 768 ? 0.5 : 1;
    return Math.max(18, Math.min(140, Math.round(base * capability * mobile)));
  }

  function spawn(randomX = true): Particle {
    const depth = Math.random();
    return {
      x: randomX ? Math.random() * width : -40,
      y: Math.random() * height,
      vx: 8 + Math.random() * 22 + depth * 14,
      vy: (Math.random() - 0.45) * 6,
      size: (6 + Math.random() * 26) * (0.6 + depth * 0.8),
      baseAlpha: 0.03 + Math.random() * 0.09,
      tone: Math.random(),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.2 + Math.random() * 0.5,
      stretch: 1.15 + Math.random() * 0.9,
      depth,
    };
  }

  function build() {
    const n = particleCount();
    particles = Array.from({ length: n }, () => spawn(true));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    build();
  }

  function frame(now: number) {
    if (!running || !ctx) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Takeover boost: particles speed up, grow, brighten and drift toward viewer.
    const takeover = Math.max(0, (intensity - 0.45) / 0.55); // 0..1

    for (const p of particles) {
      p.wobblePhase += p.wobbleSpeed * dt;
      const speedMul = 1 + intensity * 2.2 + takeover * 2.5;
      p.x += (p.vx * speedMul + cursorX * 26 * p.depth) * dt;
      p.y +=
        (p.vy + Math.sin(p.wobblePhase) * 4 + cursorY * 14 * p.depth - takeover * 22 * p.depth) *
        dt;

      if (p.x - p.size > width + 60) { Object.assign(p, spawn(false)); continue; }
      if (p.y < -80) p.y = height + 60;
      if (p.y > height + 80) p.y = -60;

      const grow = 1 + takeover * 2.4 * (0.4 + p.depth);
      const alpha = Math.min(0.55, p.baseAlpha * (0.9 + intensity * 2.6 + takeover * 3));

      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.stretch * grow, grow);
      ctx.drawImage(sprite, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Earth-tone wash so white sprites read as dust, plus takeover haze.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(168, 138, 100, 0.9)`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    if (takeover > 0.01) {
      const haze = ctx.createRadialGradient(
        width * 0.5, height * 0.62, height * 0.1,
        width * 0.5, height * 0.62, height * 0.95
      );
      haze.addColorStop(0, `rgba(150, 120, 88, ${0.34 * takeover})`);
      haze.addColorStop(1, `rgba(96, 76, 56, ${0.5 * takeover})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
    }

    raf = requestAnimationFrame(frame);
  }

  return {
    setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },
    setCursorInfluence(x, y) { cursorX = x; cursorY = y; },
    resize,
    start() {
      if (running || opts.reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      particles = [];
    },
  };
}
