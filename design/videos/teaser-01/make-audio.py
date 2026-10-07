"""Compose an original music bed and assemble scene-timed narration."""
from pathlib import Path
import json, math, subprocess, wave, array
ROOT=Path(__file__).resolve().parent
RATE=48000
DURATION=33
def wav(path,samples):
    out=array.array('h',(round(max(-1,min(1,v))*32767) for v in samples))
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(out.tobytes())
chords=[(220,261.63,329.63),(174.61,220,261.63),(130.81,164.81,196),(196,246.94,293.66)]
music=[]
for n in range(RATE*DURATION):
    t=n/RATE;chord=chords[int(t/4)%4]
    pad=sum(math.sin(2*math.pi*f*t)*.011 for f in chord)
    phase=t%.5;freq=chord[int(t/.5)%3]*2
    pluck=math.sin(2*math.pi*freq*phase)*math.exp(-phase*13)*.025
    kp=t%1;kick=math.sin(2*math.pi*55*kp)*math.exp(-kp*24)*.02
    fade=min(1,t/1.5,max(0,(DURATION-t)/2.5))
    music.append((pad+pluck+kick)*fade)
wav(ROOT/'assets/music.wav',music)
segments=json.loads((ROOT/'narration.json').read_text());combined=[0.]*(RATE*DURATION)
for i,s in enumerate(segments):
    source=ROOT/f'assets/voice-{i}.wav';converted=ROOT/f'assets/voice-{i}-48k.wav'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(source),'-ar',str(RATE),'-ac','1','-af','loudnorm=I=-16:TP=-2:LRA=7',str(converted)],check=True)
    with wave.open(str(converted),'rb') as w:
        raw=array.array('h');raw.frombytes(w.readframes(w.getnframes()))
    samples=[v/32768 for v in raw];end=s['start']+len(samples)/RATE
    deadline=segments[i+1]['start']-.25 if i+1<len(segments) else DURATION-.35
    if end>deadline:raise ValueError(f'Voice {i} ends at {end:.2f}, past {deadline:.2f}; speed up this segment before mixing')
    offset=round(s['start']*RATE)
    for k,v in enumerate(samples):combined[offset+k]+=v
    print(f'Voice {i}: {s["start"]:.2f}–{end:.2f}s')
wav(ROOT/'assets/narration.wav',combined)
