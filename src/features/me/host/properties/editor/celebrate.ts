// Lightweight celebration particle burst — no deps. Ported from the design
// bundle (variation-c-v2/celebrate.js) and kept API-compatible so call sites
// match the original prototypes.
//
//   celebrate({ x, y, count, palette, scale, spread })  → particle burst
//   floatPlusOne(el, "+1")                              → small +N float-up
//
// The two functions share one persistent canvas (created lazily, kept alive
// for the page lifetime so repeated bursts don't thrash the DOM).

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  life: number;
  shape: "circle" | "rect";
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let parts: Particle[] = [];

function ensureCanvas(): void {
  if (canvas) return;
  if (typeof document === "undefined") return;
  // Remove any orphan canvas left over by a previous HMR reload of this
  // module — without this, a frozen "last frame" of confetti lingers on the
  // page after each dev save.
  document
    .querySelectorAll('canvas[data-celebrate="1"]')
    .forEach((c) => c.remove());
  canvas = document.createElement("canvas");
  canvas.dataset.celebrate = "1";
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  resize();
  window.addEventListener("resize", resize);
  ctx = canvas.getContext("2d");
}

function resize(): void {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.getContext("2d")?.scale(dpr, dpr);
}

function loop(): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.vy += 0.18;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vrot;
    p.life -= 1;
    const alpha = Math.min(1, p.life / 40);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
    }
    ctx.restore();
  }
  if (parts.length) {
    raf = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

const DEFAULT_PALETTE = ["#5b5bd6", "#7c7cf0", "#a5a5f5", "#16a34a", "#facc15"];

export interface CelebrateOptions {
  x?: number;
  y?: number;
  count?: number;
  palette?: string[];
  scale?: number;
  spread?: number;
}

export function celebrate(opts: CelebrateOptions = {}): void {
  if (typeof window === "undefined") return;
  const {
    x = window.innerWidth / 2,
    y = window.innerHeight / 2,
    count = 40,
    palette = DEFAULT_PALETTE,
    scale = 1,
    spread = Math.PI,
  } = opts;
  ensureCanvas();
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const v = (3 + Math.random() * 6) * scale;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      size: (4 + Math.random() * 5) * scale,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 80 + Math.random() * 40,
      shape: Math.random() > 0.4 ? "rect" : "circle",
    });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

export function floatPlusOne(el: Element | null, text = "+1", color = "#16a34a"): void {
  if (!el || typeof document === "undefined") return;
  const r = el.getBoundingClientRect();
  const n = document.createElement("div");
  n.textContent = text;
  n.style.cssText = `
    position: fixed; left: ${r.right - 12}px; top: ${r.top}px;
    color: ${color}; font-weight: 700; font-size: 16px;
    pointer-events: none; z-index: 9998;
    font-family: system-ui, -apple-system, sans-serif;
    transition: transform 1.2s ease-out, opacity 1.2s ease-out;
  `;
  document.body.appendChild(n);
  requestAnimationFrame(() => {
    n.style.transform = "translateY(-40px)";
    n.style.opacity = "0";
  });
  setTimeout(() => n.remove(), 1300);
}

// Helper: pick a milestone (25/50/75/100) that was just crossed.
export function crossedMilestone(prevPct: number, nextPct: number): 25 | 50 | 75 | 100 | null {
  for (const m of [25, 50, 75, 100] as const) {
    if (prevPct < m && nextPct >= m) return m;
  }
  return null;
}
