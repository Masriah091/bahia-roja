// BAHÍA ROJA — sound: a tiny WebAudio synth, no samples, no network.
// Every effect is oscillators and filtered noise shaped per call: gunshots
// crack, crashes thud, the till rings, the siren wails in the distance
// while the Guardia is close. Audio starts only after a user gesture
// (browser policy); before that, every method is a silent no-op, and the
// screenshot scenes never hear a thing.

export function createAudio() {
  let ac = null;
  let master = null;
  let sirenNodes = null;

  function ensure() {
    if (ac) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from any user gesture: unlocks the context for the session. */
  function unlock() {
    if (ensure() && ac.state === 'suspended') ac.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!ensure()) return;
    const t = ac.currentTime;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 1200;
    const gain = ac.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    unlock,
    /** One gunshot. vol scales with distance from the camera's ear. */
    shot(vol) {
      noise(0.09, Math.min(0.5, vol || 0.3), 2600);
      tone(140, 0.07, 'square', 0.12, 60);
    },
    /** A vehicle impact; big ones bloom into an explosion rumble. */
    crash(big) {
      noise(big ? 0.7 : 0.25, big ? 0.6 : 0.3, big ? 500 : 900);
      tone(big ? 70 : 95, big ? 0.6 : 0.2, 'sine', 0.4, 34);
    },
    /** The till: two bright notes, money in. */
    cash() {
      tone(880, 0.09, 'triangle', 0.22);
      setTimeout(() => tone(1318, 0.14, 'triangle', 0.22), 55);
    },
    /** A flat buzz: the shop, the door, the game says no. */
    denied() {
      tone(160, 0.16, 'sawtooth', 0.16, 120);
    },
    /** A soft blip: cargo loaded, checkpoint reached. */
    pickup() {
      tone(620, 0.08, 'triangle', 0.2, 920);
    },
    /** Mission complete sting: a rising triad. */
    sting() {
      tone(523, 0.14, 'triangle', 0.22);
      setTimeout(() => tone(659, 0.14, 'triangle', 0.22), 110);
      setTimeout(() => tone(784, 0.3, 'triangle', 0.24), 220);
    },
    /** The bust/wasted sting: everything falls down a minor third. */
    down() {
      tone(392, 0.3, 'triangle', 0.24, 370);
      setTimeout(() => tone(311, 0.5, 'triangle', 0.24, 280), 240);
    },
    /** Start the looping siren while the hunt is hot; stop it when cool. */
    siren(on) {
      if (!ensure()) return;
      if (on && !sirenNodes) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const lfo = ac.createOscillator();
        const lfoGain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 760;
        lfo.frequency.value = 0.55;
        lfoGain.gain.value = 160;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.value = 0.045;
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        lfo.start();
        sirenNodes = { osc, lfo, gain };
      } else if (!on && sirenNodes) {
        try {
          sirenNodes.osc.stop();
          sirenNodes.lfo.stop();
        } catch { /* already stopped */ }
        sirenNodes = null;
      }
    },
  };
}
