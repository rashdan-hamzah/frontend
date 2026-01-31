const scenarios = [
  "You’re sharp, but we don’t usually take short-term people.",
  "Your fees are higher than others.",
  "We already handle this internally.",
  "Let me think about it and get back to you."
];

// DOM refs
const scenarioText = document.getElementById("scenarioText");
const responseInput = document.getElementById("response");
const industrySelect = document.getElementById("industry");
const departmentSelect = document.getElementById("department");
const stakeholderSelect = document.getElementById("stakeholder");

// Pick random scenario
scenarioText.textContent =
  scenarios[Math.floor(Math.random() * scenarios.length)];

document.getElementById("evaluateBtn").onclick = async () => {
  const payload = {
    scenario: scenarioText.textContent,
    response: responseInput.value,
    meta: {
      industry: industrySelect.value,
      department: departmentSelect.value,
      stakeholder: stakeholderSelect.value
    }
  };

  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.error) {
    alert("AI Error. Try again.");
    console.error(data);
    return;
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
};
