import { getDomainFromUrl, classifySite, getOpeningMessage } from "./classifier.js";

async function getStoredData() {
  const data = await chrome.storage.local.get([
    "tabSessions",
    "currentSession",
    "totalTracking"
  ]);

  return {
    tabSessions: data.tabSessions || {},
    currentSession: data.currentSession || null,
    totalTracking: data.totalTracking || null
  };
}

async function getPageContent(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "GET_PAGE_CONTENT"
    });
  } catch (error) {
    return null;
  }
}

async function showRoastOnPage(tabId, message, category) {
  setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SHOW_ROAST",
        text: message,
        category
      });
    } catch (error) {
      console.log("Impossible d'afficher le message sur cette page.", error);
    }
  }, 800);
}

async function initTotalTracking() {
  const { totalTracking } = await getStoredData();

  if (!totalTracking) {
    await chrome.storage.local.set({
      totalTracking: {
        startTime: Date.now()
      }
    });
  }
}

async function analyseCurrentTab(tab, options = { showMessageIfNew: true }) {
  if (!tab || !tab.url) return;

  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:")
  ) {
    return;
  }

  await initTotalTracking();

  const domain = getDomainFromUrl(tab.url);
  const { tabSessions } = await getStoredData();

  const existingSession = tabSessions[tab.id];

  const isSameDomain =
    existingSession && existingSession.domain === domain;

  if (isSameDomain) {
    const updatedSession = {
      ...existingSession,
      url: tab.url
    };

    tabSessions[tab.id] = updatedSession;

    await chrome.storage.local.set({
      tabSessions,
      currentSession: updatedSession
    });

    console.log("Même domaine, timer conservé :", updatedSession);
    return;
  }

  const pageContent = await getPageContent(tab.id);
  const classification = classifySite(domain, tab.url, pageContent);
  const message = getOpeningMessage(classification.category);

  const newSession = {
    tabId: tab.id,
    url: tab.url,
    domain,
    category: classification.category,
    source: classification.source,
    startTime: Date.now(),
    message
  };

  tabSessions[tab.id] = newSession;

  await chrome.storage.local.set({
    tabSessions,
    currentSession: newSession
  });

  if (options.showMessageIfNew) {
    await showRoastOnPage(tab.id, message, classification.category);
  }

  console.log("Nouvelle session créée :", newSession);
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await analyseCurrentTab(tab, { showMessageIfNew: false });
  } catch (error) {
    console.log("Erreur onActivated:", error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    try {
      await analyseCurrentTab(tab, { showMessageIfNew: true });
    } catch (error) {
      console.log("Erreur onUpdated:", error);
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { tabSessions } = await getStoredData();

  if (tabSessions[tabId]) {
    delete tabSessions[tabId];

    await chrome.storage.local.set({
      tabSessions
    });
  }
});