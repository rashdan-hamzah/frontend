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
const RING_CIRCUMFERENCE = 289;

// Session history
const HISTORY_KEY = "consulting_trainer_history_v1";
const HISTORY_MAX = 5;

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
  const s = Number(score) || 0;
  if (s >= 85) return "Excellent";
  if (s >= 70) return "Strong";
  if (s >= 55) return "Mixed";
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

  let pct;
  let label;

  if (words === 0) {
    pct = 0; label = "—";
  } else if (words < 25) {
    pct = 28; label = `${words} words · too short`;
  } else if (words <= 90) {
    pct = 60 + ((words - 25) / (90 - 25)) * 40;
    label = `${words} words · good`;
  } else if (words <= 160) {
    pct = 100 - ((words - 90) / (160 - 90)) * 30;
    label = `${words} words · long`;
  } else {
    pct = 65; label = `${words} words · too long`;
  }

  conciseFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  conciseLabel.textContent = label;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistoryItem(item) {
  const history = loadHistory();
  history.unshift(item);
  const trimmed = history.slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

function renderHistoryIntoFeedback() {
  const history = loadHistory();
  const container = document.getElementById("feedback");
  if (!container) return;

  const historyHtml = history.length
    ? `
      <h4>Recent attempts</h4>
      <ul>
        ${history
          .map((h, idx) => {
            const title = `${h.score}/100 · ${escapeHtml(h.level)} · ${escapeHtml(formatTime(h.ts))}`;
            const preview = escapeHtml((h.scenario || "").slice(0, 70)) + ((h.scenario || "").length > 70 ? "…" : "");
            return `<li>
              <button type="button" class="miniBtn" data-hidx="${idx}" style="margin:6px 0;">
                ${title}<br><span style="opacity:.7;font-weight:600">${preview}</span>
              </button>
            </li>`;
          })
          .join("")}
      </ul>
    `
    : "";

  // Append history below whatever feedback is already there
  container.insertAdjacentHTML("beforeend", historyHtml);

  // Wire click handlers
  container.querySelectorAll("[data-hidx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-hidx"));
      const h = loadHistory()[idx];
      if (!h) return;

      // Restore scenario + response
      scenarioText.textContent = h.scenario || "";
      responseInput.value = h.response || "";
      updateConcisenessMeter();

      // Restore score/level/ring and feedback HTML from stored strings
      resultEl.classList.remove("hidden");
      document.getElementById("score").textContent = `Score: ${h.score}/100`;
      document.getElementById("level").textContent = `Level: ${h.level}`;
      setRing(h.score);

      document.getElementById("feedback").innerHTML = h.feedbackHtml || "";
      // Re-render history section after restoring feedbackHtml
      renderHistoryIntoFeedback();

      toast("Loaded previous attempt.");
      resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
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

    const feedbackHtml = `
      <h4>Strengths</h4>
      <ul>${strengths.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h4>Improvements</h4>
      <ul>${improvements.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    `;

    document.getElementById("feedback").innerHTML = feedbackHtml;

    setRing(data.score);

    // Save to local history (frontend only)
    saveHistoryItem({
      ts: Date.now(),
      score: Number(data.score) || 0,
      level: String(data.level || "—"),
      scenario: String(scenarioText.textContent || ""),
      response: String(userResponse),
      feedbackHtml
    });

    // Append recent attempts section
    renderHistoryIntoFeedback();

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

// Copy feedback button
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
