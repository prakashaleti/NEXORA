"""
Extracts crowd silhouettes and optimized WebP background layers from poster.png.
Generates:
  - poster_bg.webp (Compressed background)
  - crowd_back.webp (Deep silhouettes layer)
  - crowd_mid.webp (Mid silhouettes layer)
  - crowd_front.webp (Foreground silhouettes layer)
"""

import os
from PIL import Image, ImageFilter


def extract_crowd_layers(poster_path: str, output_dir: str):
    print(f"Loading poster from: {poster_path}")
    im = Image.open(poster_path).convert('RGB')
    w, h = im.size
    print(f"Poster dimensions: {w}x{h}")

    os.makedirs(output_dir, exist_ok=True)

    # 1. Save optimized background WebP (quality 85, lossless=False)
    bg_out = os.path.join(output_dir, 'poster_bg.webp')
    im.save(bg_out, 'WEBP', quality=85, method=6)
    bg_size_kb = os.path.getsize(bg_out) / 1024
    print(f"Saved optimized background: {bg_out} ({bg_size_kb:.1f} KB)")

    # Convert image to RGBA for transparent layer generation
    rgba = im.convert('RGBA')

    # Compute luminance grayscale map
    gray = im.convert('L')

    # We extract silhouettes from bottom 40% (y >= 0.60 * h)
    y_start = int(h * 0.60)

    # Define 3 depth layers
    layers = [
        {
            'name': 'crowd_back',
            'y_min': int(h * 0.65),
            'y_max': int(h * 0.85),
            'lum_thresh': 55,
            'tint': (15, 10, 30),
            'base_alpha': 0.75,
        },
        {
            'name': 'crowd_mid',
            'y_min': int(h * 0.72),
            'y_max': int(h * 0.93),
            'lum_thresh': 50,
            'tint': (12, 8, 24),
            'base_alpha': 0.88,
        },
        {
            'name': 'crowd_front',
            'y_min': int(h * 0.78),
            'y_max': h,
            'lum_thresh': 45,
            'tint': (5, 3, 12),
            'base_alpha': 0.98,
        },
    ]

    for layer_cfg in layers:
        layer_name = layer_cfg['name']
        y_min = layer_cfg['y_min']
        y_max = layer_cfg['y_max']
        lum_thresh = layer_cfg['lum_thresh']
        tint = layer_cfg['tint']
        base_alpha = layer_cfg['base_alpha']

        # Create transparent canvas for this layer
        layer_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))

        # Pixel-level silhouette extraction
        layer_pixels = layer_img.load()
        gray_pixels = gray.load()

        for y in range(y_min, y_max):
            # Vertical gradient factor so silhouette grounds itself towards bottom
            v_progress = (y - y_min) / max(1, (y_max - y_min))
            ground_weight = min(1.0, 0.4 + 0.6 * v_progress)

            for x in range(w):
                lum = gray_pixels[x, y]
                # Silhouettes are low luminance regions or grounded bottom pixels
                if lum < lum_thresh or (y > int(h * 0.92) and lum < 75):
                    # Inverted alpha: lower lum = more solid
                    alpha_factor = 1.0 - (lum / max(1, lum_thresh))
                    alpha_val = int(255 * base_alpha * ground_weight * max(0.4, min(1.0, alpha_factor + 0.3)))
                    layer_pixels[x, y] = (tint[0], tint[1], tint[2], min(255, alpha_val))

        # Apply subtle Gaussian blur to alpha channel for smooth feathering
        r, g, b, a = layer_img.split()
        a_blurred = a.filter(ImageFilter.GaussianBlur(radius=1.2))
        layer_img = Image.merge('RGBA', (r, g, b, a_blurred))

        out_path = os.path.join(output_dir, f"{layer_name}.webp")
        layer_img.save(out_path, 'WEBP', quality=85, method=6)
        file_size_kb = os.path.getsize(out_path) / 1024
        print(f"Extracted layer: {out_path} ({file_size_kb:.1f} KB)")

    print("All crowd silhouette layers successfully extracted!")


if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    poster_file = os.path.join(base_dir, 'poster.png')
    static_img_dir = os.path.join(base_dir, 'invites', 'static', 'invites', 'img')

    if not os.path.exists(poster_file):
        raise FileNotFoundError(f"Poster not found at {poster_file}")

    extract_crowd_layers(poster_file, static_img_dir)
