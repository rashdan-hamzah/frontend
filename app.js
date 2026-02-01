const scenarioText = document.getElementById("scenarioText");
const responseInput = document.getElementById("response");
const industrySelect = document.getElementById("industry");
const departmentSelect = document.getElementById("department");
const stakeholderSelect = document.getElementById("stakeholder");
const modeSelect = document.getElementById("mode");

const generateBtn = document.getElementById("generateBtn");
const evaluateBtn = document.getElementById("evaluateBtn");

// TEMP fallback scenarios (until AI generation)
const fallbackScenarios = [
  "You’re sharp, but we don’t usually take short-term people.",
  "Your fees are higher than others.",
  "We already handle this internally.",
  "Let me think about it and get back to you."
];

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
  if (!scenarioText.textContent || scenarioText.textContent.includes("generate")) {
    alert("Generate a scenario first.");
    return;
  }

  evaluateBtn.disabled = true;
  evaluateBtn.textContent = "Evaluating...";

  const payload = {
    scenario: scenarioText.textContent,
    response: responseInput.value,
    meta: {
      industry: industrySelect.value || "Any",
      department: departmentSelect.value || "Any",
      stakeholder: stakeholderSelect.value || "Any"
    }
  };

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    document.getElementById("result").classList.remove("hidden");
    document.getElementById("score").textContent = `Score: ${data.score}/100`;
    document.getElementById("level").textContent = `Level: ${data.level}`;

    document.getElementById("feedback").innerHTML = `
      <h4>Strengths</h4>
      <ul>${data.strengths.map(s => `<li>${s}</li>`).join("")}</ul>
      <h4>Improvements</h4>
      <ul>${data.improvements.map(i => `<li>${i}</li>`).join("")}</ul>
    `;
  } catch (err) {
    alert("Evaluation failed. Check console.");
    console.error(err);
  } finally {
    evaluateBtn.disabled = false;
    evaluateBtn.textContent = "Evaluate";
  }
};
