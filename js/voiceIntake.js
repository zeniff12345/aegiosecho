// VOICE INTAKE — real microphone speech-to-text using the browser's built-in
// Speech Recognition API. NOTE: this specific feature requires internet
// (Chrome sends audio to Google's servers to transcribe it) — it is NOT
// part of the offline demo path. Use it as a separate "live intake" showcase
// when you do have a connection, e.g. before the "unplug the internet" moment.

function startVoiceIntake() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition isn't supported in this browser. Try Chrome.");
    return;
  }

  const btn = document.getElementById("live-intake-btn");
  btn.textContent = "🎙 Listening...";
  btn.disabled = true;

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    createLiveCaseFromTranscript(text);
  };

  recognition.onerror = () => {
    alert("Couldn't hear anything, or microphone/internet access was blocked. Try again.");
  };

  recognition.onend = () => {
    btn.textContent = "🎙 Live Voice Intake (needs internet)";
    btn.disabled = false;
  };

  recognition.start();
}

// Very simple keyword-based stress estimation from raw speech text.
// This is a stand-in for real NLP sentiment/urgency analysis.
function estimateStressFromText(text) {
  const urgentWords = ["help", "trapped", "dying", "water", "fire", "can't breathe",
                        "urgent", "collapse", "drowning", "burning", "please", "hurry"];
  let score = 45;
  const lower = text.toLowerCase();
  urgentWords.forEach((word) => { if (lower.includes(word)) score += 10; });
  return Math.min(score, 99);
}

function createLiveCaseFromTranscript(text) {
  const stress = estimateStressFromText(text);
  const liveScenario = {
    id: "live-" + Date.now(),
    name: "LIVE INTAKE — " + new Date().toLocaleTimeString([], { hour12: false }),
    transcript: text,
    hazardTag: "Live voice intake — auto-classified",
    stressIndex: stress,
    mapX: 50,
    mapY: 50,
    logisticsRisk: "Unverified — awaiting logistics confirmation.",
    assetSurvivable: stress < 85,
    assetType: "ground"
  };

  scenarios.unshift(liveScenario);
  renderCaseList();
  updateIncidentCounter();
  selectScenario(liveScenario.id);
}
