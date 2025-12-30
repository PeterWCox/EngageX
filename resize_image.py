#!/usr/bin/env python3
from PIL import Image
import sys

try:
    # Open the image
    img = Image.open('image.png')
    
    # Convert to RGB (removes alpha channel for JPEG)
    if img.mode in ('RGBA', 'LA', 'P'):
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        rgb_img.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
        img = rgb_img
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize to 1280x800 (Chrome Web Store requirement)
    img_resized = img.resize((1280, 800), Image.Resampling.LANCZOS)
    
    # Save as JPEG with high quality
    img_resized.save('chrome-store.jpg', 'JPEG', quality=95)
    
    print(f'Successfully created chrome-store.jpg')
    print(f'Dimensions: {img_resized.size[0]}x{img_resized.size[1]}')
    print(f'Format: JPEG')
    
except ImportError:
    print("PIL/Pillow not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'Pillow'])
    # Retry
    from PIL import Image
    img = Image.open('image.png')
    if img.mode in ('RGBA', 'LA', 'P'):
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        rgb_img.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
        img = rgb_img
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    img_resized = img.resize((1280, 800), Image.Resampling.LANCZOS)
    img_resized.save('chrome-store.jpg', 'JPEG', quality=95)
    print(f'Successfully created chrome-store.jpg')
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)

