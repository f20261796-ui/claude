"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createProgram, getGL, isCoarse, NOISE, prefersReduced } from "./gl";

/**
 * Landing entrance. A red, ink-grained surface. Hold the white circle: a 3D
 * inked hand reaches in and presses the surface, it splashes and ripples,
 * then a portal tears open in vertical streaks onto the website.
 */
const FRAG = /* glsl */ `
precision highp float;
#define OCTAVES 4
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uBtn;        // target in world coords (z = 0 plane)
uniform float uHold;      // 0..1 how far the hand has reached
uniform float uPress;     // seconds since the press (-1 before)
uniform float uPortal;    // 0..1 portal opening
uniform float uHandScale;
${NOISE}

float sat(float x) { return clamp(x, 0.0, 1.0); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 pa = p - a, ba = b - a;
  float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(ra, rb, h);
}
float sdRoundBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float smin(float a, float b, float k) { float h = sat(0.5 + 0.5 * (b - a) / k); return mix(b, a, h) - k * h * (1.0 - h); }

/* ── the hand, in its own space: arm along +x, index finger toward -x ── */
const vec3 TIP = vec3(-1.02, 0.0, 0.1);
float finger(vec3 p, vec3 k, vec3 d1, vec3 d2, vec3 d3, float r) {
  vec3 a = k + d1, b = a + d2, c = b + d3;
  float f = sdCapsule(p, k, a, r, r * 0.95);
  f = smin(f, sdCapsule(p, a, b, r * 0.95, r * 0.88), 0.02);
  return smin(f, sdCapsule(p, b, c, r * 0.88, r * 0.8), 0.02);
}
float hand(vec3 p) {
  float palm = sdRoundBox(p - vec3(-0.12, 0.0, 0.0), vec3(0.26, 0.07, 0.25), 0.07);
  // index — straight, pointing
  float idx = finger(p, vec3(-0.42, 0.02, 0.17), vec3(-0.25, 0.0, -0.01), vec3(-0.19, -0.01, -0.02), vec3(-0.15, -0.01, -0.03), 0.062);
  // middle / ring / pinky — curled under the palm
  float mid = finger(p, vec3(-0.43, 0.0, 0.04), vec3(-0.17, -0.1, 0.0), vec3(0.02, -0.15, 0.0), vec3(0.11, -0.03, 0.0), 0.064);
  float rng = finger(p, vec3(-0.4, 0.0, -0.08), vec3(-0.15, -0.1, -0.01), vec3(0.02, -0.14, 0.0), vec3(0.1, -0.03, 0.0), 0.06);
  float pky = finger(p, vec3(-0.35, -0.01, -0.19), vec3(-0.12, -0.08, -0.02), vec3(0.02, -0.11, 0.0), vec3(0.08, -0.02, 0.0), 0.052);
  // thumb — tucked along the index
  float thb = finger(p, vec3(-0.05, -0.05, 0.26), vec3(-0.17, -0.05, 0.08), vec3(-0.14, -0.03, -0.02), vec3(-0.08, 0.0, -0.04), 0.07);
  // wrist + forearm (sleeve beyond)
  float arm = sdCapsule(p, vec3(0.12, 0.0, 0.0), vec3(2.8, 0.05, -0.05), 0.2, 0.27);
  float h = smin(palm, idx, 0.05);
  h = smin(h, mid, 0.05);
  h = smin(h, rng, 0.05);
  h = smin(h, pky, 0.05);
  h = smin(h, thb, 0.06);
  h = smin(h, arm, 0.12);
  return h;
}

// world → hand space. The fingertip sits on uBtn, lifted while reaching.
float YAW; float PITCH; vec3 TIPW;
vec3 toHand(vec3 p) {
  vec3 q = (p - TIPW) / uHandScale;
  q.xy = rot(YAW) * q.xy;
  q.xz = rot(PITCH) * q.xz;
  return q + TIP;
}
float map(vec3 p) { return hand(toHand(p)) * uHandScale; }
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.002, -0.002);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

/* ── red ink surface ── */
vec3 surface(vec2 w, float t) {
  vec2 p = w * 1.3;
  vec2 q = vec2(fbm(p * 0.9 + vec2(0.0, t * 0.03)), fbm(p * 0.9 + vec2(5.2, 1.3) - t * 0.02));
  float f = fbm(p * 1.2 + 1.6 * q);
  float g = p.x * 9.0 + f * 5.0 + sin(p.y * 2.0 + q.x * 3.0) * 1.2 + p.y * 1.2;
  float grain = smoothstep(0.9, 0.975, abs(sin(g)));
  grain *= smoothstep(0.3, 0.6, vnoise(vec2(p.x * 14.0, p.y * 1.6)));
  vec3 red = mix(vec3(0.62, 0.02, 0.06), vec3(0.93, 0.08, 0.13), smoothstep(0.3, 0.8, f + q.y * 0.4));
  vec3 c = mix(red, vec3(0.02), grain);
  // small ink flecks
  float fleck = step(0.996, hash21(floor(p * 60.0)));
  return mix(c, vec3(0.03), fleck * 0.8);
}

void main() {
  float a = uRes.x / uRes.y;
  vec2 s = (vUv - 0.5) * vec2(a, 1.0) * 2.0;   // world coords on the surface (half-height = 1)
  float t = uTime;

  // hand pose: arm from the bottom-right corner toward the target
  vec2 corner = vec2(a * 1.25, -1.35);
  vec2 dir = normalize(corner - uBtn);
  YAW = atan(dir.y, dir.x);
  float lift = mix(1.1, 0.0, smoothstep(0.0, 1.0, uHold));
  float idle = (1.0 - uHold) * 0.06 * sin(t * 1.4);
  // before holding the hand rests at the corner, peeking in
  vec2 rest = mix(uBtn, corner - dir * 0.9, 1.0 - smoothstep(0.0, 0.35, uHold));
  float pressDip = uPress >= 0.0 ? -0.05 * exp(-uPress * 6.0) : 0.0;
  TIPW = vec3(rest, 0.02 + lift + idle + pressDip);
  PITCH = mix(0.75, 0.45, uHold);

  // ripples + splash from the press
  vec2 w = s;
  float splash = 0.0;
  if (uPress >= 0.0) {
    vec2 d = s - uBtn;
    float dist = length(d);
    float wave = sin(dist * 30.0 - uPress * 11.0) * exp(-dist * 1.6) * exp(-uPress * 0.9);
    w += normalize(d + 1e-4) * wave * 0.035;
    float rr = 0.12 + min(uPress, 0.45) * 1.1;
    float ang = atan(d.y, d.x);
    float n = vnoise(vec2(ang * 4.0, 1.7)) * 0.5 + vnoise(vec2(ang * 11.0, 3.1)) * 0.25;
    splash = smoothstep(rr * (0.55 + n), rr * (0.45 + n), dist) * smoothstep(0.0, 0.08, uPress);
    // flung droplets
    vec2 cell = floor(s * 26.0);
    float drop = step(0.975, hash21(cell)) * smoothstep(rr * 1.7, rr * 1.1, dist) * step(rr * 0.75, dist);
    splash = max(splash, drop * step(length(fract(s * 26.0) - 0.5), 0.32));
  }
  vec3 col = surface(w, t);
  col = mix(col, vec3(1.0, 0.16, 0.2), splash * 0.92);
  col = mix(col, vec3(1.0, 0.75, 0.72), splash * smoothstep(0.6, 1.0, vnoise(s * 14.0)) * 0.5);   // wet highlight
  col = mix(col, vec3(0.02), smoothstep(0.08, 0.0, abs(splash - 0.5)) * 0.85);                     // ink contour

  // soft shadow of the hand on the surface
  vec3 L = normalize(vec3(-0.45, 0.55, 1.0));
  vec3 sp = vec3(s, 0.0);
  float sh = 1.0;
  float tt = 0.04;
  for (int i = 0; i < 18; i++) {
    float d = map(sp + L * tt);
    sh = min(sh, 10.0 * d / tt);
    tt += clamp(d, 0.04, 0.3);
    if (sh < 0.02 || tt > 3.0) break;
  }
  col *= mix(0.35, 1.0, sat(sh));

  // the hand
  vec3 ro = vec3(s * 0.0, 6.0);
  vec3 rd = normalize(vec3(s, 0.0) - vec3(0.0, 0.0, 6.0));
  ro = vec3(0.0, 0.0, 6.0);
  float tr = 3.5; bool hit = false; float minD = 1e3;
  for (int i = 0; i < 80; i++) {
    float d = map(ro + rd * tr);
    minD = min(minD, d);
    if (d < 0.0015) { hit = true; break; }
    tr += d;
    if (tr > 6.5) break;
  }
  if (hit) {
    vec3 p = ro + rd * tr;
    vec3 n = calcNormal(p);
    float dif = dot(n, L);
    float band = dif > 0.5 ? 1.0 : dif > 0.1 ? 0.8 : 0.58;
    vec3 skin = vec3(0.96, 0.93, 0.87);
    vec3 c = skin * band;
    float lines = step(0.55, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.3));
    c = mix(c, vec3(0.04), (1.0 - band) * 2.0 * lines * 0.8);
    float rim = 1.0 - abs(dot(n, -rd));
    c = mix(c, vec3(0.03), smoothstep(0.6, 0.78, rim));
    col = c;
  } else if (minD < 0.006) {
    col = vec3(0.03);
  }

  // the portal: a hole that tears open from the touch point
  float alpha = 1.0;
  if (uPortal > 0.0) {
    vec2 d = s - uBtn;
    float ang = atan(d.y, d.x);
    float colId = floor(vUv.x * uRes.x / 4.0);
    float jag = 0.18 * vnoise(vec2(ang * 5.0, t * 1.5)) + 0.12 * hash11(colId);
    float r = uPortal * uPortal * (a + 2.2) * 1.2;
    float dist = length(d * vec2(1.0, 0.85)) - jag * r * 0.35;
    // streaks dripping beyond the edge
    float drip = hash11(colId * 1.7) * 0.35 * r * step(d.y, 0.0);
    float edge = r + drip;
    alpha = smoothstep(edge - 0.02, edge + 0.02, dist);
    float ring = smoothstep(0.08, 0.0, abs(dist - edge));
    col = mix(col, vec3(1.0, 0.35, 0.3), ring * 0.8);
  }
  col += (hash21(gl_FragCoord.xy + fract(t) * 77.0) - 0.5) * 0.04;
  gl_FragColor = vec4(col * alpha, alpha);
}`;

const HOLD_MS = 1600;

export default function IntroPortal({ onDone, onOpen }: { onDone: () => void; onOpen?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);
  const [held, setHeld] = useState(0);
  const [phase, setPhase] = useState<"idle" | "holding" | "opening">("idle");
  const [btn, setBtn] = useState({ x: 0.5, y: 0.62 });
  const state = useRef({ hold: 0, holding: false, press: -1, portal: 0, btn: { x: 0.5, y: 0.62 }, opened: false });
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    document.documentElement.style.overflow = "";
    setShow(false);
    onDone();
  }, [onDone]);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("identity-intro") === "1";
    } catch {}
    if (seen || prefersReduced()) {
      finish();
      return;
    }
    document.documentElement.style.overflow = "hidden";
    const el = host.current!;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    el.appendChild(canvas);
    const gl = getGL(canvas);
    let prog: ReturnType<typeof createProgram>;
    if (!gl) {
      finish();
      return () => canvas.remove();
    }
    try {
      prog = createProgram(gl, FRAG);
    } catch (e) {
      console.warn(e);
      finish();
      return () => canvas.remove();
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const { u } = prog;
    const coarse = isCoarse();
    const scale = coarse ? 0.5 : Math.min(window.devicePixelRatio, 1.5) * 0.6;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * scale));
      canvas.height = Math.max(1, Math.floor(r.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    const start = performance.now();
    let last = start;
    let pressAt = 0;
    let raf = 0;
    const s = state.current;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.2, (now - last) / 1000);
      last = now;
      if (s.press < 0) {
        s.hold = s.holding ? Math.min(1, s.hold + (dt * 1000) / HOLD_MS) : Math.max(0, s.hold - dt * 1.4);
        if (s.hold >= 1) {
          s.press = 0;
          pressAt = now;
          setPhase("opening");
          try {
            sessionStorage.setItem("identity-intro", "1");
          } catch {}
        }
      } else {
        s.press = (now - pressAt) / 1000;
        if (s.press > 0.45) {
          if (s.portal === 0) onOpen?.();
          s.portal = Math.min(1, s.portal + dt * 0.75);
        }
        if (s.portal >= 1 && !s.opened) {
          s.opened = true;
          finish();
        }
      }
      setHeld(s.hold);
      const a = canvas.width / canvas.height;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uTime"), (now - start) / 1000);
      gl.uniform2f(u("uBtn"), (s.btn.x - 0.5) * a * 2, (0.5 - s.btn.y) * 2);
      gl.uniform1f(u("uHold"), s.hold);
      gl.uniform1f(u("uPress"), s.press);
      gl.uniform1f(u("uPortal"), s.portal);
      gl.uniform1f(u("uHandScale"), a < 0.9 ? 0.62 : 0.95);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = (e: React.PointerEvent) => {
    if (state.current.press >= 0) return;
    const p = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    state.current.btn = p;
    setBtn(p);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="portal"
          className="fixed inset-0 z-[300] touch-none select-none"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onPointerMove={(e) => (e.pointerType === "mouse" || state.current.holding) && place(e)}
          onPointerDown={(e) => {
            if (state.current.press >= 0) return;
            place(e);
            state.current.holding = true;
            setPhase("holding");
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerUp={() => {
            state.current.holding = false;
            if (state.current.press < 0) setPhase("idle");
          }}
          onPointerCancel={() => (state.current.holding = false)}
          role="dialog"
          aria-label="Press and hold to enter"
        >
          <div ref={host} aria-hidden className="absolute inset-0" />

          {phase !== "opening" && (
            <>
              {/* the white HOLD circle (also the cursor) */}
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${btn.x * 100}%`, top: `${btn.y * 100}%` }}
              >
                <motion.div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full bg-bone text-ink shadow-[0_20px_60px_rgba(0,0,0,0.45)] md:h-28 md:w-28"
                  animate={{ scale: phase === "holding" ? 0.88 : [1, 1.06, 1] }}
                  transition={phase === "holding" ? { duration: 0.3 } : { duration: 1.6, repeat: Infinity }}
                >
                  <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#070606" strokeOpacity="0.12" strokeWidth="3" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#e1121b" strokeWidth="4" strokeDasharray={289} strokeDashoffset={289 * (1 - held)} />
                  </svg>
                  <span className="label text-center text-[10px] leading-tight">
                    Hold
                    <br />& enter
                  </span>
                </motion.div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5 md:p-8">
                <span className="font-display text-xl font-bold tracking-[-0.06em] text-bone md:text-2xl">
                  IDENTITY<span className="text-ink">.</span>
                </span>
                <span className="label max-w-[16ch] text-right text-bone/80">Press & hold anywhere to open your space</span>
              </div>
            </>
          )}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              try {
                sessionStorage.setItem("identity-intro", "1");
              } catch {}
              finish();
            }}
            className="label absolute bottom-5 left-5 z-20 rounded-full bg-ink/60 px-4 py-2.5 text-[10px] text-bone/80 backdrop-blur hover:text-bone md:bottom-8 md:left-8"
          >
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
