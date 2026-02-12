console.log("app.js loaded");

const scenarioText = document.getElementById("scenarioText");
const responseInput = document.getElementById("response");
const industrySelect = document.getElementById("industry");
const departmentSelect = document.getElementById("department");
const stakeholderSelect = document.getElementById("stakeholder");
const modeSelect = document.getElementById("mode");

const generateBtn = document.getElementById("generateBtn");
const evaluateBtn = document.getElementById("evaluateBtn");

const resultEl = document.getElementById("result");
const toastEl = document.getElementById("toast");

const conciseFill = document.getElementById("conciseFill");
const conciseLabel = document.getElementById("conciseLabel");

const copyBtn = document.getElementById("copyBtn");
const newBtn = document.getElementById("newBtn");

// Worker base URL (no trailing slash)
const WORKER_BASE_URL = "https://consulting-trainer-api.rashdanhamzah03.workers.dev";
const GENERATE_API_URL = `${WORKER_BASE_URL}/generate`;
const EVALUATE_API_URL = `${WORKER_BASE_URL}/evaluate`;

// Ring constants
const RING_CIRCUMFERENCE = 289; // tuned for r=46 with stroke width; matches CSS dasharray

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

function setLoading(btn, isLoading, labelWhenNotLoading) {
  btn.disabled = isLoading;
  if (isLoading) btn.classList.add("loading");
  else {
    btn.classList.remove("loading");
    if (labelWhenNotLoading) btn.textContent = labelWhenNotLoading;
  }
}

let toastTimer;
function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
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

function scoreBadge(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Mixed";
  return "Needs work";
}

function setRing(score) {
  const ring = resultEl?.querySelector(".ring-progress");
  const badge = document.getElementById("scoreBadge");
  if (!ring) return;

  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  ring.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  ring.style.strokeDashoffset = String(offset);

  if (badge) badge.textContent = scoreBadge(clamped);
}

function updateConcisenessMeter() {
  if (!conciseFill || !conciseLabel) return;

  const text = responseInput.value.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

  // sweet spot: 35–90 words (for crisp consulting responses)
  let pct;
  let label;

  if (words === 0) {
    pct = 0; label = "—";
  } else if (words < 25) {
    pct = 28; label = `${words} words · too short`;
  } else if (words <= 90) {
    // map 25..90 to 60..100
    pct = 60 + ((words - 25) / (90 - 25)) * 40;
    label = `${words} words · good`;
  } else if (words <= 160) {
    // map 90..160 to 100..70
    pct = 100 - ((words - 90) / (160 - 90)) * 30;
    label = `${words} words · long`;
  } else {
    pct = 65; label = `${words} words · too long`;
  }

  conciseFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  conciseLabel.textContent = label;
}

// Generate scenario (AI)
generateBtn.onclick = async () => {
  setLoading(generateBtn, true);
  generateBtn.textContent = "Generating…";
  toast("Generating scenario…");

  try {
    const data = await postJson(GENERATE_API_URL, { meta: getMeta() });
    if (!data?.scenario) throw new Error(`API did not return scenario: ${JSON.stringify(data)}`);

    scenarioText.textContent = data.scenario;

    // Reset result and response for a clean “session”
    resultEl?.classList.add("hidden");
    responseInput.value = "";
    updateConcisenessMeter();

    toast("Scenario ready.");
  } catch (err) {
    console.error(err);
    toast("Generation failed. Check console.");
    alert("Scenario generation failed. Open DevTools → Console for details.");
  } finally {
    setLoading(generateBtn, false, "Generate");
  }
};

// Evaluate response (AI)
evaluateBtn.onclick = async () => {
  if (!scenarioText.textContent || scenarioText.textContent.includes("Click generate")) {
    toast("Generate a scenario first.");
    alert("Generate a scenario first.");
    return;
  }

  const userResponse = responseInput.value.trim();
  if (!userResponse) {
    toast("Type your response first.");
    alert("Type your response first.");
    return;
  }

  setLoading(evaluateBtn, true);
  evaluateBtn.textContent = "Evaluating…";
  toast("Evaluating response…");

  const payload = {
    scenario: scenarioText.textContent,
    response: userResponse,
    meta: getMeta()
  };

  try {
    const data = await postJson(EVALUATE_API_URL, payload);

    resultEl.classList.remove("hidden");
    resultEl.classList.remove("reveal");
    void resultEl.offsetWidth;
    resultEl.classList.add("reveal");

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

    setRing(data.score);
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Assessment ready.");
  } catch (err) {
    console.error(err);
    toast("Evaluation failed. Check console.");
    alert("Evaluation failed. Open DevTools → Console for details.");
  } finally {
    setLoading(evaluateBtn, false, "Evaluate");
  }
};

// Copy feedback button (optional UI feature)
copyBtn?.addEventListener("click", async () => {
  try {
    const score = document.getElementById("score")?.textContent || "";
    const level = document.getElementById("level")?.textContent || "";
    const feedbackText = document.getElementById("feedback")?.innerText || "";
    const scenario = scenarioText?.textContent || "";
    const response = responseInput?.value || "";

    const blob = [
      "Consulting Trainer Feedback",
      "",
      score,
      level,
      "",
      "Scenario:",
      scenario,
      "",
      "Your response:",
      response,
      "",
      "Feedback:",
      feedbackText
    ].join("\n");

    await navigator.clipboard.writeText(blob);
    toast("Copied.");
  } catch (e) {
    console.error(e);
    toast("Copy failed.");
  }
});

// New scenario shortcut
newBtn?.addEventListener("click", () => generateBtn.click());

// Keyboard shortcut: Ctrl/Cmd + Enter to evaluate
responseInput.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (mod && e.key === "Enter") {
    e.preventDefault();
    evaluateBtn.click();
  }
});

// Live conciseness meter
responseInput.addEventListener("input", updateConcisenessMeter);
updateConcisenessMeter();
