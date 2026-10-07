# Boomerang teaser 01 — Now you can

One problem-first video for Twitter/X and LinkedIn, made on 7 October 2026.

- `boomerang-teaser-01.mp4`: 33 seconds, 1080×1080, 30fps, H.264 with stereo AAC audio.
- `index.html`: editable Hyperframes composition.
- `narration.json`: scene-timed voice script.
- `assets/narration.wav`: Kokoro Nova narration at 1.08× speed, normalised per phrase.
- `assets/music.wav`: original restrained chord/pulse music, composed in `make-audio.py`; no external music licence required for this original source.
- `poster.jpg`: logo reveal from the exported video.
- `contact-sheet.jpg`: six scenes from the exported MP4, scaled to phone width.

## Story

Compare online → nearby shops might offer more → calling them all takes effort → Now you can, with Boomerang → selected-shop demo → choose where to buy.

Existing brand assets, product image, example shops, distances and answers reused from the project. The demo is explicitly labelled as a sample with time compressed. The nearby offer is a possibility, not a promise. No real shop calls, spending or publishing performed.

## Regenerate

```sh
npm install
python3 -m venv .venv
.venv/bin/pip install kokoro-onnx soundfile
.venv/bin/python generate-voice.py
.venv/bin/python make-audio.py
npm run check
npm run render -- --output boomerang-teaser-01.mp4 --quality high --fps 30 --workers 1
```

First voice generation downloads the local model. The supplied audio and local GSAP asset let the existing composition render without fetching them again.

## Verification

Hyperframes checks passed with no runtime, layout or motion errors, and all 41 sampled text contrast checks passed. Reviewed warnings: intentional short crossfades and reused product/logo images. Voice phrase timings checked against scene boundaries. Exported MP4 fully decoded without errors; contains H.264 video and 48kHz stereo AAC. First export's audio peak was −1.7 dBFS, with no clipping detected. Rendered scene contact sheet visually inspected at 360px per scene; result-caption defect found and corrected before the final export.

Limits: no subjective listening review or real-phone playback check. The separate animation-map helper failed twice to initialise; built-in motion checks and rendered frames were used. Platform upload/playback not tested.
