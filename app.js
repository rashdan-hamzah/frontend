console.log("app.js loaded");

const scenarioText = document.getElementById("scenarioText");
const responseInput = document.getElementById("response");
const industrySelect = document.getElementById("industry");
const departmentSelect = document.getElementById("department");
const stakeholderSelect = document.getElementById("stakeholder");
const modeSelect = document.getElementById("mode");

const generateBtn = document.getElementById("generateBtn");
const evaluateBtn = document.getElementById("evaluateBtn");

// Point directly to your Cloudflare Worker
const EVALUATE_API_URL = "https://consulting-trainer-api.rashdanhamzah03.workers.dev";

// TEMP fallback scenarios (until AI generation)
const fallbackScenarios = [
  "You’re sharp, but we don’t usually take short-term people.",
  "Your fees are higher than others.",
  "We already handle this internally.",
  "Let me think about it and get back to you."
];

function escapeHtml(str) {
  // Prevent HTML injection since we use innerHTML for lists
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Generate scenario
generateBtn.onclick = async () => {
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  // TEMP: random fallback
  scenarioText.textContent =
    fallbackScenarios[Math.floor(Math.random() * fallbackScenarios.length)];

  generateBtn.disabled = false;
  generateBtn.textContent = "Generate Scenario";
};

// Evaluate response
evaluateBtn.onclick = async () => {
  // Basic guards
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
    meta: {
      industry: industrySelect.value || "Any",
      department: departmentSelect.value || "Any",
      stakeholder: stakeholderSelect.value || "Any",
      mode: modeSelect.value || "filtered"
    }
  };

  try {
    const res = await fetch(EVALUATE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text(); // read as text first for better error messages
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

    const data = JSON.parse(text);

    // If your worker returns { error: ... }
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
