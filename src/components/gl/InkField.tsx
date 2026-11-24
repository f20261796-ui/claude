"use client";

import { useEffect, useRef } from "react";
import { createProgram, getGL, isCoarse, NOISE, prefersReduced, scrollState } from "./gl";

/**
 * Full-bleed procedural "blood ink" field.
 *  - red lacquer with warped black ink grain (like hand-inked wood)
 *  - liquid lens that follows the pointer
 *  - click / tap spawns ripple splashes
 *  - scroll progress melts the image downward in vertical pixel streaks
 */
const FRAG = (octaves: number) => /* glsl */ `
precision highp float;
#define OCTAVES ${octaves}
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uMouseAmt;
uniform float uMelt;
uniform float uVel;
uniform vec3 uRipples[6];
uniform vec3 uInk;
uniform vec3 uBase;
uniform vec3 uLine;
uniform float uVignette;
${NOISE}

vec3 scene(vec2 uv, float t) {
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // slow domain-warped ink
  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t * 0.05)), fbm(p * 1.4 + vec2(5.2, 1.3) - t * 0.04));
  float f = fbm(p * 1.8 + 2.2 * q + vec2(t * 0.02, 0.0));

  // vertical ink grain lines, warped (hand-inked wood look)
  float g = p.x * 26.0 + f * 9.0 + sin(p.y * 3.0 + q.x * 4.0) * 1.4;
  float grain = smoothstep(0.86, 0.97, abs(sin(g)));
  float breakup = smoothstep(0.35, 0.65, vnoise(vec2(p.x * 30.0, p.y * 2.5 + t * 0.03)));
  grain *= breakup;

  // red mass vs black void
  float mass = smoothstep(0.42, 0.62, f + 0.25 * q.y - 0.12 * (1.0 - uv.y));
  vec3 blood = uInk;
  vec3 deep = mix(uBase, uInk, 0.38);
  vec3 col = mix(uBase, mix(deep, blood, smoothstep(0.45, 0.85, f + q.x * 0.3)), mass);
  col = mix(col, uLine, grain * mass * 0.95);

  // ink edge highlight (manga contour)
  float edge = smoothstep(0.02, 0.0, abs(f + 0.25 * q.y - 0.12 * (1.0 - uv.y) - 0.52));
  col = mix(col, uLine, edge * 0.8);

  // liquid pool under the pointer
  vec2 mp = vec2(uMouse.x * aspect, uMouse.y);
  float d = length(p - mp);
  float pool = smoothstep(0.22, 0.0, d + 0.06 * (vnoise(p * 8.0 + t) - 0.5)) * uMouseAmt;
  col = mix(col, min(uInk * 1.15 + 0.08, vec3(1.0)), pool * 0.85);
  col += vec3(1.0, 0.75, 0.7) * smoothstep(0.05, 0.0, abs(d - 0.12 - 0.02 * sin(t * 3.0))) * uMouseAmt * 0.25;
  return col;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  float t = uTime;

  // ripples
  for (int i = 0; i < 6; i++) {
    vec3 r = uRipples[i];
    float age = t - r.z;
    if (age < 0.0 || age > 4.0) continue;
    vec2 dir = vec2((uv.x - r.x) * aspect, uv.y - r.y);
    float dist = length(dir);
    float wave = sin(dist * 45.0 - age * 9.0) * exp(-dist * 4.0) * exp(-age * 1.1);
    uv += normalize(dir + 1e-4) * wave * 0.018;
  }

  // lens distortion near pointer
  vec2 md = vec2((uv.x - uMouse.x) * aspect, uv.y - uMouse.y);
  uv -= md * 0.18 * exp(-dot(md, md) * 18.0) * uMouseAmt;

  // vertical pixel-melt: columns drip downward with scroll + velocity
  float cols = 140.0;
  float col = floor(uv.x * cols);
  float rnd = hash11(col * 1.7 + 3.1);
  float rnd2 = hash11(col * 0.37 + 11.0);
  float yt = 1.0 - uv.y;
  float edge = uMelt * (0.25 + 1.1 * rnd * rnd2) + abs(uVel) * 0.02 * rnd;
  float sy = max(yt - edge, yt * 0.04);
  vec2 suv = vec2(uv.x, 1.0 - sy);

  vec3 c = scene(suv, t);

  // streak shading inside the melted region
  float inMelt = step(yt, edge);
  c *= 1.0 - inMelt * 0.25 * hash11(col + 7.0);

  // vignette + grain
  vec2 vv = vUv - 0.5;
  c = mix(c, c * (1.0 - dot(vv, vv) * 1.1), uVignette);
  c += (hash21(vUv * uRes + fract(t) * 100.0) - 0.5) * 0.05;
  gl_FragColor = vec4(c, 1.0);
}`;

export const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default function InkField({
  melt,
  className = "",
  ink = "#e1121b",
  base = "#070606",
  line = "#050404",
  vignette = 1,
}: {
  melt?: { current: number };
  className?: string;
  ink?: string;
  base?: string;
  line?: string;
  vignette?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fallback = useRef(0);
  const meltRef = melt ?? fallback;

  useEffect(() => {
    // fresh canvas per effect run: a context lost in cleanup can never be re-acquired
    const host = hostRef.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    host.appendChild(canvas);
    const gl = getGL(canvas);
    if (!gl) {
      host.style.background = "radial-gradient(120% 80% at 70% 30%, #8b0008, #070606 60%)";
      return () => canvas.remove();
    }
    const coarse = isCoarse();
    const reduced = prefersReduced();
    let prog: ReturnType<typeof createProgram>;
    try {
      prog = createProgram(gl, FRAG(coarse ? 3 : 5));
    } catch (e) {
      console.warn(e);
      host.style.background = "radial-gradient(120% 80% at 70% 30%, #8b0008, #070606 60%)";
      return () => canvas.remove();
    }
    const { u } = prog;
    const scale = coarse ? 0.55 : Math.min(window.devicePixelRatio, 1.5) * 0.75;
    const ripples = new Float32Array(18).fill(-100);
    let rippleIdx = 0;
    const mouse = { x: 0.65, y: 0.5, tx: 0.65, ty: 0.5, amt: 0, tamt: coarse ? 0.0 : 0.0 };
    let visible = true;
    let raf = 0;
    const start = performance.now();
    let melt = meltRef.current;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * scale));
      canvas.height = Math.max(1, Math.floor(r.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const toLocal = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: (cx - r.left) / r.width, y: 1 - (cy - r.top) / r.height };
    };
    const onMove = (e: PointerEvent) => {
      const p = toLocal(e.clientX, e.clientY);
      mouse.tx = p.x;
      mouse.ty = p.y;
      mouse.tamt = p.y >= 0 && p.y <= 1 ? 1 : 0;
    };
    const spawn = (x: number, y: number) => {
      const t = (performance.now() - start) / 1000;
      ripples.set([x, y, t], rippleIdx * 3);
      rippleIdx = (rippleIdx + 1) % 6;
    };
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e.clientX, e.clientY);
      if (p.y >= 0 && p.y <= 1) spawn(p.x, p.y);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    const leave = () => (mouse.tamt = 0);
    document.addEventListener("pointerleave", leave);

    // ambient drips on touch devices so the scene still feels alive
    const ambient = coarse
      ? window.setInterval(() => visible && spawn(0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.5), 2600)
      : 0;

    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(canvas);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = (performance.now() - start) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      mouse.amt += (mouse.tamt - mouse.amt) * 0.05;
      melt += (meltRef.current - melt) * 0.12;
      gl.uniform1f(u("uTime"), reduced ? 4.0 : t);
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform2f(u("uMouse"), mouse.x, mouse.y);
      gl.uniform1f(u("uMouseAmt"), reduced ? 0 : mouse.amt);
      gl.uniform1f(u("uMelt"), melt);
      gl.uniform1f(u("uVel"), reduced ? 0 : Math.min(40, scrollState.velocity));
      gl.uniform3fv(u("uRipples"), ripples);
      gl.uniform3f(u("uInk"), ...hexToRgb(ink));
      gl.uniform3f(u("uBase"), ...hexToRgb(base));
      gl.uniform3f(u("uLine"), ...hexToRgb(line));
      gl.uniform1f(u("uVignette"), vignette);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (reduced) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(ambient);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", leave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} aria-hidden className={`h-full w-full ${className}`} />;
}
