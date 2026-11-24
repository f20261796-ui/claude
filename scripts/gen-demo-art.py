"""Generates original SVG artwork for the demo portfolios (portraits + project covers)."""
import math, random, os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "demos", "art")
os.makedirs(OUT, exist_ok=True)

def save(name, body, w=1200, h=900, bg="#0d0b0b"):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><rect width="100%" height="100%" fill="{bg}"/>{body}</svg>'
    open(os.path.join(OUT, name), "w").write(svg)

def portrait(name, accent, bg, ink, seed, hair="short"):
    r = random.Random(seed)
    w, h = 900, 1100
    lines = []
    # vertical streak field
    for x in range(0, w, 7):
        top = 120 + r.random() * 260
        lines.append(f'<rect x="{x}" y="{top:.0f}" width="2" height="{h-top:.0f}" fill="{accent}" opacity="{0.08 + r.random()*0.18:.2f}"/>')
    sil = (
        f'<path d="M150 1100 C170 880 290 800 450 790 C610 800 730 880 750 1100 Z" fill="{ink}"/>'
        f'<rect x="395" y="640" width="110" height="180" rx="40" fill="{ink}"/>'
        f'<ellipse cx="450" cy="520" rx="165" ry="200" fill="{ink}"/>'
    )
    if hair == "long":
        sil += f'<path d="M270 520 C250 300 360 270 450 270 C560 270 660 320 640 520 C660 700 700 820 690 860 L600 760 C610 620 600 470 560 400 C500 440 400 430 330 400 C300 480 300 640 310 760 L210 860 C200 800 250 700 270 520 Z" fill="{ink}"/>'
    elif hair == "curly":
        for i in range(26):
            a = math.pi * (0.95 + i / 25 * 1.1)
            sil += f'<circle cx="{450 + math.cos(a)*175:.0f}" cy="{470 + math.sin(a)*190:.0f}" r="{48 + r.random()*16:.0f}" fill="{ink}"/>'
    else:
        sil += f'<path d="M285 470 C280 330 370 290 455 292 C560 290 625 340 615 470 C590 400 520 380 450 385 C380 380 320 410 285 470 Z" fill="{ink}"/>'
    # ink highlights on the face
    face = (
        f'<path d="M520 420 C560 470 575 560 540 640" stroke="{accent}" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>'
        f'<path d="M380 700 C430 735 480 735 520 705" stroke="{accent}" stroke-width="6" fill="none" opacity=".5"/>'
    )
    halo = f'<circle cx="450" cy="500" r="330" fill="none" stroke="{accent}" stroke-width="3" opacity=".6"/><circle cx="450" cy="500" r="300" fill="{accent}" opacity=".9"/>'
    save(name, "".join(lines) + halo + sil + face, w, h, bg)

def ui_mock(name, accent, bg, fg, seed, title):
    r = random.Random(seed)
    body = ""
    for i, x in enumerate([140, 470, 800]):
        y = 120 + (i % 2) * 60
        body += f'<g transform="rotate({(-6 + i*6)} {x+130} {y+330})">'
        body += f'<rect x="{x}" y="{y}" width="260" height="560" rx="34" fill="{fg}"/>'
        body += f'<rect x="{x+20}" y="{y+40}" width="220" height="{120 + r.randint(0,60)}" rx="16" fill="{accent}"/>'
        for j in range(5):
            ww = 80 + r.random() * 130
            body += f'<rect x="{x+20}" y="{y+220+j*44}" width="{ww:.0f}" height="14" rx="7" fill="{bg}" opacity=".75"/>'
        body += f'<circle cx="{x+205}" cy="{y+505}" r="26" fill="{accent}"/></g>'
    body += f'<text x="70" y="840" font-family="Helvetica, Arial" font-weight="700" font-size="54" fill="{fg}" letter-spacing="-2">{title}</text>'
    save(name, body, bg=bg)

def chart(name, accent, bg, fg, seed, title):
    r = random.Random(seed)
    body = ""
    for i in range(6):
        body += f'<line x1="100" x2="1100" y1="{150+i*110}" y2="{150+i*110}" stroke="{fg}" opacity=".12"/>'
    pts, y = [], 600
    for i in range(21):
        y = max(180, min(700, y - r.uniform(-40, 70)))
        pts.append((100 + i * 50, y))
    d = "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts)
    body += f'<path d="{d} L1100 700 L100 700 Z" fill="{accent}" opacity=".15"/>'
    body += f'<path d="{d}" stroke="{accent}" stroke-width="6" fill="none" stroke-linejoin="round"/>'
    for i in range(12):
        hh = r.uniform(30, 160)
        body += f'<rect x="{110+i*82}" y="{780-hh:.0f}" width="40" height="{hh:.0f}" fill="{fg}" opacity=".85"/>'
    body += f'<circle cx="{pts[-1][0]}" cy="{pts[-1][1]:.0f}" r="14" fill="{accent}"/>'
    body += f'<text x="100" y="110" font-family="Helvetica, Arial" font-weight="700" font-size="46" fill="{fg}" letter-spacing="-1">{title}</text>'
    save(name, body, bg=bg)

def terminal(name, accent, bg, fg, seed, title):
    r = random.Random(seed)
    body = f'<rect x="90" y="90" width="1020" height="720" rx="18" fill="{fg}" opacity=".05" stroke="{accent}" stroke-opacity=".5"/>'
    for i, c in enumerate(["#ff5f57", "#febc2e", "#28c840"]):
        body += f'<circle cx="{130+i*30}" cy="125" r="8" fill="{c}"/>'
    y = 190
    for i in range(14):
        x = 140 + r.choice([0, 0, 40, 80])
        segs = r.randint(1, 4)
        for s in range(segs):
            ww = r.uniform(40, 200)
            col = accent if r.random() < 0.35 else fg
            body += f'<rect x="{x:.0f}" y="{y}" width="{ww:.0f}" height="16" rx="4" fill="{col}" opacity="{0.9 if col==accent else 0.35}"/>'
            x += ww + 16
        y += 40
    body += f'<rect x="140" y="{y}" width="16" height="26" fill="{accent}"/>'
    body += f'<text x="660" y="770" font-family="Courier New, monospace" font-weight="700" font-size="40" fill="{accent}">{title}</text>'
    save(name, body, bg=bg)

def brand(name, accent, bg, fg, seed, word):
    r = random.Random(seed)
    body = ""
    for i in range(9):
        cx, cy, rad = r.uniform(0, 1200), r.uniform(0, 900), r.uniform(60, 260)
        col = r.choice([accent, fg, "#ffd23f", "#1b9aaa"])
        body += f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rad:.0f}" fill="{col}" opacity=".9"/>'
    body += f'<rect x="0" y="560" width="1200" height="340" fill="{bg}"/>'
    body += f'<text x="60" y="820" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="250" fill="{fg}" letter-spacing="-10">{word}</text>'
    save(name, body, bg=bg)

# Aarav — cinematic / crimson
portrait("aarav.svg", "#e1121b", "#0b0909", "#f2ede4", 1)
ui_mock("aarav-1.svg", "#e1121b", "#0b0909", "#f2ede4", 11, "Pulse — habit app")
ui_mock("aarav-2.svg", "#f2ede4", "#5c0006", "#0b0909", 12, "Metro ticket kiosk")
brand("aarav-3.svg", "#e1121b", "#0b0909", "#f2ede4", 13, "Monsoon")
# Meera — minimalist / ink blue
portrait("meera.svg", "#2743ff", "#f4f2ee", "#121212", 2, "long")
chart("meera-1.svg", "#2743ff", "#f4f2ee", "#121212", 21, "Crop yield forecast")
chart("meera-2.svg", "#121212", "#e9e6df", "#2743ff", 22, "Air quality, Pune")
chart("meera-3.svg", "#2743ff", "#ffffff", "#121212", 23, "Churn model")
# Kabir — futuristic / mint
portrait("kabir.svg", "#00e0a4", "#060a12", "#0f1a2b", 3, "curly")
terminal("kabir-1.svg", "#00e0a4", "#060a12", "#d6f5ff", 31, "ledger.app")
ui_mock("kabir-2.svg", "#00e0a4", "#060a12", "#0f1a2b", 32, "Campus OS")
terminal("kabir-3.svg", "#7c5cff", "#060a12", "#d6f5ff", 33, "kit --cli")
# Zoya — colourful / tangerine
portrait("zoya.svg", "#ff5c39", "#fff3d6", "#2d1b69", 4, "long")
brand("zoya-1.svg", "#ff5c39", "#2d1b69", "#fff3d6", 41, "Chai Co.")
brand("zoya-2.svg", "#ffd23f", "#ff5c39", "#2d1b69", 42, "Seedlings")
chart("zoya-3.svg", "#ff5c39", "#fff3d6", "#2d1b69", 43, "Reels growth: 12 weeks")
print("ok")
