const scenarios = [
  "“You’re sharp, but we don’t usually take short-term people.”",
  "“Your fees are higher than others.”",
  "“We already handle this internally.”",
  "“Let me think about it and get back to you.”"
];

const scenarioText = document.getElementById("scenarioText");
scenarioText.textContent = scenarios[Math.floor(Math.random()*scenarios.length)];

document.getElementById("evaluateBtn").onclick = async () => {
  const payload = {
    scenario: scenarioText.textContent,
    response: document.getElementById("response").value,
    industry: industry.value,
    stakeholder: stakeholder.value,
    conversation: conversation.value,
    mode: mode.value
  };

  const res = await fetch("/api/evaluate", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(payload)
  });

  const data = await res.json();

  document.getElementById("result").classList.remove("hidden");
  document.getElementById("score").textContent = `Score: ${data.score}/100`;
  document.getElementById("level").textContent = `Level: ${data.level}`;
  document.getElementById("feedback").innerHTML =
    "<ul>"+data.feedback.map(f=>`<li>${f}</li>`).join("")+"</ul>";
};
