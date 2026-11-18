// Synthesized sound effects. Every sound is built from oscillators and a
// short noise buffer at play time — the game ships no audio files at all.
// The context is created lazily on the first user gesture (browsers block
// audio before one), and every call is a no-op until it exists, so the staged
// screenshots never wait on sound. M toggles mute through input state.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      const length = Math.floor(context.sampleRate * 0.25);
      noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  function tone({ type = 'sine', from = 440, to = null, seconds = 0.12, volume = 0.5, delay = 0 }) {
    if (muted || !ensure()) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  function noise({ seconds = 0.15, volume = 0.4, delay = 0, lowpass = 1200 }) {
    if (muted || !ensure()) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + seconds + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.22;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone({ type: 'square', from: 880, to: 320, seconds: 0.07, volume: 0.16 });
    },
    hit() {
      noise({ seconds: 0.09, volume: 0.3, lowpass: 2400 });
      tone({ type: 'triangle', from: 240, to: 90, seconds: 0.09, volume: 0.25 });
    },
    shardDown() {
      tone({ type: 'sawtooth', from: 320, to: 60, seconds: 0.22, volume: 0.3 });
      noise({ seconds: 0.18, volume: 0.22, lowpass: 1600 });
    },
    spore() {
      tone({ type: 'sine', from: 660, to: 990, seconds: 0.09, volume: 0.2 });
    },
    nova() {
      tone({ type: 'sine', from: 180, to: 1440, seconds: 0.5, volume: 0.4 });
      tone({ type: 'sine', from: 90, to: 720, seconds: 0.5, volume: 0.3, delay: 0.05 });
      noise({ seconds: 0.4, volume: 0.2, lowpass: 3200 });
    },
    hurt() {
      tone({ type: 'sawtooth', from: 200, to: 50, seconds: 0.3, volume: 0.4 });
      noise({ seconds: 0.25, volume: 0.3, lowpass: 900 });
    },
    heart() {
      tone({ type: 'sine', from: 520, to: 780, seconds: 0.12, volume: 0.25 });
      tone({ type: 'sine', from: 780, to: 1040, seconds: 0.14, volume: 0.25, delay: 0.1 });
    },
    waveStart() {
      tone({ type: 'triangle', from: 330, seconds: 0.14, volume: 0.3 });
      tone({ type: 'triangle', from: 495, seconds: 0.16, volume: 0.3, delay: 0.1 });
    },
    gameOver() {
      tone({ type: 'triangle', from: 392, to: 196, seconds: 0.5, volume: 0.3 });
      tone({ type: 'triangle', from: 294, to: 147, seconds: 0.6, volume: 0.3, delay: 0.25 });
    },
  };
}
