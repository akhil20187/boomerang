"""Make a recreated sample call (AI voices) for the landing page.

Usage: python3 scripts/sample-calls/generate.py scripts/sample-calls/<name>.script.json
Needs OPENAI_API_KEY in .env and ffmpeg. Writes design/pages/variants/audio/<name>.mp3 and <name>.json (line timings).
Voices: AI caller "sage", shopkeeper "ash" (OpenAI gpt-4o-mini-tts). Shop lines get a phone-line filter.
Always label the result on the page as a recreated sample call with AI voices.
"""
import json, os, subprocess, sys, tempfile, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VOICES = {"ai": "sage", "shop": "ash"}
GAP = 0.45

def key():
    for line in open(os.path.join(ROOT, ".env")):
        if line.startswith("OPENAI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("OPENAI_API_KEY missing from .env")

def run(*args):
    subprocess.run(args, check=True)

def main(script_path):
    spec = json.load(open(script_path))
    name = os.path.basename(script_path).replace(".script.json", "")
    out_dir = os.path.join(ROOT, "design/pages/variants/audio")
    work = tempfile.mkdtemp()
    auth = key()
    parts, meta, t = [], [], 0.0
    for i, line in enumerate(spec["lines"]):
        who, text = line["who"], line["text"]
        style = spec["ai_style"] if who == "ai" else spec["shop_style"]
        body = json.dumps({"model": "gpt-4o-mini-tts", "voice": VOICES[who], "input": text, "instructions": style, "response_format": "wav"}).encode()
        req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=body, headers={"Authorization": "Bearer " + auth, "Content-Type": "application/json"})
        raw = f"{work}/l{i}.wav"
        open(raw, "wb").write(urllib.request.urlopen(req, timeout=120).read())
        filt = "highpass=f=300,lowpass=f=3400,acompressor=threshold=-18dB:ratio=3,volume=1.4" if who == "shop" else "highpass=f=200,lowpass=f=6000"
        clip = f"{work}/p{i}.wav"
        run("ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-ar", "16000", "-af", filt, clip)
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip], capture_output=True, text=True).stdout)
        meta.append({"who": who, "text": text, "start": round(t, 2), "end": round(t + d, 2)})
        silence = f"{work}/s{i}.wav"
        run("ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", str(GAP), silence)
        parts += [clip, silence]
        t += d + GAP
    listing = f"{work}/list.txt"
    open(listing, "w").write("".join(f"file '{p}'\n" for p in parts))
    run("ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listing, "-ac", "1", "-ar", "22050", "-b:a", "64k", f"{out_dir}/{name}.mp3")
    json.dump({"total": round(t, 2), "lines": meta}, open(f"{out_dir}/{name}.json", "w"), ensure_ascii=False, indent=1)
    print(f"{name}.mp3 · {round(t, 1)} s")

if __name__ == "__main__":
    main(sys.argv[1])
