// WAVEFORM — generates the animated bar-style waveform in Panel A.
// Each bar gets a random animation delay so they don't all bounce in sync.

function renderWaveform() {
  const wave = document.getElementById("waveform");
  wave.innerHTML = "";
  const barCount = 24;
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.animationDelay = (Math.random() * 1).toFixed(2) + "s";
    bar.style.animationDuration = (0.6 + Math.random() * 0.6).toFixed(2) + "s";
    wave.appendChild(bar);
  }
}
