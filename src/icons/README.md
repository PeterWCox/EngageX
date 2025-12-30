# Icon Generation

The extension requires PNG icons in multiple sizes. The source SVG is `icon.svg`.

## Quick Setup (Using Online Tool)

1. Open `icon.svg` in a browser or image editor
2. Export as PNG at these sizes:
   - 16x16 pixels → `icon-16.png`
   - 32x32 pixels → `icon-32.png`
   - 48x48 pixels → `icon-48.png`
   - 128x128 pixels → `icon-128.png`

## Using ImageMagick (Command Line)

```bash
# Install ImageMagick first: brew install imagemagick (Mac) or apt-get install imagemagick (Linux)

convert -background none icon.svg -resize 16x16 icon-16.png
convert -background none icon.svg -resize 32x32 icon-32.png
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 128x128 icon-128.png
```

## Using Inkscape (Command Line)

```bash
# Install Inkscape first

inkscape icon.svg --export-filename=icon-16.png --export-width=16 --export-height=16
inkscape icon.svg --export-filename=icon-32.png --export-width=32 --export-height=32
inkscape icon.svg --export-filename=icon-48.png --export-width=48 --export-height=48
inkscape icon.svg --export-filename=icon-128.png --export-width=128 --export-height=128
```

## Icon Design

The icon features:
- **Blue gradient background** - Twitter/X brand color
- **White badge shape** - Represents the engagement badges
- **Green checkmark** - High engagement opportunity
- **Orange lightning bolt** - Engagement timing indicator
- **Red notification dot** - Alert/opportunity indicator

## Temporary Solution

If you don't have image conversion tools, you can:
1. Use an online SVG to PNG converter (search "svg to png converter")
2. Or use the browser: Open `icon.svg` in Chrome, right-click → Inspect → Screenshot element at different zoom levels

