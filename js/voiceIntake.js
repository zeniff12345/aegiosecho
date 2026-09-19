// VOICE INTAKE — real microphone voice intake, fusing TWO independent modalities:
//
//   1) SEMANTIC  — speech-to-text transcript, scored by keyword urgency
//                  (estimateStressFromText). In Chrome this needs internet:
//                  the audio is sent to Google's servers to transcribe.
//
//   2) ACOUSTIC  — the raw microphone waveform, analyzed locally in-browser
//                  with the Web Audio API (volume + volatility). This never
//                  leaves the device and needs no network at all.
//
// The two scores are fused into one stress index. If the semantic layer is
// unavailable (offline, unsupported browser, recognition error/no speech),
// the acoustic layer alone still produces a usable case — that's what keeps
// Live Voice Intake usable straight through the "unplug the internet" demo
// moment, just running in a reduced (acoustic-only) mode instead of failing.

const ACOUSTIC_SAMPLE_MS = 3200;
const ACOUSTIC_SAMPLE_INTERVAL_MS = 90;

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values) {
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) * (v - m)));
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Samples raw microphone amplitude locally (Web Audio API — no network
// involved) and turns it into a 0-100 "acoustic stress" reading based on how
// loud and how erratic/unstable the voice signal is. This is a lightweight
// signal-processing proxy for vocal stress, not a trained model — the same
// level of rigor as the existing keyword-based text scorer. Tune the
// constants below against real test recordings (a calm voice vs. a
// shouting/panicked voice) before relying on it in a live demo.
function captureAcousticProfile(stream, durationMs = ACOUSTIC_SAMPLE_MS) {
  return new Promise((resolve) => {
    let audioCtx;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      resolve({ available: false, reason: "no-audio-context" });
      return;
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const samples = [];

    const sampleOnce = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128; // -1..1
        sumSquares += normalized * normalized;
      }
      samples.push(Math.sqrt(sumSquares / bufferLength)); // RMS amplitude, 0..~1
    };

    const intervalId = setInterval(sampleOnce, ACOUSTIC_SAMPLE_INTERVAL_MS);

    setTimeout(() => {
      clearInterval(intervalId);
      try { source.disconnect(); } catch (e) { /* noop */ }
      try { audioCtx.close(); } catch (e) { /* noop */ }

      if (samples.length < 3) {
        resolve({ available: false, reason: "insufficient-samples" });
        return;
      }

      const avgVolume = mean(samples);
      const volatility = stddev(samples);
      // Tunable heuristic — calibrate against real mic input before a live demo.
      const score = Math.round(clamp(28 + avgVolume * 230 + volatility * 260, 0, 100));

      resolve({ available: true, avgVolume, volatility, score });
    }, durationMs);
  });
}

// Wraps the event-based SpeechRecognition API in a Promise that always
// resolves (never rejects) with { available, text|reason } — so a
// recognition failure (e.g. "network" when offline) degrades gracefully
// instead of throwing.
function wrapSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return Promise.resolve({ available: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    recognition.onresult = (event) => {
      const text = event.results && event.results[0] && event.results[0][0]
        ? event.results[0][0].transcript.trim()
        : "";
      finish(text ? { available: true, text } : { available: false, reason: "empty" });
    };

    recognition.onerror = (event) => {
      // Root cause: recognition errors and synchronous start failures had no
      // persistent UI status — every branch here now resolves with a reason
      // that startVoiceIntake turns into a status message.
      finish({ available: false, reason: event.error || "error" });
    };

    recognition.onend = () => {
      finish({ available: false, reason: "ended" });
    };

    try {
      recognition.start();
    } catch (error) {
      finish({ available: false, reason: "start-failed" });
    }
  });
}

// Chrome's SpeechRecognition reports a "network" error whenever it can't
// reach the transcription service — which includes genuinely being
// offline, but ALSO includes things unrelated to your connection (the
// speech endpoint being unreachable from a file:// origin or an embedded
// webview, a proxy/firewall blocking it, the service being rate-limited).
// navigator.onLine tells us whether the browser itself thinks it has a
// network at all, so we only claim "offline" when that's actually true —
// otherwise we say the service was unreachable, which is what we actually
// know for certain.
function describeSemanticFailure(reason) {
  if (reason !== "network") return "No speech recognized";
  return navigator.onLine
    ? "Speech service unreachable (blocked or restricted, not necessarily offline)"
    : "No internet detected (offline)";
}

function statusForOutcome(semantic, acoustic) {
  if (semantic.available && acoustic.available) return "Done — semantic + acoustic fused.";
  if (acoustic.available) {
    return `${describeSemanticFailure(semantic.reason)} — using acoustic-only voice stress reading.`;
  }
  if (semantic.available) return "Done — transcript captured (acoustic reading unavailable).";
  return "Couldn't read voice or acoustics. Check microphone and try again.";
}

async function startVoiceIntake() {
  const btn = document.getElementById("live-intake-btn");
  const status = document.getElementById("voice-status");

  function setVoiceStatus(message) {
    if (status) status.textContent = message;
    if (btn) btn.setAttribute("aria-label", message || "Start live voice intake");
  }

  btn.textContent = "🎙 Requesting mic...";
  btn.disabled = true;
  setVoiceStatus("Requesting microphone access...");

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    setVoiceStatus("No microphone permission — can't capture voice or acoustics.");
    btn.textContent = "🎙 Live Voice Intake";
    btn.disabled = false;
    return;
  }

  btn.textContent = "🎙 Listening...";
  setVoiceStatus("Listening — capturing speech content + voice acoustics...");

  const [acoustic, semantic] = await Promise.all([
    captureAcousticProfile(stream),
    wrapSpeechRecognition()
  ]);

  stream.getTracks().forEach((track) => track.stop());

  // Diagnostic only — shows the raw acoustic/semantic readings in DevTools
  // so the scoring constants in captureAcousticProfile() can be sanity
  // checked against a real voice. Safe to remove once you're happy with it.
  console.log("[Aegis Echo] voice intake result:", { acoustic, semantic });

  btn.textContent = "🎙 Live Voice Intake";
  btn.disabled = false;

  if (!acoustic.available && !semantic.available) {
    setVoiceStatus(statusForOutcome(semantic, acoustic));
    return;
  }

  const created = createLiveCase(semantic, acoustic);
  setVoiceStatus(`${statusForOutcome(semantic, acoustic)} Fused stress: ${created.stressIndex}.`);
}

// Very simple keyword-based stress estimation from raw speech text.
// This is a stand-in for real NLP sentiment/urgency analysis — the semantic
// half of the fusion (see captureAcousticProfile for the acoustic half).
function estimateStressFromText(text) {
  const urgentWords = ["help", "trapped", "dying", "water", "fire", "can't breathe",
                        "urgent", "collapse", "drowning", "burning", "please", "hurry"];
  let score = 45;
  const lower = text.toLowerCase();
  urgentWords.forEach((word) => { if (lower.includes(word)) score += 10; });
  return Math.min(score, 99);
}

function createLiveCase(semantic, acoustic) {
  const semanticScore = semantic.available ? estimateStressFromText(semantic.text) : null;
  const acousticScore = acoustic.available ? acoustic.score : null;

  let fusedStress;
  if (semanticScore !== null && acousticScore !== null) {
    fusedStress = Math.round(semanticScore * 0.55 + acousticScore * 0.45);
  } else if (semanticScore !== null) {
    fusedStress = semanticScore;
  } else {
    fusedStress = acousticScore;
  }

  const hazardTag = semanticScore !== null && acousticScore !== null
    ? "Live voice intake — semantic + acoustic fusion"
    : acousticScore !== null
      ? `Live voice intake — acoustic-only (${navigator.onLine ? "speech service unreachable" : "offline"})`
      : "Live voice intake — semantic-only (no acoustic reading)";

  const liveScenario = {
    id: "live-" + Date.now(),
    name: "LIVE INTAKE — " + new Date().toLocaleTimeString([], { hour12: false }),
    transcript: semantic.available ? semantic.text : "[No transcript — acoustic-only capture]",
    hazardTag,
    stressIndex: fusedStress,
    semanticStress: semanticScore,
    acousticStress: acousticScore,
    mapX: 50,
    mapY: 50,
    logisticsRisk: "Unverified — awaiting logistics confirmation.",
    assetSurvivable: fusedStress < 85,
    assetType: "ground"
  };

  scenarios.unshift(liveScenario);
  renderCaseList();
  updateIncidentCounter();
  selectScenario(liveScenario.id);
  return liveScenario;
}
