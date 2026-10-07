from pathlib import Path
import json,os,subprocess
root=Path(__file__).resolve().parent
env=dict(os.environ,HYPERFRAMES_PYTHON=str(root/'.venv/bin/python'))
for i,line in enumerate(json.loads((root/'narration.json').read_text())):
    subprocess.run([str(root/'node_modules/.bin/hyperframes'),'tts',line['text'],'--voice','af_nova','--speed','1.08','--output',str(root/f'assets/voice-{i}.wav'),'--json'],env=env,cwd=root,check=True)
