console.log("app.js loaded");

const scenarioText = document.getElementById("scenarioText");
const responseInput = document.getElementById("response");
const industrySelect = document.getElementById("industry");
const departmentSelect = document.getElementById("department");
const stakeholderSelect = document.getElementById("stakeholder");
const modeSelect = document.getElementById("mode");

const generateBtn = document.getElementById("generateBtn");
const evaluateBtn = document.getElementById("evaluateBtn");

// Worker base URL (no trailing slash)
const WORKER_BASE_URL = "https://consulting-trainer-api.rashdanhamzah03.workers.dev";
const GENERATE_API_URL = `${WORKER_BASE_URL}/generate`;
const EVALUATE_API_URL = `${WORKER_BASE_URL}/evaluate`;

// Fallback if AI generation fails (optional)
const fallbackScenarios = [
  "You’re sharp, but we don’t usually take short-term people.",
  "Your fees are higher than others.",
  "We already handle this internally.",
  "Let me think about it and get back to you."
];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMeta() {
  return {
    industry: industrySelect.value || "Any",
    department: departmentSelect.value || "Any",
    stakeholder: stakeholderSelect.value || "Any",
    mode: modeSelect.value || "filtered"
  };
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from API: ${text}`);
  }
}

// Generate scenario (AI)
generateBtn.onclick = async () => {
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  try {
    const data = await postJson(GENERATE_API_URL, { meta: getMeta() });

    if (!data?.scenario) throw new Error(`API did not return scenario: ${JSON.stringify(data)}`);

    scenarioText.textContent = data.scenario;
  } catch (err) {
    console.error(err);

    // Optional fallback so the app still works even if AI fails
    scenarioText.textContent =
      fallbackScenarios[Math.floor(Math.random() * fallbackScenarios.length)];

    alert("AI scenario generation failed; using a fallback scenario. Check console for details.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Scenario";
  }
};

// Evaluate response (AI)
evaluateBtn.onclick = async () => {
  if (!scenarioText.textContent || scenarioText.textContent.includes("Click generate")) {
    alert("Generate a scenario first.");
    return;
  }

  const userResponse = responseInput.value.trim();
  if (!userResponse) {
    alert("Type your response first.");
    return;
  }

  evaluateBtn.disabled = true;
  evaluateBtn.textContent = "Evaluating...";

  const payload = {
    scenario: scenarioText.textContent,
    response: userResponse,
    meta: getMeta()
  };

  try {
    const data = await postJson(EVALUATE_API_URL, payload);

    if (data && data.error) {
      throw new Error(`${data.error}${data.raw ? `\n\nRaw:\n${data.raw}` : ""}`);
    }

    document.getElementById("result").classList.remove("hidden");
    document.getElementById("score").textContent = `Score: ${data.score}/100`;
    document.getElementById("level").textContent = `Level: ${data.level}`;

    const strengths = Array.isArray(data.strengths) ? data.strengths : [];
    const improvements = Array.isArray(data.improvements) ? data.improvements : [];

    document.getElementById("feedback").innerHTML = `
      <h4>Strengths</h4>
      <ul>${strengths.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h4>Improvements</h4>
      <ul>${improvements.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    `;
  } catch (err) {
    alert("Evaluation failed. Open DevTools → Console for details.");
    console.error(err);
  } finally {
    evaluateBtn.disabled = false;
    evaluateBtn.textContent = "Evaluate";
  }
};
