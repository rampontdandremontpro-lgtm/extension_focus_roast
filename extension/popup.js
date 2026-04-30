const domainElement = document.getElementById("domain");
const categoryElement = document.getElementById("category");
const sourceElement = document.getElementById("source");
const messageElement = document.getElementById("message");
const pageTimerElement = document.getElementById("pageTimer");
const totalTimerElement = document.getElementById("totalTimer");
const refreshBtn = document.getElementById("refreshBtn");

let pageTimerInterval = null;
let totalTimerInterval = null;

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatSource(source) {
  const sourceLabels = {
    known_site: "Site connu",
    url_keyword: "Mot-clé URL",
    page_content: "Contenu page",
    neutral: "Neutre"
  };

  return sourceLabels[source] || source;
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

function startPageTimer(startTime) {
  if (pageTimerInterval) {
    clearInterval(pageTimerInterval);
  }

  pageTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    pageTimerElement.textContent = formatTime(elapsed);
  }, 1000);
}

function startTotalTimer(startTime) {
  if (totalTimerInterval) {
    clearInterval(totalTimerInterval);
  }

  totalTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    totalTimerElement.textContent = formatTime(elapsed);
  }, 1000);
}

async function loadCurrentSession() {
  const result = await chrome.storage.local.get([
    "currentSession",
    "totalTracking"
  ]);

  const session = result.currentSession;
  const totalTracking = result.totalTracking;

  if (!session) {
    domainElement.textContent = "Aucun site détecté";
    categoryElement.textContent = "Inconnue";
    sourceElement.textContent = "Inconnue";
    messageElement.textContent = "Ouvre un site pour commencer.";
    pageTimerElement.textContent = "00:00:00";
    return;
  }

  domainElement.textContent = session.domain;
  categoryElement.textContent = session.category;
  sourceElement.textContent = formatSource(session.source);

  messageElement.textContent = session.message;
  messageElement.style.background = getCategoryStyle(session.category);
  messageElement.style.color =
    session.category === "Productif" ? "#000" : "#fff";

  startPageTimer(session.startTime);

  if (totalTracking?.startTime) {
    startTotalTimer(totalTracking.startTime);
  }
}

refreshBtn.addEventListener("click", async () => {
  await loadCurrentSession();
});

loadCurrentSession();