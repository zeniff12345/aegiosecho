// AI AGENT — OPTIONAL real AI reasoning via the Anthropic API.
// Requires: your own API key (from console.anthropic.com), and internet access.
// If no key is set, or the call fails for any reason, the app automatically
// falls back to the rule-based logic in needsImpactAgent.js /
// resourceLogisticsAgent.js / commandAgent.js — so this is safe to enable
// without risking your demo.

let AEGIS_API_KEY = null;
let USE_REAL_AI = false;

async function callAgentAI(role, scenario, context) {
  if (!AEGIS_API_KEY) throw new Error("No API key set");

  const prompts = {
    needs: `You are the Needs & Impact Agent in a Nepal disaster-response command system. In ONE short sentence (max 25 words), state the life threat level (LOW/MODERATE/HIGH/CRITICAL), roughly how many people are at risk, and the top resource you'd request for this scenario: ${JSON.stringify({ name: scenario.name, transcript: scenario.transcript, hazardTag: scenario.hazardTag, stressIndex: scenario.stressIndex })}`,
    resource: `You are the Resource & Logistics Agent in the same system. The proposed rescue asset survivability is ${scenario.assetSurvivable}, and the known constraint is: "${scenario.logisticsRisk}". In ONE short sentence (max 25 words), either confirm the route/allocation is clear, or raise a CHALLENGE with the specific reason and a counter-proposal.`,
    command: `You are the Command & Prioritization Agent resolving a disagreement between two AI agents in a disaster-response system. Needs & Impact said: "${context.needsText}". Resource & Logistics said: "${context.resourceText}". In ONE short sentence (max 25 words), give the final dispatch decision.`
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
// {cls, text} shape that debateEngine.js expects. cls stays
// triage/logistics/commander (see the note at the top of debateEngine.js)
// so the same CSS/animation styling applies regardless of which mode
// produced the lines.
async function buildAILines(scenario) {
  const needsText = await callAgentAI("needs", scenario, {});
  const resourceText = await callAgentAI("resource", scenario, {});
  const commandText = await callAgentAI("command", scenario, { needsText, resourceText });

  return [
    { cls: "triage", text: `[NEEDS & IMPACT] ${needsText}` },
    { cls: "logistics", text: `[RESOURCE & LOGISTICS] ${resourceText}` },
    { cls: "commander", text: `[COMMAND & PRIORITIZATION] ${commandText}` }
  ];
}
