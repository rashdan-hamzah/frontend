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

const historyListEl = document.getElementById("historyList");
const historyEmptyEl = document.getElementById("historyEmpty");
const sessionStatsEl = document.getElementById("sessionStats");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Worker base URL (no trailing slash)
const WORKER_BASE_URL = "https://consulting-trainer-api.rashdanhamzah03.workers.dev";
const GENERATE_API_URL = `${WORKER_BASE_URL}/generate`;
const EVALUATE_API_URL = `${WORKER_BASE_URL}/evaluate`;

// Ring constants
const RING_CIRCUMFERENCE = 289;

// Session history
const HISTORY_KEY = "consulting_trainer_history_v2";
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

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_MAX)));
}

function addHistoryItem(item) {
  const history = loadHistory();
  history.unshift(item);
  saveHistory(history);
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
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

function computeStats(history) {
  const attempts = history.length;
  const bestScore = attempts ? Math.max(...history.map(h => Number(h.score) || 0)) : 0;
  return { attempts, bestScore };
}

function renderHistory() {
  if (!historyListEl) return;

  const history = loadHistory();
  const { attempts, bestScore } = computeStats(history);

  if (sessionStatsEl) {
    sessionStatsEl.textContent = attempts
      ? `${attempts} attempt${attempts === 1 ? "" : "s"} · Best ${bestScore}/100`
      : "No attempts yet";
  }

  // Clear existing items but keep empty placeholder node
  historyListEl.querySelectorAll(".queueItem").forEach(n => n.remove());

  if (historyEmptyEl) {
    historyEmptyEl.style.display = history.length ? "none" : "block";
  }

  history.forEach((h, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "queueItem";
    btn.setAttribute("data-hidx", String(idx));

    const scenarioPreview = (h.scenario || "").slice(0, 86);
    const metaLine = `${h.score}/100 · ${h.level || "—"} · ${formatTime(h.ts)}`;

    btn.innerHTML = `
      <div class="queueTop">
        <span>${escapeHtml(metaLine)}</span>
        <span class="queueMeta">${escapeHtml(scoreBadge(h.score))}</span>
      </div>
      <div class="queuePreview">${escapeHtml(scenarioPreview)}${(h.scenario || "").length > 86 ? "…" : ""}</div>
    `;

    btn.addEventListener("click", () => {
      const historyNow = loadHistory();
      const item = historyNow[idx];
      if (!item) return;

      scenarioText.textContent = item.scenario || "";
      responseInput.value = item.response || "";
      updateConcisenessMeter();

      resultEl.classList.remove("hidden");
      document.getElementById("score").textContent = `Score: ${item.score}/100`;
      document.getElementById("level").textContent = `Level: ${item.level}`;
      setRing(item.score);

      document.getElementById("feedback").innerHTML = item.feedbackHtml || "";
      toast("Loaded from queue.");
      resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    historyListEl.appendChild(btn);
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

    addHistoryItem({
      ts: Date.now(),
      score: Number(data.score) || 0,
      level: String(data.level || "—"),
      scenario: String(scenarioText.textContent || ""),
      response: String(userResponse),
      feedbackHtml
    });

    renderHistory();

    toast("Assessment ready.");
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    toast("Evaluation failed. Check console.");
    alert("Evaluation failed. Open DevTools → Console for details.");
  } finally {
    setLoading(evaluateBtn, false, "Evaluate");
  }
};

// Copy button
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

// Clear history
clearHistoryBtn?.addEventListener("click", () => {
  clearHistory();
  toast("History cleared.");
});

// Keyboard shortcut: Ctrl/Cmd + Enter
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

// Initial render of history on load
renderHistory();
