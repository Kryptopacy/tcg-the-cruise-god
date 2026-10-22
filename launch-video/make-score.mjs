// TCG Launch Film Soundtrack: 60.0s 44.1kHz Stereo House/Cruise Synthwave
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'assets/score.wav');

const SR = 44100;
const DUR = 60.0;
const N = Math.round(SR * DUR);
const BPM = 124;
const BEAT = 60 / BPM; // ~0.4838s
const BAR = BEAT * 4;

const L = new Float64Array(N);
const R = new Float64Array(N);
const sec = (t) => Math.round(t * SR);
const TAU = Math.PI * 2;

function add(t, dur, mono, pan = 0, gain = 1) {
  const start = sec(t);
  const len = Math.min(sec(dur), N - start);
  if (len <= 0) return;
  for (let i = 0; i < len; i++) {
    const v = mono[i] * gain;
    L[start + i] += v * (1 - Math.max(0, pan));
    R[start + i] += v * (1 + Math.min(0, pan));
  }
}

// 1. Kick Drum
function makeKick() {
  const dur = 0.35;
  const len = sec(dur);
  const out = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 140 * Math.exp(-t * 22) + 45;
    const env = Math.exp(-t * 10);
    out[i] = Math.sin(TAU * f * t) * env;
  }
  return out;
}

// 2. Snare / Clap
function makeClap() {
  const dur = 0.22;
  const len = sec(dur);
  const out = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18);
    const snap = Math.sin(TAU * 220 * t) * Math.exp(-t * 35);
    out[i] = noise * 0.7 + snap * 0.3;
  }
  return out;
}

// 3. Crisp Hi-Hat
function makeHat(open = false) {
  const dur = open ? 0.18 : 0.05;
  const len = sec(dur);
  const out = new Float64Array(len);
  const decay = open ? 15 : 55;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * decay);
    out[i] = noise * 0.35;
  }
  return out;
}

// 4. Synth Pluck / Chords
function makePluck(chord, dur) {
  const len = sec(dur);
  const out = new Float64Array(len);
  chord.forEach((freq, idx) => {
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const s1 = Math.sin(TAU * freq * t);
      const s2 = Math.sin(TAU * freq * 2 * t) * 0.3;
      const env = Math.exp(-t * 5.5);
      out[i] += (s1 + s2) * env * (0.2 / Math.sqrt(idx + 1));
    }
  });
  return out;
}

// 5. Deep Bass
function makeBass(freq, dur) {
  const len = sec(dur);
  const out = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const s1 = Math.sin(TAU * freq * t);
    const s2 = Math.sin(TAU * freq * 2 * t) * 0.25;
    const env = Math.min(1, t * 80) * Math.exp(-t * 2.0);
    out[i] = (s1 + s2) * env * 0.45;
  }
  return out;
}

// Compose Track
const kick = makeKick();
const clap = makeClap();
const closedHat = makeHat(false);
const openHat = makeHat(true);

// Chords: Fm (F3, Ab3, C4, Eb4), Db (Db3, F3, Ab3, C4), Bbm (Bb2, Db3, F3, Ab3), C7 (C3, E3, G3, Bb3)
const chords = [
  [174.61, 207.65, 261.63, 311.13],
  [138.59, 174.61, 207.65, 261.63],
  [116.54, 138.59, 174.61, 207.65],
  [130.81, 164.81, 196.00, 233.08]
];
const bassNotes = [87.31, 69.30, 58.27, 65.41];

for (let t = 0; t < DUR - 1; t += BEAT) {
  const beatIndex = Math.floor(t / BEAT);
  const barIndex = Math.floor(t / BAR);
  const chordIdx = barIndex % 4;

  // Intro (0 - 10s): atmospheric chords + gentle hat
  if (t < 9.5) {
    if (beatIndex % 4 === 0) {
      add(t, BAR * 0.9, makePluck(chords[chordIdx], BAR * 0.9), 0, 0.6);
    }
    if (t > 4.0 && beatIndex % 2 === 1) {
      add(t, 0.1, closedHat, 0.2, 0.3);
    }
    continue;
  }

  // Buildup (9.5s - 12s)
  if (t >= 9.5 && t < 12.0) {
    add(t, 0.15, makeKick(), 0, 0.7);
    add(t, 0.1, closedHat, -0.2, 0.4);
    continue;
  }

  // Main Energy (12s - 50s): Four on the floor kick + claps + rolling bass + plucks
  if (t >= 12.0 && t < 51.0) {
    // Kick every beat
    add(t, 0.35, kick, 0, 0.85);

    // Clap on 2 and 4
    if (beatIndex % 2 === 1) {
      add(t, 0.22, clap, 0.1, 0.75);
    }

    // Hi-hats
    add(t + BEAT / 2, 0.18, openHat, -0.3, 0.5);
    add(t, 0.05, closedHat, 0.3, 0.35);

    // Chords on offbeats
    if (beatIndex % 2 === 1) {
      add(t, BEAT * 0.8, makePluck(chords[chordIdx], BEAT * 0.8), -0.2, 0.6);
    }

    // Bassline
    add(t, BEAT * 0.9, makeBass(bassNotes[chordIdx], BEAT * 0.9), 0, 0.8);
  }

  // Outro (51s - 60s): Smooth melodic fade
  if (t >= 51.0) {
    if (beatIndex % 4 === 0) {
      const fadeGain = Math.max(0, (59 - t) / 8);
      add(t, BAR * 0.9, makePluck(chords[chordIdx], BAR * 0.9), 0, 0.5 * fadeGain);
    }
  }
}

// Write WAV File (16-bit PCM Stereo)
const totalBytes = 44 + N * 4;
const buffer = Buffer.alloc(totalBytes);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(totalBytes - 8, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // format chunk size
buffer.writeUInt16LE(1, 20);  // PCM
buffer.writeUInt16LE(2, 22);  // 2 channels
buffer.writeUInt32LE(SR, 24); // sample rate
buffer.writeUInt32LE(SR * 4, 28); // byte rate
buffer.writeUInt16LE(4, 32);  // block align
buffer.writeUInt16LE(16, 34); // 16-bit
buffer.write('data', 36);
buffer.writeUInt32LE(N * 4, 40);

// Normalize and interleave
let maxAmp = 0;
for (let i = 0; i < N; i++) {
  maxAmp = Math.max(maxAmp, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = maxAmp > 0.001 ? 0.92 / maxAmp : 1;

let offset = 44;
for (let i = 0; i < N; i++) {
  const leftSample = Math.max(-1, Math.min(1, L[i] * norm));
  const rightSample = Math.max(-1, Math.min(1, R[i] * norm));
  buffer.writeInt16LE(Math.round(leftSample * 32767), offset);
  buffer.writeInt16LE(Math.round(rightSample * 32767), offset + 2);
  offset += 4;
}

writeFileSync(OUT, buffer);
console.log(`Successfully generated master soundtrack: ${OUT} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
