#!/usr/bin/env python3
"""Low-resolution twins of My Little Brain's anatomy meshes.

The project page's brain (components/three/LittleBrainScene.tsx) draws the
app's 28 template meshes, 15.8 MB in all, and used to show nothing until the
last of them arrived. This writes a ~6% version of each into anatomy/lo/ in
the same .bin format (magic, vertex count, triangle count, xyz float32,
shade float32, uint32 indices) so the scene can put a brain on screen within
a second and swap the full one in underneath.

Quadric decimation via fast-simplification; each low vertex takes the shade
of the nearest original vertex. Run from the repo root:

    python3 -m venv .venv && .venv/bin/pip install numpy fast-simplification
    .venv/bin/python scripts/decimate-anatomy.py
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np
import fast_simplification

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/assets/media/my-little-brain/anatomy"
DST = SRC / "lo"
MAGIC = 0x314E5242
KEEP = 0.06          # share of triangles to keep
MIN_TRIS = 400       # small nuclei keep at least this many


def read(path: Path):
    buf = path.read_bytes()
    magic, nv, nt = struct.unpack_from("<III", buf, 0)
    assert magic == MAGIC, path
    assert len(buf) == 12 + nv * 16 + nt * 12, path
    pos = np.frombuffer(buf, np.float32, nv * 3, 12).reshape(nv, 3)
    shade = np.frombuffer(buf, np.float32, nv, 12 + nv * 12)
    idx = np.frombuffer(buf, np.uint32, nt * 3, 12 + nv * 16).reshape(nt, 3)
    return pos, shade, idx


def write(path: Path, pos, shade, idx):
    nv, nt = len(pos), len(idx)
    out = bytearray(struct.pack("<III", MAGIC, nv, nt))
    out += np.ascontiguousarray(pos, np.float32).tobytes()
    out += np.ascontiguousarray(shade, np.float32).tobytes()
    out += np.ascontiguousarray(idx, np.uint32).tobytes()
    path.write_bytes(out)


def nearest_shade(src_pos, src_shade, pos, chunk=2048):
    out = np.empty(len(pos), np.float32)
    for i in range(0, len(pos), chunk):
        p = pos[i : i + chunk]
        d = ((p[:, None, :] - src_pos[None, :, :]) ** 2).sum(-1)
        out[i : i + chunk] = src_shade[d.argmin(1)]
    return out


def main():
    DST.mkdir(exist_ok=True)
    manifest = json.loads((SRC / "manifest.json").read_text())
    total_in = total_out = 0
    for entry in manifest["meshes"]:
        pos, shade, idx = read(SRC / entry["file"])
        keep = max(KEEP, min(1.0, MIN_TRIS / len(idx)))
        lo_pos, lo_idx = fast_simplification.simplify(pos.astype(np.float64), idx.astype(np.int64), 1.0 - keep, agg=7)
        lo_pos = lo_pos.astype(np.float32)
        lo_shade = nearest_shade(pos, shade, lo_pos)
        write(DST / entry["file"], lo_pos, lo_shade, lo_idx.astype(np.uint32))
        a, b = (SRC / entry["file"]).stat().st_size, (DST / entry["file"]).stat().st_size
        total_in += a
        total_out += b
        print(f"{entry['file']:32} {len(idx):>7} -> {len(lo_idx):>6} tris  {a/1e3:8.0f} -> {b/1e3:6.0f} kB")
    print(f"{'total':32} {total_in/1e6:.1f} MB -> {total_out/1e6:.2f} MB")


if __name__ == "__main__":
    sys.exit(main())
