// AI AGENT — OPTIONAL real AI reasoning via the Anthropic API.
// Requires: your own API key (from console.anthropic.com), and internet access.
// If no key is set, or the call fails for any reason, the app automatically
// falls back to the rule-based logic in triageAgent.js / logisticsAgent.js /
// commanderAgent.js — so this is safe to enable without risking your demo.

let AEGIS_API_KEY = null;
let USE_REAL_AI = false;

async function callAgentAI(role, scenario, context) {
  if (!AEGIS_API_KEY) throw new Error("No API key set");

  const prompts = {
    triage: `You are the Triage Bot in a disaster response AI system. In ONE short sentence (max 25 words), propose a rescue action and state the life threat level (LOW/HIGH/CRITICAL) for this scenario: ${JSON.stringify(scenario)}`,
    logistics: `You are the Logistics Bot in a disaster response AI system. The proposed rescue asset survivability is ${scenario.assetSurvivable}, and the known risk is: "${scenario.logisticsRisk}". In ONE short sentence (max 25 words), either confirm the route is safe, or object with the specific reason.`,
    commander: `You are the Commander Bot resolving a disagreement between two AI agents in a disaster response system. Triage said: "${context.triageText}". Logistics said: "${context.logisticsText}". In ONE short sentence (max 25 words), give the final operational decision.`
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AEGIS_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 150,
      messages: [{ role: "user", content: prompts[role] }]
    })
  });

  if (!res.ok) throw new Error("API request failed: " + res.status);
  const data = await res.json();
  return data.content[0].text.trim();
}

// Builds the 3-line debate sequence using real AI calls, in the same
// {cls, text} shape that debateEngine.js expects.
async function buildAILines(scenario) {
  const triageText = await callAgentAI("triage", scenario, {});
  const logisticsText = await callAgentAI("logistics", scenario, {});
  const commanderText = await callAgentAI("commander", scenario, { triageText, logisticsText });

  return [
    { cls: "triage", text: `[TRIAGE] ${triageText}` },
    { cls: "logistics", text: `[LOGISTICS] ${logisticsText}` },
    { cls: "commander", text: `[COMMANDER] ${commanderText}` }
  ];
}
