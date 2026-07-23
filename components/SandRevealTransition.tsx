"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

/** Erosion timing/look dials. */
const REVEAL = {
  duration: 1.9, // seconds for the full unveil
  ease: "power2.inOut",
  /** Sweep direction (screen space). */
  dir: [0.8, 0.45] as const,
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uProgress; // 0 = fully covered, 1 = gone
  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uDir;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.3, 9.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 suv = vec2(uv.x * uAspect, uv.y);

    // Wind streaks: long, thin, fast-moving horizontal noise.
    float streak = fbm(suv * vec2(2.0, 26.0) + vec2(-uTime * 0.9, 0.0));
    // Granular erosion pattern, slowly drifting with the wind.
    float n = fbm(suv * 3.1 + vec2(-uTime * 0.12, 0.0));

    // Surface distortion near the erosion front (the cover being torn).
    float mBase = dot(uv, normalize(uDir)) * 0.75 + n * 0.42 + streak * 0.07;
    float p = uProgress * 1.45 - 0.12;
    float rim = smoothstep(p - 0.18, p - 0.02, mBase)
              * (1.0 - smoothstep(p, p + 0.1, mBase));
    vec2 warp = vec2(streak - 0.5, 0.0) * rim * 0.12;

    // ---- Loader surface look (matches the DOM loader beneath/behind) ----
    vec2 wuv = uv + warp;
    vec3 ink = vec3(0.031, 0.035, 0.031);
    float hazeAmt = exp(-pow(length((wuv - vec2(0.5, -0.1)) * vec2(1.15, 1.5)), 2.0) * 2.0);
    vec3 hazeTone = vec3(0.592, 0.475, 0.345);
    vec3 surface = mix(ink, hazeTone, hazeAmt * 0.24);
    surface += (hash(suv * vec2(1913.0, 1087.0) + fract(uTime) * 61.0) - 0.5) * 0.05;

    // ---- Erosion mask: ragged diagonal front ----
    float cover = smoothstep(p - 0.14, p + 0.02, mBase); // 1 = still covered

    // Sunlit sand rim right at the front — the surface igniting into sand.
    vec3 sand = vec3(0.85, 0.71, 0.52);
    vec3 col = mix(surface, sand, rim * (0.45 + streak * 0.7));

    // Sand trails blowing off just behind the front.
    float trail = (1.0 - cover)
                * smoothstep(p - 0.34, p - 0.04, mBase)
                * smoothstep(0.45, 0.85, streak);
    col = mix(col, sand, trail * 0.8);

    float alpha = cover + trail * 0.5;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

/**
 * Full-screen sand-erosion unveil: the dark loader surface is sandblasted
 * away along a ragged diagonal front, with a sunlit rim and wind streaks,
 * revealing the hero beneath. One quad, one draw call.
 */
export function SandRevealTransition({
  onCovered,
  onDone,
  onProgress,
}: {
  /** Fired once the canvas has painted its first (fully covering) frame. */
  onCovered: () => void;
  onDone: () => void;
  /** Fired every frame with the eased unveil progress (0..1). */
  onProgress?: (p: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    } catch {
      // No WebGL — skip straight through.
      onCovered();
      onDone();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uAspect: { value: window.innerWidth / Math.max(window.innerHeight, 1) },
      uDir: { value: new THREE.Vector2(...REVEAL.dir) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    let raf = 0;
    let covered = false;
    const start = performance.now();
    const loop = (now: number) => {
      uniforms.uTime.value = (now - start) / 1000;
      renderer.render(scene, camera);
      if (!covered) {
        covered = true;
        onCovered(); // first opaque frame is up — safe to drop the DOM loader
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const tween = gsap.to(uniforms.uProgress, {
      value: 1,
      duration: REVEAL.duration,
      delay: 0.15,
      ease: REVEAL.ease,
      onUpdate: () => onProgress?.(uniforms.uProgress.value),
      onComplete: () => {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      },
    });

    return () => {
      tween.kill();
      cancelAnimationFrame(raf);
      mat.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[110] h-full w-full"
      aria-hidden
    />
  );
}
