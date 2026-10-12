export function signalCalled() {
  try {
    navigator.vibrate?.([220, 80, 220, 80, 420]);
  } catch {
    // Vibration is missing or blocked (desktop, some iOS).
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Autoplay policies can block the chime until a tap.
  }
}