"use client";

import { useEffect, useRef, useState } from "react";
import { createProgram, getGL, NOISE, prefersReduced, scrollState } from "./gl";

/**
 * Image that "melts" into place: it is revealed column by column with
 * vertical pixel-stretch streaks as it scrolls into view, streaks with
 * scroll velocity, and ripples + chromatically splits under the pointer.
 */
const FRAG = /* glsl */ `
precision highp float;
#define OCTAVES 3
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform float uTime;
uniform float uReveal;
uniform float uVel;
uniform vec2 uMouse;
uniform float uHover;
${NOISE}

vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;

  // hover ripple
  vec2 md = vec2((uv.x - uMouse.x) * aspect, uv.y - uMouse.y);
  float d = length(md);
  uv += normalize(md + 1e-4) * sin(d * 38.0 - uTime * 6.0) * exp(-d * 5.0) * 0.012 * uHover;

  float cols = floor(uRes.x / 5.0);
  float col = floor(uv.x * cols);
  float r1 = hash11(col * 1.37 + 2.0);
  float r2 = hash11(col * 0.71 + 9.0);
  float yt = 1.0 - uv.y;

  // reveal edge per column (top -> bottom), with jagged streak fronts
  float front = uReveal * 1.9 - 0.55 * r1 - 0.25 * r2;
  // velocity smear
  float smear = clamp(abs(uVel) * 0.004, 0.0, 0.35) * r2;
  float sy = yt;
  if (yt > front) sy = front;                 // pixels below the front repeat the front row -> streaks
  sy = max(sy - smear, sy * (1.0 - smear));
  float alpha = yt > front ? smoothstep(front + 0.45 * r2 + 0.05, front, yt) : 1.0;
  alpha *= step(0.001, uReveal);

  vec2 suv = cover(vec2(uv.x, 1.0 - clamp(sy, 0.0, 1.0)));
  float split = 0.004 * uHover + smear * 0.02;
  vec3 c;
  c.r = texture2D(uTex, suv + vec2(split, 0.0)).r;
  c.g = texture2D(uTex, suv).g;
  c.b = texture2D(uTex, suv - vec2(split, 0.0)).b;

  // streaked region gets scanline shading
  float streak = step(front, yt);
  c *= 1.0 - streak * 0.35 * hash11(col + 3.0);
  c = mix(c, c * vec3(1.25, 0.55, 0.55), streak * 0.4);

  gl_FragColor = vec4(c * alpha, alpha);
}`;

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** 0..1 portion of viewport travel used for the reveal */
  revealSpan?: number;
};

export default function MeltImage({ src, alt, className = "", revealSpan = 0.55 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<"pending" | "on" | "off">("pending");

  useEffect(() => {
    if (prefersReduced()) return setGl("off");
    const el = wrap.current!;
    let cleanup: (() => void) | null = null;
    let visible = false;
    // context is created once on first approach, then only paused while off-screen
    // (a lost WebGL context cannot be re-acquired from the same canvas)
    const io = new IntersectionObserver(
      ([en]) => {
        visible = en.isIntersecting;
        if (visible && !cleanup) cleanup = start();
      },
      { rootMargin: "35% 0px" },
    );
    io.observe(el);

    function start(): () => void {
      const canvas = document.createElement("canvas");
      canvas.className = "absolute inset-0 h-full w-full";
      hostRef.current!.appendChild(canvas);
      const ctx = getGL(canvas);
      if (!ctx) {
        setGl("off");
        return () => canvas.remove();
      }
      const g = ctx;
      let prog: ReturnType<typeof createProgram>;
      try {
        prog = createProgram(g, FRAG);
      } catch {
        setGl("off");
        return () => canvas.remove();
      }
      const { u } = prog;
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      const tex = g.createTexture();
      const img = new Image();
      img.crossOrigin = "anonymous";
      let ready = false;
      let raf = 0;
      let reveal = 0;
      let peak = 0;
      const t0 = performance.now();
      const m = { x: 0.5, y: 0.5, h: 0, th: 0 };
      img.onload = () => {
        g.bindTexture(g.TEXTURE_2D, tex);
        g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, img);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
        ready = true;
        setGl("on");
      };
      img.onerror = () => setGl("off");
      img.src = src;

      const dpr = Math.min(window.devicePixelRatio, 1.75);
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(r.width * dpr));
        canvas.height = Math.max(1, Math.round(r.height * dpr));
        g.viewport(0, 0, canvas.width, canvas.height);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      const move = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        m.x = (e.clientX - r.left) / r.width;
        m.y = 1 - (e.clientY - r.top) / r.height;
        m.th = 1;
      };
      const out = () => (m.th = 0);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", out);

      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!ready || !visible) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const target = Math.min(1, Math.max(0, (vh - r.top) / (vh * revealSpan + r.height * 0.25)));
        peak = Math.max(peak, target); // one-way: once revealed it stays revealed
        reveal += (peak - reveal) * 0.07;
        m.h += (m.th - m.h) * 0.08;
        g.uniform2f(u("uRes"), canvas.width, canvas.height);
        g.uniform2f(u("uImg"), img.naturalWidth, img.naturalHeight);
        g.uniform1f(u("uTime"), (performance.now() - t0) / 1000);
        g.uniform1f(u("uReveal"), reveal);
        g.uniform1f(u("uVel"), scrollState.velocity);
        g.uniform2f(u("uMouse"), m.x, m.y);
        g.uniform1f(u("uHover"), m.h);
        g.clearColor(0, 0, 0, 0);
        g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 6);
      };
      raf = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", out);
        g.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
      };
    }
    return () => {
      io.disconnect();
      cleanup?.();
    };
  }, [src, revealSpan]);

  return (
    <div ref={wrap} className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${gl === "off" ? "opacity-100" : "opacity-0"}`}
      />
      <div ref={hostRef} aria-hidden className={gl === "off" ? "hidden" : "absolute inset-0"} />
    </div>
  );
}
