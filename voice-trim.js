/*
 * The automatic trim of a voice actor's take (VOICE_ACTORS_PLAN.md), shared by
 * the teacher's panel (voice-actors.js) and the volunteers' page (record.js),
 * so the whole recording sounds the same on both.
 */

// The speech in a take, in ms: the RMS of 20 ms windows against the take's
// own noise floor, with a little air kept at both ends.
function vaAutoTrim(buffer) {
  const data = buffer.getChannelData(0);
  const win = Math.max(1, Math.round(buffer.sampleRate * 0.02));
  const rms = [];
  for (let i = 0; i < data.length; i += win) {
    let sum = 0;
    const end = Math.min(data.length, i + win);
    for (let j = i; j < end; j += 1) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / (end - i)));
  }
  const total = Math.round(buffer.duration * 1000);
  if (!rms.length) return { s: 0, e: total };
  const sorted = rms.slice().sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  const threshold = Math.max(floor * 3, peak * 0.1, 0.003);
  const first = rms.findIndex((v) => v > threshold);
  let last = -1;
  for (let i = rms.length - 1; i >= 0; i -= 1) if (rms[i] > threshold) { last = i; break; }
  if (first < 0) return { s: 0, e: total };
  const s = Math.max(0, first * 20 - 120);
  const e = Math.min(total, (last + 1) * 20 + 200);
  return { s, e };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { vaAutoTrim };
}
