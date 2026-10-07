"""
pass_generator.py
Generates personalized VIP Invitation Passes for NEXORA 2K26 using the official user-uploaded template.
"""

import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from django.conf import settings

def get_font(size: int, bold: bool = True):
    local_font_dir = os.path.join(settings.BASE_DIR, 'invites', 'static', 'invites', 'fonts')
    font_candidates = [
        os.path.join(local_font_dir, 'segoeuib.ttf' if bold else 'segoeui.ttf'),
        'C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/calibrib.ttf' if bold else 'C:/Windows/Fonts/calibri.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for path in font_candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

def generate_pass_image(name: str, roll_no: str, department: str = '', include_datetime: bool = False) -> BytesIO:
    """
    Renders the student's name and roll number onto the official Freshers_Party_Invitation_edited template.
    Returns BytesIO containing the image as PNG.
    """
    img_dir = os.path.join(settings.BASE_DIR, 'invites', 'static', 'invites', 'img')
    template_path = os.path.join(img_dir, 'Freshers_Party_Invitation_edited.png')

    if not os.path.exists(template_path):
        template_path = os.path.join(img_dir, 'invitation_banner.jpg')

    im = Image.open(template_path).convert('RGB')
    draw = ImageDraw.Draw(im)

    name_str = (name or '').strip().upper()
    roll_str = (roll_no or '').strip().upper()

    max_w = 290  # Max width before touching 'See you there!'

    # 1. Fit Name
    if name_str:
        font_size_name = 20
        font_name = get_font(font_size_name, bold=True)
        bbox_n = draw.textbbox((0, 0), name_str, font=font_name)
        while (bbox_n[2] - bbox_n[0]) > max_w and font_size_name > 11:
            font_size_name -= 1
            font_name = get_font(font_size_name, bold=True)
            bbox_n = draw.textbbox((0, 0), name_str, font=font_name)

        draw.text((210, 653), name_str, fill=(20, 16, 10), font=font_name)

    # 2. Fit Roll Number
    if roll_str:
        font_size_roll = 20
        font_roll = get_font(font_size_roll, bold=True)
        bbox_r = draw.textbbox((0, 0), roll_str, font=font_roll)
        while (bbox_r[2] - bbox_r[0]) > max_w and font_size_roll > 10:
            font_size_roll -= 1
            font_roll = get_font(font_size_roll, bold=True)
            bbox_r = draw.textbbox((0, 0), roll_str, font=font_roll)

        draw.text((210, 687), roll_str, fill=(20, 16, 10), font=font_roll)

    buf = BytesIO()
    im.save(buf, format='PNG', quality=95)
    buf.seek(0)
    return buf
