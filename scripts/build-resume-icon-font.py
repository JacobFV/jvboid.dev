"""Build src/lib/resume-fonts/resume-icons.ttf, the resume PDF's icon font.

The resume PDF sets its icons as glyphs rather than images: react-pdf leaves
a line break open beside an inline image, so an icon would strand at the end
of a line with its label on the next. Two glyphs, both drawn in a 24-unit box:

  U+E000  the GitHub octocat, the same path SocialGlyphs uses on the site
  U+E001  a globe, for a project's demo or site link
  U+E002  a cube, for a project's published package (pypi, npm)
  U+E003  LinkedIn's mark, for a post about a project
  U+E004  X's mark, likewise

Each glyph's advance width carries the gap before its label. The font also
needs the unglamorous tables (a space glyph, full OS/2 metrics, a complete
name table): without them react-pdf's render never settles and the PDF
route hangs.

Run with fontTools available:  pip install fonttools
  python3 scripts/build-resume-icon-font.py
"""

import re
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/lib/resume-fonts/resume-icons.ttf"

UPM = 1000
SCALE = 720 / 24  # the 24-unit box is 0.72em tall, sitting on the baseline
LEFT = 40
ADVANCE = 1000  # 40 left bearing + 720 glyph + ~240 gap before the label


def brand_path(name: str) -> str:
    # The brand marks come from the site's own SocialGlyphs, so the PDF's
    # icons are the same drawings as the web page's.
    src = (ROOT / "src/components/chrome/SocialGlyphs.tsx").read_text()
    m = re.search(rf'\b{name}:\s*"([^"]+)"', src)
    assert m, f"{name} path not found in SocialGlyphs.tsx"
    return m.group(1)


def glyph(draw):
    pen = TTGlyphPen(None)
    # SVG is y-down; the font is y-up with the baseline at 0.
    tp = TransformPen(Cu2QuPen(pen, 1.0, reverse_direction=True), (SCALE, 0, 0, -SCALE, LEFT, 700))
    draw(tp)
    return pen.glyph()


def ellipse(pen, cx, cy, rx, ry):
    # Four cubic arcs, always wound the same way.
    k = 0.5523
    pen.moveTo((cx + rx, cy))
    pen.curveTo((cx + rx, cy + k * ry), (cx + k * rx, cy + ry), (cx, cy + ry))
    pen.curveTo((cx - k * rx, cy + ry), (cx - rx, cy + k * ry), (cx - rx, cy))
    pen.curveTo((cx - rx, cy - k * ry), (cx - k * rx, cy - ry), (cx, cy - ry))
    pen.curveTo((cx + k * rx, cy - ry), (cx + rx, cy - k * ry), (cx + rx, cy))
    pen.closePath()


def hole(pen, draw):
    # A counter-wound contour cuts a hole in the one around it.
    rp = ReverseContourPen(pen)
    draw(rp)


def rect(pen, x0, y0, x1, y1):
    pen.moveTo((x0, y0))
    pen.lineTo((x0, y1))
    pen.lineTo((x1, y1))
    pen.lineTo((x1, y0))
    pen.closePath()


def globe(pen):
    # Rim and meridian as rings (outer contour, then a counter-wound inner
    # one), plus an equator bar; nonzero winding unions the overlaps.
    ellipse(pen, 12, 12, 11, 11)
    hole(pen, lambda p: ellipse(p, 12, 12, 9.2, 9.2))
    ellipse(pen, 12, 12, 4.6, 11)
    hole(pen, lambda p: ellipse(p, 12, 12, 2.8, 9.2))
    # rect() winds opposite to ellipse(), so reverse it to add rather than cancel.
    hole(pen, lambda p: rect(p, 1.5, 11.1, 22.5, 12.9))


def polygon(pen, pts):
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


def inset(pts, d):
    # Offset every edge of a convex polygon inward by d, then intersect
    # neighbouring edges: an even-width stroke, unlike scaling to the centre.
    n = len(pts)
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    lines = []
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        ex, ey = x1 - x0, y1 - y0
        length = (ex * ex + ey * ey) ** 0.5
        nx, ny = -ey / length, ex / length
        if (cx - x0) * nx + (cy - y0) * ny < 0:
            nx, ny = -nx, -ny
        lines.append(((x0 + nx * d, y0 + ny * d), (ex, ey)))
    out = []
    for i in range(n):
        (px, py), (dx, dy) = lines[i - 1]
        (qx, qy), (fx, fy) = lines[i]
        t = ((qx - px) * fy - (qy - py) * fx) / (dx * fy - dy * fx)
        out.append((px + t * dx, py + t * dy))
    return out


def cube(pen):
    # An isometric box: the hexagon outline with its three faces cut out,
    # leaving the edges as strokes.
    top, ur, lr, bottom, ll, ul, c = (12, 1), (21.5, 6.5), (21.5, 17.5), (12, 23), (2.5, 17.5), (2.5, 6.5), (12, 12)
    polygon(pen, [top, ur, lr, bottom, ll, ul])
    for face in ([top, ur, c, ul], [ur, lr, bottom, c], [ul, c, bottom, ll]):
        hole(pen, lambda p, f=face: polygon(p, inset(f, 0.9)))


def main():
    empty = TTGlyphPen(None).glyph()
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder([".notdef", "space", "ghmark", "globe", "cube", "linkedin", "x"])
    fb.setupCharacterMap({
        0x20: "space", 0xE000: "ghmark", 0xE001: "globe", 0xE002: "cube",
        0xE003: "linkedin", 0xE004: "x",
    })
    fb.setupGlyf({
        ".notdef": empty,
        "space": TTGlyphPen(None).glyph(),
        "ghmark": glyph(lambda p: parse_path(brand_path("github"), p)),
        "globe": glyph(globe),
        "cube": glyph(cube),
        "linkedin": glyph(lambda p: parse_path(brand_path("linkedin"), p)),
        "x": glyph(lambda p: parse_path(brand_path("x"), p)),
    })
    fb.setupHorizontalMetrics({
        ".notdef": (500, 0),
        "space": (250, 0),
        "ghmark": (ADVANCE, LEFT),
        "globe": (ADVANCE, LEFT),
        "cube": (ADVANCE, LEFT),
        "linkedin": (ADVANCE, LEFT),
        "x": (ADVANCE, LEFT),
    })
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({
        "familyName": "ResumeIcons",
        "styleName": "Regular",
        "uniqueFontIdentifier": "ResumeIcons-Regular",
        "fullName": "ResumeIcons Regular",
        "psName": "ResumeIcons-Regular",
        "version": "Version 1.000",
    })
    fb.setupOS2(
        version=4, sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0,
        usWinAscent=800, usWinDescent=200, sxHeight=500, sCapHeight=700,
        achVendID="NONE", fsType=0,
    )
    fb.setupPost()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fb.save(str(OUT))
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
