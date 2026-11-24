"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { createProgram, getGL, isCoarse, prefersReduced, scrollState } from "./gl";
import { hexToRgb } from "./InkField";

/**
 * THE RED ROOM — a scroll-driven, raymarched 3D sequence.
 *
 *  A  black → crimson streaks erupt from the floor and build a 3D hall of
 *     fluted pillars and arches (cel-shaded, ink hatching, fog)
 *  B  the camera dollies down the hall; the person's photo streaks in as a
 *     framed manga-ink panel
 *  C  everything melts downward in vertical pixel streaks, revealing a pure
 *     red room with a white floor, the person's name painted on the wall
 *  D  a 3D glass on a white pedestal fills with liquid poured from above
 */
const FRAG = (steps: number) => /* glsl */ `
precision highp float;
#define STEPS ${steps}
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uP;
uniform float uVel;
uniform vec2 uMouse;
uniform vec3 uRoom;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uLiquid;
uniform sampler2D uPhoto;
uniform float uPhotoAspect;
uniform float uHasPhoto;
uniform sampler2D uText;
uniform float uTextAspect;
uniform float uMobile;

float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sat(float x) { return clamp(x, 0.0, 1.0); }

/* ───────────────────────── 3D HALL ───────────────────────── */
const float SP = 2.6;

float hallMap(vec3 p, out float mat) {
  float d = p.y; mat = 0.0;                    // floor
  float ce = 4.9 - p.y;                        // ceiling
  if (ce < d) { d = ce; mat = 2.0; }

  vec3 q = p;
  q.z -= floor(q.z / SP + 0.5) * SP;           // repeat pillars along z
  q.x = abs(q.x) - 1.85;                       // two mirrored rows

  float ang = atan(q.z, q.x);
  float r = 0.3 + 0.014 * cos(ang * 16.0);     // fluting
  float col = sdCylY(q - vec3(0.0, 1.85, 0.0), r, 1.55);
  col = min(col, sdBox(q - vec3(0.0, 0.13, 0.0), vec3(0.44, 0.13, 0.44)));
  col = min(col, sdCylY(q - vec3(0.0, 0.33, 0.0), 0.39, 0.07));
  col = min(col, sdCylY(q - vec3(0.0, 3.38, 0.0), 0.37, 0.06));
  col = min(col, sdBox(q - vec3(0.0, 3.55, 0.0), vec3(0.47, 0.11, 0.47)));

  // arches between pillars
  float zc = p.z - (floor(p.z / SP) + 0.5) * SP;
  vec2 az = vec2(zc, p.y - 3.66);
  float wall = sdBox(vec3(q.x, p.y - 4.28, zc), vec3(0.2, 0.62, SP * 0.5));
  wall = max(wall, -(length(az) - (SP * 0.5 - 0.2)));
  float tor = length(vec2(length(az) - (SP * 0.5 - 0.2), q.x)) - 0.12;
  tor = max(tor, -az.y);
  float stone = min(col, min(wall, tor));
  if (stone < d) { d = stone; mat = 1.0; }

  // far back wall
  float back = p.z + 60.0;
  if (back < d) { d = back; mat = 3.0; }
  return d;
}

vec3 hallNormal(vec3 p) {
  float m; vec2 e = vec2(0.002, -0.002);
  return normalize(e.xyy * hallMap(p + e.xyy, m) + e.yyx * hallMap(p + e.yyx, m) + e.yxy * hallMap(p + e.yxy, m) + e.xxx * hallMap(p + e.xxx, m));
}

vec3 hall(vec2 uv) {
  float a = uRes.x / uRes.y;
  vec2 sc = (uv - 0.5) * vec2(a, 1.0);
  float travel = uP * 16.0;
  vec3 ro = vec3(uMouse.x * 0.35, 1.75 + uMouse.y * 0.18, 8.0 - travel);
  vec3 rd = normalize(vec3(sc.x, sc.y - 0.03, -1.35 - uMobile * 0.25));
  float yaw = uMouse.x * 0.08 + sin(uTime * 0.2) * 0.02;
  rd.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * rd.xz;

  float t = 0.0, m = 0.0, minD = 1e3;
  bool hit = false;
  for (int i = 0; i < STEPS; i++) {
    float d = hallMap(ro + rd * t, m);
    minD = min(minD, d / max(t, 0.5));
    if (d < 0.002 * t) { hit = true; break; }
    t += d * 0.9;
    if (t > 70.0) break;
  }
  vec3 fogc = uInk;
  if (!hit) return fogc;
  vec3 p = ro + rd * t;
  vec3 n = hallNormal(p);
  vec3 L = normalize(vec3(0.4, 0.9, 0.35));
  float dif = dot(n, L);
  float band = dif > 0.45 ? 1.0 : dif > -0.1 ? 0.78 : 0.5;      // cel bands
  vec3 base = m == 1.0 ? min(uRoom * 1.12, vec3(1.0)) : m == 0.0 ? uRoom * 0.72 : m == 2.0 ? uRoom * 0.22 : uRoom * 0.35;
  vec3 c = base * band;
  // ink hatching in shadow: the vertical "lining"
  float lines = step(0.55, fract(gl_FragCoord.x * 0.34 + hash11(floor(gl_FragCoord.x * 0.34)) * 0.2));
  c = mix(c, uInk, (1.0 - band) * 1.6 * lines * 0.85);
  // floor: streaky reflection of the pillars
  if (m == 0.0) {
    float s = step(0.5, fract(p.x * 6.0 + sin(p.z * 0.7) * 0.4));
    c = mix(c, uRoom * 0.75, s * 0.25);
  }
  // ink contour on silhouettes
  float rim = 1.0 - abs(dot(n, -rd));
  c = mix(c, uInk, smoothstep(0.62, 0.8, rim) * (m == 1.0 ? 1.0 : 0.0));
  // depth fog into black
  c = mix(c, fogc, 1.0 - exp(-t * 0.045));
  return c;
}

/* ───────────────── framed photo panel (manga ink) ───────────────── */
vec4 panel(vec2 uv, float reveal) {
  if (uHasPhoto < 0.5 || reveal <= 0.0) return vec4(0.0);
  float a = uRes.x / uRes.y;
  float w = uMobile > 0.5 ? 0.86 : 0.54;
  float h = w * a / 2.35;
  vec2 pc = vec2(0.5, 0.56);
  vec2 lp = (uv - pc) / vec2(w, h) + 0.5;       // 0..1 inside panel
  if (lp.x < -0.02 || lp.x > 1.02 || lp.y < -0.04 || lp.y > 1.04) return vec4(0.0);
  // streak wipe from the top
  float col = floor(uv.x * uRes.x / 4.0);
  float front = reveal * 1.6 - hash11(col) * 0.6;
  float yt = 1.0 - lp.y;
  if (yt > front) return vec4(0.0);
  bool frame = lp.x < 0.0 || lp.x > 1.0 || lp.y < 0.0 || lp.y > 1.0;
  if (frame) return vec4(uPaper, 1.0);
  // cover-crop centred on the upper third of the photo (eyes)
  float pa = uPhotoAspect;                     // w/h
  float panelA = w * a / h;
  vec2 tuv = vec2(lp.x, lp.y);
  float sy = pa / panelA;                      // fraction of photo height visible
  tuv.y = 0.64 + (tuv.y - 0.5) * sy;
  vec3 ph = texture2D(uPhoto, vec2(tuv.x, 1.0 - tuv.y)).rgb;
  float lum = dot(ph, vec3(0.299, 0.587, 0.114));
  lum = sat((lum - 0.5) * 1.6 + 0.55);
  float hatch = fract((gl_FragCoord.x + gl_FragCoord.y * 0.35) * 0.22);
  float inkAmt = lum < 0.3 ? 1.0 : lum < 0.62 ? step(hatch, 0.45) : 0.0;
  vec3 c = mix(uPaper, uInk, inkAmt);
  // streak smear just under the front
  c = mix(c, uPaper * 0.9, smoothstep(front - 0.08, front, yt) * 0.6);
  return vec4(c, 1.0);
}

/* ───────────────────── glass, liquid, pedestal ───────────────────── */
float LEVEL;  float POUR;
const vec3 BC = vec3(0.0, 0.62, 0.0);          // bowl centre

float sdGlass(vec3 p) {
  float shell = abs(length(p - BC) - 0.52) - 0.012;
  shell = max(shell, p.y - (BC.y + 0.32));       // open top
  float stem = sdCylY(p - vec3(0.0, 0.05, 0.0), 0.032, 0.1);
  float foot = sdCylY(p - vec3(0.0, -0.05, 0.0), 0.3, 0.012) - 0.006;
  return min(shell, min(stem, foot));
}

float solidMap(vec3 p, out float mat) {
  float ped = sdBox(p - vec3(0.0, -1.6, 0.0), vec3(0.55, 1.53, 0.55));
  ped = min(ped, sdBox(p - vec3(0.0, -0.1, 0.0), vec3(0.62, 0.035, 0.62)));
  float d = ped; mat = 0.0;
  // liquid inside bowl, wobbly surface
  float wob = 0.012 * sin(length(p.xz) * 26.0 - uTime * 7.0) * POUR;
  float liq = max(length(p - BC) - 0.5, p.y - (LEVEL + wob));
  if (liq < d) { d = liq; mat = 1.0; }
  // pouring stream from above
  if (POUR > 0.001) {
    vec3 s = p - vec3(0.05 * sin(p.y * 2.0 + uTime * 3.0) * 0.4, 0.0, 0.0);
    float rad = 0.028 * POUR * (1.0 + 0.25 * sin(p.y * 18.0 - uTime * 14.0));
    float stream = max(length(s.xz) - rad, LEVEL - p.y);
    if (stream < d) { d = stream; mat = 2.0; }
  }
  return d;
}

vec3 solidNormal(vec3 p) {
  float m; vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * solidMap(p + e.xyy, m) + e.yyx * solidMap(p + e.yyx, m) + e.yxy * solidMap(p + e.yxy, m) + e.xxx * solidMap(p + e.xxx, m));
}
vec3 glassNormal(vec3 p) {
  vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * sdGlass(p + e.xyy) + e.yyx * sdGlass(p + e.yyx) + e.yxy * sdGlass(p + e.yxy) + e.xxx * sdGlass(p + e.xxx));
}

/* ───────────────────────── RED ROOM ───────────────────────── */
vec3 room(vec2 uv, float textReveal, float fill) {
  float a = uRes.x / uRes.y;
  float horizon = uMobile > 0.5 ? 0.3 : 0.27;
  vec3 c;
  if (uv.y > horizon) {
    c = uRoom * (0.9 + 0.1 * uv.y);
    c *= 0.94 + 0.06 * step(0.5, fract(gl_FragCoord.x * 0.25));   // wall streak grain
  } else {
    // white floor with perspective streak hatching
    float depth = (horizon - uv.y) / horizon;
    float fx = (uv.x - 0.5) / (depth + 0.05);
    float line = step(0.82, fract(fx * 7.0 + 0.5));
    c = mix(uPaper, uInk, line * (1.0 - depth) * 0.55);
    c = mix(c, uPaper * 0.85, 1.0 - depth);
  }
  c = mix(c, uInk, smoothstep(0.004, 0.0, abs(uv.y - horizon)) * 0.9);   // skirting line

  // painted name
  vec2 tc = uMobile > 0.5 ? vec2(0.5, 0.82) : vec2(0.32, 0.66);
  float tw = uMobile > 0.5 ? 0.88 : 0.52;
  float th = tw * a / uTextAspect;
  vec2 tl = (uv - tc) / vec2(tw, th) + 0.5;
  if (tl.x > 0.0 && tl.x < 1.0 && tl.y > 0.0 && tl.y < 1.0) {
    float colx = floor(uv.x * uRes.x / 4.0);
    float front = textReveal * 1.7 - hash11(colx + 9.0) * 0.7;
    if (tl.y < front) {
      float alpha = texture2D(uText, vec2(tl.x, 1.0 - tl.y)).a;
      c = mix(c, uPaper, alpha);
    }
  }

  // glass + pedestal (raymarched, only near them)
  vec2 gc = uMobile > 0.5 ? vec2(0.5, 0.3) : vec2(0.74, 0.47);
  vec2 sc = (uv - gc) * vec2(a, 1.0) * (uMobile > 0.5 ? 1.75 : 1.0);
  if (abs(sc.x) < 0.42 && sc.y < 0.7 + POUR * 2.0) {
    vec3 ro = vec3(uMouse.x * 0.25, 0.55, 3.6);
    vec3 rd = normalize(vec3(sc.x, sc.y - 0.02, -1.5));
    rd.yz = mat2(cos(-0.1), -sin(-0.1), sin(-0.1), cos(-0.1)) * rd.yz;
    float t = 0.0, m = 0.0; bool hit = false; float minD = 1e3;
    for (int i = 0; i < 64; i++) {
      float d = solidMap(ro + rd * t, m);
      minD = min(minD, d);
      if (d < 0.001) { hit = true; break; }
      t += d;
      if (t > 8.0) break;
    }
    // glass (transparent) pass
    float tg = 0.0; bool gh = false; float gmin = 1e3;
    for (int i = 0; i < 48; i++) {
      float d = sdGlass(ro + rd * tg);
      gmin = min(gmin, d);
      if (d < 0.001) { gh = true; break; }
      tg += d;
      if (tg > 8.0) break;
    }
    if (hit) {
      vec3 p = ro + rd * t;
      vec3 n = solidNormal(p);
      vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
      float dif = dot(n, L);
      float band = dif > 0.5 ? 1.0 : dif > 0.0 ? 0.72 : 0.5;
      vec3 base = m == 0.0 ? uPaper : uLiquid;
      vec3 sc2 = base * band;
      if (m == 0.0) {
        float lines = step(0.6, fract(gl_FragCoord.x * 0.3));
        sc2 = mix(sc2, uInk, (1.0 - band) * lines * 0.9);
      } else {
        sc2 += pow(max(dot(reflect(-L, n), -rd), 0.0), 24.0) * 0.6;  // liquid spec
      }
      float rim = 1.0 - abs(dot(n, -rd));
      sc2 = mix(sc2, uInk, smoothstep(0.78, 0.92, rim));
      c = sc2;
    } else if (minD < 0.006) {
      c = uInk;     // ink silhouette
    }
    if (gh && (!hit || tg < t)) {
      vec3 n = glassNormal(ro + rd * tg);
      float fr = pow(1.0 - abs(dot(n, -rd)), 2.5);
      c = mix(c, uPaper, 0.08 + fr * 0.55);
      c = mix(c, uInk, smoothstep(0.86, 0.97, 1.0 - abs(dot(n, -rd))) * 0.85);
      float spec = pow(max(dot(reflect(rd, n), normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 40.0);
      c += spec * 0.8;
    } else if (!gh && gmin < 0.004 && (!hit)) {
      c = mix(c, uInk, 0.8);
    }
  }
  return c;
}

void main() {
  vec2 uv = vUv;
  float colId = floor(uv.x * uRes.x / 4.0);
  float r1 = hash11(colId * 1.37 + 2.0);
  float r2 = hash11(colId * 0.71 + 9.0);
  float yt = 1.0 - uv.y;

  float pA = sat(uP / 0.2);                          // rise
  float pB = sat((uP - 0.2) / 0.22);                 // panel
  float pC = sat((uP - 0.5) / 0.16);                 // melt to room
  float pT = sat((uP - 0.6) / 0.12);                 // name
  float pD = sat((uP - 0.7) / 0.28);                 // pour

  float baseLevel = BC.y - 0.5;
  LEVEL = mix(baseLevel, BC.y + 0.22, pD);
  POUR = pD > 0.0 && pD < 0.99 ? smoothstep(0.0, 0.08, pD) * (1.0 - smoothstep(0.9, 0.99, pD)) : 0.0;

  vec3 outc = uInk;
  float roomMask = step(uv.y, pC * 1.9 - r1 * 0.65 - r2 * 0.25);   // room rises in streaks

  if (roomMask < 0.5) {
    // the hall: rises in streak columns, then melts downward
    float rise = pA * 1.6 - r1 * 0.45 - r2 * 0.15;
    if (uv.y < rise || pA >= 1.0) {
      float ys = uv.y + (1.0 - pA) * 0.35 * r2;
      float melt = pC * (0.3 + 1.3 * r1 * r2) + sat(abs(uVel) * 0.002) * r2;
      float syt = max((1.0 - ys) - melt, (1.0 - ys) * 0.04);
      vec2 suv = vec2(uv.x, 1.0 - syt);
      vec3 h = hall(suv);
      vec4 pn = panel(suv, pB);
      h = mix(h, pn.rgb, pn.a);
      // hot streak front while rising
      float hot = smoothstep(0.08, 0.0, rise - uv.y) * (1.0 - pA);
      h = mix(h, uRoom * 1.25, hot);
      // melt lining
      float inMelt = step((1.0 - ys), melt);
      h *= 1.0 - inMelt * 0.35 * r2;
      outc = h;
    }
  } else {
    outc = room(uv, pT, pD);
  }

  // global film grain
  outc += (hash21(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.045;
  gl_FragColor = vec4(outc, 1.0);
}`;

function complement(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  // rotate hue 180° in a simple way, then keep it bright & saturated
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  const c: [number, number, number] = [mx + mn - r, mx + mn - g, mx + mn - b];
  const k = 1 / Math.max(...c, 0.001);
  return c.map((v) => Math.min(1, v * k * 0.95)) as [number, number, number];
}

async function textCanvas(name: string, fontVar: string, upper: boolean) {
  try {
    await document.fonts.ready;
  } catch {}
  const family = getComputedStyle(document.documentElement).getPropertyValue(fontVar).trim() || "Georgia";
  const cv = document.createElement("canvas");
  cv.width = 2048;
  cv.height = 900;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  const words = (upper ? name.toUpperCase() : name).split(/\s+/);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0]];
  let size = 380;
  const fit = () => {
    ctx.font = `italic 600 ${size}px ${family}`;
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  while (fit() > 1960 && size > 80) size -= 10;
  lines.forEach((l, i) => ctx.fillText(l, 24 + i * 90, size * 0.92 + i * size * 0.86));
  return cv;
}

async function photoCanvas(src: string): Promise<{ canvas: HTMLCanvasElement; aspect: number } | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth || 1024,
        h = img.naturalHeight || 1024;
      const s = Math.min(1, 1024 / Math.max(w, h));
      const cv = document.createElement("canvas");
      cv.width = Math.round(w * s);
      cv.height = Math.round(h * s);
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      resolve({ canvas: cv, aspect: w / h });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function Caption({ progress, range, children, className = "" }: { progress: MotionValue<number>; range: [number, number, number, number]; children: React.ReactNode; className?: string }) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, [range[0], range[3]], [40, -40]);
  return (
    <motion.div style={{ opacity, y }} className={`pointer-events-none absolute ${className}`}>
      {children}
    </motion.div>
  );
}

export default function RedRoom({
  name,
  headline,
  intro,
  photoUrl,
  room = "#e1121b",
  ink = "#070606",
  paper = "#f2ede4",
  displayFont = "--font-playfair",
  upper = false,
  labelClass = "font-mono text-[11px] uppercase tracking-[0.22em]",
}: {
  name: string;
  headline: string;
  intro: string;
  photoUrl: string;
  room?: string;
  ink?: string;
  paper?: string;
  displayFont?: string;
  upper?: boolean;
  labelClass?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const prog = useRef(0);
  useEffect(() => scrollYProgress.on("change", (v) => (prog.current = v)), [scrollYProgress]);

  useEffect(() => {
    if (prefersReduced()) {
      setFallback(true);
      return;
    }
    const el = host.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    el.appendChild(canvas);
    const gl = getGL(canvas);
    const coarse = isCoarse();
    let prog2: ReturnType<typeof createProgram>;
    if (!gl) {
      setFallback(true);
      return () => canvas.remove();
    }
    try {
      prog2 = createProgram(gl, FRAG(coarse ? 70 : 96));
    } catch (e) {
      console.warn(e);
      setFallback(true);
      return () => canvas.remove();
    }
    const { u } = prog2;
    const mkTex = (unit: number, src: TexImageSource | null) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      return tex;
    };
    mkTex(0, null);
    mkTex(1, null);
    gl.uniform1i(u("uPhoto"), 0);
    gl.uniform1i(u("uText"), 1);
    let photoAspect = 1,
      hasPhoto = 0,
      textAspect = 2048 / 900;
    let alive = true;
    photoCanvas(photoUrl).then((r) => {
      if (!alive || !r) return;
      mkTex(0, r.canvas);
      photoAspect = r.aspect;
      hasPhoto = 1;
    });
    textCanvas(name, displayFont, upper).then((cv) => {
      if (!alive) return;
      mkTex(1, cv);
      textAspect = cv.width / cv.height;
    });

    const scale = coarse ? 0.5 : Math.min(window.devicePixelRatio, 1.5) * 0.62;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * scale));
      canvas.height = Math.max(1, Math.floor(r.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const move = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", move, { passive: true });
    let visible = false;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(el);
    const start = performance.now();
    let p = 0;
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      p += (prog.current - p) * 0.09;
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uTime"), (performance.now() - start) / 1000);
      gl.uniform1f(u("uP"), p);
      gl.uniform1f(u("uVel"), scrollState.velocity);
      gl.uniform2f(u("uMouse"), mouse.x, mouse.y);
      gl.uniform3f(u("uRoom"), ...hexToRgb(room));
      gl.uniform3f(u("uInk"), ...hexToRgb(ink));
      gl.uniform3f(u("uPaper"), ...hexToRgb(paper));
      gl.uniform3f(u("uLiquid"), ...complement(room));
      gl.uniform1f(u("uPhotoAspect"), photoAspect);
      gl.uniform1f(u("uHasPhoto"), hasPhoto);
      gl.uniform1f(u("uTextAspect"), textAspect);
      gl.uniform1f(u("uMobile"), canvas.width / canvas.height < 0.9 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [photoUrl, name, room, ink, paper, displayFont, upper]);

  if (fallback) {
    // static, accessible version: the final red room
    return (
      <section className="relative overflow-hidden" style={{ background: room }} aria-label="Introduction">
        <div className="flex min-h-[80svh] flex-col justify-center px-5 py-24 md:px-10" style={{ color: paper }}>
          <p className={labelClass}>Welcome to the room of</p>
          <h2 className="font-serif text-[16vw] italic leading-[0.85] md:text-[9vw]">{name}</h2>
          {intro && <p className="mt-6 max-w-lg text-lg opacity-85">{intro}</p>}
        </div>
        <div className="h-[22svh]" style={{ background: paper }} />
      </section>
    );
  }

  return (
    <section ref={section} className="relative h-[460svh]" aria-label={`${name} — introduction`}>
      <div className="sticky top-0 h-[100svh] overflow-hidden" style={{ background: ink }}>
        <div ref={host} aria-hidden className="absolute inset-0" />
        {/* captions that ride on top of the scene */}
        <Caption progress={scrollYProgress} range={[0.02, 0.06, 0.16, 0.22]} className="inset-x-0 bottom-[12svh] flex flex-col items-center text-center">
          <span className={labelClass} style={{ color: paper }}>Enter</span>
          <span className="mt-3 font-serif text-4xl italic md:text-6xl" style={{ color: paper }}>the room</span>
        </Caption>
        <Caption progress={scrollYProgress} range={[0.3, 0.36, 0.46, 0.5]} className="inset-x-5 bottom-[9svh] md:inset-x-10">
          {intro && (
            <p className="mx-auto max-w-xl text-center text-lg leading-relaxed md:text-2xl" style={{ color: paper }}>
              {intro}
            </p>
          )}
        </Caption>
        {headline && (
          <Caption progress={scrollYProgress} range={[0.66, 0.72, 0.96, 0.995]} className="left-5 right-5 top-[30svh] md:left-10 md:right-auto md:top-[56svh] md:max-w-[40vw]">
            <p className={`${labelClass} text-center md:text-left`} style={{ color: paper }}>
              {headline}
            </p>
          </Caption>
        )}
        <Caption progress={scrollYProgress} range={[0.7, 0.76, 0.96, 0.995]} className="bottom-[6svh] left-5 md:bottom-[9svh] md:left-10">
          <span className={labelClass} style={{ color: ink }}>
            Scroll — fill the glass
          </span>
        </Caption>
      </div>
    </section>
  );
}
