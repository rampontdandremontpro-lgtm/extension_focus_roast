const API_BASE_URL = "http://localhost:3000";

chrome.runtime.sendMessage({ type: "POPUP_OPENED" });

window.addEventListener("beforeunload", () => {
  chrome.runtime.sendMessage({ type: "POPUP_CLOSED" });
});

const domainElement = document.getElementById("domain");
const categoryElement = document.getElementById("category");
const sourceElement = document.getElementById("source");
const messageElement = document.getElementById("message");
const pageTimerElement = document.getElementById("pageTimer");
const totalTimerElement = document.getElementById("totalTimer");
const globalMessageElement = document.getElementById("globalMessage");
const statsChartElement = document.getElementById("statsChart");

let timerInterval = null;
let statsChart = null;

function formatTime(milliseconds) {
  const safeMilliseconds = Number(milliseconds) || 0;
  const totalSeconds = Math.floor(safeMilliseconds / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatSecondsForChart(seconds) {
  const safeSeconds = Number(seconds) || 0;

  if (safeSeconds < 60) {
    return `${safeSeconds} sec`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

function formatSource(source) {
  const labels = {
    known_site: "Site connu",
    domain_keyword: "Mot-clé domaine",
    url_keyword: "Mot-clé URL",
    page_content: "Contenu page",
    neutral: "Neutre",
    search_engine: "Moteur de recherche"
  };

  return labels[source] || source || "Inconnue";
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

function getTotalElapsed(totalTracking) {
  if (!totalTracking) {
    return 0;
  }

  let elapsedMs = Number(totalTracking.accumulatedMs) || 0;

  if (totalTracking.isActive && totalTracking.lastStartedAt) {
    elapsedMs += Date.now() - totalTracking.lastStartedAt;
  }

  return elapsedMs;
}

async function loadCurrentSession() {
  const result = await chrome.storage.local.get([
    "currentSession",
    "totalTracking"
  ]);

  let session = result.currentSession;

  if (!session) {
  domainElement.textContent = "Page ignorée";
  categoryElement.textContent = "Neutre";
  sourceElement.textContent = "Non trackée";
  messageElement.textContent = "Cette page n’est pas comptée.";
  pageTimerElement.textContent = "00:00:00";
  totalTimerElement.textContent = formatTime(getTotalElapsed(result.totalTracking));
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
    totalTimerElement.textContent = formatTime(getTotalElapsed(freshData.totalTracking));

    if (session) {
      domainElement.textContent = session.domain;
      categoryElement.textContent = session.category;
      sourceElement.textContent = formatSource(session.source);
      messageElement.textContent = session.message;
      messageElement.style.background = getCategoryStyle(session.category);
      messageElement.style.color = session.category === "Productif" ? "#000" : "#fff";
    }
  }, 1000);
}

async function loadTodayStats() {
  try {
    const storage = await chrome.storage.local.get(["trackingStartedAt"]);
    const since = storage.trackingStartedAt;

    const statsUrl = since
      ? `${API_BASE_URL}/stats/today?since=${encodeURIComponent(since)}`
      : `${API_BASE_URL}/stats/today`;

    const response = await fetch(statsUrl);

    if (!response.ok) {
      throw new Error("Erreur API stats");
    }

    const stats = await response.json();

    const values = [
      stats.Productif || 0,
      stats.Distraction || 0,
      stats["E-commerce"] || 0,
      stats.Neutre || 0
    ];

    const totalSeconds = values.reduce((total, value) => total + value, 0);

    globalMessageElement.textContent =
      stats.globalMessage || "Stats chargées.";

    if (totalSeconds === 0) {
      globalMessageElement.textContent = "Aucune session enregistrée pour cette session Chrome.";

      if (statsChart) {
        statsChart.data.datasets[0].data = [0, 0, 0, 0];
        statsChart.update();
      }

      return;
    }

    if (!statsChart) {
      statsChart = new Chart(statsChartElement, {
        type: "doughnut",
        data: {
          labels: ["Productif", "Distraction", "E-commerce", "Neutre"],
          datasets: [
            {
              data: values,
              backgroundColor: ["#FBE15F", "#CF1B1B", "#ED6D2D", "#777777"],
              borderColor: "#1f0f0f",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          animation: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#ffffff"
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const seconds = context.raw || 0;

                  return `${label} : ${formatSecondsForChart(seconds)}`;
                }
              }
            }
          }
        }
      });
    } else {
      statsChart.data.datasets[0].data = values;
      statsChart.update();
    }
  } catch (error) {
    console.log("Erreur chargement stats :", error);
    globalMessageElement.textContent = "Impossible de charger les stats.";
  }
}

loadCurrentSession();
loadTodayStats();

setInterval(() => {
  loadTodayStats();
}, 1000);