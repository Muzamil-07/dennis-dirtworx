/**
 * WebGL surface-level sand drift (three.js).
 *
 * Realism recipe:
 *  - three co-moving scales (haze veils / wisps / grains) blended together
 *  - particles gathered into wavy drift streams, not uniform scatter
 *  - each mote samples one of 4 pre-generated ORGANIC puff textures
 *    (cloudy, irregular silhouettes) instead of a perfect gaussian blob,
 *    with slow per-particle rotation — this is what removes the
 *    "airbrushed dots" look
 *  - one shared gust curve modulates all speeds so the whole field
 *    breathes together like real wind
 *
 * Optimised: one THREE.Points draw call, one 256px texture, all motion in
 * the vertex shader. Falls back to the 2D canvas engine without WebGL.
 */
import * as THREE from "three";
import type { DustEngine } from "./dust-engine";

/** Sand look/behaviour tuning — all the dials live here. */
const SAND = {
  /**
   * Global speed multiplier — scales ALL sand motion (drift, gusts,
   * tumble, lift). 1 = current feel, 0.5 = half speed, 2 = double.
   */
  speed: 1.0,
  /** Particle counts: [mobile, low-core desktop, desktop]. */
  count: [900, 1800, 2800] as const,
  /** Share of particles per band: haze veils / wisps / grains.
      Grains disabled — they read as visible specks inside the haze. */
  bandSplit: [0.4, 0.6, 0.0] as const,
  /** Size ranges px per band (before depth/takeover scaling). */
  size: [
    [130, 260], // haze veils
    [42, 96], // wisps
    [6, 18], // grains
  ] as const,
  /** Alpha multiplier per band (veils stay faint, grains pop slightly). */
  bandAlpha: [0.5, 0.85, 1.4] as const,
  /** Horizontal drift speed range (screen-widths/s far → near). */
  speedFar: 0.012,
  speedNear: 0.05,
  /** Base opacity range far → near. */
  alphaFar: 0.09,
  alphaNear: 0.22,
  /** Horizontal wind-stretch of each mote (1 = round). */
  stretch: 2.2,
  /** How strongly particles gather into wavy drift streams (0 = off). */
  streamAmp: 0.045,
  /** Max slow rotation speed of a mote (rad/s). Keep tiny — heavy air. */
  spin: 0.08,
  /* ---- Cursor interaction (sand disperses around a moving cursor) ---- */
  /** Radius of the disturbance, in fraction of screen height (~0.25 ≈ 25%). */
  pointerRadius: 0.24,
  /** How far disturbed sand is pushed (NDC units). */
  pointerPush: 0.17,
  /** How much disturbed sand fades (0..1). */
  pointerFade: 0.85,
  /** Disturbance decay per frame once the cursor rests (closer to 1 = lingers). */
  pointerDecay: 0.94,
} as const;

const VERT = /* glsl */ `
  attribute vec3 aSeed;   // x0, y0, rand
  attribute float aDepth; // 0 far .. 1 near
  attribute float aSize;
  attribute float aAlpha; // per-particle alpha variation
  attribute float aCell;  // which of the 4 puff textures
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uCursor;
  uniform float uPixelRatio;
  uniform float uSpeedFar;
  uniform float uSpeedNear;
  uniform float uStreamAmp;
  uniform float uAlphaFar;
  uniform float uAlphaNear;
  uniform float uSpin;
  uniform float uLift; // smoothed, slow-to-descend takeover position driver
  uniform vec2 uPointer;   // cursor in NDC
  uniform float uPush;     // disturbance strength (rises with cursor speed)
  uniform float uAspect;
  uniform float uPtrRadius;
  uniform float uPtrPush;
  uniform float uPtrFade;
  varying float vAlpha;
  varying float vDepth;
  varying float vRot;
  varying float vCell;

  void main() {
    // Position uses uLift (latched — barely descends while fading out),
    // density/alpha uses the live intensity. This prevents the dust from
    // visibly sinking back down while the next section takes over.
    float takeover = uLift;

    // One shared gust curve — the whole field breathes together.
    float wind = 1.0 + 0.35 * sin(uTime * 0.10) + 0.18 * sin(uTime * 0.023 + 2.1);

    float speed = mix(uSpeedFar, uSpeedNear, aDepth) * wind * (1.0 + uIntensity * 2.0);
    float gust = sin(uTime * 0.16 + aSeed.z * 6.2831) * 0.05 * aDepth;
    float x = mod(aSeed.x + uTime * speed + gust + 1.1, 2.2) - 1.1;

    // Ground band with wavy drift streams.
    float groundY = mix(-0.42, -1.04, aSeed.y);
    float stream = sin(x * 2.6 + aSeed.z * 9.0 + uTime * 0.12)
                 * uStreamAmp * (0.4 + aDepth);
    float turb = sin(uTime * (0.22 + aSeed.z * 0.5) + aSeed.x * 21.0)
               * mix(0.006, 0.022, aDepth) * (1.0 + uIntensity);

    // Takeover: the field lifts and fills the whole viewport.
    float liftY = mix(-1.0, 1.1, fract(aSeed.y * 7.31 + uTime * (0.03 + 0.05 * aDepth)));
    float y = mix(groundY + stream + turb, liftY, takeover);

    vec2 pos = vec2(x, y);

    // --- Cursor disturbance: irregular, organic dispersal. Each particle
    // has its own effective radius (fuzzy, non-circular boundary), its own
    // scatter direction (blend of radial + random + swirl) and its own
    // time-wobbling push strength — so the sand breaks apart in a ragged,
    // natural shape rather than a clean circle. ---
    vec2 dp = (pos - uPointer) * vec2(uAspect, 1.0);
    float dist = length(dp);
    // Per-particle radius: 0.55×..1.45× of the base — ragged edge.
    float rr = uPtrRadius * (0.55 + fract(aSeed.z * 13.7) * 0.9);
    float infl = exp(-(dist * dist) / (rr * rr)) * uPush;
    vec2 dir = dist > 0.001 ? dp / dist : vec2(0.0, 1.0);
    // Random per-particle escape direction, slowly wandering over time.
    float theta = aSeed.z * 6.2831 + sin(uTime * 0.7 + aSeed.x * 13.0) * 0.9;
    vec2 randDir = vec2(cos(theta), sin(theta));
    vec2 swirl = vec2(-dir.y, dir.x) * (aSeed.z - 0.5) * 2.0;
    vec2 escape = normalize(dir * 0.45 + randDir * 0.75 + swirl * 0.4);
    // Per-particle magnitude with a slow breathing wobble.
    float mag = (0.35 + fract(aSeed.z * 7.31) * 1.3)
              * (1.0 + 0.35 * sin(uTime * 1.3 + aSeed.x * 31.0));
    pos += escape * infl * uPtrPush * mag / vec2(uAspect, 1.0);

    gl_Position = vec4(pos, 0.0, 1.0);

    float size = aSize * mix(0.6, 1.4, aDepth) * (1.0 + takeover * 2.2) * uPixelRatio;
    gl_PointSize = min(size, 300.0);

    float groundFade = smoothstep(-0.28, -0.6, y);
    float base = mix(uAlphaFar, uAlphaNear, aDepth) * (0.55 + uIntensity * 1.9);
    vAlpha = base * aAlpha * mix(groundFade, 1.0, takeover);
    // Disturbed sand thins out — randomly per particle, like real dispersal.
    vAlpha *= 1.0 - infl * uPtrFade * (0.6 + aSeed.z * 0.7);
    vDepth = aDepth;
    // Slow per-particle tumble, alternating direction.
    float spinDir = aSeed.z < 0.5 ? 1.0 : -1.0;
    vRot = aSeed.z * 6.2831 + uTime * uSpin * spinDir * (0.4 + aSeed.z);
    vCell = aCell;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D uTex;
  uniform float uStretch;
  varying float vAlpha;
  varying float vDepth;
  varying float vRot;
  varying float vCell;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    p = mat2(c, -s, s, c) * p;
    // Wind-stretch: compress the sample along x so the puff appears elongated.
    p.x /= uStretch;
    // Keep the sample inside its atlas cell (slight inset avoids bleeding).
    vec2 uv = clamp(p * 0.92 + 0.5, 0.02, 0.98);
    vec2 cell = vec2(mod(vCell, 2.0), floor(vCell * 0.5));
    float tex = texture2D(uTex, (uv + cell) * 0.5).a;
    // Extra radial falloff guarantees no square edges even when rotated.
    float fade = smoothstep(0.5, 0.18, length(p));

    vec3 tone = mix(vec3(0.80, 0.68, 0.52), vec3(0.58, 0.47, 0.36), vDepth);
    gl_FragColor = vec4(tone, tex * fade * vAlpha);
  }
`;

/** 2×2 atlas of irregular, cloudy puffs built from stacked soft blobs. */
function makePuffAtlas(): THREE.CanvasTexture {
  const SIZE = 256;
  const CELL = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext("2d")!;
  for (let cy = 0; cy < 2; cy++) {
    for (let cx = 0; cx < 2; cx++) {
      const ox = cx * CELL + CELL / 2;
      const oy = cy * CELL + CELL / 2;
      const blobs = 30 + Math.floor(Math.random() * 16);
      for (let i = 0; i < blobs; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.pow(Math.random(), 1.7) * CELL * 0.3;
        const bx = ox + Math.cos(ang) * rad * 1.3; // wider than tall
        const by = oy + Math.sin(ang) * rad * 0.75;
        const br = 7 + Math.random() * 24;
        const alpha = 0.05 + Math.random() * 0.09;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function createSandEngine(canvas: HTMLCanvasElement): DustEngine {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const COUNT = isMobile ? SAND.count[0] : cores <= 4 ? SAND.count[1] : SAND.count[2];

  const seeds = new Float32Array(COUNT * 3);
  const depths = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);
  const alphas = new Float32Array(COUNT);
  const cells = new Float32Array(COUNT);
  const [veilShare, wispShare] = SAND.bandSplit;
  for (let i = 0; i < COUNT; i++) {
    const r = Math.random();
    const band = r < veilShare ? 0 : r < veilShare + wispShare ? 1 : 2;
    const [sMin, sMax] = SAND.size[band];
    seeds[i * 3] = Math.random() * 2.2;
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
    depths[i] = Math.random();
    sizes[i] = sMin + Math.random() * (sMax - sMin);
    alphas[i] = SAND.bandAlpha[band] * (0.55 + Math.random() * 0.9);
    cells[i] = Math.floor(Math.random() * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute("aCell", new THREE.BufferAttribute(cells, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

  const atlas = makePuffAtlas();
  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0.25 },
    uCursor: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: 1 },
    uSpeedFar: { value: SAND.speedFar },
    uSpeedNear: { value: SAND.speedNear },
    uAlphaFar: { value: SAND.alphaFar },
    uAlphaNear: { value: SAND.alphaNear },
    uStretch: { value: SAND.stretch },
    uStreamAmp: { value: SAND.streamAmp },
    uSpin: { value: SAND.spin },
    uLift: { value: 0 },
    uTex: { value: atlas },
    uPointer: { value: new THREE.Vector2(0, -2) }, // start off-screen
    uPush: { value: 0 },
    uAspect: { value: 1 },
    uPtrRadius: { value: SAND.pointerRadius },
    uPtrPush: { value: SAND.pointerPush },
    uPtrFade: { value: SAND.pointerFade },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  scene.add(new THREE.Points(geo, mat));

  let raf = 0;
  let running = false;
  let last = 0;
  const cursorTarget = new THREE.Vector2();

  // Pointer disturbance: strength rises with cursor speed, decays at rest.
  const pointerTarget = new THREE.Vector2(0, -2);
  let pushTarget = 0;
  const onPointerMove = (e: PointerEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    const speed = Math.hypot(nx - pointerTarget.x, ny - pointerTarget.y);
    pointerTarget.set(nx, ny);
    pushTarget = Math.min(1, pushTarget + speed * 3.5);
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    uniforms.uTime.value += dt * SAND.speed;
    uniforms.uCursor.value.lerp(cursorTarget, 0.04);

    // Asymmetric takeover smoothing: rises quickly with intensity, but
    // descends ~8× slower — so while the next section appears the dust
    // fades out in place instead of visibly sinking back down.
    const I = uniforms.uIntensity.value;
    const x = Math.min(Math.max((I - 0.45) / 0.55, 0), 1);
    const target = x * x * (3 - 2 * x);
    const lift = uniforms.uLift.value;
    uniforms.uLift.value += (target - lift) * (target > lift ? 0.1 : 0.012);

    // Pointer disturbance follows the cursor responsively, then fades so
    // the sand flows back through once the cursor rests.
    uniforms.uPointer.value.lerp(pointerTarget, 0.16);
    pushTarget *= SAND.pointerDecay;
    uniforms.uPush.value += (pushTarget - uniforms.uPush.value) * 0.13;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  return {
    setIntensity(v) {
      uniforms.uIntensity.value = Math.max(0, Math.min(1, v));
    },
    setCursorInfluence(x, y) {
      cursorTarget.set(x, -y);
    },
    resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(rect.width, rect.height, false);
      uniforms.uPixelRatio.value = dpr;
      uniforms.uAspect.value = rect.width / Math.max(rect.height, 1);
    },
    start() {
      if (running) return;
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
      window.removeEventListener("pointermove", onPointerMove);
      geo.dispose();
      mat.dispose();
      atlas.dispose();
      renderer.dispose();
    },
  };
}
