// Captures preview images of the demo portfolios for the landing page.
// Usage: (dev server running) node scripts/capture-demos.js [baseUrl]
const { chromium } = require("playwright");
const sharp = (() => { try { return require("sharp"); } catch { return null; } })();
const path = require("path");
const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(__dirname, "..", "public", "demos");
const SLUGS = ["aarav-mehta", "meera-iyer", "kabir-rao", "zoya-khan"];
const HIDE = "[class*='z-[60]'], .grain { display: none !important; }";

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const slug of SLUGS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/demo/${slug}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: HIDE });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(OUT, `${slug}.jpg`), quality: 82, type: "jpeg" });
    await page.close();
  }
  // tall mobile capture for the hero phone mockup
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto(`${BASE}/demo/aarav-mehta`, { waitUntil: "networkidle" });
  await m.addStyleTag({ content: HIDE + " header { display:none !important }" });
  const H = await m.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(H, 5200); y += 400) { await m.evaluate((y) => window.scrollTo(0, y), y); await m.waitForTimeout(250); }
  await m.waitForTimeout(1200);
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(800);
  await m.screenshot({ path: path.join(OUT, "aarav-mehta-mobile.jpg"), quality: 72, type: "jpeg", clip: { x: 0, y: 0, width: 390, height: 3400 }, fullPage: true });
  await browser.close();
  console.log("captured", sharp ? "(sharp available)" : "");
})();
