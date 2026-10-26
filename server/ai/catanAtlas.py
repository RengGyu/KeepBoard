"""Deterministic projective rasterization of actual input pixels; never a template."""
import base64
import io
import json
import sys
from PIL import Image

data = json.load(sys.stdin)
source = Image.open(io.BytesIO(base64.b64decode(data['image'], validate=True))).convert('RGB')
source.load()
atlas = Image.new('RGB', (data['width'], data['height']), (242, 242, 242))
for panel in data['panels']:
    m = panel['matrix']
    # Matrix maps output-panel pixel coordinates to normalized source coordinates.
    coeff = (m[0] * source.width, m[1] * source.width, m[2] * source.width,
             m[3] * source.height, m[4] * source.height, m[5] * source.height,
             m[6], m[7])
    tile = source.transform((data['size'], data['size']), Image.Transform.PERSPECTIVE,
                            coeff, Image.Resampling.BICUBIC)
    atlas.paste(tile, (panel['x'], panel['y']))
output = io.BytesIO()
atlas.save(output, format='PNG', compress_level=6)
json.dump({'png': base64.b64encode(output.getvalue()).decode('ascii'),
           'sourceDimensions': {'width': source.width, 'height': source.height}}, sys.stdout)
