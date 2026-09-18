/**
 * js/waveform.js
 * Controls dynamic audio waveform bar animations for Panel A.
 */

// Function to dynamically generate waveform visualizer bars
function initWaveform(barCount = 8) {
  const container = document.getElementById('waveform-container');
  if (!container) return;

  container.innerHTML = ''; // Clear existing bars

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    // Randomize initial animation delay for an organic visual feel
    bar.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
    container.appendChild(bar);
  }
}

// Automatically build waveform when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  initWaveform(8);
});
