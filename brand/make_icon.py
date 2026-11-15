"""Turn the supplied chip render into the assets iOS needs.

The source sits in a lot of dead space: the chip fills 65% of the frame and
sits 11px below centre. At home-screen size that reads as a black square with
something small in it. This re-frames it so the chip fills ~82% of the canvas,
centred on the chip rather than on the original canvas, and flattens it to an
opaque PNG — the App Store rejects an icon with an alpha channel.
"""
from PIL import Image

SRC = '/private/tmp/claude-501/-Users-alecschmigelski-Documents-Ochrana-poc/6c74f05f-4a5f-417e-82b8-aae090386446/images/1.webp'
OUT = '/private/tmp/claude-501/-Users-alecschmigelski-Documents-Ochrana-poc/6c74f05f-4a5f-417e-82b8-aae090386446/scratchpad/brief'

im = Image.open(SRC).convert('RGB')
W, H = im.size

# Re-measure rather than hard-code, so this script survives a new render.
px = im.load()
BRIGHT = 150

# A plain bounding box is wrong here: the render drops a glow beneath the chip
# that is as bright as the chip itself, so the box comes out 820x920 for what
# is a circle. Measure each row's span instead — the widest row is the circle's
# true vertical centre, and its span is the diameter.
spans = []
for y in range(0, H):
    xs = [x for x in range(0, W, 2) if max(px[x, y]) > BRIGHT]
    spans.append((xs[0], xs[-1]) if xs else None)

widest_y = max(
    (y for y, sp in enumerate(spans) if sp),
    key=lambda y: spans[y][1] - spans[y][0],
)
x0, x1 = spans[widest_y]
diameter = x1 - x0
cx = (x0 + x1) // 2
cy = widest_y
chip_w = chip_h = diameter

# How much of the output the chip should occupy. A circle under Apple's
# rounded-rect mask can sit this large without touching the corner curve.
FILL = 0.82
crop = int(max(chip_w, chip_h) / FILL)

# Optical centring. The render drops a glow below the chip, so a geometrically
# centred circle reads low. The luminance centroid sits 38px under the circle's
# centre, but correcting by all of it overshoots — the glow is dim and wide, so
# it pulls the measured mass further than the eye actually follows. Half of it
# is what looks centred; the three candidates were rendered under Apple's mask
# at 200px and compared before picking.
OPTICAL_LIFT = 19

left, top = cx - crop // 2, cy - crop // 2 + OPTICAL_LIFT
right, bottom = left + crop, top + crop

# If the crop runs past an edge, pad with the backdrop rather than shifting the
# chip off-centre — the chip staying centred matters more than keeping glow.
bg = px[2, 2]
canvas = Image.new('RGB', (crop, crop), bg)
sx0, sy0 = max(left, 0), max(top, 0)
sx1, sy1 = min(right, W), min(bottom, H)
canvas.paste(im.crop((sx0, sy0, sx1, sy1)), (sx0 - left, sy0 - top))

icon = canvas.resize((1024, 1024), Image.LANCZOS)
icon.save(f'{OUT}/AppIcon-1024.png', 'PNG', optimize=True)

print(f'source      {W}x{H}')
print(f'chip bbox   {chip_w}x{chip_h} centred at {cx},{cy}')
print(f'crop        {crop}x{crop} at {left},{top}')
print(f'chip fills  {100 * chip_w / crop:.1f}% of the icon (was {100 * chip_w / W:.1f}%)')
print(f'wrote       {OUT}/AppIcon-1024.png')

check = Image.open(f'{OUT}/AppIcon-1024.png')
print(f'output      {check.size} {check.mode}  alpha={"A" in check.mode}')
