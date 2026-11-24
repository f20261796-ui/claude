"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createProgram, getGL, isCoarse, NOISE, prefersReduced } from "./gl";
import { hexToRgb } from "./InkField";

export type ShelfItem = {
  kind: string; // "Education" | "Certification"
  title: string;
  sub: string;
  meta: string;
  link?: string;
};

const PALETTE = ["#2bb5ff", "#58d64b", "#ffd21f", "#ff5aa5", "#ff7a2f", "#9b7bff", "#00d9c0", "#f2ede4"];
const MAX = 12;
const S = 1.0; // spacing between bottles (world units)
const ROW = 1.55; // vertical distance between shelves

const FRAG = /* glsl */ `
precision highp float;
#define OCTAVES 3
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uH;          // visible height in world units
uniform vec2 uCam;         // camera centre (world)
uniform float uCols;
uniform float uRows;
uniform float uCount;
uniform float uSel;
uniform float uHover;
uniform float uLift[${MAX}];
uniform vec3 uColors[${MAX}];
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uReveal;
${NOISE}

float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

// a single bottle standing at the origin (base at y=0)
float bottle(vec3 p, out float part) {
  float body = sdCylY(p - vec3(0.0, 0.34, 0.0), 0.2, 0.3) - 0.03;
  float shoulder = length(p - vec3(0.0, 0.62, 0.0)) - 0.19;
  float neck = sdCylY(p - vec3(0.0, 0.8, 0.0), 0.075, 0.09);
  float glass = smin(smin(body, shoulder, 0.12), neck, 0.06);
  float cap = length((p - vec3(0.0, 0.93, 0.0)) * vec3(1.0, 1.15, 1.0)) - 0.115;
  cap = min(cap, sdCylY(p - vec3(0.0, 0.87, 0.0), 0.11, 0.025));
  part = cap < glass ? 1.0 : 0.0;
  return min(glass, cap);
}

int ID; vec3 LOCAL; float PART; float MAT;

float map(vec3 p) {
  float d = 1e3; MAT = -1.0;
  // shelves
  for (int r = 0; r < 4; r++) {
    if (float(r) >= uRows) break;
    float y = -float(r) * ${ROW.toFixed(2)};
    float sh = sdBox(p - vec3(0.0, y - 0.06, 0.05), vec3(uCols * ${(S / 2).toFixed(2)} + 0.25, 0.06, 0.42));
    if (sh < d) { d = sh; MAT = 2.0; }
  }
  // nearest bottle by grid cell
  float row = clamp(floor(-p.y / ${ROW.toFixed(2)} + 0.5), 0.0, uRows - 1.0);
  float x0 = -(uCols - 1.0) * ${(S / 2).toFixed(2)};
  float col = clamp(floor((p.x - x0) / ${S.toFixed(2)} + 0.5), 0.0, uCols - 1.0);
  float idf = row * uCols + col;
  if (idf < uCount) {
    int id = int(idf);
    float lift = 0.0; vec3 c = vec3(0.0);
    for (int i = 0; i < ${MAX}; i++) { if (i == id) { lift = uLift[i]; } }
    vec3 q = p - vec3(x0 + col * ${S.toFixed(2)}, -row * ${ROW.toFixed(2)} + lift * 0.28, 0.0);
    float ang = lift * (uTime * 1.6) + sin(uTime * 0.7 + idf) * 0.08;
    q.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q.xz;
    float part;
    float b = bottle(q, part);
    if (b < d) { d = b; MAT = 1.0; ID = id; LOCAL = q; PART = part; }
  }
  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

vec3 wall(vec2 uv) {
  // wobbly vertical ink lines on paper
  float x = uv.x * uRes.x / uRes.y;
  float w = vnoise(vec2(x * 40.0, uv.y * 3.0)) * 0.9 + vnoise(vec2(x * 4.0, uv.y * 1.2)) * 0.6;
  float l = fract(x * 70.0 + w);
  float inkLine = smoothstep(0.55, 0.62, l) * (0.55 + 0.45 * vnoise(vec2(x * 90.0, uv.y * 8.0)));
  return mix(uPaper, uInk, inkLine * 0.92);
}

void main() {
  vec2 uv = vUv;
  float a = uRes.x / uRes.y;
  vec2 s = (uv - 0.5) * vec2(a, 1.0) * uH;
  vec3 rd = normalize(vec3(0.0, -0.16, -1.0));
  vec3 ro = vec3(s.x + uCam.x, s.y + uCam.y + 1.6, 10.0);

  // streak reveal from the top, like the rest of the site
  float colId = floor(uv.x * uRes.x / 4.0);
  float front = uReveal * 1.7 - hash11(colId) * 0.7;
  if (1.0 - uv.y > front) { gl_FragColor = vec4(uPaper, 1.0); return; }

  vec3 c = wall(uv);
  float t = 0.0; bool hit = false; float minD = 1e3;
  for (int i = 0; i < 90; i++) {
    float d = map(ro + rd * t);
    minD = min(minD, d);
    if (d < 0.0015) { hit = true; break; }
    t += d;
    if (t > 16.0) break;
  }
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    float mat = MAT;
    vec3 L = normalize(vec3(-0.5, 0.7, 0.6));
    float dif = dot(n, L);
    float band = dif > 0.45 ? 1.0 : dif > -0.05 ? 0.72 : 0.48;
    float lines = step(0.55, fract(gl_FragCoord.x * 0.33));
    if (mat == 1.0) {
      vec3 base = uColors[0];
      for (int i = 0; i < ${MAX}; i++) { if (i == ID) base = uColors[i]; }
      if (PART > 0.5) base = uPaper;                               // domed cap
      c = base * band;
      // printed label band with ink stripes (shows the spin)
      float lab = step(abs(LOCAL.y - 0.3), 0.1) * (1.0 - PART);
      float stripes = step(0.7, fract(atan(LOCAL.z, LOCAL.x) * 3.0));
      c = mix(c, mix(uPaper * band, uInk, stripes * 0.9), lab);
      // cap ridges
      c = mix(c, uInk, PART * step(0.75, fract(LOCAL.y * 40.0)) * 0.7);
      c = mix(c, uInk, (1.0 - band) * lines * 0.75);
      // glassy highlight strip
      float hl = smoothstep(0.92, 0.99, dot(reflect(rd, n), normalize(vec3(-0.6, 0.4, 0.7))));
      c = mix(c, vec3(1.0), hl * (1.0 - PART) * 0.85);
      float rim = 1.0 - abs(dot(n, -rd));
      c = mix(c, uInk, smoothstep(0.62, 0.8, rim));
    } else {
      // shelf
      c = uPaper * band;
      c = mix(c, uInk, (1.0 - band) * lines * 0.8);
      c = mix(c, uInk, smoothstep(0.85, 0.95, 1.0 - abs(dot(n, -rd))));
    }
  } else if (minD < 0.012) {
    c = uInk;   // ink silhouette
  }
  c += (hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.04;
  gl_FragColor = vec4(c, 1.0);
}`;

function layout(n: number, mobile: boolean) {
  const cols = Math.max(1, Math.min(n, mobile ? 3 : 6));
  const rows = Math.max(1, Math.ceil(n / cols));
  return { cols, rows };
}

export default function BottleShelf({
  items,
  ink = "#070606",
  paper = "#f2ede4",
  accent = "#e1121b",
  labelClass = "font-mono text-[11px] uppercase tracking-[0.2em]",
  headingClass = "font-display font-bold uppercase",
}: {
  items: ShelfItem[];
  ink?: string;
  paper?: string;
  accent?: string;
  labelClass?: string;
  headingClass?: string;
}) {
  const list = useMemo(() => items.slice(0, MAX), [items]);
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [view, setView] = useState({ w: 1, h: 1 });
  const selRef = useRef<number | null>(null);
  const hovRef = useRef<number | null>(null);
  selRef.current = sel;
  hovRef.current = hover;

  const { cols, rows } = layout(list.length, mobile);
  const colors = useMemo(() => list.map((_, i) => (i === 0 ? PALETTE[0] : PALETTE[i % PALETTE.length])), [list]);

  // world → screen mapping shared by the shader and the DOM labels
  const worldH = Math.max(rows * 1.55 + 0.9, ((cols * S + 0.8) / Math.max(0.3, view.w / view.h)));
  const camY = -((rows - 1) * 1.55) / 2 + 0.25;
  const toScreen = (x: number, y: number) => {
    const a = view.w / view.h;
    const sy = y - camY - 1.6 + 10 * 0.16; // ray tilt compensation (rd.y/rd.z = -0.16)
    return { left: (x / (a * worldH) + 0.5) * 100, top: (0.5 - sy / worldH) * 100 };
  };
  const bottlePos = (i: number) => {
    const r = Math.floor(i / cols),
      c = i % cols;
    const x0 = -(cols - 1) * (S / 2);
    return { x: x0 + c * S, y: -r * 1.55 };
  };

  useEffect(() => {
    const m = () => setMobile(window.innerWidth < 700);
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  useEffect(() => {
    if (prefersReduced() || !list.length) {
      setFallback(true);
      return;
    }
    const el = host.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    el.appendChild(canvas);
    const gl = getGL(canvas);
    if (!gl) {
      setFallback(true);
      return () => canvas.remove();
    }
    let prog: ReturnType<typeof createProgram>;
    try {
      prog = createProgram(gl, FRAG);
    } catch (e) {
      console.warn(e);
      setFallback(true);
      return () => canvas.remove();
    }
    const { u } = prog;
    const coarse = isCoarse();
    const scale = coarse ? 0.6 : Math.min(window.devicePixelRatio, 1.5) * 0.7;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * scale));
      canvas.height = Math.max(1, Math.floor(r.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      setView({ w: r.width, h: r.height });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let visible = false;
    let reveal = 0;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const lifts = new Float32Array(MAX);
    const cols3 = new Float32Array(MAX * 3);
    colors.forEach((c, i) => cols3.set(hexToRgb(c), i * 3));
    const start = performance.now();
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      reveal = Math.min(1, reveal + 0.012);
      for (let i = 0; i < MAX; i++) {
        const target = selRef.current === i ? 1 : hovRef.current === i ? 0.35 : 0;
        lifts[i] += (target - lifts[i]) * 0.12;
      }
      const r = canvas.getBoundingClientRect();
      const a = r.width / r.height;
      const lay = layout(list.length, r.width < 700);
      const H = Math.max(lay.rows * 1.55 + 0.9, (lay.cols * S + 0.8) / Math.max(0.3, a));
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uTime"), (performance.now() - start) / 1000);
      gl.uniform1f(u("uH"), H);
      gl.uniform2f(u("uCam"), 0, -((lay.rows - 1) * 1.55) / 2 + 0.25);
      gl.uniform1f(u("uCols"), lay.cols);
      gl.uniform1f(u("uRows"), lay.rows);
      gl.uniform1f(u("uCount"), list.length);
      gl.uniform1fv(u("uLift"), lifts);
      gl.uniform3fv(u("uColors"), cols3);
      gl.uniform3f(u("uInk"), ...hexToRgb(ink));
      gl.uniform3f(u("uPaper"), ...hexToRgb(paper));
      gl.uniform1f(u("uReveal"), reveal);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [list, colors, ink, paper]);

  if (!list.length) return null;
  const active = sel !== null ? list[sel] : null;
  const shelfH = mobile ? Math.max(70, rows * 34 + 14) : Math.max(62, rows * 38 + 18);

  return (
    <div ref={wrap} className="relative">
      {!fallback && (
        <div className="relative w-full overflow-hidden" style={{ height: `${shelfH}svh`, background: paper }}>
          <div ref={host} aria-hidden className="absolute inset-0" />
          {/* accessible, clickable labels sitting on the shelf under each bottle */}
          {list.map((it, i) => {
            const b = bottlePos(i);
            const pos = toScreen(b.x, b.y - 0.2);
            const top = toScreen(b.x, b.y + 1.05);
            return (
              <button
                key={i}
                type="button"
                data-cursor={sel === i ? "Close" : "Open"}
                aria-pressed={sel === i}
                aria-label={`${it.kind}: ${it.title}`}
                onClick={() => setSel(sel === i ? null : i)}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: `${pos.left}%`, top: `${top.top}%`, height: `${pos.top - top.top + 6}%`, width: `${Math.min(18, 80 / cols)}%` }}
              >
                <span
                  className={`${labelClass} absolute bottom-0 left-1/2 block w-[140%] -translate-x-1/2 truncate rounded-full px-2 py-1 text-[9px] md:text-[10px]`}
                  style={{ background: sel === i ? ink : `${paper}e6`, color: sel === i ? paper : ink }}
                >
                  {it.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {(active || fallback) && (
          <motion.div
            key={fallback ? "all" : sel}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={fallback ? "grid gap-4 md:grid-cols-2" : "relative -mt-10 px-5 md:px-10"}
          >
            {(fallback ? list : [active!]).map((it, i) => (
              <div
                key={i}
                className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border p-6 md:p-8"
                style={{ background: ink, color: paper, borderColor: `${paper}22` }}
              >
                <span className="absolute right-0 top-0 h-full w-2" style={{ background: fallback ? accent : colors[sel!] }} />
                <p className={`${labelClass} pr-16`} style={{ color: fallback ? accent : colors[sel!] }}>
                  {it.kind}
                  {it.meta ? ` · ${it.meta}` : ""}
                </p>
                <h3 className={`${headingClass} mt-3 text-3xl md:text-4xl`}>{it.title}</h3>
                {it.sub && <p className="mt-2 text-lg opacity-75">{it.sub}</p>}
                {it.link && (
                  <a href={it.link} target="_blank" rel="noopener noreferrer" className={`${labelClass} mt-5 inline-block underline underline-offset-4`}>
                    View credential ↗
                  </a>
                )}
                {!fallback && (
                  <button type="button" onClick={() => setSel(null)} className={`${labelClass} absolute right-6 top-6 opacity-60 hover:opacity-100`}>
                    Close ✕
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!fallback && !active && (
        <p className={`${labelClass} mt-4 text-center opacity-60`}>Tap a bottle to open it</p>
      )}
    </div>
  );
}
