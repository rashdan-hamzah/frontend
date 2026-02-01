const scenarios = [
  "You’re sharp, but we don’t usually take short-term people.",
  "Your fees are higher than others.",
  "We already handle this internally.",
  "Let me think about it and get back to you."
];

// DOM references
const scenarioText = document.getElementById("scenarioText");
const responseInput = document.getElementById("response");
const industrySelect = document.getElementById("industry");
const departmentSelect = document.getElementById("department");
const stakeholderSelect = document.getElementById("stakeholder");
const modeSelect = document.getElementById("mode");
const evaluateBtn = document.getElementById("evaluateBtn");

// Defensive check (fail loudly)
["scenarioText", "response", "industry", "department", "stakeholder", "evaluateBtn"]
  .forEach(id => {
    if (!document.getElementById(id)) {
      console.error(`Missing element with id="${id}"`);
    }
  });

// Scenario logic
function setRandomScenario() {
  const random =
    scenarios[Math.floor(Math.random() * scenarios.length)];
  scenarioText.textContent = random;
}

// Initial scenario
setRandomScenario();

// Button handler
evaluateBtn.onclick = async () => {
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

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.error) {
      throw data;
    }

    document.getElementById("result").classList.remove("hidden");
    document.getElementById("score").textContent = `Score: ${data.score}/100`;
    document.getElementById("level").textContent = `Level: ${data.level}`;

    document.getElementById("feedback").innerHTML = `
      <h4>Strengths</h4>
      <ul>${data.strengths.map(s => `<li>${s}</li>`).join("")}</ul>
      <h4>Improvements</h4>
      <ul>${data.improvements.map(i => `<li>${i}</li>`).join("")}</ul>
    `;

    // Rotate scenario after success
    if (modeSelect.value === "random") {
      setRandomScenario();
    }

    responseInput.value = "";

  } catch (err) {
    alert("Something went wrong. Check console.");
    console.error(err);
  } finally {
    evaluateBtn.disabled = false;
    evaluateBtn.textContent = "Evaluate";
  }
};
