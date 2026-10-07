"""
High-resolution QR code generator for NEXORA Freshers Party 2K26.
Generates styled PNG and SVG with High error correction (ERROR_CORRECT_H).
"""

import argparse
import os
import qrcode
from qrcode.image.svg import SvgPathImage
from PIL import Image


def generate_qr(url: str, output_dir: str, dark_theme: bool = True):
    os.makedirs(output_dir, exist_ok=True)

    # 1. High Resolution PNG with styled colors
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    if dark_theme:
        # Orange on Dark Indigo/Purple (#FF8A1F on #0D0718)
        fill_color = "#FF8A1F"
        back_color = "#0D0718"
    else:
        fill_color = "#000000"
        back_color = "#FFFFFF"

    png_path = os.path.join(output_dir, "nexora_qr.png")
    img_png = qr.make_image(fill_color=fill_color, back_color=back_color)
    img_png.save(png_path)
    print(f"Generated QR PNG: {png_path} ({img_png.size[0]}x{img_png.size[1]} px)")

    # 2. Scalable Vector Graphics (SVG)
    qr_svg = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
        image_factory=SvgPathImage,
    )
    qr_svg.add_data(url)
    qr_svg.make(fit=True)

    svg_path = os.path.join(output_dir, "nexora_qr.svg")
    img_svg = qr_svg.make_image()
    img_svg.save(svg_path)
    print(f"Generated QR SVG: {svg_path}")

    print("QR generation completed successfully!")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate high-resolution QR codes for NEXORA.")
    parser.add_argument(
        '--url',
        type=str,
        default="https://nexora2k26.onrender.com",
        help="Target URL encoded into the QR code."
    )
    parser.add_argument(
        '--out',
        type=str,
        default=os.path.join(os.path.dirname(os.path.dirname(__file__)), "invites", "static", "invites", "img"),
        help="Output directory."
    )
    args = parser.parse_args()
    generate_qr(args.url, args.out)
