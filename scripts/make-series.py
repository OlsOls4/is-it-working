"""Build the 9-week synthetic series (weeks 0-8) from the two AI-generated endpoints.
Week 0 = original synthetic face. Luma (detail: texture, pores, lines, spots) always comes from week 0,
chroma (Cb/Cr: redness, tone) moves from week-0 towards the week-8 variant on an azelaic-like schedule.
Each week gets a small exposure / white-balance jitter to mimic real weekly capture noise."""
from PIL import Image
import numpy as np, sys, os
SRC = os.path.join(os.path.dirname(__file__), "series-src")
w0 = np.asarray(Image.open(f"{SRC}/week-00-ai.jpg").convert("YCbCr")).astype(float)
w8 = np.asarray(Image.open(f"{SRC}/week-08-ai.jpg").convert("YCbCr")).astype(float)
F   = [0, .08, .18, .25, .40, .52, .65, .80, .92]          # chroma progress (redness fading)
EXP = [1.0, 1.02, .985, 1.01, .99, 1.025, .98, 1.015, 1.0]  # exposure jitter
WB  = [0, .6, -.5, .3, -.4, .5, -.3, .2, 0]                # Cb shift (white balance), in 8-bit units
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"; os.makedirs(OUT, exist_ok=True)
for w in range(9):
    if w == 0:
        Image.open(f"{SRC}/week-00-ai.jpg").save(f"{OUT}/week-00.jpg", quality=92); continue
    o = w0.copy()
    o[..., 0] = np.clip(w0[..., 0] * EXP[w], 0, 255)
    o[..., 1:] = w0[..., 1:] * (1 - F[w]) + w8[..., 1:] * F[w]
    o[..., 1] += WB[w]
    Image.fromarray(np.clip(o, 0, 255).round().astype(np.uint8), "YCbCr").convert("RGB").save(f"{OUT}/week-{w:02d}.jpg", quality=92)
print("ok")
