const domainElement = document.getElementById("domain");
const categoryElement = document.getElementById("category");
const sourceElement = document.getElementById("source");
const messageElement = document.getElementById("message");
const pageTimerElement = document.getElementById("pageTimer");
const totalTimerElement = document.getElementById("totalTimer");
const refreshBtn = document.getElementById("refreshBtn");

let timerInterval = null;

function formatTime(milliseconds) {
  const safeMilliseconds = Number(milliseconds) || 0;
  const totalSeconds = Math.floor(safeMilliseconds / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatSource(source) {
  const labels = {
    known_site: "Site connu",
    url_keyword: "Mot-clé URL",
    page_content: "Contenu page",
    neutral: "Neutre"
  };

  return labels[source] || source;
}

function getCategoryStyle(category) {
  switch (category) {
    case "Distraction":
      return "linear-gradient(135deg, #CF1B1B, #ED6D2D)";
    case "E-commerce":
      return "linear-gradient(135deg, #ED6D2D, #F19430)";
    case "Productif":
      return "linear-gradient(135deg, #E2E241, #FBE15F)";
    default:
      return "linear-gradient(135deg, #555, #777)";
  }
}

function getCurrentElapsed(session) {
  if (!session) {
    return 0;
  }

  const accumulatedMs = Number(session.accumulatedMs) || 0;
  const lastStartedAt = Number(session.lastStartedAt) || null;

  if (session.isActive && lastStartedAt) {
    return accumulatedMs + (Date.now() - lastStartedAt);
  }

  return accumulatedMs;
}

async function loadCurrentSession() {
  const result = await chrome.storage.local.get([
    "currentSession",
    "totalTracking"
  ]);

  let session = result.currentSession;
  const totalTracking = result.totalTracking;

  if (!session) {
    domainElement.textContent = "Aucun site détecté";
    categoryElement.textContent = "Inconnue";
    sourceElement.textContent = "Inconnue";
    messageElement.textContent = "Ouvre un site pour commencer.";
    pageTimerElement.textContent = "00:00:00";
    totalTimerElement.textContent = "00:00:00";
    return;
  }

  domainElement.textContent = session.domain;
  categoryElement.textContent = session.category;
  sourceElement.textContent = formatSource(session.source);

  messageElement.textContent = session.message;
  messageElement.style.background = getCategoryStyle(session.category);
  messageElement.style.color = session.category === "Productif" ? "#000" : "#fff";

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(async () => {
    const freshData = await chrome.storage.local.get([
      "currentSession",
      "totalTracking"
    ]);

    session = freshData.currentSession;

    pageTimerElement.textContent = formatTime(getCurrentElapsed(session));

    if (freshData.totalTracking?.startTime) {
      totalTimerElement.textContent = formatTime(
        Date.now() - freshData.totalTracking.startTime
      );
    } else {
      totalTimerElement.textContent = "00:00:00";
    }
  }, 1000);
}

refreshBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({
    type: "FORCE_ANALYSE_ACTIVE_TAB"
  });

  await loadCurrentSession();
});

loadCurrentSession();