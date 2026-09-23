# Original "chest open" cue for PinPlay Cup (procedural, no samples):
# a short wooden creak, a latch knock, then a bright two-note sparkle.
#   python scripts/build-cup-chest-sound.py chest.wav
#   ffmpeg -i chest.wav -ac 1 -b:a 64k cup/sounds/chest-open.mp3
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def env(n, attack, release):
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


def seg(dur):
    return np.arange(int(dur * SR)) / SR


out = np.zeros(int(0.62 * SR))

# creak: a rising resonant sweep with a little grain
t = seg(0.22)
f = np.linspace(180, 420, t.size)
phase = 2 * np.pi * np.cumsum(f) / SR
creak = np.sin(phase) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t)) + 0.25 * rng.standard_normal(t.size)
creak = np.convolve(creak, np.ones(24) / 24, mode='same') * env(t.size, 0.01, 0.08) * 0.45
out[: t.size] += creak

# latch knock
t = seg(0.07)
knock = (np.sin(2 * np.pi * 150 * t) + 0.5 * np.sin(2 * np.pi * 320 * t)) * np.exp(-t * 60) * 0.7
s = int(0.2 * SR)
out[s : s + t.size] += knock

# sparkle: two quick bell notes (E6, B6) with soft decay
for start, freq in ((0.24, 1318.5), (0.31, 1975.5)):
    t = seg(0.3)
    bell = (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t)) * np.exp(-t * 11) * 0.28
    s = int(start * SR)
    n = min(t.size, out.size - s)
    out[s : s + n] += bell[:n]

out *= env(out.size, 0.002, 0.05)
out /= max(1e-9, np.max(np.abs(out))) / 0.8
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
