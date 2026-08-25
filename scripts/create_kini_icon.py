from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "assets" / "images"
DESTINATION.mkdir(parents=True, exist_ok=True)
icon_path = DESTINATION / "icon.png"

size = 1024
canvas = Image.new("RGB", (size, size), "#1677FF")
draw = ImageDraw.Draw(canvas)

for y in range(size):
    mix = y / (size - 1)
    red = int(22 * (1 - mix) + 36 * mix)
    green = int(119 * (1 - mix) + 191 * mix)
    blue = int(255 * (1 - mix) + 219 * mix)
    draw.line((0, y, size, y), fill=(red, green, blue))

draw.rounded_rectangle((154, 184, 870, 780), radius=176, fill="#FFFFFF")
draw.polygon([(400, 742), (512, 890), (606, 742)], fill="#FFFFFF")
draw.rounded_rectangle((238, 272, 786, 684), radius=108, fill="#12263F")

font_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
font_path = next((candidate for candidate in font_candidates if Path(candidate).exists()), None)
font = ImageFont.truetype(font_path, 365) if font_path else ImageFont.load_default()
text = "K"
bounds = draw.textbbox((0, 0), text, font=font)
text_x = (size - (bounds[2] - bounds[0])) / 2 - bounds[0]
text_y = 250 - bounds[1]
draw.text((text_x, text_y), text, font=font, fill="#FFFFFF")
draw.ellipse((670, 565, 746, 641), fill="#3DD9D2", outline="#FFFFFF", width=16)

canvas.save(icon_path, format="PNG", optimize=True)
for filename in ["splash-icon.png", "favicon.png", "android-icon-foreground.png"]:
    copyfile(icon_path, DESTINATION / filename)

print(icon_path)
