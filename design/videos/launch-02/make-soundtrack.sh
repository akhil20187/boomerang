#!/bin/sh
# Builds launch-02's soundtrack: Lyria take-3 (first 28 s, faded) + phone ring + overlapping recreated sample calls.
# Calls go out at 10 s; the shop's "ninety-five nine hundred final" ends on the music hit at ~21.9 s.
set -e
cd "$(dirname "$0")"
EN=../../pages/variants/audio/aptronix-sample-call.mp3
HI=../../pages/variants/audio/aptronix-sample-call-hi.mp3
OUT=assets/audio/soundtrack.wav
ffmpeg -y -loglevel error \
  -i assets/music/take-3.mp3 -i $EN -i $HI \
  -f lavfi -t 1.2 -i "aevalsrc=0.5*(sin(2*PI*400*t)+sin(2*PI*450*t))*between(mod(t\,0.6)\,0\,0.4):s=48000" \
  -filter_complex "
  [0]atrim=0:28,asetpts=PTS-STARTPTS,volume='if(between(t,10,17),0.6,if(between(t,17,21.9),0.4,1))':eval=frame,afade=t=out:st=26.4:d=1.6[music];
  [3]highpass=f=300,lowpass=f=3400,volume=0.35,adelay=10000|10000,aformat=channel_layouts=stereo[ring];
  [1]atrim=7.5:11.4,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=3.8:d=0.1,pan=stereo|c0=0.9*c0|c1=0.4*c0,adelay=10300|10300[v1];
  [2]atrim=9.6:12.94,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=3.24:d=0.1,highpass=f=250,lowpass=f=4000,pan=stereo|c0=0.4*c0|c1=0.9*c0,volume=0.85,adelay=11000|11000[v2];
  [1]atrim=13.54:16.54,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=2.9:d=0.1,pan=stereo|c0=0.75*c0|c1=0.55*c0,volume=0.8,adelay=12200|12200[v3];
  [2]atrim=13.27:14.7,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=1.33:d=0.1,pan=stereo|c0=0.35*c0|c1=0.95*c0,adelay=12800|12800[v4];
  [1]atrim=11.74:13.15,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=1.31:d=0.1,pan=stereo|c0=0.95*c0|c1=0.35*c0,volume=0.9,adelay=13700|13700[v5];
  [2]atrim=15.1:17.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=2.4:d=0.1,highpass=f=250,lowpass=f=4000,pan=stereo|c0=0.5*c0|c1=0.8*c0,volume=0.8,adelay=14400|14400[v6];
  [1]atrim=19.0:23.67,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=4.57:d=0.1,pan=stereo|c0=0.7*c0|c1=0.7*c0,volume=1.1,adelay=17250|17250[v7];
  [v1][v2][v3][v4][v5][v6][v7][ring]amix=inputs=8:normalize=0,volume=1.6[calls];
  [music][calls]amix=inputs=2:normalize=0,alimiter=limit=0.8:level=false,atrim=0:28,volume=0.95[out]" \
  -map "[out]" -ar 48000 -ac 2 $OUT
echo "wrote $OUT"
